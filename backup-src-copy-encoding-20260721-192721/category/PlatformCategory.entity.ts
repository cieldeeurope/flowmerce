import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
@Index(['platform', 'categoryCode'], { unique: true })
@Index(['platform', 'parentCategoryCode'])
export class PlatformCategory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  platform: string;

  @Column()
  categoryCode: string;

  @Column()
  categoryName: string;

  @Column({ nullable: true })
  parentCategoryCode?: string;

  @Column({ nullable: true })
  categoryPath?: string;

  @Column({ nullable: true })
  depth?: number;

  @Column({ default: false })
  leaf: boolean;

  @Column({ nullable: true })
  usable?: boolean;

  @Column({ nullable: true })
  status?: string;

  @Column({ nullable: true })
  coupangDisplayCategoryCode?: string;

  @Column({ nullable: true })
  coupangStatus?: string;

  @Column({ nullable: true })
  elevenstCategoryCode?: string;

  @Column({ nullable: true })
  elevenstParentCategoryCode?: string;

  @Column({ nullable: true })
  elevenstDepth?: number;

  @Column({ type: 'jsonb', nullable: true })
  rawData?: any;

  @Column({ type: 'timestamp', nullable: true })
  lastSyncedAt?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
