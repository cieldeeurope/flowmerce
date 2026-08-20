import { Entity, Column, PrimaryGeneratedColumn, Index } from 'typeorm';

@Entity()
@Index(['customId', 'accountPlatform'])
@Index(['customId', 'accountPlatform', 'categoryCode'], { unique: true })
export class Cafe24Category {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  categoryCode: string;

  @Column()
  categoryName: string;

  @Column({ nullable: true, default: '' })
  displayName?: string;

  @Column({ nullable: true, default: '' })
  parentPath?: string;

  @Column({ nullable: true, default: '' })
  parentCategoryCode?: string;

  @Column({ nullable: true, default: '' })
  fullCategoryCode?: string;

  @Column({ type: 'int', nullable: true })
  categoryDepth?: number;

  @Column({ nullable: true, default: '' })
  rootCategoryCode?: string;

  @Column({ nullable: true, default: '' })
  displayType?: string;

  @Column({ nullable: true, default: '' })
  useDisplay?: string;

  @Column({ nullable: true, default: '' })
  useMain?: string;

  @Column({ nullable: true })
  customId?: string;

  @Column()
  accountPlatform: string;
}
