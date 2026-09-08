import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { ListingsService } from './listings.service';
import { CreateListingDto } from './dto/create-listing.dto';
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

  @UseGuards(AdminKeyGuard)
  @Delete(':id/delete')
  async delete(@Param('id') id: string) {
    return await this.listingsService.deleteById(id);
  }
}
