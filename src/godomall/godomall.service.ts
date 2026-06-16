import { Injectable } from '@nestjs/common';
import axios from 'axios';
import * as qs from 'qs';
import { R2Service } from '../cloudflare/r2.service';
import { Product } from 'src/product/product.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import * as xml2js from 'xml2js'; // XML 파싱을 위한 xml2js 라이브러리
import { HostingService } from 'src/hosting/hosting.service';
import { CategoryService } from 'src/category/category.service';

@Injectable()
export class GodoMallService {
  
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    private readonly r2Service: R2Service,
    private readonly hostingService: HostingService,
    private readonly categoryService: CategoryService,
  ) {}

  private readonly apiUrl = 'https://openhub.godo.co.kr/godomall5/goods/Goods_Insert.php';
  private readonly apiUrl2 = 'https://openhub.godo.co.kr/godomall5/goods/Goods_Update.php';


  async retryAxiosPost(url: string, payload: any, headers: any, maxAttempts: number = 3): Promise<any> {
    let attempts = 0;
    while (attempts < maxAttempts) {
        try {
            return await axios.post(url, qs.stringify(payload), { headers });
        } catch (error: any) {
            attempts++;
            console.warn(`axios 재시도 중 (${attempts}/${maxAttempts}) - 오류: ${error.message}`);
            if (attempts >= maxAttempts) {
                throw error;
            }
        }
    }
}

  // 상품 등록 및 업데이트 함수
