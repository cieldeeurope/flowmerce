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

private asArray<T>(value: T | T[] | undefined | null): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

private xmlText(value: any): string {
  if (value === undefined || value === null) return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value).trim();
  }
  if (typeof value === 'object' && '_' in value) {
    return String(value._ || '').trim();
  }
  return String(value).trim();
}

private expectedGoodsCd(product: Product): string {
  const site = (product.site || 'unknown').toLowerCase();
  const prefix = site === 'farfetch' || site === 'cettire'
    ? site
    : `official_${site}`;

  const styleId = String(product.styleId || '').replace(/\s+/g, ' ').trim();

  return `${prefix}_${styleId}`;
}

private async logXmlDiagnostics(xmlUrl: string, product: Product, productStyleId: string): Promise<void> {
  try {
    const xmlResponse = await axios.get(xmlUrl, {
      responseType: 'text',
      timeout: 10000,
    });
    const xmlData = String(xmlResponse.data || '');
    const parser = new xml2js.Parser({ explicitArray: false });
    const parsedXml = await parser.parseStringPromise(xmlData);
    const goodsData = parsedXml?.data?.goods_data || {};
    const field = (name: string) => this.xmlText(goodsData?.[name]);
    const optionData = this.asArray(goodsData?.optionData);
    const magnifyImages = this.asArray(goodsData?.magnifyImageData);
    const detailImages = this.asArray(goodsData?.detailImageData);
    const listImages = this.asArray(goodsData?.listImageData);
    const mainImages = this.asArray(goodsData?.mainImageData);
    const issues: string[] = [];

    const requiredFields = [
      'goodsNm',
      'goodsPrice',
      'goodsCd',
      'makerNm',
      'goodsModelNo',
      'cateCd',
      'goodsDescription',
      'deliverySno',
      'detailInfoDelivery',
      'detailInfoAS',
      'detailInfoRefund',
      'detailInfoExchange',
    ];

    for (const name of requiredFields) {
      if (!field(name)) issues.push(`${name} 비어있음`);
    }

    const goodsPrice = Number(field('goodsPrice'));
    if (!Number.isFinite(goodsPrice) || goodsPrice <= 0) {
      issues.push(`goodsPrice 비정상: ${field('goodsPrice')}`);
    }

    if (field('goodsCd') !== this.expectedGoodsCd(product)) {
      issues.push(`goodsCd 예상값 불일치: actual=${field('goodsCd')} expected=${this.expectedGoodsCd(product)}`);
    }

    if (field('goodsNm').length > 250) {
      issues.push(`goodsNm 길이 초과 가능성: ${field('goodsNm').length}`);
    }

    if (field('cateCd') && !/^\d+$/.test(field('cateCd'))) {
      issues.push(`cateCd 숫자 아님: ${field('cateCd')}`);
    }

    if (field('optionFl') === 'y') {
      if (!field('optionName')) issues.push('optionFl=y 인데 optionName 비어있음');
      if (!optionData.length) issues.push('optionFl=y 인데 optionData 없음');
      optionData.forEach((option: any, index) => {
        if (!this.xmlText(option?.optionValue1)) {
          issues.push(`optionData[${index + 1}] optionValue1 비어있음`);
        }
      });
    }

    if (field('imageStorage') === 'url') {
      if (!magnifyImages.length) issues.push('magnifyImageData 없음');
      if (!detailImages.length) issues.push('detailImageData 없음');
      if (!listImages.length) issues.push('listImageData 없음');
      if (!mainImages.length) issues.push('mainImageData 없음');
    }

    const naverAttribute = field('naverAttribute');
    if (naverAttribute.includes('```')) {
      issues.push('naverAttribute에 코드블록 문자가 포함됨');
    }

    console.warn('🧪 고도몰 전송 XML 진단:', {
      productStyleId,
      xmlUrl,
      goodsNm: field('goodsNm'),
      goodsNmLength: field('goodsNm').length,
      goodsPrice: field('goodsPrice'),
      goodsCd: field('goodsCd'),
      expectedGoodsCd: this.expectedGoodsCd(product),
      makerNm: field('makerNm'),
      goodsModelNo: field('goodsModelNo'),
      cateCd: field('cateCd'),
      allCateCd: field('allCateCd'),
      optionFl: field('optionFl'),
      optionName: field('optionName'),
      optionCount: optionData.length,
      imageCounts: {
        magnify: magnifyImages.length,
        detail: detailImages.length,
        list: listImages.length,
        main: mainImages.length,
      },
      deliverySno: field('deliverySno'),
      detailInfoDelivery: field('detailInfoDelivery'),
      detailInfoAS: field('detailInfoAS'),
      detailInfoRefund: field('detailInfoRefund'),
      detailInfoExchange: field('detailInfoExchange'),
      naverAttributeLength: naverAttribute.length,
    });

    console.warn(
      '🧪 고도몰 전송 XML 의심 항목:',
      issues.length ? issues : ['필수 필드 누락은 안 보임. cateCd/attribute/이미지 URL 접근성/고도몰 내부 정책 확인 필요'],
    );
    console.warn('🧪 고도몰 전송 XML PREVIEW:', xmlData.slice(0, 1200));
  } catch (error: any) {
    console.warn('🧪 고도몰 전송 XML 진단 실패:', {
      productStyleId,
      xmlUrl,
      message: error.message,
    });
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
        const goodsData = ret?.goods_data;
        const failureCode =
          goodsData?.code ||
          goodsData?.data?.code ||
          ret?.code ||
          parsedResponse?.data?.header?.code;
        const failureMessage =
          goodsData?.message ||
          goodsData?.data?.message ||
          ret?.message ||
          parsedResponse?.data?.header?.msg;

        console.warn(`⚠️ 상품 등록 실패 (goodsno 없음): ${productStyleId}`);
        console.warn('📦 고도몰 상품 처리 실패 상세:', {
          code: failureCode,
          message: failureMessage,
          xmlUrl,
          goodsCd: product.styleId,
          categoryCode: product.godoMallCategoryCode,
          title: product.title,
          price: product.price,
          size: product.size,
          imageCount: [product.mainImageUrl, ...(product.additionalImageUrls || [])].filter(Boolean).length,
          platform: product.platform,
          site: product.site,
        });

        // ⛑ 고도몰 응답 일부 미리보기 (너무 길면 로그 터지니까 slice)
        console.warn(
          '📦 GODOMALL RESPONSE PREVIEW:',
          typeof response.data === 'string'
            ? response.data.slice(0, 500)
            : response.data,
        );

        await this.logXmlDiagnostics(xmlUrl, product, productStyleId);

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
