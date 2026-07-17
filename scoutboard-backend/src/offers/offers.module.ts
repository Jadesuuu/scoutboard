import { Module } from '@nestjs/common';
import { OffersService } from './offers.service';
import { OffersController } from './offers.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { OfferRecord, OfferSchema } from './offer.schema';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';
import {
  ListingRecord,
  ListingRecordSchema,
} from 'src/listings/listing.schema';
import { OffersGateway } from './offers.gateway';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: OfferRecord.name, schema: OfferSchema },
      { name: ListingRecord.name, schema: ListingRecordSchema },
    ]),
  ],
  controllers: [OffersController],
  providers: [
    OffersService,
    OffersGateway,
    {
      provide: 'REDIS_CLIENT',
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        return new Redis(config.get('REDIS_URL')!);
      },
    },
  ],
})
export class OffersModule {}
