import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import puppeteer, { Page, Browser } from 'puppeteer';
import { GodoMallService } from 'src/godomall/godomall.service';
import { Repository } from 'typeorm';
import { R2Service } from '../cloudflare/r2.service';
import axios from 'axios';
import * as cheerio from 'cheerio';
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



const PORT_POOL = [9224, 9234, 9244, 9254, 9264, 9274, 9284, 9294];

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



async function safeClose(page, browser) {
  try { if (page && !page.isClosed()) await page.close(); } catch {}
  try { if (browser) await browser.close(); } catch {}
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

async function waitForStableNetwork(
  page,
  stableTime = 3000,
  maxWait = 60000
) {
  return new Promise((resolve, reject) => {
    let idleTimer = null;
    const startTime = Date.now();
    let inProgress = 0;

    function cleanup() {
      page.off('request', onReq);
      page.off('requestfinished', onReqDone);
      page.off('requestfailed', onReqDone);
      if (idleTimer) clearTimeout(idleTimer);
    }

    function check() {
      if (Date.now() - startTime > maxWait) {
        cleanup();
        return reject(new Error('Network did not stabilize in time'));
      }

      if (inProgress === 0 && !idleTimer) {
        idleTimer = setTimeout(() => {
          cleanup();
          resolve(true);
        }, stableTime);
      }
    }

    function onReq(req) {
      // 🔥 무시할 요청 필터 (중요)
      const type = req.resourceType();
      if (['image', 'media', 'font'].includes(type)) return;

      inProgress++;
      if (idleTimer) {
        clearTimeout(idleTimer);
        idleTimer = null;
      }
    }

    function onReqDone() {
      inProgress = Math.max(0, inProgress - 1);
      check();
    }

    page.on('request', onReq);
    page.on('requestfinished', onReqDone);
    page.on('requestfailed', onReqDone);

    check();
  });
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
//   'fendi'
// );

// // 폴더 없으면 생성
// if (!fs.existsSync(errorLogDir)) {
//   fs.mkdirSync(errorLogDir, { recursive: true });
// }

// // 최종 로그 파일 경로
// const errorLogPath = path.join(errorLogDir, 'fendi_error_log.txt');

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
export class FendiService {
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

  private async getFendiHtml(url: string): Promise<string> {
    return this.r2Service.getHtmlFromUrl2(url);
  }

  private normalizeFendiProductUrl(href?: string | null): string | null {
    if (!href) return null;

    try {
      const url = new URL(href, 'https://www.fendi.com');

      if (!/^(www\.)?fendi\.com$/i.test(url.hostname)) {
        return null;
      }

      if (!/^\/[a-z]{2}-[a-z]{2}\//i.test(url.pathname)) {
        return null;
      }

      const lastSegment = url.pathname.split('/').filter(Boolean).pop() || '';
      if (!/-[a-z0-9]*\d[a-z0-9]*$/i.test(lastSegment)) {
        return null;
      }

      url.search = '';
      url.hash = '';
      return url.href;
    } catch {
      return null;
    }
  }

// 1. 카테고리 가져오기 (프록시 교체 및 재시도 로직 추가)
async getCategories(siteUrls: string[]): Promise<{ categoryName: string; url: string }[]> {
    const allCategories: { categoryName: string; url: string }[] = [];
    const seenUrls = new Set<string>();

    const selectors = [
      'li[data-cgid="de_woman"] ul.c-navbar__dropdown-sublist > li[data-cgid]:not([class*="--tile-in-group"]):not([class*="--subtitle"]):not([class*="--viewall"])',
      'li[data-cgid="de_woman_shoes"] ul.c-navbar__dropdown-sublist > li[data-cgid]:not([class*="--subtitle"]):not([class*="--viewall"])',
      'li[data-cgid="de_man"] ul.c-navbar__dropdown-sublist > li[data-cgid]:not([class*="--tile-in-group"]):not([class*="--subtitle"]):not([class*="--viewall"])',
      'li[data-cgid="de_man_shoes"] ul.c-navbar__dropdown-sublist > li[data-cgid]:not([class*="--subtitle"]):not([class*="--viewall"])',
    ];

    const extractCategoryParts = (absoluteUrl: string) => {
      const parts = new URL(absoluteUrl).pathname.split('/').filter(Boolean);
      const localeIndex = parts.findIndex((part) => /^[a-z]{2}-[a-z]{2}$/i.test(part));
      return localeIndex >= 0 ? parts.slice(localeIndex + 1) : parts;
    };

    const collectCategories = ($: cheerio.CheerioAPI, baseUrl: string) => {
      let items: { categoryName: string; url: string }[] = [];

      for (const selector of selectors) {
        const extracted = $(selector)
          .map((_, li) => {
            const href = $(li).find('a[data-name][href]').first().attr('href');
            if (!href) {
              return null;
            }

            const absoluteUrl = new URL(href, baseUrl).toString().split('?')[0];
            if (absoluteUrl.endsWith('.html')) {
              return null;
            }

            const categoryParts = extractCategoryParts(absoluteUrl);
            if (!categoryParts.length) {
              return null;
            }

            return {
              categoryName: categoryParts.join(' - '),
              url: absoluteUrl,
            };
          })
          .get()
          .filter(Boolean) as { categoryName: string; url: string }[];

        items.push(...extracted);
      }

      if (items.length) {
        return items;
      }

      items = $('a[href*="/woman/"], a[href*="/man/"], a[href*="/women/"], a[href*="/men/"]')
        .map((_, el) => {
          const href = $(el).attr('href');
          if (!href) {
            return null;
          }

          const absoluteUrl = new URL(href, baseUrl).toString().split('?')[0];
          if (absoluteUrl.endsWith('.html')) {
            return null;
          }

          const categoryParts = extractCategoryParts(absoluteUrl);
          if (!categoryParts.length) {
            return null;
          }

          return {
            categoryName: categoryParts.join(' - '),
            url: absoluteUrl,
          };
        })
        .get()
        .filter(Boolean);

      return items;
    };

    for (const siteUrl of siteUrls) {
      let success = false;

      for (let attempt = 1; attempt <= 3 && !success; attempt++) {
        try {
          const categoryHtml = await this.getFendiHtml(siteUrl);
          const $ = cheerio.load(categoryHtml);
          const categories = collectCategories($, siteUrl);

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

          console.log(`Fendi categories collected from ${siteUrl}: ${categories.length}`);
          success = true;
        } catch (error: any) {
          console.error(`Fendi category fetch failed [${siteUrl}] (${attempt}/3): ${error.message}`);
        }
      }

      if (!success) {
        console.warn(`Fendi category fetch skipped after retries: ${siteUrl}`);
      }
    }

    return allCategories;
  }
// private async uploadImageToR2(page:Page, serviceType:string, imageUrl: string, fileName: string, product: Product, partnerKey:string): Promise<string> {
//   try {
//     if (!imageUrl) {
//       console.error('이미지 URL이 유효하지 않습니다:', imageUrl);
//       throw new Error('유효하지 않은 이미지 URL');
//     }




//     // Puppeteer로 이미지 요청
//     const view = await page.goto(imageUrl, {
//       timeout: 20000,
//       waitUntil: "domcontentloaded"
//     });

//     if (!view) {
//       throw new Error("이미지 응답 없음");
//     }

//     let imageBuffer = await view.buffer();

//     // webp → jpg 변환 처리
//     const metadata = await sharp(imageBuffer).metadata();
//     if (metadata.format === 'webp' || metadata.format === 'avif' || metadata.format === 'heif') {
//       imageBuffer = await sharp(imageBuffer).jpeg().toBuffer();
//       fileName = fileName.replace(/\.(webp|avif|heif)$/i, '.jpg');
//     }

//     // R2에 이미지 업로드
//     const r2ImageUrl = await this.r2Service.uploadImageToR2(fileName, imageBuffer, product);
//     return r2ImageUrl; // 업로드된 이미지의 URL 반환
//   } catch (error: any) {
//     console.error(`이미지 업로드 실패: ${error.message}`);
//     //logErrorToDesktop(error, `1.오류 발생`);
//     throw error;
//   }
// }

private async uploadImageToR2(
  imageUrl: string,
  fileName: string,
  product: Product,
): Promise<string> {

  try {
    if (!imageUrl) {
      throw new Error('유효하지 않은 이미지 URL');
    }

    
if (product.platform === 'smartstore' || product.platform === 'cafe24') {
    
  return imageUrl;
    
}

    /* ============================================
       1️⃣ axios로 이미지 직접 다운로드
    ============================================ */

    const imageRequestUrl = (() => {
      try {
        const url = new URL(imageUrl);
        if (url.hostname.includes('static.fendi.com') && !url.search) {
          url.searchParams.set('wid', '1600');
          url.searchParams.set('hei', '1600');
          url.searchParams.set('fmt', 'jpg');
          url.searchParams.set('qlt', '90');
        }
        return url.href;
      } catch {
        return imageUrl;
      }
    })();

    let imageBuffer: Buffer | null = null;
    let lastDownloadError: any = null;
    const downloadTimeouts = [35000, 50000, 65000];

    for (let attempt = 0; attempt < downloadTimeouts.length; attempt++) {
      try {
        const response = await axios.get(imageRequestUrl, {
          responseType: 'arraybuffer',
          timeout: downloadTimeouts[attempt],
          maxRedirects: 5,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36',
            'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Referer': 'https://www.fendi.com/',
          },
        });

        imageBuffer = Buffer.from(response.data);
        break;
      } catch (error: any) {
        lastDownloadError = error;
        console.warn(`Fendi image download retry ${attempt + 1}/${downloadTimeouts.length}: ${error.message}`);
        if (attempt < downloadTimeouts.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1500 * (attempt + 1)));
        }
      }
    }

    if (!imageBuffer) {
      throw lastDownloadError || new Error('Fendi image download failed');
    }

    /* ============================================
       2️⃣ webp / avif / heif → jpeg 변환
    ============================================ */

    const metadata = await sharp(imageBuffer).metadata();

    if (
      metadata.format === 'webp' ||
      metadata.format === 'avif' ||
      metadata.format === 'heif'
    ) {
      imageBuffer = await sharp(imageBuffer).jpeg().toBuffer();
      fileName = fileName.replace(/\.(webp|avif|heif)$/i, '.jpg');
    }

    /* ============================================
       3️⃣ R2 업로드
    ============================================ */

    const r2ImageUrl = await this.r2Service.uploadImageToR2(
      
      fileName,
      imageBuffer,
      product,
    );

    return r2ImageUrl;

  } catch (error: any) {
    console.error(`🚫 이미지 업로드 실패 (${imageUrl}): ${error.message}`);
    throw error;
  }
}

  // 자동 스크롤 함수
  private async autoScroll(page: Page) {
  await page.evaluate(async () => {
    const distance = 400;
    const interval = 50;
    const waitAfterScroll = 5000;

    let previousScrollHeight = 0;

    while (true) {
      // 1️⃣ 현재 scrollHeight 저장
      const currentScrollHeight = document.body.scrollHeight;

      // 2️⃣ 맨 아래까지 스크롤
      let scrolledHeight = 0;

      await new Promise<void>(resolve => {
        const timer = setInterval(() => {
          window.scrollBy(0, distance);
          scrolledHeight += distance;

          if (scrolledHeight >= document.body.scrollHeight) {
            clearInterval(timer);
            resolve();
          }
        }, interval);
      });

      // 3️⃣ 로딩 대기
      await new Promise(res => setTimeout(res, waitAfterScroll));

      // 4️⃣ 높이 변화 체크
      const newScrollHeight = document.body.scrollHeight;

      if (newScrollHeight === currentScrollHeight || newScrollHeight === previousScrollHeight) {
        break; // ❌ 더 이상 로딩 없음
      }

      previousScrollHeight = currentScrollHeight;
    }
  });
}

