import { Module, forwardRef } from '@nestjs/common';
import { GodoMallService } from './godomall.service';
import { GodoMallController } from './godomall.controller';
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
import { HostingModule } from 'src/hosting/hosting.module';
import { GodoMallCategory } from 'src/category/GodoMallCategory.entity';
import { SmartStoreCategory } from 'src/category/SmartStoreCategory.entity';
import { HostingAccount } from 'src/hosting/hostingaccount.entity';
import { CategoryService } from 'src/category/category.service';


@Module({
  imports: [
    TypeOrmModule.forFeature([Product,GodoMallCategory,SmartStoreCategory,HostingAccount]),
    forwardRef(() => ProductModule),
    forwardRef(() => MarginModule),
    forwardRef(() => CategoryModule),
    forwardRef(() => WordReplacementModule),
    forwardRef(() => FarfetchModule),
    forwardRef(() => CettireModule),
    forwardRef(() => SmartstoreModule),
    forwardRef(() => HostingModule),
    forwardRef(() => CategoryModule),
  ],
  controllers: [GodoMallController],
  providers: [GodoMallService, R2Service],
  exports: [GodoMallService],
})
export class GodoMallModule {}

