import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MakeshopService } from './makeshop.service';
import { MakeshopController } from './makeshop.controller';
import { HostingAccount } from 'src/hosting/hostingaccount.entity';
import { CategoryModule } from 'src/category/category.module';
import { Product } from 'src/product/product.entity';
import { MarginModule } from 'src/margin/margin.module';
import { WordReplacementModule } from 'src/word-replacement/word-replacement.module';
import { SmartstoreModule } from 'src/smartstore/smartstore.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([HostingAccount, Product]),
    forwardRef(() => CategoryModule),
    forwardRef(() => MarginModule),
    forwardRef(() => WordReplacementModule),
    forwardRef(() => SmartstoreModule),
  ],
  controllers: [MakeshopController],
  providers: [MakeshopService],
  exports: [MakeshopService],
})
export class MakeshopModule {}
