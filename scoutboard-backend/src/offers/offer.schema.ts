import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';

@Schema({ timestamps: true })
export class OfferRecord {
  @Prop({ type: Types.ObjectId, ref: 'Listing', required: true })
  listingId: Types.ObjectId; // pointer, foreign key MONGO style

  @Prop({ required: true })
  amount: number;

  @Prop({ required: true })
  bidderName: string;

  createdAt?: Date;
  updatedAt?: Date;
}

export const OfferSchema = SchemaFactory.createForClass(OfferRecord);
