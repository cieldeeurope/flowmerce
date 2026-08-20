import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HostingAccount } from 'src/hosting/hostingaccount.entity';
import { Product } from 'src/product/product.entity';
import { PlatformCategory } from 'src/category/PlatformCategory.entity';
import { PlatformController } from './platform.controller';
import { PlatformMapping } from './platform-mapping.entity';
import { PlatformProduct } from './platform-product.entity';
import { PlatformService } from './platform.service';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            Product,
            HostingAccount,
            PlatformCategory,
            PlatformProduct,
            PlatformMapping,
        ]),
    ],
    controllers: [PlatformController],
    providers: [PlatformService],
    exports: [PlatformService],
})
export class PlatformModule {}
