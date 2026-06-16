import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class Schedule {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  site: string;

  @Column()
  siteUrls: string;

  @Column()
  godoMallCategoryCode: string;

  @Column()
  godoMallCategoryName: string;

  @Column()
  categoryName: string;

  @Column()
  partnerKey: string;

  @Column()
  apiKey: string;

  @Column()
  customId: string;

  @Column()
  accountPlatform: string;

  @Column({
    type: 'enum',
    enum: ['pending', 'running', 'done', 'failed'],
    default: 'pending',
  })
  status: string;

  @Column({ nullable: true })
  errorMessage: string;

  @CreateDateColumn()
  createdAt: Date;
}