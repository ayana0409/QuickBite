import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { RequestStatus, RequestType } from '../enums/request.enum';

/**
 * Payload interface for Restaurant Registration requests.
 */
export interface RestaurantRegistrationPayload {
  ownerId?: string;
  name: string;
  slug: string;
  address: {
    line1: string;
    ward: string;
    district: string;
    city: string;
    geo: {
      type: string;
      coordinates: [number, number];
    };
  };
}

/**
 * Payload interface for Food Report requests.
 */
export interface FoodReportPayload {
  foodItemId: string;
  reason: string;
  description?: string;
}

/**
 * Payload interface for System Feedback requests.
 */
export interface SystemFeedbackPayload {
  subject: string;
  content: string;
}

/**
 * Union type representing all supported payload formats.
 */
export type CatalogRequestPayload =
  | RestaurantRegistrationPayload
  | FoodReportPayload
  | SystemFeedbackPayload
  | Record<string, unknown>;

@Entity('catalog_requests')
export class CatalogRequest {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column('uuid')
  userId!: string;

  @Column({
    type: 'enum',
    enum: RequestType,
  })
  type!: RequestType;

  @Column({
    type: 'enum',
    enum: RequestStatus,
    default: RequestStatus.PENDING,
  })
  status!: RequestStatus;

  @Column('jsonb')
  payload!: CatalogRequestPayload;

  @Column({
    type: 'text',
    nullable: true,
  })
  adminNote!: string | null;

  @Column({
    type: 'uuid',
    nullable: true,
  })
  processedBy!: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
