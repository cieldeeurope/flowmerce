import { Module, forwardRef } from '@nestjs/common';
import { HostingService } from './hosting.service';
import { HostingController } from './hosting.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from 'src/product/product.entity';
import { ProductModule } from 'src/product/product.module';
import { CategoryModule } from 'src/category/category.module';
import { MarginModule } from 'src/margin/margin.module';
import { WordReplacementModule } from 'src/word-replacement/word-replacement.module';
import { FarfetchModule } from 'src/farfetch/farfetch.module';
import { R2Service } from 'src/cloudflare/r2.service';
import { CettireModule } from 'src/cettire/cettire.module';
import { SmartstoreModule } from 'src/smartstore/smartstore.module';
import { GodoMallCategory } from 'src/category/GodoMallCategory.entity';
import { HostingAccount } from './hostingaccount.entity';
import { SmartStoreCategory } from 'src/category/SmartStoreCategory.entity';
import { GodoMallModule } from 'src/godomall/godomall.module';
import { GodoMallService } from 'src/godomall/godomall.service';
import { SmartstoreService } from 'src/smartstore/smartstore.service';
import { R2Module } from 'src/cloudflare/r2.module';
import { AdminAuthModule } from 'src/admin-auth/admin-auth.module';
import { UserModule } from 'src/user/user.module';
import { KakaotalkModule } from 'src/kakaotalk/kakaotalk.module';
import { Cafe24Module } from 'src/cafe24/cafe24.module';
import { MakeshopModule } from 'src/makeshop/makeshop.module';
import { Cafe24Category } from 'src/category/Cafe24Category.entity';
import { MakeshopCategory } from 'src/category/MakeshopCategory.entity';
import { UserAuthModule } from 'src/user-auth/user-auth.module';


@Module({
  imports: [
    TypeOrmModule.forFeature([Product,HostingAccount,GodoMallCategory,SmartStoreCategory,Cafe24Category,MakeshopCategory ]),
    forwardRef(() => ProductModule),
    forwardRef(() => MarginModule),
    forwardRef(() => CategoryModule),
    forwardRef(() => WordReplacementModule),
    forwardRef(() => FarfetchModule),
    forwardRef(() => CettireModule),
    forwardRef(() => SmartstoreModule),
    forwardRef(() => GodoMallModule),
    forwardRef(() => R2Module),
    UserModule,
    KakaotalkModule,
    AdminAuthModule,
    UserAuthModule,
    forwardRef(() => Cafe24Module),
    forwardRef(() => MakeshopModule),
  ],
  controllers: [HostingController],
  providers: [HostingService,GodoMallService,SmartstoreService],
  exports: [HostingService],
})
export class HostingModule {}
