import { Body, Controller, Post } from '@nestjs/common';
import { FendiService } from './fendi.service';

@Controller('fendi')
export class FendiController {
  constructor(private readonly fendiService: FendiService) {}

  @Post('start-Fendi')
  async startFendi(
    @Body('siteUrl') siteUrl: string[], // 여러 URL을 받아오도록 수정
    @Body('partnerKey') partnerKey: string,
    @Body('apiKey') apiKey: string,
    @Body('godoMallCategoryCode') godoMallCategoryCode: string[],
    @Body('customId') customId: string,
    @Body('accountPlatform') accountPlatform: string, // 여러 카테고리 코드 수집
  ) {
    let currentUrl = ''; // 🔹 try 바깥에서 선언 (초기값 설정)

    try {
      // 초기 로그: 전체 URL과 카테고리 코드 목록 출력
      console.log(`총 ${siteUrl.length}개의 카테고리를 수집합니다.`);
      console.log('수집할 URL 목록:', siteUrl);
      console.log('수집할 카테고리 코드 목록:', godoMallCategoryCode);

      // 순차적으로 각 URL과 카테고리 코드에 대해 크롤링 수행
      for (let i = 0; i < siteUrl.length; i++) {
        currentUrl = siteUrl[i];
const currentCategoryCode = godoMallCategoryCode[i];
        
        const remainingCategories = siteUrl.length - i - 1;

        // 진행 로그: 현재 크롤링할 URL과 남은 카테고리 수 출력
        console.log(`카테고리 ${i + 1}/${siteUrl.length} 수집 시작 - URL: ${currentUrl}`);
        console.log(`남은 카테고리 수: ${remainingCategories}`);

        // Fendi 호출 (순차적으로 await 사용)
        await this.fendiService.getProductsFromCategory(currentUrl, partnerKey, apiKey, customId, accountPlatform, currentCategoryCode);

        // 완료 로그: 현재 크롤링 완료 후 남은 작업 확인
        console.log(`카테고리 ${i + 1}/${siteUrl.length} 수집 완료 - URL: ${currentUrl}`);
      }

      // 모든 카테고리 수집 완료
      console.log('모든 카테고리 수집이 성공적으로 완료되었습니다.');
      return { message: `모든 Fendi 카테고리 수집이 성공적으로 완료되었습니다.` };
    } catch (error: any) {
      console.error(`Fendi ${currentUrl} 수집 중 오류 발생:`, error);
      throw error;
    }
  }
}