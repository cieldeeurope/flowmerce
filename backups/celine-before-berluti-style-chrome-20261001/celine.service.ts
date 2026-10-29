import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Page, Browser } from 'puppeteer';
import puppeteer from 'puppeteer-extra';
import { GodoMallService } from 'src/godomall/godomall.service';
import { Repository } from 'typeorm';
import { R2Service } from '../cloudflare/r2.service';
import axios from 'axios';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { spawn } from 'child_process';
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
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

type CelineProxyInfo = {
  host: string;
  port: number;
  username: string;
  password: string;
};

function parseCelineAuthProxy(line: string): CelineProxyInfo {
  const value = String(line || '').trim().replace(/^https?:\/\//i, '');
  if (value.includes('|')) {
    const [hostport, auth] = value.split('|');
    const [host, port] = hostport.split(':');
    const [username, password] = auth.split(':');
    return { host, port: Number(port), username, password };
  }

  const [auth, hostport] = value.split('@');
  const [username, password] = auth.split(':');
  const [host, port] = hostport.split(':');
  return { host, port: Number(port), username, password };
}

let celineProxyIndex = -1;

function pickCelineProxy(proxyLines: string[]): CelineProxyInfo {
  if (!proxyLines.length) throw new Error('brightproxy2 프록시 목록이 비어있습니다.');
  celineProxyIndex = celineProxyIndex < 0
    ? Math.floor(Math.random() * proxyLines.length)
    : (celineProxyIndex + 1) % proxyLines.length;
  return parseCelineAuthProxy(proxyLines[celineProxyIndex]);
}

class CelineBlockedError extends Error {}

function getCelineChromeExecutablePath(): string | undefined {
  const candidates = [
    process.env.CELINE_CHROME_EXECUTABLE_PATH,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  ];
  return candidates.find((candidate): candidate is string => Boolean(candidate && fs.existsSync(candidate)));
}

async function launchCelineNativeChrome(proxy: CelineProxyInfo): Promise<Browser> {
  const executablePath = getCelineChromeExecutablePath();
  if (!executablePath) throw new Error('설치된 Chrome 실행 파일을 찾지 못했습니다.');

  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'flowmerce-celine-cdp-'));
  let profileCleaned = false;
  const cleanupUserDataDir = () => {
    if (profileCleaned) return;
    try {
      fs.rmSync(userDataDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
      profileCleaned = true;
    } catch (error: any) {
      console.warn(`⚠️ Celine 임시 Chrome 프로필 정리 실패: ${error?.message || error}`);
    }
  };

  const chrome = spawn(executablePath, [
    `--user-data-dir=${userDataDir}`,
    '--remote-debugging-port=0',
    // 프록시 원인 확인용 임시 비활성화
    // `--proxy-server=http://${proxy.host}:${proxy.port}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--window-size=1920,1080',
    'about:blank',
  ], { stdio: 'ignore', windowsHide: false });

  chrome.once('exit', cleanupUserDataDir);
  chrome.once('close', cleanupUserDataDir);
  let launchError: Error | null = null;
  chrome.once('error', error => { launchError = error; });

  try {
    const activePortFile = path.join(userDataDir, 'DevToolsActivePort');
    let webSocketEndpoint = '';
    for (let attempt = 0; attempt < 100; attempt++) {
      if (launchError) throw launchError;
      if (chrome.exitCode !== null) throw new Error(`Chrome exited early: ${chrome.exitCode}`);
      if (fs.existsSync(activePortFile)) {
        const [port, endpointPath] = fs.readFileSync(activePortFile, 'utf8').trim().split(/\r?\n/);
        if (/^\d+$/.test(port) && endpointPath?.startsWith('/devtools/browser/')) {
          webSocketEndpoint = `ws://127.0.0.1:${port}${endpointPath}`;
          break;
        }
      }
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    if (!webSocketEndpoint) throw new Error('Chrome DevTools 연결 주소를 20초 안에 찾지 못했습니다.');

    const browser = await puppeteer.connect({ browserWSEndpoint: webSocketEndpoint });
    browser.on('disconnected', () => {
      if (chrome.exitCode === null) chrome.kill();
    });
    return browser;
  } catch (error) {
    if (chrome.exitCode === null) chrome.kill();
    else cleanupUserDataDir();
    throw error;
  }
}


async function configureCelinePage(page: Page): Promise<void> {
  await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
  await page.setCacheEnabled(false);
}

// 에러 로그 저장경로 (celine 폴더)
// const errorLogDir = path.join(
//   '\\\\CHANMIN\\Desktop\\크롤링\에러로그',
//   'celine'
// );

// // 폴더 없으면생성
// if (!fs.existsSync(errorLogDir)) {
//   fs.mkdirSync(errorLogDir, { recursive: true });
// }

// // 최종 로그 파일 경로
// const errorLogPath = path.join(errorLogDir, 'celine_error_log.txt');

// // 에러 저장함수
// function //logErrorToDesktop(error: any, context: string = '') {
//   try {
//     const timestamp = new Date().toISOString();
//     const message = `[${timestamp}] ${context} - ${error?.message || error}\n`;

//     fs.appendFileSync(errorLogPath, message, 'utf-8');
//     console.error(message); // 기존 콘솔 출력은 유지
//   } catch (fileError) {
//     console.error('에러 로그 저장 실패:', fileError.message);
//   }
// }

@Injectable()
export class CelineService {
  private readonly celineBrowserProxy = new WeakMap<Browser, CelineProxyInfo>();

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

  private async wait(ms: number): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, ms));
  }

  private async connectCelineBrowser(): Promise<Browser> {
    const proxyLines = await this.r2Service.loadBrightProxies2();
    const proxy = pickCelineProxy(proxyLines);
    const browser = await launchCelineNativeChrome(proxy);
    this.celineBrowserProxy.set(browser, proxy);
    return browser;
  }

  private async createCelinePage(browser: Browser): Promise<Page> {
    const page = await browser.newPage();
    const proxy = this.celineBrowserProxy.get(browser);
    if (!proxy) throw new Error('Celine Chrome 프록시 인증정보를 찾지 못했습니다.');
    // 프록시 원인 확인용 임시 비활성화
    // await page.authenticate({ username: proxy.username, password: proxy.password });
    await configureCelinePage(page);
    return page;
  }

  private async loadCelineChromePage(page: Page, targetUrl: string): Promise<void> {
    await page.setJavaScriptEnabled(true);
    await page.setOfflineMode(false);
    page.setDefaultNavigationTimeout(2 * 60 * 1000);
    const response = await page.goto(targetUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 2 * 60 * 1000,
    });

    const status = response?.status();
    const protectionText = (await page.evaluate(() => document.body?.innerText || ''))
      .slice(0, 20000)
      .toLowerCase();
    if (
      status === 403 ||
      protectionText.includes('access denied') ||
      protectionText.includes("don't have permission") ||
      protectionText.includes('captcha') ||
      protectionText.includes('request blocked') ||
      protectionText.includes('forbidden')
    ) {
      throw new CelineBlockedError(`Celine access denied: ${page.url()}`);
    }
    if (!response || (status !== undefined && status >= 400)) {
      throw new Error(`Celine navigation failed: status=${status ?? 'none'}, url=${page.url()}`);
    }
  }

  private async waitForCelineListingPageReady(page: Page, siteUrl: string): Promise<void> {
    const deadline = Date.now() + 45000;
    let lastHref = '';
    let stableReadyCount = 0;
    let lastErrorMessage = '';

    while (Date.now() < deadline) {
      try {
        const state = await page.evaluate(() => {
          const text = (value: string | null | undefined) =>
            String(value || '').replace(/\s+/g, ' ').trim();

          const grid = document.querySelector('ul.o-listing-grid[data-osearch-productgrid]');
          const productLinkCount = grid
            ? grid.querySelectorAll(
                'li.o-listing-grid__item .m-product-listing__meta-container > a.m-product-listing__meta[href]',
              ).length
            : 0;
          const bodyText = text(document.body?.innerText).toLowerCase();

          return {
            href: window.location.href,
            readyState: document.readyState,
            hasListingData: Boolean(grid && productLinkCount > 0),
            isBlocked:
              bodyText.includes('access denied') ||
              bodyText.includes("don't have permission") ||
              bodyText.includes('captcha'),
          };
        });

        if (state.isBlocked) {
          throw new CelineBlockedError('Celine protection page returned');
        }

        if (state.readyState !== 'loading' && state.hasListingData) {
          if (state.href === lastHref) {
            stableReadyCount++;
          } else {
            lastHref = state.href;
            stableReadyCount = 1;
          }

          if (stableReadyCount >= 3) {
            return;
          }
        } else {
          stableReadyCount = 0;
          lastHref = state.href;
        }
      } catch (error: any) {
        lastErrorMessage = error?.message || String(error);
        if (
          !lastErrorMessage.includes('Execution context was destroyed') &&
          !lastErrorMessage.includes('Cannot find context') &&
          !lastErrorMessage.includes('Most likely because of a navigation')
        ) {
          throw error;
        }

        stableReadyCount = 0;
      }

      await this.wait(700);
    }

    throw new Error(`Celine listing page did not stabilize after goto: ${siteUrl}${lastErrorMessage ? ` (${lastErrorMessage})` : ''}`);
  }

  private async waitForCelineProductPageReady(page: Page, productUrl: string): Promise<void> {
    const deadline = Date.now() + 45000;
    let lastHref = '';
    let stableReadyCount = 0;
    let lastErrorMessage = '';

    while (Date.now() < deadline) {
      try {
        const state = await page.evaluate(() => {
          const text = (value: string | null | undefined) =>
            String(value || '').replace(/\s+/g, ' ').trim();

          const bodyRawText = text(document.body?.innerText);
          const priceText = text(document.querySelector('div.o-product__header-titles span.prices')?.textContent);
          const titleText =
            text(document.querySelector('span.o-product__title-truncate')?.textContent) ||
            text(document.querySelector('h1')?.textContent);
          const productIdText = text(document.querySelector('span.product-id.d-none')?.textContent);
          const bodyText = bodyRawText.toLowerCase();
          const hasRenderedPrice = /\b\d[\d.,]*\s*(eur|€)\b/i.test(bodyRawText);
          const hasProductAction =
            bodyText.includes('add to bag') ||
            bodyText.includes('notify me') ||
            bodyText.includes('contact us') ||
            bodyText.includes('check availability in store');

          return {
            href: window.location.href,
            readyState: document.readyState,
            hasProductData: Boolean(
              priceText ||
              titleText ||
              productIdText ||
              (hasRenderedPrice && hasProductAction)
            ),
            isBlocked:
              bodyText.includes('access denied') ||
              bodyText.includes("don't have permission") ||
              bodyText.includes('captcha'),
          };
        });

        if (state.isBlocked) {
          throw new CelineBlockedError('Celine protection page returned');
        }

        if (state.readyState !== 'loading' && state.hasProductData) {
          if (state.href === lastHref) {
            stableReadyCount++;
          } else {
            lastHref = state.href;
            stableReadyCount = 1;
          }

          if (stableReadyCount >= 3) {
            return;
          }
        } else {
          stableReadyCount = 0;
          lastHref = state.href;
        }
      } catch (error: any) {
        lastErrorMessage = error?.message || String(error);
        if (
          !lastErrorMessage.includes('Execution context was destroyed') &&
          !lastErrorMessage.includes('Cannot find context') &&
          !lastErrorMessage.includes('Most likely because of a navigation')
        ) {
          throw error;
        }

        stableReadyCount = 0;
      }

      await this.wait(700);
    }

    throw new Error(`Celine product page did not stabilize after goto: ${productUrl}${lastErrorMessage ? ` (${lastErrorMessage})` : ''}`);
  }


