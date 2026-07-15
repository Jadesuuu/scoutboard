import { Module } from '@nestjs/common';
import { OffersService } from './offers.service';
import { OffersController } from './offers.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { OfferRecord, OfferSchema } from './offer.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: OfferRecord.name, schema: OfferSchema },
    ]),
  ],
  controllers: [OffersController],
  providers: [OffersService],
})
export class OffersModule {}
