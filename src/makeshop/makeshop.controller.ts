import { Body, Controller, Param, Post } from '@nestjs/common';
import { MakeshopService } from './makeshop.service';
import {
  MakeShopCreateProductDto,
  MakeShopUpdateProductDto,
} from './dto/makeshop-product.dto';

@Controller('makeshop')
export class MakeshopController {
  constructor(private readonly makeshopService: MakeshopService) {}

  @Post('products')
  createProduct(
    @Body('shopId') shopId: string,
    @Body('apiKey') apiKey: string,
    @Body('payload') payload: MakeShopCreateProductDto,
  ) {
    return this.makeshopService.createProduct({
      shopId,
      apiKey,
      payload,
    });
  }

  @Post('products/update')
  updateProduct(
    @Body('shopId') shopId: string,
    @Body('apiKey') apiKey: string,
    @Body('payload') payload: MakeShopUpdateProductDto,
  ) {
    return this.makeshopService.updateProduct({
      shopId,
      apiKey,
      payload,
    });
  }

  @Post('products/:productCode/delete-temp')
  deleteProductTemp(
    @Param('productCode') productCode: string,
    @Body('shopId') shopId: string,
    @Body('apiKey') apiKey: string,
  ) {
    return this.makeshopService.deleteProductTemp({
      shopId,
      apiKey,
      productCode,
    });
  }

  @Post('products/:productCode/delete')
  deleteProduct(
    @Param('productCode') productCode: string,
    @Body('shopId') shopId: string,
    @Body('apiKey') apiKey: string,
  ) {
    return this.makeshopService.deleteProductFully({
      shopId,
      apiKey,
      productCode,
    });
  }
}
