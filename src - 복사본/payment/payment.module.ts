import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserAuthModule } from '../user-auth/user-auth.module';
import { User } from '../user/user.entity';
import { PaymentController } from './payment.controller';
import { Payment } from './payment.entity';
import { PaymentService } from './payment.service';

@Module({
  imports: [TypeOrmModule.forFeature([Payment, User]), UserAuthModule],
  controllers: [PaymentController],
  providers: [PaymentService],
  exports: [PaymentService],
})
export class PaymentModule {}
