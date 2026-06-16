import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Cafe24Service } from './cafe24.service';
import {
  Cafe24CreateProductDto,
  Cafe24UpdateProductDto,
} from './dto/cafe24-product.dto';
import { AdminGuard } from 'src/admin-auth/admin.guard';
import { UserGuard } from 'src/user-auth/user.guard';

@Controller('cafe24')
export class Cafe24Controller {
  constructor(private readonly cafe24Service: Cafe24Service) {}

  @Get('authorize-url')
  @UseGuards(UserGuard)
  getAuthorizeUrl(
    @Query('mallId') mallId: string,
    @Query('state') state: string,
    @Query('redirectUri') redirectUri?: string,
    @Query('scope') scope?: string,
  ) {
    return {
      url: this.cafe24Service.buildAuthorizeUrl({
        mallId,
        state,
        redirectUri,
        scope,
      }),
    };
  }

  @Post('token/exchange')
  @UseGuards(UserGuard)
  exchangeAccessToken(
    @Body('customId') customId: string,
    @Body('accountPlatform') accountPlatform: string,
    @Body('mallId') mallId: string,
    @Body('code') code: string,
    @Body('redirectUri') redirectUri?: string,
  ) {
    return this.cafe24Service.syncAccessTokenToHostingAccount({
      customId,
      accountPlatform,
      mallId,
      code,
      redirectUri,
    });
  }

  @Post('products')
  @UseGuards(AdminGuard)
  createProduct(
    @Body('mallId') mallId: string,
    @Body('accessToken') accessToken: string,
    @Body('shopNo') shopNo: number,
    @Body('payload') payload: Cafe24CreateProductDto,
  ) {
    return this.cafe24Service.createProduct({
      mallId,
      accessToken,
      shopNo,
      payload,
    });
  }

  @Put('products/:productNo')
  @UseGuards(AdminGuard)
  updateProduct(
    @Param('productNo') productNo: string,
    @Body('mallId') mallId: string,
    @Body('accessToken') accessToken: string,
    @Body('shopNo') shopNo: number,
    @Body('payload') payload: Cafe24UpdateProductDto,
  ) {
    return this.cafe24Service.updateProduct({
      mallId,
      accessToken,
      shopNo,
      productNo: Number(productNo),
      payload,
    });
  }

  @Delete('products/:productNo')
  @UseGuards(AdminGuard)
  deleteProduct(
    @Param('productNo') productNo: string,
    @Body('mallId') mallId: string,
    @Body('accessToken') accessToken: string,
    @Body('shopNo') shopNo?: number,
  ) {
    return this.cafe24Service.deleteProduct({
      mallId,
      accessToken,
      shopNo,
      productNo: Number(productNo),
      deleteImagesFirst: true,
    });
  }
}
