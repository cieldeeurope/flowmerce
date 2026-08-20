import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { GodoMallCategory } from '../category/GodoMallCategory.entity';
import { SmartStoreCategory } from '../category/SmartStoreCategory.entity';
import { Cafe24Category } from '../category/Cafe24Category.entity';
import { MakeshopCategory } from '../category/MakeshopCategory.entity';
import { HostingAccount, Platform } from './hostingaccount.entity';
import { MarketplacePolicy, normalizeMarketplacePolicy } from './marketplace-policy';
import { UserService } from 'src/user/user.service';
import { KakaotalkService } from 'src/kakaotalk/kakaotalk.service';

@Injectable()
export class HostingService {
  findOne(arg0: { where: { customId: string; accountPlatform: string; }; }) {
    throw new Error('Method not implemented.');
  }
  find(arg0: { order: { createdAt: string; }; }) {
    throw new Error('Method not implemented.');
  }
  constructor(
    @InjectRepository(GodoMallCategory)
    private readonly godoMallRepository: Repository<GodoMallCategory>,

    @InjectRepository(SmartStoreCategory)
    private readonly smartStoreRepository: Repository<SmartStoreCategory>,

    @InjectRepository(Cafe24Category)
    private readonly cafe24Repository: Repository<Cafe24Category>,

    @InjectRepository(MakeshopCategory)
    private readonly makeshopRepository: Repository<MakeshopCategory>,

    @InjectRepository(HostingAccount)
    private readonly hostingRepo: Repository<HostingAccount>,
    private readonly userService: UserService,
    private readonly kakaotalkService: KakaotalkService,
  ) {}

  private hasSetupCredentials(account: {
    platform: Platform;
    partnerKey?: string | null;
    apiKey?: string | null;
    refreshToken?: string | null;
  }) {
    if (account.platform === 'cafe24') {
      return Boolean(
        account.partnerKey?.trim() &&
          account.apiKey?.trim() &&
          account.refreshToken?.trim(),
      );
    }

    return Boolean(account.partnerKey?.trim() && account.apiKey?.trim());
  }

  private async notifySetupCompleted(customId?: string | null) {
    const normalizedCustomId = String(customId || '').trim();

    if (!normalizedCustomId) {
      return;
    }

    const phone = await this.userService.getNotificationPhoneByCustomId(
      normalizedCustomId,
    );

    if (!phone) {
      return;
    }

    await this.kakaotalkService.sendSetupCompleted({
      to: phone,
    });
  }

  async getAccount(customId: string, accountPlatform: string) {
    return await this.hostingRepo.findOne({
      where: {
        customId,
        accountPlatform,
      },
    });
  }

  async getAccounts(customId: string) {
    const accounts = await this.hostingRepo.find({
      where: {
        customId,
      },
      order: {
        accountPlatform: 'ASC',
      },
    });

    if (!accounts.length) {
      return [];
    }

    return accounts.map((acc) => acc.accountPlatform);
  }

  async getDetailedAccounts(customId: string) {
    return await this.hostingRepo.find({
      where: {
        customId,
      },
      order: {
        accountPlatform: 'ASC',
      },
    });
  }


  async getCategories(
    customId: string,
    accountPlatform: string
  ) {

    // 1. 계정 조회
    const account = await this.hostingRepo.findOne({
      where: {
        customId,
        accountPlatform,
      },
    });

    if (!account) {
      throw new Error('계정을 찾을 수 없습니다.');
    }

    // 2. platform 기준 분기
    if (account.platform === 'godomall') {

      const categories = await this.godoMallRepository.find({
        where: {
          customId,
          accountPlatform,
        },
        order: {
          parentPath: 'ASC',
          categoryName: 'ASC',
        },
      });

      return {
        categories,
        partnerKey: account.partnerKey,
        apiKey: account.apiKey,
        message: categories.length === 0 ? '고도몰 카테고리가 없습니다.' : null,
      };
    }

    if (account.platform === 'smartstore') {

      const categories = await this.smartStoreRepository
        .createQueryBuilder('c')
        .where('c.customId = :customId', { customId })
        .andWhere('c.accountPlatform = :accountPlatform', { accountPlatform })
        .orderBy(`
          CASE 
            WHEN c.categoryName LIKE '패%' THEN 0
            ELSE 1
          END
        `)
        .addOrderBy('c.categoryName', 'ASC')
        .getMany();

      return {
        categories,
        partnerKey: account.partnerKey,
        apiKey: account.apiKey,
        message: categories.length === 0 ? '스마트스토어 카테고리가 없습니다.' : null,
      };
    }

    if (account.platform === 'cafe24') {
      const categories = await this.cafe24Repository.find({
        where: {
          customId,
          accountPlatform,
        },
        order: {
          categoryDepth: 'ASC',
          categoryName: 'ASC',
        },
      });

      return {
        categories,
        partnerKey: account.partnerKey,
        apiKey: account.apiKey,
        message: categories.length === 0 ? 'Cafe24 categories are empty.' : null,
      };
    }

    if (account.platform === 'makeshop') {
      const categories = await this.makeshopRepository.find({
        where: {
          customId,
          accountPlatform,
        },
        order: {
          categoryName: 'ASC',
        },
      });

      return {
        categories,
        partnerKey: account.partnerKey,
        apiKey: account.apiKey,
        message: categories.length === 0 ? 'Makeshop categories are empty.' : null,
      };
    }

    throw new Error('지원되지 않는 플랫폼입니다.');
  }

