import { IsNumber, IsString, MaxLength, Min } from 'class-validator';

export class CreateOfferDto {
  @IsNumber()
  @Min(0)
  amount: number;

  @IsString()
  @MaxLength(40)
  bidderName: string;
}