//   // Fendi 사이트 크롤링 시작
//   async getProductsFromCategory(siteUrl: string, partnerKey: string,apiKey: string, customId:string, accountPlatform:string, godoMallCategoryCode: string): Promise<void> {
    // const account = await this.hostingAccountRepository.findOne({
    //   where: { customId, accountPlatform },
    // });

    
//     const serviceType = 'Fendi';
//     const proxyLines = await this.r2Service.loadBrightProxies2();
//       if (!proxyLines.length) {
//           console.warn('프록시 없음, 종료');
//           return;
//       }

//     // 랜덤으로 1개 선택
//     const raw = proxyLines[Math.floor(Math.random() * proxyLines.length)];
//     const proxy = parseAuthProxy(raw);
//     const proxyArg = `--proxy-server=http://${proxy.host}:${proxy.port}`;
//     let browser: Browser | null = null;
//     let page: Page | null = null;
//     let productUrls: string[] = [];

//     const category = await this.mappingRepository.findOne({
//       where: { customId: customId, accountPlatform: accountPlatform, siteUrl: siteUrl },
//   });

//   try {
//   browser = await puppeteer.launch({
//     headless: false,
//     args: [
//         proxyArg,
//         '--disable-blink-features',
//         '--disable-blink-features=AutomationControlled',
//         '--disable-infobars',
//         '--no-default-browser-check',
//         '--no-first-run',
//         '--log-level=0',
//         '--disable-dev-shm-usage',
//         '--no-sandbox',
//         '--disable-setuid-sandbox',
//         '--remote-debugging-port=0',
//         '--disable-background-timer-throttling',
//         '--disable-backgrounding-occluded-windows',
//         '--disable-renderer-backgrounding',
//         '--disable-session-crashed-bubble',
//         '--disable-accelerated-2d-canvas',
//         '--noerrdialogs',
//         '--window-position=-9999,0',
//         "--window-size=300,300",
//     ],
// });

//     page = await browser.newPage();
//     await page.authenticate({
//       username: proxy.username,
//       password: proxy.password,
//     });
//     await page.setUserAgent(
//         'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36'
//       );
//     await page.setViewport({ width: 1920, height: 1080 });
//     await page.setCacheEnabled(false);
//     await page.setRequestInterception(true);
//     page.on('request', (request) => {
//         const resourceType = request.resourceType();
//         if (resourceType === 'image' || resourceType === 'font') {
//             request.abort(); // 이미지와 폰트 요청 차단
//         } else {
//             request.continue(); // 나머지 요청은 진행
//         }
//     });

//     const MAX_RETRY = 5; // 최대 재시도 횟수
//     let retryAttempts = 0;

//     while (retryAttempts < MAX_RETRY) {
//         try {
//             await page.goto(`${siteUrl}?start=0&sz=500`, {
//               waitUntil: 'domcontentloaded',
//               timeout: 30000,
//             });

//             // ✅ 상품 카드 실제 등장까지 대기
//             await page.waitForSelector(
//               'li.c-tiles .pdp-link a.link[href]',
//               { timeout: 30000 }
//             );

//             await new Promise(resolve => setTimeout(resolve, 2000));
//             await this.autoScroll(page);
//             await new Promise(resolve => setTimeout(resolve, 2000));
//             break; // 성공하면 반복 종료
//         } catch (error: any) {
//             console.warn(`⚠️ 페이지 이동 실패 (시도 ${retryAttempts + 1}/${MAX_RETRY}): ${error.message}`);
//             //logErrorToDesktop(error, `2.오류 발생`);

//             retryAttempts++;

//             if (page && !page.isClosed()) {
//                 await page.close();
//             }
//             if (browser) {
//                 await browser.close();
//             }

//             if (retryAttempts >= MAX_RETRY) {
//                 console.error(`❌ 최대 재시도 횟수 초과: ${siteUrl}`);
//                 //logErrorToDesktop(error, `3.오류 발생`);
//                 return; // 최대 재시도 횟수를 초과하면 함수 종료
//             }

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
//                     '--window-position=-9999,0',
//                     "--window-size=300,300",
//                 ],
//             });
//             page = await browser.newPage();
//             await page.authenticate({
//               username: proxy.username,
//               password: proxy.password,
//             });
//             await page.setUserAgent(
//                 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36'
//               );
//             await page.setViewport({ width: 1920, height: 1080 });

//             // 다음 재시도를 위한 랜덤 대기 시간 (exponential backoff)
//             const waitTime = Math.min(1000 * 2 ** retryAttempts, 10000); // 최대 10초 대기
//             await new Promise((resolve) => setTimeout(resolve, waitTime));
//         }
//     }

//     while (true) {
//         try {
//             // 현재 페이지에서 상품 URL 및 차단 여부 평가
//             const { currentPageProductUrls, isBlocked} = await page.evaluate(() => {
//               const productUrls = Array.from(
//                 document.querySelectorAll('li.c-tiles .pdp-link a.link[href]')
//               ).map(a => (a as HTMLAreaElement).href);
                                    
//             const bodyText = document.querySelector('body')?.textContent || '';

//             const isBlocked =
//                 document.querySelector('body') === null &&
//                 (bodyText.includes('Access Denied') ||
//                     bodyText.includes('Too Many Requests') ||
//                     bodyText.includes('429') ||
//                     bodyText.includes('Enforced timeout') ||
//                     bodyText.includes('net::ERR_TIMED_OUT'));

//           return { currentPageProductUrls: productUrls, isBlocked};
//       });

//       if (isBlocked) {
//           console.warn("페이지가 차단되었습니다. 프록시를 변경하여 다시 시도합니다.");
//           // 기존 브라우저와 페이지 닫기
//           if (page && !page.isClosed()) {
//               await page.close();
//           }
//           if (browser) {
//               await browser.close();
//           }
//           retryAttempts++;
//           if (retryAttempts >= 30) {
//               throw new Error("30회 재시도 초과 - 크롤링 종료");
//           }
//           // 새로운 브라우저와 페이지 생성
//           browser = await puppeteer.launch({
//               headless: false,
//               args: [
//                   proxyArg,
//                   '--disable-blink-features',
//                   '--disable-blink-features=AutomationControlled',
//                   '--disable-infobars',
//                   '--no-default-browser-check',
//                   '--no-first-run',
//                   '--log-level=0',
//                   '--disable-dev-shm-usage',
//                   '--no-sandbox',
//                   '--disable-setuid-sandbox',
//                   '--remote-debugging-port=0',
//                   '--disable-background-timer-throttling',
//                   '--disable-backgrounding-occluded-windows',
//                   '--disable-renderer-backgrounding',
//                   '--disable-session-crashed-bubble',
//                   '--disable-accelerated-2d-canvas',
//                   '--noerrdialogs',
//                   '--window-position=-9999,0',
//                   "--window-size=300,300",
//               ],
//           });
//           page = await browser.newPage();
//           await page.authenticate({
//               username: proxy.username,
//               password: proxy.password,
//             });
//           await page.setUserAgent(
//             'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36'
//           );
//           await page.setViewport({ width: 1920, height: 1080 });
//           await page.goto(`${siteUrl}?start=0&sz=500`, { waitUntil: 'domcontentloaded', timeout: 30000 });
//           await waitForStableNetwork(page, 3000, 60000);
//           await new Promise(resolve => setTimeout(resolve, 2000));
//           continue;
//       }

