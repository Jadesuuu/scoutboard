import { Module } from '@nestjs/common';
import { ListingsService } from './listings.service';
import { ListingsController } from './listings.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { ListingRecord, ListingRecordSchema } from './listing.schema';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { ListingsGateway } from './listings.gateway';
import { OfferRecord, OfferSchema } from 'src/offers/offer.schema';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [
    HttpModule,
    MongooseModule.forFeature([
      { name: ListingRecord.name, schema: ListingRecordSchema },
      { name: OfferRecord.name, schema: OfferSchema },
    ]),
  ],
  controllers: [ListingsController],
  providers: [
    ListingsService,
    ListingsGateway,
    {
      provide: 'REDIS_CLIENT',
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        return new Redis(config.get('REDIS_URL')!);
      },
    },
  ],
})
export class ListingsModule {}
