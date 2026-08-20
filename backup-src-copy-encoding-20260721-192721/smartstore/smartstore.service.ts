import { Injectable } from '@nestjs/common';
import axios from 'axios';
import * as bcrypt from 'bcryptjs';
import { setTimeout } from 'timers/promises';
import { SmartStoreCategory } from 'src/category/SmartStoreCategory.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { AttributeValueUnit } from './attributeValueUnit.entity';
import { HostingAccount } from 'src/hosting/hostingaccount.entity';
const FormData = require('form-data');
const sharp = require('sharp');

const API_URL = 'https://api.commerce.naver.com/external';

@Injectable()
export class SmartstoreService {
  private acceessTokenStore: Record<string,string> = {};
  private readonly marketplaceImageUserAgent =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36';

  private httpClient = axios.create({
    baseURL: API_URL,
  });

  constructor(
    @InjectRepository(SmartStoreCategory)
    private readonly smartstoreCategoryRepository: Repository<SmartStoreCategory>,
    @InjectRepository(HostingAccount)
    @InjectRepository(HostingAccount)
    private readonly hostingAccountRepository: Repository<HostingAccount>, 
  ) {}

  private applyDefaultDetailAttribute(data: any) {
    if (!data?.originProduct) {
      return data;
    }

    if (!data.originProduct.detailAttribute) {
      data.originProduct.detailAttribute = {};
    }

    if (!data.originProduct.detailAttribute.customsTaxType) {
      data.originProduct.detailAttribute.customsTaxType = 'INCLUDED';
    }

    return data;
  }

  private async normalizeMarketplaceImage(
    buffer: Buffer,
    sourceUrl?: string,
  ): Promise<{ buffer: Buffer; fileName: string }> {
    try {
      const metadata = await sharp(buffer).metadata();
      const format = String(metadata.format || '').toLowerCase();

      if (format === 'png') {
        return { buffer, fileName: 'image.png' };
      }

      if (format === 'jpeg' || format === 'jpg') {
        return { buffer, fileName: 'image.jpg' };
      }

      const normalizedBuffer = await sharp(buffer)
        .jpeg({ quality: 90 })
        .toBuffer();

      return { buffer: normalizedBuffer, fileName: 'image.jpg' };
    } catch {
      const isPng = String(sourceUrl || '').toLowerCase().includes('.png');
      return { buffer, fileName: isPng ? 'image.png' : 'image.jpg' };
    }
  }

  private getMarketplaceImageReferers(imageUrl: string, referer?: string) {
    const candidates: string[] = [];

    const pushCandidate = (value?: string) => {
      const normalized = String(value || '').trim();
      if (!normalized || candidates.includes(normalized)) {
        return;
      }
      candidates.push(normalized);
    };

    const toOriginReferer = (value?: string) => {
      try {
        return `${new URL(String(value || '').trim()).origin}/`;
      } catch {
        return '';
      }
    };

    pushCandidate(referer);
    pushCandidate(toOriginReferer(referer));
    pushCandidate(toOriginReferer(imageUrl));

    return candidates;
  }

  private buildMarketplaceImageHeaders(referer?: string) {
    return {
      'User-Agent': this.marketplaceImageUserAgent,
      Accept:
        'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9,ko-KR;q=0.8,ko;q=0.7',
      ...(referer ? { Referer: referer } : {}),
    };
  }

  private async downloadMarketplaceImage(
    imageUrl: string,
    referer?: string,
  ): Promise<Buffer> {
    const attempted: string[] = [];
    const refererCandidates = this.getMarketplaceImageReferers(imageUrl, referer);
    const headerCandidates = refererCandidates.length
      ? [...refererCandidates, '']
      : [''];

    let lastError: any;

    for (const candidate of headerCandidates) {
      try {
        const response = await axios.get<ArrayBuffer>(imageUrl, {
          responseType: 'arraybuffer',
          timeout: 20000,
          headers: this.buildMarketplaceImageHeaders(candidate || undefined),
        });

        return Buffer.from(response.data);
      } catch (error: any) {
        lastError = error;
        attempted.push(
          `${candidate || 'no-referer'}:${error?.response?.status || error?.message || 'unknown'}`,
        );
      }
    }

    const attemptedText = attempted.length ? ` [${attempted.join(', ')}]` : '';
    throw new Error(
      `이미지 다운로드 실패: ${lastError?.message || 'unknown error'}${attemptedText}`,
    );
  }

