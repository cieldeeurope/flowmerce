import {  Entity,  Column,  PrimaryGeneratedColumn,  Index,} from 'typeorm';

@Entity()
@Index(
  ['site', 'siteUrl', 'godoMallCategoryCode', 'customId', 'accountPlatform'],
  { unique: true }
)
export class Mapping {

  @PrimaryGeneratedColumn()
  id: number;

  /* =====================
     🔗 사이트
  ===================== */

  @Column()
  site: string;

  @Column()
  siteUrl: string;


  /* =====================
     📂 카테고리
  ===================== */

  @Column()
  categoryName: string;

  @Column({ nullable: true })
  godoMallCategoryName?: string;

  @Column({ nullable: true })
  godoMallCategoryCode: string;


  /* =====================
     👗 디자이너
  ===================== */

  @Column({ type: 'text', nullable: true })
  designers?: string;

  @Column({ nullable: true })
  afterDesigners?: string;


  /* =====================
     🔑 멀티테넌트
  ===================== */

  @Column({ nullable: true })
  customId: string;

  @Column()
  accountPlatform: string;
}