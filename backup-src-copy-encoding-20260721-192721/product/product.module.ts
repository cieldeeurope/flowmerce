import { forwardRef, Module } from '@nestjs/common';
import { ProductService } from './product.service';
import { ProductController } from './product.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from './product.entity';
import { MarginModule } from 'src/margin/margin.module';

@Module({
  imports: [TypeOrmModule.forFeature([Product]), forwardRef(() => MarginModule)],  // forwardRef 추가
  controllers: [ProductController],
  providers: [ProductService],
  exports: [ProductService, TypeOrmModule],
})
export class ProductModule {}