  async uploadProductImageUrls(
    auth:{smartStoreID: string,smartStoreSecret: string,},
    imageUrls: string[],
    referer?: string,
  ) {
    const base64ImageList: string[] = [];
    const originThumbnailUrls: string[] = [];

    for (const imageUrl of imageUrls) {
      try {
        const normalizedImage = await this.normalizeMarketplaceImage(
          await this.downloadMarketplaceImage(imageUrl, referer),
          imageUrl,
        );

        base64ImageList.push(normalizedImage.buffer.toString('base64'));
        originThumbnailUrls.push(imageUrl);
      } catch (error: any) {
        console.error(`이미지 base64 변환 실패: ${imageUrl}`, error.message);
      }
    }

    if (!base64ImageList.length) {
      throw new Error('업로드 가능한 이미지가 없어 스마트스토어 이미지 등록을 진행할 수 없습니다.');
    }

    return this.uploadProductImageList(
      auth,
      base64ImageList,
      originThumbnailUrls,
    );
  }

  async fetchAttributes(
    categoryCode: string,
    customId: string,
    accountPlatform: string
  ): Promise<any[]> {
    const account = await this.hostingAccountRepository.findOne({
      where: {
        customId,
        accountPlatform,
      },
    });

    if (!account) {
      throw new Error(`❌ 스마트스토어 계정 없음: ${customId} / ${accountPlatform}`);
    }

    const result = await this.excute('/v1/product-attributes/attributes', 'GET', {
      params: { categoryId: categoryCode }
    }, {
      smartStoreID: account.partnerKey,
      smartStoreSecret: account.apiKey,
    });
    return result.data || result;
  }
  
  async fetchAttributeValues(
    categoryCode: string,
    customId: string,
    accountPlatform: string
  ): Promise<any[]> {

    const account = await this.hostingAccountRepository.findOne({
      where: {
        customId,
        accountPlatform,
      },
    });

    if (!account) {
      throw new Error(`❌ 스마트스토어 계정 없음: ${customId} / ${accountPlatform}`);
    }

    const result = await this.excute('/v1/product-attributes/attribute-values', 'GET', {
      params: { categoryId: categoryCode }
    }, {
      smartStoreID: account.partnerKey,
      smartStoreSecret: account.apiKey,
    });
    return result.data || result;
  }



