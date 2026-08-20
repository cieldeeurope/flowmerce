import {  Column,  CreateDateColumn,  Entity,  PrimaryGeneratedColumn,  UpdateDateColumn,  Index,} from "typeorm";

@Entity()
@Index(['styleId', 'site', 'customId', 'accountPlatform'], { unique: true })
@Index(['site', 'customId', 'accountPlatform'])
@Index(['styleId'])
export class Product {

    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    site: string;

    /* =====================
        📦 기본 정보
    ===================== */

    @Column()
    designer: string;

    @Column()
    categoryName: string;

    @Column()
    title: string;

    @Column()
    price: number;

    @Column()
    styleId: string;

    @Column()
    size: string;

    @Column({ nullable: true })
    color?: string;

    @Column({ nullable: true })
    brandstyleId?: string;

    @Column({ nullable: true })
    madeIn?: string;

    @Column()
    mainInfo: string;

    @Column({ nullable: true }) // Farfetch 전용
    fixedPrice?: number;

    @Column({ nullable: true })
    addoptionprice?: string;

    /* =====================
        🔗 URL
    ===================== */

    @Column({ nullable: true })
    siteUrl?: string;

    @Column({ nullable: true })
    visitUrl?: string;


    /* =====================
        🏪 커머스별 데이터
    ===================== */

    @Column({ nullable: true })
    godoMallCategoryCode: string;

    @Column({ nullable: true })
    goodsno?: number;

    @Column({ nullable: true })
    platformProductCode?: string;

    @Column({ nullable: true })
    smartstoreCategoryCode?: string;

    @Column({ nullable: true })
    smartstoreChannelProductNo?: string;

    /* =====================
        🖼️ 이미지
    ===================== */

    @Column()
    mainImageUrl: string;

    @Column('simple-array')
    additionalImageUrls: string[];


    /* =====================
        🏷️ 플랫폼
    ===================== */

    @Column()
    platform: string;

    @Column()
    accountPlatform: string;

    /* =====================
        📅 시간 및 touched
    ===================== */

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    lastModifiedDate: Date;

    @Column({ default: false })
    touched: boolean;


    /* =====================
            계정
    ===================== */

    @Column({ nullable: true })
    customId: string;

}
