import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('reviews')
@Index('IDX_REVIEW_ORDER_FOOD', ['orderId', 'foodItemId'], { unique: true })
@Index('IDX_REVIEW_RESTAURANT_ID', ['restaurantId'])
@Index('IDX_REVIEW_FOOD_ITEM_ID', ['foodItemId'])
export class Review {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  orderId!: string;

  @Column()
  restaurantId!: string;

  @Column()
  foodItemId!: string;

  @Column()
  userId!: string;

  @Column('int')
  rating!: number;

  @Column({ type: 'text', nullable: true })
  comment?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
