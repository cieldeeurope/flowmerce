import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Cafe24Service } from './cafe24.service';
import { Cafe24Controller } from './cafe24.controller';
import { HostingAccount } from 'src/hosting/hostingaccount.entity';
import { AdminAuthModule } from 'src/admin-auth/admin-auth.module';
import { CategoryModule } from 'src/category/category.module';
import { UserAuthModule } from 'src/user-auth/user-auth.module';
import { Product } from 'src/product/product.entity';
import { MarginModule } from 'src/margin/margin.module';
import { WordReplacementModule } from 'src/word-replacement/word-replacement.module';
import { SmartstoreModule } from 'src/smartstore/smartstore.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([HostingAccount, Product]),
    AdminAuthModule,
    UserAuthModule,
    forwardRef(() => CategoryModule),
    forwardRef(() => MarginModule),
    forwardRef(() => WordReplacementModule),
    forwardRef(() => SmartstoreModule),
  ],
  controllers: [Cafe24Controller],
  providers: [Cafe24Service],
  exports: [Cafe24Service],
})
export class Cafe24Module {}
