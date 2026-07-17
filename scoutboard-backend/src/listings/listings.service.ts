import { Inject, Injectable } from '@nestjs/common';
import { CreateListingDto } from './dto/create-listing.dto';
import { ListingRecord } from './listing.schema';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import Redis from 'ioredis';

@Injectable()
export class ListingsService {
  constructor(
    @InjectModel(ListingRecord.name) private listingModel: Model<ListingRecord>,
    @Inject('REDIS_CLIENT') private redis: Redis,
  ) {}

  create(listingDto: CreateListingDto) {
    return this.listingModel.create(listingDto);
  }

  async findAll() {
    const cachedListings = await this.redis.get('listings');

    if (cachedListings) {
      return JSON.parse(cachedListings) as ListingRecord[];
    }

    const listings = this.listingModel.find().sort({ createdAt: -1 }).limit(20);
    await this.redis.set('listings', JSON.stringify(await listings), 'EX', 60);
    return listings;
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
}