//       if (currentPageProductUrls.length === 0) {
//         console.log("더 이상 상품이 없습니다. 반복문을 종료합니다.");
//         } else {
//             productUrls = currentPageProductUrls;
//         }
//       // 한 번 수집 후 while 루프 종료
//       break;

//     } catch (error: any) {
//       console.error(`에러 발생: ${error.message}`);
//       //logErrorToDesktop(error, `4.오류 발생`);
//       if (error.message.includes('Enforced timeout') ||
//           error.message.includes('Navigation timeout') || 
//           error.message.includes('net::ERR_TIMED_OUT')) { 
//           console.error("Enforced timeout,Navigation timeout,ERR_TIMED_OUT 문제가 발생했습니다. 브라우저를 재시작합니다.");
//           if (browser) {
//               try {
//                   // 기존 브라우저와 페이지 닫기
//                   if (page && !page.isClosed()) {
//                       await page.close();
//                   }
//                   if (browser) {
//                       await browser.close();
//                   }
//                   // 새로운 브라우저와 페이지 생성
//                   browser = await puppeteer.launch({
//                       headless: false,
//                       args: [
//                           proxyArg,
//                           '--disable-blink-features',
//                           '--disable-blink-features=AutomationControlled',
//                           '--disable-infobars',
//                           '--no-default-browser-check',
//                           '--no-first-run',
//                           '--log-level=0',
//                           '--disable-dev-shm-usage',
//                           '--no-sandbox',
//                           '--disable-setuid-sandbox',
//                           '--remote-debugging-port=0',
//                           '--disable-background-timer-throttling',
//                           '--disable-backgrounding-occluded-windows',
//                           '--disable-renderer-backgrounding',
//                           '--disable-session-crashed-bubble',
//                           '--disable-accelerated-2d-canvas',
//                           '--noerrdialogs',
//                           '--window-position=-9999,0',
//                           "--window-size=300,300",
//                       ],
//                   });
//                   page = await browser.newPage();
//                   await page.authenticate({
//                     username: proxy.username,
//                     password: proxy.password,
//                   });
//                   await page.setUserAgent(
//                     'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36'
//                   );
//                   await page.setViewport({ width: 1920, height: 1080 });
//               } catch (closeError: any) {
//                   console.warn("브라우저 종료 중 추가 오류:", closeError.message);
//               }
//           }
//            // 새로운 프록시 설정
//           retryAttempts++;
//           if (retryAttempts >= 30) {
//               throw new Error("30회 재시도 초과 - 크롤링 종료");
//           }
//           continue; // 루프를 다시 시작
//       } else {
//           throw error; // 예상치 못한 에러는 상위로 전달
//       }
//     }
//   }
// }
//     finally {
//     // 모든 작업 종료 시 브라우저 닫기
//     // if (page && !page.isClosed()) {
//     // await page.close();
//     // }
//     // if (browser) {
//     // await browser.close();
//     // }
//     }

//     if (productUrls.length === 0) {
//       throw new Error('상품 URL을 수집하지 못했습니다. 모든 시도가 실패했습니다.');
//     }
//     console.log(`펜디 최종 수집된 상품 URL 수: ${productUrls.length} - ${category?.categoryName || '카테고리 없음'}`);

//     // // 새로운 브라우저와 페이지 생성
//     // browser = await puppeteer.launch({
//     //     headless: false,
//     //     args: [
//     //         proxyArg,
//     //         '--remote-debugging-port=0',
//     //         '--no-sandbox',
//     //         '--disable-setuid-sandbox',
//     //         '--disable-dev-shm-usage',
//     //         '--disable-background-timer-throttling',
//     //         '--disable-backgrounding-occluded-windows',
//     //         '--disable-renderer-backgrounding',
//     //         '--disable-session-crashed-bubble',
//     //         '--no-first-run',
//     //         '--disable-accelerated-2d-canvas',
//     //         '--noerrdialogs',
//     //     ],
//     // });
//     // page = await browser.newPage();
//     // await page.setUserAgent(
//     //   'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36'
//     // );
    
//     // await page.setViewport({ width: 1920, height: 1080 });
//     for (const [index, productUrl] of productUrls.entries()) {
//       let loadAttempts = 0;
//       let success = false;

//       while (loadAttempts < 10) {
//         try {
//             await page.goto(productUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
//             await page.waitForFunction(() => {
//               const body = document.body;
//               if (!body) return false;

//               // body가 있고, 실제로 렌더된 영역이 2000px 이상이면 콘텐츠 있음
//               const hasVisibleContent =
//                 body.children.length > 3 && document.body.scrollHeight > 2000;

//               return hasVisibleContent;
//             }, { timeout: 20000 });
//             await new Promise(resolve => setTimeout(resolve, 2000));
//             console.log(`✅ (${index + 1}/${productUrls.length}) 펜디 ${category?.categoryName || '카테고리 없음'}  수집 중`);
//             await new Promise((resolve) => setTimeout(resolve, 2000));
//             success = true;
//             break; // 로딩 성공 시 루프 종료
//           } catch (error: any) {
//               loadAttempts++;
//               console.warn(`페이지 로드 실패 (프록시 변경 ${loadAttempts}/10): ${error.message}`);
//               //logErrorToDesktop(error, `5.오류 발생`);
//               if (loadAttempts < 10) {
                  
//                   console.log(`새로운 프록시로 변경: ${proxy}`);
//                   if (page && !page.isClosed()) {
//                       await page.close();
//                   }
//                   if (browser) {
//                       await browser.close();
//                   }
//                   browser = await puppeteer.launch({
//                       headless: false,
//                       args: [
//                           proxyArg,
//                           '--disable-blink-features',
//                           '--disable-blink-features=AutomationControlled',
//                           '--disable-infobars',
//                           '--no-default-browser-check',
//                           '--no-first-run',
//                           '--log-level=0',
//                           '--disable-dev-shm-usage',
//                           '--no-sandbox',
//                           '--disable-setuid-sandbox',
//                           '--remote-debugging-port=0',
//                           '--disable-background-timer-throttling',
//                           '--disable-backgrounding-occluded-windows',
//                           '--disable-renderer-backgrounding',
//                           '--disable-session-crashed-bubble',
//                           '--disable-accelerated-2d-canvas',
//                           '--noerrdialogs',
//                           '--window-position=-9999,0',
//                           "--window-size=300,300",
//                       ],
//                   });
//                   page = await browser.newPage();
//                   await page.authenticate({
//                     username: proxy.username,
//                     password: proxy.password,
//                   });
//                   await page.setUserAgent(
//                     'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36'
//                   );
//                   await page.setViewport({ width: 1920, height: 1080 });
//                 continue;
//               } else {
//                   console.error('최대 로드 시도 초과 - 다음 URL로 이동합니다.');
//                   //logErrorToDesktop(error, `6.오류 발생`);
//                   break;
//               }
//           }
//       }


      
//       const hasSoldOut = await page.evaluate(() => {
//         return document.querySelector('[data-product-action="soldout"]') !== null;
//       });
      
//       if (hasSoldOut) {
//         continue; // 문의하기 버튼이 있으면 재고 없음 → 다음 상품으로 건너뜁니다.
//       }


//       const productDetails = await page.evaluate(async () => {
//         const site = 'Fendi';
//         const designer = '펜디';
//         const titleElement = document.querySelector('h1.product-name');
//         const title = titleElement ? titleElement.textContent?.trim() || '' : '';
//         const priceElement = document.querySelector<HTMLSpanElement>('div.price span .value');
//         const price = priceElement ? parseFloat(priceElement.getAttribute('content') || '0') : 0;
//         const color = document.querySelector('[kl-additionalpropertyname="Color"]')?.textContent?.trim() || '';
        
//         const anchorElements = Array.from(document.querySelectorAll('[role="listitem"] a[data-src]'));
//         const imageUrls = anchorElements
//           .map(anchor => {
//             const url = anchor.getAttribute('data-src') || '';
//             if (!url) return '';
//             // URL 객체를 생성하여 쿼리 파라미터를 수정
//             const parsedUrl = new URL(url);
//             parsedUrl.searchParams.set('wid', '1000');
//             parsedUrl.searchParams.set('hei', '1000');
//             return parsedUrl.toString();
//           })
//           .filter(url => url !== '');

//         // 이미지가 없는 경우 null 반환
//         if (imageUrls.length === 0) {
//           return null;
//         }

        

//         const sizeElements = document.querySelectorAll<HTMLLIElement>('#selector-list li');
//         let size: string | null;

//         if (!sizeElements || sizeElements.length === 0) {
//           // 사이즈 선택 UI 자체가 없음 → 가방/지갑에서 "원사이즈"
//           size = '원사이즈';
//         } else {
//           // 가방류 구분: bags-size-tile 버튼이 존재하면 사이즈 아님
//           const isBagOptions = Array.from(sizeElements).some(li =>
//             li.querySelector('button.bags-size-tile')
//           );

//           if (isBagOptions) {
//             // 가방류는 그냥 원사이즈 처리
//             size = '원사이즈';
//           } else {
//             // 의류류 처리
//             const sizeList = Array.from(sizeElements)
//               .filter(li => li.classList.contains('select-list-item'))
//               .filter(li => li.getAttribute('data-size-action') !== 'soldout')
//               .map(li => li.getAttribute('data-attr-value') || '')
//               .filter(value => value.trim().length > 0);

