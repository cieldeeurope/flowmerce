import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PLAN_LIMIT, User, UserPlan } from './user.entity';
import * as bcrypt from 'bcryptjs';
import { Contact } from './contact.entity';
import { HostingAccount } from '../hosting/hostingaccount.entity';
import { KakaotalkService } from 'src/kakaotalk/kakaotalk.service';
import { Schedule } from 'src/schedule/schedule.entity';


const HIGH_END_SITES = [
  'Lv',
  'Dior',
  'Fendi',
  'Loropiana',
  'Brunello',
  'Hermes',
  'Jacquemus',
];

const CORE_SOURCING_SITES = [
  'Farfetch',
  'Cettire',
  'Prada',
  'YSL',
  'Burberry',
  'Celine',
  'Balenciaga',
  'Miumiu',
  'Bottega',
  'Maisonmargiela',
  'Loewe',
  'Stone',
  'Lemaire',
  'Ferragamo',
  'Dolce',
  'Therow',
  'Maxmara',
  'Moncler',
  'Alexander',
  'Givenchy',
  'Sandro',
  'Tods',
  'Valentino',
  'Acne',
  'Herno',
  'Thombrowne',
  'Tomford',
  'Ami',
  'Jilsander',
  'Ourlegacy',
  'Polene',
  'Rickowens',
  'Apc',
  'Chloe',
  'Gucci',
  'Isabelmarant',
  'Longchamp',
  'Maisonkitsune',
  'Maje',
];

const BOUTIQUE_SITES = ['Farfetch', 'Cettire'];


