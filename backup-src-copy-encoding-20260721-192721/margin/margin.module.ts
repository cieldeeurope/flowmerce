import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Margin } from './margin.entity';
import { MarginService } from './margin.service';
import { MarginController } from './margin.controller';
import { HostingAccount } from 'src/hosting/hostingaccount.entity';
import { UserAuthModule } from 'src/user-auth/user-auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Margin, HostingAccount]),
    UserAuthModule,
  ],
  providers: [MarginService],
  controllers: [MarginController],
  exports: [MarginService],
})
export class MarginModule {}
