import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';

@Index(['site', 'customId', 'accountPlatform'])
@Entity()
export class SelectedDesigners {
  @PrimaryGeneratedColumn()
  id: number;

  @Column("simple-array")  // 선택한 디자이너들을 배열 형태로 저장
  designerNames: string[];

  @Column()
  site: string;

  @Column()
  customId: string;

  @Column()
  accountPlatform: string;
}
