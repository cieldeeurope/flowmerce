import { Entity, Column, PrimaryGeneratedColumn, Index } from 'typeorm';

@Entity()
@Index(['customId', 'accountPlatform'])
@Index(['customId', 'accountPlatform', 'categoryCode'], { unique: true })
export class MakeshopCategory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  categoryCode: string;

  @Column()
  categoryName: string;

  @Column({ nullable: true, default: '' })
  parentPath?: string;

  @Column({ nullable: true })
  customId?: string;

  @Column()
  accountPlatform: string;
}
