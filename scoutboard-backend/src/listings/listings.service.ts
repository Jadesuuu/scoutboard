import { Inject, Injectable } from '@nestjs/common';
import { CreateListingDto } from './dto/create-listing.dto';
import { ListingRecord } from './listing.schema';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import Redis from 'ioredis';
import { ListingsGateway } from './listings.gateway';
import { firstValueFrom } from 'rxjs';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { OfferRecord } from 'src/offers/offer.schema';

interface AIResponseData {
  choices: { message: { content: string } }[];
}

export interface AIAnalysisResult {
  verdict: string;
  fairValueLow: number;
  fairValueHigh: number;
  points: string[];
  suggestedOffer: number;
}

@Injectable()
export class ListingsService {
  constructor(
    @InjectModel(ListingRecord.name) private listingModel: Model<ListingRecord>,
    @InjectModel(OfferRecord.name) private offerModel: Model<OfferRecord>,
    @Inject('REDIS_CLIENT') private redis: Redis,
    private gateway: ListingsGateway,
    private http: HttpService,
    private config: ConfigService,
  ) {}

  async create(listingDto: CreateListingDto) {
    const newListing = await this.listingModel.create(listingDto);
    await this.redis.del('listings');
    this.gateway.broadcastListingUpdate(newListing.toObject());
    return newListing;
  }

  async findAll() {
    const cachedListings = await this.redis.get('listings');

    if (cachedListings) {
      return JSON.parse(cachedListings) as ListingRecord[];
    }

    const listings = await this.listingModel
      .find()
      .sort({ createdAt: -1 })
      .limit(20);
    await this.redis.set('listings', JSON.stringify(listings), 'EX', 60);
    return listings;
  }

  async deleteById(id: string) {
    await this.listingModel.findByIdAndDelete(id);
    await this.offerModel.deleteMany({ listingId: id });
    await this.redis.del('listings');
  }

  async countViews(id: string) {
    const key = `listing:${id}:views`;
    const count = await this.redis.incr(key);
    return this.listingModel.findByIdAndUpdate(
      id,
      { $set: { views: count } },
      { new: true },
    );
  }

  async analyze(id: string) {
    const listing = await this.listingModel.findById(id).lean();
    const offers = await this.offerModel.find({ listingId: id }).lean();

    const userContent = JSON.stringify({ listing, offers });

    const cachedListingAnalization = await this.redis.get(
      `listing:${id}:analyze`,
    );

    if (cachedListingAnalization) {
      return JSON.parse(cachedListingAnalization) as AIAnalysisResult;
    }

    try {
      const res = await firstValueFrom(
        this.http.post<AIResponseData>(
          `${this.config.get<string>('AI_BASE_URL')}/chat/completions`,
          {
            model: this.config.get<string>('AI_MODEL'),
            messages: [
              {
                role: 'system',
                content: `You are a financial analyst for small business acquisitions.
Respond ONLY with valid JSON, no markdown, no code fences, in exactly this shape:
{
  "verdict": "short label, e.g. 'Below market — potential deal' or 'Fairly priced' or 'Overpriced'",
  "fairValueLow": number,
  "fairValueHigh": number,
  "points": ["3-4 short bullet insights, each one sentence, each sentence limit to 60-100 characters"],
  "suggestedOffer": number
}`,
              },
              {
                role: 'user',
                content: userContent,
              },
            ],
          },
          {
            headers: {
              Authorization: `Bearer ${this.config.get('AI_API_KEY')}`,
            },
          },
        ),
      );

      const raw = res.data.choices[0].message.content;
      const cleaned = raw.replace(/```json|```/g, '').trim();

      const result = JSON.parse(cleaned) as AIAnalysisResult;
      await this.redis.set(`listing:${id}:analyze`, cleaned, 'EX', 3600);
      return result;
    } catch {
      return { error: 'Could not parse analysis' };
    }
  }
}
