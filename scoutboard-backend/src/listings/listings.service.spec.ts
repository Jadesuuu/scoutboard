import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { of } from 'rxjs';
import { ListingsService } from './listings.service';
import { ListingRecord } from './listing.schema';
import { OfferRecord } from 'src/offers/offer.schema';
import { ListingsGateway } from './listings.gateway';

describe('ListingsService', () => {
  let service: ListingsService;

  let listingModel: {
    create: jest.Mock;
    find: jest.Mock;
    findById: jest.Mock;
    findByIdAndDelete: jest.Mock;
    findByIdAndUpdate: jest.Mock;
  };
  let offerModel: {
    find: jest.Mock;
    deleteMany: jest.Mock;
  };
  let mockRedis: {
    get: jest.Mock;
    set: jest.Mock;
    del: jest.Mock;
    incr: jest.Mock;
  };
  let gateway: { broadcastListingUpdate: jest.Mock };
  let http: { post: jest.Mock };
  let config: { get: jest.Mock };

  beforeEach(async () => {
    listingModel = {
      create: jest.fn(),
      find: jest.fn(),
      findById: jest.fn(),
      findByIdAndDelete: jest.fn().mockResolvedValue({}),
      findByIdAndUpdate: jest.fn(),
    };
    offerModel = {
      find: jest.fn(),
      deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    };
    mockRedis = {
      get: jest.fn(),
      set: jest.fn().mockResolvedValue('OK'),
      del: jest.fn().mockResolvedValue(1),
      incr: jest.fn(),
    };
    gateway = { broadcastListingUpdate: jest.fn() };
    http = { post: jest.fn() };
    config = { get: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ListingsService,
        { provide: getModelToken(ListingRecord.name), useValue: listingModel },
        { provide: getModelToken(OfferRecord.name), useValue: offerModel },
        { provide: 'REDIS_CLIENT', useValue: mockRedis },
        { provide: ListingsGateway, useValue: gateway },
        { provide: HttpService, useValue: http },
        { provide: ConfigService, useValue: config },
      ],
    }).compile();

    service = module.get<ListingsService>(ListingsService);

    jest.clearAllMocks();
    // Restore default implementations wiped by clearAllMocks.
    listingModel.findByIdAndDelete.mockResolvedValue({});
    offerModel.deleteMany.mockResolvedValue({ deletedCount: 0 });
    mockRedis.set.mockResolvedValue('OK');
    mockRedis.del.mockResolvedValue(1);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create()', () => {
    it('persists the listing, invalidates the cache and broadcasts the plain object', async () => {
      const plain = { _id: 'l1', title: 'Coffee Shop' };
      const doc = { ...plain, toObject: () => plain };
      listingModel.create.mockResolvedValue(doc);

      const dto = { title: 'Coffee Shop' } as never;
      const result = await service.create(dto);

      expect(listingModel.create).toHaveBeenCalledWith(dto);
      expect(mockRedis.del).toHaveBeenCalledWith('listings');
      expect(gateway.broadcastListingUpdate).toHaveBeenCalledWith(plain);
      expect(result).toBe(doc);
    });
  });

  describe('findAll()', () => {
    it('returns parsed listings from cache on a hit (no DB query)', async () => {
      const cached = [{ _id: 'l1' }];
      mockRedis.get.mockResolvedValue(JSON.stringify(cached));

      const result = await service.findAll();

      expect(mockRedis.get).toHaveBeenCalledWith('listings');
      expect(result).toEqual(cached);
      expect(listingModel.find).not.toHaveBeenCalled();
      expect(mockRedis.set).not.toHaveBeenCalled();
    });

    it('queries the DB and repopulates the cache on a miss', async () => {
      mockRedis.get.mockResolvedValue(null);
      const listings = [{ _id: 'l1' }];
      // Mirror .find().sort().limit()
      listingModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue(listings),
        }),
      });

      const result = await service.findAll();

      expect(listingModel.find).toHaveBeenCalledTimes(1);
      expect(mockRedis.set).toHaveBeenCalledWith(
        'listings',
        JSON.stringify(listings),
        'EX',
        60,
      );
      expect(result).toBe(listings);
    });
  });

  describe('deleteById()', () => {
    it('deletes the listing, cascades its offers and invalidates the cache', async () => {
      await service.deleteById('l1');

      expect(listingModel.findByIdAndDelete).toHaveBeenCalledWith('l1');
      expect(offerModel.deleteMany).toHaveBeenCalledWith({ listingId: 'l1' });
      expect(mockRedis.del).toHaveBeenCalledWith('listings');
    });
  });

  describe('countViews()', () => {
    it('increments the redis view counter and writes it back to the listing', async () => {
      mockRedis.incr.mockResolvedValue(7);
      const updated = { _id: 'l1', views: 7 };
      listingModel.findByIdAndUpdate.mockResolvedValue(updated);

      const result = await service.countViews('l1');

      expect(mockRedis.incr).toHaveBeenCalledWith('listing:l1:views');
      expect(listingModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'l1',
        { $set: { views: 7 } },
        { new: true },
      );
      expect(result).toBe(updated);
    });
  });

  describe('analyze()', () => {
    const seedDocs = () => {
      listingModel.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue({ _id: 'l1', askingPrice: 100 }),
      });
      offerModel.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue([{ amount: 90 }]),
      });
    };

    it('returns the cached analysis on a hit without calling the AI', async () => {
      seedDocs();
      const cached = { verdict: 'Fairly priced' };
      mockRedis.get.mockResolvedValue(JSON.stringify(cached));

      const result = await service.analyze('l1');

      expect(mockRedis.get).toHaveBeenCalledWith('listing:l1:analyze');
      expect(result).toEqual(cached);
      expect(http.post).not.toHaveBeenCalled();
    });

    it('calls the AI, strips code fences, caches and returns the parsed result on a miss', async () => {
      seedDocs();
      mockRedis.get.mockResolvedValue(null);
      config.get.mockReturnValue('x'); // AI_BASE_URL/AI_MODEL/AI_API_KEY

      const analysis = {
        verdict: 'Fairly priced',
        fairValueLow: 80,
        fairValueHigh: 120,
        points: ['ok'],
        suggestedOffer: 95,
      };
      // Content wrapped in a ```json fence to exercise the cleanup regex.
      const content = '```json\n' + JSON.stringify(analysis) + '\n```';
      http.post.mockReturnValue(
        of({ data: { choices: [{ message: { content } }] } }),
      );

      const result = await service.analyze('l1');

      expect(http.post).toHaveBeenCalledTimes(1);
      expect(mockRedis.set).toHaveBeenCalledWith(
        'listing:l1:analyze',
        JSON.stringify(analysis),
        'EX',
        3600,
      );
      expect(result).toEqual(analysis);
    });

    it('returns an error object when the AI response cannot be parsed', async () => {
      seedDocs();
      mockRedis.get.mockResolvedValue(null);
      config.get.mockReturnValue('x');
      http.post.mockReturnValue(
        of({ data: { choices: [{ message: { content: 'not json' } }] } }),
      );

      const result = await service.analyze('l1');

      expect(result).toEqual({ error: 'Could not parse analysis' });
      expect(mockRedis.set).not.toHaveBeenCalled();
    });
  });
});
