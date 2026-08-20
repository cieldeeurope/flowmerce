import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { GodoMallService } from 'src/godomall/godomall.service';
import { Repository } from 'typeorm';
import { R2Service } from '../cloudflare/r2.service';
import * as fs from 'fs';
import * as cheerio from 'cheerio';
import { Mapping } from 'src/mapping/mapping.entity';
import { Product } from 'src/product/product.entity';
import { UpdateGateway } from 'src/update/update.gateway';
import type { Browser, Page } from 'puppeteer';
import puppeteer from 'puppeteer-extra';
const sharp = require('sharp');
import axios from 'axios';
import { SmartstoreService } from 'src/smartstore/smartstore.service';
import { SmartstoreApiService } from 'src/smartstore/smartstore-api.service';
import { Cafe24Service } from 'src/cafe24/cafe24.service';
import { MakeshopService } from 'src/makeshop/makeshop.service';
import { HostingAccount } from 'src/hosting/hostingaccount.entity';
import { UserService } from 'src/user/user.service';
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const PORT_POOL = [9225, 9235, 9245, 9255, 9265, 9275, 9285, 9295];

async function connectSilkChrome(port: number) {
  const browser = await puppeteer.connect({
    browserURL: `http://127.0.0.1:${port}`,
    defaultViewport: null,
  });

  const pages = await browser.pages();
  if (!pages.length) {
    throw new Error(`포트 ${port}에 열린 페이지가 없습니다`);
  }

  const page = pages[0];

  await page.setViewport({ width: 1920, height: 1080 });

  console.log(`🧠 실크롬 연결 성공: ${port}`);
  return { browser, page };
}

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

  @Injectable()
  export class BrunelloService {
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

  private sleep(ms: number) {
      return new Promise(resolve => setTimeout(resolve, ms));
  }

  private getBrunelloBrowserApiEndpoint(): string {
      const endpoint =
          process.env.BRIGHTDATA_BROWSER_WS_ENDPOINT ||
          process.env.BRIGHTDATA_BRUNELLO_BROWSER_WS_ENDPOINT;

      if (endpoint) {
          return endpoint;
      }

      const auth =
          process.env.BRIGHTDATA_BROWSER_AUTH ||
          process.env.BRIGHTDATA_BRUNELLO_BROWSER_AUTH;

      if (auth) {
          return `wss://${auth}@brd.superproxy.io:9222`;
      }

      throw new Error('BRIGHTDATA_BROWSER_WS_ENDPOINT or BRIGHTDATA_BROWSER_AUTH is required.');
  }

  private buildBrunelloBrowserInputUrl(siteUrl: string): string {
      const url = new URL(siteUrl);
      url.searchParams.set('start', '0');
      url.searchParams.set('sz', '500');
      return url.href;
  }

  private normalizeBrunelloProductUrl(href: string, baseUrl: string): string | null {
      try {
          const url = new URL(href, baseUrl);
          const segments = url.pathname.split('/').filter(Boolean);
          const locale = segments[0] || '';
          const gender = (segments[1] || '').toLowerCase();
          const fileName = segments[segments.length - 1] || '';

          if (url.hostname !== 'shop.brunellocucinelli.com') return null;
          if (!/^en-[a-z]{2}$/i.test(locale)) return null;
          if (gender !== 'men' && gender !== 'women') return null;
          if (!/\.html$/i.test(fileName)) return null;
          if (!/-\d{3}[A-Z0-9]{5,}\.html$/i.test(fileName)) return null;

          url.search = '';
          url.hash = '';
          return url.href;
      } catch {
          return null;
      }
  }

  private extractBrunelloStyleIdFromUrl(productUrl: string): string {
      try {
          const fileName = new URL(productUrl).pathname.split('/').pop() || '';
          const slug = fileName.replace(/\.html$/i, '');
          const code = slug.split('-').pop() || '';

          return /^[A-Z0-9]+$/i.test(code) ? code.toUpperCase() : '';
      } catch {
          const match = productUrl.match(/-([A-Z0-9]+)\.html(?:[?#].*)?$/i);
          return match?.[1]?.toUpperCase() || '';
      }
  }

  private async collectBrunelloProductUrlsFromBrowserApi(siteUrl: string): Promise<string[]> {
      const browserWSEndpoint = this.getBrunelloBrowserApiEndpoint();
      const inputUrl = this.buildBrunelloBrowserInputUrl(siteUrl);
      let browser: Browser | null = null;
      let page: Page | null = null;

      console.log(`Brunello Browser API input URL: ${inputUrl}`);

      try {
          browser = await puppeteer.connect({ browserWSEndpoint });
          page = await browser.newPage();
          page.setDefaultNavigationTimeout(2 * 60 * 1000);
          await page.setViewport({ width: 1920, height: 1080 });

          const client = await page.target().createCDPSession();
          await client.send('Network.enable');
          await client.send('Network.setBlockedURLs', {
              urls: [
                  '*://media.brunellocucinelli.com/*',
                  '*://fonts.googleapis.com/*',
                  '*://fonts.gstatic.com/*',
                  '*://*.woff',
                  '*://*.woff2',
                  '*://*.ttf',
                  '*://*.otf',
                  '*://*.jpg',
                  '*://*.jpeg',
                  '*://*.png',
                  '*://*.webp',
                  '*://*.avif',
                  '*://*.gif',
                  '*://*.svg',
                  '*://*.mp4',
                  '*://*.webm',
              ],
          });

          await page.setRequestInterception(true);
          page.on('request', request => {
              const resourceType = request.resourceType();
              const requestUrl = request.url().toLowerCase();

              if (
                  ['image', 'media', 'font', 'stylesheet'].includes(resourceType) ||
                  /media\.brunellocucinelli\.com/.test(requestUrl) ||
                  /\.(?:jpe?g|png|webp|avif|gif|svg|mp4|webm|woff2?|ttf|otf)(?:[?#]|$)/i.test(requestUrl)
              ) {
                  request.abort().catch(() => undefined);
                  return;
              }

              request.continue().catch(() => undefined);
          });

          await page.goto(inputUrl, {
              waitUntil: 'domcontentloaded',
              timeout: 2 * 60 * 1000,
          });

          const productSelector = [
              '[data-testid^="product-tile-"] a[data-testid$="-link"][href*=".html"]',
              '[data-testid^="product-tile-"] a.product-tile-link[href*=".html"]',
              '[data-testid^="product-listing-grid"] a[href*=".html"]',
          ].join(',');

          await page.waitForSelector(productSelector, { timeout: 2 * 60 * 1000 }).catch(() => undefined);

          let previousCount = 0;
          for (let i = 0; i < 4; i += 1) {
              await this.autoScroll(page);
              await this.sleep(1500);

              const currentCount = await page.$$eval(productSelector, elements => elements.length);
              if (currentCount === previousCount) {
                  break;
              }

              previousCount = currentCount;
              await page.evaluate(() => window.scrollTo(0, 0));
              await this.sleep(500);
          }

          const rawUrls = await page.evaluate((selector: string) => {
              const hrefs = Array.from(document.querySelectorAll(selector))
                  .map((element: any) => element.href || element.getAttribute('href'))
                  .filter(Boolean);

              const html = document.documentElement.innerHTML;
              const regexMatches =
                  html.match(/https?:\/\/shop\.brunellocucinelli\.com\/[^\s"'<>\\]+?\.html(?:\?[^\s"'<>\\]*)?/gi) || [];

              return [...hrefs, ...regexMatches];
          }, productSelector);

          const productUrlSet = new Set<string>();
          rawUrls.forEach(href => {
              const normalized = this.normalizeBrunelloProductUrl(href, inputUrl);
              if (normalized) {
                  productUrlSet.add(normalized);
              }
          });

          const productUrls = [...productUrlSet];
          console.log(`Brunello Browser API URL count: ${productUrls.length}`);
          return productUrls;
      } finally {
          try {
              if (page && !page.isClosed()) {
                  await page.close();
              }
          } catch {}

          try {
              if (browser) {
                  await browser.close();
              }
          } catch {}
      }
  }

  private getBrunelloStudioCollectorId(): string {
      return (
          process.env.BRIGHTDATA_BRUNELLO_COLLECTOR_ID ||
          process.env.BRIGHTDATA_BRUNELLO_STUDIO_COLLECTOR_ID ||
          'c_mpqhygu42kwrocmn83'
      );
  }

  private buildBrunelloStudioInputUrl(siteUrl: string): string {
      const url = new URL(siteUrl);
      url.searchParams.set('start', '0');
      url.searchParams.set('sz', '500');
      return url.href;
  }

  private parseBrightDataPayload(data: any): any {
      if (typeof data !== 'string') {
          return data;
      }

      try {
          return JSON.parse(data);
      } catch {
          return data;
      }
  }

  private collectStudioUrlsFromValue(value: any, productUrlSet: Set<string>) {
      if (!value) {
          return;
      }

      if (typeof value === 'string') {
          const urlMatches = value.match(/https?:\/\/shop\.brunellocucinelli\.com\/[^\s"'<>\\]+?\.html(?:\?[^\s"'<>\\]*)?/gi) || [];
          urlMatches.forEach(url => productUrlSet.add(url));
          return;
      }

      if (Array.isArray(value)) {
          value.forEach(item => this.collectStudioUrlsFromValue(item, productUrlSet));
          return;
      }

      if (typeof value === 'object') {
          if (Array.isArray(value.product_urls)) {
              value.product_urls.forEach((url: any) => this.collectStudioUrlsFromValue(url, productUrlSet));
          }

          Object.values(value).forEach(item => this.collectStudioUrlsFromValue(item, productUrlSet));
      }
  }

  private async collectBrunelloProductUrlsFromStudioScraper(siteUrl: string): Promise<string[]> {
      const apiKey = process.env.BRIGHTDATA_API_KEY || process.env.BRIGHTDATA_API_TOKEN;
      if (!apiKey) {
          throw new Error('BRIGHTDATA_API_KEY 또는 BRIGHTDATA_API_TOKEN 이 없습니다.');
      }

      const collectorId = this.getBrunelloStudioCollectorId();
      const inputUrl = this.buildBrunelloStudioInputUrl(siteUrl);

      console.log(`Brunello Studio Scraper input URL: ${inputUrl}`);

      const triggerResponse = await axios.post(
          `https://api.brightdata.com/dca/trigger?collector=${encodeURIComponent(collectorId)}&queue_next=1`,
          [{ url: inputUrl }],
          {
              headers: {
                  Authorization: `Bearer ${apiKey}`,
                  'Content-Type': 'application/json',
              },
              timeout: 60000,
          },
      );

      const triggerData = this.parseBrightDataPayload(triggerResponse.data);
      const collectionId =
          typeof triggerData === 'string'
              ? triggerData.trim()
              : triggerData?.collection_id ||
                  triggerData?.id ||
                  triggerData?.job_id ||
                  triggerData?.snapshot_id;

      if (!collectionId) {
          throw new Error(`Bright Data Studio collection ID 없음: ${JSON.stringify(triggerData)}`);
      }

      console.log(`Brunello Studio Scraper collection ID: ${collectionId}`);

      const maxAttempts = Number(process.env.BRIGHTDATA_STUDIO_MAX_POLL_ATTEMPTS || 120);
      const pollIntervalMs = Number(process.env.BRIGHTDATA_STUDIO_POLL_INTERVAL_MS || 5000);

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
          try {
              const datasetResponse = await axios.get(
                  `https://api.brightdata.com/dca/dataset?id=${encodeURIComponent(collectionId)}`,
                  {
                      headers: {
                          Authorization: `Bearer ${apiKey}`,
                      },
                      timeout: 60000,
                  },
              );

              const dataset = this.parseBrightDataPayload(datasetResponse.data);

              if (Array.isArray(dataset) || Array.isArray(dataset?.data) || Array.isArray(dataset?.records) || dataset?.product_urls) {
                  const rows = Array.isArray(dataset)
                      ? dataset
                      : Array.isArray(dataset?.data)
                          ? dataset.data
                          : Array.isArray(dataset?.records)
                              ? dataset.records
                              : [dataset];

                  const productUrlSet = new Set<string>();
                  rows.forEach((row: any) => this.collectStudioUrlsFromValue(row, productUrlSet));

                  const productUrls = [...productUrlSet];
                  console.log(`Brunello Studio Scraper URL count: ${productUrls.length}`);
                  return productUrls;
              }

              if (dataset?.status === 'empty') {
                  console.warn(`Bright Data Studio collection returned empty dataset: ${collectionId}`);
                  return [];
              }

              if (dataset?.status === 'failed' || dataset?.status === 'error') {
                  throw new Error(`Bright Data Studio collection failed: ${JSON.stringify(dataset)}`);
              }
          } catch (error: any) {
              if (error.response?.status !== 404 && error.response?.status !== 202) {
                  throw error;
              }
          }

          await this.sleep(pollIntervalMs);
      }

      throw new Error(`Bright Data Studio collection timeout: ${collectionId}`);
  }
      
      
  // 자동 스크롤 함수
  private async autoScroll(page: Page) {
      await page.evaluate(async () => {
          let totalHeight = 0;
          const distance = 400; // 스크롤할 거리
          const interval = 50;  // 스크롤 간격 (밀리초)
  
          await new Promise<void>(resolve => {
              const timer = setInterval(() => {
                  window.scrollBy(0, distance); // 페이지를 스크롤
                  totalHeight += distance;
  
                  if (totalHeight >= document.body.scrollHeight) {
                      clearInterval(timer); // 스크롤 완료 시 타이머 종료
                      resolve(); // 프로미스 해결
                  }
              }, interval);
          });
      });
  }
  

// 1. 카테고리 가져오기 (프록시 교체 및 재시도 로직 추가)
async getCategories(siteUrls: string[]): Promise<{ categoryName: string; url: string }[]> {
    const allCategories: { categoryName: string; url: string }[] = [];
    const seenUrls = new Set<string>();

    const normalizeText = (value: string) =>
      value.replace(/\s+/g, ' ').trim();

    const humanize = (value: string) =>
      value
        .replace(/-/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase());

    const excludeText = /\b(all|new|view\s*all|discover\s*(all|more)?|shop\s*now|collections?|end\s*of\s*season\s*sales)\b/i;
    const excludeUrl = /(collection|collections|sale|sales|pmid=sale)/i;

    const extractCategories = ($: cheerio.CheerioAPI, baseUrl: string) => {
      const results: { categoryName: string; url: string }[] = [];
      const targets = [
        { key: 'women', label: '여성' },
        { key: 'men', label: '남성' },
        { key: 'kids', label: '키즈' },
      ];

      for (const { key, label } of targets) {
        const rootLinks = $(`[data-analyticsmainmenu="${key}"] div.cc-menu-subcategory-content a[href]`);
        const links = rootLinks.length
          ? rootLinks
          : $(`a[href*="/${key}/"]:not([href*=".html"])`);

        links.each((_, el) => {
          const href = $(el).attr('href');
          const sub = normalizeText($(el).text());

          if (!href || !sub) {
            return;
          }

          if (excludeText.test(sub)) {
            return;
          }

          const absoluteUrl = new URL(href, baseUrl).toString().split('?')[0];
          if (excludeUrl.test(absoluteUrl)) {
            return;
          }

          const pathParts = new URL(absoluteUrl).pathname.split('/').filter(Boolean);
          const keyIndex = pathParts.indexOf(key);
          if (keyIndex === -1) {
            return;
          }

          const middleRaw = pathParts[keyIndex + 1] || '';
          if (!middleRaw || excludeUrl.test(middleRaw)) {
            return;
          }

          results.push({
            categoryName: `${label} - ${humanize(middleRaw)} - ${sub}`,
            url: absoluteUrl,
          });
        });
      }

      return results;
    };

    for (const siteUrl of siteUrls) {
      let success = false;

      for (let attempt = 1; attempt <= 3 && !success; attempt++) {
        try {
          let categoryHtml = await this.r2Service.getHtmlFromUrl2(siteUrl);
          let $ = cheerio.load(categoryHtml);
          let categories = extractCategories($, siteUrl);

          if (!categories.length && siteUrl.includes('/en-fr/')) {
            const nlUrl = siteUrl.replace('/en-fr/', '/en-nl/');
            categoryHtml = await this.r2Service.getHtmlFromUrl2(nlUrl);
            $ = cheerio.load(categoryHtml);
            categories = extractCategories($, nlUrl);
          }

          if (!categories.length) {
            throw new Error('No categories found');
          }

          for (const category of categories) {
            if (seenUrls.has(category.url)) {
              continue;
            }

            seenUrls.add(category.url);
            allCategories.push(category);
          }

          console.log(`Brunello categories collected from ${siteUrl}: ${categories.length}`);
          success = true;
        } catch (error: any) {
          console.error(`Brunello category fetch failed [${siteUrl}] (${attempt}/3): ${error.message}`);
        }
      }

      if (!success) {
        console.warn(`Brunello category fetch skipped after retries: ${siteUrl}`);
      }
    }

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
      timeout: 30000, // 타임아웃 설정
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36"
      }
    });
    let imageBuffer = Buffer.from(response.data, 'binary'); // 이미지 데이터를 버퍼로 변환

    // Sharp를 사용해서 이미지 메타데이터 확인 (형식 판별)
    const metadata = await sharp(imageBuffer).metadata();
    if (metadata.format === 'webp' || metadata.format === 'avif') {
      // JPEG로 변환
      imageBuffer = await sharp(imageBuffer)
        .jpeg() // png()를 사용하면 PNG로 변환 가능
        .toBuffer();
      // 파일 이름 확장자를 .jpg로 변경 (.webp 또는 .avif 를 .jpg로)
      fileName = fileName.replace(/\.(webp|avif)$/i, '.jpg');
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
  
    
  
// 브루넬로 사이트 크롤링 시작
// async getProductsFromCategory(siteUrl: string, partnerKey: string,apiKey: string, customId:string, accountPlatform:string, godoMallCategoryCode: string): Promise<void> {
    // const account = await this.hostingAccountRepository.findOne({
    //   where: { customId, accountPlatform },
    // });

    
//     const serviceType = 'brunello';
//     const proxyLines = await this.r2Service.loadBrightProxies2();
    

//     let browser: Browser | null = null;
//     let page: Page | null = null;
//     let productUrls: string[] = [];

//     const category = await this.mappingRepository.findOne({
//         where: { customId: customId, accountPlatform: accountPlatform, siteUrl: siteUrl },
//     });

//     const MAX_RETRY = 5;
//     let retryAttempts = 0; // 재시도 횟수 초기화
        
//     while (retryAttempts < MAX_RETRY) {
//         let proxy = pickProxy(proxyLines);
//         let proxyArg = `--proxy-server=http://${proxy.host}:${proxy.port}`;
//         try {
//             browser = await puppeteer.launch({
//                 headless: false,
//                 args: [
//                     proxyArg,
//                     '--disable-blink-features',
//                     '--disable-blink-features=AutomationControlled',
//                     '--disable-infobars',
//                     '--no-default-browser-check',
//                     '--no-first-run',
//                     '--log-level=0',
//                     '--disable-dev-shm-usage',
//                     '--no-sandbox',
//                     '--disable-setuid-sandbox',
//                     '--remote-debugging-port=0',
//                     '--disable-background-timer-throttling',
//                     '--disable-backgrounding-occluded-windows',
//                     '--disable-renderer-backgrounding',
//                     '--disable-session-crashed-bubble',
//                     '--disable-accelerated-2d-canvas',
//                     '--noerrdialogs',
//                 ],
//             });

//             page = await browser.newPage();
//             await page.authenticate({
//                 username: proxy.username,
//                 password: proxy.password,
//             });
//             await page.setUserAgent(
//                 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36'
//             );
//             await page.setViewport({ width: 1920, height: 1080 });
//             await page.evaluateOnNewDocument(() => {
//                 /* =========================
//                 * webdriver 제거
//                 * ========================= */
//                 Object.defineProperty(navigator, 'webdriver', {
//                     get: () => undefined,
//                 });

//                 /* =========================
//                 * 언어 (NL proxy + en-nl site)
//                 * ========================= */
//                 Object.defineProperty(navigator, 'language', {
//                     get: () => 'en-NL',
//                 });

//                 Object.defineProperty(navigator, 'languages', {
//                     get: () => ['en-NL', 'en', 'nl-NL', 'nl'],
//                 });

//                 /* =========================
//                 * plugins (Akamai BM 체크 포인트)
//                 * ========================= */
//                 Object.defineProperty(navigator, 'plugins', {
//                     get: () => [1, 2, 3, 4, 5],
//                 });

//                 /* =========================
//                 * permissions.query 타입 안전 처리
//                 * ========================= */
//                 const originalQuery = navigator.permissions.query.bind(navigator.permissions);

//                 navigator.permissions.query = (parameters: any) => {
//                     if (parameters && parameters.name === 'notifications') {
//                         return Promise.resolve(
//                         ({
//                             name: 'notifications',
//                             state: Notification.permission,
//                             onchange: null,
//                             addEventListener: () => {},
//                             removeEventListener: () => {},
//                             dispatchEvent: () => false,
//                         } as unknown) as PermissionStatus
//                         );
//                     }

//                     return originalQuery(parameters);
//                 };
//             });


//             await page.setExtraHTTPHeaders({
//                 'accept-language': 'en-NL,en;q=0.9,nl-NL;q=0.8,nl;q=0.7',
//                 'upgrade-insecure-requests': '1',
//             });



//             await page.setCacheEnabled(false);
//             await page.setRequestInterception(true);
//             page.on('request', (request) => {
//                 const resourceType = request.resourceType();
//                 if (resourceType === 'image') {
//                     request.abort();
//                 } else {
//                 request.continue();
//                 }
//             });

//             await page.goto(`${siteUrl}?start=0&sz=400`, { waitUntil: 'networkidle0', timeout: 20000 }).catch(() => null);
//             // const nlUrl = siteUrl.replace('/en-fr/', '/en-nl/');
//             // await new Promise(resolve => setTimeout(resolve, 2000));
//             // await page.goto(`${nlUrl}?start=0&sz=400`, {waitUntil: 'networkidle0',timeout: 30000});
//             await new Promise(resolve => setTimeout(resolve, 3000));


//             productUrls = Array.from(
//                 new Set(
//                     await page.evaluate(() => {
//                     return Array.from(
//                         document.querySelectorAll<HTMLAnchorElement>('div.css-15k2oy9 a[href]')
//                     ).map(a => a.href);
//                     })
//                 )
//                 );

//             if (productUrls.length === 0) {
//                 throw new Error('상품 URL을 수집하지 못했습니다.');
//             }

//             break;
            
//         }   catch (error: any) {
//             console.warn(`⚠️ 페이지 이동 실패 (시도 ${retryAttempts + 1}/${MAX_RETRY}): ${error.message}`);

//             retryAttempts++;

//             if (page && !page.isClosed()) {
//                 await page.close();
//             }
//             if (browser) {
//                 await browser.close();
//             }

//             if (retryAttempts >= MAX_RETRY) {
//                 console.error(`❌ 최대 재시도 횟수 초과: ${siteUrl}`);
//                 return; // 최대 재시도 횟수를 초과하면 함수 종료
//             }

//             // 다음 재시도를 위한 랜덤 대기 시간 (exponential backoff)
//             const waitTime = Math.min(1000 * 2 ** retryAttempts, 10000); // 최대 10초 대기
//             await new Promise((resolve) => setTimeout(resolve, waitTime));
//         }
//     }
    


// if (productUrls.length === 0) {
//     throw new Error('상품 URL을 수집하지 못했습니다. 모든 시도가 실패했습니다.');
// }
// console.log(`브루넬로 최종 수집된 상품 URL 수: ${productUrls.length} - ${category?.categoryName || '카테고리 없음'}`);


// for (const [index, productUrl] of productUrls.entries()) {
//     let loadAttempts = 0;

//     while (loadAttempts < 10) {
//         try {
//             if(!browser){
//                 const proxy = pickProxy(proxyLines);
//                 const proxyArg = `--proxy-server=http://${proxy.host}:${proxy.port}`;
//                 browser = await puppeteer.launch({
//                     headless: false,
//                     args: [
//                         proxyArg,
//                         '--disable-blink-features',
//                         '--disable-blink-features=AutomationControlled',
//                         '--disable-infobars',
//                         '--no-default-browser-check',
//                         '--no-first-run',
//                         '--log-level=0',
//                         '--disable-dev-shm-usage',
//                         '--no-sandbox',
//                         '--disable-setuid-sandbox',
//                         '--remote-debugging-port=0',
//                         '--disable-background-timer-throttling',
//                         '--disable-backgrounding-occluded-windows',
//                         '--disable-renderer-backgrounding',
//                         '--disable-session-crashed-bubble',
//                         '--disable-accelerated-2d-canvas',
//                         '--noerrdialogs',
//                     ],
//                 });
//                 page = await browser.newPage();
//                 await page.authenticate({
//                     username: proxy.username,
//                     password: proxy.password,
//                 });
//                 await page.setUserAgent(
//                     'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36'
//                 );


//                 await page.setViewport({ width: 1920, height: 1080 });
//                 await page.evaluateOnNewDocument(() => {
//                     /* =========================
//                     * webdriver 제거
//                     * ========================= */
//                     Object.defineProperty(navigator, 'webdriver', {
//                         get: () => undefined,
//                     });

//                     /* =========================
//                     * 언어 (NL proxy + en-nl site)
//                     * ========================= */
//                     Object.defineProperty(navigator, 'language', {
//                         get: () => 'en-NL',
//                     });

//                     Object.defineProperty(navigator, 'languages', {
//                         get: () => ['en-NL', 'en', 'nl-NL', 'nl'],
//                     });

//                     /* =========================
//                     * plugins (Akamai BM 체크 포인트)
//                     * ========================= */
//                     Object.defineProperty(navigator, 'plugins', {
//                         get: () => [1, 2, 3, 4, 5],
//                     });

//                     /* =========================
//                     * permissions.query 타입 안전 처리
//                     * ========================= */
//                     const originalQuery = navigator.permissions.query.bind(navigator.permissions);

//                     navigator.permissions.query = (parameters: any) => {
//                         if (parameters && parameters.name === 'notifications') {
//                             return Promise.resolve(
//                             ({
//                                 name: 'notifications',
//                                 state: Notification.permission,
//                                 onchange: null,
//                                 addEventListener: () => {},
//                                 removeEventListener: () => {},
//                                 dispatchEvent: () => false,
//                             } as unknown) as PermissionStatus
//                             );
//                         }

//                         return originalQuery(parameters);
//                     };
//                 });


//                 await page.setExtraHTTPHeaders({
//                     'accept-language': 'en-NL,en;q=0.9,nl-NL;q=0.8,nl;q=0.7',
//                     'upgrade-insecure-requests': '1',
//                 });



//                 await page.setCacheEnabled(false);
//                 await page.setRequestInterception(true);
//                 page.on('request', (request) => {
//                     const resourceType = request.resourceType();
//                     if (resourceType === 'image') {
//                         request.abort();
//                     } else {
//                     request.continue();
//                     }
//                 });
//             }
    
//             await page.goto(productUrl, { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => null);
//             const nlUrl = productUrl.replace('/en-fr/', '/en-nl/');
//             await new Promise(resolve => setTimeout(resolve, 2000));
//             await page.goto(nlUrl, {waitUntil: 'domcontentloaded',timeout: 30000});
//             console.log(`브루넬로 (${index + 1}/${productUrls.length}) 수집 중`);
//             await page.waitForSelector(
//                 'span.cc-price-text',
//                 { visible: true, timeout: 30000 }
//             );
//             await new Promise(resolve => setTimeout(resolve, 2000));
//             break; // ✅ 로딩 성공 시 루프 종료
//         } catch (error: any) {
//             loadAttempts++;
//             console.warn(`브루넬로 페이지 로드 실패 [${error.message}] (프록시 변경 ${loadAttempts}/3): ${error.message}`);
//             if (loadAttempts < 3) {
//                 if (page && !page.isClosed()) await page.close();
//                 if (browser) await browser.close();

//                 // 🔥 이 두 줄이 핵심
//                 page = null;
//                 browser = null;
//                 continue;
//             } else {
//                 console.error('최대 로드 시도 초과 - 다음 URL로 이동합니다.');
//                 break;
//             }
//         }
//     }
    

//         const isAvailable = await page.evaluate(() => {
//             return !!document.querySelector(
//                 'button.cc-button-primary.add-to-cart.visible-check'
//             );
//         });

//         if (!isAvailable) {
//             continue;
//         }

//         const productDetails = await page.evaluate(async () => {

//             let size = null;

//             // 1️⃣ One Size 우선 체크
//             const oneSizeBtn = document.querySelector(
//                 'button.cc-size-choice-button #js-size-text-selected'
//             );

//             if (
//             oneSizeBtn &&
//             oneSizeBtn.textContent &&
//             /one\s*size/i.test(oneSizeBtn.textContent.trim())
//             ) {
//             size = '원사이즈';
//             }

//             /* ===============================
//             1️⃣ 기존 One Size (사이즈 리스트 1개)
//             ================================ */
//             if (!size) {
//             const sizeContainers = Array.from(
//                 document.querySelectorAll('ul.cc-size-list li.cc-size-container')
//             );

//             if (sizeContainers.length === 1) {
//                 const oneSizeText = sizeContainers[0]
//                 .querySelector('.cc-value')
//                 ?.textContent
//                 ?.trim();

//                 if (oneSizeText && /one\s*size/i.test(oneSizeText)) {
//                 size = '원사이즈';
//                 }
//             }

//             if (!size) {
//             const sizeList: string[] = [];

//             // 2️⃣ 일반 사이즈 수집 (품절 제외)
//             sizeContainers.forEach(li => {
//                 const btn = li.querySelector<HTMLButtonElement>('button.cc-single-size');
//                 if (!btn) return;

//                 // ❌ 품절
//                 if (btn.disabled) return;

//                 const sizeText = btn
//                 .querySelector('.cc-value')
//                 ?.textContent
//                 ?.trim();

//                 if (!sizeText) return;

//                 // ❌ 안전장치 (No longer available)
//                 if (/no longer available/i.test(btn.innerText)) return;

//                 sizeList.push(sizeText);
//             });

//             if (sizeList.length > 0) {
//                 size = [...new Set(sizeList)].join(', ');
//             }
//             }
//         }

//             // 3️⃣ 전부 품절이면 null 유지



//             const site = 'brunello';
//             const designer = '브루넬로';
//             const titleElement = document.querySelector('.cc-pdp__content-title span.cc-pdp__title--mobile');
//             const title = titleElement ? titleElement.textContent?.trim() || '' : '';
//             const priceElement = document.querySelector('span.cc-price-text');
//             let price = null;

//             if (priceElement) {
//             const raw = priceElement.textContent.trim(); // "€ 1.600,00"

//             price = parseInt(
//                 raw
//                 .replace(/[^\d,\.]/g, '') // 숫자, 콤마, 점만 남김
//                 .replace('.', '')         // 천 단위 제거
//                 .replace(',', '.'),       // 소수점 처리
//                 10
//             );
//             }
//             const colorEl = document.querySelector('.cc-color-text');
//             const color = colorEl
//             ? colorEl.textContent.replace(/\s*\(.*?\)\s*/g, '').trim()
//             : '';

//             const styleIdElement = document.querySelector(
//                 'span.cc-pdp__sku.cc-pdp__sku--desktop'
//             );

//             const styleId = styleIdElement
//             ? (styleIdElement.textContent?.match(/SKU:\s*([A-Za-z0-9]+)/)?.[1] || '')
//             : '';

//             const brandstyleId = styleId || '';

//             const imageUrls = [];

//             document.querySelectorAll('div.cc-content-image').forEach(el => {
//             // 1️⃣ 1200px 우선
//             let source = el.querySelector('source[media="(min-width: 1200px)"]');

//             // 2️⃣ 없으면 1920px fallback
//             if (!source) {
//                 source = el.querySelector('source[media="(min-width: 1920px)"]');
//             }

//             if (!source) return;

//             const srcset = source.getAttribute('srcset');
//             if (!srcset) return;

//             imageUrls.push(srcset.trim());
//             });

//             let mainInfo = '';
//             let madeIn = ''; // ❗ 사용 안 함 (요청대로 유지하되 로직 없음)

//             // ✅ DESCRIPTION / MATERIALS / DETAILS 만 포함
//             const validAccordionCols = [
//             'cc-pdp__accordion__col--1',
//             'cc-pdp__accordion__col--2',
//             'cc-pdp__accordion__col--3',
//             ];

//             const resultLines: string[] = [];

//             const accordionCols = Array.from(
//             document.querySelectorAll<HTMLDivElement>(
//                 'div.cc-pdp__accordion__col'
//             )
//             );

//             accordionCols.forEach(col => {
//             // ❌ PACKAGING / SHIPPING 제외
//             const isTarget = validAccordionCols.some(cls =>
//                 col.classList.contains(cls)
//             );
//             if (!isTarget) return;

//             const textElements = col.querySelectorAll<HTMLElement>(
//                 '.cc-pdp__accordion__content__text'
//             );

//             textElements.forEach(el => {
//                 const text = el.textContent?.trim();
//                 if (!text) return;

//                 resultLines.push(text);
//             });
//             });

//             if (resultLines.length > 0) {
//             mainInfo = resultLines.join('\n');
//             }


//             return { site, designer, title, price, color, mainInfo, madeIn, styleId, size, brandstyleId, imageUrls };
//         });

//         if (!productDetails || !productDetails.mainInfo || !productDetails.styleId || !productDetails.title || !productDetails.price || !productDetails.imageUrls.length || !productDetails.size || !productDetails.brandstyleId) {
//             console.warn('브루넬로 데이터 누락 - 다음 productUrl로 이동');
//             continue; // 다음 productUrl로 이동
//         }


//         // 카테고리 매핑 데이터 찾기
//         const categoryMapping = await this.mappingRepository.findOne({ where: { siteUrl } });
//         if (!categoryMapping) {
//             throw new Error('매핑된 카테고리를 찾을 수 없습니다.');
//         }

//         try {
//         const existingProduct = await this.productRepository.findOne({ where: {
//             styleId: productDetails.styleId,
//             partnerKey: partnerKey, 
//             apiKey: apiKey
//             }
//         });
        
//         if (existingProduct) {
//             // 이미 존재하는 상품이므로 업데이트를 해야 함
//             console.log(`✅상품 업데이트: ${existingProduct.title} - styleID: ${existingProduct.styleId}`);
            
//             // 상품 정보를 업데이트 (기존 데이터베이스 업데이트)
//             existingProduct.siteUrl = siteUrl;
//             existingProduct.size = productDetails.size;
//             // // existingProduct.title = productDetails.title;
//             existingProduct.price = productDetails.price;
//             existingProduct.touched = true;
//             existingProduct.categoryName = category.categoryName;
//             const godoMallCategoryName = category.godoMallCategoryName;
//             existingProduct.visitUrl = productUrl;
//         existingProduct.godoMallCategoryCode = godoMallCategoryCode;

//             // ✅ 상품 카테고리 코드 저장
//             existingProduct.godoMallCategoryCode = godoMallCategoryCode;

//             // ✅ 플랫폼 타입 결정 (8자리면 SMARTSTORE, 그 외엔 GODOMALL)
//             if (godoMallCategoryCode.length === 8) {
//                 existingProduct.platform = 'smartstore';
//             } else {
//                 existingProduct.platform = 'godomall';
//             }

//             if (existingProduct.platform === 'smartstore') {
//                 // ✅ 스마트스토어 수정
//                 const auth = {
//                     smartStoreID: partnerKey,
//                     smartStoreSecret: apiKey,
//                 };
//                 await this.smartstoreApiService.updateSmartStoreProduct(existingProduct, auth, partnerKey,undefined,godoMallCategoryName);

//             } else {
//                 // ✅ 고도몰 등록
//                 const xmlUrl = await this.r2Service.uploadXmlToR2SmartStore(
//                 existingProduct.styleId, 
//                 existingProduct, 
//                 godoMallCategoryCode, 
//                 existingProduct.mainImageUrl, 
//                 existingProduct.additionalImageUrls, 
//                 partnerKey,
//                 apiKey
//                 );
//                 await this.godoMallService.registerProductWithXmlUrl(partnerKey, apiKey, xmlUrl, existingProduct, existingProduct.styleId);
//             }
    
//             // ✅ DB에 저장
//             await this.productRepository.save(existingProduct);

//         } else {
//             // 새 상품이므로 기존 로직으로 등록 진행
//             const newProduct = this.productRepository.create(productDetails);
//             newProduct.mainImageUrl = productDetails.imageUrls[0];
//             newProduct.additionalImageUrls = productDetails.imageUrls.slice(1); // 추가 이미지들 저장
//             newProduct.touched = true;
//             newProduct.categoryName = categoryMapping.categoryName;
//             newProduct.customId = customId;
//             newProduct.accountPlatform = accountPlatform;
//             newProduct.siteUrl = siteUrl;
//             newProduct.color = productDetails.color;
//             newProduct.visitUrl = productUrl;
//         newProduct.godoMallCategoryCode = godoMallCategoryCode;

//             const godoMallCategoryName = category.godoMallCategoryName;

//             // ✅ 상품 카테고리 코드 저장
//             newProduct.godoMallCategoryCode = godoMallCategoryCode;

//             // ✅ 플랫폼 타입 결정
//             if (godoMallCategoryCode.length === 8) {
//                 newProduct.platform = 'smartstore';
//             } else {
//                 newProduct.platform = 'godomall';
//             }

//             const r2MainImageUrl = await this.uploadImageToR2(
//                 
//                 productDetails.imageUrls[0],  // ✅ 이미지 URL을 첫 번째 인자로 전달
//                 `${productDetails.styleId}-main.jpg`,  // ✅ 저장할 파일명
//                 newProduct,
//                 partnerKey
//             );
//             newProduct.mainImageUrl = r2MainImageUrl; // ✅ R2 URL 저장
            
//             const additionalR2Urls = [];
//             for (let i = 1; i < productDetails.imageUrls.length; i++) {
//                 const r2AdditionalImageUrl = await this.uploadImageToR2(
//                     
//                     productDetails.imageUrls[i],  // ✅ 추가 이미지 URL
//                     `${productDetails.styleId}-additional-${i}.jpg`,  // ✅ 저장할 파일명
//                     newProduct,
//                     partnerKey
//                 );
//                 additionalR2Urls.push(r2AdditionalImageUrl);
//             }
//             newProduct.additionalImageUrls = additionalR2Urls; // ✅ 추가 이미지 리스트 저장

//             const allR2Urls = [newProduct.mainImageUrl,...(newProduct.additionalImageUrls || [])];
            
//             if (newProduct.platform === 'smartstore') {

//                 // ★ 새로운 로직: 이미지 데이터를 base64 및 원본 URL 배열로 생성
//                 const base64ImageList: string[] = [];
//                 const originThumbnailUrls: string[] = [];

//                 for (const r2Url of allR2Urls) {
//                     try {
//                         const response = await axios.get(r2Url, {
//                             responseType: 'arraybuffer',
//                             timeout: 10000,
//                         });
//                         const buffer = Buffer.from(response.data, 'binary');
//                         const base64 = buffer.toString('base64');
//                         base64ImageList.push(base64);
//                         originThumbnailUrls.push(r2Url);
//                     } catch (error: any) {
//                         console.error('이미지 R2 불러오기 실패:', r2Url, error.message);
//                         //logErrorToDesktop(error, `8.오류 발생`);
//                     }
//                 }

//                 // ✅ 스마트스토어 등록
//                 await this.handleSmartstoreRegistration(newProduct, partnerKey, apiKey,{ base64ImageList, originThumbnailUrls },godoMallCategoryName);

//             } else {
//                 // ✅ 고도몰 등록
//                 const xmlUrl = await this.r2Service.uploadXmlToR2SmartStore(
//                     newProduct.styleId,
//                     newProduct,
//                     godoMallCategoryCode,
//                     newProduct.mainImageUrl,
//                     newProduct.additionalImageUrls,
//                     partnerKey,
//                     apiKey
//                 );
//                 await this.godoMallService.registerProductWithXmlUrl(partnerKey, apiKey, xmlUrl, newProduct, newProduct.styleId);
//             }
//             // ✅ DB에 저장
//             await this.productRepository.save(newProduct);
//             console.log(`✅ 상품 저장 완료: ${productDetails.designer} ${productDetails.title}`);
//             }
//         } catch (error: any) {
//             console.error(`상품 등록 처리 실패 (${productUrl}): ${error.message}`);
//             continue;
//         }
//     }
//     try {
//         if (page && !page.isClosed()) {
//             await page.close();
//         }
//     } catch (error: any) {
//         if (error.message.includes("Session with given id not found")) {
//             console.warn("⚠️ Puppeteer 세션이 이미 닫혀 있어서 page.close()를 건너뜀.");
//         } else {
//             console.error("❌ 페이지 닫기 중 오류 발생:", error);
//         }
//     }
    
//     try {
//         if (browser && browser.connected) {
//             await browser.close();
//         }
//     } catch (error: any) {
//         console.warn("⚠️ 브라우저 닫기 중 오류 발생:", error.message);
//     }

//     // 크롤링 작업 후 품절 처리 실행
//     await this.handleUnsoldProducts(siteUrl, partnerKey, apiKey, customId, accountPlatform); // 품절 처리
//     await this.godoMallService.finalizeXmlDeletion(); // 추가된 호출

// }


async handleUnsoldCafe24Products(siteUrl: string, mallId: string, accessToken: string, customId: string, accountPlatform: string) {
const unsoldProducts = await this.productRepository.find({
      where: { touched: false, siteUrl, customId, accountPlatform },
    });

    if (!unsoldProducts.length) {
      return;
    }

    for (const product of unsoldProducts) {
      await this.userService.assertRequestAvailable(customId, 1);
      await this.cafe24Service.deleteProductFromEntity({
        product,
        mallId,
        accessToken,
      });
      await this.userService.consumeRequest(customId, 1);
    }
}

async handleUnsoldMakeshopProducts(siteUrl: string, shopId: string, apiKey: string, customId: string, accountPlatform: string) {
const unsoldProducts = await this.productRepository.find({
      where: { touched: false, siteUrl, customId, accountPlatform },
    });

    if (!unsoldProducts.length) {
      return;
    }

    for (const product of unsoldProducts) {
      await this.userService.assertRequestAvailable(customId, 1);
      await this.makeshopService.deleteProductFromEntity({
        product,
        shopId,
        apiKey,
      });
      await this.userService.consumeRequest(customId, 1);
    }
}
async handleUnsoldProducts(siteUrl: string,partnerKey: string,apiKey: string, customId: string, accountPlatform: string) {
const unsoldProducts = await this.productRepository.find({
    where: { touched: false, siteUrl, customId, accountPlatform } // categoryName로 필터링
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
    
        console.log(`품절 처리 완료: ${product.title} (styleId: ${product.styleId})`);
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
            const html = await this.r2Service.getHtmlFromUrl2(visitUrl.replace('/en-fr/', '/en-nl/'));
            const $ = cheerio.load(html || '');
            const addToCartBtn = $('button.cc-button-primary.add-to-cart.visible-check').first();
            let productDetails: { price: number | null; size: string | null; soldOut: boolean };

            if (!addToCartBtn.length) {
              productDetails = { price: null, size: null, soldOut: true };
            } else {
              let size: string | null = null;
              const oneSizeText = $('button.cc-size-choice-button #js-size-text-selected').first().text().trim();
              if (/one\s*size/i.test(oneSizeText)) {
                size = '원사이즈';
              }

              if (!size) {
                const sizeContainers = $('ul.cc-size-list li.cc-size-container').toArray();
                if (sizeContainers.length === 1) {
                  const oneSize = $(sizeContainers[0]).find('.cc-value').first().text().trim();
                  if (/one\s*size/i.test(oneSize)) size = '원사이즈';
                }

                if (!size) {
                  const sizeList = sizeContainers
                    .map(li => $(li).find('button.cc-single-size').first())
                    .filter(btn => btn.length && btn.attr('disabled') === undefined && !/no longer available/i.test(btn.text()))
                    .map(btn => btn.find('.cc-value').first().text().trim())
                    .filter(Boolean);
                  if (sizeList.length) size = Array.from(new Set(sizeList)).join(', ');
                }
              }

              const rawPrice = $('span.cc-price-text').first().text().trim();
              const price = parseInt(rawPrice.replace(/[^\d,\.]/g, '').replace('.', '').replace(',', '.'), 10) || null;
              productDetails = { price, size, soldOut: !price || !size };
            }

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

            this.gateway.sendProductUpdate(`${customId}:${accountPlatform}:${goodsNo}`, {
                status: 'success',
                price: product.price,
                size: product.size,
                updatedAt: new Date().toISOString(),
            });

            await this.godoMallService.deleteUpdateXml(xmlUrl);

            console.log(`Brunello product update complete: ${product.designer} ${product.title}`);
            return;

        } catch (err: any) {
            console.warn(`brunello snapshot update failed (${attempt}/${MAX_RETRY}): ${err.message}`);
        }
    }
    console.error('All brunello snapshot update retries failed.');
}
// async getProductsFromCategory(siteUrl: string, partnerKey: string,apiKey: string, customId:string, accountPlatform:string, godoMallCategoryCode: string): Promise<void> {
    // const account = await this.hostingAccountRepository.findOne({
    //   where: { customId, accountPlatform },
    // });
//     const serviceType = 'brunello';
//     const proxyLines = await this.r2Service.loadBrightProxies2();
//     let designerFromNode = '';
    

//     let browser: Browser | null = null;
//     let page: Page | null = null;
//     let productUrls: string[] = [];

//     const category = await this.mappingRepository.findOne({
//         where: { customId: customId, accountPlatform: accountPlatform, siteUrl: siteUrl },
//     });

//     const MAX_RETRY = 20;
//     let retryAttempts = 0; // 재시도 횟수 초기화
//     let portIndex = 0;

//     ({ browser, page } = await connectSilkChrome(PORT_POOL[portIndex]));
        
//     while (retryAttempts < MAX_RETRY) {
        
//         try {
//             await page.goto(`${siteUrl}?start=0&sz=400`, { waitUntil: 'networkidle0', timeout: 20000 }).catch(() => null);

//             const kidsKeywords = [
//                 '/junior',
//                 'boys',
//                 'childrens',
//                 'girls',
//                 'baby',
//                 'bekleidung',
//                 'children',
//                 '키즈',
//                 'kids',
//                 'enfant',
//             ];

//             // URL 소문자 기준으로 검사
//             const urlLower = siteUrl.toLowerCase();

//             const isKids = kidsKeywords.some(keyword =>
//             urlLower.includes(keyword.toLowerCase())
//             );

//             designerFromNode = isKids
//               ? '브루넬로쿠치넬리 키즈'
//               : '브루넬로쿠치넬리';
//             await new Promise(resolve => setTimeout(resolve, 3000));


//             productUrls = Array.from(
//                 new Set(
//                     await page.evaluate(() => {
//                     return Array.from(
//                         document.querySelectorAll<HTMLAnchorElement>('div.css-15k2oy9 a[href]')
//                     ).map(a => a.href);
//                     })
//                 )
//                 );

//             if (productUrls.length === 0) {
//                 throw new Error('상품 URL을 수집하지 못했습니다.');
//             }

//             break;
            
//         }   catch (error: any) {
//             console.warn(`⚠️ 페이지 이동 실패 (시도 ${retryAttempts + 1}/${MAX_RETRY}): ${error.message}`);

//             retryAttempts++;

//             portIndex = (portIndex + 1) % PORT_POOL.length;
//             const nextPort = PORT_POOL[portIndex];

//             ({ browser, page } = await connectSilkChrome(nextPort));


//             if (retryAttempts >= MAX_RETRY) {
//                 console.error(`❌ 최대 재시도 횟수 초과: ${siteUrl}`);
//                 return; // 최대 재시도 횟수를 초과하면 함수 종료
//             }

//             // 다음 재시도를 위한 랜덤 대기 시간 (exponential backoff)
//             const waitTime = Math.min(1000 * 2 ** retryAttempts, 10000); // 최대 10초 대기
//             await new Promise((resolve) => setTimeout(resolve, waitTime));
//         }
//     }
    


// if (productUrls.length === 0) {
//     throw new Error('상품 URL을 수집하지 못했습니다. 모든 시도가 실패했습니다.');
// }
// console.log(`브루넬로 최종 수집된 상품 URL 수: ${productUrls.length} - ${category?.categoryName || '카테고리 없음'}`);


// for (const [index, productUrl] of productUrls.entries()) {
//     let loadAttempts = 0;

//     while (loadAttempts < 10) {
//         try {
//             await page.goto(productUrl, { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => null);
//             // const nlUrl = productUrl.replace('/en-fr/', '/en-nl/');
//             // await new Promise(resolve => setTimeout(resolve, 2000));
//             // await page.goto(nlUrl, {waitUntil: 'domcontentloaded',timeout: 30000});
//              console.log(`✅ (${index + 1}/${productUrls.length}) 브루넬로 ${category?.categoryName || '카테고리 없음'}  수집 중`);
//             await page.waitForSelector(
//                 'span.cc-price-text',
//                 { visible: true, timeout: 30000 }
//             );
//             await new Promise(resolve => setTimeout(resolve, 2000));
//             break; // ✅ 로딩 성공 시 루프 종료
//         } catch (error: any) {
//             loadAttempts++;
//             console.warn(`브루넬로 페이지 로드 실패 [${error.message}]`);
//             if (loadAttempts < 3) {

//                 portIndex = (portIndex + 1) % PORT_POOL.length;
//                 const nextPort = PORT_POOL[portIndex];

//                 ({ browser, page } = await connectSilkChrome(nextPort));
//                 continue;
//             } else {
//                 console.error('최대 로드 시도 초과 - 다음 URL로 이동합니다.');
//                 break;
//             }
//         }
//     }
    

//         const isAvailable = await page.evaluate(() => {
//             return !!document.querySelector(
//                 'button.cc-button-primary.add-to-cart.visible-check'
//             );
//         });

//         if (!isAvailable) {
//             continue;
//         }

//         const productDetails = await page.evaluate(async (designerFromNode) => {

//             let size = null;

//             // 1️⃣ One Size 우선 체크
//             const oneSizeBtn = document.querySelector(
//                 'button.cc-size-choice-button #js-size-text-selected'
//             );

//             if (
//             oneSizeBtn &&
//             oneSizeBtn.textContent &&
//             /one\s*size/i.test(oneSizeBtn.textContent.trim())
//             ) {
//             size = '원사이즈';
//             }

//             /* ===============================
//             1️⃣ 기존 One Size (사이즈 리스트 1개)
//             ================================ */
//             if (!size) {
//             const sizeContainers = Array.from(
//                 document.querySelectorAll('ul.cc-size-list li.cc-size-container')
//             );

//             if (sizeContainers.length === 1) {
//                 const oneSizeText = sizeContainers[0]
//                 .querySelector('.cc-value')
//                 ?.textContent
//                 ?.trim();

//                 if (oneSizeText && /one\s*size/i.test(oneSizeText)) {
//                 size = '원사이즈';
//                 }
//             }

//             if (!size) {
//             const sizeList: string[] = [];

//             // 2️⃣ 일반 사이즈 수집 (품절 제외)
//             sizeContainers.forEach(li => {
//                 const btn = li.querySelector<HTMLButtonElement>('button.cc-single-size');
//                 if (!btn) return;

//                 // ❌ 품절
//                 if (btn.disabled) return;

//                 const sizeText = btn
//                 .querySelector('.cc-value')
//                 ?.textContent
//                 ?.trim();

//                 if (!sizeText) return;

//                 // ❌ 안전장치 (No longer available)
//                 if (/no longer available/i.test(btn.innerText)) return;

//                 sizeList.push(sizeText);
//             });

//             if (sizeList.length > 0) {
//                 size = [...new Set(sizeList)].join(', ');
//             }
//             }
//         }

//             // 3️⃣ 전부 품절이면 null 유지



//             const site = 'Brunello';
//             const designer = designerFromNode;
//             const titleElement = document.querySelector('.cc-pdp__content-title span.cc-pdp__title--mobile');
//             const title = titleElement ? titleElement.textContent?.trim() || '' : '';
//             const priceElement = document.querySelector('span.cc-price-text');
//             let price = null;

//             if (priceElement) {
//             const raw = priceElement.textContent.trim(); // "€ 1.600,00"

//             price = parseInt(
//                 raw
//                 .replace(/[^\d,\.]/g, '') // 숫자, 콤마, 점만 남김
//                 .replace('.', '')         // 천 단위 제거
//                 .replace(',', '.'),       // 소수점 처리
//                 10
//             );
//             }
//             const colorEl = document.querySelector('.cc-color-text');
//             const color = colorEl
//             ? colorEl.textContent.replace(/\s*\(.*?\)\s*/g, '').trim()
//             : '';

//             const styleIdElement = document.querySelector(
//                 'span.cc-pdp__sku.cc-pdp__sku--desktop'
//             );

//             const styleId = styleIdElement
//             ? (styleIdElement.textContent?.match(/SKU:\s*([A-Za-z0-9]+)/)?.[1] || '')
//             : '';

//             const brandstyleId = styleId || '';

//             const imageUrls = [];

//             document.querySelectorAll('div.cc-content-image').forEach(el => {
//             // 1️⃣ 1200px 우선
//             let source = el.querySelector('source[media="(min-width: 1200px)"]');

//             // 2️⃣ 없으면 1920px fallback
//             if (!source) {
//                 source = el.querySelector('source[media="(min-width: 1920px)"]');
//             }

//             if (!source) return;

//             const srcset = source.getAttribute('srcset');
//             if (!srcset) return;

//             imageUrls.push(srcset.trim());
//             });

//             let mainInfo = '';
//             let madeIn = ''; // ❗ 사용 안 함 (요청대로 유지하되 로직 없음)

//             // ✅ DESCRIPTION / MATERIALS / DETAILS 만 포함
//             const validAccordionCols = [
//             'cc-pdp__accordion__col--1',
//             'cc-pdp__accordion__col--2',
//             'cc-pdp__accordion__col--3',
//             ];

//             const resultLines: string[] = [];

//             const accordionCols = Array.from(
//             document.querySelectorAll<HTMLDivElement>(
//                 'div.cc-pdp__accordion__col'
//             )
//             );

//             accordionCols.forEach(col => {
//             // ❌ PACKAGING / SHIPPING 제외
//             const isTarget = validAccordionCols.some(cls =>
//                 col.classList.contains(cls)
//             );
//             if (!isTarget) return;

//             const textElements = col.querySelectorAll<HTMLElement>(
//                 '.cc-pdp__accordion__content__text'
//             );

//             textElements.forEach(el => {
//                 const text = el.textContent?.trim();
//                 if (!text) return;

//                 resultLines.push(text);
//             });
//             });

//             if (resultLines.length > 0) {
//             mainInfo = resultLines.join('\n');
//             }


//             return { site, designer, title, price, color, mainInfo, madeIn, styleId, size, brandstyleId, imageUrls };
//         },designerFromNode);

//         if (!productDetails || !productDetails.mainInfo || !productDetails.styleId || !productDetails.title || !productDetails.price || !productDetails.imageUrls.length || !productDetails.size || !productDetails.brandstyleId) {
//             console.warn('브루넬로 데이터 누락 - 다음 productUrl로 이동');
//             continue; // 다음 productUrl로 이동
//         }


//         // 카테고리 매핑 데이터 찾기
//         const categoryMapping = await this.mappingRepository.findOne({ where: { siteUrl } });
//         if (!categoryMapping) {
//             throw new Error('매핑된 카테고리를 찾을 수 없습니다.');
//         }

//         try {
//         const existingProduct = await this.productRepository.findOne({ where: {
//             styleId: productDetails.styleId,
//             partnerKey: partnerKey, 
//             apiKey: apiKey
//             }
//         });
        
//         if (existingProduct) {
//             // 이미 존재하는 상품이므로 업데이트를 해야 함
//             console.log(`✅상품 업데이트: ${existingProduct.title} - styleID: ${existingProduct.styleId}`);
            
//             // 상품 정보를 업데이트 (기존 데이터베이스 업데이트)
//             existingProduct.siteUrl = siteUrl;
//             existingProduct.size = productDetails.size;
//             // // existingProduct.title = productDetails.title;
//             existingProduct.price = productDetails.price;
//             existingProduct.touched = true;
//             existingProduct.categoryName = category.categoryName;
//             const godoMallCategoryName = category.godoMallCategoryName;
//             existingProduct.visitUrl = productUrl;
//         existingProduct.godoMallCategoryCode = godoMallCategoryCode;

//             // ✅ 상품 카테고리 코드 저장
//             existingProduct.godoMallCategoryCode = godoMallCategoryCode;

//             // ✅ 플랫폼 타입 결정 (8자리면 SMARTSTORE, 그 외엔 GODOMALL)
//             if (godoMallCategoryCode.length === 8) {
//                 existingProduct.platform = 'smartstore';
//             } else {
//                 existingProduct.platform = 'godomall';
//             }

//             if (existingProduct.platform === 'smartstore') {
//                 // ✅ 스마트스토어 수정
//                 const auth = {
//                     smartStoreID: partnerKey,
//                     smartStoreSecret: apiKey,
//                 };
//                 await this.smartstoreApiService.updateSmartStoreProduct(existingProduct, auth, partnerKey,undefined,godoMallCategoryName);

//             } else {
//                 // ✅ 고도몰 등록
//                 const xmlUrl = await this.r2Service.uploadXmlToR2SmartStore(
//                 existingProduct.styleId, 
//                 existingProduct, 
//                 godoMallCategoryCode, 
//                 existingProduct.mainImageUrl, 
//                 existingProduct.additionalImageUrls, 
//                 partnerKey,
//                 apiKey
//                 );
//                 await this.godoMallService.registerProductWithXmlUrl(partnerKey, apiKey, xmlUrl, existingProduct, existingProduct.styleId);
//             }
    
//             // ✅ DB에 저장
//             await this.productRepository.save(existingProduct);

//         } else {
//             // 새 상품이므로 기존 로직으로 등록 진행
//             const newProduct = this.productRepository.create(productDetails);
//             newProduct.mainImageUrl = productDetails.imageUrls[0];
//             newProduct.additionalImageUrls = productDetails.imageUrls.slice(1); // 추가 이미지들 저장
//             newProduct.touched = true;
//             newProduct.categoryName = categoryMapping.categoryName;
//             newProduct.customId = customId;
//             newProduct.accountPlatform = accountPlatform;
//             newProduct.siteUrl = siteUrl;
//             newProduct.color = productDetails.color;
//             newProduct.visitUrl = productUrl;
//             newProduct.godoMallCategoryCode = godoMallCategoryCode;

//             const godoMallCategoryName = category.godoMallCategoryName;

//             // ✅ 상품 카테고리 코드 저장
//             newProduct.godoMallCategoryCode = godoMallCategoryCode;

//             // ✅ 플랫폼 타입 결정
//             if (godoMallCategoryCode.length === 8) {
//                 newProduct.platform = 'smartstore';
//             } else {
//                 newProduct.platform = 'godomall';
//             }

//             const r2MainImageUrl = await this.uploadImageToR2(
//                 
//                 productDetails.imageUrls[0],  // ✅ 이미지 URL을 첫 번째 인자로 전달
//                 `${productDetails.styleId}-main.jpg`,  // ✅ 저장할 파일명
//                 newProduct,
//                 partnerKey
//             );
//             newProduct.mainImageUrl = r2MainImageUrl; // ✅ R2 URL 저장
            
//             const additionalR2Urls = [];
//             for (let i = 1; i < productDetails.imageUrls.length; i++) {
//                 const r2AdditionalImageUrl = await this.uploadImageToR2(
//                     
//                     productDetails.imageUrls[i],  // ✅ 추가 이미지 URL
//                     `${productDetails.styleId}-additional-${i}.jpg`,  // ✅ 저장할 파일명
//                     newProduct,
//                     partnerKey
//                 );
//                 additionalR2Urls.push(r2AdditionalImageUrl);
//             }
//             newProduct.additionalImageUrls = additionalR2Urls; // ✅ 추가 이미지 리스트 저장

//             const allR2Urls = [newProduct.mainImageUrl,...(newProduct.additionalImageUrls || [])];
            
//             if (newProduct.platform === 'smartstore') {

//                 // ★ 새로운 로직: 이미지 데이터를 base64 및 원본 URL 배열로 생성
//                 const base64ImageList: string[] = [];
//                 const originThumbnailUrls: string[] = [];

//                 for (const r2Url of allR2Urls) {
//                     try {
//                         const response = await axios.get(r2Url, {
//                             responseType: 'arraybuffer',
//                             timeout: 10000,
//                         });
//                         const buffer = Buffer.from(response.data, 'binary');
//                         const base64 = buffer.toString('base64');
//                         base64ImageList.push(base64);
//                         originThumbnailUrls.push(r2Url);
//                     } catch (error: any) {
//                         console.error('이미지 R2 불러오기 실패:', r2Url, error.message);
//                         //logErrorToDesktop(error, `8.오류 발생`);
//                     }
//                 }

//                 // ✅ 스마트스토어 등록
//                 await this.handleSmartstoreRegistration(newProduct, partnerKey, apiKey,{ base64ImageList, originThumbnailUrls },godoMallCategoryName);

//             } else {
//                 // ✅ 고도몰 등록
//                 const xmlUrl = await this.r2Service.uploadXmlToR2SmartStore(
//                     newProduct.styleId,
//                     newProduct,
//                     godoMallCategoryCode,
//                     newProduct.mainImageUrl,
//                     newProduct.additionalImageUrls,
//                     partnerKey,
//                     apiKey
//                 );
//                 await this.godoMallService.registerProductWithXmlUrl(partnerKey, apiKey, xmlUrl, newProduct, newProduct.styleId);
//             }
//             // ✅ DB에 저장
//             await this.productRepository.save(newProduct);
//             console.log(`✅ 상품 저장 완료: ${productDetails.designer} ${productDetails.title}`);
//             }
//         } catch (error: any) {
//             console.error(`상품 등록 처리 실패 (${productUrl}): ${error.message}`);
//             continue;
//         }
//     }
//     try {

//     } catch (error: any) {

//     }
    
//     try {

//     } catch (error: any) {
//         console.warn("⚠️ 브라우저 닫기 중 오류 발생:", error.message);
//     }

//     // 크롤링 작업 후 품절 처리 실행
//     await this.handleUnsoldProducts(siteUrl, partnerKey, apiKey, customId, accountPlatform); // 품절 처리
//     await this.godoMallService.finalizeXmlDeletion(); // 추가된 호출
// }

// 🔥 BrightData Brunello 크롤링 시작
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

    const category = await this.mappingRepository.findOne({
        where: { customId: customId, accountPlatform: accountPlatform, siteUrl: siteUrl },
    });

    if (!category) {
        throw new Error('매핑된 카테고리를 찾을 수 없습니다.');
    }

    /* ============================================================
        1️⃣ Studio Scraper로 상품 URL 수집
    ============================================================ */

    const productUrlSet = new Set<string>();
    let productUrlCandidateCount = 0;
    let productUrlDuplicateCount = 0;

    const addProductUrl = (href?: string) => {
        if (!href) return;

        const normalized = this.normalizeBrunelloProductUrl(href, siteUrl);
        if (!normalized) return;

        productUrlCandidateCount += 1;

        if (productUrlSet.has(normalized)) {
            productUrlDuplicateCount += 1;
            return;
        }

        productUrlSet.add(normalized);
    };

    // Bright Data Studio/DCA path is kept above for reference.
    // Product URL collection now uses Bright Data Browser API only.

    if (!productUrlSet.size) {
        const browserProductUrls = await this.collectBrunelloProductUrlsFromBrowserApi(siteUrl);
        browserProductUrls.forEach(url => addProductUrl(url));
    }

    const uniqueProductUrls = [...productUrlSet];

    if (productUrlDuplicateCount > 0) {
        console.log(`Brunello duplicate product URLs removed: ${productUrlDuplicateCount}/${productUrlCandidateCount}`);
    }

    console.log(`브루넬로 최종 수집된 상품 URL 수: ${uniqueProductUrls.length} - ${category?.categoryName || '카테고리 없음'}`);

    if (!uniqueProductUrls.length) {
        console.warn('⚠️ 상품 URL 없음');
        return;
    }

    /* ============================================================
        2️⃣ 상품 상세 5개씩 병렬 처리
    ============================================================ */

    const processedStyleKeys = new Set<string>();
    const chunkSize = 15;

    for (let i = 0; i < uniqueProductUrls.length; i += chunkSize) {

        const chunk = uniqueProductUrls.slice(i, i + chunkSize);

        await Promise.all(
            chunk.map(async (productUrl,idx) => {

                const globalIndex = i + idx;

                console.log(
                `✅ (${globalIndex + 1}/${uniqueProductUrls.length}) 브루넬로 ${category?.categoryName || '카테고리 없음'} 수집 중`
                );

                try {

                const productHtml =
                await this.r2Service.getHtmlFromUrl2(productUrl);

                const $ = cheerio.load(productHtml);

                // 🔥 키즈 키워드
                const kidsKeywords = [
                    'junior',
                    'boys',
                    'childrens',
                    'girls',
                    'baby',
                    'bekleidung',
                    'children',
                    '키즈',
                    'kids',
                    'enfant',
                ];

                // 🔥 상품 URL 기준 키즈 여부 판단
                const isKids = kidsKeywords.some(keyword =>
                    new RegExp(`/${keyword}/`, 'i').test(productUrl)
                );


                /* =====================================================
                productDetails 생성
                ===================================================== */

                const site = 'Brunello';
                const designer = isKids ? '브루넬로쿠치넬리 키즈' : '브루넬로쿠치넬리';

                /* ---------- TITLE ---------- */

                const title =
                $('.cc-pdp__content-title')
                    .find('span')
                    .first()
                    .text()
                    .trim() || '';

                /* ---------- PRICE ---------- */

                const rawPrice =
                $('span.cc-price-text')
                    .text()
                    .replace(/[^\d,\.]/g, '')
                    .replace('.', '')
                    .replace(',', '.');

                const price = parseInt(rawPrice || '0', 10);

                /* ---------- COLOR ---------- */

                const color =
                $('.cc-color-text')
                    .text()
                    .replace(/\s*\(.*?\)\s*/g, '')
                    .trim() || '';

                /* ---------- STYLE ---------- */

                let skuStyleId =
                $('span.cc-pdp__sku')
                    .text()
                    .match(/SKU:\s*([A-Za-z0-9]+)/)?.[1] || '';

                // 🔥 뒤에 SKU 붙어있으면 제거
                if (skuStyleId.endsWith('SKU')) {
                skuStyleId = skuStyleId.slice(0, -3);
                }

                skuStyleId = skuStyleId.toUpperCase();

                const urlStyleId = this.extractBrunelloStyleIdFromUrl(productUrl);
                const styleId = urlStyleId || skuStyleId;
                const brandstyleId = skuStyleId || styleId;

                /* ---------- SIZE ---------- */

                let size = '';
                let soldOut = false;

                const sizeButtons =
                $('ul.cc-size-list li.cc-size-container');

                if (!sizeButtons.length) {
                size = '원사이즈';
                } else {

                const available: string[] = [];

                sizeButtons.each((_, el) => {

                    const btn = $(el).find('button.cc-single-size');

                    if (!btn.length) return;
                    if (btn.attr('disabled')) return;

                    const text =
                    btn.find('.cc-value').text().trim();

                    if (!text) return;
                    if (/no longer available/i.test(btn.text())) return;

                    available.push(text);
                });

                if (!available.length) {
                    soldOut = true;
                    size = '';
                } else {
                    size = [...new Set(available)].join(', ');
                }
                }

                /* ---------- MAIN INFO ---------- */

                let mainInfo = '';
                let madeIn = '';

                const sections = [
                'cc-pdp__accordion__col--1',
                'cc-pdp__accordion__col--2',
                'cc-pdp__accordion__col--3',
                ];

                sections.forEach(cls => {
                $(`div.${cls}`)
                    .find('.cc-pdp__accordion__content__text')
                    .each((_, el) => {
                    const text = $(el).text().trim();
                    if (text) mainInfo += text + '\n';
                    });
                });

                mainInfo = mainInfo.trim();

                /* ---------- IMAGES ---------- */

                const imageUrls = new Set<string>();

                $('div.cc-content-image source[media="(min-width: 1200px)"]')
                .each((_, el) => {
                    const src = $(el).attr('srcset');
                    if (src) imageUrls.add(src.trim());
                });

                if (!imageUrls.size) {
                $('div.cc-content-image source')
                    .each((_, el) => {
                    const src = $(el).attr('srcset');
                    if (src) imageUrls.add(src.trim());
                    });
                }

                const productDetails = {
                site,
                designer,
                title,
                price,
                color,
                mainInfo,
                madeIn,
                styleId,
                size,
                brandstyleId,
                imageUrls: [...imageUrls],
                soldOut,
                };

                /* =====================================================
                유효성 체크
                ===================================================== */

                if (productDetails.soldOut) {
                console.warn(`❌ Brunello 품절 → ${productUrl}`);
                return;
                }

                if (
                !productDetails.mainInfo ||
                !productDetails.styleId ||
                !productDetails.title ||
                !productDetails.price ||
                !productDetails.imageUrls.length ||
                !productDetails.size ||
                !productDetails.brandstyleId
                ) {
                console.warn('⚠️ Brunello 데이터 누락');
                console.dir(productDetails, { depth: null });
                return;
                }

                // 카테고리 매핑 데이터 찾기
                const styleKey = `${productDetails.site}:${customId}:${accountPlatform}:${productDetails.styleId}`;
                if (processedStyleKeys.has(styleKey)) {
                console.warn(`Brunello duplicate style in current run skipped: ${productDetails.styleId} - ${productUrl}`);
                return;
                }
                processedStyleKeys.add(styleKey);

                const categoryMapping = await this.mappingRepository.findOne({ where: { siteUrl } });
                if (!categoryMapping) {
                    throw new Error('매핑된 카테고리를 찾을 수 없습니다.');
                }

                const existingProduct = await this.productRepository.findOne({ where: {
            site: productDetails.site,
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
                const newProduct = this.productRepository.create(productDetails);

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

                    if (
                        errorMessage.includes('요청 수 소진') ||
                        errorMessage.includes('구독 기간이 만료') ||
                        errorMessage.includes('플랜 구독 후 이용할 수 있습니다.') ||
                        errorMessage.includes('요청 수 설정이 없습니다.')
                    ) {
                        throw error; // 🔥 전체 스케줄 중단
                    }


                    console.error(`❌ 상품 처리 실패 (${productUrl})`);

                    if (error.response) {
                        console.error('STATUS:', error.response.status);
                        console.error('HEADERS:', error.response.headers);
                        console.error('DATA:', error.response.data?.toString?.() || error.response.data);
                    }

                    else if (error.request) {
                        console.error('NO RESPONSE RECEIVED');
                    }

                    else {
                        console.error('ERROR MESSAGE:', error.message);
                    }
                }
            }));
        }

        /* ============================================================
            3️⃣ 품절 정리
        ============================================================ */

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
}
