import { Types } from 'mongoose';
import { OfferSchema } from './offer.schema';

describe('OfferSchema', () => {
  it('listingId is a real ObjectId path, not Mixed', () => {
    expect(OfferSchema.path('listingId').instance).toBe('ObjectId');
  });

  it('listingId casts string ids to ObjectId', () => {
    const idStr = new Types.ObjectId().toString();
    const cast = OfferSchema.path('listingId').cast(idStr) as Types.ObjectId;

    expect(cast).toBeInstanceOf(Types.ObjectId);
    expect(cast.toString()).toBe(idStr);
  });
});
