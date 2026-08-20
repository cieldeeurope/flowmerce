import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';

@Entity()
@Index(['customId', 'sourceAccountPlatform', 'targetPlatform', 'targetAccountPlatform', 'styleId'], { unique: true })
@Index(['customId', 'targetPlatform', 'targetAccountPlatform'])
@Index(['sourceProductId'])
export class PlatformProduct {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ nullable: true })
    sourceProductId?: number;

    @Column()
    customId: string;

    @Column()
    sourceAccountPlatform: string;

    @Column()
    targetPlatform: string;

    @Column()
    targetAccountPlatform: string;

    @Column()
    site: string;

    @Column({ nullable: true })
    designer?: string;

    @Column()
    title: string;

    @Column()
    styleId: string;

    @Column({ nullable: true })
    brandstyleId?: string;

    @Column({ nullable: true })
    categoryName?: string;

    @Column({ nullable: true })
    sourceCategoryName?: string;

    @Column({ nullable: true })
    siteUrl?: string;

    @Column({ nullable: true })
    visitUrl?: string;

    @Column({ nullable: true })
    targetCategoryCode?: string;

    @Column({ nullable: true })
    targetCategoryName?: string;

    @Column({ nullable: true })
    targetCategoryPath?: string;

    @Column()
    price: number;

    @Column({ nullable: true })
    targetPrice?: number;

    @Column({ nullable: true })
    size?: string;

    @Column({ nullable: true })
    color?: string;

    @Column({ nullable: true })
    madeIn?: string;

    @Column({ type: 'text', nullable: true })
    mainInfo?: string;

    @Column({ nullable: true })
    mainImageUrl?: string;

    @Column('simple-array', { nullable: true })
    additionalImageUrls?: string[];

    @Column({ nullable: true })
    externalProductNo?: string;

    @Column({ nullable: true })
    externalSellerProductNo?: string;

    @Column({ nullable: true })
    externalGoodsNo?: string;

    @Column({ type: 'jsonb', nullable: true })
    externalOptionData?: any;

    @Column({ type: 'jsonb', nullable: true })
    metadata?: any;

    @Column({ type: 'jsonb', nullable: true })
    rawResponse?: any;

    @Column({ default: 'pending' })
    status: string;

    @Column({ type: 'text', nullable: true })
    lastError?: string;

    @Column({ type: 'timestamp', nullable: true })
    lastSyncedAt?: Date;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
