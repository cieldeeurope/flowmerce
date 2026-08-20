import { Controller, Get, Query } from '@nestjs/common';
import { GodoMallService } from './godomall.service';
import { CategoryService } from 'src/category/category.service';
import { HostingService } from 'src/hosting/hosting.service'; // 🔥 추가

@Controller('godomall')
export class GodoMallController {
  constructor(
    private readonly godoMallService: GodoMallService,
    private readonly categoryService: CategoryService,
    private readonly hostingService: HostingService,
  ) {}

  @Get('categories')
  async fetchAndSaveGodoMallCategories(
    @Query('customId') customId: string,
    @Query('accountPlatform') accountPlatform: string,
  ): Promise<{ message: string; count: number }> {

    if (!customId || !accountPlatform) {
      throw new Error('customId와 accountPlatform은 필수입니다.');
    }

    console.log('카테고리 동기화 요청:', { customId, accountPlatform });

    // 1️⃣ 계정 조회 (핵심 변경)
    const account = await this.hostingService.getAccount(
      customId,
      accountPlatform
    );

    if (!account) {
      throw new Error('해당 계정을 찾을 수 없습니다.');
    }

    // 2️⃣ API 호출
    const godoMallCategories = await this.godoMallService.getAllCategories(
      account.partnerKey,
      account.apiKey
    );

    // 3️⃣ 저장 (여기도 추가)
    await this.categoryService.saveGodoMallCategories(
      godoMallCategories,
      customId,
      accountPlatform
    );

    return {
      message: '카테고리 동기화 완료',
      count: godoMallCategories.length,
    };
  }

  
}