  async getAdminAccounts() {
    const accounts = await this.hostingRepo.find({
      order: {
        createdAt: 'DESC',
      },
    });

    return accounts;
  }

  private normalizeImages(images?: string[]) {
    if (!Array.isArray(images)) {
      return [];
    }

    return [...new Set(images.map((item) => String(item).trim()).filter(Boolean))];
  }

  private normalizeMarketplacePolicyInput(policy?: MarketplacePolicy | null) {
    return normalizeMarketplacePolicy(policy);
  }

  async createAdminAccount(data: {
    customId?: string | null;
    platform: Platform;
    accountPlatform: string;
    partnerKey: string;
    apiKey: string;
    redirectUri?: string | null;
    refreshToken?: string | null;
    tokenExpiresAt?: string | Date | null;
    refreshTokenExpiresAt?: string | Date | null;
    topImages?: string[];
    bottomImages?: string[];
    memo?: string | null;
    marketplacePolicy?: MarketplacePolicy | null;
  }) {
    if (!data.platform) {
      return { success: false, message: 'platform은 필수입니다.' };
    }

    if (!data.accountPlatform?.trim()) {
      return { success: false, message: 'accountPlatform은 필수입니다.' };
    }

    if (!data.partnerKey?.trim()) {
      return { success: false, message: 'partnerKey는 필수입니다.' };
    }

    if (data.platform !== 'cafe24' && !data.apiKey?.trim()) {
      return { success: false, message: 'apiKey는 필수입니다.' };
    }

    const normalizedCustomId = data.customId?.trim() || null;
    const normalizedAccountPlatform = data.accountPlatform.trim();

    if (normalizedCustomId) {
      const exists = await this.hostingRepo.findOne({
        where: {
          customId: normalizedCustomId,
          accountPlatform: normalizedAccountPlatform,
        },
      });

      if (exists) {
        return {
          success: false,
          message: '이미 존재하는 customId + accountPlatform 조합입니다.',
        };
      }
    }

    const account = this.hostingRepo.create({
      customId: normalizedCustomId,
      platform: data.platform,
      accountPlatform: normalizedAccountPlatform,
      partnerKey: data.partnerKey.trim(),
      apiKey: data.apiKey?.trim() || '',
      redirectUri: data.redirectUri?.trim() || null,
      refreshToken: data.refreshToken?.trim() || null,
      tokenExpiresAt: data.tokenExpiresAt ? new Date(data.tokenExpiresAt) : null,
      refreshTokenExpiresAt: data.refreshTokenExpiresAt
        ? new Date(data.refreshTokenExpiresAt)
        : null,
      topImages: this.normalizeImages(data.topImages),
      bottomImages: this.normalizeImages(data.bottomImages),
      memo: data.memo?.trim() || null,
      marketplacePolicy: this.normalizeMarketplacePolicyInput(
        data.marketplacePolicy,
      ),
    });

    await this.hostingRepo.save(account);

    if (this.hasSetupCredentials(account)) {
      await this.notifySetupCompleted(account.customId);
    }

    return {
      success: true,
      message: 'HostingAccount가 추가되었습니다.',
      account,
    };
  }

