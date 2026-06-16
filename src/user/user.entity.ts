import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn,
    Index,
} from 'typeorm';

export enum UserPlan {
    NONE = 'none',
    BOUTIQUE = 'boutique',
    BASIC = 'basic',
    PRO = 'pro',
    ENTERPRISE = 'enterprise',
}

export const PLAN_LIMIT = {
    [UserPlan.BOUTIQUE]: { siteLimit: 1, productLimit: 100000 },
    [UserPlan.BASIC]: { siteLimit: 2, productLimit: 5000 },
    [UserPlan.PRO]: { siteLimit: 10, productLimit: 50000 },
    [UserPlan.ENTERPRISE]: { siteLimit: 100, productLimit: 200000 },
};

@Entity()
export class User {

    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    name: string;

    /* =====================
        🔐 로그인
    ===================== */

    @Column({ unique: true })
    loginId: string;

    @Column()
    password: string;

    /* =====================
        🔑 SaaS 키 (핵심)
    ===================== */

    @Index()
    @Column({ unique: true })
    customId: string; // 닉네임 느낌 (유저가 입력)

    /* =====================
        🧾 상태
    ===================== */

    @Column({ default: false })
    isApproved: boolean; // 관리자 승인

    /* =====================
        💰 요금제
    ===================== */

    @Column({
        type: 'enum',
        enum: UserPlan,
        default: UserPlan.NONE,
    })
    plan: UserPlan;

    /* =====================
        ⏳ 구독 기간 (🔥 핵심)
    ===================== */

    @Column({ type: 'timestamp', nullable: true })
    subscriptionStartAt: Date;

    @Column({ type: 'timestamp', nullable: true })
    subscriptionEndAt: Date;

    @Column({ type: 'timestamp', nullable: true })
    subscriptionAlert5SentAt: Date;

    @Column({ type: 'timestamp', nullable: true })
    subscriptionAlert3SentAt: Date;

    @Column({ type: 'timestamp', nullable: true })
    subscriptionAlert0SentAt: Date;

    /* =====================
        🌐 사용 사이트
    ===================== */

    @Column('json', { nullable: true })
    sites: string[];

    /* =====================
        🕒 시간
    ===================== */

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @Column({ nullable: true })
    email: string;

    @Column({ nullable: true })
    phone: string;

    @Column({ type: 'text', nullable: true })
    memo: string;

    /* =====================
        📦 요청 수 관리
    ===================== */

    @Column({ type: 'int', default: 0 })
    requestUsedCount: number;

    @Column({ type: 'int', nullable: true })
    requestLimitOverride: number;

    @Column({ type: 'timestamp', nullable: true })
    requestCycleStartAt: Date;

    @Column({ type: 'timestamp', nullable: true })
    requestCycleEndAt: Date;

    @Column({ nullable: true })
    collectionStatus: string;

    @Column({ type: 'int', nullable: true })
    collectionCurrentCount: number;

    @Column({ type: 'int', nullable: true })
    collectionTotalCount: number;

    @Column({ type: 'int', nullable: true })
    collectionProgressPercent: number;

    @Column({ nullable: true })
    collectionCurrentCategoryName: string;

    @Column({ type: 'timestamp', nullable: true })
    collectionStartedAt: Date;

    @Column({ type: 'timestamp', nullable: true })
    collectionUpdatedAt: Date;

    @Column({ type: 'timestamp', nullable: true })
    collectionFinishedAt: Date;

    @Column({ type: 'text', nullable: true })
    collectionMessage: string;
}
