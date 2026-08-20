import { Entity, Column, PrimaryGeneratedColumn, Index } from 'typeorm';

@Entity()
@Index(['customId', 'accountPlatform']) // 조회용
@Index(['customId', 'accountPlatform', 'categoryCode'], { unique: true }) // 중복 방지
export class SmartStoreCategory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  categoryCode: string;

  @Column()
  categoryName: string;

  @Column({ nullable: true })
  customId?: string;

  @Column()
  accountPlatform: string; // 예: smartstore_1
}