import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { ListingsService } from './listings.service';
import { CreateListingDto } from './dto/create-listing.dto';
import { VerifyListingDto } from './dto/verify-listing.dto';
import { AdminKeyGuard } from '../common/admin-key.guard';
// import { UpdateListingDto } from './dto/update-listing.dto';

@Controller('listings')
export class ListingsController {
  constructor(private readonly listingsService: ListingsService) {}

  @Post()
  create(@Body() createListingDto: CreateListingDto) {
    return this.listingsService.create(createListingDto);
  }

  @Get()
  findAll() {
    return this.listingsService.findAll();
  }

  @Get(':id')
  async countViews(@Param('id') id: string) {
    return this.listingsService.countViews(id);
  }

  @Post(':id/analyze')
  async analyze(@Param('id') id: string) {
    return await this.listingsService.analyze(id);
  }

  /**
   * Verification is granted by the platform, not claimed by the seller, so it
   * sits behind the same admin key as the destructive routes.
   */
  @UseGuards(AdminKeyGuard)
  @Patch(':id/verify')
  async verify(@Param('id') id: string, @Body() body: VerifyListingDto) {
    return await this.listingsService.setVerified(id, body.verified);
  }

  @UseGuards(AdminKeyGuard)
  @Delete(':id/delete')
  async delete(@Param('id') id: string) {
    return await this.listingsService.deleteById(id);
  }
}
