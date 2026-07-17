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

@Injectable()
export class OffersService {
  constructor(
    @InjectModel(OfferRecord.name) private offerModel: Model<OfferRecord>,
    @InjectModel(ListingRecord.name) private listingModel: Model<ListingRecord>,
    @Inject('REDIS_CLIENT') private redis: redis,
    private gateway: OffersGateway,
  ) {}

  async create(listingId: string, offerDto: CreateOfferDto) {
    await this.checkRateLimit('global');
    this.assertValid(listingId);
    const newOffer = await this.offerModel.create({ ...offerDto, listingId });
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
}
