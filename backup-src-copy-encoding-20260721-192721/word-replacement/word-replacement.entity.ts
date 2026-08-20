import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class WordReplacement {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  beforeWord: string;

  @Column()
  afterWord: string;

  @Column()
  customId: string;
}