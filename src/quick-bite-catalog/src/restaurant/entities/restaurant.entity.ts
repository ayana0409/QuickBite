import { Category } from '@/category/entities/category.entity';
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    Index,
    OneToMany,
} from 'typeorm';

@Entity("restaurants")
export class Restaurant {

    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column("uuid")
    ownerId!: string;

    @Index({ unique: true })
    @Column()
    slug!: string;

    @Column()
    name!: string;

    @Column("jsonb")
    address!: {
        line1: string;
        ward: string;
        district: string;
        city: string;
        geo: {
            type: "Point";
            coordinates: [number, number];
        };
    };

    @Column({
        default: "closed",
    })
    status!: string;

    @Column("jsonb", {
        default: () =>
            `'{"avg":0,"count":0}'`,
    })
    rating!: {
        avg: number;
        count: number;
    };

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;

    @OneToMany(() => Category, (category) => category.restaurant)
    categories!: Category[];
}