  async createUserAccount(
    customId: string,
    data: {
      customId?: string | null;
      platform: Platform;
      accountPlatform: string;
      partnerKey: string;
      apiKey: string;
      redirectUri?: string | null;
      refreshToken?: string | null;
      tokenExpiresAt?: string | Date | null;
      refreshTokenExpiresAt?: string | Date | null;
      topImages?: string[];
      bottomImages?: string[];
      memo?: string | null;
      marketplacePolicy?: MarketplacePolicy | null;
    },
  ) {
    return this.createAdminAccount({
      ...data,
      customId,
    });
  }

  async updateAdminAccount(
    id: number,
    data: {
      customId?: string | null;
      platform: Platform;
      accountPlatform: string;
      partnerKey: string;
      apiKey: string;
      redirectUri?: string | null;
      refreshToken?: string | null;
      tokenExpiresAt?: string | Date | null;
      refreshTokenExpiresAt?: string | Date | null;
      topImages?: string[];
      bottomImages?: string[];
      memo?: string | null;
      marketplacePolicy?: MarketplacePolicy | null;
    },
    options?: {
      expectedCustomId?: string | null;
    },
  ) {
    const account = await this.hostingRepo.findOne({
      where: { id },
    });

    if (!account) {
      return {
        success: false,
        message: '수정할 HostingAccount를 찾을 수 없습니다.',
      };
    }

    if (
      options?.expectedCustomId &&
      String(account.customId || '').trim() !== options.expectedCustomId.trim()
    ) {
      return {
        success: false,
        message: '수정 권한이 없는 HostingAccount입니다.',
      };
    }

    if (!data.platform) {
      return { success: false, message: 'platform은 필수입니다.' };
    }

    if (!data.accountPlatform?.trim()) {
      return { success: false, message: 'accountPlatform은 필수입니다.' };
    }

    if (!data.partnerKey?.trim()) {
      return { success: false, message: 'partnerKey는 필수입니다.' };
    }

    if (data.platform !== 'cafe24' && !data.apiKey?.trim()) {
      return { success: false, message: 'apiKey는 필수입니다.' };
    }

    const normalizedCustomId = data.customId?.trim() || null;
    const normalizedAccountPlatform = data.accountPlatform.trim();

    if (normalizedCustomId) {
      const exists = await this.hostingRepo.findOne({
        where: {
          customId: normalizedCustomId,
          accountPlatform: normalizedAccountPlatform,
        },
      });

      if (exists && exists.id !== account.id) {
        return {
          success: false,
          message: '이미 존재하는 customId + accountPlatform 조합입니다.',
        };
      }
    }

    const hadCredentials = this.hasSetupCredentials(account);

    account.customId = normalizedCustomId;
    account.platform = data.platform;
    account.accountPlatform = normalizedAccountPlatform;
    account.partnerKey = data.partnerKey.trim();
    account.apiKey = data.apiKey?.trim() || '';
    account.redirectUri = data.redirectUri?.trim() || null;
    account.refreshToken = data.refreshToken?.trim() || null;
    account.tokenExpiresAt = data.tokenExpiresAt
      ? new Date(data.tokenExpiresAt)
      : null;
    account.refreshTokenExpiresAt = data.refreshTokenExpiresAt
      ? new Date(data.refreshTokenExpiresAt)
      : null;
    account.topImages = this.normalizeImages(data.topImages);
    account.bottomImages = this.normalizeImages(data.bottomImages);
    account.memo = data.memo?.trim() || null;
    account.marketplacePolicy = this.normalizeMarketplacePolicyInput(
      data.marketplacePolicy,
    );

    await this.hostingRepo.save(account);

    const hasCredentials = this.hasSetupCredentials(account);

    if (!hadCredentials && hasCredentials) {
      await this.notifySetupCompleted(account.customId);
    }

    return {
      success: true,
      message: 'HostingAccount 정보가 수정되었습니다.',
      account,
    };
  }

  async updateUserAccount(
    id: number,
    customId: string,
    data: {
      customId?: string | null;
      platform: Platform;
      accountPlatform: string;
      partnerKey: string;
      apiKey: string;
      redirectUri?: string | null;
      refreshToken?: string | null;
      tokenExpiresAt?: string | Date | null;
      refreshTokenExpiresAt?: string | Date | null;
      topImages?: string[];
      bottomImages?: string[];
      memo?: string | null;
      marketplacePolicy?: MarketplacePolicy | null;
    },
  ) {
    return this.updateAdminAccount(
      id,
      {
        ...data,
        customId,
      },
      {
        expectedCustomId: customId,
      },
    );
  }

}

