import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { OfferRecord } from './offer.schema';
import { Model, Types } from 'mongoose';
import { CreateOfferDto } from './dto/create-offer.dto';
import redis from 'ioredis';
import { ListingRecord } from 'src/listings/listing.schema';
import { OffersGateway } from './offers.gateway';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';

interface ListingProps {
  _id: string;
  title: string;
  industry: string;
  location: string;
  askingPrice: number;
  monthlyRevenue: number;
  description: string;
  views: number;
  offersCount: number;
  establishedYear: number;
}

@Injectable()
export class OffersService {
  constructor(
    @InjectModel(OfferRecord.name) private offerModel: Model<OfferRecord>,
    @InjectModel(ListingRecord.name) private listingModel: Model<ListingRecord>,
    @Inject('REDIS_CLIENT') private redis: redis,
    private gateway: OffersGateway,
    private config: ConfigService,
  ) {}

  async create(listingId: string, offerDto: CreateOfferDto) {
    this.assertValid(listingId);
    await this.checkRateLimit(listingId);
    const newOffer = await this.offerModel.create({ ...offerDto, listingId });
    await this.redis.del(`listing:${listingId}:analyze`);
    await this.redis.del('listings');

    await this.listingModel.updateOne(
      { _id: listingId },
      { $inc: { offersCount: 1 } },
    );

    this.gateway.broadcastOfferUpdate(newOffer.toObject());
    return newOffer;
  }

  private assertValid(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid listing id');
    }
  }

  findForListing(listingId: string) {
    this.assertValid(listingId);
    return this.offerModel
      .find({ listingId })
      .sort({ createdAt: -1 })
      .limit(50);
  }

  async checkRateLimit(userKey: string) {
    const key = `rl:${userKey}`;
    const count = await this.redis.incr(key);
    if (count === 1) {
      await this.redis.expire(key, 60);
    }
    if (count > 5) {
      throw new HttpException(
        'Too many requests',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async scheduledRandomOffer() {
    if (this.config.get<string>('SIMULATOR_ENABLED') !== 'true') return;

    const [randomListing]: ListingProps[] = await this.listingModel.aggregate([
      {
        $sample: { size: 1 },
      },
    ]);

    if (!randomListing) return;
    const names = [
      'Mark James',
      'Ren Don',
      'Jane Doe',
      'Robert Sylas',
      'Jett Fizz',
      'Oner Halp',
    ];
    const bidderName = names[Math.floor(Math.random() * names.length)];
    const amount = Math.round(
      randomListing.askingPrice * (0.6 + Math.random() * 0.5),
    );

    await this.create(randomListing._id.toString(), { amount, bidderName });
    await this.listingModel.findByIdAndUpdate(randomListing._id, {
      $inc: { views: 1 },
    });
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async reconcileOffersCounts() {
    const listings = await this.listingModel.find().select('_id offersCount');
    for (const listing of listings) {
      const trueCount = await this.offerModel.countDocuments({
        listingId: listing._id,
      });
      if (trueCount !== listing.offersCount) {
        await this.listingModel.updateOne(
          { _id: listing._id },
          { $set: { offersCount: trueCount } },
        );
      }
    }
  }
}
