import { Injectable } from '@nestjs/common';
import { CreateListingDto } from './dto/create-listing.dto';
import { UpdateListingDto } from './dto/update-listing.dto';
import { ListingRecord } from './listing.schema';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';

@Injectable()
export class ListingsService {

  constructor(@InjectModel(ListingRecord.name) private listingModel: Model<ListingRecord>) {}

  create(listingDto: CreateListingDto) {
    return this.listingModel.create(listingDto)
  }

  findAll() {
    return this.listingModel.find().sort({ createdAt: -1 }).limit(20);
  }

  addListing() {
    return 
  }

  // findOne(id: number) {
  //   return `This action returns a #${id} listing`;
  // }

  // update(id: number, updateListingDto: UpdateListingDto) {
  //   return `This action updates a #${id} listing`;
  // }

  // remove(id: number) {
  //   return `This action removes a #${id} listing`;
  // }
}

