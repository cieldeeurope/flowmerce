import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';

@Entity()
@Index(['customId', 'sourceAccountPlatform', 'targetPlatform', 'targetAccountPlatform', 'site', 'sourceSiteUrl'], { unique: true })
@Index(['customId', 'targetPlatform', 'targetAccountPlatform'])
export class PlatformMapping {
    @PrimaryGeneratedColumn()
    id: number;

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

    @Column()
    sourceCategoryName: string;

    @Column()
    sourceSiteUrl: string;

    @Column({ nullable: true })
    targetCategoryCode?: string;

    @Column()
    targetCategoryName: string;

    @Column({ nullable: true })
    targetCategoryPath?: string;

    @Column({ default: true })
    enabled: boolean;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
