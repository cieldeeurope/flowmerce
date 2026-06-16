import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { MarketplacePolicy } from './marketplace-policy';

export type Platform = 'smartstore' | 'godomall' | 'cafe24' | 'makeshop';

@Entity()
@Index(['customId', 'accountPlatform'], { unique: true }) // 유저 + 플랫폼 1개만 허용
export class HostingAccount {

    @PrimaryGeneratedColumn()
    id: number;

    /* =====================
        🔗 유저 연결
    ===================== */

    @Column({ nullable: true })
    @Index()
    customId?: string; // 테스트용 optional

    /* =====================
        🏢 플랫폼 타입
    ===================== */

    @Column()
    platform: Platform;

    @Column()
    accountPlatform: string;

    /* =====================
        🔑 인증 키
    ===================== */

    @Column()
    partnerKey: string;

    @Column()
    apiKey: string;

    @Column({ nullable: true })
    redirectUri?: string;

    @Column({ nullable: true })
    refreshToken?: string;

    @Column({ type: 'timestamp', nullable: true })
    tokenExpiresAt?: Date;

    @Column({ type: 'timestamp', nullable: true })
    refreshTokenExpiresAt?: Date;

    /* =====================
        🕒 시간
    ===================== */

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @Column('simple-json', { nullable: true })
    topImages?: string[];

    @Column('simple-json', { nullable: true })
    bottomImages?: string[];

    @Column({ type: 'text', nullable: true })
    memo?: string | null;

    @Column('simple-json', { nullable: true })
    marketplacePolicy?: MarketplacePolicy | null;
}
