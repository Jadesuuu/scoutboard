import { Test, TestingModule } from '@nestjs/testing';
import { OffersController } from './offers.controller';
import { OffersService } from './offers.service';
import { CreateOfferDto } from './dto/create-offer.dto';

describe('OffersController', () => {
  let controller: OffersController;
  let service: { create: jest.Mock; findForListing: jest.Mock };

  beforeEach(async () => {
    service = { create: jest.fn(), findForListing: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OffersController],
      providers: [{ provide: OffersService, useValue: service }],
    }).compile();

    controller = module.get<OffersController>(OffersController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('create() delegates to the service with the listingId and dto', () => {
    const dto = Object.assign(new CreateOfferDto(), {
      amount: 5000,
      bidderName: 'Jane Doe',
    });
    const expected = { _id: 'offer1' };
    service.create.mockReturnValue(expected);

    const result = controller.create('listing1', dto);

    expect(service.create).toHaveBeenCalledWith('listing1', dto);
    expect(result).toBe(expected);
  });

  it('findForListing() delegates to the service with the listingId', () => {
    const expected = [{ _id: 'offer1' }];
    service.findForListing.mockReturnValue(expected);

    const result = controller.findForListing('listing1');

    expect(service.findForListing).toHaveBeenCalledWith('listing1');
    expect(result).toBe(expected);
  });
});
