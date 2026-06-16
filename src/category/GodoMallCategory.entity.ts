import { Entity, Column, PrimaryGeneratedColumn, Index } from 'typeorm';

@Entity()
@Index(['customId', 'accountPlatform']) // 조회용
@Index(['customId', 'accountPlatform', 'categoryCode'], { unique: true }) // 중복 방지
export class GodoMallCategory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  categoryName: string;

  @Column()
  categoryCode: string;

  @Column()
  parentPath: string;

  @Column({ default: true })
  isDisplayed: boolean;

  @Column({ nullable: true })
  customId?: string;

  @Column()
  accountPlatform: string; // 예: smartstore_1, godomall_1
}