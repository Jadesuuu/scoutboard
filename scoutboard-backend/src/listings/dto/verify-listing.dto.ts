import { IsBoolean } from 'class-validator';

/**
 * Body for `PATCH /listings/:id/verify`. Verification is a platform decision,
 * so it lives on its own admin-guarded route instead of being a field a seller
 * could set while creating a listing.
 */
export class VerifyListingDto {
  @IsBoolean()
  verified: boolean;
}
