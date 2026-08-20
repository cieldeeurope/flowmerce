import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { GodoMallService } from 'src/godomall/godomall.service';
import { Repository } from 'typeorm';
import { R2Service } from '../cloudflare/r2.service';
import { Product } from 'src/product/product.entity';
import { Mapping } from 'src/mapping/mapping.entity';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import * as cheerio from 'cheerio';
import { SmartstoreService } from 'src/smartstore/smartstore.service';
import { SmartstoreApiService } from 'src/smartstore/smartstore-api.service';
import { Cafe24Service } from 'src/cafe24/cafe24.service';
import { MakeshopService } from 'src/makeshop/makeshop.service';
import { HostingAccount } from 'src/hosting/hostingaccount.entity';
import { UpdateGateway } from 'src/update/update.gateway';
import { UserService } from 'src/user/user.service';


/*
* crawler.service.ts 는 생로랑 크롤링 ts 파일임.
*/


function parseAuthProxy(line: string) {
  if (line.includes('|')) {
    const [hostport, auth] = line.split('|');
    const [host, port] = hostport.split(':');
    const [username, password] = auth.split(':');
    return { host, port: Number(port), username, password };
  }
  const [auth, hostport] = line.split('@');
  const [username, password] = auth.split(':');
  const [host, port] = hostport.split(':');
  return { host, port: Number(port), username, password };
}

let proxyIndex = -1;

function pickProxy(proxyLines: string[]) {
  if (!proxyLines.length) {
    throw new Error('프록시 없음');
  }

  // 최초 1회: 랜덤
  if (proxyIndex === -1) {
    proxyIndex = Math.floor(Math.random() * proxyLines.length);
  } else {
    // 이후: 다음 프록시
    proxyIndex = (proxyIndex + 1) % proxyLines.length;
  }

  const raw = proxyLines[proxyIndex];
  return parseAuthProxy(raw);
}


function loadProxies(): string[] {
    const filePath = '\\\\CHANMIN\\Desktop\\CleanIP(유료프록시).txt';
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    return fileContent.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  }

function getRandomProxy(proxies: string[]): string {
  const randomIndex = Math.floor(Math.random() * proxies.length);
  return proxies[randomIndex];
}

// 에러 로그 저장 경로 (lv 폴더 안)
// const errorLogDir = path.join(
//   '\\\\CHANMIN\\Desktop\\크롤링\\에러로그',
//   'ysl'
// );

// // 폴더 없으면 생성
// if (!fs.existsSync(errorLogDir)) {
//   fs.mkdirSync(errorLogDir, { recursive: true });
// }

// // 최종 로그 파일 경로
// const errorLogPath = path.join(errorLogDir, 'ysl_error_log.txt');

// // 에러 저장 함수
// function //logErrorToDesktop(error: any, context: string = '') {
//   try {
//     const timestamp = new Date().toISOString();
//     const message = `[${timestamp}] ${context} - ${error?.message || error}\n`;

//     fs.appendFileSync(errorLogPath, message, 'utf-8');
//     console.error(message); // 기존 콘솔 출력도 유지
//   } catch (fileError) {
//     console.error('❌ 에러 로그 저장 실패:', fileError.message);
//   }
// }

@Injectable()
export class CrawlerService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    private readonly godoMallService: GodoMallService,
    private readonly r2Service: R2Service,
    private readonly smartstoreService: SmartstoreService,
    private readonly smartstoreApiService: SmartstoreApiService,
    private readonly cafe24Service: Cafe24Service,
    private readonly makeshopService: MakeshopService,
    private readonly gateway: UpdateGateway,
    @InjectRepository(Mapping) // 매핑된 카테고리
    private readonly mappingRepository: Repository<Mapping>,
    @InjectRepository(HostingAccount)
    private readonly hostingAccountRepository: Repository<HostingAccount>,
    private readonly userService: UserService,

  ) {}


  
