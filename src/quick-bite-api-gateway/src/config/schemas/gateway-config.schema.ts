import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type GatewayConfigDocument = GatewayConfig & Document;

@Schema({ collection: 'gateway_configs', timestamps: true })
export class GatewayConfig {
  @Prop({ required: true, unique: true })
  key: string;

  @Prop({ required: true })
  value: string;
}

export const GatewayConfigSchema = SchemaFactory.createForClass(GatewayConfig);
