import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { User } from './user.entity';
import { Contact } from './contact.entity';
import { HostingAccount } from 'src/hosting/hostingaccount.entity';
import { KakaotalkModule } from 'src/kakaotalk/kakaotalk.module';
import { AdminAuthModule } from 'src/admin-auth/admin-auth.module';
import { Schedule } from 'src/schedule/schedule.entity';
import { UserAuthModule } from 'src/user-auth/user-auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Contact, HostingAccount, Schedule]),
    KakaotalkModule,
    AdminAuthModule,
    UserAuthModule,
  ],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
