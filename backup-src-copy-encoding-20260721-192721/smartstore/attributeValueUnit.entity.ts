import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class AttributeValueUnit {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  attributeSeq: number; // 속성 ID

  @Column()
  attributeValueSeq: number; // 속성값 ID

  @Column({ nullable: true })
  minAttributeValue: string;

  @Column({ nullable: true })
  minAttributeValueUnitCode: string;

  @Column({ nullable: true })
  maxAttributeValue: string;

  @Column({ nullable: true })
  maxAttributeValueUnitCode: string;

  @Column({ nullable: true })
  exposureOrder: number;
}