import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class FarfetchDesigner {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  designerName: string;  // 디자이너 이름

  @Column()
  designerCode: string;  // 디자이너 번호
}