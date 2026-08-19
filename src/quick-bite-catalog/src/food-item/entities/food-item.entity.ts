import {
  Column,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export class FoodVariant {
  name!: string;
  priceDelta!: number;
}

export class FoodTopping {
  name!: string;
  price!: number;
}

@Entity('food_items')
@Index('IDX_FOOD_ITEM_SKU', ['sku'], { unique: true })
@Index('IDX_FOOD_ITEM_CATEGORY_ID', ['categoryId'])
@Index('IDX_FOOD_ITEM_RESTAURANT_ID', ['restaurantId'])
export class FoodItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  categoryId!: string;

  @Column('uuid')
  restaurantId!: string;

  @Column({ unique: true })
  sku!: string;

  @Column()
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
  })
  price!: number;

  @Column({ default: 'VND' })
  currency!: string;

  @Column('text', {
    array: true,
    default: () => "'{}'",
  })
  images!: string[];

  @Column({ default: true })
  isAvailable!: boolean;

  @Column({ default: 15 })
  preparationTime!: number;

  @Column('text', {
    array: true,
    default: () => "'{}'",
  })
  tags!: string[];

  @Column({ default: 0 })
  totalSold!: number;

  @Column({
    type: 'decimal',
    precision: 3,
    scale: 2,
    default: 0,
  })
  rating!: number;

  @Column({ default: 0 })
  reviewCount!: number;

  @Column({
    type: 'jsonb',
    default: () => "'[]'",
  })
  variants!: FoodVariant[];

  @Column({
    type: 'jsonb',
    default: () => "'[]'",
  })
  toppings!: FoodTopping[];
}