// 1. 카테고리 가져오기(프록시 교체 및 재시도 로직 추가)
async getCategories(siteUrls: string[]): Promise<{ categoryName: string; url: string }[]> {
  const allCategories: { categoryName: string; url: string }[] = [];
  
    // siteUrls를 순회하며 각 사이트에 대해 작업
    const processSiteUrls = async (urls: string[]): Promise<void> => {
      for (const siteUrl of urls) {
        let retryCount = 0;
        let success = false;
  
        const maxCategoryRetry = 5;
        while (retryCount < maxCategoryRetry && !success) {
          console.log(`✅ [${siteUrl}] Celine Chrome 연결`);
  
          const browser = await this.connectCelineBrowser();
  
          const page = await this.createCelinePage(browser);
  
          try {
            await this.loadCelineChromePage(page, siteUrl);
            console.log(`🔍 ${siteUrl} 진행 중..`);
            await new Promise((resolve) => setTimeout(resolve, 2000));
  
            // 1. 여성 카테고리 추출
            const womenCategories: { categoryName: string; url: string }[] =
              await page.evaluate(() => {
                const targetElement = document.querySelector('[data-gtm-name="WOMEN"]');
                if (!targetElement) {
                  console.error("여성 저장 요소를 찾을 수 없습니다.");
                  return [];
                }
                const container = targetElement.parentElement;
                const nestedLinks = container.querySelectorAll('ul > li > ul > li a[href]') as NodeListOf<HTMLAnchorElement>;
                const results: { categoryName: string; url: string }[] = [];
                
                nestedLinks.forEach(link => {
                  const url = link.href;
                  const a = document.createElement('a');
                  a.href = url;
                  const segments = a.pathname.split('/').filter(seg => seg !== "");
                  let categoryName = "";
                  if (segments.length === 4) {
                    categoryName = `${segments[1]} - ${segments[2]} - ${segments[3]}`;
                  } else if (segments.length === 5) {
                    categoryName = `${segments[1]} - ${segments[2]} - ${segments[3]} - ${segments[4]}`;
                  }
                  if (categoryName) {
                    results.push({ categoryName, url });
                  }
                });
                return results;
              });
            
            // 여성 카테고리 결과 저장
            womenCategories.forEach(category => {
              allCategories.push(category);
            });
            console.log(`${siteUrl} 여성 카테고리: ${womenCategories.map(c => c.categoryName).join(', ')}`);
  
            // 2. 남성 카테고리 추출
            const menCategories: { categoryName: string; url: string }[] =
              await page.evaluate(() => {
                const targetElement = document.querySelector('[data-gtm-name="MEN"]');
                if (!targetElement) {
                  console.error("남성 저장 요소를 찾을 수 없습니다.");
                  return [];
                }
                const container = targetElement.parentElement;
                const nestedLinks = container.querySelectorAll('ul > li > ul > li a[href]') as NodeListOf<HTMLAnchorElement>;
                const results: { categoryName: string; url: string }[] = [];
                
                nestedLinks.forEach(link => {
                  const url = link.href;
                  const a = document.createElement('a');
                  a.href = url;
                  const segments = a.pathname.split('/').filter(seg => seg !== "");
                  let categoryName = "";
                  if (segments.length === 4) {
                    categoryName = `${segments[1]} - ${segments[2]} - ${segments[3]}`;
                  } else if (segments.length === 5) {
                    categoryName = `${segments[1]} - ${segments[2]} - ${segments[3]} - ${segments[4]}`;
                  }
                  if (categoryName) {
                    results.push({ categoryName, url });
                  }
                });
                return results;
              });
            
            // 남성 카테고리 결과 저장(추가)
            menCategories.forEach(category => {
              allCategories.push(category);
            });
            console.log(`${siteUrl} 남성 카테고리: ${menCategories.map(c => c.categoryName).join(', ')}`);
  
            success = true; // 성공 시 while 탈출
          } catch (error: any) {
            console.error(`[${siteUrl}] 오류 발생: ${error.message}`);
            retryCount++;
            if (error instanceof CelineBlockedError) {
              console.warn(`⚠️ 차단으로 인한 재시도 (${retryCount}/${maxCategoryRetry})`);
              await this.wait(5000);
            } else {
              console.warn(`⚠️ [${siteUrl}] 재시도 (${retryCount}/${maxCategoryRetry})...`);
            }
          } finally {
            await browser.close();
          }
        }
  
        if (!success) {
          console.warn(`🚫 [${siteUrl}] ${maxCategoryRetry}번 시도 후 실패. 건너뜀.`);
        }
        console.log(`🔄 다음 URL로 이동...`);
      }
    };
  
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
      // 파일 이름의 .jpg 확장자 적용 (필요한 경우)
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

  private async collectCelineListingUrls(page: Page): Promise<{
    productUrls: string[];
    expectedCount: number;
  }> {
    return page.evaluate(async () => {
      const selector =
        'li.o-listing-grid__item .m-product-listing__meta-container > a.m-product-listing__meta[href]';
      const grid = document.querySelector<HTMLElement>('ul.o-listing-grid[data-osearch-productgrid]');
      if (!grid) return { productUrls: [], expectedCount: 0 };

      const expectedCount = Number(grid.dataset.olistinggridCount || 0);
      const categoryId = grid.dataset.olistinggridId || '';
      const urls = new Set<string>();
      const addLinks = (root: ParentNode) => {
        root.querySelectorAll<HTMLAnchorElement>(selector).forEach(anchor => {
          try {
            const url = new URL(anchor.getAttribute('href') || '', location.origin);
            if (url.hostname.includes('celine.com') && url.pathname.toLowerCase().endsWith('.html')) {
              url.search = '';
              url.hash = '';
              urls.add(url.href);
            }
          } catch {}
        });
      };

      addLinks(grid);
      if (!categoryId || expectedCount <= urls.size) {
        return { productUrls: [...urls], expectedCount };
      }

      const localeMatch = location.pathname.match(/^\/([a-z]{2})-([a-z]{2})(?:\/|$)/i);
      const language = (localeMatch?.[1] || 'en').toLowerCase();
      const country = (localeMatch?.[2] || 'de').toUpperCase();
      const endpoint = `/on/demandware.store/Sites-CELINE_${country}-Site/${language}_${country}/Search-UpdateGrid`;
      const batchSize = 20;

      for (let start = 20; start < expectedCount; start += batchSize) {
        const requestUrl = new URL(endpoint, location.origin);
        requestUrl.searchParams.set('cgid', categoryId);
        requestUrl.searchParams.set('prefn1', 'celShowInPLP');
        requestUrl.searchParams.set('prefv1', 'true');
        requestUrl.searchParams.set('start', String(start));
        requestUrl.searchParams.set('sz', String(batchSize));
        requestUrl.searchParams.set('selectedUrl', requestUrl.href);

        const response = await fetch(requestUrl.href, {
          credentials: 'include',
          headers: { 'X-Requested-With': 'XMLHttpRequest' },
        });
        if (!response.ok) {
          throw new Error(`Celine Search-UpdateGrid ${response.status}: start=${start}`);
        }

        const html = await response.text();
        const fragment = new DOMParser().parseFromString(html, 'text/html');
        const beforeCount = urls.size;
        addLinks(fragment);
        if (urls.size === beforeCount) break;
      }

      return { productUrls: [...urls], expectedCount };
    });
  }

  // Celine 사이트 크롤링 시작
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
    let browser: Browser | null = null;
    let page: Page | null = null;
    let productUrls: string[] = [];
    let categoryCollectionCompleted = false;

    const category = await this.mappingRepository.findOne({
      where: { customId: customId, accountPlatform: accountPlatform, siteUrl: siteUrl },
  });


  try {
  browser = await this.connectCelineBrowser();

    page = await this.createCelinePage(browser);
    // await page.setCacheEnabled(false);
    // await page.setRequestInterception(true);
    // page.on('request', (request) => {
    //     const resourceType = request.resourceType();
    //     if (resourceType === 'image' || resourceType === 'font') {
    //         request.abort(); // 이미지와 폰트 요청 차단
    //     } else {
    //         request.continue(); // 나머지 요청은 진행
    //     }
    // });

    const MAX_RETRY = 5; // 최대 재시도 횟수
    let retryAttempts = 0;

    while (retryAttempts < MAX_RETRY) {
        try {
            await this.loadCelineChromePage(page, siteUrl);
            await this.waitForCelineListingPageReady(page, siteUrl);
            const listingResult = await this.collectCelineListingUrls(page);
            productUrls = listingResult.productUrls;
            console.log(
              `셀린느 상품 목록 API 수집: ${productUrls.length}/${listingResult.expectedCount || '?'}개`,
            );
            await new Promise((resolve) => setTimeout(resolve, 3000));
            break; // 성공하면 반복 종료
        } catch (error: any) {
            if (error instanceof CelineBlockedError) {
              console.warn(`⚠️ 차단으로 인한 재시도 (${retryAttempts + 1}/${MAX_RETRY})`);
              await this.wait(5000);
            } else {
              console.warn(`⚠️ 페이지 이동 실패 (시도 ${retryAttempts + 1}/${MAX_RETRY}): ${error.message}`);
            }
            //logErrorToDesktop(error, `2.오류 발생`);

            retryAttempts++;

            if (page && !page.isClosed()) {
                await page.close().catch(() => undefined);
            }
            if (browser) {
                await browser.close().catch(() => undefined);
            }

            if (retryAttempts >= MAX_RETRY) {
                console.error(`최대 재시도 횟수 초과: ${siteUrl}`);
                //logErrorToDesktop(error, `3.오류 발생`);
                throw new Error(`Celine 카테고리 접속 ${MAX_RETRY}회 실패: ${siteUrl}`);
            }

            browser = await this.connectCelineBrowser();
            page = await this.createCelinePage(browser);

            // 다음 재시도를 위한 랜덤 대기 시간 (exponential backoff)
            const waitTime = Math.min(1000 * 2 ** retryAttempts, 10000); // 최대 10초 대기
            await new Promise((resolve) => setTimeout(resolve, waitTime));
        }
    }

    while (true) {
        try {
            // 현재 페이지에서 상품 URL 및 차단 여부 평가
            const { currentPageProductUrls, isBlocked} = await page.evaluate(() => {
                    const bodyText = document.querySelector('body')?.textContent || '';
                    const isBlocked =
                        document.querySelector('body') === null ||
                        bodyText.includes('Access Denied') ||
                        bodyText.includes('Too Many Requests') ||
                        bodyText.includes('429') ||
                        bodyText.includes('Enforced timeout') ||
                        bodyText.includes('net::ERR_TIMED_OUT');

                    const grid = document.querySelector('ul.o-listing-grid[data-osearch-productgrid]');
                    if (!grid) {
                      return { currentPageProductUrls: [], isBlocked };
                    }
                    const productUrls = Array.from(grid.querySelectorAll(
                        'li.o-listing-grid__item .m-product-listing__meta-container > a.m-product-listing__meta[href]'
                    ))
                    .map(a => {
                        const href = (a as HTMLAnchorElement).getAttribute('href') || '';
                        try {
                            const url = new URL(href, location.origin);
                            if (!url.hostname.includes('celine.com')) return '';
                            if (!url.pathname.toLowerCase().endsWith('.html')) return '';
                            url.hash = '';
                            url.search = '';
                            return url.href;
                        } catch {
                            return '';
                        }
                    })
                    .filter(Boolean);
            

            return { currentPageProductUrls: [...new Set(productUrls)], isBlocked };
      });

      if (isBlocked) {
          console.warn("페이지가 차단되었습니다. 프록시를 변경하고 다시 시도합니다.");
           // 새로운 프록시 설정
          // 기존 브라우저와 페이지 닫기
          if (page && !page.isClosed()) {
              await page.close();
          }
          if (browser) {
              await browser.close();
          }
          retryAttempts++;
          if (retryAttempts >= MAX_RETRY) {
              throw new Error(`${MAX_RETRY}번 재시도 초과 - 크롤링 종료`);
          }
          // 새로운 브라우저와 페이지 생성
          browser = await this.connectCelineBrowser();
          page = await this.createCelinePage(browser);
          await this.loadCelineChromePage(page, siteUrl);
          await this.waitForCelineListingPageReady(page, siteUrl);
          continue;
      }

      if (currentPageProductUrls.length === 0) {
          console.log("이상 상품이 없습니다. 반복문을 종료합니다.");
          break;
      }

        // 스크롤 안정화가 끝난 최종 DOM에서 대표 상품 URL을 한 번만 저장한다.
        productUrls = [...new Set([...productUrls, ...currentPageProductUrls])];
        break;
    } catch (error: any) {
      console.error(`에러 발생: ${error.message}`);
      //logErrorToDesktop(error, `4.오류 발생`);
      if (error.message.includes('Enforced timeout') ||
          error.message.includes('Navigation timeout') ||
          error.message.includes('net::ERR_TIMED_OUT') ||
          error.message.includes('Execution context was destroyed') ||
          error.message.includes('Cannot find context') ||
          error.message.includes('Most likely because of a navigation')) { 
          console.error("Enforced timeout,Navigation timeout,ERR_TIMED_OUT 문제가 발생했습니다. 브라우저를 재시작합니다.");
          if (browser) {
              try {
                  // 기존 브라우저와 페이지 닫기
                  if (page && !page.isClosed()) {
                      await page.close();
                  }
                  if (browser) {
                      await browser.close();
                  }
                  // 새로운 브라우저와 페이지 생성
                  browser = await this.connectCelineBrowser();
                  page = await this.createCelinePage(browser);
                  await this.loadCelineChromePage(page, siteUrl);
                  await this.waitForCelineListingPageReady(page, siteUrl);
                  const listingResult = await this.collectCelineListingUrls(page);
                  productUrls = [...new Set([...productUrls, ...listingResult.productUrls])];
                  await this.wait(3000);
              } catch (closeError: any) {
                  console.warn("브라우저 종료 중 추가 오류:", closeError.message);
              }
          }
           // 새로운 프록시 설정
          retryAttempts++;
          if (retryAttempts >= MAX_RETRY) {
              throw new Error(`${MAX_RETRY}번 재시도 초과 - 크롤링 종료`);
          }
          continue; // 루프를 다시 시작
      } else {
          throw error; // 예상치 못한 에러는 상위로 전달
      }
    }
  }
    categoryCollectionCompleted = true;
}
    finally {
      if (!categoryCollectionCompleted) {
        if (page && !page.isClosed()) {
          await page.close().catch(() => undefined);
        }
        if (browser && browser.isConnected()) {
          await browser.close().catch(() => undefined);
        }
      }
    // // 모든 작업 종료 후 브라우저 닫기
    // if (page && !page.isClosed()) {
    // await page.close();
    // }
    // if (browser) {
    // await browser.close();
    // }
    }

    if (productUrls.length === 0) {
      if (page && !page.isClosed()) {
        await page.close();
      }
      if (browser) {
        await browser.close();
      }
      throw new Error('상품 URL을 수집하지 못했습니다. 모든 시도가 실패했습니다.');
    }
    console.log(`셀린느 최종 수집된 상품 URL 수 ${productUrls.length} - ${category?.categoryName || '카테고리 없음'}`);

    try {
    for (const [index, productUrl] of productUrls.entries()) {
      let loadAttempts = 0;
      let success = false;
      let lastLoadError: any = null;

      const MAX_PRODUCT_RETRY = 5;
      while (loadAttempts < MAX_PRODUCT_RETRY) {
        try {
            await this.loadCelineChromePage(page, productUrl);
            await this.waitForCelineProductPageReady(page, productUrl);
            console.log(`Celine (${index + 1}/${productUrls.length}) collect: ${category?.categoryName || 'category none'}`);
            await new Promise((resolve) => setTimeout(resolve, 3000));
            success = true;
            break; // 로딩 성공 후 루프 종료
          } catch (error: any) {
              lastLoadError = error;
              loadAttempts++;
              if (error instanceof CelineBlockedError) {
                console.warn(`⚠️ 차단으로 인한 재시도 (${loadAttempts}/${MAX_PRODUCT_RETRY})`);
                await this.wait(5000);
              } else {
                console.warn(`페이지 로드 실패 (프록시 변경 ${loadAttempts}/${MAX_PRODUCT_RETRY}): ${error.message}`);
              }
              //logErrorToDesktop(error, `5.오류 발생`);
              if (loadAttempts < MAX_PRODUCT_RETRY) {
                  
                  console.log('Celine Chrome 세션 재연결');
                  if (page && !page.isClosed()) {
                      await page.close();
                  }
                  if (browser) {
                      await browser.close();
                  }
                  browser = await this.connectCelineBrowser();
                  page = await this.createCelinePage(browser);
                continue;
              } else {
                  console.error('최대 로드 시도 초과 - 다음 URL로 이동합니다.');
                  //logErrorToDesktop(error, `6.오류 발생`);
                  break;
              }
          }
      }

      if (!success) {
        if (lastLoadError instanceof CelineBlockedError) {
          throw new Error(`Celine 상품 페이지 차단 ${MAX_PRODUCT_RETRY}회 실패: ${productUrl}`);
        }
        continue;
      }


      const isAvailable = await page.evaluate(() => {
        const notifyMeDiv = document.querySelector('div.notify-me');
        const isNotifyMeAvailable = notifyMeDiv !== null && notifyMeDiv.hasAttribute('hidden');
      
        const cscDiv = document.querySelector('#cscExclusiveInformation');
        const isCscHidden = cscDiv !== null && cscDiv.classList.contains('s-hidden');
      
        // true일 때만 재고 있음
        return isNotifyMeAvailable && isCscHidden;
      });
      
      if (!isAvailable) {
        continue; // 🔄 재고 없으면 다음 상품으로 건너뛰기
      }

      // 가격 없는 상품 건너뛰기
      const price = await page.evaluate(() => {
        const el = document.querySelector('div.o-product__header-titles span.prices');
        if (!el) return null;
        const priceText = el.textContent.replace(/[^\d]/g, '');
        return priceText ? parseInt(priceText, 10) : null;
      });

      if (price === null || isNaN(price)) {
        console.warn('가격 없는 상품 건너뜀');
        continue;
      }
 

      const productDetails = await page.evaluate(async (currentUrl) => {
        const site = 'Celine';
        const designer = '셀린느';
        const titleElement = document.querySelector('span.o-product__title-truncate.f-body');
        const title = titleElement ? titleElement.textContent?.trim() || '' : '';
        const priceElement = document.querySelector('div.o-product__header-titles span.prices');
        const price = priceElement
          ? parseInt(priceElement.textContent.replace(/[^\d]/g, ''), 10)
          : null;
        const color = document.querySelector('p.m-selector__title')?.textContent?.trim() || '';
        
        const galleryLists = document.querySelectorAll('ul.o-product__gallery-imgs');

        // 모든 이미지 요소를 저장할 배열
        const imageElements = [];
        galleryLists.forEach((list) => {
          const imgs = list.querySelectorAll(
            'li button[data-pswp-src], li button[data-pswp-srcset]'
          );
          imgs.forEach((img) => imageElements.push(img));
        });

        // 각 이미지의 srcset에서 1440w 또는 가장 가까운 해상도의 URL 추출
        const imageUrls = imageElements
          .map((img) => {
            // 옵션 수정: pswp 계열 우선
            const srcset =
              img.getAttribute('data-pswp-srcset') ||
              img.getAttribute('srcset') ||
              img.getAttribute('data-srcset') ||
              '';

            // srcset이 아예 없으면 단일 src fallback
            if (!srcset) {
              return img.getAttribute('data-pswp-src') || '';
            }

            const candidateStrings = srcset.split(', ');
            const candidates = candidateStrings.map((candidate) => {
              const parts = candidate.trim().split(/\s+/);
              const url = parts[0];
              const size = parts[1] ? parseInt(parts[1], 10) : 0;
              return { url, size };
            });

            const desiredSize = 1440;
            let selectedItem = candidates.find((item) => item.size === desiredSize);

            if (!selectedItem) {
              candidates.sort(
                (a, b) => Math.abs(a.size - desiredSize) - Math.abs(b.size - desiredSize)
              );
              selectedItem = candidates[0];
            }

            return selectedItem ? selectedItem.url : '';
          })
          .filter((url) => url !== '');


        // 사이즈 정보 (CELINE 최종)
        const oneSizeLabel = '원사이즈';
        const isLikelySizedProduct = /\/(ready-to-wear|pret-a-porter|clothing|shoes|sneakers|boots|loafers|sandals|pumps|flats|belts|denim|pants|trousers|shorts|skirts|dresses|jackets|coats|tops|shirts|knitwear|sweaters|swimwear)\b/i
          .test(currentUrl || window.location.href);

        const selectorRoot = document.querySelector(
          '.o-product__selectors .m-selector--size'
        );

        let size;

        if (!selectorRoot) {
          if (isLikelySizedProduct) return null;
          size = oneSizeLabel;
        } else {
          const sizeElements = selectorRoot.querySelectorAll(
            'ul.m-selector__list li'
          );

          const sizeList = [];

          sizeElements.forEach(li => {
            const input = li.querySelector('input[type="radio"]');
            if (!input) return;

            // 품절 사이즈 제외 (CELINE 옵션)
            if (input.classList.contains('s-disabled')) return;

            const value =
              input.getAttribute('data-value') ||
              li.textContent.trim();

            if (!value) return;

            sizeList.push(value.replace(',', '.'));
          });

          // 중복 제거
          const uniqueSizes = [...new Set(sizeList)];

          if (uniqueSizes.length === 0) {
            console.log('⚠️ 모든 사이즈가 품절입니다. 다음 상품으로 이동합니다');
            return null;
          }

          size = uniqueSizes.join(', ');
        }


        // 상세 설명
        let mainInfo = '';
        const descriptions = Array.from(
            document.querySelectorAll('ul.o-product__descriptions.m-accordion li.m-accordion__item div.a-text.f-body')
        ).map(el => el.textContent.trim());
        mainInfo = descriptions.join('<br/>');

        // 스타일ID
        let styleId = '';
        const styleIdMatch = mainInfo.match(/Reference\s*:\s*([\w\d\.\-]+)/);
        if (styleIdMatch) {
            styleId = styleIdMatch[1].trim();
        } else {
            const productIdElem = document.querySelector('span.product-id.d-none');
            if (productIdElem) {
                styleId = productIdElem.textContent.trim();
            }
        }

        const brandstyleId = styleId;
        const madeIn = 'Italy';

        return { site, designer, title, price, color, mainInfo, madeIn, styleId, size, brandstyleId, imageUrls };
    }, productUrl);



      if (
        !productDetails ||
        !productDetails.mainInfo ||
        !productDetails.styleId ||
        !productDetails.title ||
        !productDetails.imageUrls.length ||
        !productDetails.size ||
        !productDetails.brandstyleId ||
        productDetails.price === null || isNaN(productDetails.price) || productDetails.price === 0
      ) {
        console.warn('셀린느 데이터 누락 - 다음 productUrl로 이동');
        continue;
      }

      // 이미지가 없는 경우 상품은 건너뜀
      if (!productDetails || productDetails.imageUrls.length === 0) {
        if (loadAttempts < 2) {
            loadAttempts++;
            console.log('이미지가 없는 상품입니다. 프록시 변경 후 다시 시도합니다.');
            
            // 프록시 변경
            
            console.log('Celine Chrome 세션 재연결');
            
            // 기존 브라우저와 페이지 닫기
            if (page && !page.isClosed()) {
                await page.close();
            }
            if (browser) {
                await browser.close();
            }
        
            // 새로운 브라우저와 페이지 생성
            browser = await this.connectCelineBrowser();
            page = await this.createCelinePage(browser);
            // 동일한 productUrl로 다시 접속
            try {
                await this.loadCelineChromePage(page, productUrl);
                await this.waitForCelineProductPageReady(page, productUrl);
            } catch (error: any) {
                console.warn(`프록시 변경 전에 페이지 로드 실패: ${error.message}`);
                //logErrorToDesktop(error, `7.오류 발생`);
                continue; // 동일 URL 재시도 실패 후 다음 URL로 이동
            }
            continue; // 동일 productUrl로 재시도 완료
        } else {
            console.log('이미지가 없는 상품입니다. 다음 productUrl로 이동합니다.');
            continue; // 다음 productUrl로 이동
        }
        }

      // 카테고리 매핑 데이터 찾기
      const categoryMapping = await this.mappingRepository.findOne({ where: { siteUrl } });
      if (!categoryMapping) {
          throw new Error('매핑된 카테고리를 찾을 수 없습니다.');
      }

      try {
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
          // 스마트스토어 수정
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
          // 고도몰 등록
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

        // 성공했을 때만 저장
        if (isSuccess) {
          await this.productRepository.save(existingProduct);
        }

      } else {
        // 신상품 생성
        const newProduct = this.productRepository.create(productDetails);

        newProduct.touched = true;
        newProduct.categoryName = categoryMapping.categoryName;
        newProduct.customId = customId;
        newProduct.platform = account.platform; // smartstore / godomall
        newProduct.accountPlatform = account.accountPlatform; // smartstore_1
        newProduct.siteUrl = siteUrl;
        newProduct.color = productDetails.color;
        newProduct.visitUrl = productUrl;
newProduct.godoMallCategoryCode = godoMallCategoryCode;

        const godoMallCategoryName = category.godoMallCategoryName;

        // =========================
        // 이미지 R2 업로드
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
        // 플랫폼별 처리
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
              { imageUrls: productDetails.imageUrls, referer: productUrl },
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
              console.warn(`상품 스킵 ${newProduct.site} - ${newProduct.styleId}`);
            }
            break;
          }

          // =========================
          // UNKNOWN PLATFORM
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
            console.warn(`⚠️ 지원되지 않는 플랫폼 ${newProduct.platform}`);
            break;
          }
        }

        // =========================
        // DB 저장
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
            throw error; // ✅ 전체 일정 중단
        }

        continue;
    }
  }
    } finally {
      if (page && !page.isClosed()) {
        await page.close().catch(() => undefined);
      }
      if (browser && browser.isConnected()) {
        await browser.close().catch(() => undefined);
      }
    }
  
  // 플랫폼 타입에 따른 품절 처리
  switch (account.platform) {
    case 'smartstore': {
      await this.smartstoreApiService.deleteUnsoldSmartstoreProducts(
        siteUrl,
        customId,
        account.accountPlatform, // smartstore_1
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
      console.warn(`⚠️ 지원되지 않는 플랫폼(품절 처리): ${account.platform}`);
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
              product.additionalImageUrls, // 추가 이미지 사용
              partnerKey,
              apiKey
              );
          
              // 고도몰 API로 품절 처리 요청 전송
              await this.userService.assertRequestAvailable(customId, 1);
              await this.godoMallService.registerProductWithXmlUrl(partnerKey,apiKey,xmlUrl, product, product.styleId);
              await this.userService.consumeRequest(customId, 1);
          
              console.log(`셀린느 품절 처리 완료: ${product.title} (styleId: ${product.styleId})`);
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
          console.log('업데이트된 행 수', updateResult.affected); // 업데이트된 행 수로그 출력
      
          } catch (error: any) {
          // 초기화 중 에러 발생 시 로그 출력
          console.error(`touched 상태 초기화 중 오류 발생: ${siteUrl}`, error.message);
          //logErrorToDesktop(error, `10.오류 발생`);
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
  console.error(`계정 없음: ${customId} / ${accountPlatform}`);
  return;
}

const partnerKey = account.partnerKey;
const apiKey = account.apiKey;
    const MAX_RETRY = 5;
    const product = await this.productRepository.findOne({
        where: {
            goodsno: Number(goodsNo),
            customId,
            accountPlatform,
        },
    });
    if (!product) return;

    for (let attempt = 1; attempt <= MAX_RETRY; attempt++) {
        let browser: Browser | null = null;
        let page: Page | null = null;

        try {
        browser = await this.connectCelineBrowser();

        page = await this.createCelinePage(browser);
        await page.setCacheEnabled(false);
        await page.setRequestInterception(true);

        page.on('request', (request) => {
          // 요청 리소스 타입 확인
          const resourceType = request.resourceType();

          if (resourceType === 'image') {
            request.abort(); // 🛑 이미지 요청만 차단
          } else {
            request.continue(); // 나머지는 정상 통과
          }
        });

        await this.loadCelineChromePage(page, visitUrl);
        await this.waitForCelineProductPageReady(page, visitUrl);

        let productDetails = await page.evaluate(async (currentUrl) => {
          const normalizeText = (value: string | null | undefined) =>
            String(value || '').replace(/\s+/g, ' ').trim();
          const parsePrice = (value: string | null | undefined) => {
            const raw = normalizeText(value);
            if (!raw) return null;

            const cleaned = raw
              .replace(/[^\d.,]/g, '')
              .replace(/[.,](?=\d{3}(?:\D|$))/g, '')
              .replace(',', '.');
            const parsed = Number.parseFloat(cleaned);
            return Number.isFinite(parsed) ? Math.floor(parsed) : null;
          };

          const priceElement = document.querySelector('div.o-product__header-titles span.prices');
          const bodyRawText = normalizeText(document.body?.innerText);
          const bodyText = bodyRawText.toLowerCase();
          let price = priceElement ? parsePrice(priceElement.textContent) : null;
          if (!price) {
            const priceMatch = bodyRawText.match(/\b([\d.,]+)\s*(?:EUR|€)\b/i);
            price = priceMatch ? parsePrice(priceMatch[1]) : null;
          }

          // 사이즈 정보
          const oneSizeLabel = '원사이즈';
          const isLikelySizedProduct = /\/(ready-to-wear|pret-a-porter|clothing|shoes|sneakers|boots|loafers|sandals|pumps|flats|belts|denim|pants|trousers|shorts|skirts|dresses|jackets|coats|tops|shirts|knitwear|sweaters|swimwear)\b/i
            .test(currentUrl || window.location.href);

          const sizeElements = document.querySelectorAll('div.m-selector.m-selector--grid.m-selector--size ul.m-selector__list li');
          let size;
          if (!sizeElements || sizeElements.length === 0) {
              if (isLikelySizedProduct) return null;
              size = oneSizeLabel;
          } else {
              const sizeList = Array.from(sizeElements)
                .filter(li => !li.querySelector('input.s-disabled'))
                .map(li => li.textContent.trim().replace(',', '.'));
              if (sizeList.length === 0) {
                  console.log("⚠️ 모든 사이즈가 품절입니다. 다음 상품으로 이동합니다");
                  return null;
              }
              size = sizeList.join(', ');
          }

          const hasAddToBag = bodyText.includes('add to bag');
          const soldOut =
            !price ||
            !size ||
            size.length === 0 ||
            !hasAddToBag ||
            bodyText.includes('sold out') ||
            bodyText.includes('notify me');
          return { price, size ,soldOut};
        }, visitUrl);

        if (!productDetails) {
          productDetails = {
            price: 0,
            size: '',
            soldOut: true,
          };
        }

        if (!productDetails.soldOut) {
          // 정상일 때만 DB 업데이트
          product.lastModifiedDate = new Date();
          product.price = productDetails.price;
          product.size = productDetails.size;
          await this.productRepository.save(product);
        }

        // 1️⃣ XML 생성 및 R2 업로드
        const xmlUrl = await this.r2Service.uploadXmlToR2Update(
          product,
          product.styleId,
          partnerKey,
          productDetails.soldOut
        );

        // 업로드 실패 시 안전하게 중단
        if (!xmlUrl) {
          console.error(`XML 업로드 실패 - ${product.designer} ${product.title}`);
          return;
        }

        // 2단계 고도몰로 상품 등록/수정 API 호출
        
        await this.userService.assertRequestAvailable(customId, 1);
        await this.godoMallService.registerProductWithXmlUrl(
          partnerKey,
          apiKey,
          xmlUrl,
          product,
          product.styleId
        );
        await this.userService.consumeRequest(customId, 1);

        // WebSocket으로 고도몰에 알림 전송
        this.gateway.sendProductUpdate(
  `${customId}:${accountPlatform}:${goodsNo}`,
  {
          status: 'success',
          price: product.price,
          size: product.size,
          updatedAt: new Date().toISOString(),
        });

        // 3단계 고도몰 반영 후 XML 바로 삭제
        await this.godoMallService.deleteUpdateXml(xmlUrl);

        console.log(`✅상품 업데이트: ${product.title} - styleID: ${product.styleId}`);
        return;

      } catch (err: any) {
        if (err instanceof CelineBlockedError) {
          console.warn(`⚠️ 차단으로 인한 재시도 (${attempt}/${MAX_RETRY})`);
          await this.wait(5000);
        } else {
          console.warn(`🚨 Celine 업데이트 실패: ${err.message}`);
          return;
        }
      } finally {
        if (page && !page.isClosed()) await page.close().catch(() => undefined);
        if (browser && browser.isConnected()) await browser.close().catch(() => undefined);
      }
    }
    console.error('❌ 모든 프록시 재시도 실패 → 셀린느 업데이트 포기 (기존값 유지)');
  }
}
