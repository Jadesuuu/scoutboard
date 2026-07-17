import { Body, Controller, Param, Post, Get } from '@nestjs/common';
import { OffersService } from './offers.service';
import { CreateOfferDto } from './dto/create-offer.dto';

@Controller('listings/:listingId/offers')
export class OffersController {
  constructor(private readonly offersService: OffersService) {}

  @Post()
  create(
    @Param('listingId') listingId: string,
    @Body() createOfferDto: CreateOfferDto,
  ) {
    return this.offersService.create(listingId, createOfferDto);
  }

  @Get()
  findForListing(@Param('listingId') listingId: string) {
    return this.offersService.findForListing(listingId);
  }
}
