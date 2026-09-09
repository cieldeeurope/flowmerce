import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import axios from 'axios';
import { randomUUID } from 'crypto';
import { DataSource, Repository } from 'typeorm';
import { User } from '../user/user.entity';
import { Payment, PaymentStatus, PaymentType } from './payment.entity';

const BILLING_MONTHS: Record<string, number> = {
  monthly: 1,
  sixMonth: 6,
  annual: 12,
};

const PLAN_PRICES: Record<string, Record<string, number>> = {
  Boutique: { monthly: 550000, sixMonth: 3130000, annual: 5940000 },
  Basic: { monthly: 190000, sixMonth: 1080000, annual: 2050000 },
  Pro: { monthly: 490000, sixMonth: 2790000, annual: 5290000 },
  Enterprise: { monthly: 990000, sixMonth: 5643000, annual: 9900000 },
};

const HOSTING_SETUP_FEE = 110000;
const CONSULTING_AMOUNT = 1540000;

type CreateOrderInput = {
  customId: string;
  paymentType: PaymentType;
  planName?: string;
  billing?: string;
};

@Injectable()
export class PaymentService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly dataSource: DataSource,
  ) {}

  async createOrder(input: CreateOrderInput) {
    const user = await this.userRepository.findOne({
      where: { customId: input.customId },
    });

    if (!user) {
      throw new NotFoundException('결제할 사용자 계정을 찾을 수 없습니다.');
    }

    const paymentType = this.normalizePaymentType(input.paymentType);
    const pricing = this.calculatePricing(user, {
      ...input,
      paymentType,
    });
    const orderId = `FLOW-${paymentType}-${randomUUID().replace(/-/g, '')}`.slice(0, 64);

    const payment = this.paymentRepository.create({
      orderId,
      paymentKey: null,
      customId: user.customId,
      paymentType,
      planName: pricing.planName,
      billing: pricing.billing,
      baseAmount: pricing.baseAmount,
      hostingAmount: pricing.hostingAmount,
      extraAmount: pricing.extraAmount,
      totalAmount: pricing.totalAmount,
      status: PaymentStatus.READY,
      orderName: pricing.orderName,
      method: null,
      approvedAt: null,
      canceledAt: null,
      rawResponse: null,
    });

    await this.paymentRepository.save(payment);

    return {
      orderId: payment.orderId,
      orderName: payment.orderName,
      amount: payment.totalAmount,
      paymentType: payment.paymentType,
      planName: payment.planName,
      billing: payment.billing,
    };
  }

  async confirmPayment(input: {
    customId: string;
    paymentKey: string;
    orderId: string;
    amount: number;
  }) {
    const payment = await this.paymentRepository.findOne({
      where: { orderId: String(input.orderId || '').trim() },
    });

    if (!payment || payment.customId !== input.customId) {
      throw new NotFoundException('유효한 결제 주문을 찾을 수 없습니다.');
    }

    if (payment.status === PaymentStatus.DONE) {
      return { payment: this.toPublicPayment(payment), alreadyConfirmed: true };
    }

    if (payment.status !== PaymentStatus.READY) {
      throw new BadRequestException('승인할 수 없는 결제 상태입니다.');
    }

    const requestedAmount = Math.round(Number(input.amount));

    if (!Number.isFinite(requestedAmount) || requestedAmount !== payment.totalAmount) {
      throw new BadRequestException('결제 요청 금액이 서버 주문 금액과 일치하지 않습니다.');
    }

    const paymentKey = String(input.paymentKey || '').trim();

    if (!paymentKey) {
      throw new BadRequestException('결제 승인 키가 없습니다.');
    }

    const secretKey = (
      process.env.toss_secretKey || process.env.TOSS_SECRET_KEY || ''
    ).trim();

    if (!secretKey) {
      throw new InternalServerErrorException('토스 결제 시크릿 키가 설정되지 않았습니다.');
    }

    let tossPayment: Record<string, any>;

    try {
      const response = await axios.post(
        'https://api.tosspayments.com/v1/payments/confirm',
        {
          paymentKey,
          orderId: payment.orderId,
          amount: payment.totalAmount,
        },
        {
          headers: {
            Authorization: `Basic ${Buffer.from(`${secretKey}:`).toString('base64')}`,
            'Content-Type': 'application/json',
            'Idempotency-Key': `${payment.orderId}-confirm`,
          },
          timeout: 30000,
        },
      );
      tossPayment = response.data;
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        '토스 결제 승인에 실패했습니다.';
      throw new BadGatewayException(message);
    }

    if (
      tossPayment.orderId !== payment.orderId ||
      Number(tossPayment.totalAmount) !== payment.totalAmount ||
      tossPayment.status !== 'DONE'
    ) {
      throw new BadRequestException('토스 승인 결과가 저장된 주문 정보와 일치하지 않습니다.');
    }

    const savedPayment = await this.dataSource.transaction(async manager => {
      const paymentRepo = manager.getRepository(Payment);
      const userRepo = manager.getRepository(User);
      const lockedPayment = await paymentRepo.findOne({
        where: { id: payment.id },
        lock: { mode: 'pessimistic_write' },
      });

      if (!lockedPayment) {
        throw new NotFoundException('결제 원장을 찾을 수 없습니다.');
      }

      if (lockedPayment.status === PaymentStatus.DONE) {
        return lockedPayment;
      }

      const lockedUser = await userRepo.findOne({
        where: { customId: input.customId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!lockedUser) {
        throw new NotFoundException('결제 사용자 계정을 찾을 수 없습니다.');
      }

      lockedPayment.paymentKey = paymentKey;
      lockedPayment.status = PaymentStatus.DONE;
      lockedPayment.method = String(tossPayment.method || '');
      lockedPayment.approvedAt = tossPayment.approvedAt
        ? new Date(tossPayment.approvedAt)
        : new Date();
      lockedPayment.rawResponse = tossPayment;

      lockedUser.lastPaymentAmount = lockedPayment.totalAmount;
      lockedUser.lastPaymentAt = lockedPayment.approvedAt;
      lockedUser.totalPaidAmount = String(
        Number(lockedUser.totalPaidAmount || 0) + lockedPayment.totalAmount,
      );

      await userRepo.save(lockedUser);
      return paymentRepo.save(lockedPayment);
    });

    return { payment: this.toPublicPayment(savedPayment) };
  }

  async getHistory(customId: string, requestedLimit = 20) {
    const limit = Math.min(100, Math.max(1, Math.round(requestedLimit)));
    const [payments, total] = await this.paymentRepository.findAndCount({
      where: { customId },
      order: { createdAt: 'DESC' },
      take: limit,
    });

    return {
      total,
      payments: payments.map(payment => this.toPublicPayment(payment)),
    };
  }

  private normalizePaymentType(value: PaymentType) {
    const normalized = String(value || '').toUpperCase() as PaymentType;

    if (!Object.values(PaymentType).includes(normalized)) {
      throw new BadRequestException('올바르지 않은 결제 유형입니다.');
    }

    return normalized;
  }

  private normalizePlanName(value?: string) {
    const match = Object.keys(PLAN_PRICES).find(
      planName => planName.toLowerCase() === String(value || '').trim().toLowerCase(),
    );

    if (!match) {
      throw new BadRequestException('올바르지 않은 플랜입니다.');
    }

    return match;
  }

  private calculatePricing(user: User, input: CreateOrderInput) {
    if (input.paymentType === PaymentType.CONSULTING) {
      return {
        planName: null,
        billing: null,
        baseAmount: CONSULTING_AMOUNT,
        hostingAmount: 0,
        extraAmount: 0,
        totalAmount: CONSULTING_AMOUNT,
        orderName: '플로우머스 1:1 컨설팅',
      };
    }

    const planName = this.normalizePlanName(input.planName);
    const billing = String(input.billing || '');
    const baseAmount = PLAN_PRICES[planName]?.[billing];

    if (!baseAmount || !BILLING_MONTHS[billing]) {
      throw new BadRequestException('올바르지 않은 이용 기간입니다.');
    }

    const hostingAmount =
      input.paymentType === PaymentType.NEW && ['Boutique', 'Basic'].includes(planName)
        ? HOSTING_SETUP_FEE
        : 0;
    let extraAmount = 0;

    if (input.paymentType === PaymentType.UPGRADE && user.subscriptionEndAt) {
      const remainingMs = user.subscriptionEndAt.getTime() - Date.now();
      const remainingDays = Math.max(
        0,
        Math.ceil(remainingMs / (24 * 60 * 60 * 1000)),
      );
      extraAmount = Math.round((PLAN_PRICES[planName].monthly / 30) * remainingDays);
    }

    const typeLabels: Record<PaymentType, string> = {
      [PaymentType.NEW]: '이용권',
      [PaymentType.RENEW]: '연장',
      [PaymentType.ADD]: '플랜 추가',
      [PaymentType.UPGRADE]: '업그레이드',
      [PaymentType.CONSULTING]: '컨설팅',
    };
    const orderName = `플로우머스 ${planName} ${BILLING_MONTHS[billing]}개월 ${typeLabels[input.paymentType]}`;

    return {
      planName,
      billing,
      baseAmount,
      hostingAmount,
      extraAmount,
      totalAmount: baseAmount + hostingAmount + extraAmount,
      orderName,
    };
  }

  private toPublicPayment(payment: Payment) {
    return {
      orderId: payment.orderId,
      paymentType: payment.paymentType,
      planName: payment.planName,
      billing: payment.billing,
      baseAmount: payment.baseAmount,
      hostingAmount: payment.hostingAmount,
      extraAmount: payment.extraAmount,
      totalAmount: payment.totalAmount,
      status: payment.status,
      orderName: payment.orderName,
      method: payment.method,
      approvedAt: payment.approvedAt,
      createdAt: payment.createdAt,
    };
  }
}
