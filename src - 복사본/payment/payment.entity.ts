import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum PaymentType {
  NEW = 'NEW',
  RENEW = 'RENEW',
  ADD = 'ADD',
  UPGRADE = 'UPGRADE',
  CONSULTING = 'CONSULTING',
}

export enum PaymentStatus {
  READY = 'READY',
  DONE = 'DONE',
  CANCELED = 'CANCELED',
  PARTIAL_CANCELED = 'PARTIAL_CANCELED',
  FAILED = 'FAILED',
}

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn()
  id: number;

  @Index({ unique: true })
  @Column({ length: 64 })
  orderId: string;

  @Index({ unique: true })
  @Column({ nullable: true, length: 200 })
  paymentKey: string | null;

  @Index()
  @Column()
  customId: string;

  @Column({ type: 'enum', enum: PaymentType })
  paymentType: PaymentType;

  @Column({ nullable: true })
  planName: string | null;

  @Column({ nullable: true })
  billing: string | null;

  @Column({ type: 'int', default: 0 })
  baseAmount: number;

  @Column({ type: 'int', default: 0 })
  hostingAmount: number;

  @Column({ type: 'int', default: 0 })
  extraAmount: number;

  @Column({ type: 'int' })
  totalAmount: number;

  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.READY })
  status: PaymentStatus;

  @Column()
  orderName: string;

  @Column({ nullable: true })
  method: string | null;

  @Column({ type: 'timestamp', nullable: true })
  approvedAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  canceledAt: Date | null;

  @Column({ type: 'jsonb', nullable: true })
  rawResponse: Record<string, any> | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