// 1. 카테고리 가져오기 (프록시 교체 및 재시도 로직 추가)
async getCategories(siteUrls: string[]): Promise<any[]> {
    const allCategories: any[] = [];

    for (const siteUrl of siteUrls) {
        let success = false;

        for (let attempt = 1; attempt <= 3 && !success; attempt++) {
            try {
                const html = await this.r2Service.getHtmlFromUrl2(siteUrl);
                const $ = cheerio.load(html || '');
                const categories: any[] = [];

                const parseMenu = (menuId: string, gender: string, categoryKey: string) => {
                    const root = $(`button[data-cs-override-id="${menuId}"]`).closest('li');
                    if (!root.length) return;

                    root.find(`ul[data-cs-override-id="${categoryKey}"]`).each((_, section) => {
                        const sectionEl = $(section);
                        const mainName = this.normalizeYslText(sectionEl.children('a').first().text());
                        if (!mainName) return;

                        sectionEl.find('ul li a[href]').each((__, link) => {
                            const subName = this.normalizeYslText($(link).text());
                            const href = $(link).attr('href') || '';
                            if (!subName || !href) return;
                            if (/VIEW ALL|SUMMER|SPRING/i.test(subName)) return;

                            categories.push({
                                categoryName: `${gender} - ${mainName} - ${subName}`,
                                url: this.normalizeYslUrl(href, siteUrl),
                            });
                        });
                    });
                };

                parseMenu('menu-women', 'Women', 'menu-category-women');
                parseMenu('menu-men', 'Men', 'menu-category-men');

                if (!categories.length) {
                    $('a[href]').each((_, link) => {
                        const href = $(link).attr('href') || '';
                        const url = this.normalizeYslUrl(href, siteUrl);
                        if (!url.includes('ysl.com') || url.toLowerCase().endsWith('.html')) return;
                        const name = this.normalizeYslText($(link).text());
                        if (!name || /VIEW ALL|SUMMER|SPRING/i.test(name)) return;
                        categories.push({ categoryName: name, url });
                    });
                }

                allCategories.push(...categories);
                console.log(`생로랑 카테고리 수집 완료: ${categories.length}`);
                success = true;
            } catch (error: any) {
                console.warn(`생로랑 카테고리 스냅샷 재시도 ${attempt}/3: ${siteUrl} - ${error.message}`);
            }
        }

        if (!success) {
            console.warn(`생로랑 카테고리 스냅샷 실패: ${siteUrl}`);
        }
    }

    const seen = new Set<string>();
    return allCategories.filter(category => {
        if (!category.url || seen.has(category.url)) return false;
        seen.add(category.url);
        return true;
    });
}

  private normalizeYslText(value: any): string {
    return String(value || '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
  }

  private parseYslPrice(value: any): number {
    const text = this.normalizeYslText(value);
    if (!text) return 0;
    const cleaned = text
      .replace(/[^\d.,]/g, '')
      .replace(/[.,](?=\d{3}(?:\D|$))/g, '')
      .replace(',', '.');
    const parsed = Number.parseFloat(cleaned);
    return Number.isFinite(parsed) ? Math.floor(parsed) : 0;
  }

  private normalizeYslUrl(value: any, baseUrl: string): string {
    const raw = this.normalizeYslText(value).replace(/&amp;/g, '&').replace(/\\u002F/g, '/').replace(/\\\//g, '/');
    if (!raw) return '';
    try {
      if (raw.startsWith('//')) return `https:${raw}`;
      if (raw.startsWith('/')) return new URL(raw, baseUrl).href;
      return new URL(raw, baseUrl).href;
    } catch {
      return raw;
    }
  }

  private pickYslSrcset(value: any, baseUrl: string): string {
    const srcset = this.normalizeYslText(value);
    if (!srcset) return '';
    const last = srcset.split(',').map(part => part.trim().split(/\s+/)[0]).filter(Boolean).pop();
    return this.normalizeYslUrl(last, baseUrl);
  }

  private parseYslProductUrls(html: string, siteUrl: string): string[] {
    const $ = cheerio.load(html || '');
    const urls = new Set<string>();

    $('article, li[id^="grid-item"], [class*="product"]').each((_, element) => {
      const card = $(element);
      const cardText = this.normalizeYslText(card.text()).toLowerCase();
      if (
        cardText.includes('notify me') ||
        cardText.includes('pre-order') ||
        cardText.includes('pre order') ||
        cardText.includes('preorder') ||
        cardText.includes('sold out') ||
        cardText.includes('out of stock')
      ) {
        return;
      }

      card.find('a[href]').each((__, anchor) => {
        const href = $(anchor).attr('href') || '';
        const url = this.normalizeYslUrl(href, siteUrl);
        if (!url.includes('ysl.com') || !url.toLowerCase().endsWith('.html')) return;
        urls.add(url.split('?')[0].split('#')[0]);
      });
    });

    if (!urls.size) {
      $('a[href*=".html"]').each((_, anchor) => {
        const href = $(anchor).attr('href') || '';
        const text = this.normalizeYslText($(anchor).closest('article, li, div').text()).toLowerCase();
        if (text.includes('pre-order') || text.includes('preorder') || text.includes('notify me')) return;
        const url = this.normalizeYslUrl(href, siteUrl);
        if (!url.includes('ysl.com') || !url.toLowerCase().endsWith('.html')) return;
        urls.add(url.split('?')[0].split('#')[0]);
      });
    }

    return Array.from(urls);
  }

  private buildYslCategoryApiUrl(siteUrl: string, page: number): string {
    const url = new URL(siteUrl);
    const segments = url.pathname.split('/').filter(Boolean);
    const locale = segments[0] || 'en-de';
    const caIndex = segments.indexOf('ca');
    const categorySegments = caIndex >= 0 ? segments.slice(caIndex + 1) : segments.slice(1);

    if (!categorySegments.length) {
      throw new Error('YSL category path not found.');
    }

    const genderSegment = categorySegments[0] || '';
    const gender = genderSegment.replace(/^shop-/, '');
    const categoryPath = categorySegments.join(',');
    const categoryIds = genderSegment.startsWith('shop-')
      ? [...categorySegments.slice(1).reverse(), gender].filter(Boolean).join('-')
      : categorySegments.slice().reverse().join('-');

    const apiUrl = new URL(`https://www.ysl.com/api/v1/category/${categoryPath}`);
    apiUrl.searchParams.set('locale', locale);
    apiUrl.searchParams.set('page', String(page));
    apiUrl.searchParams.set('categoryIds', categoryIds);
    apiUrl.searchParams.set('isEmployeeOnly', 'false');
    apiUrl.searchParams.set('isEmployee', 'false');
    apiUrl.searchParams.set('clickAnalytics', 'true');
    apiUrl.searchParams.set('hitsPerPage', '100');
    apiUrl.searchParams.set('enableABTest', 'true');
    apiUrl.searchParams.set('enablePersonalization', 'false');

    return apiUrl.href;
  }

  private parseYslCategoryApiJson(value: string): any {
    const text = String(value || '').trim();
    if (!text) return null;

    try {
      return JSON.parse(text);
    } catch {
      const start = text.indexOf('{');
      const end = text.lastIndexOf('}');
      if (start >= 0 && end > start) {
        return JSON.parse(text.slice(start, end + 1));
      }
    }

    return null;
  }

  private parseYslProductUrlsFromCategoryApi(apiJson: any, siteUrl: string): { urls: string[]; nbSfccHits: number | null } {
    const stats = apiJson?.stats || {};
    const nbSfccHits = typeof stats.nbSfccHits === 'number' ? stats.nbSfccHits : null;
    const products = Array.isArray(apiJson?.products) ? apiJson.products : [];
    const hitsAlgolia = Array.isArray(apiJson?.hitsAlgolia) ? apiJson.hitsAlgolia : [];
    const urls: string[] = [];

    products.forEach((product: any, index: number) => {
      const hit = hitsAlgolia[index] || {};
      const inStock = hit?.inStock;
      const stock = Number(hit?.stock);
      const productText = JSON.stringify({ product, hit }).toLowerCase();

      if (inStock === false || (Number.isFinite(stock) && stock <= 0)) return;
      if (productText.includes('pre-order') || productText.includes('preorder') || productText.includes('notify_me')) return;

      const rawUrl = product?.url || product?.smcUrl || product?.productUrl || product?.href || '';
      const normalizedUrl = this.normalizeYslUrl(rawUrl, siteUrl).split('?')[0].split('#')[0];
      if (!normalizedUrl.includes('ysl.com') || !normalizedUrl.toLowerCase().endsWith('.html')) return;

      urls.push(normalizedUrl);
    });

    return { urls, nbSfccHits };
  }

  private async getYslCategoryApiPage(siteUrl: string, page: number): Promise<{ page: number; urls: string[]; nbSfccHits: number }> {
    const apiUrl = this.buildYslCategoryApiUrl(siteUrl, page);
    let lastError: any = null;

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const apiText = await this.r2Service.getTextFromUrl2(apiUrl);
        const apiJson = this.parseYslCategoryApiJson(apiText);
        const parsed = this.parseYslProductUrlsFromCategoryApi(apiJson, siteUrl);

        if (parsed.nbSfccHits === null) {
          throw new Error('YSL category API nbSfccHits missing');
        }

        return { page, urls: parsed.urls, nbSfccHits: parsed.nbSfccHits };
      } catch (error: any) {
        lastError = error;
        console.warn(`생로랑 category API 재시도 ${attempt}/3: page=${page} - ${error.message}`);
        await new Promise(resolve => setTimeout(resolve, 1200 * attempt));
      }
    }

    throw lastError || new Error(`YSL category API failed: page=${page}`);
  }

  private async collectYslProductUrlsFromCategoryApi(siteUrl: string): Promise<string[]> {
    const urls = new Set<string>();
    const batchSize = 3;
    const maxPages = 30;

    for (let startPage = 0; startPage < maxPages; startPage += batchSize) {
      const pages = Array.from({ length: batchSize }, (_, index) => startPage + index);
      const results = await Promise.all(pages.map(page => this.getYslCategoryApiPage(siteUrl, page)));

      for (const result of results) {
        result.urls.forEach(url => urls.add(url));
      }

      if (results.some(result => result.nbSfccHits === 0)) {
        break;
      }
    }

    return Array.from(urls);
  }

  private parseYslProductDetails(html: string, productUrl: string) {
    const $ = cheerio.load(html || '');
    const site = 'YSL';
    const designer = '생로랑';
    let nextProduct: any = null;
    try {
      const nextRaw = $('#__NEXT_DATA__').html();
      if (nextRaw) {
        const nextData = JSON.parse(nextRaw);
        nextProduct = nextData?.props?.pageProps?.product || null;
      }
    } catch {}
    const bodyText = this.normalizeYslText($('body').text() || html);
    const ctaText = $('button')
      .filter((_, button) => {
        const text = this.normalizeYslText($(button).text());
        return ($(button).attr('data-qa') || '') === 'pdp-cta-btn' ||
          /ADD TO CART|PRE-ORDER|PRE ORDER|PREORDER|NOTIFY ME|FIND IN STORE/i.test(text);
      })
      .map((_, button) => this.normalizeYslText($(button).text()).toUpperCase())
      .get()
      .join(' ');

    const yslCtaSoldOut =
      ctaText.includes('PRE-ORDER') ||
      ctaText.includes('PRE ORDER') ||
      ctaText.includes('PREORDER') ||
      ctaText.includes('NOTIFY ME') ||
      ctaText.includes('FIND IN STORE');

    const title = this.normalizeYslText(
      $('h1[data-qa="pdp-product-title"]').first().text() ||
      $('h1').first().text() ||
      nextProduct?.name,
    );
    const price = this.parseYslPrice(
      $('span[data-qa="pdp-price-field"]').first().text() ||
      $('[data-qa*="price"]').first().text(),
    );
    const color = this.normalizeYslText(
      $('.sc-15b44914-2.uWfDk p').first().text() ||
      nextProduct?.microColor ||
      nextProduct?.macroColor,
    );

    const imageUrls: string[] = [];
    const pushImageUrl = (value: any) => {
      const url = this.normalizeYslUrl(value, productUrl);
      if (url && /^https?:\/\//i.test(url) && !imageUrls.includes(url)) {
        imageUrls.push(url);
      }
    };
    $('img[data-qa^="pdp-product-image"], img[srcset*="ysl"], img[src*="ysl"]').each((_, image) => {
      const srcsetUrl = this.pickYslSrcset($(image).attr('srcset'), productUrl);
      const srcUrl = this.normalizeYslUrl($(image).attr('src'), productUrl);
      pushImageUrl(srcsetUrl || srcUrl);
    });
    [nextProduct?.images, nextProduct?.image, nextProduct?.thumbnail].flat().filter(Boolean).forEach((image: any) => {
      pushImageUrl(this.pickYslSrcset(image?.srcset, productUrl) || image?.src);
    });

    const unavailableSizeText = (value: string) =>
      /notify\s*me|find\s*in\s*store|sold\s*out|pre-?order|join\s*the\s*waitlist/i.test(value);
    const normalizeSizeText = (value?: string | null) =>
      this.normalizeYslText(value)
        .replace(/\s*-\s*(join the waitlist|notify me|find in store|sold out|pre-?order).*$/i, '')
        .trim();

    const sizeSet = new Set<string>();
    const addSize = (value?: string | null, disabled = false) => {
      const raw = this.normalizeYslText(value);
      const clean = normalizeSizeText(raw);
      if (!clean || /^(YSL SIZE|select size)$/i.test(clean) || disabled || unavailableSizeText(raw)) return;
      sizeSet.add(clean);
    };

    $('#pdp-size-selector li button, [aria-labelledby="pdp-size-selector"] li button').each((_, button) => {
      const classes = $(button).attr('class') || '';
      const disabled =
        $(button).attr('disabled') !== undefined ||
        $(button).attr('aria-disabled') === 'true' ||
        /disabled|unavailable|notify/i.test(classes);
      addSize($(button).text(), disabled);
    });

    if (!sizeSet.size) {
      const dropdown = $('[data-qa="pdp-size-dropdown"], button[aria-controls="pdp-size-selector"]').first();
      const selected = normalizeSizeText(dropdown.find('.sc-382e1b15-1').first().text()) ||
        dropdown.find('span').toArray()
          .map(span => normalizeSizeText($(span).text()))
          .find(text => text && !/^YSL SIZE$/i.test(text) && /\d/.test(text));
      addSize(selected);
    }

    const hasSizeSelector = Boolean(
      $('#pdp-size-selector, [aria-labelledby="pdp-size-selector"], [data-qa="pdp-size-dropdown"], button[aria-controls="pdp-size-selector"]').length,
    );
    const size = sizeSet.size ? Array.from(sizeSet).join(', ') : hasSizeSelector ? '' : '원사이즈';

    let mainInfo = this.normalizeYslText($('.sc-297d5523-0.kLbKPo p').first().text());
    const detailLines = $('ul.rte li').map((_, li) => this.normalizeYslText($(li).text())).get().filter(Boolean);
    if (detailLines.length) {
      mainInfo = [mainInfo, ...detailLines].filter(Boolean).join('<br/>');
    }
    if (!mainInfo) {
      const styleIndex = bodyText.search(/STYLE\s*ID/i);
      mainInfo = styleIndex >= 0 ? bodyText.slice(Math.max(0, styleIndex - 500), styleIndex + 500) : bodyText.slice(0, 1200);
    }
    const nextInfoParts = [
      nextProduct?.description,
      nextProduct?.compositionDetailsDisplay,
      nextProduct?.productCare,
    ]
      .map(value => this.normalizeYslText(String(value || '').replace(/<br\s*\/?>/gi, '\n')))
      .filter(Boolean);
    if (nextInfoParts.length) {
      mainInfo = [mainInfo, ...nextInfoParts]
        .filter(Boolean)
        .filter((value, index, list) => list.indexOf(value) === index)
        .join('<br/>');
    }

    const styleIdMatch =
      mainInfo.match(/STYLE\s*ID\s*([\w\d]+)/i) ||
      productUrl.match(/-([A-Z0-9]{6,})\.html/i) ||
      productUrl.match(/\/([A-Z0-9]{6,})\.html/i);
    const madeInMatch = mainInfo.match(/Made\s*in\s*([A-Za-z]+)/i);
    const styleId = this.normalizeYslText(
      nextProduct?.id ||
      nextProduct?.smcId ||
      styleIdMatch?.[1] ||
      '',
    ).toUpperCase();
    const madeIn = this.normalizeYslText(nextProduct?.madeIn || (madeInMatch ? madeInMatch[1] : ''));
    const soldOut = yslCtaSoldOut || !price || !size;

    return {
      site,
      designer,
      title,
      price,
      color,
      mainInfo,
      madeIn,
      styleId,
      size,
      brandstyleId: styleId,
      imageUrls,
      soldOut,
    };
  }

  private async uploadImageToR2(imageUrl: string, fileName: string, product: Product): Promise<string> {
    try {
        if (!imageUrl) {
            console.error('이미지 URL이 유효하지 않습니다:', imageUrl);
            throw new Error('유효하지 않은 이미지 URL');
        }

        
if (product.platform === 'smartstore' || product.platform === 'cafe24') {
        
  return imageUrl;
        
}

        
        

        // 이미지 다운로드
        const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
        const imageBuffer = Buffer.from(response.data, 'binary'); // 이미지 데이터를 버퍼로 변환

        // R2에 이미지 업로드
        const r2ImageUrl = await this.r2Service.uploadImageToR2(fileName, imageBuffer, product);
        return r2ImageUrl; // 업로드된 이미지의 URL 반환
    } catch (error: any) {
        console.error(`이미지 업로드 실패: ${error.message}`);
        //logErrorToDesktop(error, `1.오류 발생`);
        throw error;
    }
}

  // YSL 사이트 크롤링 시작
