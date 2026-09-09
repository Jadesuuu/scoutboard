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

/** Returned instead of an analysis when the AI path is unavailable. */
export interface AIAnalysisError {
  error: string;
}

const DEFAULT_ANALYSIS_TTL_SECONDS = 3600;

/** Parse a positive integer from config; anything else yields the fallback. */
function positiveInt(value: unknown, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
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

  /**
   * Grant or revoke the verified badge. Invalidates the browse cache because
   * `verified` is rendered inside the cached list payload, exactly like
   * `offersCount`.
   */
  async setVerified(id: string, verified: boolean) {
    const updated = await this.listingModel.findByIdAndUpdate(
      id,
      { $set: { verified } },
      { new: true },
    );
    await this.redis.del('listings');
    return updated;
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

  /**
   * Global daily cap on outbound AI calls, so a public demo can't run up the
   * bill. AI_DAILY_LIMIT unset/0 means unlimited (local dev behaviour).
   * Returns true when this call is within budget. The counter key rolls over
   * with the UTC date and expires on its own two days later.
   */
  private async withinDailyBudget(): Promise<boolean> {
    const limit = positiveInt(this.config.get('AI_DAILY_LIMIT'), 0);
    if (limit === 0) return true;

    const day = new Date().toISOString().slice(0, 10);
    const key = `ai:calls:${day}`;
    const count = await this.redis.incr(key);
    if (count === 1) {
      await this.redis.expire(key, 60 * 60 * 48);
    }
    return count <= limit;
  }

  async analyze(id: string): Promise<AIAnalysisResult | AIAnalysisError> {
    const cacheKey = `listing:${id}:analyze`;
    const cachedListingAnalization = await this.redis.get(cacheKey);

    if (cachedListingAnalization) {
      return JSON.parse(cachedListingAnalization) as AIAnalysisResult;
    }

    if (!this.config.get<string>('AI_API_KEY')) {
      return { error: 'AI analysis is not configured on this deployment.' };
    }

    if (!(await this.withinDailyBudget())) {
      return {
        error:
          'The AI analysis demo has hit its daily budget. Try again tomorrow.',
      };
    }

    const listing = await this.listingModel.findById(id).lean();
    const offers = await this.offerModel.find({ listingId: id }).lean();

    const userContent = JSON.stringify({ listing, offers });

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
      const ttl = positiveInt(
        this.config.get('AI_CACHE_TTL_SECONDS'),
        DEFAULT_ANALYSIS_TTL_SECONDS,
      );
      await this.redis.set(cacheKey, cleaned, 'EX', ttl);
      return result;
    } catch {
      return { error: 'Could not parse analysis' };
    }
  }
}
