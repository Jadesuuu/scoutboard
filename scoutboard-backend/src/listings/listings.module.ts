import { Module } from '@nestjs/common';
import { ListingsService } from './listings.service';
import { ListingsController } from './listings.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { ListingRecord, ListingRecordSchema } from './listing.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ListingRecord.name, schema: ListingRecordSchema },
    ]),
  ],
  controllers: [ListingsController],
  providers: [ListingsService],
})
export class ListingsModule {}
