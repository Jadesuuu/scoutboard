import { Test, TestingModule } from '@nestjs/testing';
import { ListingsController } from './listings.controller';
import { ListingsService } from './listings.service';
import { CreateListingDto } from './dto/create-listing.dto';

describe('ListingsController', () => {
  let controller: ListingsController;
  let service: {
    create: jest.Mock;
    findAll: jest.Mock;
    countViews: jest.Mock;
    analyze: jest.Mock;
    deleteById: jest.Mock;
  };

  beforeEach(async () => {
    service = {
      create: jest.fn(),
      findAll: jest.fn(),
      countViews: jest.fn(),
      analyze: jest.fn(),
      deleteById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ListingsController],
      providers: [{ provide: ListingsService, useValue: service }],
    }).compile();

    controller = module.get<ListingsController>(ListingsController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('create() delegates to the service', () => {
    const dto = Object.assign(new CreateListingDto(), {
      title: 'Coffee Shop',
      askingPrice: 100000,
      industry: 'food',
      establishedYear: 2015,
      monthlyRevenue: 5000,
      location: 'NYC',
      description: 'A shop',
    });
    const expected = { _id: 'l1' };
    service.create.mockReturnValue(expected);

    expect(controller.create(dto)).toBe(expected);
    expect(service.create).toHaveBeenCalledWith(dto);
  });

  it('findAll() delegates to the service', () => {
    const expected = [{ _id: 'l1' }];
    service.findAll.mockReturnValue(expected);

    expect(controller.findAll()).toBe(expected);
    expect(service.findAll).toHaveBeenCalledTimes(1);
  });

  it('countViews() delegates to the service with the id', async () => {
    const expected = { _id: 'l1', views: 1 };
    service.countViews.mockResolvedValue(expected);

    await expect(controller.countViews('l1')).resolves.toBe(expected);
    expect(service.countViews).toHaveBeenCalledWith('l1');
  });

  it('analyze() delegates to the service with the id', async () => {
    const expected = { verdict: 'Fairly priced' };
    service.analyze.mockResolvedValue(expected);

    await expect(controller.analyze('l1')).resolves.toBe(expected);
    expect(service.analyze).toHaveBeenCalledWith('l1');
  });

  it('delete() delegates to the service with the id', async () => {
    service.deleteById.mockResolvedValue(undefined);

    await controller.delete('l1');
    expect(service.deleteById).toHaveBeenCalledWith('l1');
  });
});
