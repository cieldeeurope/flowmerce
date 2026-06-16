import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { HostingService } from './hosting.service';
import { Platform } from './hostingaccount.entity';
import { MarketplacePolicy } from './marketplace-policy';
import { GodoMallService } from 'src/godomall/godomall.service';
import { SmartstoreService } from 'src/smartstore/smartstore.service';
import { Cafe24Service } from 'src/cafe24/cafe24.service';
import { MakeshopService } from 'src/makeshop/makeshop.service';
import { AdminGuard } from 'src/admin-auth/admin.guard';
import { UserGuard } from 'src/user-auth/user.guard';

@Controller('hosting')
export class HostingController {
  constructor(
    private readonly hostingService: HostingService,
    private readonly godoMallService: GodoMallService,
    private readonly smartstoreService: SmartstoreService,
    private readonly cafe24Service: Cafe24Service,
    private readonly makeshopService: MakeshopService,
  ) {}

  @Get('categories')
  @UseGuards(UserGuard)
  async getCategories(
    @Query('customId') customId: string,
    @Query('accountPlatform') accountPlatform: string,
  ) {
    if (!customId || !accountPlatform) {
      return { message: 'customId and accountPlatform are required.' };
    }

    return this.hostingService.getCategories(customId, accountPlatform);
  }

  @Get('accounts')
  @UseGuards(UserGuard)
  async getAccounts(@Query('customId') customId: string) {
    if (!customId) {
      return { message: 'customId is required.' };
    }

    return this.hostingService.getAccounts(customId);
  }

  @Get('accounts/detail')
  @UseGuards(UserGuard)
  async getDetailedAccounts(@Query('customId') customId: string) {
    if (!customId) {
      return { message: 'customId is required.' };
    }

    return this.hostingService.getDetailedAccounts(customId);
  }

  @Post('categories/fetch')
  @UseGuards(UserGuard)
  async fetchCategories(
    @Query('customId') customId: string,
    @Query('accountPlatform') accountPlatform: string,
  ) {
    if (!customId || !accountPlatform) {
      throw new Error('customId and accountPlatform are required.');
    }

    const account = await this.hostingService.getAccount(
      customId,
      accountPlatform,
    );

    if (!account) {
      throw new Error('Hosting account not found.');
    }

    if (account.platform === 'godomall') {
      return this.godoMallService.fetchAndSaveGodoMallCategories(
        customId,
        accountPlatform,
      );
    }

    if (account.platform === 'smartstore') {
      return this.smartstoreService.fetchAndStoreSmartstoreCategories(
        customId,
        accountPlatform,
      );
    }

    if (account.platform === 'cafe24') {
      return this.cafe24Service.fetchAndSaveCafe24Categories(
        customId,
        accountPlatform,
      );
    }

    if (account.platform === 'makeshop') {
      return this.makeshopService.fetchAndSaveMakeshopCategories(
        customId,
        accountPlatform,
      );
    }

    throw new Error('Unsupported platform.');
  }

  @Get('admin/accounts')
  @UseGuards(AdminGuard)
  async getAdminAccounts() {
    const accounts = await this.hostingService.getAdminAccounts();

    return {
      success: true,
      accounts,
    };
  }

  @Post('admin/accounts')
  @UseGuards(AdminGuard)
  async createAdminAccount(
    @Body('customId') customId: string,
    @Body('platform') platform: Platform,
    @Body('accountPlatform') accountPlatform: string,
    @Body('partnerKey') partnerKey: string,
    @Body('apiKey') apiKey: string,
    @Body('redirectUri') redirectUri?: string,
    @Body('refreshToken') refreshToken?: string,
    @Body('tokenExpiresAt') tokenExpiresAt?: string,
    @Body('refreshTokenExpiresAt') refreshTokenExpiresAt?: string,
    @Body('topImages') topImages?: string[],
    @Body('bottomImages') bottomImages?: string[],
    @Body('memo') memo?: string,
    @Body('marketplacePolicy') marketplacePolicy?: MarketplacePolicy,
  ) {
    return this.hostingService.createAdminAccount({
      customId,
      platform,
      accountPlatform,
      partnerKey,
      apiKey,
      redirectUri,
      refreshToken,
      tokenExpiresAt,
      refreshTokenExpiresAt,
      topImages,
      bottomImages,
      memo,
      marketplacePolicy,
    });
  }