async registerProductWithXmlUrl(
  partnerKey: string,
  apiKey: string,
  xmlUrl: string,
  product: Product,
  productStyleId: string,
): Promise<boolean> { // 🔥 boolean으로 성공/실패 반환
  const payload = {
    partner_key: partnerKey,
    key: apiKey,
    data_url: xmlUrl,
  };

  const apiEndpoint = !product.goodsno ? this.apiUrl : this.apiUrl2;

  try {
    const response = await this.retryAxiosPost(apiEndpoint, payload, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    // ✅ XML 파싱 예외처리 (hr 오류 등)
    let parsedResponse: any;
    try {
      const parser = new xml2js.Parser({ explicitArray: false });
      parsedResponse = await parser.parseStringPromise(response.data);
    } catch (parseError: any) {
      console.warn(
        `⚠️ XML 파싱 실패 (${productStyleId}): ${parseError.message}`,
      );
      console.warn(`⚠️ 응답 데이터 미리보기:\n${response.data?.slice(0, 300)}...`);
      this.r2Service.addToDeleteList(xmlUrl); // XML 삭제 예약
      return false; // 👉 상품 스킵
    }

    // // 새 상품일 경우에만 goodsno 추출
    // if (!product.goodsno) {
    //   const goodsno = parsedResponse?.data?.return?.goods_data?.data?.goodsno;

    //   if (goodsno) {
    //     console.log(`✅ 상품 등록 성공: goodsno = ${goodsno}`);
    //     product.goodsno = goodsno;
    //   } else {
    //     console.warn(`⚠️ 상품 스킵 (goodsno 없음): ${productStyleId}`);
    //     this.r2Service.addToDeleteList(productStyleId);
    //     return false; // 🔥 핵심: 실패 → 스킵
    //   }
    // }

    if (!product.goodsno) {
      const ret = parsedResponse?.data?.return;

      const goodsno =
        ret?.goods_data?.data?.goodsno ||
        ret?.goods_data?.goodsno ||
        ret?.goodsno;

      // 🔍 디버그 로그 (여기가 핵심)
      // console.warn('🧪 [GOODSNO DEBUG]', {
      //   productStyleId,
      //   result: ret?.result,
      //   message: ret?.message,
      //   hasGoodsData: !!ret?.goods_data,
      //   goodsDataKeys: ret?.goods_data
      //     ? Object.keys(ret.goods_data)
      //     : null,
      //   goodsno_paths: {
      //     path1: ret?.goods_data?.data?.goodsno,
      //     path2: ret?.goods_data?.goodsno,
      //     path3: ret?.goodsno,
      //   },
      // });

      if (goodsno) {
        console.log(`✅ 상품 등록 성공: goodsno = ${goodsno}`);
        product.goodsno = goodsno;
      } else {
        console.warn(`⚠️ 상품 등록 실패 (goodsno 없음): ${productStyleId}`);

        // ⛑ XML 일부 미리보기 (너무 길면 로그 터지니까 slice)
        console.warn(
          '📦 XML RESPONSE PREVIEW:',
          typeof response.data === 'string'
            ? response.data.slice(0, 500)
            : response.data,
        );

        this.r2Service.addToDeleteList(xmlUrl);
        return false;
      }
    }

    // 상품 등록 성공 시 XML 파일 삭제 목록에 추가
    this.r2Service.addToDeleteList(xmlUrl);

    // ✅ 호출 스택 확인 (getProductUpdate → save 스킵)
    const stack = new Error().stack || '';
    const isFromUpdate = stack.includes('getProductUpdate');

    if (!isFromUpdate) {
      if (product instanceof Product) {
        await this.productRepository.save(product);
      }
    }

    return true; // 🔥 성공

  } catch (error: any) {
    console.error('🚨 상품 처리 중 오류 → 스킵', {
      productStyleId,
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
    });

    this.r2Service.addToDeleteList(xmlUrl);
    return false; // 🔥 실패 → 스킵
  }
}


  // 모든 상품 등록 작업 완료 후 XML 파일 일괄 삭제
  async finalizeXmlDeletion(): Promise<void> {
    await this.r2Service.deleteXmlFilesBatch();
  }

  // getProductUpdate XML 삭제
  async deleteUpdateXml(xmlUrl: string): Promise<void> {
    try {
      await this.r2Service.deleteUpdateXml(xmlUrl);
    } catch (error: any) {
      console.error('🚨 deleteUpdateXml 에러:', error);
    }
  }


  async fetchAndSaveGodoMallCategories(
    customId: string,
    accountPlatform: string,
  ) {
    const account = await this.hostingService.getAccount(
      customId,
      accountPlatform
    );

    if (!account) {
      throw new Error('계정 없음');
    }

    const categories = await this.getAllCategories(
      account.partnerKey,
      account.apiKey
    );

    await this.categoryService.saveGodoMallCategories(
      categories,
      customId,
      accountPlatform
    );

    return {
      message: '카테고리 동기화 완료',
      count: categories.length,
    };
  }

  // 고도몰 카테고리 가져오는 함수
  async getAllCategories(partnerKey: string, apiKey: string, cateCd: string = '', parentPath: string = '', processedCategories: Set<string> = new Set()): Promise<string[]> {
    console.log('getAllCategories 호출됨: partnerKey:', partnerKey, 'apiKey:', apiKey, 'cateCd:', cateCd);

    const apiUrl = 'https://openhub.godo.co.kr/godomall5/goods/Category_Search.php';
    const payload = {
      partner_key: partnerKey,
      key: apiKey,
      cateCd: cateCd || '',
    };

    try {
      const response = await axios.post(apiUrl, qs.stringify(payload), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      // XML을 JSON으로 파싱
      const parser = new xml2js.Parser({ explicitArray: false });
      const parsedResponse = await parser.parseStringPromise(response.data);

      console.log('파싱된 응답:', parsedResponse); // 파싱된 데이터 확인


      const categoryData = parsedResponse?.data?.return?.category_data;

      if (!categoryData) {
        return []; // 더 이상 카테고리가 없으면 빈 배열 반환
      }

      // cateCd와 cateNm만 추출
      const categories = Array.isArray(categoryData)
        ? categoryData.map((category: any) => ({
            cateCd: category.cateCd,
            cateNm: category.cateNm,
            cateDisplayFl: category.cateDisplayFl, // PC 노출 여부
            cateDisplayMobileFl: category.cateDisplayMobileFl, // Mobile 노출 여부
          }))
        : [{
            cateCd: categoryData.cateCd,
            cateNm: categoryData.cateNm,
            cateDisplayFl: categoryData.cateDisplayFl, 
            cateDisplayMobileFl: categoryData.cateDisplayMobileFl,
          }];

      const categoryPaths: string[] = [];

      for (const category of categories) {
        if (category.cateDisplayFl === 'y' && category.cateDisplayMobileFl === 'y') {
          // 최상위 카테고리 Store 제거, 하위 카테고리들로만 경로 생성
          let currentPath = parentPath ? `${parentPath} > ${category.cateNm}` : category.cateNm;
          currentPath = currentPath.replace(/^Store\s?>\s?/, '');

          // Store 제거 후도 경로가 빈 문자열이 아닐 경우만 처리
          if (currentPath.includes('>') && !processedCategories.has(currentPath)) {
            categoryPaths.push(`${currentPath} [${category.cateCd}]`);
            processedCategories.add(currentPath); // 중복 방지를 위해 처리된 카테고리 추가
          }

          // 하위 카테고리 처리
          const subCategoryPaths = await this.getAllCategories(partnerKey, apiKey, category.cateCd, currentPath, processedCategories);
          categoryPaths.push(...subCategoryPaths);
        }
      }

      // 카테고리 경로들을 정렬 후 반환
      return categoryPaths.sort(); // 경로를 문자열 기준으로 정렬
    } catch (error: any) {
      console.error('카테고리 조회 실패:', error.message);
      throw new Error('카테고리 조회 실패');
    }
  }

}
