import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CategoryService } from './category.service';
import { GodoMallCategory } from './GodoMallCategory.entity';
import { FarfetchDesigner } from './FarfetchDesigner.entity';
import { CettireDesigner } from './CettireDesigner.entity';
import { SmartStoreCategory } from './SmartStoreCategory.entity';
import { Cafe24Category } from './Cafe24Category.entity';
import { MakeshopCategory } from './MakeshopCategory.entity';
import { Category } from './category.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Category,GodoMallCategory,FarfetchDesigner,CettireDesigner,SmartStoreCategory,Cafe24Category,MakeshopCategory
  ])],
  providers: [CategoryService],
  exports: [CategoryService], // CategoryService를 다른 모듈에서 사용할 수 있게 내보냅니다.
})
export class CategoryModule {}
