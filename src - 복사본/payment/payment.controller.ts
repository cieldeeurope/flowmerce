import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { UserGuard } from '../user-auth/user.guard';
import { PaymentType } from './payment.entity';
import { PaymentService } from './payment.service';

@Controller('payments')
@UseGuards(UserGuard)
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('orders')
  createOrder(
    @Body('customId') customId: string,
    @Body('paymentType') paymentType: PaymentType,
    @Body('planName') planName?: string,
    @Body('billing') billing?: string,
  ) {
    return this.paymentService.createOrder({
      customId,
      paymentType,
      planName,
      billing,
    });
  }

  @Post('confirm')
  confirmPayment(
    @Body('customId') customId: string,
    @Body('paymentKey') paymentKey: string,
    @Body('orderId') orderId: string,
    @Body('amount') amount: number,
  ) {
    return this.paymentService.confirmPayment({
      customId,
      paymentKey,
      orderId,
      amount,
    });
  }

  @Get('history')
  getHistory(
    @Query('customId') customId: string,
    @Query('limit') limit?: string,
  ) {
    return this.paymentService.getHistory(customId, Number(limit) || 20);
  }
}
