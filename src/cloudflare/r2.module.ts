import { Module } from '@nestjs/common';
import { R2Service } from './r2.service';
import { MarginModule } from '../margin/margin.module'; // MarginModule을 임포트하여 MarginService 사용
import { WordReplacementModule } from 'src/word-replacement/word-replacement.module';
import { SmartstoreModule } from 'src/smartstore/smartstore.module';
import { TypeOrmModule } from '@nestjs/typeorm';


// ✅ 모든 엔티티 임포트
import { Product } from 'src/product/product.entity';
import { HostingAccount } from 'src/hosting/hostingaccount.entity';



@Module({
  imports: [
    TypeOrmModule.forFeature([
      Product,
      HostingAccount
    ]),
    MarginModule,
    WordReplacementModule,
    SmartstoreModule,
  ],
  providers: [R2Service],
  exports: [R2Service],
})
export class R2Module {}