async getProductsFromCategory(siteUrl: string, partnerKey: string,apiKey: string, customId:string, accountPlatform:string, godoMallCategoryCode: string): Promise<void> {
    const account = await this.hostingAccountRepository.findOne({
      where: { customId, accountPlatform },
    });
    if (!account) {
      console.error(`Account not found: ${customId} / ${accountPlatform}`);
      return;
    }

    let resolvedPartnerKey = partnerKey;
    let resolvedApiKey = apiKey;

    if (account?.platform === 'cafe24') {
      const cafe24Auth = await this.cafe24Service.getAuthConfigFromHostingAccount({
        customId,
        accountPlatform,
      });
      resolvedPartnerKey = cafe24Auth.mallId;
      resolvedApiKey = cafe24Auth.accessToken;
    }

    const category = await this.mappingRepository.findOne({
      where: { customId, accountPlatform, siteUrl },
    });
    if (!category) {
      throw new Error('YSL mapping category not found.');
    }

    let productUrls: string[] = [];

    try {
      productUrls = await this.collectYslProductUrlsFromCategoryApi(siteUrl);
    } catch (error: any) {
      console.warn(`생로랑 category API 수집 실패 → HTML fallback: ${error.message}`);
    }

    if (!productUrls.length) {
      const categoryHtml = await this.r2Service.getHtmlFromUrl2(siteUrl);
      productUrls = this.parseYslProductUrls(categoryHtml, siteUrl);
    }

    if (!productUrls.length) {
      throw new Error('생로랑 상품 URL 스냅샷 수집 실패');
    }

    console.log(`생로랑 최종 수집된 상품 URL 수: ${productUrls.length} - ${category.categoryName || '카테고리 없음'}`);

    const processYslProduct = async (productUrl: string, index: number): Promise<void> => {
      let productDetails: any = null;
      let soldOutProduct = false;

      console.log(`✅ (${index + 1}/${productUrls.length}) 생로랑 ${category.categoryName || '카테고리 없음'}  수집 중`);

      for (let retryCount = 1; retryCount <= 3; retryCount++) {
        try {
          const productHtml = await this.r2Service.getHtmlFromUrl2(productUrl);
          productDetails = this.parseYslProductDetails(productHtml, productUrl);

          if (productDetails?.soldOut) {
            soldOutProduct = true;
            console.log(`생로랑 품절 상품 제외: ${productUrl}`);
            break;
          }

          const missingFields = [
            !productDetails ? 'productDetails' : '',
            productDetails && !productDetails.mainInfo ? `mainInfo(length=${productDetails?.mainInfo?.length || 0})` : '',
            productDetails && !productDetails.styleId ? 'styleId' : '',
            productDetails && !productDetails.title ? 'title' : '',
            productDetails && !productDetails.price ? `price(value=${productDetails?.price || 0})` : '',
            productDetails && !productDetails.imageUrls?.length ? `imageUrls(count=${productDetails?.imageUrls?.length || 0})` : '',
            productDetails && !productDetails.size ? 'size' : '',
            productDetails && !productDetails.brandstyleId ? 'brandstyleId' : '',
          ].filter(Boolean);

          if (!missingFields.length) {
            break;
          }

          console.warn(`생로랑 데이터 누락 - 재시도 ${retryCount}/3: ${missingFields.join(', ')} - ${productUrl}`);
          productDetails = null;
          await new Promise(resolve => setTimeout(resolve, 1500 * retryCount));
        } catch (error: any) {
          console.warn(`생로랑 상품 스냅샷 재시도 ${retryCount}/3: ${productUrl} - ${error.message}`);
          await new Promise(resolve => setTimeout(resolve, 1500 * retryCount));
        }
      }

      if (soldOutProduct) {
        return;
      }

      if (!productDetails) {
        console.warn(`생로랑 상품 데이터 수집 실패: ${productUrl}`);
        return;
      }

      try {
        const existingProduct = await this.productRepository.findOne({
          where: {
            styleId: productDetails.styleId,
            customId,
            accountPlatform,
          },
        });

        const godoMallCategoryName = category.godoMallCategoryName;

        if (existingProduct) {
          console.log(`✅상품 업데이트: ${existingProduct.title} - styleID: ${existingProduct.styleId}`);
          existingProduct.siteUrl = siteUrl;
          existingProduct.size = productDetails.size;
          existingProduct.price = productDetails.price;
          existingProduct.touched = true;
          existingProduct.categoryName = category.categoryName;
          existingProduct.visitUrl = productUrl;
          existingProduct.godoMallCategoryCode = godoMallCategoryCode;

          let isSuccess = false;
          const platform = existingProduct.platform;

          if (platform === 'smartstore') {
            const auth = { smartStoreID: partnerKey, smartStoreSecret: apiKey };
            await this.userService.assertRequestAvailable(customId, 1);
            await this.smartstoreApiService.updateSmartStoreProduct(
              existingProduct,
              auth,
              partnerKey,
              undefined,
              godoMallCategoryName,
            );
            await this.userService.consumeRequest(customId, 1);
            isSuccess = true;
          } else if (platform === 'godomall') {
            const xmlUrl = await this.r2Service.uploadXmlToR2SmartStore(
              existingProduct.styleId,
              existingProduct,
              existingProduct.mainImageUrl,
              existingProduct.additionalImageUrls,
              partnerKey,
              apiKey,
            );
            await this.userService.assertRequestAvailable(customId, 1);
            await this.godoMallService.registerProductWithXmlUrl(
              partnerKey,
              apiKey,
              xmlUrl,
              existingProduct,
              existingProduct.styleId,
            );
            await this.userService.consumeRequest(customId, 1);
            isSuccess = true;
          } else if (platform === 'cafe24') {
            await this.userService.assertRequestAvailable(customId, 1);
            await this.cafe24Service.updateProductFromEntity({
              product: existingProduct,
              mallId: resolvedPartnerKey,
              accessToken: resolvedApiKey,
            });
            await this.userService.consumeRequest(customId, 1);
            isSuccess = true;
          } else if (platform === 'makeshop') {
            await this.userService.assertRequestAvailable(customId, 1);
            await this.makeshopService.updateProductFromEntity({
              product: existingProduct,
              shopId: partnerKey,
              apiKey,
            });
            await this.userService.consumeRequest(customId, 1);
            isSuccess = true;
          } else {
            console.warn('Unsupported platform: ' + platform);
          }

          if (isSuccess) {
            await this.productRepository.save(existingProduct);
          }
        } else {
          const newProductArray = this.productRepository.create(productDetails as Partial<Product>);
          const newProduct = Array.isArray(newProductArray) ? newProductArray[0] : newProductArray;

          newProduct.touched = true;
          newProduct.categoryName = category.categoryName;
          newProduct.customId = customId;
          newProduct.platform = account.platform;
          newProduct.accountPlatform = account.accountPlatform;
          newProduct.siteUrl = siteUrl;
          newProduct.color = productDetails.color;
          newProduct.visitUrl = productUrl;
          newProduct.godoMallCategoryCode = godoMallCategoryCode;

          const [mainImageUrl, ...restImages] = productDetails.imageUrls;
          const r2MainImageUrl = await this.uploadImageToR2(
            mainImageUrl,
            `${productDetails.styleId}-main.jpg`,
            newProduct,
          );
          newProduct.mainImageUrl = r2MainImageUrl;

          const additionalR2Urls: string[] = [];
          for (let i = 0; i < restImages.length; i++) {
            try {
              const r2Url = await this.uploadImageToR2(
                restImages[i],
                `${productDetails.styleId}-additional-${i + 1}.jpg`,
                newProduct,
              );
              additionalR2Urls.push(r2Url);
            } catch (e: any) {
              console.error('생로랑 추가 이미지 업로드 실패:', restImages[i], e.message);
            }
          }
          newProduct.additionalImageUrls = additionalR2Urls;

          const allR2Urls = [r2MainImageUrl, ...additionalR2Urls];
          let isSuccess = false;

          switch (newProduct.platform) {
            case 'smartstore': {
              await this.userService.assertRequestAvailable(customId, 1);
              await this.handleSmartstoreRegistration(
                newProduct,
                partnerKey,
                apiKey,
                { imageUrls: allR2Urls, referer: productUrl },
                godoMallCategoryName,
              );
              await this.userService.consumeRequest(customId, 1);
              isSuccess = true;
              break;
            }
            case 'godomall': {
              const xmlUrl = await this.r2Service.uploadXmlToR2SmartStore(
                newProduct.styleId,
                newProduct,
                newProduct.mainImageUrl,
                newProduct.additionalImageUrls,
                partnerKey,
                apiKey,
              );
              await this.userService.assertRequestAvailable(customId, 1);
              const result = await this.godoMallService.registerProductWithXmlUrl(
                partnerKey,
                apiKey,
                xmlUrl,
                newProduct,
                newProduct.styleId,
              );
              if (result) {
                isSuccess = true;
                await this.userService.consumeRequest(customId, 1);
              } else {
                console.warn(`❌ 상품 스킵됨: ${newProduct.site} - ${newProduct.styleId}`);
              }
              break;
            }
            case 'cafe24': {
              await this.userService.assertRequestAvailable(customId, 1);
              await this.cafe24Service.createProductFromEntity({
                product: newProduct,
                mallId: resolvedPartnerKey,
                accessToken: resolvedApiKey,
              });
              await this.userService.consumeRequest(customId, 1);
              isSuccess = true;
              break;
            }
            case 'makeshop': {
              await this.userService.assertRequestAvailable(customId, 1);
              await this.makeshopService.createProductFromEntity({
                product: newProduct,
                shopId: partnerKey,
                apiKey,
              });
              await this.userService.consumeRequest(customId, 1);
              isSuccess = true;
              break;
            }
            default: {
              console.warn(`Unsupported platform: ${newProduct.platform}`);
              break;
            }
          }

          if (isSuccess) {
            await this.productRepository.save(newProduct);
            console.log(`✅ 상품 저장 완료: ${productDetails.designer} ${productDetails.title}`);
          }
        }
      } catch (error: any) {
        const errorMessage = error?.message || 'unknown error';
        console.error(`생로랑 상품 등록 처리 실패 (${productUrl}): ${errorMessage}`);

        if (
          errorMessage.includes('요청 수 소진') ||
          errorMessage.includes('구독 기간이 만료') ||
          errorMessage.includes('플랜 구독 후 이용할 수 있습니다.') ||
          errorMessage.includes('요청 수 설정이 없습니다.')
        ) {
          throw error;
        }

        return;
      }
    }

    const productBatchSize = 15;
    const productTasks = productUrls.map((productUrl, index) => ({ productUrl, index }));

    for (let start = 0; start < productTasks.length; start += productBatchSize) {
      const batch = productTasks.slice(start, start + productBatchSize);
      await Promise.all(batch.map(task => processYslProduct(task.productUrl, task.index)));
    }

    switch (account.platform) {
      case 'smartstore': {
        await this.smartstoreApiService.deleteUnsoldSmartstoreProducts(
          siteUrl,
          customId,
          account.accountPlatform,
        );
        break;
      }
      case 'godomall': {
        await this.handleUnsoldProducts(
          siteUrl,
          partnerKey,
          apiKey,
          customId,
          account.accountPlatform,
        );
        await this.godoMallService.finalizeXmlDeletion();
        break;
      }
      case 'cafe24': {
        await this.handleUnsoldCafe24Products(
          siteUrl,
          resolvedPartnerKey,
          resolvedApiKey,
          customId,
          account.accountPlatform,
        );
        break;
      }
      case 'makeshop': {
        await this.handleUnsoldMakeshopProducts(
          siteUrl,
          partnerKey,
          apiKey,
          customId,
          account.accountPlatform,
        );
        break;
      }
      default: {
        console.warn(`Unsupported platform for unsold handling: ${account.platform}`);
        break;
      }
    }
}
      async handleUnsoldCafe24Products(siteUrl: string, mallId: string, accessToken: string, customId: string, accountPlatform: string) {
const unsoldProducts = await this.productRepository.find({
    where: { touched: false, siteUrl, customId, accountPlatform }
    });

    if (unsoldProducts.length === 0) {
    console.log('No unsold products: ' + siteUrl);
    } else {
    for (const product of unsoldProducts) {
        await this.userService.assertRequestAvailable(customId, 1);
        await this.cafe24Service.deleteProductFromEntity({
        product,
        mallId,
        accessToken,
        });
        await this.userService.consumeRequest(customId, 1);
        console.log('Deleted unsold product: ' + product.title + ' (styleId: ' + product.styleId + ')');
    }
    }

    try {
    const updateResult = await this.productRepository.update(
        { siteUrl, customId, accountPlatform },
        { touched: false }
    );

    console.log('Reset touched=false for siteUrl: ' + siteUrl);
    console.log('Updated count:', updateResult.affected);

    } catch (error: any) {
    console.error('Failed to reset touched state: ' + siteUrl, error.message);
    }
}

