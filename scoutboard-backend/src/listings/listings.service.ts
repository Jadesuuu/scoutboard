import { Injectable } from '@nestjs/common';
import { CreateListingDto } from './dto/create-listing.dto';
import { ListingRecord } from './listing.schema';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';

@Injectable()
export class ListingsService {
  constructor(
    @InjectModel(ListingRecord.name) private listingModel: Model<ListingRecord>,
  ) {}

  create(listingDto: CreateListingDto) {
    return this.listingModel.create(listingDto);
  }

  findAll() {
    return this.listingModel.find().sort({ createdAt: -1 }).limit(20);
  }

  addListing() {
    //
  }
}
