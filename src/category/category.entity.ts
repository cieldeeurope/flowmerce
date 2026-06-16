import {  Entity,  Column,  PrimaryGeneratedColumn,  Index,} from 'typeorm';

@Entity()
@Index(['site', 'url', 'customId'], { unique: true })
export class Category {

  @PrimaryGeneratedColumn()
  id: number;

  /* =====================
     🔗 사이트 (채널)
  ===================== */

  @Column()
  site: string; // burberry, farfetch, cettire


  /* =====================
     📂 카테고리
  ===================== */

  @Column()
  categoryName: string;

  @Column()
  url: string;

  @Column({ nullable: true })
  categoryTitle?: string;

  @Column({ type: 'text', nullable: true })
  categoryNumbers?: string;


  /* =====================
     🔧 확장 필드
  ===================== */

  @Column({ type: 'text', nullable: true })
  meta?: string;


  /* =====================
     🔑 사용자 (SaaS)
  ===================== */

  @Column({ nullable: true })
  customId?: string;
}