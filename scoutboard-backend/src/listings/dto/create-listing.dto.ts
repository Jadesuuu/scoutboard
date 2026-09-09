import {
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateListingDto {
  @IsString()
  @MaxLength(120)
  title: string;

  @IsNumber()
  @Min(0)
  askingPrice: number;

  @IsIn(['food', 'retail', 'services', 'tech', 'others'])
  industry: string;

  @IsNumber()
  @Min(1900)
  @Max(9999)
  establishedYear: number;

  @IsNumber()
  @Min(0)
  monthlyRevenue: number;

  /**
   * Optional — plenty of sellers list before they have a clean cash-flow
   * figure, and a wrong number is worse than a missing one.
   */
  @IsOptional()
  @IsNumber()
  @Min(0)
  monthlyCashFlow?: number;

  @IsString()
  @MaxLength(500)
  location: string;

  @IsString()
  @MaxLength(2000)
  description: string;
}