  async fetchAndStoreSmartstoreCategories(
    customId: string,
    accountPlatform: string
  ) {
    try {
      console.log(`📦 스마트스토어 카테고리 불러오는 중...`);

      // ✅ 1️⃣ HostingAccount에서 key 가져오기
      const account = await this.hostingAccountRepository.findOne({
        where: { customId, accountPlatform },
      });

      if (!account) {
        throw new Error(`❌ 계정 없음: ${customId} / ${accountPlatform}`);
      }

      // ✅ auth 구조 유지 (니 요구사항 반영)
      const auth = {
        smartStoreID: account.partnerKey,
        smartStoreSecret: account.apiKey,
      };

      // ✅ 기존 로직 그대로 사용
      const tokenData = await this.getAccessToken(auth);

      const response = await axios.get(`${API_URL}/v1/categories`, {
        params: { last: true },
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
        },
      });

        const categories = response.data;
        console.log(`✅ 스마트스토어 리프 카테고리 ${categories.length}개 조회 완료`);

        await this.smartstoreCategoryRepository.delete({
          customId,
          accountPlatform,
        });

        const categoryEntities = categories
          .filter((category: any) => category?.id && category?.wholeCategoryName)
          .map((category: any) =>
            this.smartstoreCategoryRepository.create({
              categoryCode: category.id,
              categoryName: category.wholeCategoryName,
              customId,
              accountPlatform,
            }),
          );

        if (categoryEntities.length) {
          await this.smartstoreCategoryRepository.save(categoryEntities);
        }
  
        console.log(`🚀 스마트스토어 카테고리 저장 완료`);

        return {
          message: `스마트스토어 리프 카테고리 ${categoryEntities.length}개 저장 완료`,
          count: categoryEntities.length,
        };

    } catch (error: any) {
      console.error(`❌ 스마트스토어 카테고리 저장 실패:`, error.message);
      throw error;
    }
  }
  
    /**
    * 저장된 스마트스토어 카테고리 조회
    */
    async getStoredSmartstoreCategories() {
      return await this.smartstoreCategoryRepository.find();
    }
  

  createClientSecretSign( auth: {
    smartStoreID: string,
    smartStoreSecret: string,
  }, timestamp:number) {
    const clientId = auth.smartStoreID;
    const clientSecret =auth.smartStoreSecret;

    // 밑줄로 연결하여 password 생성
    const password = `${clientId}_${timestamp}`;
    // bcrypt 해싱
    const hashed = bcrypt.hashSync(password, clientSecret);
    return Buffer.from(hashed, 'utf-8').toString('base64');
  }

  async excute(
    url: string,
    method: string,
    args: {
      data?: any;
      params?: any;
      headers?: any;
    },
    auth: {
      smartStoreID: string,
      smartStoreSecret: string,
    },
  ) {

    if (!url.includes('oauth2/token') && !this.acceessTokenStore[auth.smartStoreID]) {
     const result = await this.getAccessToken(auth);
      this.acceessTokenStore[auth.smartStoreID] = result.access_token;
    }

    try {
      const result = await this.httpClient({
        url,
        method,
        data: args.data,
        params: args.params,
        headers: {
          Authorization: `Bearer ${this.acceessTokenStore[auth.smartStoreID]}`,
          ...args.headers,
        },
      });

      return result;
    } catch (e: any) {
      if (e?.response?.status === 401) {
        delete this.acceessTokenStore[auth.smartStoreID];
        console.info('JWT 재요청')
        return this.excute(url, method, args, auth);
      } else if (e?.response?.status === 429) {
        console.info('429 에러')
        await setTimeout(1000);
        return this.excute(url, method, args, auth);
      }
      throw e;
    }
  }
  async getAccessToken(auth:{
    smartStoreID: string,
    smartStoreSecret: string,
  }) {
    const timestamp =  Date.now() - 1000
    const result = await this.excute('/v1/oauth2/token', 'post', {
      params: {
        client_id: auth.smartStoreID,
        timestamp: timestamp,
        client_secret_sign: this.createClientSecretSign(auth, timestamp),
        grant_type: 'client_credentials',
        type: 'SELF',
      },
    }, auth);

    return result.data;
  }

  async getBrandList(auth:{
    smartStoreID: string,
    smartStoreSecret: string,
  }) {
    const result = await this.excute('/v1/product-brands', 'get', {
     params : {
    name : '테스트'
     }
    }, auth);

    return result.data;
  }

  
  async uploadProductImageList(
    auth:{smartStoreID: string,smartStoreSecret: string,},
    base64ImageList: string[],
    originThumbnailUrls:string[]
  ) {

    const formData =  new FormData();

    let i = 0;
    for (const base64Image of base64ImageList) {
      const buffer = Buffer.from(base64Image, "base64");
      const normalizedImage = await this.normalizeMarketplaceImage(
        buffer,
        originThumbnailUrls[i],
      );
      formData.append(
        'imageFiles',
        normalizedImage.buffer,
        normalizedImage.fileName,
      );
      i++;
    }

    const result = await this.excute('/v1/product-images/upload', 'post', {
      data : formData,
      headers : formData.getHeaders()
    }, auth);

    return result.data;
  }

  



  public async createProduct(auth:{
    smartStoreID: string,
    smartStoreSecret: string,
  }, data: any) {
    this.applyDefaultDetailAttribute(data);

    const result = await this.excute('/v2/products','POST', {
      data,
    }, auth); 

    return result.data;
  }

  public async updateProduct(
    auth:{
      smartStoreID: string,
      smartStoreSecret: string,
    },
    productId: string,
    data: any,
  ) {
    try {
      this.applyDefaultDetailAttribute(data);

      const result = await this.excute(`/v2/products/channel-products/${productId}`,'PUT', {
        data,
      }, auth); 


      return result.data;
    } catch (e: any) {
      throw e;
    }
  }

  public async deleteProduct(
    auth:{
      smartStoreID: string,
      smartStoreSecret: string,
    },
    productId: string,
  ) {
    try {

      const result = await this.excute(`/v2/products/channel-products/${productId}`,'DELETE', {
        data : {},
      }, auth); 


      return result.data;
    } catch (e: any) {
      throw e;
    }
  }
}
