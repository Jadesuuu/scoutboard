import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as MongooseSchema, Types } from 'mongoose';

@Schema({ timestamps: true })
export class OfferRecord {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Listing', required: true })
  listingId: Types.ObjectId; // pointer, foreign key MONGO style

  @Prop({ required: true })
  amount: number;

  @Prop({ required: true })
  bidderName: string;

  createdAt?: Date;
  updatedAt?: Date;
}

export const OfferSchema = SchemaFactory.createForClass(OfferRecord);