//             if (sizeList.length === 0) {
//               console.log("⚠️ 모든 사이즈가 품절입니다. 다음 상품으로 이동합니다.");
//               size = null;
//             } else {
//               size = sizeList.join(', ');
//             }
//           }
//         }


//         let mainInfo = '';
//         const detailsElement = document.querySelector('#collapseProductDetails') as HTMLElement;
//         if (detailsElement) {
//           mainInfo = detailsElement.innerText.trim();
//         }

//         // "Product Code:" 다음에 나오는 내용을 스타일 ID로 추출합니다.
//         const styleIdMatch = mainInfo.match(/Product Code\s*:\s*([\w\d\.\-]+)/i);
//         const styleId = styleIdMatch ? styleIdMatch[1].trim() : '';
//         const brandstyleId = styleId;

//         // "Made in" 다음에 나오는 내용을 madeIn으로 추출합니다.
//         const madeInMatch = mainInfo.match(/Made in\s+([^\n]+)/i);
//         const madeIn = madeInMatch ? madeInMatch[1].trim() : '';


//         return { site, designer, title, price, color, mainInfo, madeIn, styleId, size, brandstyleId, imageUrls };
//       });


//       if (!productDetails || !productDetails.mainInfo || !productDetails.styleId || !productDetails.title || !productDetails.price || !productDetails.imageUrls.length || !productDetails.size || !productDetails.brandstyleId) {
//         console.warn('펜디 데이터 누락 - 다음 productUrl로 이동');
//         continue; // 다음 productUrl로 이동
//         }

//       // 이미지가 없는 경우 상품을 건너뜀
//       if (!productDetails || productDetails.imageUrls.length === 0) {
//         if (loadAttempts < 2) {
//             loadAttempts++;
//             console.log('이미지가 없는 상품입니다. 프록시 변경 후 다시 시도합니다.');
            
//             // 프록시 변경
            
//             console.log(`새로운 프록시로 변경: ${proxy}`);
            
//             // 기존 브라우저와 페이지 닫기
//             if (page && !page.isClosed()) {
//                 await page.close();
//             }
//             if (browser) {
//                 await browser.close();
//             }
        
//             // 새로운 브라우저와 페이지 생성
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
//                     '--window-position=-9999,0',
//                     "--window-size=300,300",
//                 ]
//             });
//             page = await browser.newPage();
//             await page.authenticate({
//               username: proxy.username,
//               password: proxy.password,
//             });
//             await page.setUserAgent(
//                 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36'
//               );
//             await page.setViewport({ width: 1920, height: 1080 });
//             // 동일한 productUrl로 다시 접속
//             try {
//                 await page.goto(productUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
//                 await page.waitForFunction(() => {
//                   const body = document.body;
//                   if (!body) return false;

//                   // body가 있고, 실제로 렌더된 영역이 2000px 이상이면 콘텐츠 있음
//                   const hasVisibleContent =
//                     body.children.length > 3 && document.body.scrollHeight > 2000;

//                   return hasVisibleContent;
//                 }, { timeout: 20000 });
//                 await new Promise(resolve => setTimeout(resolve, 2000));
//             } catch (error: any) {
//                 console.warn(`프록시 변경 후에도 페이지 로드 실패: ${error.message}`);
//                 //logErrorToDesktop(error, `7.오류 발생`);
//                 continue; // 동일 URL 재시도 실패 시 다음 URL로 이동
//             }
//             continue; // 동일 productUrl로 재시도 완료
//         } else {
//             console.log('이미지가 없는 상품입니다. 다음 productUrl로 이동합니다.');
//             continue; // 다음 productUrl로 이동
//         }
//         }

//       // 카테고리 매핑 데이터 찾기
//       const categoryMapping = await this.mappingRepository.findOne({ where: { siteUrl } });
//       if (!categoryMapping) {
//           throw new Error('매핑된 카테고리를 찾을 수 없습니다.');
//       }

//       try {
//       const existingProduct = await this.productRepository.findOne({ where: {
//         styleId: productDetails.styleId,
//         partnerKey: partnerKey, 
//         apiKey: apiKey
//         }
//       });
      
//       if (existingProduct) {
//         // 이미 존재하는 상품이므로 업데이트를 해야 함
//         console.log(`✅상품 업데이트: ${existingProduct.title} - styleID: ${existingProduct.styleId}`);
        
//         // 상품 정보를 업데이트 (기존 데이터베이스 업데이트)
//         existingProduct.siteUrl = siteUrl;
//         existingProduct.title = productDetails.title;
//         // existingProduct.designer = productDetails.designer;
//         existingProduct.size = productDetails.size;
//         existingProduct.price = productDetails.price;
//         // existingProduct.mainInfo = productDetails.mainInfo;
//         // existingProduct.partnerKey = partnerKey;
//         // existingProduct.apiKey = apiKey;
//         // existingProduct.color = productDetails.color;
//         existingProduct.touched = true;
//         existingProduct.categoryName = category.categoryName;
//         const godoMallCategoryName = category.godoMallCategoryName;
//         existingProduct.visitUrl = productUrl;
//         existingProduct.godoMallCategoryCode = godoMallCategoryCode;



//         // ✅ 상품 카테고리 코드 저장
//         existingProduct.godoMallCategoryCode = godoMallCategoryCode;

//         // ✅ 플랫폼 타입 결정 (8자리면 SMARTSTORE, 그 외엔 GODOMALL)
//         if (godoMallCategoryCode.length === 8) {
//             existingProduct.platform = 'smartstore';
//         } else {
//             existingProduct.platform = 'godomall';
//         }


//             // const r2MainImageUrl = await this.uploadImageToR2(
//             // 
//             // productDetails.imageUrls[0],  // ✅ 이미지 URL을 첫 번째 인자로 전달
//             // `${productDetails.styleId}-main.jpg`,  // ✅ 저장할 파일명
//             // existingProduct,
//             // partnerKey
//             // );
//             // existingProduct.mainImageUrl = r2MainImageUrl; // ✅ R2 URL 저장
            
//             // const additionalR2Urls = [];
//             // for (let i = 1; i < productDetails.imageUrls.length; i++) {
//             //     const r2AdditionalImageUrl = await this.uploadImageToR2(
//             //         
//             //         productDetails.imageUrls[i],  // ✅ 추가 이미지 URL
//             //         `${productDetails.styleId}-additional-${i}.jpg`,  // ✅ 저장할 파일명
//             //         existingProduct,
//             //         partnerKey
//             //     );
//             //     additionalR2Urls.push(r2AdditionalImageUrl);
//             // }
//             // existingProduct.additionalImageUrls = additionalR2Urls; // ✅ 추가 이미지 리스트 저장
    

//             if (existingProduct.platform === 'smartstore') {
//             //     // ★ R2 업로드 후, R2 URL을 기반으로 base64ImageList와 originThumbnailUrls 생성
//             //     const base64ImageList: string[] = [];
//             //     const originThumbnailUrls: string[] = [];

//             //     // 대표 이미지 R2 URL을 사용
//             //     try {
//             //     const mainResponse = await axios.get(existingProduct.mainImageUrl, { responseType: 'arraybuffer', timeout: 10000 });
//             //     const mainBuffer = Buffer.from(mainResponse.data, 'binary');
//             //     const mainBase64 = mainBuffer.toString('base64');
//             //     base64ImageList.push(mainBase64);
//             //     originThumbnailUrls.push(existingProduct.mainImageUrl);
//             //     } catch (error: any) {
//             //     console.error('대표 이미지 R2 불러오기 실패:', existingProduct.mainImageUrl, error.message);
//             //     }

//             //     // 추가 이미지 R2 URL을 사용
//             //     for (const r2url of existingProduct.additionalImageUrls) {
//             //         try {
//             //             const additionalResponse = await axios.get(r2url, { responseType: 'arraybuffer', timeout: 10000 });
//             //             const additionalBuffer = Buffer.from(additionalResponse.data, 'binary');
//             //             const additionalBase64 = additionalBuffer.toString('base64');
//             //             base64ImageList.push(additionalBase64);
//             //             originThumbnailUrls.push(r2url);
//             //         } catch (error: any) {
//             //             console.error('추가 이미지 R2 불러오기 실패:', r2url, error.message);
//             //         }
//             //     }

//                 // ✅ 스마트스토어 수정
//                 const auth = {
//                     smartStoreID: partnerKey,
//                     smartStoreSecret: apiKey,
//                 };
//                 await this.smartstoreApiService.updateSmartStoreProduct(existingProduct, auth, partnerKey,undefined,godoMallCategoryName);

//             } else {
//                 // ✅ 고도몰 등록
//             const xmlUrl = await this.r2Service.uploadXmlToR2SmartStore(
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

            
//         // ✅ DB에 저장
//         await this.productRepository.save(existingProduct);



//     } else {
//         // 새 상품이므로 기존 로직으로 등록 진행
//         const newProduct = this.productRepository.create(productDetails);
//         newProduct.mainImageUrl = productDetails.imageUrls[0];
//         newProduct.additionalImageUrls = productDetails.imageUrls.slice(1); // 추가 이미지들 저장
//         newProduct.touched = true;
//         newProduct.categoryName = categoryMapping.categoryName;
//         newProduct.customId = customId;
//         newProduct.accountPlatform = accountPlatform;
//         newProduct.siteUrl = siteUrl;
//         newProduct.color = productDetails.color;
//         newProduct.visitUrl = productUrl;
//         newProduct.godoMallCategoryCode = godoMallCategoryCode;


