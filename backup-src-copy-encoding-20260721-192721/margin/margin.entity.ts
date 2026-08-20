import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Margin {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    minAmount: number;

    @Column()
    maxAmount: number;

    @Column()
    minMargin: number;

    @Column()
    marginValue: number;

    @Column({ nullable: true })
    site: string;

    @Column()
    customId: string; // 🔥 추가

    @Column()
    accountPlatform: string;

    @Column({ nullable: true })
    exchangeRate: number;

    @Column()
    discountRate: number;
}
