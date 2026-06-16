import { CpcompanyService } from './cpcompany.service';
import { CpcompanyController } from './cpcompany.controller';
import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from 'src/product/product.entity';
import { ProductModule } from 'src/product/product.module';
import { GodoMallModule } from 'src/godomall/godomall.module';
import { MarginModule } from 'src/margin/margin.module';
import { WordReplacementModule } from 'src/word-replacement/word-replacement.module';
import { SmartstoreModule } from 'src/smartstore/smartstore.module';
import { Cafe24Module } from 'src/cafe24/cafe24.module';
import { MakeshopModule } from 'src/makeshop/makeshop.module';
import { R2Module } from 'src/cloudflare/r2.module';
import { Mapping } from 'src/mapping/mapping.entity';
import { HostingAccount } from 'src/hosting/hostingaccount.entity';
import { UserModule } from 'src/user/user.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product, Mapping, HostingAccount]),
    forwardRef(() => ProductModule),
    forwardRef(() => GodoMallModule),
    forwardRef(() => MarginModule),
    forwardRef(() => WordReplacementModule),
    forwardRef(() => SmartstoreModule),
    forwardRef(() => R2Module),
    forwardRef(() => Cafe24Module),
    forwardRef(() => MakeshopModule),
    UserModule,
  ],
  controllers: [CpcompanyController],
  providers: [CpcompanyService],
  exports: [CpcompanyService],
})
export class CpcompanyModule {}