//         const godoMallCategoryName = category.godoMallCategoryName;



//         // ✅ 상품 카테고리 코드 저장
//         newProduct.godoMallCategoryCode = godoMallCategoryCode;

//         // ✅ 플랫폼 타입 결정
//         if (godoMallCategoryCode.length === 8) {
//             newProduct.platform = 'smartstore';
//         } else {
//             newProduct.platform = 'godomall';
//         }


//         const r2MainImageUrl = await this.uploadImageToR2(
//             page,
//             
//             productDetails.imageUrls[0],  // ✅ 이미지 URL을 첫 번째 인자로 전달
//             `${productDetails.styleId}-main.jpg`,  // ✅ 저장할 파일명
//             newProduct,
//             partnerKey
//         );
//         newProduct.mainImageUrl = r2MainImageUrl; // ✅ R2 URL 저장
        
//         const additionalR2Urls = [];
//         for (let i = 1; i < productDetails.imageUrls.length; i++) {
//             const r2AdditionalImageUrl = await this.uploadImageToR2(
//                 page,
//                 
//                 productDetails.imageUrls[i],  // ✅ 추가 이미지 URL
//                 `${productDetails.styleId}-additional-${i}.jpg`,  // ✅ 저장할 파일명
//                 newProduct,
//                 partnerKey
//             );
//             additionalR2Urls.push(r2AdditionalImageUrl);
//         }
//         newProduct.additionalImageUrls = additionalR2Urls; // ✅ 추가 이미지 리스트 저장

//         const allR2Urls = [newProduct.mainImageUrl,...(newProduct.additionalImageUrls || [])];
        
//         if (newProduct.platform === 'smartstore') {

//             // ★ 새로운 로직: 이미지 데이터를 base64 및 원본 URL 배열로 생성
//             const base64ImageList: string[] = [];
//             const originThumbnailUrls: string[] = [];

//             for (const imageUrl of allR2Urls) {
//                 try {
//                     const response = await axios.get(imageUrl, { responseType: 'arraybuffer', timeout: 10000 });
//                     const buffer = Buffer.from(response.data, 'binary');
//                     const base64Image = buffer.toString('base64');
//                     base64ImageList.push(base64Image);
//                     originThumbnailUrls.push(imageUrl);
//                 } catch (error: any) {
//                     console.error('이미지 불러오기 실패:', imageUrl, error.message);
//                     //logErrorToDesktop(error, `8.오류 발생`);
//                 }
//             }

//             // ✅ 스마트스토어 등록
//             await this.handleSmartstoreRegistration(newProduct, partnerKey, apiKey,{ base64ImageList, originThumbnailUrls },godoMallCategoryName);

//         } else {
//             // ✅ 고도몰 등록
//             const xmlUrl = await this.r2Service.uploadXmlToR2SmartStore(
//                 newProduct.styleId,
//                 newProduct,
//                 godoMallCategoryCode,
//                 newProduct.mainImageUrl,
//                 newProduct.additionalImageUrls,
//                 partnerKey,
//                 apiKey
//             );
//             await this.godoMallService.registerProductWithXmlUrl(partnerKey, apiKey, xmlUrl, newProduct, newProduct.styleId);

//         }

//         // ✅ DB에 저장
//         await this.productRepository.save(newProduct);

//         console.log(`✅ 상품 저장 완료: ${productDetails.designer} ${productDetails.title}`);
//         }
//     } catch (error: any) {
//                 console.error(`상품 등록 처리 실패 (${productUrl}): ${error.message}`);
//                 //logErrorToDesktop(error, `9.오류 발생`);
//                 // 에러 발생 시 해당 상품은 건너뛰고 다음 상품으로 넘어갑니다.
//                 continue;
//             }
//           } 
//           if (page && !page.isClosed()) {
//           await page.close();
//           }
//           if (browser) {
//           await browser.close();
//           }
//           // ✅ 플랫폼 타입에 따른 품절 처리
//           if (godoMallCategoryCode.length === 8) {
//               // ✅ 스마트스토어 품절 처리
//               const auth = {
//                 smartStoreID: partnerKey,
//                 smartStoreSecret: apiKey,
//               };

//               const siteUrls = {
//                 Fendi : siteUrl,
//               }
//               await this.smartstoreApiService.deleteUnsoldSmartstoreProducts(auth,siteUrls, partnerKey, apiKey, "Fendi");
//           } else {
              // // ✅ 고도몰 품절 처리
              // await this.handleUnsoldProducts(siteUrl, partnerKey, apiKey, customId, accountPlatform);
              // await this.godoMallService.finalizeXmlDeletion(); // 추가된 호출
