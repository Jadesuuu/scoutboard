import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema({ timestamps: true })
export class ListingRecord {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  askingPrice: number;

  @Prop({ required: true })
  industry: string;

  @Prop({ required: true })
  establishedYear: number;

  @Prop({ required: true })
  monthlyRevenue: number;

  /**
   * Owner's monthly cash flow (seller's discretionary earnings). Optional:
   * listings created before this field existed carry no value for it, and the
   * UI shows an em dash rather than inventing one.
   */
  @Prop()
  monthlyCashFlow?: number;

  @Prop({ required: true })
  location: string;

  @Prop()
  description: string;

  @Prop({ default: 0 })
  views: number;

  @Prop({ default: 0 })
  offersCount: number;

  /**
   * Set by the platform once a seller's books have been checked, never by the
   * seller — so it is absent from CreateListingDto and only movable through
   * the admin-guarded `PATCH :id/verify` route.
   */
  @Prop({ default: false })
  verified: boolean;

  createdAt?: Date;
  updatedAt?: Date;
}

export type ListingDocument = HydratedDocument<ListingRecord>;
export const ListingRecordSchema = SchemaFactory.createForClass(ListingRecord);
