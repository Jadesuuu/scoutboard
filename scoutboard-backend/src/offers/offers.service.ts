import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { OfferRecord } from './offer.schema';
import { Model, Types } from 'mongoose';
import { CreateOfferDto } from './dto/create-offer.dto';

@Injectable()
export class OffersService {
    constructor(@InjectModel(OfferRecord.name) private offerModel: Model<OfferRecord>) {}

    create(listingId: string, offerDto: CreateOfferDto) {
        this.assertValid(listingId);
        return this.offerModel.create({...offerDto, listingId})
    }

    private assertValid(id: string) {
        if (!Types.ObjectId.isValid(id)) {
            throw new BadRequestException('Invalid listing id');
        }
    }

    findForListing(listingId: string) {
        this.assertValid(listingId);
        return this.offerModel.find({ listingId }).sort({ createdAt: -1 }).limit(50);
    }


}
