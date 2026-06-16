import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { Injectable } from '@nestjs/common';
import { Product } from 'src/product/product.entity'; // Product 엔티티 임포트
import { MarginService } from 'src/margin/margin.service';
import { WordReplacementService } from 'src/word-replacement/word-replacement.service';
import { v4 as uuidv4 } from 'uuid'; // 고유 sessionId 생성을 위해 uuid 라이브러리 사용
import { GoogleTranslateService } from 'src/smartstore/google-translate.service';
import { OpenApiService } from 'src/smartstore/openApi.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';
import axios from 'axios';
import { HostingAccount } from 'src/hosting/hostingaccount.entity';
import { getResolvedMarketplacePolicy } from 'src/hosting/marketplace-policy';


function escapeXml(str?: string) {
  if (!str) return '';

  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

@Injectable()
export class R2Service {
  private client: S3Client;
  private filesToDeleteBySession: { [sessionId: string]: string[] } = {};
  private sessionId: string;

  // bright Data APi
  private readonly API_KEY = process.env.BRIGHTDATA_API_KEY;
  private readonly DATASET_ID = process.env.BRIGHTDATA_DATASET_ID;

  private readonly TRIGGER_ENDPOINT =
    `https://api.brightdata.com/datasets/v3/trigger?dataset_id=${this.DATASET_ID}&include_errors=true`;

  private readonly PROGRESS_ENDPOINT =
    'https://api.brightdata.com/datasets/v3/progress';

  private readonly SNAPSHOT_ENDPOINT =
    'https://api.brightdata.com/datasets/v3/snapshot';

  constructor(
    private readonly marginService: MarginService,
    private readonly wordReplacementService: WordReplacementService,
    private readonly openApiService: OpenApiService,
    @InjectRepository(Product) private readonly productRepo: Repository<Product>,   
    @InjectRepository(HostingAccount) private readonly hostingRepo: Repository<HostingAccount>,
  ) {
    this.sessionId = uuidv4(); // 각 프로그램이 실행될 때마다 고유 sessionId 생성
    const env = {
      accountId: process.env.R2_ACCOUNT_ID,
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
      bucketName: process.env.R2_BUCKET_NEWNAME,
  };

  this.client = new S3Client({
    region: 'auto',
    endpoint: `https://${env.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env.accessKeyId,
      secretAccessKey: env.secretAccessKey,
    },
  });
  }

  private getMarketplacePolicy(account?: HostingAccount | null) {
    return getResolvedMarketplacePolicy(account?.marketplacePolicy);
  }

  private getR2KeyFromUrlOrKey(value: string): string | null {
    if (!value) return null;

    const trimmed = value.trim();
    if (!trimmed) return null;

    try {
      const parsed = new URL(trimmed);
      return decodeURIComponent(parsed.pathname.replace(/^\/+/, ''));
    } catch {
      return trimmed.replace(/^\/+/, '');
    }
  }

  async getHtmlFromUrl(url: string): Promise<string> {
    const snapshotId = await this.triggerSnapshot(url);
    await this.waitUntilReady(snapshotId);
    const data = await this.downloadSnapshot(snapshotId);
    const html = this.getHtmlFromSnapshot(data);

    if (!html) {
      throw new Error(`HTML not found for ${url}`);
    }

    return html;
  }

  async getHtmlFromUrl2(url: string): Promise<string> {

  for (let attempt = 1; attempt <= 3; attempt++) {

    try {

      const snapshotId = await this.triggerSnapshot(url);

      await this.waitUntilReady(snapshotId);

      const data = await this.downloadSnapshot(snapshotId);

      const html = this.getHtmlFromSnapshot(data);

      if (!html) {
        console.warn(`⚠️ HTML 없음 → retry (${attempt}) → ${url}`);
        continue;
      }

      /* Hermes 같은 JSON SPA 사이트 대응 */

      if (
        url.includes('hermes.com') &&
        !html.includes('type="application/json"')
      ) {
        console.warn(`⚠️ JSON script 없음 → retry (${attempt}) → ${url}`);
        continue;
      }

      return html;

    } catch (error: any) {

      console.warn(`⚠️ Snapshot 실패 → retry (${attempt}) → ${url}`);

    }

  }

  throw new Error(`❌ HTML retry 실패 → ${url}`);
}


  /* ========================================
     🔥 내부 공통 함수들
  ======================================== */

  private sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async triggerSnapshot(url: string): Promise<string> {

    let retry = 0;

    while (retry < 5) {
      try {

        const res = await axios.post(
          this.TRIGGER_ENDPOINT,
          [{ url }],
          {
            headers: {
              Authorization: `Bearer ${this.API_KEY}`,
              'Content-Type': 'application/json',
            },
            timeout: 30000, // 중요
          },
        );

        const snapshotId = res.data?.snapshot_id;

        if (!snapshotId) {
          throw new Error(`snapshot_id missing`);
        }

        return snapshotId;

      } catch (err: any) {

        const msg = err.message || '';

        const isNetworkError =
          msg.includes('socket hang up') ||
          msg.includes('ECONNRESET') ||
          msg.includes('ETIMEDOUT');

        if (isNetworkError) {
          retry++;
          console.warn(`⚠️ trigger retry (${retry}) → ${url}`);

          await this.sleep(1000 * retry); // 점점 늘림
          continue;
        }

        throw err;
      }
    }

    throw new Error(`❌ triggerSnapshot 실패 → ${url}`);
  }

  private async waitUntilReady(snapshotId: string) {
    let retry = 0;

    while (true) {
      try {
        const res = await axios.get(
          `${this.PROGRESS_ENDPOINT}/${snapshotId}`,
          {
            headers: {
              Authorization: `Bearer ${this.API_KEY}`,
            },
          },
        );

        const status = res.data?.status;

        if (status === 'ready') {
          await this.sleep(2000);
          return;
        }

        if (status === 'failed') {
          throw new Error(`Snapshot failed: ${snapshotId}`);
        }

        retry = 0;

      } catch (err: any) {

        if (err.response?.status === 500) {
          retry++;
          console.warn(`⚠️ progress 500 retry (${retry})`);

          if (retry < 5) {
            await this.sleep(3000);
            continue;
          }
        }

        throw err;
      }

      await this.sleep(3000);
    }
  }

  private async downloadSnapshot(snapshotId: string) {

  let networkRetry = 0;

  for (let i = 0; i < 10; i++) {

    try {

      const res = await axios.get(
        `${this.SNAPSHOT_ENDPOINT}/${snapshotId}?format=json`,
        {
          headers: {
            Authorization: `Bearer ${this.API_KEY}`,
          },
          timeout: 60000, // 🔥 1분으로 증가
        },
      );

      const data = res.data;

      if (Array.isArray(data) && data.length > 0) {
        return data;
      }

      await this.sleep(2000);

    } catch (err: any) {

      const msg = err.message || '';

      const isNetworkError =
        msg.includes('ETIMEDOUT') ||
        msg.includes('ECONNRESET') ||
        msg.includes('socket hang up') ||
        err.code === 'ECONNABORTED'; // 🔥 timeout 추가

      if (isNetworkError) {

        networkRetry++;
        console.warn(`⚠️ snapshot network retry (${networkRetry})`);

        if (networkRetry < 5) {
          await this.sleep(3000);
          continue;
        }

        // 🔥 여기 핵심: 실패해도 throw 안함
        console.error(`❌ snapshot skip (network fail): ${snapshotId}`);
        return null;
      }

      // 🔥 400 같은건 snapshot 아직 준비 안된 경우 많음
      if (err.response?.status === 400) {
        await this.sleep(2000);
        continue;
      }

      // 🔥 진짜 이상한 에러만 throw
      console.error(`❌ snapshot fatal error: ${snapshotId}`, err.message);
      return null;
    }
  }

  console.warn(`⚠️ snapshot empty skip: ${snapshotId}`);
  return null; // 🔥 여기 중요 (throw 제거)
}

  private getHtmlFromSnapshot(data: any): string | null {
    if (!Array.isArray(data) || data.length === 0) return null;

    const first = data[0];

    if (first.page_html && typeof first.page_html === 'string') {
      return first.page_html;
    }

    return null;
  }
  
  // 한국 프록시 (번호없음)
  async loadProxies(): Promise<string[]> {
    try {
      const command = new GetObjectCommand({
        Bucket: process.env.R2_BUCKET_PROXY || 'proxy',
        Key: 'smartproxy.txt',
      });

      const response = await this.client.send(command);
      if (!response.Body) return [];

      const chunks: Uint8Array[] = [];
      for await (const chunk of response.Body as Readable) {
        chunks.push(chunk);
      }

      return Buffer.concat(chunks)
        .toString('utf-8')
        .split(/\r?\n/)
        .map(l => l.trim())
        .filter(Boolean);

    } catch (e: any) {
      console.error('R2 프록시 로드 실패:', e.message);
      return [];
    }
  }

  // 한국 프록시 (1개 세타이어 테스트용)
  async loadProxies1(): Promise<string[]> {
    try {
      const command = new GetObjectCommand({
        Bucket: process.env.R2_BUCKET_PROXY || 'proxy',
        Key: 'smartproxy1.txt',
      });

      const response = await this.client.send(command);
      if (!response.Body) return [];

      const chunks: Uint8Array[] = [];
      for await (const chunk of response.Body as Readable) {
        chunks.push(chunk);
      }

      return Buffer.concat(chunks)
        .toString('utf-8')
        .split(/\r?\n/)
        .map(l => l.trim())
        .filter(Boolean);

    } catch (e: any) {
      console.error('R2 프록시 로드 실패:', e.message);
      return [];
    }
  }


  // 네덜란드 프록시 (2번)
  async loadProxies2(): Promise<string[]> {
    try {
      const command = new GetObjectCommand({
        Bucket: process.env.R2_BUCKET_PROXY || 'proxy',
        Key: 'smartproxy2.txt',
      });

      const response = await this.client.send(command);
      if (!response.Body) return [];

      const chunks: Uint8Array[] = [];
      for await (const chunk of response.Body as Readable) {
        chunks.push(chunk);
      }

      return Buffer.concat(chunks)
        .toString('utf-8')
        .split(/\r?\n/)
        .map(l => l.trim())
        .filter(Boolean);

    } catch (e: any) {
      console.error('R2 프록시 로드 실패:', e.message);
      return [];
    }
  }

  // 프랑스 프록시 (3번)
  async loadProxies3(): Promise<string[]> {
    try {
      const command = new GetObjectCommand({
        Bucket: process.env.R2_BUCKET_PROXY || 'proxy',
        Key: 'smartproxy3.txt',
      });

      const response = await this.client.send(command);
      if (!response.Body) return [];

      const chunks: Uint8Array[] = [];
      for await (const chunk of response.Body as Readable) {
        chunks.push(chunk);
      }

      return Buffer.concat(chunks)
        .toString('utf-8')
        .split(/\r?\n/)
        .map(l => l.trim())
        .filter(Boolean);

    } catch (e: any) {
      console.error('R2 프록시 로드 실패:', e.message);
      return [];
    }
  }

  // 독일 프록시 (4번)
  async loadProxies4(): Promise<string[]> {
    try {
      const command = new GetObjectCommand({
        Bucket: process.env.R2_BUCKET_PROXY || 'proxy',
        Key: 'smartproxy4.txt',
      });

      const response = await this.client.send(command);
      if (!response.Body) return [];

      const chunks: Uint8Array[] = [];
      for await (const chunk of response.Body as Readable) {
        chunks.push(chunk);
      }

      return Buffer.concat(chunks)
        .toString('utf-8')
        .split(/\r?\n/)
        .map(l => l.trim())
        .filter(Boolean);

    } catch (e: any) {
      console.error('R2 프록시 로드 실패:', e.message);
      return [];
    }
  }

  // BrightData KR
async loadBrightProxies1(): Promise<string[]> {
  try {
    const command = new GetObjectCommand({
      Bucket: process.env.R2_BUCKET_PROXY || 'proxy',
      Key: 'brightproxy1.txt',
    });

    const response = await this.client.send(command);
    if (!response.Body) return [];

    const chunks: Uint8Array[] = [];
    for await (const chunk of response.Body as Readable) {
      chunks.push(chunk);
    }

    return Buffer.concat(chunks)
      .toString('utf-8')
      .split(/\r?\n/)
      .map(l => l.trim())
      .filter(Boolean);

  } catch (e: any) {
    console.error('BrightData KR 프록시 로드 실패:', e.message);
    return [];
  }
}

// BrightData FR
async loadBrightProxies2(): Promise<string[]> {
  try {
    const command = new GetObjectCommand({
      Bucket: process.env.R2_BUCKET_PROXY || 'proxy',
      Key: 'brightproxy2.txt',
    });

    const response = await this.client.send(command);
    if (!response.Body) return [];

    const chunks: Uint8Array[] = [];
    for await (const chunk of response.Body as Readable) {
      chunks.push(chunk);
    }

    return Buffer.concat(chunks)
      .toString('utf-8')
      .split(/\r?\n/)
      .map(l => l.trim())
      .filter(Boolean);

  } catch (e: any) {
    console.error('BrightData FR 프록시 로드 실패:', e.message);
    return [];
  }
}


  async saveProductEntity(product: Product): Promise<void> {
    await this.productRepo.save(product);
  }

  createContent = (
    product: Product,
    mainImageUrl: string,
    additionalImageUrls: string[],
    footerImageUrl?: string[], // 🔥 추가 (없어도 OK)
  ) => {

    const escapeAttr = (v: string) =>
      v.replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

    // 🔥 타이틀 처리
    let productTitle = '';

    if (['Farfetch', 'Cettire'].includes(product.site)) {
      productTitle = `${product.designer} ${product.title} ${product.brandstyleId || ''}`.trim();

    } else {

      if (product.site === 'Dior') {
        productTitle = product.title.includes(product.designer)
          ? `${product.title} ${product.styleId}`
          : `${product.designer} ${product.title} ${product.styleId}`;

      } else {
        const color = product.color?.trim() ? product.color : '';

        productTitle = [
          product.designer,
          product.title,
          color,
          product.styleId,
        ].filter(Boolean).join(' ');

        if (product.title.includes(product.designer)) {
          productTitle = [
            product.title,
            color,
            product.styleId,
          ].filter(Boolean).join(' ');
        }
      }
    }

    // 🔥 altText (기존 유지)
    const altText = escapeAttr(productTitle);

    let contentHTML = '<div style="text-align:center">';

    // 대표 이미지
    contentHTML += `<br/><img src="${mainImageUrl}" alt="${altText}" style="width: 100%;max-width:1000px;"/><br/><br/><br/>`;

    // 브랜드명 / 타이틀
    contentHTML += `<div style="font-size: 20px; font-weight: bold;">${product.designer}</div>`;
    contentHTML += `<div style="font-size: 20px;">${productTitle}</div><br/>`;

    // 상세 설명
    let filteredMainInfo = product.mainInfo.replace(/상품\s*번호\s*:\s*[\w\d]+/g, '');

    contentHTML += `<div style="font-size: 20px;">${filteredMainInfo.split(',').join('<br/>')}</div><br/><br/><br/><br/>`;

    // 추가 이미지
    additionalImageUrls.forEach((image) => {
      contentHTML += `<img src="${image}" alt="${altText}" style="width: 100%;max-width:1000px;"/><br/>`;
    });

    // 🔥 하단 이미지 (있을 때만)
    if (footerImageUrl) {
      contentHTML += `<img src="${footerImageUrl}" />`;
    }

    contentHTML += `</div>`;

    return contentHTML.replace(//g, '');
  };
  





  async uploadImageToR2(fileName: string,buffer: Buffer,product: Product): Promise<string> {

    const env = {
      bucketName: process.env.R2_BUCKET_IMAGE,
    };

    const newFileName = product.customId
      ? `${product.customId}/${product.accountPlatform}/${product.site}/${fileName}`
      : `default/${product.site}/${fileName}`;

    const uploadParams = {
      Bucket: env.bucketName,
      Key: newFileName,
      Body: buffer,
      ContentType: 'image/jpeg',
    };

    await this.client.send(new PutObjectCommand(uploadParams));

    return `https://pub-8ff6e4103194470d938f8ff9a66e84a2.r2.dev/${newFileName}`;
  }



  // 서비스 타입에 따른 처리 분기 함수
  async uploadXmlToR2ByService(
    fileName: string,
    product: Product,
    mainImageUrl: string,
    additionalImageUrls: string[],
    partnerKey: string,
    apiKey: string,
  ): Promise<string> {
    const site = product.site;

    if (site === 'Farfetch') return this.uploadXmlToR2Farfetch(fileName, product, mainImageUrl, additionalImageUrls, partnerKey, apiKey);
    // else if (site === 'mytheresa') return this.uploadXmlToR2Mytheresa(fileName, product, godoMallCategoryCode, mainImageUrl, additionalImageUrls, partnerKey, apiKey);
    else if (site === 'Cettire') return this.uploadXmlToR2Cettire(fileName, product, mainImageUrl, additionalImageUrls, partnerKey, apiKey);
    else console.warn(`지원하지 않는 site: ${site}`);
  }

//   async uploadXmlToR2Mytheresa(
//     fileName: string,
//     product: Product,
//     godoMallCategoryCode: string, // string으로 변경
//     mainImageUrl: string,
//     additionalImageUrls: string[],
//     partnerKey: string,
//     apiKey: string,
//   ): Promise<string> {
//     const env = {
//       bucketName: process.env.R2_BUCKET_NEWNAME,
//     };
//     try {

//     // 상품의 fta 여부 확인
//     const hasFta = product.fta === 'FTA';

    
//     // 상품의 touched 여부를 여기서 직접 참조
//     const isTouched = product.touched;

//     // 상품 업데이트 시에는 goodsno가 반드시 포함되어야 함
//     const goodsno = product.goodsno;


//     // 상품 등록 로직
//     const modifiedTitle = await this.wordReplacementService.applyReplacements(product.title,product.customId);
//     product.title = modifiedTitle;

  
//     // 상품 카테고리 이름에 따른 가격 계산
// let price = product.price * 1500;  // 기본적으로 1500을 곱한 값으로 시작

// if (product.categoryName.includes('가방')) {
//     if (price >= 2000000) {  // 200만 원 이상의 가방 상품에 대해 추가 금액 계산
//         const additionalAmount = (price - 2000000) * 0.2 * 1.3;  // 추가 금액 계산
//         price += additionalAmount;  // 기존 가격에 추가 금액 더하기

//         if (hasFta) {
//             price *= 1.1;  // FTA가 있는 경우
//         } else {
//             price *= 1.08 * 1.1;  // FTA가 없는 경우
//         }
//       } else {
//           // 기존 가방 마진 계산식
//           price *= hasFta ? 1.1 : 1.08 * 1.1;
//       }
//     } else if (product.categoryName.includes('의류')) {
//         price *= hasFta ? 1.1 : 1.13 * 1.1;
//     } else if (product.categoryName.includes('신발')) {
//         price *= hasFta ? 1.1 : 1.13 * 1.1;
//     } else if (product.categoryName.includes('액세서리')) {
//         price *= hasFta ? 1.1 : 1.08 * 1.1;
//     } else if (product.categoryName.includes('주얼리')) {
//         price *= hasFta ? 1.1 : 1.08 * 1.1;
//     }


//     // 저장된 마진 정보 가져오기
//     const allMargins = await this.marginService.getAllMargins();

//     // 상품의 사이트와 일치하는 마진만 필터링
//     const applicableMargins = allMargins.filter(margin => margin.site === product.site);

//     // 상품 가격에 맞는 첫 번째 마진 조건만 적용
//     for (const margin of applicableMargins) {
//       if (price >= margin.minAmount && price <= margin.maxAmount) {
//         // 마진값 계산
//         const marginAmount = price * (margin.marginValue / 100);

//         // 상품 가격 + 마진값 + 최소마진 (방식 1 적용)
//         price += marginAmount;
//         price += margin.minMargin;

//         // 첫 번째로 맞는 마진을 적용했으므로 종료
//         break;
//       }
//     }



//     const goodsDescription = this.createContent(product, mainImageUrl, additionalImageUrls, partnerKey, apiKey);


//     const optionData = product.size.split(',').map((option, index) => ({
//       optionNo: index + 1,
//       optionValue1: `${option.trim()}`, // 사이즈 값
//       optionPrice: '0', // 가격 차이는 없다고 가정
//       optionViewFl: 'y', // 옵션 보이기 여부
//       optionSellFl: 'y', // 옵션 판매 여부
//       stockCnt: 100, // 재고 수량 (예시로 100)
//     }));
      


//     // Product 및 CategoryMapping 데이터를 기반으로 XML 데이터 생성
//     const xmlData = `<?xml version="1.0" encoding="utf-8"?>
//     <data>
//       <goods_data>
//         ${product.goodsno ? `<goodsNo>${product.goodsno}</goodsNo>` : ''}  <!-- 상품 수정 시 goodsno 포함 -->
//         <goodsNmFl>d</goodsNmFl>
//         <goodsNm>${product.title
//           .replace(/&/g, '&amp;') // & -> &amp;
//           .replace(/</g, '&lt;') // < -> &lt;
//           .replace(/>/g, '&gt;') // > -> &gt;
//           .replace(/"/g, '&quot;') // " -> &quot;
//           .replace(/'/g, '&apos;')} ${product instanceof Product ? ' ' + product.styleId : ''}</goodsNm>
//         <goodsSearchWord>${product.title.split(' ').join(',')}</goodsSearchWord>
//         <goodsPrice>${price}</goodsPrice>
//         <goodsCd>${product.styleId}</goodsCd>
//         <makerNm>${product.designer}</makerNm>
//         <goodsModelNo>${product.styleId}</goodsModelNo>
//         <magnifyImageData idx="1"><![CDATA[${product.mainImageUrl}]]></magnifyImageData> <!-- 대표 이미지 -->
//         ${product.additionalImageUrls.map((url,index) => `
//           <magnifyImageData idx="${index + 2}"><![CDATA[${url}]]></magnifyImageData>
//         `).join('')}
//         <detailImageData idx="1"><![CDATA[${product.mainImageUrl}]]></detailImageData> <!-- 대표 이미지 -->
//         ${product.additionalImageUrls.map((url,index) => `
//           <detailImageData idx="${index + 2}"><![CDATA[${url}]]></detailImageData>
//         `).join('')}
//         <listImageData idx="1"><![CDATA[${product.mainImageUrl}]]></listImageData> <!-- 대표 이미지 -->
//         <mainImageData idx="1"><![CDATA[${product.mainImageUrl}]]></mainImageData> <!-- 대표 이미지 -->
//         <goodsDescription>
//         <![CDATA[${goodsDescription}]]>
//         </goodsDescription>
//         <scmNo>1</scmNo>
//         <cateCd>${product.godoMallCategoryCode}</cateCd>
//         <naverImportFlag>f</naverImportFlag>
//         <naverProductFlag>b</naverProductFlag>
//         <naverAgeGroup>a</naverAgeGroup>
//         <naverTag>${product.title.split(' ').join('|')}</naverTag>
//         <naverNpayAble>all</naverNpayAble>
//         <goodsState>n</goodsState>
//         <goodsPermission>all</goodsPermission>
//         <taxFreeFl>t</taxFreeFl>
//         <stockFl>n</stockFl>
//         <imageStorage>url</imageStorage>
//         <restockFl>y</restockFl>
//         <mileageFl>c</mileageFl>
//         <goodsDiscountFl>n</goodsDiscountFl>
//         <payLimitFl>n</payLimitFl>
//         <optionFl>y</optionFl>
//         <optionDisplayFl>s</optionDisplayFl>
//         <optionName>사이즈</optionName>
//         <addGoodsFl>n</addGoodsFl>
//         <optionTextFl>n</optionTextFl>
//         <addGoodsFl>n</addGoodsFl>
//         <deliverySno>2</deliverySno>
//         <relationFl>a</relationFl>
//         <imgDetailViewFl>y</imgDetailViewFl>
//         <externalVideoFl>n</externalVideoFl>
//         <detailInfoDelivery>002001</detailInfoDelivery>
//         <detailInfoAS>003001</detailInfoAS>
//         <detailInfoRefund>004001</detailInfoRefund>
//         <detailInfoExchange>005001</detailInfoExchange>
//         <allCateCd>${product.godoMallCategoryCode}</allCateCd>
//         ${optionData.map((option, index) => `
//           <optionData idx="${index + 1}">
//             <optionNo>${option.optionNo}</optionNo>
//             <optionValue1><![CDATA[${option.optionValue1}]]></optionValue1>
//             <optionPrice><![CDATA[${option.optionPrice}]]></optionPrice>
//             <optionViewFl>${option.optionViewFl}</optionViewFl>
//             <optionSellFl>${option.optionSellFl}</optionSellFl>
//             <stockCnt>${option.stockCnt}</stockCnt>
//           </optionData>
//         `).join('')}
//         <goodsDisplayFl>${isTouched ? 'y' : 'n'}</goodsDisplayFl> 
//         <goodsDisplayMobileFl>${isTouched ? 'y' : 'n'}</goodsDisplayMobileFl> 
//         <goodsSellFl>${isTouched ? 'y' : 'n'}</goodsSellFl> 
//         <goodsSellMobileFl>${isTouched ? 'y' : 'n'}</goodsSellMobileFl>
//         <soldOutFl>${isTouched ? 'n' : 'y'}</soldOutFl>
//         <daumFl>${isTouched ? 'y' : 'n'}</daumFl> 
//         <naverFl>${isTouched ? 'y' : 'n'}</naverFl>
//         ${goodsno ? `<imageUpdate>N</imageUpdate>` : ''} <!-- goodsno가 있으면 imageUpdate 추가 -->
//       </goods_data>
//     </data>`;

//     //console.log('xmlData:', xmlData);

//     const uploadParams = {
//         Bucket: env.bucketName,
//         Key: fileName, // 저장할 파일 이름
//         Body: xmlData,
//         ContentType: 'application/xml',
//     };
//     //console.log('fileName:', fileName);

//     // Cloudflare R2에 XML 파일 업로드
//     await this.client.send(new PutObjectCommand(uploadParams));

//     return `https://pub-54943b138956492b8c1f369abbddfafd.r2.dev/${fileName}`;
//   } catch (error: any) {
//     console.error(`Error uploading XML for product ${product.title}: ${error.message}`);
//     return null; // 오류 발생 시 null을 반환하여 건너뛰도록 설정
//   }
// }

async uploadXmlToR2Farfetch(
  fileName: string,
  product: Product,
  mainImageUrl: string,
  additionalImageUrls: string[],
  partnerKey: string,
  apiKey: string,
): Promise<string> {
  
  try {

 
  // 상품의 touched 여부를 여기서 직접 참조
  const isTouched = product.touched;

  // 상품 업데이트 시에는 goodsno가 반드시 포함되어야 함
  const goodsno = product.goodsno;

 
  // 상품명 치환 로직
  const modifiedTitle = await this.wordReplacementService.applyReplacements(product.title,product.customId);
  const modifiedDesigner = await this.wordReplacementService.applyReplacements(product.designer,product.customId);

  product.designer = modifiedDesigner;
  product.title = modifiedTitle;

  if (!goodsno) {
    let productTitle = `${product.designer || ''} ${product.title || ''} ${product.brandstyleId || ''}`
    .replace(/[\*?"<>]/g, '')
    .replace(/'/g, '&apos;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/&/g, '&amp;')

    // 🔥 중복 정리 (designer / brandstyleId 중복 제거)
    const parts = productTitle.split(/\s+/).filter(Boolean);

    let designerUsed = false;
    let styleUsed = false;

    const cleaned: string[] = [];

    for (const part of parts) {

      // 🔥 designer 중복 제거
      if (part === product.designer) {
        if (designerUsed) continue;
        designerUsed = true;
        cleaned.push(part);
        continue;
      }

      // 🔥 brandstyleId 중복 제거 (숫자/문자/혼합 다 대응)
      if (part === product.brandstyleId) {
        if (styleUsed) continue;
        styleUsed = true;
        cleaned.push(part);
        continue;
      }

      // 일반 단어는 그대로
      cleaned.push(part);
    }

    productTitle = cleaned.join(' ');

    product.title = productTitle; // 🔥 최종 저장
  }

  


  let price = product.price;
  let fixedPrice = product.fixedPrice ?? null;

  // 🔥 customId 기준으로 마진 가져오기
  const allMargins = await this.marginService.getAllMargins(
    product.customId,
    product.accountPlatform
  );

  // 🔥 사이트별 환율 적용 여부
  const noExchangeSites = ['Farfetch', 'Cettire'];

  // 🔥 환율 가져오기 (마진에 같이 들어있음)
  let exchangeRate = 1;

  // 👉 Farfetch / Cettire 아니면 환율 적용
  if (!noExchangeSites.includes(product.site)) {
    const exchangeMargin = allMargins.find(m => m.exchangeRate && m.exchangeRate > 0);
    if (exchangeMargin) {
      exchangeRate = exchangeMargin.exchangeRate;
    }
  }

  // 🔥 환율 적용
  price = price * exchangeRate;

  if (typeof fixedPrice === 'number' && !isNaN(fixedPrice)) {
    fixedPrice = fixedPrice * exchangeRate;
  }

  // 🔥 사이트별 마진 필터링
  const applicableMargins = allMargins.filter(m => m.site === product.site);

  // 🔥 마진 적용
  for (const margin of applicableMargins) {
    if (price >= margin.minAmount && price <= margin.maxAmount) {

      const marginAmount = price * (margin.marginValue / 100);
      price += marginAmount;
      price += margin.minMargin;

      if (typeof fixedPrice === 'number' && !isNaN(fixedPrice) && fixedPrice > 0) {
        const fixedMarginAmount = fixedPrice * (margin.marginValue / 100);
        fixedPrice += fixedMarginAmount;
        fixedPrice += margin.minMargin;
      } else {
        fixedPrice = 0;
      }

      break;
    }
  }


  const account = await this.hostingRepo.findOne({
    where: {
      partnerKey,
      apiKey,
    }
  });
  const marketplacePolicy = this.getMarketplacePolicy(account);

  const goodsDescription = this.createContent(product, mainImageUrl, additionalImageUrls, account?.bottomImages );


  const sizeValues = product.size.split(',').map(size => size.trim());
  const addOptionPrices = product.addoptionprice.split(',').map(price => price.trim());

  const optionData = sizeValues.map((option, index) => ({
      optionNo: index + 1,
      optionValue1: option, // 사이즈 값
      optionPrice: addOptionPrices[index] || '0', // 추가 가격이 없으면 0으로 설정
      optionViewFl: 'y', // 옵션 보이기 여부
      optionSellFl: 'y', // 옵션 판매 여부
      stockCnt: 100, // 재고 수량 (예시로 100)
  }));


  // Product 및 CategoryMapping 데이터를 기반으로 XML 데이터 생성
  const xmlData = `<?xml version="1.0" encoding="utf-8"?>
  <data>
    <goods_data>
      ${product.goodsno ? `<goodsNo>${product.goodsno}</goodsNo>` : ''}  <!-- 상품 수정 시 goodsno 포함 -->
      <goodsNmFl>d</goodsNmFl>
      <goodsNm>${product.title}</goodsNm>
      <goodsSearchWord>${product.title.split(' ').join(',')}</goodsSearchWord>
      <goodsPrice>${price}</goodsPrice>
      <fixedPrice>${fixedPrice ?? 0}</fixedPrice> <!-- ✅ 항상 포함 -->
      <goodsCd>Farfetch_${product.styleId}</goodsCd>
      <makerNm>${product.designer}</makerNm>
      <goodsModelNo>${product.brandstyleId}</goodsModelNo>
      <magnifyImageData idx="1"><![CDATA[${product.mainImageUrl}]]></magnifyImageData> <!-- 대표 이미지 -->
      ${product.additionalImageUrls.map((url,index) => `
        <magnifyImageData idx="${index + 2}"><![CDATA[${url}]]></magnifyImageData>
      `).join('')}
      <detailImageData idx="1"><![CDATA[${product.mainImageUrl}]]></detailImageData> <!-- 대표 이미지 -->
      ${product.additionalImageUrls.map((url,index) => `
        <detailImageData idx="${index + 2}"><![CDATA[${url}]]></detailImageData>
      `).join('')}
      <listImageData idx="1"><![CDATA[${product.mainImageUrl}]]></listImageData> <!-- 대표 이미지 -->
      <mainImageData idx="1"><![CDATA[${product.mainImageUrl}]]></mainImageData> <!-- 대표 이미지 -->
      <goodsDescription>
      <![CDATA[${goodsDescription}]]>
      </goodsDescription>
      <scmNo>1</scmNo>
      <cateCd>${product.godoMallCategoryCode}</cateCd>
      <naverImportFlag>f</naverImportFlag>
      <naverProductFlag>b</naverProductFlag>
      <naverAgeGroup>a</naverAgeGroup>
      <naverTag>${`${product.title}`.split(' ').join('|')}</naverTag>
      <naverNpayAble>all</naverNpayAble>
      <goodsState>n</goodsState>
      <goodsPermission>all</goodsPermission>
      <taxFreeFl>t</taxFreeFl>
      <stockFl>n</stockFl>
      <imageStorage>url</imageStorage>
      <restockFl>y</restockFl>
      <mileageFl>c</mileageFl>
      <goodsDiscountFl>n</goodsDiscountFl>
      <payLimitFl>n</payLimitFl>
      <optionFl>y</optionFl>
      <optionDisplayFl>s</optionDisplayFl>
      <optionName>사이즈</optionName>
      <addGoodsFl>n</addGoodsFl>
      <optionTextFl>n</optionTextFl>
      <addGoodsFl>n</addGoodsFl>
      <deliverySno>${marketplacePolicy.godomall.deliverySno}</deliverySno>
      <relationFl>a</relationFl>
      <imgDetailViewFl>y</imgDetailViewFl>
      <externalVideoFl>n</externalVideoFl>
      <detailInfoDelivery>${marketplacePolicy.godomall.detailInfoDeliveryCode}</detailInfoDelivery>
      <detailInfoAS>${marketplacePolicy.godomall.detailInfoAsCode}</detailInfoAS>
      <detailInfoRefund>${marketplacePolicy.godomall.detailInfoRefundCode}</detailInfoRefund>
      <detailInfoExchange>${marketplacePolicy.godomall.detailInfoExchangeCode}</detailInfoExchange>
      <allCateCd>${product.godoMallCategoryCode}</allCateCd>
      ${optionData.map((option, index) => `
        <optionData idx="${index + 1}">
          <optionNo>${option.optionNo}</optionNo>
          <optionValue1><![CDATA[${option.optionValue1}]]></optionValue1>
          <optionPrice><![CDATA[${option.optionPrice}]]></optionPrice>
          <optionViewFl>${option.optionViewFl}</optionViewFl>
          <optionSellFl>${option.optionSellFl}</optionSellFl>
          <stockCnt>${option.stockCnt}</stockCnt>
        </optionData>
      `).join('')}
      <goodsDisplayFl>${isTouched ? 'y' : 'n'}</goodsDisplayFl> 
      <goodsDisplayMobileFl>${isTouched ? 'y' : 'n'}</goodsDisplayMobileFl> 
      <goodsSellFl>${isTouched ? 'y' : 'n'}</goodsSellFl> 
      <goodsSellMobileFl>${isTouched ? 'y' : 'n'}</goodsSellMobileFl>
      <soldOutFl>${isTouched ? 'n' : 'y'}</soldOutFl>
      <daumFl>${isTouched ? 'y' : 'n'}</daumFl> 
      <naverFl>${isTouched ? 'y' : 'n'}</naverFl>
      ${goodsno ? `<imageUpdate>N</imageUpdate>` : ''} <!-- goodsno가 있으면 imageUpdate 추가 -->
    </goods_data>
  </data>`;

  //console.log('xmlData:', xmlData);

  const env = {
    bucketName: process.env.R2_BUCKET_NEWNAME,
  };

  const userId =
  product.customId && product.accountPlatform
    ? `${product.customId}/${product.accountPlatform}`
    : 'default';
  const newFileName = `${userId}/${product.accountPlatform}/${product.site}/${fileName}`;

  const uploadParams = {
    Bucket: env.bucketName,
    Key: newFileName,
    Body: xmlData,
    ContentType: 'application/xml',
  };
  //console.log('fileName:', fileName);

  // Cloudflare R2에 XML 파일 업로드
  await this.client.send(new PutObjectCommand(uploadParams));

  product.title = product.title;
  product.designer = product.designer
  product.mainInfo = goodsDescription;
  product.price = price;
  product.fixedPrice = fixedPrice;
  await this.productRepo.save(product);

  return `https://pub-54943b138956492b8c1f369abbddfafd.r2.dev/${newFileName}`;
} catch (error: any) {
  console.error(`Error uploading XML for product ${product.title}: ${error.message}`);
  return null; // 오류 발생 시 null을 반환하여 건너뛰도록 설정
}
}

async uploadXmlToR2Cettire(
  fileName: string,
  product: Product,
  mainImageUrl: string,
  additionalImageUrls: string[],
  partnerKey: string,
  apiKey: string,
): Promise<string> {

  try {

  // 상품의 touched 여부를 여기서 직접 참조
  const isTouched = product.touched;

  // 상품 업데이트 시에는 goodsno가 반드시 포함되어야 함
  const goodsno = product.goodsno;


  // 상품명 치환 로직
  const modifiedTitle = await this.wordReplacementService.applyReplacements(product.title,product.customId);
  const modifiedDesigner = await this.wordReplacementService.applyReplacements(product.designer,product.customId);

  product.designer = modifiedDesigner;
  product.title = modifiedTitle;

  // 🔥 조합은 신규만
  if (!goodsno) {

    let productTitle = `${product.title || ''} ${product.brandstyleId || ''} ${product.color || ''}`
      .replace(/[\*?"<>]/g, '')
      .replace(/'/g, '&apos;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/&/g, '&amp;');

    const parts = productTitle.split(/\s+/).filter(Boolean);

    let styleUsed = false;
    let colorUsed = false;

    const cleaned: string[] = [];

    for (const part of parts) {

      if (part === product.brandstyleId) {
        if (styleUsed) continue;
        styleUsed = true;
        cleaned.push(part);
        continue;
      }

      if (part === product.color) {
        if (colorUsed) continue;
        colorUsed = true;
        cleaned.push(part);
        continue;
      }

      cleaned.push(part);
    }

    product.title = cleaned.join(' '); // 🔥 여기 핵심
  }


  let originalPrice = product.price;
  let price = originalPrice;

  // 🔥 customId 기준 마진 가져오기
  const allMargins = await this.marginService.getAllMargins(
    product.customId,
    product.accountPlatform
  );

  // 🔥 Cettire는 환율 적용 ❌ (그대로 사용)

  // ✅ 30만원 미만이면 3만원 추가
  if (originalPrice < 300000) {
    price += 30000;
  }

  // 🔥 사이트별 마진 필터링
  const applicableMargins = allMargins.filter(m => m.site === product.site);

  // 🔥 마진 적용
  for (const margin of applicableMargins) {
    if (price >= margin.minAmount && price <= margin.maxAmount) {

      const marginAmount = price * (margin.marginValue / 100);

      price += marginAmount;
      price += margin.minMargin;

      break;
    }
  }

  // ✅ 국가 리스트
  const countryList = [
    '오스트리아','Austria','벨기에','Belgium','프랑스','France','독일','Germany',
    '이탈리아','Italy','Italia','스페인','Spain','네덜란드','Netherlands','Holland',
    '포르투갈','Portugal','아일랜드','Ireland','룩셈부르크','Luxembourg',
    '덴마크','Denmark','스웨덴','Sweden','핀란드','Finland',
    '체코','Czech Republic','Czechia','헝가리','Hungary','폴란드','Poland',
    '슬로바키아','Slovakia','슬로베니아','Slovenia','루마니아','Romania',
    '불가리아','Bulgaria','크로아티아','Croatia',
    '에스토니아','Estonia','라트비아','Latvia','리투아니아','Lithuania',
    '몰타','Malta','키프로스','Cyprus',
  ];

  // 🔥 국가 포함 여부
  const lowerMainInfo = product.mainInfo.toLowerCase();

  const containsCountry = countryList.some(country =>
    lowerMainInfo.includes(country.toLowerCase())
  );

  // 🔥 국가 없으면 13% 추가
  if (!containsCountry) {
    price += price * 0.13;
  }

  // 🔥 10원 단위 올림
  price = Math.ceil(price / 10) * 10;


  const account = await this.hostingRepo.findOne({
    where: {
      partnerKey,
      apiKey,
    }
  });
  const marketplacePolicy = this.getMarketplacePolicy(account);

  const goodsDescription = this.createContent(product, mainImageUrl, additionalImageUrls, account?.bottomImages );


  const sizeValues = product.size.split(',').map(size => size.trim());
  const addOptionPrices = product.addoptionprice.split(',').map(price => price.trim());

  const optionData = sizeValues.map((option, index) => ({
      optionNo: index + 1,
      optionValue1: option, // 사이즈 값
      optionPrice: addOptionPrices[index] || '0', // 추가 가격이 없으면 0으로 설정
      optionViewFl: 'y', // 옵션 보이기 여부
      optionSellFl: 'y', // 옵션 판매 여부
      stockCnt: 100, // 재고 수량 (예시로 100)
  }));
    


  // Product 및 CategoryMapping 데이터를 기반으로 XML 데이터 생성
  const xmlData = `<?xml version="1.0" encoding="utf-8"?>
  <data>
    <goods_data>
      ${product.goodsno ? `<goodsNo>${product.goodsno}</goodsNo>` : ''}  <!-- 상품 수정 시 goodsno 포함 -->
      <goodsNmFl>d</goodsNmFl>
      <goodsNm>${product.title}</goodsNm>
      <goodsSearchWord>${product.title.split(' ').join(',')}</goodsSearchWord>
      <goodsPrice>${price.toFixed(0)}</goodsPrice> <!-- 💰 최종 가격 반영 -->
      <goodsCd>Cettire_${product.styleId}</goodsCd>
      <makerNm>${product.designer}</makerNm>
      <goodsModelNo>${product.brandstyleId}</goodsModelNo>
      <magnifyImageData idx="1"><![CDATA[${product.mainImageUrl}]]></magnifyImageData> <!-- 대표 이미지 -->
      ${product.additionalImageUrls.map((url,index) => `
        <magnifyImageData idx="${index + 2}"><![CDATA[${url}]]></magnifyImageData>
      `).join('')}
      <detailImageData idx="1"><![CDATA[${product.mainImageUrl}]]></detailImageData> <!-- 대표 이미지 -->
      ${product.additionalImageUrls.map((url,index) => `
        <detailImageData idx="${index + 2}"><![CDATA[${url}]]></detailImageData>
      `).join('')}
      <listImageData idx="1"><![CDATA[${product.mainImageUrl}]]></listImageData> <!-- 대표 이미지 -->
      <mainImageData idx="1"><![CDATA[${product.mainImageUrl}]]></mainImageData> <!-- 대표 이미지 -->
      <goodsDescription>
      <![CDATA[${goodsDescription}]]>
      </goodsDescription>
      <scmNo>1</scmNo>
      <cateCd>${product.godoMallCategoryCode}</cateCd>
      <naverImportFlag>f</naverImportFlag>
      <naverProductFlag>b</naverProductFlag>
      <naverAgeGroup>a</naverAgeGroup>
      <naverTag>${`${product.designer} ${product.title} ${product.brandstyleId}`.split(' ').join('|')}</naverTag>
      <naverNpayAble>all</naverNpayAble>
      <goodsState>n</goodsState>
      <goodsPermission>all</goodsPermission>
      <taxFreeFl>t</taxFreeFl>
      <stockFl>n</stockFl>
      <imageStorage>url</imageStorage>
      <restockFl>y</restockFl>
      <mileageFl>c</mileageFl>
      <goodsDiscountFl>n</goodsDiscountFl>
      <payLimitFl>n</payLimitFl>
      <optionFl>y</optionFl>
      <optionDisplayFl>s</optionDisplayFl>
      <optionName>사이즈</optionName>
      <addGoodsFl>n</addGoodsFl>
      <optionTextFl>n</optionTextFl>
      <addGoodsFl>n</addGoodsFl>
      <deliverySno>${marketplacePolicy.godomall.deliverySno}</deliverySno>
      <relationFl>a</relationFl>
      <imgDetailViewFl>y</imgDetailViewFl>
      <externalVideoFl>n</externalVideoFl>
      <detailInfoDelivery>${marketplacePolicy.godomall.detailInfoDeliveryCode}</detailInfoDelivery>
      <detailInfoAS>${marketplacePolicy.godomall.detailInfoAsCode}</detailInfoAS>
      <detailInfoRefund>${marketplacePolicy.godomall.detailInfoRefundCode}</detailInfoRefund>
      <detailInfoExchange>${marketplacePolicy.godomall.detailInfoExchangeCode}</detailInfoExchange>
      <allCateCd>${product.godoMallCategoryCode}</allCateCd>
      ${optionData.map((option, index) => `
        <optionData idx="${index + 1}">
          <optionNo>${option.optionNo}</optionNo>
          <optionValue1><![CDATA[${option.optionValue1}]]></optionValue1>
          <optionPrice><![CDATA[${option.optionPrice}]]></optionPrice>
          <optionViewFl>${option.optionViewFl}</optionViewFl>
          <optionSellFl>${option.optionSellFl}</optionSellFl>
          <stockCnt>${option.stockCnt}</stockCnt>
        </optionData>
      `).join('')}
      <goodsDisplayFl>${isTouched ? 'y' : 'n'}</goodsDisplayFl> 
      <goodsDisplayMobileFl>${isTouched ? 'y' : 'n'}</goodsDisplayMobileFl> 
      <goodsSellFl>${isTouched ? 'y' : 'n'}</goodsSellFl> 
      <goodsSellMobileFl>${isTouched ? 'y' : 'n'}</goodsSellMobileFl>
      <soldOutFl>${isTouched ? 'n' : 'y'}</soldOutFl>
      <daumFl>${isTouched ? 'y' : 'n'}</daumFl> 
      <naverFl>${isTouched ? 'y' : 'n'}</naverFl>
      ${goodsno ? `<imageUpdate>N</imageUpdate>` : ''} <!-- goodsno가 있으면 imageUpdate 추가 -->
    </goods_data>
  </data>`;

  //console.log('xmlData:', xmlData);

  const env = {
    bucketName: process.env.R2_BUCKET_NEWNAME,
  };

  const userId =
  product.customId && product.accountPlatform
    ? `${product.customId}/${product.accountPlatform}`
    : 'default';
  const newFileName = `${userId}/${product.accountPlatform}/${product.site}/${fileName}`;

  const uploadParams = {
    Bucket: env.bucketName,
    Key: newFileName,
    Body: xmlData,
    ContentType: 'application/xml',
  };
  //console.log('fileName:', fileName);

  // Cloudflare R2에 XML 파일 업로드
  await this.client.send(new PutObjectCommand(uploadParams));
  product.title = product.title;
  product.designer = product.designer;
  product.mainInfo = goodsDescription;
  product.price = price;
  await this.productRepo.save(product);

  return `https://pub-54943b138956492b8c1f369abbddfafd.r2.dev/${newFileName}`;
} catch (error: any) {
  console.error(`Error uploading XML for product ${product.title}: ${error.message}`);
  return null; // 오류 발생 시 null을 반환하여 건너뛰도록 설정
}
}





  // XML 파일 업로드 (Product 데이터를 받아 XML을 동적으로 생성)
  async uploadXmlToR2(
    fileName: string,
    product: Product,
    mainImageUrl: string,
    additionalImageUrls: string[],
    partnerKey: string,
    apiKey: string,
  ): Promise<string> {
    
    // 상품의 touched 여부를 여기서 직접 참조
    const isTouched = product.touched;

    // 상품 업데이트 시에는 goodsno가 반드시 포함되어야 함
    const goodsno = product.goodsno;

    const getSiteCode = (product: any): string => {
      if (!product.site) return 'unknown';

      const site = product.site.toLowerCase();

      // 플랫폼 (예외)
      if (site === 'farfetch' || site === 'cettire') {
        return site; // 👉 farfetch / cettire
      }

      // 공식몰
      return `official_${site}`;
    };


    // 상품 등록 로직
    const modifiedTitle = await this.wordReplacementService.applyReplacements(product.title,product.customId);
    product.title = modifiedTitle;

    /* ===============================
    * 1️⃣ 디자이너 중복 제거
    * - 제목 맨 앞에서 디자이너가 여러 번 반복되면 1번만 남김
    * =============================== */
    const escapedDesigner = product.designer.replace(
      /[.*+?^${}()|[\]\\]/g,
      '\\$&'
    );

    const designerDupRegex = new RegExp(
      `^(${escapedDesigner})(\\s+\\1)+`
    );

    product.title = product.title.replace(designerDupRegex, '$1');


    /* ===============================
    * 2️⃣ styleId 중복 제거
    * - title 전체에서 styleId가 여러 번 나오면 1번만 남김
    * =============================== */
    const escapedStyleId = product.styleId.replace(
      /[.*+?^${}()|[\]\\]/g,
      '\\$&'
    );

    const styleIdRegex = new RegExp(`\\b${escapedStyleId}\\b`, 'g');

    let first = true;
    product.title = product.title.replace(styleIdRegex, () => {
      if (first) {
        first = false;
        return product.styleId;
      }
      return '';
    });


    /* ===============================
    * 3️⃣ 공백 정리 (중요)
    * =============================== */
    product.title = product.title.replace(/\s{2,}/g, ' ').trim();


    let price = product.price;

    // 🔥 customId + 플랫폼 기준 마진
    if (isTouched) {
    const allMargins = await this.marginService.getAllMargins(
      product.customId,
      product.accountPlatform
    );

    // 🔥 환율 적용 여부
    const noExchangeSites = ['Farfetch', 'Cettire'];

    let exchangeRate = 1;

    if (!noExchangeSites.includes(product.site)) {
      const exchangeMargin = allMargins.find(m => m.exchangeRate && m.exchangeRate > 0);
      if (exchangeMargin) {
        exchangeRate = exchangeMargin.exchangeRate;
      }
    }

    // 🔥 환율 적용
    price = price * exchangeRate;

    // 🔥 사이트별 마진 필터
    const applicableMargins = allMargins.filter(m => m.site === product.site);

    // 🔥 마진 적용
    for (const margin of applicableMargins) {
      if (price >= margin.minAmount && price <= margin.maxAmount) {

        const marginAmount = price * (margin.marginValue / 100);

        price += marginAmount;
        price += margin.minMargin;

        break;
      }
    }

    }

    const account = await this.hostingRepo.findOne({
      where: {
        partnerKey,
        apiKey,
      }
    });
    const marketplacePolicy = this.getMarketplacePolicy(account);

    const goodsDescription = this.createContent(product, mainImageUrl, additionalImageUrls, account?.bottomImages );


    const optionData = product.size.split(',').map((option, index) => ({
      optionNo: index + 1,
      optionValue1: `${option.trim()}`, // 사이즈 값
      optionPrice: '0', // 가격 차이는 없다고 가정
      optionViewFl: 'y', // 옵션 보이기 여부
      optionSellFl: 'y', // 옵션 판매 여부
      stockCnt: 100, // 재고 수량 (예시로 100)`
    }));
      

    const imageData = goodsno
    ? `<magnifyImageData>N</magnifyImageData><detailImageData>N</detailImageData><listImageData>N</listImageData><mainImageData>N</mainImageData>`
    : `
      <magnifyImageData idx="1"><![CDATA[${product.mainImageUrl}]]></magnifyImageData>
      ${product.additionalImageUrls.map((url, index) => `
        <magnifyImageData idx="${index + 2}"><![CDATA[${url}]]></magnifyImageData>
      `).join('')}
      <detailImageData idx="1"><![CDATA[${product.mainImageUrl}]]></detailImageData>
      ${product.additionalImageUrls.map((url, index) => `
        <detailImageData idx="${index + 2}"><![CDATA[${url}]]></detailImageData>
      `).join('')}
      <listImageData idx="1"><![CDATA[${product.mainImageUrl}]]></listImageData>
      <mainImageData idx="1"><![CDATA[${product.mainImageUrl}]]></mainImageData>
    `;

    const xmlData = `<?xml version="1.0" encoding="utf-8"?>
  <data>
    <goods_data>
      ${goodsno ? `<goodsNo>${goodsno}</goodsNo>` : ''}
      <goodsNmFl>d</goodsNmFl>
      <goodsNm>${product.title.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')}</goodsNm>
      <goodsSearchWord>${product.title.split(' ').join(',')}</goodsSearchWord>
      <goodsPrice>${price}</goodsPrice>
      <goodsCd>${getSiteCode(product)}_${product.styleId}</goodsCd>
      <makerNm>${product.designer}</makerNm>
      <goodsModelNo>${product.brandstyleId}</goodsModelNo>
      ${imageData}
      <goodsDescription><![CDATA[${goodsDescription}]]></goodsDescription>
      <scmNo>1</scmNo>
      <cateCd>${product.godoMallCategoryCode}</cateCd>
      <naverImportFlag>f</naverImportFlag>
      <naverProductFlag>b</naverProductFlag>
      <naverAgeGroup>a</naverAgeGroup>
      <naverTag>${product.designer} ${product.title.split(' ').join('|')} ${product.styleId}</naverTag>
      <naverNpayAble>all</naverNpayAble>
      <goodsState>n</goodsState>
      <goodsPermission>all</goodsPermission>
      <taxFreeFl>t</taxFreeFl>
      <stockFl>n</stockFl>
      <imageStorage>url</imageStorage>
      <restockFl>y</restockFl>
      <mileageFl>c</mileageFl>
      <goodsDiscountFl>n</goodsDiscountFl>
      <payLimitFl>n</payLimitFl>
      <optionFl>y</optionFl>
      <optionDisplayFl>s</optionDisplayFl>
      <optionName>사이즈</optionName>
      <addGoodsFl>n</addGoodsFl>
      <optionTextFl>n</optionTextFl>
      <deliverySno>${marketplacePolicy.godomall.deliverySno}</deliverySno>
      <relationFl>a</relationFl>
      <imgDetailViewFl>y</imgDetailViewFl>
      <externalVideoFl>n</externalVideoFl>
      <detailInfoDelivery>${marketplacePolicy.godomall.detailInfoDeliveryCode}</detailInfoDelivery>
      <detailInfoAS>${marketplacePolicy.godomall.detailInfoAsCode}</detailInfoAS>
      <detailInfoRefund>${marketplacePolicy.godomall.detailInfoRefundCode}</detailInfoRefund>
      <detailInfoExchange>${marketplacePolicy.godomall.detailInfoExchangeCode}</detailInfoExchange>
      <allCateCd>${product.godoMallCategoryCode}</allCateCd>
      ${optionData.map((option, index) => `
        <optionData idx="${index + 1}">
          <optionNo>${option.optionNo}</optionNo>
          <optionValue1><![CDATA[${option.optionValue1}]]></optionValue1>
          <optionPrice><![CDATA[${option.optionPrice}]]></optionPrice>
          <optionViewFl>${option.optionViewFl}</optionViewFl>
          <optionSellFl>${option.optionSellFl}</optionSellFl>
          <stockCnt>${option.stockCnt}</stockCnt>
        </optionData>
      `).join('')}
      <goodsDisplayFl>${isTouched ? 'y' : 'n'}</goodsDisplayFl> 
      <goodsDisplayMobileFl>${isTouched ? 'y' : 'n'}</goodsDisplayMobileFl> 
      <goodsSellFl>${isTouched ? 'y' : 'n'}</goodsSellFl> 
      <goodsSellMobileFl>${isTouched ? 'y' : 'n'}</goodsSellMobileFl>
      <soldOutFl>${isTouched ? 'n' : 'y'}</soldOutFl>
      <daumFl>${isTouched ? 'y' : 'n'}</daumFl> 
      <naverFl>${isTouched ? 'y' : 'n'}</naverFl>
      ${goodsno ? `<imageUpdate>N</imageUpdate>` : ''}
    </goods_data>
  </data>`;

    // console.log('xmlData:', xmlData);

    const env = {
      bucketName: process.env.R2_BUCKET_NEWNAME,
    };

    const userId =
  product.customId && product.accountPlatform
    ? `${product.customId}/${product.accountPlatform}`
    : 'default';
    const newFileName = `${userId}/${product.accountPlatform}/${product.site}/${fileName}`;

    const uploadParams = {
      Bucket: env.bucketName,
      Key: newFileName,
      Body: xmlData,
      ContentType: 'application/xml',
    };
    // Cloudflare R2에 XML 파일 업로드
    await this.client.send(new PutObjectCommand(uploadParams));

    return `https://pub-54943b138956492b8c1f369abbddfafd.r2.dev/${newFileName}`;
}

  // getProductUpdate XML 삭제
  async deleteUpdateXml(xmlUrl: string): Promise<void> {
    if (!xmlUrl) {
      console.log('⚠️ XML URL이 없습니다. 삭제 생략');
      return;
    }

    // 파일명만 추출
    const objectKey = this.getR2KeyFromUrlOrKey(xmlUrl);
    if (!objectKey) {
      console.log('⚠️ 파일명을 추출할 수 없습니다:', xmlUrl);
      return;
    }

    const deleteParams = {
      Bucket: process.env.R2_BUCKET_NEWNAME,
      Key: objectKey,
    };

    try {
      await this.client.send(new DeleteObjectCommand(deleteParams));
      console.log(`🧹 XML 삭제 완료: ${objectKey}`);
    } catch (error: any) {
      console.error(`❌ XML 삭제 실패: ${objectKey} - ${error.message}`);
    }
  }

  // 파일 삭제 목록에 추가 (현재 sessionId 기준)
  addToDeleteList(fileName: string): void {
    const objectKey = this.getR2KeyFromUrlOrKey(fileName);
    if (!objectKey) return;

    if (!this.filesToDeleteBySession[this.sessionId]) {
      this.filesToDeleteBySession[this.sessionId] = [];
    }
    if (!this.filesToDeleteBySession[this.sessionId].includes(objectKey)) {
      this.filesToDeleteBySession[this.sessionId].push(objectKey);
    }
  }

  // 현재 sessionId에 해당하는 XML 파일들을 일괄 삭제
  async deleteXmlFilesBatch(): Promise<void> {
    const filesToDelete = [...new Set(this.filesToDeleteBySession[this.sessionId] || [])];
    if (filesToDelete.length === 0) {
      console.log(`삭제할 파일이 없습니다. sessionId: ${this.sessionId}`);
      return;
    }

    for (const fileName of filesToDelete) {
      const deleteParams = {
        Bucket: process.env.R2_BUCKET_NEWNAME,
        Key: fileName,
      };
      try {
        await this.client.send(new DeleteObjectCommand(deleteParams));
      } catch (error: any) {
        console.error(`XML 파일 삭제 중 오류 발생: ${fileName} - ${error.message}`);
      }
    }

    // 모든 파일 삭제 후 한 번만 출력
    // console.log(`sessionId ${this.sessionId}에 대한 XML 파일 삭제 완료`);

    // 해당 세션의 파일 목록을 초기화
    delete this.filesToDeleteBySession[this.sessionId];
  }







  async uploadXmlToR2SmartStore(
    fileName: string,
    product: Product,
    mainImageUrl: string,
    additionalImageUrls: string[],
    partnerKey: string,
    apiKey: string,
  ): Promise<string> {

    try {

    const getSiteCode = (product: any): string => {
      if (!product.site) return 'unknown';

      const site = product.site.toLowerCase();

      // 플랫폼 (예외)
      if (site === 'farfetch' || site === 'cettire') {
        return site; // 👉 farfetch / cettire
      }

      // 공식몰
      return `official_${site}`;
    };

   
    const site = product.site;
    const isTouched = product.touched;
    const goodsno = product.goodsno;

    let attribute: string | null = null;
    let productTitle = '';


    if (!goodsno) {

      // 👉 번역 없이 mainInfo만 정제
      if (['Burberry', 'Dolce', 'Herno'].includes(site)) {
        product.mainInfo = await this.openApiService.refineMainInfo(product.mainInfo);

      } else {
        // 👉 언어 결정
        let lang: 'fr' | 'nl' | 'en' = 'en';

        if (['Dior', 'Sandro', 'Tods'].includes(site)) lang = 'fr';
        else if (site === 'Longchamp') lang = 'nl';

        const translated = await this.openApiService.translateProductFields(
          { title: product.title, madeIn: product.madeIn, color: product.color },
          lang
        );

        product.title = translated.title;
        product.madeIn = translated.madeIn;
        product.color = translated.color;

        product.mainInfo = await this.openApiService.refineMainInfo(product.mainInfo);
      }

      // 👉 치환
      product.designer = await this.wordReplacementService.applyReplacements(product.designer,product.customId);
      product.title = await this.wordReplacementService.applyReplacements(product.title,product.customId);

      // 👉 상품명 생성
      let productTitle = '';

      if (site === 'Dior') {
        productTitle = product.title.includes(product.designer)
          ? `${product.title} ${product.styleId}`
          : `${product.designer} ${product.title} ${product.styleId}`;
      } else {
        const color = product.color ?? '';

        productTitle = product.title.includes(product.designer)
          ? `${product.title} ${color} ${product.styleId}`
          : `${product.designer} ${product.title} ${color} ${product.styleId}`;
      }

      product.title = await this.openApiService.refineTitle2(product.designer, productTitle, product.mainInfo, product.styleId);
      product.title = await this.wordReplacementService.applyReplacements(product.title,product.customId);

      attribute = await this.openApiService.refineAttribute2(product.title, product.mainInfo);

    } else {

      let productTitle = '';

      if (site === 'Dior') {
        productTitle = product.title.includes(product.designer)
          ? `${product.title} ${product.styleId}`
          : `${product.designer} ${product.title} ${product.styleId}`;
      } else {
        const color = product.color?.trim() ? product.color : '';

        productTitle = [
          product.designer,
          product.title,
          color,
          product.styleId,
        ].filter(Boolean).join(' ');

        if (product.title.includes(product.designer)) {
          productTitle = [
            product.title,
            color,
            product.styleId,
          ].filter(Boolean).join(' ');
        }
      }
    }
  
    product.title = await this.openApiService.refineTitle2(product.designer,productTitle,product.mainInfo,product.styleId)
    product.title = await this.wordReplacementService.applyReplacements(product.title,product.customId);

    /* ===============================
    * 1️⃣ 디자이너 중복 제거
    * - 제목 맨 앞에서 디자이너가 여러 번 반복되면 1번만 남김
    * =============================== */
    const escapedDesigner = product.designer.replace(
      /[.*+?^${}()|[\]\\]/g,
      '\\$&'
    );

    const designerDupRegex = new RegExp(
      `^(${escapedDesigner})(\\s+\\1)+`
    );

    product.title = product.title.replace(designerDupRegex, '$1');


    /* ===============================
    * 2️⃣ styleId 중복 제거
    * - title 전체에서 styleId가 여러 번 나오면 1번만 남김
    * =============================== */
    const escapedStyleId = product.styleId.replace(
      /[.*+?^${}()|[\]\\]/g,
      '\\$&'
    );

    const styleIdRegex = new RegExp(`\\b${escapedStyleId}\\b`, 'g');

    let first = true;
    product.title = product.title.replace(styleIdRegex, () => {
      if (first) {
        first = false;
        return product.styleId;
      }
      return '';
    });


    /* ===============================
    * 3️⃣ 공백 정리 (중요)
    * =============================== */
    product.title = product.title.replace(/\s{2,}/g, ' ').trim();

    // ✅ 업데이트일 때는 AI 스킵, 치환만 적용
    product.title = await this.wordReplacementService.applyReplacements(product.title,product.customId);
    product.designer = await this.wordReplacementService.applyReplacements(product.designer,product.customId);
  

    let priceInWon = product.price;

    // 🔥 마진 + 환율 가져오기
    const allMargins = await this.marginService.getAllMargins(
      product.customId,
      product.accountPlatform
    );

    // 🔥 기본값
    let discountRate = 0;
    let exchangeRate = 1;

    // 🔥 하나 기준으로 처리 (중요)
    if (allMargins.length > 0) {
      const m = allMargins[0];

      if (m.discountRate !== undefined && m.discountRate > 0) {
        discountRate = m.discountRate;
      }

      if (m.exchangeRate !== undefined && m.exchangeRate > 0) {
        exchangeRate = m.exchangeRate;
      }
    }

    // 🔥 안전 처리
    discountRate = Math.max(0, Math.min(discountRate, 100));

    // 🔥 계산
    priceInWon = priceInWon * exchangeRate * (1 - discountRate / 100);


    // ✅ 카테고리별 가격 로직
    if (
      product.categoryName.toLowerCase().includes('bags') || 
      product.categoryName.toLowerCase().includes('bag') ||
      product.categoryName.toLowerCase().includes('coin') ||
      product.categoryName.toLowerCase().includes('handbags') ||
      product.categoryName.toLowerCase().includes('travel') || 
      product.categoryName.toLowerCase().includes('small leather goods') ||
      product.categoryName.toLowerCase().includes('small-leather-goods') ||
      product.categoryName.toLowerCase().includes('jewelry') ||
      product.categoryName.toLowerCase().includes('jewellery') ||
      product.categoryName.toLowerCase().includes('wallets') ||
      product.categoryName.includes('가방') ||
      product.categoryName.includes('지갑')
    ) {
      if (priceInWon >= 2000000) {
        const excessAmount = priceInWon - 2000000;
        const additionalAmount = excessAmount * 0.2 * 1.3;
        priceInWon = (priceInWon + additionalAmount) * 1.1;
      } else {
        priceInWon *= 1.1;
      }
    } else {
      priceInWon *= 1.1;
    }


    // 🔥 마진 적용
    let finalPrice = priceInWon;

    const applicableMargins = allMargins.filter(m => m.site === product.site);

    for (const margin of applicableMargins) {
      if (finalPrice >= margin.minAmount && finalPrice <= margin.maxAmount) {
        const marginAmount = finalPrice * (margin.marginValue / 100);
        finalPrice += marginAmount;
        finalPrice += margin.minMargin;
        break;
      }
    }


    // 🔥 관세 로직
    if (product.madeIn && product.madeIn.trim() !== '') {

      const countryList = [
        '오스트리아','Austria','벨기에','Belgium','프랑스','France','독일','Germany',
        '이탈리아','Italy','Italia','Italie','스페인','Spain',
        '네덜란드','Netherlands','Holland','포르투갈','Portugal',
        '아일랜드','Ireland','룩셈부르크','Luxembourg',
        '덴마크','Denmark','스웨덴','Sweden','핀란드','Finland',
        '체코','Czech Republic','Czechia','헝가리','Hungary',
        '폴란드','Poland','슬로바키아','Slovakia','슬로베니아','Slovenia',
        '루마니아','Romania','불가리아','Bulgaria','크로아티아','Croatia',
        '에스토니아','Estonia','라트비아','Latvia','리투아니아','Lithuania',
        '몰타','Malta','키프로스','Cyprus',
      ];

      const madeInNormalized = product.madeIn.toLowerCase();

      const containsCountry = countryList.some(country =>
        madeInNormalized.includes(country.toLowerCase())
      );

      if (!containsCountry) {
        finalPrice += finalPrice * 0.13;
      }
    }


    // 🔥 10원 단위 반올림
    finalPrice = Math.round(finalPrice / 10) * 10;

    const goodsPrice = finalPrice;
  

    product.mainInfo = await this.wordReplacementService.applyReplacements(product.mainInfo,product.customId);
    const account = await this.hostingRepo.findOne({
      where: {
        partnerKey,
        apiKey,
      }
    });

    const goodsDescription = this.createContent(product, mainImageUrl, additionalImageUrls, account?.bottomImages );
  
  
    const sizeValues = product.size.split(',').map(size => size.trim());
    const addOptionPrices = (product.addoptionprice || '0').split(',').map(price => price.trim());
  
    const optionData = sizeValues.map((option, index) => ({
        optionNo: index + 1,
        optionValue1: option, // 사이즈 값
        optionPrice: addOptionPrices[index] || '0', // 추가 가격이 없으면 0으로 설정
        optionViewFl: 'y', // 옵션 보이기 여부
        optionSellFl: 'y', // 옵션 판매 여부
        stockCnt: 100, // 재고 수량 (예시로 100)
    }));

    // 주요 사용 성별 체크 (naverGender)
    const categoryName = product.categoryName.toLowerCase();
    let naverGender = 'c'; // 기본값 (공용)

    if (categoryName.includes('women') || categoryName.includes('shop-women') || categoryName.includes('woman')) {
      naverGender = 'w';
    } else if (/^(men|man|shop-men)('s)?\b/.test(categoryName)) {
      naverGender = 'm';
    } else {
      naverGender = 'c'; // 기본값 (공용)
    }

    // 상세 안내 설정 (계정별로)
    // 기본 값 설정
    let detailInfoDelivery = "";
    let detailInfoAS = "";
    let detailInfoRefund = "";
    let detailInfoExchange = "";

    // apiKey 값에 따른 detailInfo 값 변경
    if (
      apiKey ===
      'JUFGUSU4MyVEMSUyNSVDQiVCRXQlMTElMTUlRDMlQTklQUU0JUY0QSVGQiVBNCVDQiVDMSU4NlUlMkIlRDdkJUFFJUE1JUJBJTNFJTA1JTk2JTgzbiUyRiVBMyVERSUwNiVBMiVFQiVDQg=='
    ) {
      // 기존 JTBETSUxOSU5OEYlQUIlMUYlRkM=
      detailInfoDelivery = "002006";
      detailInfoAS = "003006";
      detailInfoRefund = "004006";
      detailInfoExchange = "005006";

    } else if (
      apiKey ===
      'JUVGJTFBR1YlQkIlMjRHJTI0JURGJUVCJThCVWUlMDl1JURERSVGQ3MlRTE0JUU0JUEwJTkxYiVEOSU0MCUwNiVEMSVCQyVBOSUzRiUwRiUzRSVBRSVDNQ=='
    ) {
      // 기존 bDAlRkRxJTBFJThDJUU0NA==
      detailInfoDelivery = "002004";
      detailInfoAS = "003004";
      detailInfoRefund = "004004";
      detailInfoExchange = "005004";

    } else if (
      apiKey ===
      'JUU3JUVGRyVENyU4QiVCQyVGMyUzQnAlRjYlQjh0ZiVBQSUxQiUxQiU4MSUyNiVENm8lM0VrbiU5RiU4REElOTUlQTJuJUQ2bSU3RCVGOCVCRjU0JTgwJTE2diU4Qg=='
    ) {
      detailInfoDelivery = "002001";
      detailInfoAS = "003001";
      detailInfoRefund = "004001";
      detailInfoExchange = "005001";
    }


    // Product 및 CategoryMapping 데이터를 기반으로 XML 데이터 생성
    const marketplacePolicy = this.getMarketplacePolicy(account);
    detailInfoDelivery = marketplacePolicy.godomall.detailInfoDeliveryCode;
    detailInfoAS = marketplacePolicy.godomall.detailInfoAsCode;
    detailInfoRefund = marketplacePolicy.godomall.detailInfoRefundCode;
    detailInfoExchange = marketplacePolicy.godomall.detailInfoExchangeCode;

    let xmlData = `<?xml version="1.0" encoding="utf-8"?>
    <data>
      <goods_data>
        ${product.goodsno ? `<goodsNo>${product.goodsno}</goodsNo>` : ''}  <!-- 상품 수정 시 goodsno 포함 -->
        <goodsNmFl>d</goodsNmFl>
        <goodsNm>${product.title}</goodsNm>
        <goodsSearchWord>${product.title.split(' ').join(',')}</goodsSearchWord>
        <goodsPrice>${goodsPrice.toFixed(0)}</goodsPrice> <!-- 💰 최종 가격 반영 -->
        <goodsCd>${getSiteCode(product)}_${product.styleId}</goodsCd>
        <makerNm>${product.designer}</makerNm>
        <goodsModelNo>${product.brandstyleId}</goodsModelNo>
        <magnifyImageData idx="1"><![CDATA[${product.mainImageUrl}]]></magnifyImageData> <!-- 대표 이미지 -->
        ${product.additionalImageUrls.map((url,index) => `
          <magnifyImageData idx="${index + 2}"><![CDATA[${url}]]></magnifyImageData>
        `).join('')}
        <detailImageData idx="1"><![CDATA[${product.mainImageUrl}]]></detailImageData> <!-- 대표 이미지 -->
        ${product.additionalImageUrls.map((url,index) => `
          <detailImageData idx="${index + 2}"><![CDATA[${url}]]></detailImageData>
        `).join('')}
        <listImageData idx="1"><![CDATA[${product.mainImageUrl}]]></listImageData> <!-- 대표 이미지 -->
        <mainImageData idx="1"><![CDATA[${product.mainImageUrl}]]></mainImageData> <!-- 대표 이미지 -->
        <goodsDescription>
        <![CDATA[${goodsDescription}]]>
        </goodsDescription>
        <scmNo>1</scmNo>
        <cateCd>${product.godoMallCategoryCode}</cateCd>
        <naverImportFlag>f</naverImportFlag>
        <naverProductFlag>b</naverProductFlag>
        <naverAgeGroup>a</naverAgeGroup>
        <naverTag>${`${product.designer} ${product.title} ${product.brandstyleId}`.split(' ').join('|')}</naverTag>
        <naverGender>${naverGender}</naverGender>
        <naverNpayAble>all</naverNpayAble>
        <goodsState>n</goodsState>
        <goodsPermission>all</goodsPermission>
        <taxFreeFl>t</taxFreeFl>
        <stockFl>n</stockFl>
        <imageStorage>url</imageStorage>
        <restockFl>y</restockFl>
        <mileageFl>c</mileageFl>
        <goodsDiscountFl>n</goodsDiscountFl>
        <payLimitFl>n</payLimitFl>
        <optionFl>y</optionFl>
        <optionDisplayFl>s</optionDisplayFl>
        <optionName>사이즈</optionName>
        <addGoodsFl>n</addGoodsFl>
        <optionTextFl>n</optionTextFl>
        <addGoodsFl>n</addGoodsFl>
        <deliverySno>${marketplacePolicy.godomall.deliverySno}</deliverySno>
        <relationFl>a</relationFl>
        <imgDetailViewFl>y</imgDetailViewFl>
        <externalVideoFl>n</externalVideoFl>
        ${!goodsno && attribute ? `<naverAttribute>${escapeXml(attribute)}</naverAttribute>` : ''}
        <detailInfoDelivery>${detailInfoDelivery}</detailInfoDelivery>
        <detailInfoAS>${detailInfoAS}</detailInfoAS>
        <detailInfoRefund>${detailInfoRefund}</detailInfoRefund>
        <detailInfoExchange>${detailInfoExchange}</detailInfoExchange>
        <allCateCd>${product.godoMallCategoryCode}</allCateCd>
        ${optionData.map((option, index) => `
          <optionData idx="${index + 1}">
            <optionNo>${option.optionNo}</optionNo>
            <optionValue1><![CDATA[${option.optionValue1}]]></optionValue1>
            <optionPrice><![CDATA[${option.optionPrice}]]></optionPrice>
            <optionViewFl>${option.optionViewFl}</optionViewFl>
            <optionSellFl>${option.optionSellFl}</optionSellFl>
            <stockCnt>${option.stockCnt}</stockCnt>
          </optionData>
        `).join('')}
        <goodsDisplayFl>${isTouched ? 'y' : 'n'}</goodsDisplayFl> 
        <goodsDisplayMobileFl>${isTouched ? 'y' : 'n'}</goodsDisplayMobileFl> 
        <goodsSellFl>${isTouched ? 'y' : 'n'}</goodsSellFl> 
        <goodsSellMobileFl>${isTouched ? 'y' : 'n'}</goodsSellMobileFl>
        <soldOutFl>${isTouched ? 'n' : 'y'}</soldOutFl>
        <daumFl>${isTouched ? 'y' : 'n'}</daumFl> 
        <naverFl>${isTouched ? 'y' : 'n'}</naverFl>
        ${goodsno ? `<imageUpdate>N</imageUpdate>` : ''} <!-- goodsno가 있으면 imageUpdate 추가 -->
      </goods_data>
    </data>`;

    

  
  
    const env = {
      bucketName: process.env.R2_BUCKET_NEWNAME,
    };

    const userId =
  product.customId && product.accountPlatform
    ? `${product.customId}/${product.accountPlatform}`
    : 'default';
    const newFileName = `${userId}/${product.accountPlatform}/${product.site}/${fileName}`;

    const uploadParams = {
      Bucket: env.bucketName,
      Key: newFileName,
      Body: xmlData,
      ContentType: 'application/xml',
    };
  
    // Cloudflare R2에 XML 파일 업로드
    await this.client.send(new PutObjectCommand(uploadParams));
  
    return `https://pub-54943b138956492b8c1f369abbddfafd.r2.dev/${newFileName}`;
  } catch (error: any) {
    console.error(`Error uploading XML for product ${product.designer} ${product.title}: ${error.message}`);
    return null; // 오류 발생 시 null을 반환하여 건너뛰도록 설정
  }
  }

  async uploadXmlToR2Update(
    product: Product,
    fileName: string,
    partnerKey: string,
    soldOut: boolean
  ){
    
    try {

      let price: number;
      const sourcePrice = product.price;
      let fixedPrice: number | null = null;

      const EU_COUNTRIES = [
        '오스트리아','Austria','벨기에','Belgium','프랑스','France','독일','Germany',
        '이탈리아','Italy','Italia','ltaly','스페인','Spain','네덜란드','Netherlands','Holland',
        '포르투갈','Portugal','아일랜드','Ireland','룩셈부르크','Luxembourg',
        '덴마크','Denmark','스웨덴','Sweden','핀란드','Finland',
        '체코','Czech Republic','Czechia','헝가리','Hungary','폴란드','Poland',
        '슬로바키아','Slovakia','슬로베니아','Slovenia','루마니아','Romania',
        '불가리아','Bulgaria','크로아티아','Croatia',
        '에스토니아','Estonia','라트비아','Latvia','리투아니아','Lithuania',
        '몰타','Malta','키프로스','Cyprus'
      ];

      const isEU = (product: Product) => {
        const text = `${product.madeIn ?? ''} ${product.mainInfo ?? ''}`.toLowerCase();
        return EU_COUNTRIES.some(c => text.includes(c.toLowerCase()));
      };

      if (!soldOut) {

        // 🔥 한 번만 호출 (중요)
        const allMargins = await this.marginService.getAllMargins(
          product.customId,
          product.accountPlatform
        );

        // 🔥 기본값
        let exchangeRate = 1;
        let discountRate = 0;

        // 🔥 하나 기준 (핵심)
        if (allMargins.length > 0) {
          const m = allMargins[0];

          if (m.exchangeRate && m.exchangeRate > 0) {
            exchangeRate = m.exchangeRate;
          }

          if (m.discountRate && m.discountRate > 0) {
            discountRate = m.discountRate;
          }
        }

        // 🔥 안전 처리
        discountRate = Math.max(0, Math.min(discountRate, 100));

        // =========================
        // 1️⃣ Farfetch
        // =========================
        if (product.site === 'Farfetch') {

          price = product.price;
          fixedPrice = product.fixedPrice ?? 0;

          const applicableMargins = allMargins.filter(m => m.site === product.site);

          for (const margin of applicableMargins) {
            if (price >= margin.minAmount && price <= margin.maxAmount) {

              price += price * (margin.marginValue / 100) + margin.minMargin;

              if (fixedPrice && fixedPrice > 0) {
                fixedPrice += fixedPrice * (margin.marginValue / 100) + margin.minMargin;
              } else {
                fixedPrice = 0;
              }

              break;
            }
          }
        }

        // =========================
        // 2️⃣ Cettire
        // =========================
        else if (product.site === 'Cettire') {

          price = product.price;

          const applicableMargins = allMargins.filter(m => m.site === product.site);

          for (const margin of applicableMargins) {
            if (price >= margin.minAmount && price <= margin.maxAmount) {
              price += price * (margin.marginValue / 100) + margin.minMargin;
              break;
            }
          }

          if (!isEU(product)) {
            price += price * 0.13;
          }

          fixedPrice = null;
        }

        // =========================
        // 3️⃣ 기타 전체 (환율 적용)
        // =========================
        else {

          let priceInWon = product.price * exchangeRate * (1 - discountRate / 100);

          const isBag = /bags|bag|coin|handbags|travel|small leather goods|small-leather-goods|jewelry|jewellery|wallets|가방|지갑/i
            .test(product.categoryName);

          if (isBag && priceInWon >= 2000000) {
            const excess = priceInWon - 2000000;
            priceInWon = (priceInWon + excess * 0.2 * 1.3) * 1.1;
          } else {
            priceInWon *= 1.1;
          }

          let finalPrice = priceInWon;

          const applicableMargins = allMargins.filter(m => m.site === product.site);

          for (const margin of applicableMargins) {
            if (finalPrice >= margin.minAmount && finalPrice <= margin.maxAmount) {
              finalPrice += finalPrice * (margin.marginValue / 100) + margin.minMargin;
              break;
            }
          }

          if (!isEU(product)) {
            finalPrice += finalPrice * 0.13;
          }

          price = Math.round(finalPrice / 10) * 10;
          fixedPrice = null;
        }
      }


      const sizeValues = product.size.split(',').map(size => size.trim());
      const addOptionPrices = (product.addoptionprice || '0').split(',').map(price => price.trim());
    
      const optionData = sizeValues.map((option, index) => ({
          optionNo: index + 1,
          optionValue1: option, // 사이즈 값
          optionPrice: addOptionPrices[index] || '0', // 추가 가격이 없으면 0으로 설정
          optionViewFl: 'y', // 옵션 보이기 여부
          optionSellFl: 'y', // 옵션 판매 여부
          stockCnt: 100, // 재고 수량 (예시로 100)
      }));



      // 상세 안내 설정 (계정별로)
      // 기본 값 설정
      let detailInfoDelivery = "";
      let detailInfoAS = "";
      let detailInfoRefund = "";
      let detailInfoExchange = "";

      if (['Farfetch', 'Cettire'].includes(product.site)) {
        detailInfoDelivery = "002001";
        detailInfoAS = "003001";
        detailInfoRefund = "004001";
        detailInfoExchange = "005001";
      } else {
        if (partnerKey === "JTBETSUxOSU5OEYlQUIlMUYlRkM=") {
          detailInfoDelivery = "002006";
          detailInfoAS = "003006";
          detailInfoRefund = "004006";
          detailInfoExchange = "005006";
        } else if (partnerKey === "bDAlRkRxJTBFJThDJUU0NA==") {
          detailInfoDelivery = "002004";
          detailInfoAS = "003004";
          detailInfoRefund = "004004";
          detailInfoExchange = "005004";
        }
      }

      const account =
        product.customId && product.accountPlatform
          ? await this.hostingRepo.findOne({
              where: {
                customId: product.customId,
                accountPlatform: product.accountPlatform,
              },
            })
          : await this.hostingRepo.findOne({
              where: {
                partnerKey,
              },
            });
      const marketplacePolicy = this.getMarketplacePolicy(account);
      detailInfoDelivery = marketplacePolicy.godomall.detailInfoDeliveryCode;
      detailInfoAS = marketplacePolicy.godomall.detailInfoAsCode;
      detailInfoRefund = marketplacePolicy.godomall.detailInfoRefundCode;
      detailInfoExchange = marketplacePolicy.godomall.detailInfoExchangeCode;

        
      // ✅ 1️⃣ XML 가격 섹션 분기
      let xmlPriceSection = '';

      if (product.site === 'Farfetch') {
        xmlPriceSection = `
          <goodsPrice>${typeof price === 'number' && !isNaN(price) ? price : (product.price ?? 0)}</goodsPrice>
          <fixedPrice>${typeof fixedPrice === 'number' && !isNaN(fixedPrice) ? fixedPrice : 0}</fixedPrice>
        `;
      } else if (product.site === 'Cettire') {
        xmlPriceSection = `
          <goodsPrice>${typeof price === 'number' && !isNaN(price) ? price.toFixed(0) : (product.price ?? 0)}</goodsPrice>
        `;
      } else {
        xmlPriceSection = `
          <goodsPrice>${typeof price === 'number' && !isNaN(price) ? price.toFixed(0) : (product.price ?? 0)}</goodsPrice>
        `;
      }

      // 🔥 특정 파트너만 차단 로직 적용
      const isSpecialPartner =
        partnerKey === 'JTBETSUxOSU5OEYlQUIlMUYlRkM=';

      const isBlockedFromNaver =
        isSpecialPartner && ['Farfetch', 'Cettire'].includes(product.site);

      const naverFl = isBlockedFromNaver
        ? 'n'
        : (soldOut ? 'n' : 'y');

    
    
      // Product 및 CategoryMapping 데이터를 기반으로 XML 데이터 생성
      const xmlData = `<?xml version="1.0" encoding="utf-8"?>
      <data>
        <goods_data>
          <goodsNo>${product.goodsno}</goodsNo>
          <goodsNmFl>d</goodsNmFl>
          <goodsNm>${product.title}</goodsNm>
          <goodsSearchWord>${product.title.split(' ').join(',')}</goodsSearchWord>

          ${xmlPriceSection} <!-- 💰 가격 섹션 자동 삽입 -->

          <makerNm>${product.designer}</makerNm>
          <goodsModelNo>${product.brandstyleId}</goodsModelNo>
          <imageUpdate>N</imageUpdate>
          <scmNo>1</scmNo>
          <cateCd>${product.godoMallCategoryCode}</cateCd>
          <naverImportFlag>f</naverImportFlag>
          <naverProductFlag>b</naverProductFlag>
          <naverAgeGroup>a</naverAgeGroup>
          <naverTag>${product.title}.split(' ').join('|')}</naverTag>
          <naverNpayAble>all</naverNpayAble>
          <goodsState>n</goodsState>
          <goodsPermission>all</goodsPermission>
          <taxFreeFl>t</taxFreeFl>
          <stockFl>n</stockFl>
          <imageStorage>url</imageStorage>
          <restockFl>y</restockFl>
          <mileageFl>c</mileageFl>
          <goodsDiscountFl>n</goodsDiscountFl>
          <payLimitFl>n</payLimitFl>
          <optionFl>y</optionFl>
          <optionDisplayFl>s</optionDisplayFl>
          <optionName>사이즈</optionName>
          <addGoodsFl>n</addGoodsFl>
          <optionTextFl>n</optionTextFl>
          <addGoodsFl>n</addGoodsFl>
          <deliverySno>${marketplacePolicy.godomall.deliverySno}</deliverySno>
          <relationFl>a</relationFl>
          <imgDetailViewFl>y</imgDetailViewFl>
          <externalVideoFl>n</externalVideoFl>
          <detailInfoDelivery>${detailInfoDelivery}</detailInfoDelivery>
          <detailInfoAS>${detailInfoAS}</detailInfoAS>
          <detailInfoRefund>${detailInfoRefund}</detailInfoRefund>
          <detailInfoExchange>${detailInfoExchange}</detailInfoExchange>
          <allCateCd>${product.godoMallCategoryCode}</allCateCd>
          ${optionData.map((option, index) => `
            <optionData idx="${index + 1}">
              <optionNo>${option.optionNo}</optionNo>
              <optionValue1><![CDATA[${option.optionValue1}]]></optionValue1>
              <optionPrice><![CDATA[${option.optionPrice}]]></optionPrice>
              <optionViewFl>${option.optionViewFl}</optionViewFl>
              <optionSellFl>${option.optionSellFl}</optionSellFl>
              <stockCnt>${option.stockCnt}</stockCnt>
            </optionData>
          `).join('')}
          <soldOutFl>${soldOut ? 'y' : 'n'}</soldOutFl>
          <goodsDisplayFl>${soldOut ? 'n' : 'y'}</goodsDisplayFl>
          <goodsDisplayMobileFl>${soldOut ? 'n' : 'y'}</goodsDisplayMobileFl>
          <goodsSellFl>${soldOut ? 'n' : 'y'}</goodsSellFl>
          <goodsSellMobileFl>${soldOut ? 'n' : 'y'}</goodsSellMobileFl>
          <daumFl>${soldOut ? 'n' : 'y'}</daumFl>
          <naverFl>${naverFl}</naverFl>
        </goods_data>
      </data>`;
    
      
      if (!soldOut) {
        try {
          product.price = sourcePrice;
          product.size = product.size?.trim() || '원사이즈'; // 항상 저장

          if (typeof fixedPrice === 'number' && fixedPrice > 0) {
            (product as any).fixedPrice = Math.round(fixedPrice);
          }

          await this.saveProductEntity(product);
        } catch (err: any) {
          console.warn(`⚠️ DB 저장 중 오류 (${product.designer}): ${err.message}`);
        }
      } else {
        try {
          // ✅ 품절일 때 수동으로 수정일자만 갱신
          (product as any).lastModifiedDate = new Date();
          await this.saveProductEntity(product);
        } catch (err: any) {
        }
      }
    
      const env = {
        bucketName: process.env.R2_BUCKET_NEWNAME,
      };

      const userId =
  product.customId && product.accountPlatform
    ? `${product.customId}/${product.accountPlatform}`
    : 'default';
      const newFileName = `${userId}/${product.accountPlatform}/${product.site}/${fileName}`;

      const uploadParams = {
        Bucket: env.bucketName,
        Key: newFileName,
        Body: xmlData,
        ContentType: 'application/xml',
      };
      
      // Cloudflare R2에 XML 파일 업로드
      await this.client.send(new PutObjectCommand(uploadParams));
    
      return `https://pub-54943b138956492b8c1f369abbddfafd.r2.dev/${newFileName}`;
    } catch (error: any) {
      console.error(`Error uploading XML for product ${product.designer} ${product.title}: ${error.message}`);
      return null; // 오류 발생 시 null을 반환하여 건너뛰도록 설정
    }
  
  }

}