  @Post('accounts')
  @UseGuards(UserGuard)
  async createAccount(
    @Body('customId') customId: string,
    @Body('platform') platform: Platform,
    @Body('accountPlatform') accountPlatform: string,
    @Body('partnerKey') partnerKey: string,
    @Body('apiKey') apiKey: string,
    @Body('redirectUri') redirectUri?: string,
    @Body('refreshToken') refreshToken?: string,
    @Body('tokenExpiresAt') tokenExpiresAt?: string,
    @Body('refreshTokenExpiresAt') refreshTokenExpiresAt?: string,
    @Body('topImages') topImages?: string[],
    @Body('bottomImages') bottomImages?: string[],
    @Body('memo') memo?: string,
    @Body('marketplacePolicy') marketplacePolicy?: MarketplacePolicy,
  ) {
    return this.hostingService.createUserAccount(customId, {
      customId,
      platform,
      accountPlatform,
      partnerKey,
      apiKey,
      redirectUri,
      refreshToken,
      tokenExpiresAt,
      refreshTokenExpiresAt,
      topImages,
      bottomImages,
      memo,
      marketplacePolicy,
    });
  }

  @Put('admin/accounts/:id')
  @UseGuards(AdminGuard)
  async updateAdminAccount(
    @Param('id') id: string,
    @Body('customId') customId: string,
    @Body('platform') platform: Platform,
    @Body('accountPlatform') accountPlatform: string,
    @Body('partnerKey') partnerKey: string,
    @Body('apiKey') apiKey: string,
    @Body('redirectUri') redirectUri?: string,
    @Body('refreshToken') refreshToken?: string,
    @Body('tokenExpiresAt') tokenExpiresAt?: string,
    @Body('refreshTokenExpiresAt') refreshTokenExpiresAt?: string,
    @Body('topImages') topImages?: string[],
    @Body('bottomImages') bottomImages?: string[],
    @Body('memo') memo?: string,
    @Body('marketplacePolicy') marketplacePolicy?: MarketplacePolicy,
  ) {
    return this.hostingService.updateAdminAccount(Number(id), {
      customId,
      platform,
      accountPlatform,
      partnerKey,
      apiKey,
      redirectUri,
      refreshToken,
      tokenExpiresAt,
      refreshTokenExpiresAt,
      topImages,
      bottomImages,
      memo,
      marketplacePolicy,
    });
  }

  @Put('accounts/:id')
  @UseGuards(UserGuard)
  async updateAccount(
    @Param('id') id: string,
    @Body('customId') customId: string,
    @Body('platform') platform: Platform,
    @Body('accountPlatform') accountPlatform: string,
    @Body('partnerKey') partnerKey: string,
    @Body('apiKey') apiKey: string,
    @Body('redirectUri') redirectUri?: string,
    @Body('refreshToken') refreshToken?: string,
    @Body('tokenExpiresAt') tokenExpiresAt?: string,
    @Body('refreshTokenExpiresAt') refreshTokenExpiresAt?: string,
    @Body('topImages') topImages?: string[],
    @Body('bottomImages') bottomImages?: string[],
    @Body('memo') memo?: string,
    @Body('marketplacePolicy') marketplacePolicy?: MarketplacePolicy,
  ) {
    return this.hostingService.updateUserAccount(Number(id), customId, {
      customId,
      platform,
      accountPlatform,
      partnerKey,
      apiKey,
      redirectUri,
      refreshToken,
      tokenExpiresAt,
      refreshTokenExpiresAt,
      topImages,
      bottomImages,
      memo,
      marketplacePolicy,
    });
  }
}
