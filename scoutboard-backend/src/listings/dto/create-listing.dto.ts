import { IsIn, IsNumber, IsString, MaxLength, Min } from 'class-validator'

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
    @Min(0)
    monthlyRevenue: number;

    @IsString()
    @MaxLength(500)
    location: string;

    @IsString()
    @MaxLength(2000)
    description: string;
}