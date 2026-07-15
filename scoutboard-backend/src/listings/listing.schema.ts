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
  monthlyRevenue: number;

  @Prop({ required: true })
  location: string;

  @Prop()
  description: string;

  createdAt?: Date;
  updatedAt?: Date;
}

export type ListingDocument = HydratedDocument<ListingRecord>;
export const ListingRecordSchema = SchemaFactory.createForClass(ListingRecord);
