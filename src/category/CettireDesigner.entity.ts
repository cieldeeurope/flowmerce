import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class CettireDesigner {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  designerName: string;  // 디자이너 이름

  @Column()
  afterDesigner: string;  // 디자이너 번호
}