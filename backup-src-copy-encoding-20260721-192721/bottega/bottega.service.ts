import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import puppeteer, { Page, Browser } from 'puppeteer';
import { GodoMallService } from 'src/godomall/godomall.service';
import { Repository } from 'typeorm';
import { R2Service } from '../cloudflare/r2.service';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { SmartstoreService } from 'src/smartstore/smartstore.service';
import { SmartstoreApiService } from 'src/smartstore/smartstore-api.service';
import { Cafe24Service } from 'src/cafe24/cafe24.service';
import { MakeshopService } from 'src/makeshop/makeshop.service';
import { HostingAccount } from 'src/hosting/hostingaccount.entity';
const sharp = require('sharp');
import { Product } from 'src/product/product.entity';
import { Mapping } from 'src/mapping/mapping.entity';
import { UpdateGateway } from 'src/update/update.gateway';
import { UserService } from 'src/user/user.service';
import * as cheerio from 'cheerio';


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
//   'bottega'
// );

// // 폴더 없으면 생성
// if (!fs.existsSync(errorLogDir)) {
//   fs.mkdirSync(errorLogDir, { recursive: true });
// }

// // 최종 로그 파일 경로
// const errorLogPath = path.join(errorLogDir, 'bottega_error_log.txt');

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
export class BottegaService {
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
async getCategories(siteUrls: string[]): Promise<{ categoryName: string; url: string }[]> {
    const allCategories: { categoryName: string; url: string }[] = [];
    const proxyLines = await this.r2Service.loadBrightProxies2();
    if (!proxyLines.length) {
        console.warn('프록시 없음, 종료');
        return;
    }

    // 랜덤으로 1개 선택
    const raw = proxyLines[Math.floor(Math.random() * proxyLines.length)];
    const proxy = parseAuthProxy(raw);
    const proxyArg = `--proxy-server=http://${proxy.host}:${proxy.port}`;
  
    async function processSiteUrls(urls: string[]): Promise<void> {
      for (const siteUrl of urls) {
        let retryCount = 0;
        let success = false;
  
        while (retryCount < 3 && !success) {
          console.log(`🌍 [${siteUrl}]`);
  
          const browser = await puppeteer.launch({
            headless: false,
            args: [
              proxyArg,
              '--remote-debugging-port=0',
              '--no-sandbox',
              '--disable-setuid-sandbox',
              '--disable-dev-shm-usage',
              '--disable-background-timer-throttling',
              '--disable-backgrounding-occluded-windows',
              '--disable-renderer-backgrounding',
              '--disable-session-crashed-bubble',
              '--no-first-run',
              '--disable-accelerated-2d-canvas',
              '--noerrdialogs',
            ],
          });
  
          const page = await browser.newPage();
          await page.authenticate({
            username: proxy.username,
            password: proxy.password,
          });
          await page.setUserAgent(
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36'
          );
          await page.setViewport({ width: 1920, height: 1080 });
  
          try {
            await page.goto(siteUrl, { waitUntil: 'networkidle2', timeout: 30000 });
            console.log(`🔍 ${siteUrl} 진행 중...`);
            await new Promise((resolve) => setTimeout(resolve, 2000));
  
            const bottegaCategories: { categoryName: string; url: string }[] = await page.evaluate(() => {
              const selectors = [
                'li[data-cgid="women"] ul.c-nav__level3list > li.c-nav__item:not([class*="u-hidden-from@lg"])',
                'li[data-cgid="men"] ul.c-nav__level3list > li.c-nav__item:not([class*="u-hidden-from@lg"])'
              ];
  
              const items: { categoryName: string; url: string }[] = [];
  
              selectors.forEach(selector => {
                document.querySelectorAll(selector).forEach(li => {
                  const a = li.querySelector('a[href]') as HTMLAnchorElement;
                  if (!a || !a.href) return;
  
                  const url = new URL(a.href, window.location.origin).href;
                  const match = url.match(/en-de\/([^?#]+)/);
                  const categoryPath = match ? match[1].split('/').join(' - ') : '';
  
                  if (url && categoryPath) {
                    items.push({ categoryName: categoryPath, url });
                  }
                });
              });
  
              return items;
            });
  
            allCategories.push(...bottegaCategories);
            console.log(`✅ 수집 완료: ${bottegaCategories.length}개`);
            success = true;
  
          } catch (error: any) {
            console.error(`❌ [${siteUrl}] 오류 발생: ${error.message}`);
            retryCount++;
            console.warn(`⚠️ [${siteUrl}] 재시도 (${retryCount}/3)...`);
          } finally {
            await browser.close();
          }
        }
  
        if (!success) {
          console.warn(`🚫 [${siteUrl}] 3회 시도 후 실패. 건너뜀.`);
        }
  
        console.log(`🔄 다음 URL로 이동...`);
      }
    }
  
    await processSiteUrls(siteUrls);
    console.log(`🎯 모든 사이트에서 카테고리 수집 완료!`);
    return allCategories;
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
    const response = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      timeout: 10000, // 타임아웃 설정
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36"
      }
    });
    let imageBuffer = Buffer.from(response.data, 'binary'); // 이미지 데이터를 버퍼로 변환

    // Sharp를 사용해서 이미지 메타데이터 확인 (형식 판별)
    const metadata = await sharp(imageBuffer).metadata();
    if (metadata.format === 'webp') {
      // JPEG로 변환
      imageBuffer = await sharp(imageBuffer)
        .jpeg() // png()를 사용하면 PNG로 변환 가능
        .toBuffer();
      // 파일 이름에 .jpg 확장자 적용 (필요한 경우)
      fileName = fileName.replace(/\.webp$/i, '.jpg');
    }

    // R2에 이미지 업로드
    const r2ImageUrl = await this.r2Service.uploadImageToR2(fileName, imageBuffer, product);
    return r2ImageUrl; // 업로드된 이미지의 URL 반환
  } catch (error: any) {
    console.error(`이미지 업로드 실패: ${error.message}`);
    //logErrorToDesktop(error, `1.오류 발생`);
    throw error;
  }
}

  // 자동 스크롤 함수
  private async autoScroll(page: Page) {
    await page.evaluate(async () => {
      let totalHeight = 0;
      const distance = 250;
      await new Promise<void>(resolve => {
        const timer = setInterval(() => {
          window.scrollBy(0, distance);
          totalHeight += distance;
          if (totalHeight >= document.body.scrollHeight) {
            clearInterval(timer);
            resolve();
          }
        }, 100);
      });
    });
  }

  private async getBottegaProductUrlsFromPage(page: Page): Promise<string[]> {
    return page.evaluate(() => {
      const urls = Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href]'))
        .map(a => {
          try {
            const url = new URL(a.getAttribute('href') || '', window.location.origin);
            url.hash = '';
            url.search = '';
            return url.href;
          } catch {
            return '';
          }
        })
        .filter(Boolean)
        .filter(url => {
          try {
            const parsed = new URL(url);
            const productCode = parsed.pathname.match(/-([A-Z0-9]{8,})\.html$/)?.[1] || '';
            return (
              parsed.hostname.includes('bottegaveneta.com') &&
              Boolean(productCode) &&
              /\d/.test(productCode) &&
              /[A-Z]/.test(productCode)
            );
          } catch {
            return false;
          }
        });

      return Array.from(new Set(urls));
    });
  }

  private async getBottegaLoadedProductCount(page: Page): Promise<number> {
    return (await this.getBottegaProductUrlsFromPage(page)).length;
  }

  private buildBottegaListingCandidateUrls(siteUrl: string): string[] {
    const candidates: string[] = [];
    const addCandidate = (params: Record<string, string>) => {
      try {
        const url = new URL(siteUrl);
        Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
        const href = url.href;
        if (!candidates.includes(href)) candidates.push(href);
      } catch {}
    };

    addCandidate({ start: '0', sz: '500' });
    addCandidate({ start: '0', sz: '300' });
    addCandidate({ sz: '500' });
    addCandidate({ sz: '300' });

    for (let pageIndex = 2; pageIndex <= 4; pageIndex++) {
      addCandidate({ page: String(pageIndex) });
    }

    return candidates;
  }

  private buildBottegaSnapshotListingUrl(siteUrl: string): string {
    return `${siteUrl}?start=0&sz=500`;
  }

  private normalizeBottegaProductLink(rawHref: string, baseUrl: string): string {
    try {
      const url = new URL(rawHref, baseUrl);
      url.hash = '';
      url.search = '';

      const productCode = url.pathname.match(/-([A-Z0-9]{8,})\.html$/)?.[1] || '';

      if (
        url.hostname.includes('bottegaveneta.com') &&
        productCode &&
        /\d/.test(productCode) &&
        /[A-Z]/.test(productCode)
      ) {
        return url.href;
      }
    } catch {}

    return '';
  }

  private parseBottegaProductUrlsFromListingHtml(html: string, listingUrl: string): string[] {
    let pageHtml = String(html || '');
    const trimmedHtml = pageHtml.trim();

    if ((trimmedHtml.startsWith('[') || trimmedHtml.startsWith('{')) && /page_html|html|markdown/i.test(trimmedHtml)) {
      try {
        const snapshot = JSON.parse(trimmedHtml);
        const first = Array.isArray(snapshot) ? snapshot[0] : snapshot;
        pageHtml = first?.page_html || first?.html || first?.body || first?.content || first?.markdown || pageHtml;
      } catch {}
    }

    const $ = cheerio.load(pageHtml || '');
    const urls = new Set<string>();
    const decodedHtml = pageHtml
      .replace(/\\u002F/g, '/')
      .replace(/\\\//g, '/')
      .replace(/&amp;/g, '&');
    const blockedContextPattern = /recommend|related|recent|similar|carousel|slider|editorial|wishlist|minicart|header|footer|nav/i;
    const tileSelectors = [
      'article',
      '[data-pid]',
      '[data-product-id]',
      '[data-productid]',
      '[data-ytos-product]',
      '[data-testid*="product" i]',
      '[class*="product-tile" i]',
      '[class*="producttile" i]',
      '[class*="product-card" i]',
      '[class*="productcard" i]',
      '[class*="c-product" i]',
      '.ais-Hits-item',
      '.ais-InfiniteHits-item',
      '[class*="product-grid" i] li',
      '[class*="product-grid" i] [class*="product" i]',
      '[class*="products-grid" i] [class*="product" i]',
      '[class*="l-productgrid" i] [class*="product" i]',
      '[class*="listing" i] [class*="product" i]',
    ];

    const hasBlockedContext = (element: any) => {
      let blocked = false;
      $(element)
        .parents()
        .each((_, parent) => {
          const contextText = [
            $(parent).attr('id'),
            $(parent).attr('class'),
            $(parent).attr('data-component'),
            $(parent).attr('data-testid'),
          ]
            .filter(Boolean)
            .join(' ');

          if (blockedContextPattern.test(contextText)) {
            blocked = true;
            return false;
          }

          return undefined;
        });
      return blocked;
    };

    const collectFrom = (selector: string) => {
      $(selector).each((_, container) => {
        if (hasBlockedContext(container)) return;

        if ($(container).is('a[href]')) {
          const url = this.normalizeBottegaProductLink($(container).attr('href') || '', listingUrl);
          if (url) urls.add(url);
        }

        $(container)
          .find('a[href]')
          .each((__, element) => {
            if (hasBlockedContext(element)) return;

            const url = this.normalizeBottegaProductLink($(element).attr('href') || '', listingUrl);
            if (url) urls.add(url);
          });
      });
    };

    tileSelectors.forEach(collectFrom);

    if (!urls.size) {
      $('a[href]').each((_, element) => {
        if (hasBlockedContext(element)) return;

        const url = this.normalizeBottegaProductLink($(element).attr('href') || '', listingUrl);
        if (url) urls.add(url);
      });
    }

    const productUrlPattern = /(?:https?:\/\/www\.bottegaveneta\.com)?\/[a-z]{2}-[a-z]{2}\/[^\s"'<>)]*?-[A-Z0-9]{8,}\.html/g;
    for (const match of decodedHtml.matchAll(productUrlPattern)) {
      const url = this.normalizeBottegaProductLink(match[0], listingUrl);
      if (url) urls.add(url);
    }

    return Array.from(urls);
  }

  private async collectBottegaProductUrlsFromListingCandidates(page: Page, siteUrl: string): Promise<string[]> {
    const collected = new Set<string>();

    for (const candidateUrl of this.buildBottegaListingCandidateUrls(siteUrl)) {
      try {
        await page.goto(candidateUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await new Promise((resolve) => setTimeout(resolve, 3000));

        for (let i = 0; i < 3; i++) {
          await page.evaluate(() => {
            window.scrollTo(0, document.body.scrollHeight);
            window.dispatchEvent(new Event('scroll'));
          });
          await new Promise((resolve) => setTimeout(resolve, 1500));
        }

        const urls = await this.getBottegaProductUrlsFromPage(page);
        urls.forEach(url => collected.add(url));
      } catch {}
    }

    return Array.from(collected);
  }

  private async clickBottegaLoadMoreButton(page: Page): Promise<boolean> {
    return page.evaluate(() => {
      const isVisible = (element: HTMLElement) => {
        const rect = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);
        return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
      };

      const candidates = Array.from(
        document.querySelectorAll<HTMLElement>('button, a[role="button"], a[href]'),
      );

      const loadMoreButton = candidates.find(element => {
        const label = [
          element.innerText,
          element.textContent,
          element.getAttribute('aria-label'),
          element.getAttribute('data-testid'),
          element.getAttribute('class'),
        ]
          .filter(Boolean)
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim()
          .toLowerCase();

        if (!/(load more|show more|view more|more products|mehr anzeigen|voir plus|mostra altro)/i.test(label)) {
          return false;
        }

        return (
          isVisible(element) &&
          element.getAttribute('disabled') === null &&
          element.getAttribute('aria-disabled') !== 'true'
        );
      });

      if (!loadMoreButton) return false;

      loadMoreButton.scrollIntoView({ block: 'center' });
      loadMoreButton.click();
      return true;
    });
  }

  private async scrollUntilFullyLoaded(page: Page): Promise<void> {
    let previousProductCount = await this.getBottegaLoadedProductCount(page);
    let stableCount = 0;
    let scrollCount = 0;
    const maxScrollCount = 80;
  
    while (stableCount < 3 && scrollCount < maxScrollCount) {
      scrollCount++;
      // 1. 현재 정의된 autoScroll 실행
      for (let i = 0; i < 3; i++) {
        await page.evaluate(() => {
          window.scrollTo(0, document.body.scrollHeight);
          window.dispatchEvent(new Event('scroll'));
        });
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
      const clickedLoadMore = await this.clickBottegaLoadMoreButton(page);
      if (clickedLoadMore) {
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
  

      // 3. 새로운 scrollHeight / 상품 수 확인
      const newProductCount = await this.getBottegaLoadedProductCount(page);
  
      // 4. 3번 연속 변화가 없으면 더 이상 로드된 게 없음
      if (newProductCount <= previousProductCount) {
        stableCount++;
      } else {
        previousProductCount = newProductCount;
        stableCount = 0;
      }

      if (stableCount >= 3) {
        break;
      }
  
      // 5. 값이 다르면 다시 반복
    }
  }

  // Bottega 사이트 크롤링 시작
  private normalizeText(value: any): string {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  private pickBottegaImageFromSrcset(srcset: string): string {
    const candidates = srcset.split(/\s*,\s*/).map(candidate => {
      const parts = candidate.trim().split(/\s+/);
      return {
        url: parts[0] || '',
        size: parts[1] ? parseInt(parts[1].replace('w', ''), 10) : 0,
      };
    }).filter(candidate => candidate.url);

    const selected =
      candidates.find(candidate => candidate.size === 2717) ||
      candidates.find(candidate => candidate.size === 1698) ||
      candidates.sort((a, b) => b.size - a.size)[0];

    return selected?.url || '';
  }

  private normalizeBottegaAssetUrl(rawUrl: string, productUrl: string): string {
    const value = this.normalizeText(rawUrl).replace(/&amp;/g, '&');
    if (!value) return '';

    try {
      if (value.startsWith('//')) return `https:${value}`;
      if (value.startsWith('/')) return new URL(value, productUrl).href;
      return value;
    } catch {
      return value;
    }
  }

  private parseBottegaJsonLd($: any): any {
    const items: any[] = [];

    const collect = (value: any) => {
      if (!value) return;
      if (Array.isArray(value)) {
        value.forEach(collect);
        return;
      }
      if (typeof value !== 'object') return;
      items.push(value);
      if (Array.isArray(value['@graph'])) collect(value['@graph']);
    };

    $('script[type="application/ld+json"]').each((_, element) => {
      const raw = ($(element).html() || '').trim();
      if (!raw) return;
      try {
        collect(JSON.parse(raw));
      } catch {}
    });

    return items.find(item => {
      const type = Array.isArray(item?.['@type']) ? item['@type'].join(' ') : item?.['@type'];
      return this.normalizeText(type).toLowerCase().includes('product');
    }) || {};
  }

  private parseBottegaPrice(value: any): number {
    if (typeof value === 'number') return Math.floor(value);
    const raw = this.normalizeText(value);
    if (!raw) return 0;
    const cleaned = raw
      .replace(/[^\d.,]/g, '')
      .replace(/[.,](?=\d{3}(?:\D|$))/g, '')
      .replace(',', '.');
    const parsed = Number.parseFloat(cleaned);
    return Number.isFinite(parsed) ? Math.floor(parsed) : 0;
  }

  private parseBottegaProductDetails(html: string, productUrl: string): any | null {
    let pageHtml = String(html || '');
    const trimmedHtml = pageHtml.trim();

    if ((trimmedHtml.startsWith('[') || trimmedHtml.startsWith('{')) && trimmedHtml.includes('page_html')) {
      try {
        const snapshot = JSON.parse(trimmedHtml);
        const first = Array.isArray(snapshot) ? snapshot[0] : snapshot;
        if (typeof first?.page_html === 'string' && first.page_html.trim()) {
          pageHtml = first.page_html;

          if (first.ld_json && !pageHtml.includes('id="brightdata-ld-json"')) {
            const ldJson = String(first.ld_json).replace(/<\/script/gi, '<\\/script');
            const ldJsonScript = `<script type="application/ld+json" id="brightdata-ld-json">${ldJson}</script>`;
            pageHtml = pageHtml.includes('</body>')
              ? pageHtml.replace('</body>', `${ldJsonScript}</body>`)
              : `${pageHtml}${ldJsonScript}`;
          }
        }
      } catch {}
    }

    const $ = cheerio.load(pageHtml || '');
    const productJson = this.parseBottegaJsonLd($);
    const site = 'Bottega';
    const designer = '보테가베네타';
    const title =
      this.normalizeText(productJson?.name) ||
      this.normalizeText($('h1.c-product__name').first().text());
    const offers = Array.isArray(productJson?.offers) ? productJson.offers : [productJson?.offers].filter(Boolean);
    const jsonOfferPrice = offers.map((offer: any) => this.parseBottegaPrice(offer?.price)).find(Boolean) || 0;
    const price =
      jsonOfferPrice ||
      this.parseBottegaPrice($('div.l-pdp__prices p.c-price__value--current').first().text());
    const color =
      this.normalizeText(productJson?.color) ||
      this.normalizeText($('span.l-pdp__colorname').first().text());
    const isHiddenElement = (element: any) => {
      const chain = [element, ...$(element).parents().toArray()];

      return chain.some(node => {
        const target = $(node);
        const className = target.attr('class') || '';
        const style = target.attr('style') || '';

        return (
          target.attr('hidden') !== undefined ||
          target.attr('aria-hidden') === 'true' ||
          /\bu-hidden\b/.test(className) ||
          /display\s*:\s*none/i.test(style) ||
          /visibility\s*:\s*hidden/i.test(style)
        );
      });
    };

    const soldOut = $('[data-action="showContactUs"], a.c-product__contactus')
      .filter((_, element) => {
        if (isHiddenElement(element)) return false;
        const text = this.normalizeText($(element).text());
        return $(element).attr('data-action') === 'showContactUs' || /contact us/i.test(text);
      })
      .length > 0;

    const imageUrls = Array.from(new Set(
      $('.c-pdp__topblockimages img, .c-pdp__bottomblockimages img')
        .map((_, element) => {
          const image = $(element);
          const srcset = image.attr('srcset') || image.attr('data-srcset') || '';
          const rawUrl = srcset
            ? this.pickBottegaImageFromSrcset(srcset)
            : image.attr('data-src') || image.attr('currentSrc') || image.attr('src') || '';
          return this.normalizeBottegaAssetUrl(rawUrl, productUrl);
        })
        .get()
        .filter(Boolean),
    ));
    const sizeElements = $('div.c-product__customsizecontainer [data-ref="listbox"] [role="option"]');
    let size = '원사이즈';

    size = '원사이즈';
    let sizeSoldOut = false;

    if (sizeElements.length > 0) {
      const sizeList = sizeElements
        .map((_, element) => {
          const option = $(element);
          if (option.attr('data-attr-value') === 'RESET') return null;

          const message = this.normalizeText(option.find('.c-customselect__option--msg').text());
          const isDisabled = /find in store/i.test(message);
          if (isDisabled) return null;

          const optionSize =
            this.normalizeText(option.find('.c-customselect__option--size').text()) ||
            this.normalizeText(option.attr('data-attr-value'));
          return optionSize || null;
        })
        .get()
        .filter(Boolean);

      if (!sizeList.length) {
        size = '';
        sizeSoldOut = true;
      } else {
        size = sizeList.join(', ');
      }
    }

    const longDesc = $('p.c-product__longdesc[data-bind="longDescription"]').first().html()?.trim() || '';
    const detailInfo = $('ul.c-product__detailinfo li.c-product__desccomposition')
      .map((_, element) => this.normalizeText($(element).text()))
      .get()
      .filter(Boolean)
      .join('<br/>');
    const shortDesc = this.normalizeText($('p.c-product__shortdesc[data-bind="shortDescription"]').first().text());
    const truncatedDesc = this.normalizeText($('[data-ref="pdpDescriptionTruncated"]').first().text());
    const mainInfo = [truncatedDesc, longDesc, detailInfo, shortDesc].filter(Boolean).join('<br/>');
    const madeIn = this.normalizeText($('p.c-product__madeinlabel span.c-product__madein').first().text());
    const styleId =
      this.normalizeText(productJson?.sku) ||
      this.normalizeText($('p.c-product__id span[data-bind="styleMaterialColor"]').first().text());
    const brandstyleId = styleId;

    const soldOutReason = [
      soldOut ? 'contactUs' : '',
      sizeSoldOut ? 'sizeSoldOut' : '',
    ].filter(Boolean).join(',');

    return { site, designer, title, price, color, mainInfo, madeIn, styleId, size, brandstyleId, imageUrls, soldOut: soldOut || sizeSoldOut, soldOutReason };
  }

  async getProductsFromCategory(siteUrl: string, partnerKey: string,apiKey: string, customId:string, accountPlatform:string, godoMallCategoryCode: string): Promise<void> {
    const account = await this.hostingAccountRepository.findOne({
      where: { customId, accountPlatform },
    });

    
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
    const serviceType = 'Bottega';
    let productUrls: string[] = [];

    const category = await this.mappingRepository.findOne({
      where: { customId: customId, accountPlatform: accountPlatform, siteUrl: siteUrl },
  });

    const snapshotListingUrl = this.buildBottegaSnapshotListingUrl(siteUrl);
    try {
      const listingHtml = await this.r2Service.getHtmlFromUrl2(snapshotListingUrl);
      productUrls = this.parseBottegaProductUrlsFromListingHtml(listingHtml, snapshotListingUrl);
    } catch (error: any) {
      console.warn(`Bottega snapshot product URL fetch failed: ${snapshotListingUrl} / ${error?.message || error}`);
    }

    if (productUrls.length === 0) {
      throw new Error('상품 URL을 수집하지 못했습니다. 모든 시도가 실패했습니다.');
    }
    console.log(`보테가 최종 수집된 상품 URL 수: ${productUrls.length} - ${category?.categoryName || '카테고리 없음'}`);

    const PRODUCT_DETAIL_CONCURRENCY = 15;
    const bottegaProcessStats = {
      processed: 0,
      soldOutSkipped: 0,
      missingSkipped: 0,
    };

    for (let chunkStart = 0; chunkStart < productUrls.length; chunkStart += PRODUCT_DETAIL_CONCURRENCY) {
      const chunk = productUrls.slice(chunkStart, chunkStart + PRODUCT_DETAIL_CONCURRENCY);
      const chunkEnd = chunkStart + chunk.length;
      await Promise.all(
        chunk.map(async (productUrl, offset) => {
      const index = chunkStart + offset;
      let productDetails: any | null = null;

      try {
        console.log(`✅ (${index + 1}/${productUrls.length}) 보테가 ${category?.categoryName || '카테고리 없음'}  수집 중`);
        const html = await this.r2Service.getHtmlFromUrl2(productUrl);
        productDetails = this.parseBottegaProductDetails(html, productUrl);
      } catch (error: any) {
        bottegaProcessStats.missingSkipped++;
        console.warn(`보테가 스냅샷 상세 수집 실패 - 다음 URL로 이동합니다: ${productUrl} / ${error?.message || error}`);
        return;
      }
      if (productDetails?.soldOut) {
        bottegaProcessStats.soldOutSkipped++;
        console.warn(`보테가 품절 스킵 (${index + 1}/${productUrls.length}): ${productDetails.styleId || productUrl} / reason=${productDetails.soldOutReason || 'unknown'}`);
        return;
      }

      if (
        !productDetails ||
        !productDetails.mainInfo ||
        !productDetails.styleId ||
        !productDetails.title ||
        !productDetails.price ||
        !productDetails.imageUrls.length ||
        !productDetails.size ||
        !productDetails.brandstyleId
      ) {
        bottegaProcessStats.missingSkipped++;
        console.warn(`⚠️ 보테가 데이터 누락 스킵 (${index + 1}/${productUrls.length})`);

        console.log('productUrl:', productUrl);

        if (!productDetails) console.log('❌ productDetails');
        if (!productDetails?.mainInfo) console.log('❌ mainInfo');
        if (!productDetails?.styleId) console.log('❌ styleId');
        if (!productDetails?.title) console.log('❌ title');
        if (!productDetails?.price) console.log('❌ price');
        if (!productDetails?.imageUrls?.length) console.log('❌ imageUrls');
        if (!productDetails?.size) console.log('❌ size');
        if (!productDetails?.brandstyleId) console.log('❌ brandstyleId');

        console.dir(productDetails, { depth: null });

        return;
      }

      // 카테고리 매핑 데이터 찾기
      const categoryMapping = await this.mappingRepository.findOne({ where: { siteUrl } });
      if (!categoryMapping) {
          throw new Error('매핑된 카테고리를 찾을 수 없습니다.');
      }

      try {
      bottegaProcessStats.processed++;
      const existingProduct = await this.productRepository.findOne({ where: {
        styleId: productDetails.styleId,
        customId: customId, 
        accountPlatform: accountPlatform
        }
      });
      
      if (existingProduct) {
        // 업데이트 로직
        console.log(`✅상품 업데이트: ${existingProduct.title} - styleID: ${existingProduct.styleId}`);
        
        // 상품 정보를 업데이트 (기존 데이터베이스 업데이트)
        existingProduct.siteUrl = siteUrl;
        existingProduct.size = productDetails.size;
        existingProduct.price = productDetails.price;
        existingProduct.touched = true;
        existingProduct.categoryName = category.categoryName;
        existingProduct.visitUrl = productUrl;
existingProduct.godoMallCategoryCode = godoMallCategoryCode;

        const godoMallCategoryName = category.godoMallCategoryName;

        let isSuccess = false;
        const platform = existingProduct.platform;

        if (platform === 'smartstore') {
          // ✅ 스마트스토어 수정
          const auth = {
            smartStoreID: partnerKey,
            smartStoreSecret: apiKey,
          };

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
          // ✅ 고도몰 등록
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

        // ✅ 성공했을 때만 저장
        if (isSuccess) {
          await this.productRepository.save(existingProduct);
        }

      } else {
        // ✅ 새 상품 생성
        const newProduct = this.productRepository.create({
          ...(productDetails as Record<string, any>),
        } as Partial<Product>);

        newProduct.touched = true;
        newProduct.categoryName = categoryMapping.categoryName;
        newProduct.customId = customId;
        newProduct.platform = account.platform; // ✅ smartstore / godomall
        newProduct.accountPlatform = account.accountPlatform; // ✅ smartstore_1
        newProduct.siteUrl = siteUrl;
        newProduct.color = productDetails.color;
        newProduct.visitUrl = productUrl;
newProduct.godoMallCategoryCode = godoMallCategoryCode;

        const godoMallCategoryName = category.godoMallCategoryName;

        // =========================
        // ✅ 이미지 R2 업로드
        // =========================

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
            console.error('추가 이미지 업로드 실패:', restImages[i], e.message);
          }
        }

        newProduct.additionalImageUrls = additionalR2Urls;

        const allR2Urls = [r2MainImageUrl, ...additionalR2Urls];

        // =========================
        // ✅ 플랫폼별 처리
        // =========================

        let isSuccess = false;
        switch (newProduct.platform) {

          // =========================
          // 🟢 SMARTSTORE
          // =========================
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

          // =========================
          // 🟢 GODOMALL
          // =========================
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

          // =========================
          // 🔴 UNKNOWN PLATFORM
          // =========================
          
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
            console.warn(`⚠️ 지원되지 않는 플랫폼: ${newProduct.platform}`);
            break;
          }
        }

        // =========================
        // ✅ DB 저장
        // =========================

        if (isSuccess) {
          await this.productRepository.save(newProduct);
          console.log(`✅ 상품 저장 완료: ${productDetails.designer} ${productDetails.title}`);
        } 
      }
    } catch (error: any) {
        const errorMessage = error?.message || '알 수 없는 오류';

        console.error(`상품 등록 처리 실패 (${productUrl}): ${errorMessage}`);

        if (
            errorMessage.includes('요청 수 소진') ||
            errorMessage.includes('구독 기간이 만료') ||
            errorMessage.includes('플랜 구독 후 이용할 수 있습니다.') ||
            errorMessage.includes('요청 수 설정이 없습니다.')
        ) {
            throw error; // 🔥 전체 스케줄 중단
        }

        return;
    }
      }));
    }

  console.log(
    `보테가 처리 요약: 처리시도 ${bottegaProcessStats.processed}, 품절스킵 ${bottegaProcessStats.soldOutSkipped}, 누락스킵 ${bottegaProcessStats.missingSkipped}, 전체 ${productUrls.length}`,
  );

  // ✅ 플랫폼 타입에 따른 품절 처리
  switch (account.platform) {
    case 'smartstore': {
      await this.smartstoreApiService.deleteUnsoldSmartstoreProducts(
        siteUrl,
        customId,
        account.accountPlatform, // ✅ smartstore_1
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
      console.warn(`⚠️ 지원되지 않는 플랫폼 (품절 처리): ${account.platform}`);
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
          
              console.log(`보테가 품절 처리 완료: ${product.title} (styleId: ${product.styleId})`);
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
          //logErrorToDesktop(error, `8.오류 발생`);
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
            godoMallCategoryName,
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
  console.error(`❌ 계정 없음: ${customId} / ${accountPlatform}`);
  return;
}

const partnerKey = account.partnerKey;
const apiKey = account.apiKey;
    const MAX_RETRY = 2;
    const proxyLines = await this.r2Service.loadBrightProxies2();
    
    const product = await this.productRepository.findOne({
        where: {
            goodsno: Number(goodsNo),
            customId,
            accountPlatform,
        },
    });
    if (!product) return;

    for (let attempt = 1; attempt <= MAX_RETRY; attempt++) {
        const proxy = pickProxy(proxyLines);
        const proxyArg = `--proxy-server=http://${proxy.host}:${proxy.port}`;

        let browser: Browser | null = null;
        let page: Page | null = null;

        try {
        browser = await puppeteer.launch({
          headless: false,
          args: [
            proxyArg,
            '--remote-debugging-port=0',
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding',
            '--disable-session-crashed-bubble',
            '--no-first-run',
            '--disable-accelerated-2d-canvas',
            '--noerrdialogs'
          ],
        });

        page = await browser.newPage();
        await page.authenticate({
          username: proxy.username,
          password: proxy.password,
        });

        await page.setUserAgent(
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36'
        );
        await page.setViewport({ width: 1920, height: 1080 });

        await page.goto(visitUrl, {waitUntil: 'networkidle2', timeout: 30000})
        // await new Promise(resolve => setTimeout(resolve, 3000));

        let productDetails = await page.evaluate(async () => {
          const parseBottegaUpdatePrice = (value: any) => {
            const cleaned = String(value || '')
              .replace(/\s+/g, ' ')
              .trim()
              .replace(/[^\d.,]/g, '')
              .replace(/[.,](?=\d{3}(?:\D|$))/g, '')
              .replace(',', '.');
            const parsed = Number.parseFloat(cleaned);
            return Number.isFinite(parsed) ? Math.floor(parsed) : 0;
          };

          let jsonPrice = 0;
          document.querySelectorAll('script[type="application/ld+json"]').forEach(script => {
            if (jsonPrice) return;
            try {
              const parsed = JSON.parse(script.textContent || '');
              const items = Array.isArray(parsed) ? parsed : [parsed];
              for (const item of items) {
                const type = Array.isArray(item?.['@type']) ? item['@type'].join(' ') : item?.['@type'];
                if (!String(type || '').toLowerCase().includes('product')) continue;
                const offers = Array.isArray(item?.offers) ? item.offers : [item?.offers].filter(Boolean);
                for (const offer of offers) {
                  jsonPrice = parseBottegaUpdatePrice(offer?.price);
                  if (jsonPrice) break;
                }
              }
            } catch {}
          });

          const priceElement = document.querySelector('div.l-pdp__prices p.c-price__value--current');
          const domPrice = priceElement ? parseBottegaUpdatePrice(priceElement.textContent) : 0;
          const price = jsonPrice || domPrice;
          const isVisibleContactUs = (element: Element) => {
            if (element.closest('.u-hidden, [hidden], [aria-hidden="true"]')) return false;

            const target = element as HTMLElement;
            const style = window.getComputedStyle(target);
            const rect = target.getBoundingClientRect();

            return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
          };

          const hasContactUs = Array.from(document.querySelectorAll('[data-action="showContactUs"], a.c-product__contactus'))
            .some(element => {
              if (!isVisibleContactUs(element)) return false;
              const text = String(element.textContent || '').replace(/\s+/g, ' ').trim();
              return element.getAttribute('data-action') === 'showContactUs' || /contact us/i.test(text);
            });

          const sizeElements = document.querySelectorAll('div.c-product__customsizecontainer [data-ref="listbox"] [role="option"]');

          let size = '원사이즈';
          let sizeSoldOut = false;

          // 사이즈 옵션 요소 자체가 없다면 '원사이즈'로 저장 (가방, 지갑 등 사이즈 옵션이 없는 상품)
          if (!sizeElements || sizeElements.length === 0) {
            size = '원사이즈';
          } else {
            const sizeList = Array.from(sizeElements)
              // "RESET" 옵션은 제외 (사이즈 선택이 아님)
              .filter(option => option.getAttribute('data-attr-value') !== 'RESET')
              // 재고 없는 옵션(메시지에 "Find in store" 포함) 제거
              .filter(option => {
                const msgSpan = option.querySelector('.c-customselect__option--msg');
                return !msgSpan || !/find in store/i.test(msgSpan.textContent || '');
              })
              // 각 옵션에서 사이즈 텍스트 추출
              .map(option => {
                const sizeSpan = option.querySelector('.c-customselect__option--size');
                return String(sizeSpan?.textContent || option.getAttribute('data-attr-value') || '').trim() || null;
              })
              // null 값 제거
              .filter(s => s);

            // 선택 가능한 사이즈가 전부 품절된 경우, 다음 상품으로 건너뛰도록 처리
            if (sizeList.length === 0) {
              console.log("⚠️ 모든 사이즈가 품절입니다. 다음 상품으로 이동합니다.");
              size = '';
              sizeSoldOut = true;
            }

            // 사이즈들을 콤마로 구분하여 문자열로 저장
            if (!sizeSoldOut) {
              size = sizeList.join(', ');
            }
          }

          if (!sizeElements || sizeElements.length === 0) {
            size = '원사이즈';
          }

          const soldOut = hasContactUs || sizeSoldOut || !price || !size || size.length === 0; // ✅ 둘 중 하나라도 없으면 품절
          return { price, size ,soldOut};
        });

        if (!productDetails) {
          productDetails = {
            price: 0,
            size: '',
            soldOut: true,
          };
        }

        if (!productDetails.soldOut) {
          // ✅ 정상일 때만 DB 업데이트
          product.lastModifiedDate = new Date();
          product.price = productDetails.price;
          product.size = productDetails.size;
          await this.productRepository.save(product);
        }

        // ✅ 1️⃣ XML 생성 및 R2 업로드
        const xmlUrl = await this.r2Service.uploadXmlToR2Update(
          product,
          product.styleId,
          partnerKey,
          productDetails.soldOut
        );

        // ✅ 업로드 실패 시 안전하게 중단
        if (!xmlUrl) {
          console.error(`❌ XML 업로드 실패 → ${product.designer} ${product.title}`);
          return;
        }

        // ✅ 2️⃣ 고도몰로 상품 등록/수정 API 호출
        
        await this.userService.assertRequestAvailable(customId, 1);
        await this.godoMallService.registerProductWithXmlUrl(
          partnerKey,
          apiKey,
          xmlUrl,
          product,
          product.styleId
        );
        await this.userService.consumeRequest(customId, 1);

        // ✅ WebSocket으로 고도몰에 알림 전송
        this.gateway.sendProductUpdate(
  `${customId}:${accountPlatform}:${goodsNo}`,
  {
          status: 'success',
          price: product.price,
          size: product.size,
          updatedAt: new Date().toISOString(),
        });
        
        // ✅ 3️⃣ 고도몰 반영 후 XML 바로 삭제
        await this.godoMallService.deleteUpdateXml(xmlUrl);

        console.log(`✅ ${product.designer} 상품 업데이트 완료`);

      } catch (err: any) {
        console.warn(`🚨 Bottega 업데이트 실패: ${err.message}`);
        if (page && !page.isClosed()) await page.close();
        if (browser) await browser.close();
      } finally {
        if (page && !page.isClosed()) await page.close();
        if (browser) await browser.close();
      }
    }   
  }
}
