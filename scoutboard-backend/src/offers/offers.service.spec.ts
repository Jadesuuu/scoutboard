import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, HttpException, HttpStatus } from '@nestjs/common';
import { OffersService } from './offers.service';
import { OfferRecord } from './offer.schema';
import { ListingRecord } from 'src/listings/listing.schema';
import { OffersGateway } from './offers.gateway';

// A syntactically valid 24-char hex ObjectId string.
const VALID_LISTING_ID = '507f1f77bcf86cd799439011';

describe('OffersService', () => {
  let service: OffersService;

  // Mongoose model mocks — each key mirrors exactly the method the real
  // service calls on that model.
  let offerModel: {
    create: jest.Mock;
    countDocuments: jest.Mock;
    find: jest.Mock;
  };
  let listingModel: {
    updateOne: jest.Mock;
    find: jest.Mock;
    aggregate: jest.Mock;
    findByIdAndUpdate: jest.Mock;
  };
  let mockRedis: {
    get: jest.Mock;
    set: jest.Mock;
    del: jest.Mock;
    incr: jest.Mock;
    expire: jest.Mock;
  };
  let gateway: { broadcastOfferUpdate: jest.Mock };
  let config: { get: jest.Mock };

  beforeEach(async () => {
    offerModel = {
      create: jest.fn(),
      countDocuments: jest.fn(),
      find: jest.fn(),
    };
    listingModel = {
      updateOne: jest.fn().mockResolvedValue({ acknowledged: true }),
      find: jest.fn(),
      aggregate: jest.fn(),
      findByIdAndUpdate: jest.fn().mockResolvedValue({}),
    };
    mockRedis = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn().mockResolvedValue(1),
      incr: jest.fn(),
      expire: jest.fn().mockResolvedValue(1),
    };
    gateway = { broadcastOfferUpdate: jest.fn() };
    config = { get: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OffersService,
        { provide: getModelToken(OfferRecord.name), useValue: offerModel },
        { provide: getModelToken(ListingRecord.name), useValue: listingModel },
        { provide: 'REDIS_CLIENT', useValue: mockRedis },
        { provide: OffersGateway, useValue: gateway },
        { provide: ConfigService, useValue: config },
      ],
    }).compile();

    service = module.get<OffersService>(OffersService);

    jest.clearAllMocks();
    // clearAllMocks wipes the default implementations set above, so restore
    // the ones the happy paths rely on.
    listingModel.updateOne.mockResolvedValue({ acknowledged: true });
    listingModel.findByIdAndUpdate.mockResolvedValue({});
    mockRedis.del.mockResolvedValue(1);
    mockRedis.expire.mockResolvedValue(1);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create()', () => {
    it('happy path — persists the offer, increments the listing, invalidates cache and broadcasts', async () => {
      // First request within the window: incr -> 1 (<= 5, under the limit).
      mockRedis.incr.mockResolvedValue(1);

      const dto = { amount: 5000, bidderName: 'Jane Doe' };
      const plainOffer = {
        _id: 'offer1',
        ...dto,
        listingId: VALID_LISTING_ID,
      };
      // offerModel.create resolves to a hydrated doc whose .toObject() yields
      // the plain object the gateway is expected to broadcast.
      const createdDoc = { ...plainOffer, toObject: () => plainOffer };
      offerModel.create.mockResolvedValue(createdDoc);

      const result = await service.create(VALID_LISTING_ID, dto);

      // Offer created with the dto merged with the listingId.
      expect(offerModel.create).toHaveBeenCalledTimes(1);
      expect(offerModel.create).toHaveBeenCalledWith({
        ...dto,
        listingId: VALID_LISTING_ID,
      });

      // Listing offersCount incremented by exactly one.
      expect(listingModel.updateOne).toHaveBeenCalledTimes(1);
      expect(listingModel.updateOne).toHaveBeenCalledWith(
        { _id: VALID_LISTING_ID },
        { $inc: { offersCount: 1 } },
      );

      // Cache invalidation for this listing's analysis cache entry.
      expect(mockRedis.del).toHaveBeenCalledWith(
        `listing:${VALID_LISTING_ID}:analyze`,
      );

      // Broadcast receives the plain object (the .toObject() result), not the
      // hydrated document.
      expect(gateway.broadcastOfferUpdate).toHaveBeenCalledTimes(1);
      expect(gateway.broadcastOfferUpdate).toHaveBeenCalledWith(plainOffer);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      const broadcastArg = gateway.broadcastOfferUpdate.mock.calls[0][0];
      expect(broadcastArg).not.toHaveProperty('toObject');

      // The created (hydrated) doc is returned.
      expect(result).toBe(createdDoc);
    });

    it('past the rate limit — throws 429 and performs no side effects', async () => {
      // incr returns a value over the limit of 5.
      mockRedis.incr.mockResolvedValue(6);

      const dto = { amount: 5000, bidderName: 'Jane Doe' };

      await expect(service.create(VALID_LISTING_ID, dto)).rejects.toMatchObject(
        {
          // HttpException carrying the TOO_MANY_REQUESTS status.
          status: HttpStatus.TOO_MANY_REQUESTS,
        },
      );
      await expect(
        service.create(VALID_LISTING_ID, dto),
      ).rejects.toBeInstanceOf(HttpException);

      // Rejection happens before any side effect.
      expect(offerModel.create).not.toHaveBeenCalled();
      expect(listingModel.updateOne).not.toHaveBeenCalled();
      expect(mockRedis.del).not.toHaveBeenCalled();
      expect(gateway.broadcastOfferUpdate).not.toHaveBeenCalled();
    });

    it('invalid listingId — throws BadRequestException before touching anything', async () => {
      const dto = { amount: 5000, bidderName: 'Jane Doe' };

      await expect(
        service.create('not-an-object-id', dto),
      ).rejects.toBeInstanceOf(BadRequestException);

      // Validation short-circuits before the rate limit check and all side effects.
      expect(mockRedis.incr).not.toHaveBeenCalled();
      expect(offerModel.create).not.toHaveBeenCalled();
      expect(listingModel.updateOne).not.toHaveBeenCalled();
      expect(mockRedis.del).not.toHaveBeenCalled();
      expect(gateway.broadcastOfferUpdate).not.toHaveBeenCalled();
    });
  });

  describe('cleanOfferAndViews() — offersCount reconciler', () => {
    it('repairs drift — updates only listings whose stored count differs from the true count', async () => {
      const listings = [
        { _id: 'listingDrift', offersCount: 2 }, // stored 2, real 5 -> drift
        { _id: 'listingOk', offersCount: 3 }, // stored 3, real 3 -> matches
      ];
      // Real code: this.listingModel.find().select('_id offersCount')
      // .select resolves to the array (it is awaited directly).
      listingModel.find.mockReturnValue({
        select: jest.fn().mockResolvedValue(listings),
      });

      // countDocuments returns the true count per listing, in call order.
      offerModel.countDocuments
        .mockResolvedValueOnce(5) // listingDrift true count
        .mockResolvedValueOnce(3); // listingOk true count

      await service.reconcileOffersCounts();

      // countDocuments queried per listing by listingId.
      expect(offerModel.countDocuments).toHaveBeenCalledWith({
        listingId: 'listingDrift',
      });
      expect(offerModel.countDocuments).toHaveBeenCalledWith({
        listingId: 'listingOk',
      });

      // Only the drifted listing is corrected, to the true count.
      expect(listingModel.updateOne).toHaveBeenCalledTimes(1);
      expect(listingModel.updateOne).toHaveBeenCalledWith(
        { _id: 'listingDrift' },
        { $set: { offersCount: 5 } },
      );
      // The matching listing is never written.
      expect(listingModel.updateOne).not.toHaveBeenCalledWith(
        { _id: 'listingOk' },
        expect.anything(),
      );
    });

    it('no drift — every stored count matches, so no writes happen', async () => {
      const listings = [
        { _id: 'listingA', offersCount: 1 },
        { _id: 'listingB', offersCount: 4 },
      ];
      listingModel.find.mockReturnValue({
        select: jest.fn().mockResolvedValue(listings),
      });

      offerModel.countDocuments
        .mockResolvedValueOnce(1) // matches listingA
        .mockResolvedValueOnce(4); // matches listingB

      await service.reconcileOffersCounts();

      expect(offerModel.countDocuments).toHaveBeenCalledTimes(2);
      expect(listingModel.updateOne).not.toHaveBeenCalled();
    });
  });

  describe('findForListing()', () => {
    it('validates the id and returns the built query (sorted, limited)', () => {
      // The service returns the query builder directly (no await), so the mock
      // mirrors the .find().sort().limit() chain.
      const query = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
      };
      offerModel.find.mockReturnValue(query);

      const result = service.findForListing(VALID_LISTING_ID);

      expect(offerModel.find).toHaveBeenCalledWith({
        listingId: VALID_LISTING_ID,
      });
      expect(query.sort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(query.limit).toHaveBeenCalledWith(50);
      expect(result).toBe(query);
    });

    it('throws BadRequestException on an invalid id without querying', () => {
      expect(() => service.findForListing('nope')).toThrow(BadRequestException);
      expect(offerModel.find).not.toHaveBeenCalled();
    });
  });

  describe('scheduledRandomOffer() — simulator cron', () => {
    it('does nothing when SIMULATOR_ENABLED is not "true"', async () => {
      config.get.mockReturnValue(undefined);

      await service.scheduledRandomOffer();

      expect(listingModel.aggregate).not.toHaveBeenCalled();
      expect(offerModel.create).not.toHaveBeenCalled();
    });

    it('returns early when no random listing is sampled', async () => {
      config.get.mockReturnValue('true');
      listingModel.aggregate.mockResolvedValue([]); // $sample yields nothing

      await service.scheduledRandomOffer();

      expect(listingModel.aggregate).toHaveBeenCalledTimes(1);
      expect(offerModel.create).not.toHaveBeenCalled();
    });

    it('creates a randomized offer and bumps the listing views when enabled', async () => {
      config.get.mockReturnValue('true');
      listingModel.aggregate.mockResolvedValue([
        { _id: VALID_LISTING_ID, askingPrice: 100000 },
      ]);
      // create() runs for real, so its dependencies must be scripted.
      mockRedis.incr.mockResolvedValue(1);
      const created = { toObject: () => ({ _id: 'o1' }) };
      offerModel.create.mockResolvedValue(created);

      await service.scheduledRandomOffer();

      // An offer was created for the sampled listing...
      expect(offerModel.create).toHaveBeenCalledTimes(1);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const createArg = offerModel.create.mock.calls[0][0] as {
        listingId: string;
        amount: number;
        bidderName: string;
      };
      expect(createArg.listingId).toBe(VALID_LISTING_ID);
      expect(typeof createArg.amount).toBe('number');
      expect(typeof createArg.bidderName).toBe('string');
      // ...and the view counter was incremented on that listing.
      expect(listingModel.findByIdAndUpdate).toHaveBeenCalledWith(
        VALID_LISTING_ID,
        { $inc: { views: 1 } },
      );
      // The offer create path still broadcast.
      expect(gateway.broadcastOfferUpdate).toHaveBeenCalledTimes(1);
    });
  });
});
