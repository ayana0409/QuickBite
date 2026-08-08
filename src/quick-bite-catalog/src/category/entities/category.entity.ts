import { Restaurant } from '@/restaurant/entities/restaurant.entity';
import {
    Column,
    Entity,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn,
    JoinColumn,
    ManyToOne,
} from 'typeorm';

@Entity('categories')
export class Category {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column('uuid')
    restaurantId: string = "";

    @Column({
        type: 'varchar',
        length: 100,
    })
    name!: string;

    @Column({
        type: 'int',
        default: 0,
    })
    sortOrder: number = 0;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;

    @ManyToOne(() => Restaurant, (restaurant) => restaurant.categories, {
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'restaurantId' })
    restaurant: Restaurant | undefined;
}