async handleUnsoldMakeshopProducts(siteUrl: string, shopId: string, apiKey: string, customId: string, accountPlatform: string) {
const unsoldProducts = await this.productRepository.find({
    where: { touched: false, siteUrl, customId, accountPlatform }
    });

    if (unsoldProducts.length === 0) {
    console.log('No unsold products: ' + siteUrl);
    } else {
    for (const product of unsoldProducts) {
        await this.userService.assertRequestAvailable(customId, 1);
        await this.makeshopService.deleteProductFromEntity({
        product,
        shopId,
        apiKey,
        });
        await this.userService.consumeRequest(customId, 1);
        console.log('Deleted unsold product: ' + product.title + ' (styleId: ' + product.styleId + ')');
    }
    }

    try {
    const updateResult = await this.productRepository.update(
        { siteUrl, customId, accountPlatform },
        { touched: false }
    );

    console.log('Reset touched=false for siteUrl: ' + siteUrl);
    console.log('Updated count:', updateResult.affected);

    } catch (error: any) {
    console.error('Failed to reset touched state: ' + siteUrl, error.message);
    }
}

async handleUnsoldProducts(siteUrl: string,partnerKey: string,apiKey: string, customId: string, accountPlatform: string) {
const unsoldProducts = await this.productRepository.find({
          where: { touched: false, siteUrl, customId, accountPlatform } 
          });
      
          if (unsoldProducts.length === 0) {
          console.log(`품절 처리할 상품이 없습니다: ${siteUrl}`);
          } else {
          // 2. 품절 처리 로직
          for (const product of unsoldProducts) {
              // 기본 카테고리 코드 정의
      
              
              // XML 파일 생성 (품절 처리)
              const xmlUrl = await this.r2Service.uploadXmlToR2(
              product.styleId,
              product,
              
              product.mainImageUrl, // product에서 바로 가져옴
              product.additionalImageUrls, // 추가 이미지들 사용
              partnerKey,
              apiKey
              );
          
              // 고도몰 API로 품절 처리 요청 전송
              await this.userService.assertRequestAvailable(customId, 1);
              await this.godoMallService.registerProductWithXmlUrl(partnerKey,apiKey,xmlUrl, product, product.styleId);
              await this.userService.consumeRequest(customId, 1);
          
              console.log(`생로랑 품절 처리 완료: ${product.title} (styleId: ${product.styleId})`);
          }
          }
      
          // 3. 해당 카테고리와 일치하는 모든 상품들의 touched 상태를 false로 초기화
          try {
          const updateResult = await this.productRepository.update(
              { siteUrl, customId, accountPlatform }, // 해당 카테고리의 상품들만 필터링
              { touched: false } // touched를 false로 초기화
          );
      
          // 4. 초기화 완료 로그 출력
          console.log(`해당 카테고리 (${siteUrl})의 모든 상품의 touched 상태가 false로 초기화되었습니다.`);
          console.log('업데이트된 행 수:', updateResult.affected); // 업데이트된 행 수 로그 출력
      
          } catch (error: any) {
          // 초기화 중 에러 발생 시 로그 출력
          console.error(`touched 상태 초기화 중 오류 발생: ${siteUrl}`, error.message);
          //logErrorToDesktop(error, `12.오류 발생`);
          }
      }
      
          
    async handleSmartstoreRegistration(
            product: Product, 
            partnerKey: string, 
            apiKey: string,
            imageData: { imageUrls: string[]; referer?: string },
            godoMallCategoryName: string,

          ) {
            const smartstoreAuth = { smartStoreID: partnerKey, smartStoreSecret: apiKey };
          
            if (product.smartstoreChannelProductNo) {
              console.log(`🔄 스마트스토어 상품 업데이트: ${product.title}`);
              await this.smartstoreService.updateProduct(
                smartstoreAuth, 
                product.smartstoreChannelProductNo.toString(),
                {
                  originProduct: {
                    name: product.title,
                    salePrice: product.price,
                    stockQuantity: 100,
                    detailContent: product.mainInfo,
                    images: {
                      representativeImage: { url: product.mainImageUrl },
                      optionalImages: product.additionalImageUrls.map(url => ({ url })), 
                    },
                    detailAttribute: {
                      optionInfo: {
                        useStockManagement: true,
                        optionCombinations: product.size.split(',').map((size, index) => ({
                          optionName1: size.trim(),
                          price: product.addoptionprice.split(',')[index] || '0',
                          stockQuantity: 100,
                        })),
                      },
                    },
                  },
                }
              );
            } else {
              console.log(`🆕 스마트스토어 신규 등록: ${product.designer} ${product.title}`);
              // imageData 객체를 추가 파라미터로 전달
              const response = await this.smartstoreApiService.createSmartStoreProduct(
                product,
                smartstoreAuth,
                imageData,
                godoMallCategoryName
              );
            }
          }
          
          async getProductUpdate(visitUrl: string, goodsNo: string, customId: string, accountPlatform: string){
    const account = await this.hostingAccountRepository.findOne({
        where: {
            customId,
            accountPlatform,
        },
    });

    if (!account) {
        console.error(`Account not found: ${customId} / ${accountPlatform}`);
        return;
    }

    const partnerKey = account.partnerKey;
    const apiKey = account.apiKey;
    const MAX_RETRY = 2;

    const product = await this.productRepository.findOne({
        where: {
            goodsno: Number(goodsNo),
            customId,
            accountPlatform,
        },
    });
    if (!product) return;

    for (let attempt = 1; attempt <= MAX_RETRY; attempt++) {
        try {
            const productHtml = await this.r2Service.getHtmlFromUrl2(visitUrl);
            const parsed = this.parseYslProductDetails(productHtml, visitUrl);
            const productDetails = {
                price: parsed.price,
                size: parsed.size,
                soldOut: parsed.soldOut || !parsed.price || !parsed.size,
            };

            if (!productDetails.soldOut) {
                product.lastModifiedDate = new Date();
                product.price = productDetails.price;
                product.size = productDetails.size;
                await this.productRepository.save(product);
            }

            const xmlUrl = await this.r2Service.uploadXmlToR2Update(
                product,
                product.styleId,
                partnerKey,
                productDetails.soldOut
            );

            if (!xmlUrl) {
                console.error(`XML upload failed -> ${product.designer} ${product.title}`);
                return;
            }

            await this.userService.assertRequestAvailable(customId, 1);
            await this.godoMallService.registerProductWithXmlUrl(
                partnerKey,
                apiKey,
                xmlUrl,
                product,
                product.styleId
            );
            await this.userService.consumeRequest(customId, 1);

            this.gateway.sendProductUpdate(
                `${customId}:${accountPlatform}:${goodsNo}`,
                {
                    status: 'success',
                    price: product.price,
                    size: product.size,
                    updatedAt: new Date().toISOString(),
                }
            );

            await this.godoMallService.finalizeXmlDeletion();

            console.log('✅ 생로랑 상품 업데이트 완료');
            return;
        } catch (err: any) {
            console.warn(`생로랑 스냅샷 업데이트 실패 (${attempt}/${MAX_RETRY}): ${err.message}`);
        }
    }
}
}