//           }
//       }
      
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
          
              console.log(`펜디 품절 처리 완료: ${product.title} (styleId: ${product.styleId})`);
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
        try {
          const productHtml = await this.getFendiHtml(visitUrl);
          const $ = cheerio.load(productHtml);

          const price = parseFloat($('div.price span .value').attr('content') || '0');
          let size: string | null = '원사이즈';
          let soldOut = false;

          const sizeItems = $('#selector-list li, li.select-list-item.js-size--list');
          if (sizeItems.length) {
            const isBagOptions = sizeItems.toArray().some(li =>
              $(li).find('button.bags-size-tile').length > 0
            );

            if (!isBagOptions) {
              const sizeList: string[] = [];

              sizeItems.each((_, li) => {
                const item = $(li);
                const action = String(item.attr('data-size-action') || '').toLowerCase();
                const className = String(item.attr('class') || '').toLowerCase();
                const disabled =
                  action === 'soldout' ||
                  item.attr('disabled') !== undefined ||
                  item.attr('aria-disabled') === 'true' ||
                  className.includes('disabled') ||
                  className.includes('soldout') ||
                  className.includes('out-of-stock');

                if (disabled) return;

                const value = String(
                  item.attr('data-attr-value') ||
                  item.find('[data-attr-value]').first().attr('data-attr-value') ||
                  item.text() ||
                  ''
                ).replace(/\s+/g, ' ').trim();

                if (value && !sizeList.includes(value)) {
                  sizeList.push(value);
                }
              });

              if (sizeList.length) {
                size = sizeList.join(', ');
              } else {
                size = null;
                soldOut = true;
              }
            }
          }

          const stockText = $('button, .prices-add-to-cart-actions, .add-to-cart, .notify-me').text().toLowerCase();
          if (
            stockText.includes('notify me') ||
            stockText.includes('sold out') ||
            stockText.includes('out of stock') ||
            stockText.includes('unavailable')
          ) {
            soldOut = true;
          }

          const productDetails = {
            price,
            size: size || '',
            soldOut: soldOut || !price || !size || size.length === 0,
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
            productDetails.soldOut,
          );

          if (!xmlUrl) {
            console.error(`Fendi XML upload failed -> ${product.designer} ${product.title}`);
            return;
          }

          await this.userService.assertRequestAvailable(customId, 1);
          await this.godoMallService.registerProductWithXmlUrl(
            partnerKey,
            apiKey,
            xmlUrl,
            product,
            product.styleId,
          );
          await this.userService.consumeRequest(customId, 1);

          this.gateway.sendProductUpdate(
            `${customId}:${accountPlatform}:${goodsNo}`,
            {
              status: 'success',
              price: product.price,
              size: product.size,
              updatedAt: new Date().toISOString(),
            },
          );

          await this.godoMallService.deleteUpdateXml(xmlUrl);

          console.log(`Fendi update complete: ${product.title}`);
          return;
        } catch (snapshotError: any) {
          console.warn(`Fendi snapshot update failed (attempt ${attempt}/${MAX_RETRY}): ${snapshotError?.message || snapshotError}`);
        }

        const proxy = pickProxy(proxyLines);
        const proxyArg = `--proxy-server=http://${proxy.host}:${proxy.port}`;

        let browser: Browser | null = null;
        let page: Page | null = null;

        try {
        browser = await puppeteer.launch({
          headless: false,
          args: [
            proxyArg,
            '--disable-blink-features',
            '--disable-blink-features=AutomationControlled',
            '--disable-infobars',
            '--no-default-browser-check',
            '--no-first-run',
            '--log-level=0',
            '--disable-dev-shm-usage',
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--remote-debugging-port=0',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding',
            '--disable-session-crashed-bubble',
            '--disable-accelerated-2d-canvas',
            '--noerrdialogs',
            '--window-position=-9999,0',
            "--window-size=300,300",
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

        await page.setCacheEnabled(false);
        await page.setRequestInterception(true);

        page.on('request', (request) => {
          // ✅ 요청 리소스 타입 확인
          const resourceType = request.resourceType();

          if (resourceType === 'image') {
            request.abort(); // 🔒 이미지 요청만 차단
          } else {
            request.continue(); // ✅ 나머지는 정상 통과
          }
        });

        await page.goto(visitUrl, {waitUntil: 'domcontentloaded', timeout: 30000})
        await waitForStableNetwork(page, 3000, 60000);
        await new Promise(resolve => setTimeout(resolve, 2000));

        let productDetails = await page.evaluate(async () => {
          const priceElement = document.querySelector<HTMLSpanElement>('div.price span .value');
          const price = priceElement ? parseFloat(priceElement.getAttribute('content') || '0') : 0;

          const sizeElements = document.querySelectorAll<HTMLLIElement>('#selector-list li');
          let size: string | null;

          if (!sizeElements || sizeElements.length === 0) {
            // 사이즈 선택 UI 자체가 없음 → 가방/지갑에서 "원사이즈"
            size = '원사이즈';
          } else {
            // 가방류 구분: bags-size-tile 버튼이 존재하면 사이즈 아님
            const isBagOptions = Array.from(sizeElements).some(li =>
              li.querySelector('button.bags-size-tile')
            );

            if (isBagOptions) {
              // 가방류는 그냥 원사이즈 처리
              size = '원사이즈';
            } else {
              // 의류류 처리
              const sizeList = Array.from(sizeElements)
                .filter(li => li.classList.contains('select-list-item'))
                .filter(li => li.getAttribute('data-size-action') !== 'soldout')
                .map(li => li.getAttribute('data-attr-value') || '')
                .filter(value => value.trim().length > 0);

              if (sizeList.length === 0) {
                console.log("⚠️ 모든 사이즈가 품절입니다. 다음 상품으로 이동합니다.");
                size = null;
              } else {
                size = sizeList.join(', ');
              }
            }
          }

          const soldOut = !price || !size || size.length === 0; // ✅ 둘 중 하나라도 없으면 품절
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

        console.log(`✅ ${product.title} 상품 업데이트 완료`);

      } catch (err: any) {
        console.warn(`🚨 Fendi 업데이트 실패: ${err.message}`);
      } finally {
        await safeClose(page, browser);
      }
    }
  }

    // Fendi 사이트 크롤링 시작
//   async getProductsFromCategory(siteUrl: string, partnerKey: string,apiKey: string, customId:string, accountPlatform:string, godoMallCategoryCode: string): Promise<void> {
    // const account = await this.hostingAccountRepository.findOne({
    //   where: { customId, accountPlatform },
    // });
//     const serviceType = 'Fendi';

//     let browser: Browser | null = null;
//     let page: Page | null = null;
//     let productUrls: string[] = [];

//     const category = await this.mappingRepository.findOne({
//       where: { customId: customId, accountPlatform: accountPlatform, siteUrl: siteUrl },
//     });
//     let portIndex = 0;

//   try {
//     ({ browser, page } = await connectSilkChrome(PORT_POOL[portIndex]));

//     console.log('✅ 실크롬 attach 완료');

//     const MAX_RETRY = 20; // 최대 재시도 횟수
//     let retryAttempts = 0;

//     while (retryAttempts < MAX_RETRY) {
//         try {
//             await page.goto(`${siteUrl}?start=0&sz=500`, {
//               waitUntil: 'domcontentloaded',
//               timeout: 30000,
//             });

//             // ✅ 상품 카드 실제 등장까지 대기
//             await page.waitForSelector(
//               'li.c-tiles .pdp-link a.link[href]',
//               { timeout: 30000 }
//             );

//             await new Promise(resolve => setTimeout(resolve, 2000));
//             await this.autoScroll(page);
//             await new Promise(resolve => setTimeout(resolve, 2000));
//             break; // 성공하면 반복 종료
//         } catch (error: any) {
//             console.warn(`⚠️ 페이지 이동 실패 (시도 ${retryAttempts + 1}/${MAX_RETRY}): ${error.message}`);
//             //logErrorToDesktop(error, `2.오류 발생`);

//             retryAttempts++;

//             if (retryAttempts >= MAX_RETRY) {
//                 console.error(`❌ 최대 재시도 횟수 초과: ${siteUrl}`);
//                 //logErrorToDesktop(error, `3.오류 발생`);
//                 return; // 최대 재시도 횟수를 초과하면 함수 종료
//             }

//             portIndex = (portIndex + 1) % PORT_POOL.length;
//             const nextPort = PORT_POOL[portIndex];
//             ({ browser, page } = await connectSilkChrome(nextPort));

//             const waitTime = Math.min(1000 * 2 ** retryAttempts, 5000); // 최대 10초 대기
//             await new Promise((resolve) => setTimeout(resolve, waitTime));
//         }
//     }

//     while (true) {
//         try {
//             // 현재 페이지에서 상품 URL 및 차단 여부 평가
//             const { currentPageProductUrls, isBlocked} = await page.evaluate(() => {
//              const productUrls = Array.from(
//               document.querySelectorAll('li.c-tiles')
//             )
//               .filter(tile =>
//                 !tile.querySelector('[data-vg-availability="false"]')
//               )
//               .map(tile => {
//                 const link = tile.querySelector(
//                   '.pdp-link a.link[href]'
//                 ) as HTMLAnchorElement | null;

//                 return link ? link.href : null;
//               })
//               .filter((url): url is string => !!url);
                                    
//             const bodyText = document.querySelector('body')?.textContent || '';

//             const isBlocked =
//                 document.querySelector('body') === null &&
//                 (bodyText.includes('Access Denied') ||
//                     bodyText.includes('Too Many Requests') ||
//                     bodyText.includes('429') ||
//                     bodyText.includes('Enforced timeout') ||
//                     bodyText.includes('net::ERR_TIMED_OUT'));

//           return { currentPageProductUrls: productUrls, isBlocked};
//       });

//       if (isBlocked) {
//           console.warn("페이지가 차단되었습니다. 프록시를 변경하여 다시 시도합니다.");

//           retryAttempts++;
//           if (retryAttempts >= 30) {
//               throw new Error("30회 재시도 초과 - 크롤링 종료");
//           }

//           portIndex = (portIndex + 1) % PORT_POOL.length;
//           const nextPort = PORT_POOL[portIndex];
//           ({ browser, page } = await connectSilkChrome(nextPort));
//           continue;
//       }

//       if (currentPageProductUrls.length === 0) {
//         console.log("더 이상 상품이 없습니다. 반복문을 종료합니다.");
//         } else {
//             productUrls = currentPageProductUrls;
//         }
//       // 한 번 수집 후 while 루프 종료
//       break;

//     } catch (error: any) {
//       console.error(`에러 발생: ${error.message}`);
//       //logErrorToDesktop(error, `4.오류 발생`);
//       if (error.message.includes('Enforced timeout') ||
//           error.message.includes('Navigation timeout') || 
//           error.message.includes('net::ERR_TIMED_OUT')) { 
//           console.error("Enforced timeout,Navigation timeout,ERR_TIMED_OUT 문제가 발생했습니다. 브라우저를 재시작합니다.");
//           if (browser) {
//               try {

//                   portIndex = (portIndex + 1) % PORT_POOL.length;
//                   const nextPort = PORT_POOL[portIndex];
//                   ({ browser, page } = await connectSilkChrome(nextPort));
//               } catch (closeError: any) {
//                   console.warn("브라우저 종료 중 추가 오류:", closeError.message);
//               }
//           }
//            // 새로운 프록시 설정
//           retryAttempts++;
//           if (retryAttempts >= 30) {
//               throw new Error("30회 재시도 초과 - 크롤링 종료");
//           }
//           continue; // 루프를 다시 시작
//       } else {
//           throw error; // 예상치 못한 에러는 상위로 전달
//       }
//     }
//   }
// }
//     finally {

//     }

//     if (productUrls.length === 0) {
//       throw new Error('상품 URL을 수집하지 못했습니다. 모든 시도가 실패했습니다.');
//     }
//     console.log(`펜디 최종 수집된 상품 URL 수: ${productUrls.length} - ${category?.categoryName || '카테고리 없음'}`);

//     for (const [index, productUrl] of productUrls.entries()) {
//       let loadAttempts = 0;
//       let success = false;

//       while (loadAttempts < 10) {
//         try {
//             await page.goto(productUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
//             await page.waitForSelector(
//                 'div.price span .value',
//                 { visible: true, timeout: 30000 }
//             );
//             console.log(`✅ (${index + 1}/${productUrls.length}) 펜디 ${category?.categoryName || '카테고리 없음'}  수집 중`);
//             success = true;
//             break; // 로딩 성공 시 루프 종료
//           } catch (error: any) {
//               loadAttempts++;
//               console.warn(`페이지 로드 실패 (프록시 변경 ${loadAttempts}/10): ${error.message}`);
//               if (loadAttempts < 10) {
 
//                 portIndex = (portIndex + 1) % PORT_POOL.length;
//                 const nextPort = PORT_POOL[portIndex];
//                 ({ browser, page } = await connectSilkChrome(nextPort));
//                 continue;
//               } else {
//                   console.error('최대 로드 시도 초과 - 다음 URL로 이동합니다.');
//                   break;
//               }
//           }
//       }


      
//       const hasSoldOut = await page.evaluate(() => {
//         return document.querySelector('[data-product-action="soldout"]') !== null;
//       });
      
//       if (hasSoldOut) {
//         continue; // 문의하기 버튼이 있으면 재고 없음 → 다음 상품으로 건너뜁니다.
//       }


//       const productDetails = await page.evaluate(async () => {
//         const site = 'Fendi';
//         const designer = '펜디';
//         const titleElement = document.querySelector('h1.product-name');
//         const title = titleElement ? titleElement.textContent?.trim() || '' : '';
//         const priceElement = document.querySelector<HTMLSpanElement>('div.price span .value');
//         const price = priceElement ? parseFloat(priceElement.getAttribute('content') || '0') : 0;
//         const color = document.querySelector('[kl-additionalpropertyname="Color"]')?.textContent?.trim() || '';
        
//         const anchorElements = Array.from(document.querySelectorAll('[role="listitem"] a[data-src]'));
//         const imageUrls = anchorElements
//           .map(anchor => {
//             const url = anchor.getAttribute('data-src') || '';
//             if (!url) return '';
//             // URL 객체를 생성하여 쿼리 파라미터를 수정
//             const parsedUrl = new URL(url);
//             parsedUrl.searchParams.set('wid', '1000');
//             parsedUrl.searchParams.set('hei', '1000');
//             return parsedUrl.toString();
//           })
//           .filter(url => url !== '');

//         // 이미지가 없는 경우 null 반환
//         if (imageUrls.length === 0) {
//           return null;
//         }

        

//         const sizeElements = document.querySelectorAll<HTMLLIElement>('#selector-list li');
//         let size: string | null;

//         if (!sizeElements || sizeElements.length === 0) {
//           // 사이즈 선택 UI 자체가 없음 → 가방/지갑에서 "원사이즈"
//           size = '원사이즈';
//         } else {
//           // 가방류 구분: bags-size-tile 버튼이 존재하면 사이즈 아님
//           const isBagOptions = Array.from(sizeElements).some(li =>
//             li.querySelector('button.bags-size-tile')
//           );

//           if (isBagOptions) {
//             // 가방류는 그냥 원사이즈 처리
//             size = '원사이즈';
//           } else {
//             // 의류류 처리
//             const sizeList = Array.from(sizeElements)
//               .filter(li => li.classList.contains('select-list-item'))
//               .filter(li => li.getAttribute('data-size-action') !== 'soldout')
//               .map(li => li.getAttribute('data-attr-value') || '')
//               .filter(value => value.trim().length > 0);

//             if (sizeList.length === 0) {
//               console.log("⚠️ 모든 사이즈가 품절입니다. 다음 상품으로 이동합니다.");
//               size = null;
//             } else {
//               size = sizeList.join(', ');
//             }
//           }
//         }


//         let mainInfo = '';
//         const detailsElement = document.querySelector('#collapseProductDetails') as HTMLElement;
//         if (detailsElement) {
//           mainInfo = detailsElement.innerText.trim();
//         }

//         // "Product Code:" 다음에 나오는 내용을 스타일 ID로 추출합니다.
//         const styleIdMatch = mainInfo.match(/Product Code\s*:\s*([\w\d\.\-]+)/i);
//         const styleId = styleIdMatch ? styleIdMatch[1].trim() : '';
//         const brandstyleId = styleId;

//         // "Made in" 다음에 나오는 내용을 madeIn으로 추출합니다.
//         const madeInMatch = mainInfo.match(/Made in\s+([^\n]+)/i);
//         const madeIn = madeInMatch ? madeInMatch[1].trim() : '';


//         return { site, designer, title, price, color, mainInfo, madeIn, styleId, size, brandstyleId, imageUrls };
//       });


//       if (!productDetails || !productDetails.mainInfo || !productDetails.styleId || !productDetails.title || !productDetails.price || !productDetails.imageUrls.length || !productDetails.size || !productDetails.brandstyleId) {
//         console.warn('펜디 데이터 누락 - 다음 productUrl로 이동');
//         continue; // 다음 productUrl로 이동
//         }

//       // 카테고리 매핑 데이터 찾기
//       const categoryMapping = await this.mappingRepository.findOne({ where: { siteUrl } });
//       if (!categoryMapping) {
//           throw new Error('매핑된 카테고리를 찾을 수 없습니다.');
//       }

//       try {
//       const existingProduct = await this.productRepository.findOne({ where: {
//         styleId: productDetails.styleId,
//         partnerKey: partnerKey, 
//         apiKey: apiKey
//         }
//       });
      
//       if (existingProduct) {
//         // 이미 존재하는 상품이므로 업데이트를 해야 함
//         console.log(`✅상품 업데이트: ${existingProduct.title} - styleID: ${existingProduct.styleId}`);
        
//         // 상품 정보를 업데이트 (기존 데이터베이스 업데이트)
//         existingProduct.siteUrl = siteUrl;
//         // existingProduct.title = productDetails.title;
//         // existingProduct.designer = productDetails.designer;
//         existingProduct.size = productDetails.size;
//         existingProduct.price = productDetails.price;
//         // existingProduct.mainInfo = productDetails.mainInfo;
//         // existingProduct.partnerKey = partnerKey;
//         // existingProduct.apiKey = apiKey;
//         // existingProduct.color = productDetails.color;
//         existingProduct.touched = true;
//         existingProduct.categoryName = category.categoryName;
//         const godoMallCategoryName = category.godoMallCategoryName;
//         existingProduct.visitUrl = productUrl;
//         existingProduct.godoMallCategoryCode = godoMallCategoryCode;



//         // ✅ 상품 카테고리 코드 저장
//         existingProduct.godoMallCategoryCode = godoMallCategoryCode;

//         // ✅ 플랫폼 타입 결정 (8자리면 SMARTSTORE, 그 외엔 GODOMALL)
//         if (godoMallCategoryCode.length === 8) {
//             existingProduct.platform = 'smartstore';
//         } else {
//             existingProduct.platform = 'godomall';
//         }


//             // const r2MainImageUrl = await this.uploadImageToR2(
//             // 
//             // productDetails.imageUrls[0],  // ✅ 이미지 URL을 첫 번째 인자로 전달
//             // `${productDetails.styleId}-main.jpg`,  // ✅ 저장할 파일명
//             // existingProduct,
//             // partnerKey
//             // );
//             // existingProduct.mainImageUrl = r2MainImageUrl; // ✅ R2 URL 저장
            
//             // const additionalR2Urls = [];
//             // for (let i = 1; i < productDetails.imageUrls.length; i++) {
//             //     const r2AdditionalImageUrl = await this.uploadImageToR2(
//             //         
//             //         productDetails.imageUrls[i],  // ✅ 추가 이미지 URL
//             //         `${productDetails.styleId}-additional-${i}.jpg`,  // ✅ 저장할 파일명
//             //         existingProduct,
//             //         partnerKey
//             //     );
//             //     additionalR2Urls.push(r2AdditionalImageUrl);
//             // }
//             // existingProduct.additionalImageUrls = additionalR2Urls; // ✅ 추가 이미지 리스트 저장
    

//             if (existingProduct.platform === 'smartstore') {
//             //     // ★ R2 업로드 후, R2 URL을 기반으로 base64ImageList와 originThumbnailUrls 생성
//             //     const base64ImageList: string[] = [];
//             //     const originThumbnailUrls: string[] = [];

//             //     // 대표 이미지 R2 URL을 사용
//             //     try {
//             //     const mainResponse = await axios.get(existingProduct.mainImageUrl, { responseType: 'arraybuffer', timeout: 10000 });
//             //     const mainBuffer = Buffer.from(mainResponse.data, 'binary');
//             //     const mainBase64 = mainBuffer.toString('base64');
//             //     base64ImageList.push(mainBase64);
//             //     originThumbnailUrls.push(existingProduct.mainImageUrl);
//             //     } catch (error: any) {
//             //     console.error('대표 이미지 R2 불러오기 실패:', existingProduct.mainImageUrl, error.message);
//             //     }

//             //     // 추가 이미지 R2 URL을 사용
//             //     for (const r2url of existingProduct.additionalImageUrls) {
//             //         try {
//             //             const additionalResponse = await axios.get(r2url, { responseType: 'arraybuffer', timeout: 10000 });
//             //             const additionalBuffer = Buffer.from(additionalResponse.data, 'binary');
//             //             const additionalBase64 = additionalBuffer.toString('base64');
//             //             base64ImageList.push(additionalBase64);
//             //             originThumbnailUrls.push(r2url);
//             //         } catch (error: any) {
//             //             console.error('추가 이미지 R2 불러오기 실패:', r2url, error.message);
//             //         }
//             //     }

//                 // ✅ 스마트스토어 수정
//                 const auth = {
//                     smartStoreID: partnerKey,
//                     smartStoreSecret: apiKey,
//                 };
//                 await this.smartstoreApiService.updateSmartStoreProduct(existingProduct, auth, partnerKey,undefined,godoMallCategoryName);

//             } else {
//                 // ✅ 고도몰 등록
//             const xmlUrl = await this.r2Service.uploadXmlToR2SmartStore(
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

            
//         // ✅ DB에 저장
//         await this.productRepository.save(existingProduct);



//     } else {
//         // 새 상품이므로 기존 로직으로 등록 진행
//         const newProduct = this.productRepository.create(productDetails);
//         newProduct.mainImageUrl = productDetails.imageUrls[0];
//         newProduct.additionalImageUrls = productDetails.imageUrls.slice(1); // 추가 이미지들 저장
//         newProduct.touched = true;
//         newProduct.categoryName = categoryMapping.categoryName;
//         newProduct.customId = customId;
//         newProduct.accountPlatform = accountPlatform;
//         newProduct.siteUrl = siteUrl;
//         newProduct.color = productDetails.color;
//         newProduct.visitUrl = productUrl;
//         newProduct.godoMallCategoryCode = godoMallCategoryCode;


//         const godoMallCategoryName = category.godoMallCategoryName;



//         // ✅ 상품 카테고리 코드 저장
//         newProduct.godoMallCategoryCode = godoMallCategoryCode;

//         // ✅ 플랫폼 타입 결정
//         if (godoMallCategoryCode.length === 8) {
//             newProduct.platform = 'smartstore';
//         } else {
//             newProduct.platform = 'godomall';
//         }


//         const r2MainImageUrl = await this.uploadImageToR2(
//             page,
//             
//             productDetails.imageUrls[0],  // ✅ 이미지 URL을 첫 번째 인자로 전달
//             `${productDetails.styleId}-main.jpg`,  // ✅ 저장할 파일명
//             newProduct,
//             partnerKey
//         );
//         newProduct.mainImageUrl = r2MainImageUrl; // ✅ R2 URL 저장
        
//         const additionalR2Urls = [];
//         for (let i = 1; i < productDetails.imageUrls.length; i++) {
//             const r2AdditionalImageUrl = await this.uploadImageToR2(
//                 page,
//                 
//                 productDetails.imageUrls[i],  // ✅ 추가 이미지 URL
//                 `${productDetails.styleId}-additional-${i}.jpg`,  // ✅ 저장할 파일명
//                 newProduct,
//                 partnerKey
//             );
//             additionalR2Urls.push(r2AdditionalImageUrl);
//         }
//         newProduct.additionalImageUrls = additionalR2Urls; // ✅ 추가 이미지 리스트 저장

//         const allR2Urls = [newProduct.mainImageUrl,...(newProduct.additionalImageUrls || [])];
        
//         if (newProduct.platform === 'smartstore') {

//             // ★ 새로운 로직: 이미지 데이터를 base64 및 원본 URL 배열로 생성
//             const base64ImageList: string[] = [];
//             const originThumbnailUrls: string[] = [];

//             for (const imageUrl of allR2Urls) {
//                 try {
//                     const response = await axios.get(imageUrl, { responseType: 'arraybuffer', timeout: 10000 });
//                     const buffer = Buffer.from(response.data, 'binary');
//                     const base64Image = buffer.toString('base64');
//                     base64ImageList.push(base64Image);
//                     originThumbnailUrls.push(imageUrl);
//                 } catch (error: any) {
//                     console.error('이미지 불러오기 실패:', imageUrl, error.message);
//                     //logErrorToDesktop(error, `8.오류 발생`);
//                 }
//             }

//             // ✅ 스마트스토어 등록
//             await this.handleSmartstoreRegistration(newProduct, partnerKey, apiKey,{ base64ImageList, originThumbnailUrls },godoMallCategoryName);

//         } else {
//             // ✅ 고도몰 등록
//             const xmlUrl = await this.r2Service.uploadXmlToR2SmartStore(
//                 newProduct.styleId,
//                 newProduct,
//                 godoMallCategoryCode,
//                 newProduct.mainImageUrl,
//                 newProduct.additionalImageUrls,
//                 partnerKey,
//                 apiKey
//             );
//             await this.godoMallService.registerProductWithXmlUrl(partnerKey, apiKey, xmlUrl, newProduct, newProduct.styleId);

//         }

//         // ✅ DB에 저장
//         await this.productRepository.save(newProduct);

//         console.log(`✅ 상품 저장 완료: ${productDetails.designer} ${productDetails.title}`);
//         }
//     } catch (error: any) {
//                 console.error(`상품 등록 처리 실패 (${productUrl}): ${error.message}`);
//                 //logErrorToDesktop(error, `9.오류 발생`);
//                 // 에러 발생 시 해당 상품은 건너뛰고 다음 상품으로 넘어갑니다.
//                 continue;
//             }
//           } 

//           // ✅ 플랫폼 타입에 따른 품절 처리
//           if (godoMallCategoryCode.length === 8) {
//               // ✅ 스마트스토어 품절 처리
//               const auth = {
//                 smartStoreID: partnerKey,
//                 smartStoreSecret: apiKey,
//               };

//               const siteUrls = {
//                 Fendi : siteUrl,
//               }
//               await this.smartstoreApiService.deleteUnsoldSmartstoreProducts(auth,siteUrls, partnerKey, apiKey, "Fendi");
//           } else {
//               // ✅ 고도몰 품절 처리
//               await this.handleUnsoldProducts(siteUrl, partnerKey, apiKey, customId, accountPlatform);
//               await this.godoMallService.finalizeXmlDeletion(); // 추가된 호출
//           }
//       }

// BrightData Fendi 크롤링 시작
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

    const categorys = await this.mappingRepository.findOne({
      where: { customId: customId, accountPlatform: accountPlatform, siteUrl: siteUrl },
    });

    if (!categorys) {
      throw new Error('매핑된 카테고리를 찾을 수 없습니다.');
    }

    /* ============================================================
      1️⃣ 카테고리 HTML 단일 수집
    ============================================================ */

    const categoryUrl = new URL(siteUrl);
    categoryUrl.searchParams.set('start', '0');
    categoryUrl.searchParams.set('sz', '500');

    const categoryHtml = await this.getFendiHtml(categoryUrl.href);
    const $category = cheerio.load(categoryHtml);
    const productUrlSet = new Set<string>();

    $category('li.c-tiles').each((_, tile) => {
      const $tile = $category(tile);

      if ($tile.find('[data-vg-availability="false"]').length > 0) {
        return;
      }

      const href =
        $tile.find('div.pdp-link a.link[href]').attr('href') ||
        $tile.find('a.link-background[href]').attr('href') ||
        $tile.find('.product-image-carousel a[href]').attr('href');

      const normalized = this.normalizeFendiProductUrl(href);
      if (normalized) productUrlSet.add(normalized);
    });

    if (productUrlSet.size === 0) {
      $category('a[href]').each((_, link) => {
        const normalized = this.normalizeFendiProductUrl($category(link).attr('href'));
        if (normalized) productUrlSet.add(normalized);
      });
    }

    if (productUrlSet.size === 0) {
      const hrefRegex = /\bhref=(["'])([^"']+)\1/gi;
      let match: RegExpExecArray | null;

      while ((match = hrefRegex.exec(categoryHtml)) !== null) {
        const normalized = this.normalizeFendiProductUrl(match[2]);
        if (normalized) productUrlSet.add(normalized);
      }
    }

    const uniqueProductUrls = [...productUrlSet];

    console.log(`펜디 최종 수집된 상품 URL 수: ${uniqueProductUrls.length} - ${categorys?.categoryName || '카테고리 없음'}`);

    if (!uniqueProductUrls.length) {
      console.warn('⚠️ 상품 URL 없음');
      return;
    }

    const categoryMapping = await this.mappingRepository.findOne({
      where: { siteUrl },
    });

    if (!categoryMapping) {
      throw new Error('매핑된 카테고리를 찾을 수 없습니다.');
    }

    const category = categoryMapping;
  /* ============================================================
    2️⃣ 상품 상세 5개씩 병렬 처리
  ============================================================ */

  const chunkSize = 15;

  for (let i = 0; i < uniqueProductUrls.length; i += chunkSize) {

    const chunk = uniqueProductUrls.slice(i, i + chunkSize);

    await Promise.all(
      chunk.map(async (productUrl,idx) => {

        const globalIndex = i + idx;

        console.log(
          `✅ (${globalIndex + 1}/${uniqueProductUrls.length}) 펜디 ${category?.categoryName || '카테고리 없음'} 수집 중`
        );

        try {

          const productHtml = await this.getFendiHtml(productUrl);

          const $ = cheerio.load(productHtml);

          /* ===============================
            productDetails 생성
          =============================== */

          const site = 'Fendi';
          const designer = '펜디';

          const title =
            $('h1.product-name').text().trim() || '';

          const price =
            parseFloat(
              $('div.price span .value').attr('content') || '0'
            );

          const color =
            $('[kl-additionalpropertyname="Color"]')
              .text()
              .trim() || '';

          /* ---------- SIZE ---------- */

          let size = '';
          let soldOut = false;

          const sizeItems =
            $('li.select-list-item.js-size--list');

          if (sizeItems.length === 0) {
            size = '원사이즈';
          } else {

            const availableSizes: string[] = [];

            sizeItems.each((_, el) => {
              const action =
                $(el).attr('data-size-action');
              const value =
                $(el).attr('data-attr-value');

              if (!value) return;

              if (action === 'add' || action === 'preorder') {
                availableSizes.push(value);
              }
            });

            if (availableSizes.length === 0) {
              soldOut = true;
              size = '';
            } else {
              size = availableSizes.join(', ');
            }
          }

          /* ---------- MAIN INFO ---------- */

          let mainInfo = '';
          let madeIn = '';
          let styleId = '';

          $('script[type="application/ld+json"]').each((_, el) => {
            try {
              const json = JSON.parse($(el).html() || '');

              if (json['@type'] === 'Product') {

                mainInfo =
                  json.description?.trim() || '';

                styleId =
                  json.sku?.trim() || '';

                const madeMatch =
                  mainInfo.match(/Made in\s+([^\n]+)/i);

                if (madeMatch) {
                  madeIn = madeMatch[1].trim();
                }
              }

            } catch {}
          });

          const brandstyleId = styleId;

          /* ---------- IMAGES ---------- */

          const imageUrls = new Set<string>();

          $('script[type="application/ld+json"]').each((_, el) => {
            try {
              const json = JSON.parse($(el).html() || '');

              if (json?.image) {
                json.image.forEach((url: string) =>
                  imageUrls.add(url.split('?')[0])
                );
              }
            } catch {}
          });

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

          /* ---------- 유효성 체크 ---------- */

          if (
            !productDetails.mainInfo ||
            !productDetails.styleId ||
            !productDetails.title ||
            !productDetails.price ||
            !productDetails.imageUrls.length ||
            !productDetails.size ||
            !productDetails.brandstyleId
          ) {

            console.warn('⚠️ Fendi 데이터 누락');
            console.dir(productDetails, { depth: null });
            return;
          }

          if (productDetails.soldOut) {
            console.warn(`❌ Fendi 품절 → ${productDetails.title}`);
            return;
          }


          // 기존 상품 조회

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