@Injectable()
export class UserService implements OnModuleInit, OnModuleDestroy {
  private subscriptionNotificationTimer: ReturnType<typeof setInterval> | null =
    null;

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Contact)
    private readonly contactRepository: Repository<Contact>,
    @InjectRepository(HostingAccount)
    private readonly hostingAccountRepository: Repository<HostingAccount>,
    @InjectRepository(Schedule)
    private readonly scheduleRepository: Repository<Schedule>,
    private readonly kakaotalkService: KakaotalkService,
  ) {}

  async onModuleInit() {
    await this.runSubscriptionNotificationSweepSafely();
    this.subscriptionNotificationTimer = setInterval(() => {
      void this.runSubscriptionNotificationSweepSafely();
    }, 60 * 60 * 1000);
  }

  onModuleDestroy() {
    if (this.subscriptionNotificationTimer) {
      clearInterval(this.subscriptionNotificationTimer);
      this.subscriptionNotificationTimer = null;
    }
  }

  private isReservedAdminLoginId(loginId: string) {
    return /admin/i.test(String(loginId || '').trim());
  }

  private formatPhoneNumber(phone?: string | null) {
    const digits = String(phone || '')
      .replace(/\D/g, '')
      .slice(0, 11);

    if (digits.length <= 3) {
      return digits;
    }

    if (digits.length <= 7) {
      return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    }

    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  }

  private isValidPhoneNumber(phone?: string | null) {
    return /^\d{3}-\d{4}-\d{4}$/.test(String(phone || '').trim());
  }

  private async getNotificationPhone(customId: string) {
    const user = await this.userRepository.findOne({
      where: { customId },
    });

    if (!user) {
      return null;
    }

    const normalizedPhone = this.formatPhoneNumber(user.phone);
    return this.isValidPhoneNumber(normalizedPhone) ? normalizedPhone : null;
  }

  async getNotificationPhoneByCustomId(customId: string) {
    return this.getNotificationPhone(customId);
  }

  private startOfDay(date: Date) {
    const value = new Date(date);
    value.setHours(0, 0, 0, 0);
    return value;
  }

  private getDaysLeftUntil(endAt?: Date | null, now = new Date()) {
    if (!endAt) {
      return null;
    }

    const today = this.startOfDay(now);
    const endDate = this.startOfDay(endAt);
    return Math.floor((endDate.getTime() - today.getTime()) / 86400000);
  }

  private isSameDay(left?: Date | null, right?: Date | null) {
    if (!left || !right) {
      return false;
    }

    return this.startOfDay(left).getTime() === this.startOfDay(right).getTime();
  }

  private async runSubscriptionNotificationSweepSafely() {
    try {
      await this.runSubscriptionNotificationSweep();
    } catch (error: any) {
      console.error(
        '[subscription-notification] sweep failed',
        error?.message || error,
      );
    }
  }

  private async runSubscriptionNotificationSweep() {
    const users = await this.userRepository.find();
    const today = new Date();

    for (const user of users) {
      if (
        user.plan === UserPlan.NONE ||
        !user.subscriptionEndAt ||
        !user.customId
      ) {
        continue;
      }

      const phone = await this.getNotificationPhone(user.customId);
      if (!phone) {
        continue;
      }

      const daysLeft = this.getDaysLeftUntil(user.subscriptionEndAt, today);
      if (daysLeft === null || daysLeft < 0) {
        continue;
      }

      let changed = false;

      if (daysLeft === 5 && !this.isSameDay(user.subscriptionAlert5SentAt, today)) {
        await this.kakaotalkService.sendSubscriptionExpiring({
          to: phone,
          daysLeft,
        });
        user.subscriptionAlert5SentAt = new Date();
        changed = true;
      } else if (
        daysLeft === 3 &&
        !this.isSameDay(user.subscriptionAlert3SentAt, today)
      ) {
        await this.kakaotalkService.sendSubscriptionExpiring({
          to: phone,
          daysLeft,
        });
        user.subscriptionAlert3SentAt = new Date();
        changed = true;
      } else if (
        daysLeft === 0 &&
        !this.isSameDay(user.subscriptionAlert0SentAt, today)
      ) {
        await this.kakaotalkService.sendSubscriptionExpiredToday({
          to: phone,
        });
        user.subscriptionAlert0SentAt = new Date();
        changed = true;
      }

      if (changed) {
        await this.userRepository.save(user);
      }
    }
  }

  private sanitizeUser(user: User) {
    const requestUsage = this.buildRequestUsage(user);
    const collectionProgress = {
      status: user.collectionStatus ?? null,
      current: user.collectionCurrentCount ?? null,
      total: user.collectionTotalCount ?? null,
      percent: user.collectionProgressPercent ?? null,
      currentCategoryName: user.collectionCurrentCategoryName ?? '',
      startedAt: user.collectionStartedAt ?? null,
      updatedAt: user.collectionUpdatedAt ?? null,
      finishedAt: user.collectionFinishedAt ?? null,
      message: user.collectionMessage ?? '',
    };

    return {
      id: user.id,
      name: user.name,
      loginId: user.loginId,
      customId: user.customId,
      email: user.email,
      phone: user.phone ?? '',
      isApproved: user.isApproved,
      plan: user.plan,
      subscriptionStartAt: user.subscriptionStartAt,
      subscriptionEndAt: user.subscriptionEndAt,
      memo: user.memo ?? '',
      requestUsedCount: user.requestUsedCount ?? 0,
      requestLimitOverride: user.requestLimitOverride ?? null,
      requestCycleStartAt: user.requestCycleStartAt ?? null,
      requestCycleEndAt: user.requestCycleEndAt ?? null,
      requestUsage,
      collectionStatus: user.collectionStatus ?? null,
      collectionCurrentCount: user.collectionCurrentCount ?? null,
      collectionTotalCount: user.collectionTotalCount ?? null,
      collectionProgressPercent: user.collectionProgressPercent ?? null,
      collectionCurrentCategoryName: user.collectionCurrentCategoryName ?? '',
      collectionStartedAt: user.collectionStartedAt ?? null,
      collectionUpdatedAt: user.collectionUpdatedAt ?? null,
      collectionFinishedAt: user.collectionFinishedAt ?? null,
      collectionMessage: user.collectionMessage ?? '',
      collectionProgress,
      sites: user.sites ?? [],
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  private normalizeSites(sites?: string[]) {
    if (!Array.isArray(sites)) {
      return [];
    }

    return [...new Set(sites.map((site) => String(site).trim()).filter(Boolean))];
  }

  private parseOptionalInt(value: any): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    const parsed = Number.parseInt(String(value), 10);

    if (Number.isNaN(parsed)) {
      return null;
    }

    return Math.max(0, parsed);
  }

  private getRequestLimitByPlan(plan: UserPlan): number | null {
    if (plan === UserPlan.NONE) {
      return null;
    }

    return PLAN_LIMIT[plan]?.productLimit ?? null;
  }

  private getEffectiveRequestLimit(user: User): number | null {
    const override = this.parseOptionalInt(user.requestLimitOverride);

    if (override !== null) {
      return override;
    }

    return this.getRequestLimitByPlan(user.plan);
  }

  private addMonthsClamped(date: Date, months: number) {
    const result = new Date(date);
    const day = result.getDate();

    result.setDate(1);
    result.setMonth(result.getMonth() + months);

    const lastDay = new Date(
      result.getFullYear(),
      result.getMonth() + 1,
      0,
    ).getDate();

    result.setDate(Math.min(day, lastDay));
    return result;
  }

  private buildRequestCycleWindow(baseStart: Date) {
    const start = new Date(baseStart);
    start.setHours(0, 0, 0, 0);

    const nextStart = this.addMonthsClamped(start, 1);

    const end = new Date(nextStart);
    end.setDate(end.getDate() - 1);
    end.setHours(23, 59, 59, 999);

    return { start, end };
  }

  private applyRequestFields(
    user: User,
    data: {
      requestUsedCount?: any;
      requestLimitOverride?: any;
      requestCycleStartAt?: string | null;
      requestCycleEndAt?: string | null;
    },
  ) {
    user.requestUsedCount = this.parseOptionalInt(data.requestUsedCount) ?? 0;
    user.requestLimitOverride = this.parseOptionalInt(data.requestLimitOverride);

    user.requestCycleStartAt = data.requestCycleStartAt
      ? new Date(data.requestCycleStartAt)
      : null;

    user.requestCycleEndAt = data.requestCycleEndAt
      ? new Date(data.requestCycleEndAt)
      : null;

    if (
      user.plan !== UserPlan.NONE &&
      user.subscriptionStartAt &&
      (!user.requestCycleStartAt || !user.requestCycleEndAt)
    ) {
      const { start, end } = this.buildRequestCycleWindow(user.subscriptionStartAt);

      if (!user.requestCycleStartAt) {
        user.requestCycleStartAt = start;
      }

      if (!user.requestCycleEndAt) {
        user.requestCycleEndAt = end;
      }
    }

    if (user.plan === UserPlan.NONE) {
      user.requestUsedCount = 0;
      user.requestLimitOverride = null;
      user.requestCycleStartAt = null;
      user.requestCycleEndAt = null;
    }
  }

  private async ensureRequestCycle(user: User) {
    if (user.plan === UserPlan.NONE || !user.subscriptionStartAt) {
      return user;
    }

    let changed = false;

    if (!user.requestCycleStartAt || !user.requestCycleEndAt) {
      const { start, end } = this.buildRequestCycleWindow(user.subscriptionStartAt);
      user.requestCycleStartAt = start;
      user.requestCycleEndAt = end;
      user.requestUsedCount = user.requestUsedCount ?? 0;
      changed = true;
    }

    const now = new Date();

    while (user.requestCycleEndAt && now > user.requestCycleEndAt) {
      const nextStart = new Date(user.requestCycleEndAt);
      nextStart.setMilliseconds(nextStart.getMilliseconds() + 1);
      nextStart.setHours(0, 0, 0, 0);

      const { start, end } = this.buildRequestCycleWindow(nextStart);

      user.requestCycleStartAt = start;
      user.requestCycleEndAt = end;
      user.requestUsedCount = 0;
      changed = true;
    }

    if (changed) {
      await this.userRepository.save(user);
    }

    return user;
  }

  private buildRequestUsage(user: User) {
    const planLimit = this.getEffectiveRequestLimit(user);
    const used = Math.max(0, user.requestUsedCount ?? 0);
    const remaining =
      planLimit === null ? null : Math.max(0, planLimit - used);

    const percent =
      planLimit === null || planLimit <= 0
        ? null
        : Math.min(100, Math.round((used / planLimit) * 100));

    return {
      planLimit,
      used,
      remaining,
      percent,
      limitOverride: user.requestLimitOverride ?? null,
      cycleStartAt: user.requestCycleStartAt ?? null,
      cycleEndAt: user.requestCycleEndAt ?? null,
      exhausted: remaining !== null ? remaining <= 0 : false,
    };
  }

  private async notifyQuotaAlertIfNeeded(
    user: User,
    previousUsedCount: number,
    previousLimit: number | null,
  ) {
    const requestLimit = this.getEffectiveRequestLimit(user);

    if (requestLimit === null) {
      return;
    }

    const notificationPhone = await this.getNotificationPhone(user.customId);
    if (!notificationPhone) {
      return;
    }

    const previousUsed = Math.max(0, previousUsedCount ?? 0);
    const previousRemaining =
      previousLimit === null ? null : Math.max(0, previousLimit - previousUsed);
    const nextUsed = Math.max(0, user.requestUsedCount ?? 0);
    const nextRemaining = Math.max(0, requestLimit - nextUsed);

    const previousPercent =
      previousLimit && previousLimit > 0 && previousRemaining !== null
        ? (previousRemaining / previousLimit) * 100
        : null;
    const nextPercent =
      requestLimit > 0 ? (nextRemaining / requestLimit) * 100 : null;

    if (nextRemaining === 0 && (previousRemaining === null || previousRemaining > 0)) {
      await this.kakaotalkService.sendQuotaExhausted({
        to: notificationPhone,
      });
      return;
    }

    if (nextPercent === null) {
      return;
    }

    if (nextPercent <= 15 && (previousPercent === null || previousPercent > 15)) {
      await this.kakaotalkService.sendQuotaLow({
        to: notificationPhone,
        remainingPercent: Math.max(0, Math.floor(nextPercent)),
        remainingCount: nextRemaining,
      });
      return;
    }

    if (nextPercent <= 30 && (previousPercent === null || previousPercent > 30)) {
      await this.kakaotalkService.sendQuotaLow({
        to: notificationPhone,
        remainingPercent: Math.max(0, Math.floor(nextPercent)),
        remainingCount: nextRemaining,
      });
    }
  }

  private async buildLiveCollectionProgress(customId: string) {
    const rows = await this.scheduleRepository.find({
      where: { customId },
      order: {
        createdAt: 'ASC',
      },
    });

    const activeRows = rows.filter((row) =>
      ['pending', 'running', 'failed'].includes(row.status),
    );
    const doneRows = rows.filter((row) => row.status === 'done');

    if (activeRows.length > 0) {
      const runningRows = activeRows.filter((row) => row.status === 'running');
      const pendingRows = activeRows.filter((row) => row.status === 'pending');
      const failedRows = activeRows.filter((row) => row.status === 'failed');
      const totalCount = rows.length;
      const currentCount =
        doneRows.length + (runningRows.length > 0 ? runningRows.length : 0);
      const progressPercent =
        totalCount > 0
          ? Math.max(
              0,
              Math.min(100, Math.round((currentCount / totalCount) * 100)),
            )
          : null;

      return {
        status: runningRows.length > 0 ? 'running' : 'pending',
        current: currentCount,
        total: totalCount,
        percent: progressPercent,
        currentCategoryName: '',
        startedAt: rows[0]?.createdAt || null,
        updatedAt: new Date(),
        finishedAt: null,
        message:
          runningRows.length > 0
            ? `${currentCount}/${totalCount} 카테고리 진행 중`
            : `${pendingRows.length + failedRows.length}개 카테고리 대기 중`,
      };
    }

    if (doneRows.length > 0) {
      const totalCount = doneRows.length;
      const finishedAt = doneRows[doneRows.length - 1]?.createdAt || new Date();

      return {
        status: 'completed',
        current: totalCount,
        total: totalCount,
        percent: 100,
        currentCategoryName: '',
        startedAt: doneRows[0]?.createdAt || null,
        updatedAt: finishedAt,
        finishedAt,
        message: '최근 수집 요청이 완료되었습니다.',
      };
    }

    return {
      status: 'not_requested',
      current: null,
      total: null,
      percent: null,
      currentCategoryName: '',
      startedAt: null,
      updatedAt: null,
      finishedAt: null,
      message: '아직 수집 요청이 없습니다.',
    };
  }

  async assertRequestAvailable(customId: string, amount = 1) {
    const user = await this.userRepository.findOne({
      where: { customId },
    });

    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    await this.ensureRequestCycle(user);

    if (user.plan === UserPlan.NONE) {
      throw new BadRequestException('플랜 구독 후 이용할 수 있습니다.');
    }

    if (!user.subscriptionStartAt || !user.subscriptionEndAt) {
      throw new BadRequestException('구독 기간 정보가 없습니다.');
    }

    const now = new Date();

    if (user.subscriptionEndAt < now) {
      throw new BadRequestException('구독 기간이 만료되었습니다.');
    }

    const requestLimit = this.getEffectiveRequestLimit(user);

    if (requestLimit === null) {
      throw new BadRequestException('요청 수 설정이 없습니다.');
    }

    const nextUsed = (user.requestUsedCount ?? 0) + amount;

    if (nextUsed > requestLimit) {
      throw new BadRequestException('요청 수 소진');
    }

    return this.buildRequestUsage(user);
  }

  async consumeRequest(customId: string, amount = 1) {
    const user = await this.userRepository.findOne({
      where: { customId },
    });

    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    await this.ensureRequestCycle(user);

    if (user.plan === UserPlan.NONE) {
      throw new BadRequestException('플랜 구독 후 이용할 수 있습니다.');
    }

    const requestLimit = this.getEffectiveRequestLimit(user);

    if (requestLimit === null) {
      throw new BadRequestException('요청 수 설정이 없습니다.');
    }

    const previousUsed = user.requestUsedCount ?? 0;
    const previousRemaining = Math.max(0, requestLimit - previousUsed);
    const nextRemaining = Math.max(0, requestLimit - ((user.requestUsedCount ?? 0) + amount));
    const previousPercent =
      requestLimit > 0 ? (previousRemaining / requestLimit) * 100 : 0;
    const nextPercent =
      requestLimit > 0 ? (nextRemaining / requestLimit) * 100 : 0;

    const nextUsed = (user.requestUsedCount ?? 0) + amount;

    if (nextUsed > requestLimit) {
      throw new BadRequestException('요청 수 소진');
    }

    user.requestUsedCount = nextUsed;
    await this.userRepository.save(user);

    const notificationPhone = await this.getNotificationPhone(user.customId);
    if (notificationPhone) {
      if (nextRemaining === 0 && previousRemaining > 0) {
        await this.kakaotalkService.sendQuotaExhausted({
          to: notificationPhone,
        });
      } else if (nextPercent <= 15 && previousPercent > 15) {
        await this.kakaotalkService.sendQuotaLow({
          to: notificationPhone,
          remainingPercent: Math.max(0, Math.floor(nextPercent)),
          remainingCount: nextRemaining,
        });
      } else if (nextPercent <= 30 && previousPercent > 30) {
        await this.kakaotalkService.sendQuotaLow({
          to: notificationPhone,
          remainingPercent: Math.max(0, Math.floor(nextPercent)),
          remainingCount: nextRemaining,
        });
      }
    }

    return this.buildRequestUsage(user);
  }


  async getAdminUsers() {
    const users = await this.userRepository.find({
      order: {
        createdAt: 'DESC',
      },
    });

    for (const user of users) {
      await this.ensureRequestCycle(user);
    }

    return users.map((user) => this.sanitizeUser(user));
  }

  async createAdminUser(data: {
    name: string;
    loginId: string;
    password?: string;
    customId: string;
    phone: string;
    isApproved: boolean;
    plan: UserPlan;
    subscriptionStartAt?: string | null;
    subscriptionEndAt?: string | null;
    sites?: string[];
    email?: string | null;
    memo?: string | null;
    requestUsedCount?: any;
    requestLimitOverride?: any;
    requestCycleStartAt?: string | null;
    requestCycleEndAt?: string | null;
  }) {
    if (!data.name?.trim()) {
      return { success: false, message: 'name은 필수입니다.' };
    }

    if (!data.loginId?.trim()) {
      return { success: false, message: 'loginId는 필수입니다.' };
    }

    if (!data.password?.trim()) {
      return { success: false, message: 'password는 필수입니다.' };
    }

    if (!data.customId?.trim()) {
      return { success: false, message: 'customId는 필수입니다.' };
    }

    const normalizedPhone = this.formatPhoneNumber(data.phone);

    if (!this.isValidPhoneNumber(normalizedPhone)) {
      return { success: false, message: '연락처 형식이 아닙니다.' };
    }

    const existId = await this.userRepository.findOne({
      where: { loginId: data.loginId.trim() },
    });

    if (existId) {
      return { success: false, message: '이미 존재하는 loginId입니다.' };
    }

    const existCustomId = await this.userRepository.findOne({
      where: { customId: data.customId.trim() },
    });

    if (existCustomId) {
      return { success: false, message: '이미 존재하는 customId입니다.' };
    }

    const hashedPassword = await bcrypt.hash(data.password.trim(), 10);

    const user = this.userRepository.create({
      name: data.name.trim(),
      loginId: data.loginId.trim(),
      password: hashedPassword,
      customId: data.customId.trim(),
      phone: normalizedPhone,
      isApproved: Boolean(data.isApproved),
      plan: data.plan ?? UserPlan.NONE,
      subscriptionStartAt: data.subscriptionStartAt
        ? new Date(data.subscriptionStartAt)
        : null,
      subscriptionEndAt: data.subscriptionEndAt
        ? new Date(data.subscriptionEndAt)
        : null,
      sites: this.normalizeSites(data.sites),
      email: data.email?.trim() || null,
      memo: data.memo?.trim() || null,
    });

    this.applyRequestFields(user, {
      requestUsedCount: data.requestUsedCount,
      requestLimitOverride: data.requestLimitOverride,
      requestCycleStartAt: data.requestCycleStartAt,
      requestCycleEndAt: data.requestCycleEndAt,
    });

    await this.userRepository.save(user);
    await this.runSubscriptionNotificationSweepSafely();


    return {
      success: true,
      message: 'User가 추가되었습니다.',
      user: this.sanitizeUser(user),
    };
  }

  async updateAdminUser(
    id: number,
    data: {
      name: string;
      loginId: string;
      password?: string;
      customId: string;
      phone: string;
      isApproved: boolean;
      plan: UserPlan;
      subscriptionStartAt?: string | null;
      subscriptionEndAt?: string | null;
      sites?: string[];
      email?: string | null;
      memo?: string | null;
      requestUsedCount?: any;
      requestLimitOverride?: any;
      requestCycleStartAt?: string | null;
      requestCycleEndAt?: string | null;
    },
  ) {
    const user = await this.userRepository.findOne({
      where: { id },
    });

    if (!user) {
      return { success: false, message: '수정할 User를 찾을 수 없습니다.' };
    }

    const wasApproved = Boolean(user.isApproved);
    const previousPlan = user.plan;
    const previousSubscriptionStartAt =
      user.subscriptionStartAt?.getTime() ?? null;
    const previousSubscriptionEndAt = user.subscriptionEndAt?.getTime() ?? null;
    const previousRequestUsedCount = user.requestUsedCount ?? 0;
    const previousRequestLimit = this.getEffectiveRequestLimit(user);

    if (!data.name?.trim()) {
      return { success: false, message: 'name은 필수입니다.' };
    }

    if (!data.loginId?.trim()) {
      return { success: false, message: 'loginId는 필수입니다.' };
    }

    if (!data.customId?.trim()) {
      return { success: false, message: 'customId는 필수입니다.' };
    }

    const normalizedPhone = this.formatPhoneNumber(data.phone);

    if (!this.isValidPhoneNumber(normalizedPhone)) {
      return { success: false, message: '연락처 형식이 아닙니다.' };
    }

    const existId = await this.userRepository.findOne({
      where: { loginId: data.loginId.trim() },
    });

    if (existId && existId.id !== user.id) {
      return { success: false, message: '이미 존재하는 loginId입니다.' };
    }

    const existCustomId = await this.userRepository.findOne({
      where: { customId: data.customId.trim() },
    });

    if (existCustomId && existCustomId.id !== user.id) {
      return { success: false, message: '이미 존재하는 customId입니다.' };
    }

    user.name = data.name.trim();
    user.loginId = data.loginId.trim();
    user.customId = data.customId.trim();
    user.phone = normalizedPhone;
    user.isApproved = Boolean(data.isApproved);
    user.plan = data.plan ?? UserPlan.NONE;
    user.subscriptionStartAt = data.subscriptionStartAt
      ? new Date(data.subscriptionStartAt)
      : null;
    user.subscriptionEndAt = data.subscriptionEndAt
      ? new Date(data.subscriptionEndAt)
      : null;
    user.sites = this.normalizeSites(data.sites);
    user.email = data.email?.trim() || null;
    user.memo = data.memo?.trim() || null;

    this.applyRequestFields(user, {
      requestUsedCount: data.requestUsedCount,
      requestLimitOverride: data.requestLimitOverride,
      requestCycleStartAt: data.requestCycleStartAt,
      requestCycleEndAt: data.requestCycleEndAt,
    });

    if (data.password?.trim()) {
      user.password = await bcrypt.hash(data.password.trim(), 10);
    }

    const nextSubscriptionStartAt = user.subscriptionStartAt?.getTime() ?? null;
    const nextSubscriptionEndAt = user.subscriptionEndAt?.getTime() ?? null;
    const subscriptionChanged =
      previousPlan !== user.plan ||
      previousSubscriptionStartAt !== nextSubscriptionStartAt ||
      previousSubscriptionEndAt !== nextSubscriptionEndAt;

    if (subscriptionChanged) {
      user.subscriptionAlert5SentAt = null;
      user.subscriptionAlert3SentAt = null;
      user.subscriptionAlert0SentAt = null;
    }

    await this.userRepository.save(user);
    await this.runSubscriptionNotificationSweepSafely();
    await this.notifyQuotaAlertIfNeeded(
      user,
      previousRequestUsedCount,
      previousRequestLimit,
    );

    if (!wasApproved && user.isApproved) {
      await this.kakaotalkService.sendApprovalCompleted({
        to: normalizedPhone,
      });
    }

    return {
      success: true,
      message: 'User 정보가 수정되었습니다.',
      user: this.sanitizeUser(user),
    };
  }


  private getSiteRule(plan: UserPlan) {
    switch (plan) {
      case UserPlan.BOUTIQUE:
        return {
          coreLimit: 1,
          highEndLimit: 0,
          coreOptions: BOUTIQUE_SITES,
          highEndEnabled: false,
        };
      case UserPlan.BASIC:
        return {
          coreLimit: 2,
          highEndLimit: 0,
          coreOptions: CORE_SOURCING_SITES,
          highEndEnabled: false,
        };
      case UserPlan.PRO:
        return {
          coreLimit: 8,
          highEndLimit: 2,
          coreOptions: CORE_SOURCING_SITES,
          highEndEnabled: true,
        };
      case UserPlan.ENTERPRISE:
        return {
          coreLimit: Infinity,
          highEndLimit: Infinity,
          coreOptions: CORE_SOURCING_SITES,
          highEndEnabled: true,
        };
      default:
        return {
          coreLimit: 0,
          highEndLimit: 0,
          coreOptions: [],
          highEndEnabled: false,
        };
    }
  }

  async validateUserUi(loginId: string, password: string) {
    console.log('입력 loginId:', loginId);

    const user = await this.userRepository.findOne({
      where: { loginId },
    });

    console.log('조회된 user:', user);

    if (!user) {
      console.log('❌ 유저 없음');
      return null;
    }

    // 🔥 핵심 수정
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      console.log('❌ 비밀번호 틀림');
      return null;
    }

    if (!user.isApproved) {
      console.log('❌ 승인 안됨');
      return null;
    }

    console.log('✅ 로그인 성공');
    return user;
  }

  async validateUser(
    loginId: string,
    password: string,
    options?: { allowReservedAdminLogin?: boolean },
  ) {
    console.log('입력 loginId:', loginId);

    const allowReservedAdminLogin =
      options?.allowReservedAdminLogin ?? true;

    if (
      this.isReservedAdminLoginId(loginId) &&
      !allowReservedAdminLogin
    ) {
      return {
        success: false,
        message: '`admin`이 포함된 아이디는 관리자 페이지에서만 사용할 수 있습니다.',
      };
    }

    if (
      loginId === process.env.ADMIN_LOGIN_ID &&
      password === process.env.ADMIN_PASSWORD
    ) {
      return {
        success: true,
        user: {
          loginId: process.env.ADMIN_LOGIN_ID,
          customId: 'admin',
          name: '관리자',
          email: '',
          role: 'admin',
          plan: UserPlan.NONE,
          subscriptionStartAt: null,
          subscriptionEndAt: null,
          sites: [],
        },
      };
    }

    const user = await this.userRepository.findOne({
      where: { loginId },
    });

    if (!user) {
      return {
        success: false,
        message: '존재하지 않는 아이디입니다.',
      };
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return {
        success: false,
        message: '비밀번호가 올바르지 않습니다.',
      };
    }

    return {
      success: true,
      user: {
        ...user,
        role: 'user',
      },
    };
  }



  async changePassword(data: {
    loginId: string;
    currentPassword: string;
    newPassword: string;
  }) {
    const { loginId, currentPassword, newPassword } = data;

    // 🔥 유저 조회
    const user = await this.userRepository.findOne({
      where: { loginId },
    });

    if (!user) {
      return { success: false, message: '유저 없음' };
    }

    // 🔥 현재 비밀번호 검증
    const isMatch = await bcrypt.compare(currentPassword, user.password);

    if (!isMatch) {
      return { success: false, message: '현재 비밀번호가 틀립니다' };
    }

    // 🔥 새 비밀번호 암호화
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // 🔥 업데이트
    user.password = hashedPassword;
    await this.userRepository.save(user);

    return {
      success: true,
      message: '비밀번호 변경 완료',
    };
  }

  async register(data: {
    loginId: string;
    password: string;
    name: string;
    customId: string;
    phone: string;
    email?: string;
  }) {
    const normalizedPhone = this.formatPhoneNumber(data.phone);

    if (!this.isValidPhoneNumber(normalizedPhone)) {
      return {
        success: false,
        message: '연락처 형식이 아닙니다.',
      };
    }

    if (this.isReservedAdminLoginId(data.loginId)) {
      return {
        success: false,
        message: '`admin`이 포함된 아이디는 사용할 수 없습니다.',
      };
    }

    // 아이디 중복 체크
    const existId = await this.userRepository.findOne({
      where: { loginId: data.loginId },
    });

    if (existId) {
      return { success: false, message: '이미 존재하는 아이디입니다.' };
    }

    // 닉네임(customId) 중복 체크
    const existNick = await this.userRepository.findOne({
      where: { customId: data.customId },
    });

    if (existNick) {
      return { success: false, message: '이미 존재하는 닉네임입니다.' };
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    const user = this.userRepository.create({
      loginId: data.loginId,
      password: hashedPassword,
      name: data.name,
      customId: data.customId,
      phone: normalizedPhone,
      email: data.email,
      isApproved: false, // 관리자 승인 방식 유지
      plan: UserPlan.NONE,
    });

    await this.userRepository.save(user);

    return {
      success: true,
      message: '회원가입 완료 (관리자 승인 필요)',
    };
  }

  async getProfileByCustomId(customId: string) {
    const user = await this.userRepository.findOne({
      where: { customId },
    });

    if (!user) {
      return {
        success: false,
        message: '사용자를 찾을 수 없습니다.',
      };
    }

    await this.ensureRequestCycle(user);
    const collectionProgress = await this.buildLiveCollectionProgress(customId);

    const hostingAccounts = await this.hostingAccountRepository.find({
      where: { customId },
    });

    const serviceAvailable = hostingAccounts.some(
      (account) =>
        account.partnerKey?.trim() &&
        account.apiKey?.trim(),
    );

    const hasSites =
      Array.isArray(user.sites) &&
      (user.sites.length > 0 || user.sites.includes('ALL'));

    const setupInProgress =
      user.plan !== UserPlan.NONE &&
      hasSites &&
      user.isApproved &&
      !serviceAvailable;

    return {
      success: true,
      user: {
        ...this.sanitizeUser(user),
        collectionStatus: collectionProgress.status,
        collectionCurrentCount: collectionProgress.current,
        collectionTotalCount: collectionProgress.total,
        collectionProgressPercent: collectionProgress.percent,
        collectionCurrentCategoryName: collectionProgress.currentCategoryName,
        collectionStartedAt: collectionProgress.startedAt,
        collectionUpdatedAt: collectionProgress.updatedAt,
        collectionFinishedAt: collectionProgress.finishedAt,
        collectionMessage: collectionProgress.message,
        collectionProgress,
        setupInProgress,
        serviceAvailable,
      },
    };
  }




  async updateSites(data: { customId: string; sites: string[] }) {
    const user = await this.userRepository.findOne({
      where: { customId: data.customId },
    });

    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    if (user.plan === UserPlan.NONE) {
      return {
        success: false,
        message: '플랜 구독 후 사이트를 설정할 수 있습니다.',
      };
    }

    if (user.plan === UserPlan.ENTERPRISE) {
      user.sites = ['ALL'];
      await this.userRepository.save(user);

      const notificationPhone = await this.getNotificationPhone(user.customId);
      if (notificationPhone) {
        await this.kakaotalkService.sendSiteSelected({
          to: notificationPhone,
          siteList: 'ALL',
        });
      }

      return {
        success: true,
        message: 'Enterprise 플랜은 모든 사이트가 자동 적용됩니다.',
        user: this.sanitizeUser(user),
      };
    }

    if (Array.isArray(user.sites) && user.sites.length > 0) {
      return {
        success: false,
        message: '사이트가 이미 확정되었습니다. 변경은 관리자 문의로만 가능합니다.',
      };
    }

    const uniqueSites = [...new Set((data.sites ?? []).map((site) => String(site).trim()).filter(Boolean))];

    if (uniqueSites.length === 0) {
      return {
        success: false,
        message: '최소 1개 이상의 사이트를 선택해주세요.',
      };
    }

    const highEndSelected = uniqueSites.filter((site) => HIGH_END_SITES.includes(site));
    const coreSelected = uniqueSites.filter((site) => CORE_SOURCING_SITES.includes(site));

    if (highEndSelected.length + coreSelected.length !== uniqueSites.length) {
      return {
        success: false,
        message: '지원하지 않는 사이트가 포함되어 있습니다.',
      };
    }

    const rule = this.getSiteRule(user.plan);

    if (coreSelected.length > rule.coreLimit) {
      return {
        success: false,
        message: `핵심 소싱 사이트는 최대 ${rule.coreLimit}개까지 선택할 수 있습니다.`,
      };
    }

    if (!rule.highEndEnabled && highEndSelected.length > 0) {
      return {
        success: false,
        message: '현재 플랜에서는 하이엔드 사이트를 선택할 수 없습니다.',
      };
    }

    if (highEndSelected.length > rule.highEndLimit) {
      return {
        success: false,
        message: `하이엔드 사이트는 최대 ${rule.highEndLimit}개까지 선택할 수 있습니다.`,
      };
    }

    const invalidCore = coreSelected.filter((site) => !rule.coreOptions.includes(site));
    if (invalidCore.length > 0) {
      return {
        success: false,
        message: '현재 플랜에서 선택할 수 없는 핵심 소싱 사이트가 포함되어 있습니다.',
      };
    }

    user.sites = [...coreSelected, ...highEndSelected];
    await this.userRepository.save(user);

    const notificationPhone = await this.getNotificationPhone(user.customId);
    if (notificationPhone) {
      await this.kakaotalkService.sendSiteSelected({
        to: notificationPhone,
        siteList: user.sites.join(', '),
      });
    }

    return {
      success: true,
      message: '사이트 선택이 저장되었습니다. 이후 변경은 관리자 문의를 통해 진행할 수 있습니다.',
      user: this.sanitizeUser(user),
    };
  }

  /*
  *  플로우머스 문의 관련 함수
  */

  async createContact(data: {
    type: string;
    title?: string;
    name: string;
    phone: string;
    email?: string;
    content: string;
    authorLoginId?: string;
    authorCustomId?: string;
  }) {
    if (!data.type || !data.name || !data.phone || !data.content) {
      return {
        success: false,
        message: '문의 유형, 이름, 연락처, 문의 내용은 필수입니다.',
      };
    }

    const contact = this.contactRepository.create({
      type: data.type,
      title: data.title?.trim() || data.type,
      name: data.name.trim(),
      phone: data.phone.trim(),
      email: data.email?.trim() || null,
      content: data.content.trim(),
      authorLoginId: data.authorLoginId?.trim() || null,
      authorCustomId: data.authorCustomId?.trim() || null,
    });

    await this.contactRepository.save(contact);
    await this.kakaotalkService.sendInquiryReceived({
      type: contact.type,
      title: contact.title,
      name: contact.name,
      phone: contact.phone,
      authorCustomId: contact.authorCustomId,
      authorLoginId: contact.authorLoginId,
    });

    return {
      success: true,
      message: '문의가 정상적으로 접수되었습니다.',
      contact,
    };
  }


  async getContacts() {
    return await this.contactRepository.find({
      order: {
        isRead: 'ASC',
        createdAt: 'DESC',
      },
    });
  }

  async markContactAsRead(id: number, readBy?: string) {
    const contact = await this.contactRepository.findOne({
      where: { id },
    });

    if (!contact) {
      throw new NotFoundException('문의를 찾을 수 없습니다.');
    }

    if (!contact.isRead) {
      contact.isRead = true;
      contact.readAt = new Date();
      contact.readBy = readBy?.trim() || null;
      await this.contactRepository.save(contact);
    }

    return {
      success: true,
      contact,
    };
  }

}
