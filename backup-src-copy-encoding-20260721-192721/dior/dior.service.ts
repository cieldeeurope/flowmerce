import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { GodoMallService } from 'src/godomall/godomall.service';
import { Repository } from 'typeorm';
import { R2Service } from '../cloudflare/r2.service';
import * as cheerio from 'cheerio';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { SmartstoreService } from 'src/smartstore/smartstore.service';
import { SmartstoreApiService } from 'src/smartstore/smartstore-api.service';
import { Cafe24Service } from 'src/cafe24/cafe24.service';
import { MakeshopService } from 'src/makeshop/makeshop.service';
import { HostingAccount } from 'src/hosting/hostingaccount.entity';
import { Product } from 'src/product/product.entity';
import { Mapping } from 'src/mapping/mapping.entity';
const sharp = require('sharp');
import { GoogleTranslateService } from 'src/smartstore/google-translate.service';
import { UpdateGateway } from 'src/update/update.gateway';
import type { Browser, Page } from 'puppeteer';
import puppeteer from 'puppeteer-extra';
import { UserService } from 'src/user/user.service';
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const PORT_POOL = [9223, 9233, 9243, 9253, 9263, 9273, 9283, 9293];

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


// function loadProxies(): string[] {
//     const filePath = '\\\\CHANMIN\\Desktop\\CleanIP(유료프록시).txt';
//     const fileContent = fs.readFileSync(filePath, 'utf-8');
//     return fileContent.split('\n').map(line => line.trim()).filter(line => line.length > 0);
//   }

// function getRandomProxy(proxies: string[]): string {
//   const randomIndex = Math.floor(Math.random() * proxies.length);
//   return proxies[randomIndex];
// }

// 에러 로그 저장 경로 (lv 폴더 안)
// const errorLogDir = path.join(
//   '\\\\CHANMIN\\Desktop\\크롤링\\에러로그',
//   'dior'
// );

// // 폴더 없으면 생성
// if (!fs.existsSync(errorLogDir)) {
//   fs.mkdirSync(errorLogDir, { recursive: true });
// }

// // 최종 로그 파일 경로
// const errorLogPath = path.join(errorLogDir, 'dior_error_log.txt');

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

interface DiorCookie {
  name: string;
  value: string;
  domain: string;
  path: string;
  expires?: number;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'Strict' | 'Lax' | 'None';
}

@Injectable()
export class DiorService {
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
    private readonly googleTranslateService: GoogleTranslateService,

  ) {}

  private async sleep(ms: number): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, ms));
  }

  private async getHtmlFromUrlWithRetry(
    url: string,
    maxAttempts: number,
    label: string,
    requiredMarkers: string[] = [],
  ): Promise<string> {
    let lastError: any;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const html = await this.r2Service.getHtmlFromUrl2(url);
        if (!html || !html.trim()) {
          throw new Error(`Dior snapshot empty html (${label})`);
        }

        const missingMarker = requiredMarkers.find(marker => !html.includes(marker));
        if (missingMarker) {
          throw new Error(`Dior snapshot missing marker "${missingMarker}"`);
        }

        return html;
      } catch (error: any) {
        lastError = error;

        if (attempt >= maxAttempts) {
          break;
        }

        console.warn(
          `Dior ${label} snapshot retry ${attempt}/${maxAttempts - 1}: ${url} - ${error?.message || error}`,
        );

        await this.sleep(1500 * attempt);
      }
    }

    throw lastError;
  }
  
private async getDiorCookies(page: Page): Promise<DiorCookie[]> {

  const cookieUrls = [
  'https://www.dior.com/fr_fr/fashion',
  'https://www.dior.com/fr_fr/fashion/mode-femme/pret-a-porter/tout-le-pret-a-porter',
  'https://www.dior.com/fr_fr/fashion/mode-femme/sacs/tous-les-sacs',
  'https://www.dior.com/fr_fr/fashion/mode-femme/accessoires/tous-les-accessoires',
  'https://www.dior.com/fr_fr/fashion/mode-homme/pret-a-porter/tout-le-pret-a-porter',
  'https://www.dior.com/fr_fr/fashion/mode-homme/sacs/tous-les-sacs',
];

// 랜덤 선택
const randomCookieUrl = cookieUrls[Math.floor(Math.random() * cookieUrls.length)];


await page.goto(randomCookieUrl, {
  waitUntil: 'domcontentloaded',
  timeout: 30000,
});

  await new Promise((resolve) => setTimeout(resolve, 7000));

  const allCookies = await page.cookies();
  const filtered: DiorCookie[] = allCookies
    .filter(cookie =>
      ['_abck', 'bm_sz', 'bm_sv', 'x-ak-country-code', 'x-ak-geoloc-data'].includes(cookie.name)
    )
    .map(cookie => ({
      name: cookie.name,
      value: cookie.value,
      domain: cookie.domain,
      path: cookie.path,
      expires: cookie.expires,
      httpOnly: cookie.httpOnly,
      secure: cookie.secure,
      sameSite: cookie.sameSite as 'Strict' | 'Lax' | 'None',
    }));

  return filtered;
}



// // 1. 카테고리 가져오기 (프록시 교체 및 재시도 로직 추가)
// async getCategories(siteUrls: string[]): Promise<{ categoryName: string; url: string }[]> {
//     const allCategories: { categoryName: string; url: string }[] = [];
//     const seenUrls = new Set<string>();
//     const allowedRoots = new Set(['mode-femme', 'mode-homme', 'enfant']);

//     for (const siteUrl of siteUrls) {
//       let success = false;

//       for (let attempt = 1; attempt <= 3 && !success; attempt++) {
//         try {
//           const $ = cheerio.load(categoryHtml);

//           $('a[href*="/fashion/"]').each((_, el) => {
//             const href = $(el).attr('href');
//             if (!href) {
//               return;
//             }

//             let absoluteUrl: string;
//             try {
//               absoluteUrl = new URL(href, 'https://www.dior.com').toString();
//             } catch {
//               return;
//             }

//             const normalizedUrl = absoluteUrl.split('?')[0];

//             let pathnameParts: string[];
//             try {
//               pathnameParts = new URL(normalizedUrl).pathname
//                 .split('/')
//                 .filter(Boolean);
//             } catch {
//               return;
//             }

//             const fashionIndex = pathnameParts.indexOf('fashion');
//             if (fashionIndex === -1) {
//               return;
//             }

//             const categoryParts = pathnameParts.slice(fashionIndex + 1);
//             if (categoryParts.length < 2) {
//               return;
//             }

//             if (!allowedRoots.has(categoryParts[0])) {
//               return;
//             }

//             if (categoryParts.includes('products')) {
//               return;
//             }

//             if (seenUrls.has(normalizedUrl)) {
//               return;
//             }

//             seenUrls.add(normalizedUrl);
//             allCategories.push({
//               categoryName: categoryParts.join(' - '),
//               url: normalizedUrl,
//             });
//           });

//           console.log(`Dior categories collected from ${siteUrl}: ${allCategories.length}`);
//           success = true;
//         } catch (error: any) {
//           console.error(`Dior category fetch failed [${siteUrl}] (${attempt}/3): ${error.message}`);
//         }
//       }

//       if (!success) {
//         console.warn(`Dior category fetch skipped after retries: ${siteUrl}`);
//       }
//     }

//     const translatedCategories = await Promise.all(
//       allCategories.map(async (cat) => ({
//         categoryName: await this.googleTranslateService.translateTextToEnglish(cat.categoryName),
//         url: cat.url,
//       })),
//     );

//     return translatedCategories;
//   }
async getCategories(siteUrls: string[]): Promise<{ categoryName: string; url: string }[]> {
    const allCategories: { categoryName: string; url: string }[] = [];
    const seenUrls = new Set<string>();
    const allowedRoots = new Set(['mode-femme', 'mode-homme', 'enfant']);

    for (const siteUrl of siteUrls) {
      let success = false;

      for (let attempt = 1; attempt <= 3 && !success; attempt++) {
        try {
          const categoryHtml = await this.getHtmlFromUrlWithRetry(
            siteUrl,
            3,
            'categories',
            ['/fashion/'],
          );
          const $ = cheerio.load(categoryHtml);

          $('a[href*="/fashion/"]').each((_, el) => {
            const href = $(el).attr('href');
            if (!href) {
              return;
            }

            let absoluteUrl: string;
            try {
              absoluteUrl = new URL(href, 'https://www.dior.com').toString();
            } catch {
              return;
            }

            const normalizedUrl = absoluteUrl.split('?')[0];

            let pathnameParts: string[];
            try {
              pathnameParts = new URL(normalizedUrl).pathname
                .split('/')
                .filter(Boolean);
            } catch {
              return;
            }

            const fashionIndex = pathnameParts.indexOf('fashion');
            if (fashionIndex === -1) {
              return;
            }

            const categoryParts = pathnameParts.slice(fashionIndex + 1);
            if (categoryParts.length < 2) {
              return;
            }

            if (!allowedRoots.has(categoryParts[0])) {
              return;
            }

            if (categoryParts.includes('products')) {
              return;
            }

            if (seenUrls.has(normalizedUrl)) {
              return;
            }

            seenUrls.add(normalizedUrl);
            allCategories.push({
              categoryName: categoryParts.join(' - '),
              url: normalizedUrl,
            });
          });

          console.log(`Dior categories collected from ${siteUrl}: ${allCategories.length}`);
          success = true;
        } catch (error: any) {
          console.error(`Dior category fetch failed [${siteUrl}] (${attempt}/3): ${error.message}`);
        }
      }

      if (!success) {
        console.warn(`Dior category fetch skipped after retries: ${siteUrl}`);
      }
    }

    const translatedCategories = await Promise.all(
      allCategories.map(async (cat) => ({
        categoryName: await this.googleTranslateService.translateTextToEnglish(cat.categoryName),
        url: cat.url,
      })),
    );

    return translatedCategories;
  }

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

    
    

    // 🔥 1️⃣ axios로 이미지 다운로드
    const response = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      timeout: 15000,
      headers: {
        // Dior CDN 차단 방지용 (선택)
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
        'Referer': 'https://www.dior.com/',
      },
    });

    let imageBuffer = Buffer.from(response.data);

    // 🔥 2️⃣ sharp 포맷 확인
    const metadata = await sharp(imageBuffer).metadata();

    // webp / avif → jpeg 변환
    if (metadata.format === 'webp' || metadata.format === 'avif') {
      imageBuffer = await sharp(imageBuffer).jpeg().toBuffer();
      fileName = fileName.replace(/\.(webp|avif)$/i, '.jpg');
    }

    // 🔥 3️⃣ R2 업로드
    const r2ImageUrl = await this.r2Service.uploadImageToR2(
      fileName,
      imageBuffer,
      product,
    );

    return r2ImageUrl;

  } catch (error: any) {
    console.error(`이미지 업로드 실패: ${error.message}`);
    throw error;
  }
}

// private async uploadImageToR2(page:Page, serviceType:string, imageUrl: string, fileName: string, product: Product, partnerKey:string): Promise<string> {
//     try {
//       if (!imageUrl) {
//         console.error('이미지 URL이 유효하지 않습니다:', imageUrl);
//         throw new Error('유효하지 않은 이미지 URL');
//       }
  
//       // Puppeteer 네트워크 컨텍스트를 이용해 백그라운드 fetch → base64 획득
//     const base64: string = await page.evaluate(async (url) => {
//         const res = await fetch(url, { credentials: 'same-origin' });
//         if (!res.ok) {
//           throw new Error(`이미지 fetch 실패: ${res.status}`);
//         }
//         const buf = await res.arrayBuffer();
//         // ArrayBuffer → base64 문자열
//         let binary = '';
//         const bytes = new Uint8Array(buf);
//         for (let b of bytes) {
//           binary += String.fromCharCode(b);
//         }
//         return btoa(binary);
//       }, imageUrl);
  
//       // Node 환경으로 돌아와 Buffer 변환
//       let imageBuffer = Buffer.from(base64, 'base64');
  
//       // Sharp로 메타데이터 확인 후 WebP/AVIF는 JPEG로 변환
//       const metadata = await sharp(imageBuffer).metadata();
//       if (metadata.format === 'webp' || metadata.format === 'avif') {
//         imageBuffer = await sharp(imageBuffer).jpeg().toBuffer();
//         fileName = fileName.replace(/\.(webp|avif)$/i, '.jpg');
//       }
  
//       // R2에 업로드
//       const r2ImageUrl = await this.r2Service.uploadImageToR2(
//         
//         fileName,
//         imageBuffer,
//         product,
//         partnerKey
//       );
//       return r2ImageUrl;
  
//     } catch (error: any) {
//       console.error(`이미지 업로드 실패: ${error.message}`);
//       //logErrorToDesktop(error, `1.오류 발생`);
//       throw error;
//     }
//   }


  private async autoScrollUsingPageDown(page: Page) {
  // 초기 스크롤 위치 가져오기
  let previousScrollY = await page.evaluate(() => window.scrollY);
  while (true) {
    // PageDown 키 누르기
    await page.keyboard.press('PageDown');
    // 페이지 내 스크롤 애니메이션이 끝날 시간을 기다림 (예: 500ms)
    await new Promise((resolve) => setTimeout(resolve, 150));
    // 새로운 scrollY 값 가져오기
    const newScrollY = await page.evaluate(() => window.scrollY);
    // 스크롤 위치가 더 이상 변하지 않으면 종료
    if (newScrollY === previousScrollY) {
      break;
    }
    previousScrollY = newScrollY;
  }
  console.log('더 이상 스크롤 할 수 없습니다.');
}

private async waitRandom(min = 2000, max = 3000): Promise<void> {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  await new Promise(resolve => setTimeout(resolve, delay));
}




  // 자동 스크롤 함수
  private async autoScroll(page: Page) {
  await page.evaluate(async () => {
    const getRandomDistance = () => Math.floor(Math.random() * 250) + 150; // 100 ~ 250px
    const getRandomDelay = () => Math.floor(Math.random() * 80) + 40; // 50 ~ 200ms

    let totalHeight = 0;
    const scrollHeight = document.body.scrollHeight;

    await new Promise<void>((resolve) => {
      const scroll = async () => {
        const distance = getRandomDistance();
        window.scrollBy(0, distance);
        totalHeight += distance;

        if (totalHeight >= scrollHeight) {
          resolve();
          return;
        }

        const delay = getRandomDelay();
        setTimeout(scroll, delay);
      };

      scroll(); // 최초 호출
    });
  });
}

  private async scrollUntilFullyLoaded(page: Page): Promise<void> {
      let previousHeight = await page.evaluate(() => document.body.scrollHeight);
    
      while (true) {
        // 1. 현재 정의된 autoScroll 실행
        await this.autoScroll(page);
    
        // 2. 4초 대기
        await new Promise((resolve) => setTimeout(resolve, 5000));
  
        // 3. 새로운 scrollHeight 확인
        const newHeight = await page.evaluate(() => document.body.scrollHeight);
    
        // 4. scrollHeight가 같으면 더 이상 로드된 게 없음
        if (newHeight === previousHeight) {
          break;
        }
    
        // 5. 값이 다르면 다시 반복
        previousHeight = newHeight;
      }
    }

  // Dior 사이트 크롤링 시작
//   async getProductsFromCategory(siteUrl: string, partnerKey: string,apiKey: string, customId:string, accountPlatform:string, godoMallCategoryCode: string): Promise<void> {
    // const account = await this.hostingAccountRepository.findOne({
    //   where: { customId, accountPlatform },
    // });

    
//     const serviceType = 'Dior';
//     const proxyLines = await this.r2Service.loadBrightProxies2();
//         if (!proxyLines.length) {
//             console.warn('프록시 없음, 종료');
//             return;
//         }
    
//     const proxy = pickProxy(proxyLines);
//     const proxyArg = `--proxy-server=http://${proxy.host}:${proxy.port}`;

//     let browser: Browser | null = null;
//     let page: Page | null = null;
//     let productUrls: string[] = [];

//     const category = await this.mappingRepository.findOne({
//       where: { customId: customId, accountPlatform: accountPlatform, siteUrl: siteUrl },
//     });

//     try {
//       // ✅ 이미 실행 중인 "내 실제 크롬"에 연결
//       browser = await puppeteer.connect({
//         browserURL: 'http://127.0.0.1:9223',
//         defaultViewport: null,
//       });

//       page = await browser.newPage();

//       // 실제 크롬 화면 앞으로 가져오기
//       await page.bringToFront();

//       console.log('✅ 실크롬 attach 완료');


//       const MAX_RETRY = 5; // 최대 재시도 횟수
//       let retryAttempts = 0;

//       while (retryAttempts < MAX_RETRY) {
//         try {
//             let response;

//             try {
//               response = await page.goto(siteUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
//             } catch (gotoError: any) {

//                 console.warn(`⚠️ page.goto 실패 (${gotoError.message}) → 재시도 진행`);
//                 retryAttempts++;

//                 // ✅ 페이지와 브라우저 닫기
//                 if (page && !page.isClosed()) {
//                   await page.close();
//                 }
//                 if (browser) {
//                   await browser.close();
//                 }

//                 // ✅ 최대 재시도 초과 시 종료
//                 if (retryAttempts >= MAX_RETRY) {
//                   console.error(`❌ 최대 재시도 횟수 초과: ${siteUrl}`);
//                   return;
//                 }

//                 // ✅ 새로운 프록시 선택
//                 // proxy = getRandomProxy(proxies);
//                 // console.log(`🔁 프록시 변경 후 재시도 (${retryAttempts}/${MAX_RETRY}): ${proxy}`);

//                 // ✅ 브라우저 재시작
//                 browser = await puppeteer.launch({
//                   headless: false,
//                   args: [
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
//                   ],
//                 });

//                 page = await browser.newPage();
//                 await page.authenticate({
//                   username: proxy.username,
//                   password: proxy.password,
//                 });

//                 // ✅ 기본 우회 스크립트 삽입
//                 await page.evaluateOnNewDocument(() => {
//                   Object.defineProperty(navigator, 'webdriver', { get: () => false });
//                   Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
//                   Object.defineProperty(navigator, 'languages', { get: () => ['fr-FR', 'fr'] });
//                   Object.defineProperty(navigator, 'deviceMemory', { get: () => 8 });
//                   Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 4 });
//                   (window as any).chrome = { runtime: {} };

//                   const getParameter = WebGLRenderingContext.prototype.getParameter;
//                   WebGLRenderingContext.prototype.getParameter = function (parameter) {
//                     if (parameter === 37445) return 'Intel Inc.';
//                     if (parameter === 37446) return 'Intel Iris OpenGL Engine';
//                     return getParameter(parameter);
//                   };

//                   const originalFunctionToString = Function.prototype.toString;
//                   Function.prototype.toString = function () {
//                     if (this === window.Function || this instanceof Function) {
//                       return 'function Function() { [native code] }';
//                     }
//                     return originalFunctionToString.call(this);
//                   };
//                 });

//                 // ✅ 헤더/UA 재설정
//                 await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36');
//                 await page.setExtraHTTPHeaders({
//                   'Accept-Language': 'fr-FR,fr;q=0.9',
//                   'Referer': 'https://www.dior.com/fr_fr/fashion',
//                   'Origin': 'https://www.dior.com',
//                   'Sec-CH-UA': '"Chromium";v="145", "Google Chrome";v="145", "Not:A-Brand";v="8"',
//                   'Sec-CH-UA-Mobile': '?0',
//                   'Sec-CH-UA-Platform': '"Windows"',
//                 });
//                 await page.setViewport({ width: 1920, height: 1080 });

//                 // ✅ 세션 정리 대기 (중요)
//                 await new Promise((r) => setTimeout(r, 3000));

//                 continue; // ✅ while 루프 다시 시도 (goto 재시도)
//               }

//             await new Promise((resolve) => setTimeout(resolve, 5000));

//             const status = response?.status() ?? 0;

//             if (status === 403 || status === 0) {
//               throw new Error(`403 또는 차단 응답 감지됨`);
//             }

//             const html = await page.content();
            
            
//             // ✅ Dior 차단 감지
//             if (/Page unavailable|Reference ID:|Access Denied|Akamai|Forbidden/i.test(html)) {
//               throw new Error("❌ Dior 차단 페이지 감지 (HTML 패턴 매칭)");
//             }

//             // ✅ Chrome 에러 페이지 감지 (사이트 연결 불가)
//             if (/ERR_TIMED_OUT|사이트에 연결할 수 없음|This site can’t be reached/i.test(html)) {
//               throw new Error("❌ Chrome 오류 페이지 감지 (네트워크 연결 실패)");
//             }

//             // 🚨 Dior "Page unavailable" 차단 페이지 감지
//             const isUnavailable = await page.evaluate(() => {
//               const h1 = document.querySelector("h1")?.textContent?.trim();
//               const bodyText = document.body.innerText;
//               return (
//                 h1 === "Page unavailable" ||
//                 bodyText.includes("Reference ID:") ||
//                 bodyText.includes("Your IP:") ||
//                 bodyText.includes("Date/Time:") ||
//                 bodyText.includes("사이트에 연결할 수 없음") ||   // ✅ 한국어 메시지 추가
//                 bodyText.includes("ERR_TIMED_OUT")                // ✅ 에러코드 직접 매칭
//               );
//             });

//             if (isUnavailable) {
//               throw new Error("❌ Dior 차단/네트워크 오류 페이지 감지 (Page unavailable / ERR_TIMED_OUT)");
//             }
            
//             try {
//               await page.waitForSelector('#onetrust-reject-all-handler', {visible: true,timeout: 7000});
//               const popinCloseButton = await page.$('#onetrust-reject-all-handler');
//               if (popinCloseButton) {
//                 await popinCloseButton.click();
//                 await this.waitRandom();
//                }
//               } catch (error: any) {
//                 console.log("쿠키 없음");
//                 }

//           //국가 설정 “X” 버튼 클릭
//           try {
//             await page.waitForSelector('[aria-label="Fermer la modale de géolocalisation"]', {visible: true,timeout: 7000});
//             const contryCloseButton = await page.$('[aria-label="Fermer la modale de géolocalisation"]');
//             if (contryCloseButton) {
//               await contryCloseButton.click();
//               await this.waitRandom();
//               }
//             } catch (error: any) {
//               console.log("국가설정 없음");
//               }

//             await this.scrollUntilFullyLoaded(page);
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
//                 return; // 최대 재시도 횟수를 초과하면 함수 종료
//             }

//             browser = await puppeteer.launch({
//               headless: false,
//               args: [
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
//             await page.evaluateOnNewDocument(() => {
//             Object.defineProperty(navigator, 'webdriver', { get: () => false });
//             Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
//             Object.defineProperty(navigator, 'languages', { get: () => ['fr-FR', 'fr'] });
//             Object.defineProperty(navigator, 'deviceMemory', { get: () => 8 });
//             Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 4 });
//             (window as any).chrome = {
//               runtime: {},
//             };

//             // WebGL 우회
//             const getParameter = WebGLRenderingContext.prototype.getParameter;
//             WebGLRenderingContext.prototype.getParameter = function(parameter) {
//               if (parameter === 37445) return 'Intel Inc.'; // UNMASKED_VENDOR_WEBGL
//               if (parameter === 37446) return 'Intel Iris OpenGL Engine'; // UNMASKED_RENDERER_WEBGL
//               return getParameter(parameter);
//             };

//             // Function.prototype.toString 우회
//             const originalFunctionToString = Function.prototype.toString;
//             Function.prototype.toString = function() {
//               if (this === window.Function || this instanceof Function) {
//                 return 'function Function() { [native code] }';
//               }
//               return originalFunctionToString.call(this);
//             };
//           });

//           await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36');
//           await page.setExtraHTTPHeaders({
//             'Accept-Language': 'fr-FR,fr;q=0.9',
//             'Referer': 'https://www.dior.com/fr_fr/fashion',
//             'Origin': 'https://www.dior.com',
//             'Sec-CH-UA': '"Chromium";v="145", "Google Chrome";v="145", "Not:A-Brand";v="8"',
//             'Sec-CH-UA-Mobile': '?0',
//             'Sec-CH-UA-Platform': '"Windows"',
//           });
//           await page.setViewport({ width: 1920, height: 1080 });

//           let cookieSuccess = false;
//           try {
//             // cookies = await this.getDiorCookies(page);
//             cookieSuccess = true;
//             break;
//           } catch (error: any) {
//             //logErrorToDesktop(error, `3.오류 발생`);
//             // proxy = getRandomProxy(proxies);
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
//             await page.evaluateOnNewDocument(() => {
//             Object.defineProperty(navigator, 'webdriver', { get: () => false });
//             Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
//             Object.defineProperty(navigator, 'languages', { get: () => ['fr-FR', 'fr'] });
//             Object.defineProperty(navigator, 'deviceMemory', { get: () => 8 });
//             Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 4 });
//             (window as any).chrome = {
//               runtime: {},
//             };

//             // WebGL 우회
//             const getParameter = WebGLRenderingContext.prototype.getParameter;
//             WebGLRenderingContext.prototype.getParameter = function(parameter) {
//               if (parameter === 37445) return 'Intel Inc.'; // UNMASKED_VENDOR_WEBGL
//               if (parameter === 37446) return 'Intel Iris OpenGL Engine'; // UNMASKED_RENDERER_WEBGL
//               return getParameter(parameter);
//             };

//             // Function.prototype.toString 우회
//             const originalFunctionToString = Function.prototype.toString;
//             Function.prototype.toString = function() {
//               if (this === window.Function || this instanceof Function) {
//                 return 'function Function() { [native code] }';
//               }
//               return originalFunctionToString.call(this);
//             };
//           });

//           await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36');
//           await page.setExtraHTTPHeaders({
//             'Accept-Language': 'fr-FR,fr;q=0.9',
//             'Referer': 'https://www.dior.com/fr_fr/fashion',
//             'Origin': 'https://www.dior.com',
//             'Sec-CH-UA': '"Chromium";v="145", "Google Chrome";v="145", "Not:A-Brand";v="8"',
//             'Sec-CH-UA-Mobile': '?0',
//             'Sec-CH-UA-Platform': '"Windows"',
//           });
//           await page.setViewport({ width: 1920, height: 1080 });
//         }

//           await this.waitRandom();
//           const context = page.browserContext(); // 또는 browser.defaultBrowserContext()
//           // await context.setCookie(...cookies);

//           // 다음 재시도를 위한 랜덤 대기 시간 (exponential backoff)
//           const waitTime = Math.min(1000 * 2 ** retryAttempts, 10000); // 최대 10초 대기
//           await new Promise((resolve) => setTimeout(resolve, waitTime));
//         }
//     }

//     while (true) {
//         try {
//             // 현재 페이지에서 상품 URL 및 차단 여부 평가
//             const { currentPageProductUrls, isBlocked, hasMoreButton} = await page.evaluate(() => {
//                     const productUrls = Array.from(document.querySelectorAll('span[data-testid="product-title"]'))
//                     .map(span => {
//                       const link = span.closest('a.product-card__link[href]');
//                       return link ? (link as HTMLAnchorElement).href : null;
//                     })
//                     .filter((url): url is string => !!url);

            

//             const bodyText = document.querySelector('body')?.textContent || '';

//             const isBlocked =
//                 document.querySelector('body') === null &&
//                 (bodyText.includes('Access Denied') ||
//                     bodyText.includes('Too Many Requests') ||
//                     bodyText.includes('429') ||
//                     bodyText.includes('Enforced timeout') ||
//                     bodyText.includes('net::ERR_TIMED_OUT'));
            
//             const moreButton = Array.from(document.querySelectorAll('[aria-label]')).find(el => el.getAttribute('aria-label').includes('View More'));
//             const hasMoreButton = moreButton !== undefined;

//           return { currentPageProductUrls: productUrls, isBlocked, hasMoreButton};
//       });

//       if (isBlocked) {
//           console.warn("페이지가 차단되었습니다. 프록시를 변경하여 다시 시도합니다.");
//           // proxy = getRandomProxy(proxies); // 새로운 프록시 설정
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
//             username: proxy.username,
//             password: proxy.password,
//           });
//           await page.evaluateOnNewDocument(() => {
//           Object.defineProperty(navigator, 'webdriver', { get: () => false });
//             Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
//             Object.defineProperty(navigator, 'languages', { get: () => ['fr-FR', 'fr'] });
//             Object.defineProperty(navigator, 'deviceMemory', { get: () => 8 });
//             Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 4 });
//           (window as any).chrome = {
//             runtime: {},
//           };

//           // WebGL 우회
//           const getParameter = WebGLRenderingContext.prototype.getParameter;
//           WebGLRenderingContext.prototype.getParameter = function(parameter) {
//             if (parameter === 37445) return 'Intel Inc.'; // UNMASKED_VENDOR_WEBGL
//             if (parameter === 37446) return 'Intel Iris OpenGL Engine'; // UNMASKED_RENDERER_WEBGL
//             return getParameter(parameter);
//           };

//           // Function.prototype.toString 우회
//           const originalFunctionToString = Function.prototype.toString;
//           Function.prototype.toString = function() {
//             if (this === window.Function || this instanceof Function) {
//               return 'function Function() { [native code] }';
//             }
//             return originalFunctionToString.call(this);
//           };
//         });

//         await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36');
//         await page.setExtraHTTPHeaders({
//           'Accept-Language': 'fr-FR,fr;q=0.9',
//           'Referer': 'https://www.dior.com/fr_fr/fashion',
//           'Origin': 'https://www.dior.com',
//           'Sec-CH-UA': '"Chromium";v="145", "Google Chrome";v="145", "Not:A-Brand";v="8"',
//           'Sec-CH-UA-Mobile': '?0',
//           'Sec-CH-UA-Platform': '"Windows"',
//         });
//         await page.setViewport({ width: 1920, height: 1080 });
//         let cookies = await this.getDiorCookies(page);
//         await this.waitRandom();
//         const context = page.browserContext(); // 또는 browser.defaultBrowserContext()
//         await context.setCookie(...cookies);
//         await page.goto(siteUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
//         continue;
//       }

//       if (currentPageProductUrls.length === 0) {
//           console.log("더 이상 상품이 없습니다. 반복문을 종료합니다.");
//           break;
//       }

//       // 더보기 버튼 클릭
//       if (hasMoreButton) {
//         console.log("더보기 버튼이 감지되었습니다. 클릭 후 대기합니다.");
//         await page.evaluate(() => {
//             const moreButton = Array.from(document.querySelectorAll('[aria-label]'))
//                 .find(el => el.getAttribute('aria-label')?.includes('View More'));
            
//                 (moreButton as HTMLElement).click();
//         });
//         await new Promise((resolve) => setTimeout(resolve, 5000)); // UI 업데이트를 기다림
//         await this.scrollUntilFullyLoaded(page);
//         } else {
//           productUrls = Array.from(new Set(productUrls.concat(currentPageProductUrls)));
//         break;
//        }
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
//                         '--window-position=-9999,0',
//                         "--window-size=300,300",
//                       ],
//                   });
//                   page = await browser.newPage();
//                   await page.authenticate({
//                     username: proxy.username,
//                     password: proxy.password,
//                   });
//                   await page.evaluateOnNewDocument(() => {
//                   Object.defineProperty(navigator, 'webdriver', { get: () => false });
//             Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
//             Object.defineProperty(navigator, 'languages', { get: () => ['fr-FR', 'fr'] });
//             Object.defineProperty(navigator, 'deviceMemory', { get: () => 8 });
//             Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 4 });
//                   (window as any).chrome = {
//                     runtime: {},
//                   };

//                   // WebGL 우회
//                   const getParameter = WebGLRenderingContext.prototype.getParameter;
//                   WebGLRenderingContext.prototype.getParameter = function(parameter) {
//                     if (parameter === 37445) return 'Intel Inc.'; // UNMASKED_VENDOR_WEBGL
//                     if (parameter === 37446) return 'Intel Iris OpenGL Engine'; // UNMASKED_RENDERER_WEBGL
//                     return getParameter(parameter);
//                   };

//                   // Function.prototype.toString 우회
//                   const originalFunctionToString = Function.prototype.toString;
//                   Function.prototype.toString = function() {
//                     if (this === window.Function || this instanceof Function) {
//                       return 'function Function() { [native code] }';
//                     }
//                     return originalFunctionToString.call(this);
//                   };
//                 });

//                 await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36');
//                 await page.setExtraHTTPHeaders({
//                   'Accept-Language': 'fr-FR,fr;q=0.9',
//                   'Referer': 'https://www.dior.com/fr_fr/fashion',
//                   'Origin': 'https://www.dior.com',
//                   'Sec-CH-UA': '"Chromium";v="145", "Google Chrome";v="145", "Not:A-Brand";v="8"',
//                   'Sec-CH-UA-Mobile': '?0',
//                   'Sec-CH-UA-Platform': '"Windows"',
//                 });
//                 await page.setViewport({ width: 1920, height: 1080 });
//                 let cookies = await this.getDiorCookies(page);
//                 await this.waitRandom();
//                 const context = page.browserContext(); // 또는 browser.defaultBrowserContext()
//                 await context.setCookie(...cookies);
//               } catch (closeError: any) {
//                   console.warn("브라우저 종료 중 추가 오류:", closeError.message);
//               }
//           }
//           // proxy = getRandomProxy(proxies); // 새로운 프록시 설정
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
//     console.log(`디올 최종 수집된 상품 URL 수: ${productUrls.length} - ${category?.categoryName || '카테고리 없음'}`);

//     for (const [index, productUrl] of productUrls.entries()) {
//       let loadAttempts = 0;
//       let success = false;
//       await this.waitRandom();

//       while (loadAttempts < 10) {
//         try {
//             const response = await page.goto(productUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
//             await new Promise((resolve) => setTimeout(resolve, 5000));

//             const status2 = response?.status() ?? 0;

//             if (status2 === 403 || status2 === 0) {
//               throw new Error(`403 또는 차단 응답 감지됨2`);
//             }

//             const html = await page.content();
//             if (/Page unavailable|Reference ID:|Access Denied|Akamai|Forbidden/i.test(html)) {
//               throw new Error("❌ Dior 차단 페이지 감지 (HTML 패턴 매칭)");
//             }

//             // 🚨 Dior "Page unavailable" 차단 페이지 감지
//             const isUnavailable = await page.evaluate(() => {
//               const h1 = document.querySelector("h1")?.textContent?.trim();
//               const bodyText = document.body.innerText;
//               return (
//                 h1 === "Page unavailable" ||
//                 bodyText.includes("Reference ID:") ||
//                 bodyText.includes("Your IP:") ||
//                 bodyText.includes("Date/Time:")
//               );
//             });

//             if (isUnavailable) {
//               throw new Error("❌ Dior 차단 페이지 감지 (Page unavailable)");
//             }

//             const status = response?.status() ?? 0;


//             // 1. HTTP status 체크
//             if (status === 403 || status === 0) {
//                 throw new Error(`403 또는 차단 응답 감지됨`);
//             }

//             // 2. HTML 내용 차단 패턴 체크
//             const bodyText = await page.evaluate(() => document.body.innerText || '');
//             if (
//                 bodyText.includes('Access Denied') ||
//                 bodyText.includes('Forbidden') ||
//                 bodyText.includes('Captcha') ||
//                 bodyText.includes('temporarily unavailable')
//             ) {
//                 throw new Error(`페이지 내용에서 차단 패턴 감지됨`);
//             }
            
//             console.log(`✅ (${index + 1}/${productUrls.length}) 디올 ${category?.categoryName || '카테고리 없음'}  수집 중`);
//             await this.waitRandom();
//             try {
//                 await page.waitForSelector('#onetrust-reject-all-handler', {visible: true,timeout: 2000});
//                 const popinCloseButton = await page.$('#onetrust-reject-all-handler');
//                 if (popinCloseButton) {
//                   await popinCloseButton.click();
//                   await this.waitRandom();
//                  }
//                 } catch (error: any) {
//                   console.log("쿠키 없음");
//                   }

//             //국가 설정 “X” 버튼 클릭
//             try {
//               await page.waitForSelector('[aria-label="Fermer la modale de géolocalisation"]', {visible: true,timeout: 2000});
//               const contryCloseButton = await page.$('[aria-label="Fermer la modale de géolocalisation"]');
//               if (contryCloseButton) {
//                 await contryCloseButton.click();
//                 await this.waitRandom();
//                 }
//               } catch (error: any) {
//                 console.log("국가설정 없음");
//                 }
//                 await this.waitRandom();

//             success = true;
//             break; // 로딩 성공 시 루프 종료
//           } catch (error: any) {
//               loadAttempts++;
//               console.warn(`페이지 로드 실패 (프록시 변경 ${loadAttempts}/10): ${error.message}`);
//               //logErrorToDesktop(error, `5.오류 발생`);
//               if (loadAttempts < 10) {
//                   // proxy = getRandomProxy(proxies);
//                   // console.log(`새로운 프록시로 변경: ${proxy}`);
//                   if (page && !page.isClosed()) {
//                       await page.close();
//                   }
//                   if (browser) {
//                       await browser.close();
//                   }
//                   browser = await puppeteer.launch({
//                       headless: false,
//                       args: [
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
//                         '--window-position=-9999,0',
//                         "--window-size=300,300",
//                       ],
//                   });
//                   page = await browser.newPage();
//                   await page.authenticate({
//                     username: proxy.username,
//                     password: proxy.password,
//                   });
//                   await page.evaluateOnNewDocument(() => {
//                   Object.defineProperty(navigator, 'webdriver', { get: () => false });
//                   Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
//                   Object.defineProperty(navigator, 'languages', { get: () => ['fr-FR', 'fr'] });
//                   Object.defineProperty(navigator, 'deviceMemory', { get: () => 8 });
//                   Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 4 });
//                   (window as any).chrome = {
//                     runtime: {},
//                   };

//                   // WebGL 우회
//                   const getParameter = WebGLRenderingContext.prototype.getParameter;
//                   WebGLRenderingContext.prototype.getParameter = function(parameter) {
//                     if (parameter === 37445) return 'Intel Inc.'; // UNMASKED_VENDOR_WEBGL
//                     if (parameter === 37446) return 'Intel Iris OpenGL Engine'; // UNMASKED_RENDERER_WEBGL
//                     return getParameter(parameter);
//                   };

//                   // Function.prototype.toString 우회
//                   const originalFunctionToString = Function.prototype.toString;
//                   Function.prototype.toString = function() {
//                     if (this === window.Function || this instanceof Function) {
//                       return 'function Function() { [native code] }';
//                     }
//                     return originalFunctionToString.call(this);
//                   };
//                 });

//                 await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36');
//                 await page.setExtraHTTPHeaders({
//                   'Accept-Language': 'fr-FR,fr;q=0.9',
//                   'Referer': 'https://www.dior.com/fr_fr/fashion',
//                   'Origin': 'https://www.dior.com',
//                   'Sec-CH-UA': '"Chromium";v="145", "Google Chrome";v="145", "Not:A-Brand";v="8"',
//                   'Sec-CH-UA-Mobile': '?0',
//                   'Sec-CH-UA-Platform': '"Windows"',
//                 });
//                 await page.setViewport({ width: 1920, height: 1080 });

//                 let cookieSuccess = false;
//                 let cookies: DiorCookie[] = [];
//           try {
//             cookies = await this.getDiorCookies(page);
//             cookieSuccess = true;
//           } catch (error: any) {
//             //logErrorToDesktop(error, `6.오류 발생`);
//             // proxy = getRandomProxy(proxies);
//             if (page && !page.isClosed()) {
//                 await page.close();
//             }
//             if (browser) {
//                 await browser.close();
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
//             await page.evaluateOnNewDocument(() => {
//             Object.defineProperty(navigator, 'webdriver', { get: () => false });
//             Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
//             Object.defineProperty(navigator, 'languages', { get: () => ['fr-FR', 'fr'] });
//             Object.defineProperty(navigator, 'deviceMemory', { get: () => 8 });
//             Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 4 });
//             (window as any).chrome = {
//               runtime: {},
//             };

//             // WebGL 우회
//             const getParameter = WebGLRenderingContext.prototype.getParameter;
//             WebGLRenderingContext.prototype.getParameter = function(parameter) {
//               if (parameter === 37445) return 'Intel Inc.'; // UNMASKED_VENDOR_WEBGL
//               if (parameter === 37446) return 'Intel Iris OpenGL Engine'; // UNMASKED_RENDERER_WEBGL
//               return getParameter(parameter);
//             };

//             // Function.prototype.toString 우회
//             const originalFunctionToString = Function.prototype.toString;
//             Function.prototype.toString = function() {
//               if (this === window.Function || this instanceof Function) {
//                 return 'function Function() { [native code] }';
//               }
//               return originalFunctionToString.call(this);
//             };
//           });

//           await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36');
//           await page.setExtraHTTPHeaders({
//             'Accept-Language': 'fr-FR,fr;q=0.9',
//             'Referer': 'https://www.dior.com/fr_fr/fashion',
//             'Origin': 'https://www.dior.com',
//             'Sec-CH-UA': '"Chromium";v="145", "Google Chrome";v="145", "Not:A-Brand";v="8"',
//             'Sec-CH-UA-Mobile': '?0',
//             'Sec-CH-UA-Platform': '"Windows"',
//           });
//           await page.setViewport({ width: 1920, height: 1080 });
//         }


//           await this.waitRandom();
//           const context = page.browserContext(); // 또는 browser.defaultBrowserContext()
//           await context.setCookie(...cookies);
//           continue;
//               } else {
//                   console.error('최대 로드 시도 초과 - 다음 URL로 이동합니다.');
//                   //logErrorToDesktop(error, `7.오류 발생`);
//                   break;
//               }
//           }
//       }

//       if (!success) {
//         console.warn(`(${index+1}) 페이지 로드가 실패해서 evaluate 스킵`);
//         continue;   // 다음 URL로
//       }
      
//     const productDetails = await page.evaluate(async () => {
//       await new Promise((resolve) => setTimeout(resolve, 1000));
//         const detailsButton = document.querySelector('div.MuiBox-root.mui-latin-k008qs button');
//         if (detailsButton) {
//           (detailsButton as HTMLElement).click();
//         }

//         // ✅ 제품 설명
//         let mainInfo = '';
//         let madeIn = '';

//         // 1) 멀티라인 디스크립션 가져오기
//         const descriptionDiv = document.querySelector('div.multiline-text.ProductDescriptionTab_description__SpNxN');
//         if (descriptionDiv) {
//         mainInfo += descriptionDiv.textContent?.trim() + '\n';
//         }

//         // 2) 목록(li) 텍스트 전부 가져오기
//         const listItems = document.querySelectorAll('ul.MuiList-root.MuiList-padding.DS-List-m.mui-latin-1yuy9bz li.MuiListItem-root.MuiListItem-padding.mui-latin-7msrqz');
//         if (listItems.length > 0) {
//         const itemTexts = Array.from(listItems).map(li => li.textContent?.trim());
//         mainInfo += itemTexts.join('\n');
//         }

//         // ✅ madeIn 추출 (정규식으로 Fabriqué 또는 Fabriquée 처리)
//         const madeInElement = Array.from(document.querySelectorAll('p.MuiTypography-root.MuiTypography-body-s.DS-Typography.mui-latin-gyjrk5'))
//         .find(el => el.textContent.includes('Fabriqu'));

//         if (madeInElement) {
//           const parts = madeInElement.textContent.split(/Fabriqu[eé]e? en /);
//           if (parts.length > 1 && parts[1]) {
//             madeIn = parts[1].trim();
//           }
//         }

//         // 3) 특정 문구 제거
//         const filterPhrase = "Pour plus d'informations, merci de consulter le guide des tailles";
//         mainInfo = mainInfo.replace(filterPhrase, '').trim();

//         // ✅ 스타일 ID (SKU 코드 추출)
//         const fullText = document.querySelector('p[data-end-to-end="fashion-product-reference"]')?.textContent || '';
//         const styleId = fullText.replace('Référence: ', '').trim();        
//         const brandstyleId = styleId;

//         const site = 'Dior';
//         const designer = '디올';
//         const titleElement = document.querySelector('[data-testid="fashion-product-title"]');
//         const title = titleElement ? titleElement.textContent?.trim() || '' : '';
//         const priceElement = document.querySelector('span.price-line');
//         let price = 0;

//         if (priceElement) {
//           const rawText = priceElement.textContent?.trim() || ''; // "2 700,00 €" 같은 값
//           let cleaned = rawText.replace(/\s/g, '')        // 공백 제거 → "2700,00€"
//                               .replace('€', '')          // 유로 제거 → "2700,00"
//                               .replace(/\./g, '')        // 천 단위 점 제거
//                               .replace(/\u202f/g, '');   // 특수 공백 제거

//           // 소수점 처리: 쉼표 앞부분만 취함 → "2700"
//           cleaned = cleaned.split(',')[0];

//           price = parseInt(cleaned, 10) || 0;
//         }
        
//         const colorText = document.querySelector('h2.MuiTypography-root.MuiTypography-body-s.DS-Typography.mui-latin-1lx4awc')?.textContent || '';
//         const color = colorText.trim();
        
//         // 이미지 수집
//         const imageElements = document.querySelectorAll('ul.MuiGrid-root.MuiGrid-container.MuiGrid-spacing-xs-0\\.25.mui-latin-1huz2td img[src]');

//         const imageUrls = Array.from(imageElements)
//         .map(img => (img as HTMLImageElement).currentSrc || (img as HTMLImageElement).src); // ✅ Type Assertion 적용
//         await new Promise((resolve) => setTimeout(resolve, 2000));

//         let size = '';
//         // 콤보박스(Select) 요소 찾기
//         const comboDiv = document.querySelector<HTMLElement>('#product-sizes [role="combobox"]');
//         if (!comboDiv) {
//         // 1) 콤보박스 자체가 없으면, '원사이즈'
//         size = '원사이즈';
//         } else {
//         // 2) 콤보박스가 있으면, 스페이스 키 이벤트로 드롭다운 열기
//         comboDiv.focus();
//         const spaceEvent = new KeyboardEvent('keydown', {
//             key: ' ',
//             code: 'Space',
//             keyCode: 32,
//             which: 32,
//             bubbles: true,
//             cancelable: true,
//         });
//         comboDiv.dispatchEvent(spaceEvent);
//         await new Promise((resolve) => setTimeout(resolve, 2000));
//         // 사이즈 목록 가져오기
//         const sizeSpan = document.querySelectorAll('[role="listbox"] span.MuiBox-root.mui-latin-0');

//         // 사이즈 목록이 비어 있으면 → 스킵(null 반환)
//         if (sizeSpan.length === 0) {
//             console.log("⚠️ 모든 사이즈가 품절입니다. 다음 상품으로 이동합니다.");
//             return null; // 🚀 상품 수집 건너뛰기
//         } else {
//             // Array.from(...)으로 NodeList → 배열 변환 후, textContent를 쉼표로 연결
//             size = Array.from(sizeSpan)
//             .map(el => el.textContent?.trim() || '')
//             .filter(Boolean)  // 빈 값 제거
//             .join(', ');
//         }
//         }

//         return { site, designer, title, price, color, mainInfo, madeIn, styleId, size, brandstyleId, imageUrls };
//       });

//       if (!productDetails || !productDetails.mainInfo || !productDetails.styleId || !productDetails.title || !productDetails.price || !productDetails.imageUrls.length || !productDetails.size || !productDetails.brandstyleId) {
//         console.warn('디올 데이터 누락 - 다음 productUrl로 이동');
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
//         // // existingProduct.title = productDetails.title;
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
//             // page,
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
//             //         page,
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
//                 // // ★ R2 업로드 후, R2 URL을 기반으로 base64ImageList와 originThumbnailUrls 생성
//                 // const base64ImageList: string[] = [];
//                 // const originThumbnailUrls: string[] = [];

//                 // // 대표 이미지 R2 URL을 사용
//                 // try {
//                 // const mainResponse = await axios.get(existingProduct.mainImageUrl, { responseType: 'arraybuffer', timeout: 10000 });
//                 // const mainBuffer = Buffer.from(mainResponse.data, 'binary');
//                 // const mainBase64 = mainBuffer.toString('base64');
//                 // base64ImageList.push(mainBase64);
//                 // originThumbnailUrls.push(existingProduct.mainImageUrl);
//                 // } catch (error: any) {
//                 // console.error('대표 이미지 R2 불러오기 실패:', existingProduct.mainImageUrl, error.message);
//                 // }

//                 // // 추가 이미지 R2 URL을 사용
//                 // for (const r2url of existingProduct.additionalImageUrls) {
//                 //     try {
//                 //         const additionalResponse = await axios.get(r2url, { responseType: 'arraybuffer', timeout: 10000 });
//                 //         const additionalBuffer = Buffer.from(additionalResponse.data, 'binary');
//                 //         const additionalBase64 = additionalBuffer.toString('base64');
//                 //         base64ImageList.push(additionalBase64);
//                 //         originThumbnailUrls.push(r2url);
//                 //     } catch (error: any) {
//                 //         console.error('추가 이미지 R2 불러오기 실패:', r2url, error.message);
//                 //     }
//                 // }

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
//           page,
//           
//           productDetails.imageUrls[0],  // ✅ 이미지 URL을 첫 번째 인자로 전달
//           `${productDetails.styleId}-main.jpg`,  // ✅ 저장할 파일명
//           newProduct,
//           partnerKey,
//       );
//       newProduct.mainImageUrl = r2MainImageUrl; // ✅ R2 URL 저장
      
//       const additionalPromises = productDetails.imageUrls
//           .slice(1)  // index 1 이상부터
//           .map((url, idx) =>
//               this.uploadImageToR2(
//               page,
//               
//               url,
//               `${productDetails.styleId}-additional-${idx + 1}.jpg`,
//               newProduct,
//               partnerKey,
//               )
//           );

//       const additionalR2Urls = await Promise.all(additionalPromises);
//       newProduct.additionalImageUrls = additionalR2Urls; // ✅ 추가 이미지 리스트 저장

//       const allR2Urls = [newProduct.mainImageUrl,...(newProduct.additionalImageUrls || [])];
        
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
//           // if (page && !page.isClosed()) {
//           // await page.close();
//           // }
//           // if (browser) {
//           // await browser.close();
//           // }
//           // ✅ 플랫폼 타입에 따른 품절 처리
//           if (godoMallCategoryCode.length === 8) {
//               // ✅ 스마트스토어 품절 처리
//               const auth = {
//                 smartStoreID: partnerKey,
//                 smartStoreSecret: apiKey,
//               };

//               const siteUrls = {
//                 Dior : siteUrl,
//               }
//               await this.smartstoreApiService.deleteUnsoldSmartstoreProducts(auth,siteUrls, partnerKey, apiKey, "Dior");
//           } else {
//               // ✅ 고도몰 품절 처리
//               await this.handleUnsoldProducts(siteUrl, partnerKey, apiKey, customId, accountPlatform);
//               await this.godoMallService.finalizeXmlDeletion(); // 추가된 호출
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
          
              console.log(`디올 품절 처리 완료: ${product.title} (styleId: ${product.styleId})`);
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
          await this.smartstoreApiService.updateSmartStoreProduct(
            product,
            smartstoreAuth,
            partnerKey,
            undefined,
            godoMallCategoryName,
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
      
//       async getProductUpdate(visitUrl: string, goodsNo: string, customId: string, accountPlatform: string){
// const account = await this.hostingAccountRepository.findOne({
//   where: {
//     customId,
//     accountPlatform,
//   },
// });

// if (!account) {
//   console.error(`❌ 계정 없음: ${customId} / ${accountPlatform}`);
//   return;
// }

// const partnerKey = account.partnerKey;
// const apiKey = account.apiKey;
//         let browser: Browser | null = null;
//         let page: Page | null = null;

//         const proxyLines = await this.r2Service.loadBrightProxies2();
//         if (!proxyLines.length) {
//             console.warn('프록시 없음, 종료');
//             return;
//         }

//         // 랜덤으로 1개 선택
//         const raw = proxyLines[Math.floor(Math.random() * proxyLines.length)];
//         const proxy = parseAuthProxy(raw);

//         const partnerKey = account.partnerKey;
// const apiKey = account.apiKey;
//           where: {
//     goodsno: Number(goodsNo),
//     customId,
//     accountPlatform,
//   },
//         });
//         if (!product) return;

//         try {
//         const proxyArg = `--proxy-server=http://${proxy.host}:${proxy.port}`; // protocol 포함
//         browser = await puppeteer.launch({
//           headless: false,
//           args: [
//             proxyArg,
//             '--disable-blink-features',
//             '--disable-blink-features=AutomationControlled',
//             '--disable-infobars',
//             '--no-default-browser-check',
//             '--no-first-run',
//             '--log-level=0',
//             '--disable-dev-shm-usage',
//             '--no-sandbox',
//             '--disable-setuid-sandbox',
//             '--remote-debugging-port=0',
//             '--disable-background-timer-throttling',
//             '--disable-backgrounding-occluded-windows',
//             '--disable-renderer-backgrounding',
//             '--disable-session-crashed-bubble',
//             '--disable-accelerated-2d-canvas',
//             '--noerrdialogs',
//             '--window-position=-9999,0',
//             "--window-size=300,300",
//           ],
//         });

//         page = await browser.newPage();
//         await page.authenticate({
//           username: proxy.username,
//           password: proxy.password,
//         }); 
//         await page.setUserAgent(
//             'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36'
//         );
//         await page.evaluateOnNewDocument(() => {
//           Object.defineProperty(navigator, 'webdriver', { get: () => false });
//           Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
//           Object.defineProperty(navigator, 'languages', { get: () => ['fr-FR', 'fr'] });
//           Object.defineProperty(navigator, 'deviceMemory', { get: () => 8 });
//           Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 4 });
//           (window as any).chrome = {
//             runtime: {},
//           };

//           // WebGL 우회
//           const getParameter = WebGLRenderingContext.prototype.getParameter;
//           WebGLRenderingContext.prototype.getParameter = function(parameter) {
//             if (parameter === 37445) return 'Intel Inc.'; // UNMASKED_VENDOR_WEBGL
//             if (parameter === 37446) return 'Intel Iris OpenGL Engine'; // UNMASKED_RENDERER_WEBGL
//             return getParameter(parameter);
//           };

//           // Function.prototype.toString 우회
//           const originalFunctionToString = Function.prototype.toString;
//           Function.prototype.toString = function() {
//             if (this === window.Function || this instanceof Function) {
//               return 'function Function() { [native code] }';
//             }
//             return originalFunctionToString.call(this);
//           };
//         });

//         await page.setExtraHTTPHeaders({
//           'Accept-Language': 'fr-FR,fr;q=0.9',
//           'Referer': 'https://www.dior.com/fr_fr/fashion',
//           'Origin': 'https://www.dior.com',
//           'Sec-CH-UA': '"Chromium";v="145", "Google Chrome";v="145", "Not:A-Brand";v="8"',
//           'Sec-CH-UA-Mobile': '?0',
//           'Sec-CH-UA-Platform': '"Windows"',
//         });
//         await page.setViewport({ width: 1920, height: 1080 });

//         await page.goto(visitUrl, {waitUntil: 'domcontentloaded', timeout: 30000})

//         let productDetails = await page.evaluate(async () => {
//           const priceElement = document.querySelector('span.price-line');
//           let price = 0;

//           if (priceElement) {
//             const rawText = priceElement.textContent?.trim() || ''; // "2 700,00 €" 같은 값
//             let cleaned = rawText.replace(/\s/g, '')        // 공백 제거 → "2700,00€"
//                                 .replace('€', '')          // 유로 제거 → "2700,00"
//                                 .replace(/\./g, '')        // 천 단위 점 제거
//                                 .replace(/\u202f/g, '');   // 특수 공백 제거

//             // 소수점 처리: 쉼표 앞부분만 취함 → "2700"
//             cleaned = cleaned.split(',')[0];

//             price = parseInt(cleaned, 10) || 0;
//           }

//           let size = '';
//           // 콤보박스(Select) 요소 찾기
//           const comboDiv = document.querySelector<HTMLElement>('#product-sizes [role="combobox"]');
//           if (!comboDiv) {
//           // 1) 콤보박스 자체가 없으면, '원사이즈'
//           size = '원사이즈';
//           } else {
//           // 2) 콤보박스가 있으면, 스페이스 키 이벤트로 드롭다운 열기
//           comboDiv.focus();
//           const spaceEvent = new KeyboardEvent('keydown', {
//               key: ' ',
//               code: 'Space',
//               keyCode: 32,
//               which: 32,
//               bubbles: true,
//               cancelable: true,
//           });
//           comboDiv.dispatchEvent(spaceEvent);
//           await new Promise((resolve) => setTimeout(resolve, 2000));
//           // 사이즈 목록 가져오기
//           const sizeSpan = document.querySelectorAll('[role="listbox"] span.MuiBox-root.mui-latin-0');

//           // 사이즈 목록이 비어 있으면 → 스킵(null 반환)
//           if (sizeSpan.length === 0) {
//               console.log("⚠️ 모든 사이즈가 품절입니다. 다음 상품으로 이동합니다.");
//               return null; // 🚀 상품 수집 건너뛰기
//           } else {
//               // Array.from(...)으로 NodeList → 배열 변환 후, textContent를 쉼표로 연결
//               size = Array.from(sizeSpan)
//               .map(el => el.textContent?.trim() || '')
//               .filter(Boolean)  // 빈 값 제거
//               .join(', ');
//           }
//           }

//           const soldOut = !price || !size || size.length === 0; // ✅ 둘 중 하나라도 없으면 품절
//           return { price, size ,soldOut};
//         });

//         if (!productDetails) {
//           productDetails = {
//             price: 0,
//             size: '',
//             soldOut: true,
//           };
//         }
//         if (!productDetails.soldOut) {
//           // ✅ 정상일 때만 DB 업데이트
//           product.lastModifiedDate = new Date();
//           product.price = productDetails.price;
//           product.size = productDetails.size;
//           await this.productRepository.save(product);
//         }

//         // ✅ 1️⃣ XML 생성 및 R2 업로드
//         const xmlUrl = await this.r2Service.uploadXmlToR2Update(
//           product,
//           product.styleId,
//           partnerKey,
//           productDetails.soldOut
//         );

//         // ✅ 업로드 실패 시 안전하게 중단
//         if (!xmlUrl) {
//           console.error(`❌ XML 업로드 실패 → ${product.designer} ${product.title}`);
//           return;
//         }

//         // ✅ 2️⃣ 고도몰로 상품 등록/수정 API 호출
        
//         await this.godoMallService.registerProductWithXmlUrl(
//           partnerKey,
//           apiKey,
//           xmlUrl,
//           product,
//           product.styleId
//         );

//         // ✅ WebSocket으로 고도몰에 알림 전송
//         this.gateway.sendProductUpdate(
//   `${customId}:${accountPlatform}:${goodsNo}`,
//   {
//           status: 'success',
//           price: product.price,
//           size: product.size,
//           updatedAt: new Date().toISOString(),
//         });

//         // ✅ 3️⃣ 고도몰 반영 후 XML 바로 삭제
//         await this.godoMallService.deleteUpdateXml(xmlUrl);

//         console.log(`✅ ${product.designer} 상품 업데이트 완료`);

//       } catch (err: any) {
//         console.warn(`🚨 Dior 업데이트 실패: ${err.message}`);
//         if (page && !page.isClosed()) await page.close();
//         if (browser) await browser.close();
//       } finally {
//         if (page && !page.isClosed()) await page.close();
//         if (browser) await browser.close();
//       }
//     }

  // Dior 사이트 크롤링 시작
//   async getProductsFromCategory(siteUrl: string, partnerKey: string,apiKey: string, customId:string, accountPlatform:string, godoMallCategoryCode: string): Promise<void> {
    // const account = await this.hostingAccountRepository.findOne({
    //   where: { customId, accountPlatform },
    // });
//     const serviceType = 'Dior';

//     let browser: Browser | null = null;
//     let page: Page | null = null;
//     let productUrls: string[] = [];
//     let designerFromNode = '';

//     const category = await this.mappingRepository.findOne({
//       where: { customId: customId, accountPlatform: accountPlatform, siteUrl: siteUrl },
//     });

//     let portIndex = 0;

//     try {
//       ({ browser, page } = await connectSilkChrome(PORT_POOL[portIndex]));

//       console.log('✅ 실크롬 attach 완료');


//       const MAX_RETRY = 20; // 최대 재시도 횟수
//       let retryAttempts = 0;

//       while (retryAttempts < MAX_RETRY) {
//         try {
//             let response;

//             try {
//               response = await page.goto(siteUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
//               const kidsKeywords = [
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
//               ];

//               // URL 소문자 기준으로 검사
//               const urlLower = siteUrl.toLowerCase();

//               const isKids = kidsKeywords.some(keyword =>
//                 urlLower.includes(keyword.toLowerCase())
//               );

//               designerFromNode = isKids
//               ? '디올 키즈'
//               : '디올';
//             } catch (gotoError: any) {

//               console.warn(`⚠️ page.goto 실패 (${gotoError.message}) → 재시도 진행`);
//               retryAttempts++;

//               // ✅ 최대 재시도 초과 시 종료
//               if (retryAttempts >= MAX_RETRY) {
//                 console.error(`❌ 최대 재시도 횟수 초과: ${siteUrl}`);
//                 return;
//               }


//               portIndex = (portIndex + 1) % PORT_POOL.length;
//               const nextPort = PORT_POOL[portIndex];

//               ({ browser, page } = await connectSilkChrome(nextPort));

//                 // ✅ 세션 정리 대기 (중요)
//                 await new Promise((r) => setTimeout(r, 3000));

//                 continue; // ✅ while 루프 다시 시도 (goto 재시도)
//               }

//             await new Promise((resolve) => setTimeout(resolve, 2000));

//             const status = response?.status() ?? 0;

//             if (status === 403 || status === 0) {
//               throw new Error(`403 또는 차단 응답 감지됨`);
//             }

//             const html = await page.content();
            
            
//             // ✅ Dior 차단 감지
//             if (/Page unavailable|Reference ID:|Access Denied|Akamai|Forbidden/i.test(html)) {
//               throw new Error("❌ Dior 차단 페이지 감지 (HTML 패턴 매칭)");
//             }

//             // ✅ Chrome 에러 페이지 감지 (사이트 연결 불가)
//             if (/ERR_TIMED_OUT|사이트에 연결할 수 없음|This site can’t be reached/i.test(html)) {
//               throw new Error("❌ Chrome 오류 페이지 감지 (네트워크 연결 실패)");
//             }

//             // 🚨 Dior "Page unavailable" 차단 페이지 감지
//             const isUnavailable = await page.evaluate(() => {
//               const h1 = document.querySelector("h1")?.textContent?.trim();
//               const bodyText = document.body.innerText;
//               return (
//                 h1 === "Page unavailable" ||
//                 bodyText.includes("Reference ID:") ||
//                 bodyText.includes("Your IP:") ||
//                 bodyText.includes("Date/Time:") ||
//                 bodyText.includes("사이트에 연결할 수 없음") ||   // ✅ 한국어 메시지 추가
//                 bodyText.includes("ERR_TIMED_OUT")                // ✅ 에러코드 직접 매칭
//               );
//             });

//             if (isUnavailable) {
//               throw new Error("❌ Dior 차단/네트워크 오류 페이지 감지 (Page unavailable / ERR_TIMED_OUT)");
//             }
            

//             //국가 설정 “X” 버튼 클릭
//             try {
//               await page.waitForSelector('[aria-label="Fermer la modale de géolocalisation"]', {visible: true,timeout: 7000});
//               const contryCloseButton = await page.$('[aria-label="Fermer la modale de géolocalisation"]');
//               if (contryCloseButton) {
//                 await contryCloseButton.click();
//                 await this.waitRandom();
//               }
//             } catch (error: any) {
//               console.log("국가설정 없음");
//             }

//             await this.scrollUntilFullyLoaded(page);
//             break; // 성공하면 반복 종료
//         } catch (error: any) {
//             console.warn(`⚠️ 페이지 이동 실패 (시도 ${retryAttempts + 1}/${MAX_RETRY}): ${error.message}`);
//             //logErrorToDesktop(error, `2.오류 발생`);

//             retryAttempts++;

//             if (retryAttempts >= MAX_RETRY) {
//                 console.error(`❌ 최대 재시도 횟수 초과: ${siteUrl}`);
//                 return; // 최대 재시도 횟수를 초과하면 함수 종료
//             }

//             portIndex = (portIndex + 1) % PORT_POOL.length;
//             const nextPort = PORT_POOL[portIndex];

//             ({ browser, page } = await connectSilkChrome(nextPort));

          
//           const waitTime = Math.min(1000 * 2 ** retryAttempts, 5000); // 최대 10초 대기
//           await new Promise((resolve) => setTimeout(resolve, waitTime));
//         }
//     }

//     while (true) {
//         try {
//             // 현재 페이지에서 상품 URL 및 차단 여부 평가
//             const { currentPageProductUrls, isBlocked, hasMoreButton} = await page.evaluate(() => {
//                     const productUrls = Array.from(document.querySelectorAll('span[data-testid="product-title"]'))
//                     .map(span => {
//                       const link = span.closest('a.product-card__link[href]');
//                       return link ? (link as HTMLAnchorElement).href : null;
//                     })
//                     .filter((url): url is string => !!url);

            

//             const bodyText = document.querySelector('body')?.textContent || '';

//             const isBlocked =
//                 document.querySelector('body') === null &&
//                 (bodyText.includes('Access Denied') ||
//                     bodyText.includes('Too Many Requests') ||
//                     bodyText.includes('429') ||
//                     bodyText.includes('Enforced timeout') ||
//                     bodyText.includes('net::ERR_TIMED_OUT'));
            
//             const moreButton = Array.from(document.querySelectorAll('[aria-label]')).find(el => el.getAttribute('aria-label').includes('View More'));
//             const hasMoreButton = moreButton !== undefined;

//           return { currentPageProductUrls: productUrls, isBlocked, hasMoreButton};
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
//         await page.goto(siteUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
//         continue;
//       }

//       if (currentPageProductUrls.length === 0) {
//           console.log("더 이상 상품이 없습니다. 반복문을 종료합니다.");
//           break;
//       }

//       // 더보기 버튼 클릭
//       if (hasMoreButton) {
//         console.log("더보기 버튼이 감지되었습니다. 클릭 후 대기합니다.");
//         await page.evaluate(() => {
//             const moreButton = Array.from(document.querySelectorAll('[aria-label]'))
//                 .find(el => el.getAttribute('aria-label')?.includes('View More'));
            
//                 (moreButton as HTMLElement).click();
//         });
//         await new Promise((resolve) => setTimeout(resolve, 5000)); // UI 업데이트를 기다림
//         await this.scrollUntilFullyLoaded(page);
//         } else {
//           productUrls = Array.from(new Set(productUrls.concat(currentPageProductUrls)));
//         break;
//        }
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
//     console.log(`디올 최종 수집된 상품 URL 수: ${productUrls.length} - ${category?.categoryName || '카테고리 없음'}`);

//     for (const [index, productUrl] of productUrls.entries()) {
//       let loadAttempts = 0;
//       let success = false;
//       await this.waitRandom();

//       while (loadAttempts < 10) {
//         try {
//             const response = await page.goto(productUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
//             await page.waitForSelector(
//               'span.price-line', {
//                 visible: true,
//                 timeout: 7000
//             });


//             const status2 = response?.status() ?? 0;

//             if (status2 === 403 || status2 === 0) {
//               throw new Error(`403 또는 차단 응답 감지됨2`);
//             }

//             const html = await page.content();
//             if (/Page unavailable|Reference ID:|Access Denied|Akamai|Forbidden/i.test(html)) {
//               throw new Error("❌ Dior 차단 페이지 감지 (HTML 패턴 매칭)");
//             }

//             // 🚨 Dior "Page unavailable" 차단 페이지 감지
//             const isUnavailable = await page.evaluate(() => {
//               const h1 = document.querySelector("h1")?.textContent?.trim();
//               const bodyText = document.body.innerText;
//               return (
//                 h1 === "Page unavailable" ||
//                 bodyText.includes("Reference ID:") ||
//                 bodyText.includes("Your IP:") ||
//                 bodyText.includes("Date/Time:")
//               );
//             });

//             if (isUnavailable) {
//               throw new Error("❌ Dior 차단 페이지 감지 (Page unavailable)");
//             }

//             const status = response?.status() ?? 0;


//             // 1. HTTP status 체크
//             if (status === 403 || status === 0) {
//                 throw new Error(`403 또는 차단 응답 감지됨`);
//             }

//             // 2. HTML 내용 차단 패턴 체크
//             const bodyText = await page.evaluate(() => document.body.innerText || '');
//             if (
//                 bodyText.includes('Access Denied') ||
//                 bodyText.includes('Forbidden') ||
//                 bodyText.includes('Captcha') ||
//                 bodyText.includes('temporarily unavailable')
//             ) {
//                 throw new Error(`페이지 내용에서 차단 패턴 감지됨`);
//             }
            
//             console.log(`✅ (${index + 1}/${productUrls.length}) 디올 ${category?.categoryName || '카테고리 없음'}  수집 중`);

//             // 쿠키 거부 버튼 클릭
//             try {
//               await page.waitForSelector('#onetrust-reject-all-handler', {visible: true,timeout: 7000});
//               const popinCloseButton = await page.$('#onetrust-reject-all-handler');
//               if (popinCloseButton) {
//                 await popinCloseButton.click();
//                 await this.waitRandom();
//                }
//             } catch (error: any) {
//               console.log("디올 쿠키 없음");
//             }

//             // 국가 설정 “X” 버튼 클릭
//             try {
//               await page.waitForSelector('[aria-label="Fermer la modale de géolocalisation"]', {visible: true,timeout: 2000});
//               const contryCloseButton = await page.$('[aria-label="Fermer la modale de géolocalisation"]');
//               if (contryCloseButton) {
//                 await contryCloseButton.click();
//                 await this.waitRandom();
//                 }
//               } catch (error: any) {
//                 console.log("디올 국가설정 없음");
//               }

//             await this.autoScroll(page);
//             await new Promise((resolve) => setTimeout(resolve, 3000));
//             success = true;
//             break; // 로딩 성공 시 루프 종료
//           } catch (error: any) {
//               loadAttempts++;
//               console.warn(`페이지 로드 실패 (프록시 변경 ${loadAttempts}/10): ${error.message}`);
//               //logErrorToDesktop(error, `5.오류 발생`);
//               if (loadAttempts < 10) {

//                 portIndex = (portIndex + 1) % PORT_POOL.length;
//                 const nextPort = PORT_POOL[portIndex];

//                 ({ browser, page } = await connectSilkChrome(nextPort));

//           await this.waitRandom();

//           continue;
//               } else {
//                   console.error('최대 로드 시도 초과 - 다음 URL로 이동합니다.');
//                   //logErrorToDesktop(error, `7.오류 발생`);
//                   break;
//               }
//           }
//       }

//       if (!success) {
//         console.warn(`(${index+1}) 페이지 로드가 실패해서 evaluate 스킵`);
//         continue;   // 다음 URL로
//       }
      
//     const productDetails = await page.evaluate(async (designerFromNode) => {
//       const detailsButton = document.querySelector('div.MuiBox-root.mui-latin-k008qs button');
//       if (detailsButton) {
//         (detailsButton as HTMLElement).click();
//       }

//       // ✅ 제품 설명
//       let mainInfo = '';
//       let madeIn = '';

//       // 1) 멀티라인 디스크립션 가져오기
//       const descriptionDiv = document.querySelector('div.multiline-text.ProductDescriptionTab_description__SpNxN');
//       if (descriptionDiv) {
//       mainInfo += descriptionDiv.textContent?.trim() + '\n';
//       }

//       // 2) 목록(li) 텍스트 전부 가져오기
//       const listItems = document.querySelectorAll('ul.MuiList-root.MuiList-padding.DS-List-m.mui-latin-1yuy9bz li.MuiListItem-root.MuiListItem-padding.mui-latin-7msrqz');
//       if (listItems.length > 0) {
//       const itemTexts = Array.from(listItems).map(li => li.textContent?.trim());
//       mainInfo += itemTexts.join('\n');
//       }

//       // ✅ madeIn 추출 (정규식으로 Fabriqué 또는 Fabriquée 처리)
//       const madeInElement = Array.from(document.querySelectorAll('p.MuiTypography-root.MuiTypography-body-s.DS-Typography.mui-latin-gyjrk5'))
//       .find(el => el.textContent.includes('Fabriqu'));

//       if (madeInElement) {
//         const parts = madeInElement.textContent.split(/Fabriqu[eé]e? en /);
//         if (parts.length > 1 && parts[1]) {
//           madeIn = parts[1].trim();
//         }
//       }

//       // 3) 특정 문구 제거
//       const filterPhrase = "Pour plus d'informations, merci de consulter le guide des tailles";
//       mainInfo = mainInfo.replace(filterPhrase, '').trim();

//       // ✅ 스타일 ID (SKU 코드 추출)
//       const fullText = document.querySelector('p[data-end-to-end="fashion-product-reference"]')?.textContent || '';
//       const styleId = fullText.replace('Référence: ', '').trim();        
//       const brandstyleId = styleId;

//       const site = 'Dior';
//       const designer = designerFromNode;
//       const titleElement = document.querySelector('[data-testid="fashion-product-title"]');
//       const title = titleElement ? titleElement.textContent?.trim() || '' : '';
//       const priceElement = document.querySelector('span.price-line');
//       let price = 0;

//       if (priceElement) {
//         const rawText = priceElement.textContent?.trim() || ''; // "2 700,00 €" 같은 값
//         let cleaned = rawText.replace(/\s/g, '')        // 공백 제거 → "2700,00€"
//                             .replace('€', '')          // 유로 제거 → "2700,00"
//                             .replace(/\./g, '')        // 천 단위 점 제거
//                             .replace(/\u202f/g, '');   // 특수 공백 제거

//         // 소수점 처리: 쉼표 앞부분만 취함 → "2700"
//         cleaned = cleaned.split(',')[0];

//         price = parseInt(cleaned, 10) || 0;
//       }
      
//       const colorText = document.querySelector('h2.MuiTypography-root.MuiTypography-body-s.DS-Typography.mui-latin-1lx4awc')?.textContent || '';
//       const color = colorText.trim();
      
//       // 🔥 이미지 수집 (디올 CDN만 필터)
//       const imageElements = document.querySelectorAll(
//         'ul.MuiGrid-root.MuiGrid-container.MuiGrid-spacing-xs-0\\.25.mui-latin-1huz2td img'
//       );

//       let imageUrls = Array.from(imageElements)
//         .filter(img => (img as HTMLImageElement).naturalWidth > 0)
//         .map(img => (img as HTMLImageElement).currentSrc || (img as HTMLImageElement).src)
//         .filter(url => url && url.includes('/is/image/'));

//       // 🔥 imageUrls 자체를 중복 제거 결과로 덮어쓰기
//       imageUrls = [...new Set(imageUrls)];

//       // await new Promise((resolve) => setTimeout(resolve, 2000));

//       let size = '';
//       // 콤보박스(Select) 요소 찾기
//       const comboDiv = document.querySelector<HTMLElement>('#product-sizes [role="combobox"]');
//       if (!comboDiv) {
//       // 1) 콤보박스 자체가 없으면, '원사이즈'
//       size = '원사이즈';
//       } else {
//       // 2) 콤보박스가 있으면, 스페이스 키 이벤트로 드롭다운 열기
//       comboDiv.focus();
//       const spaceEvent = new KeyboardEvent('keydown', {
//           key: ' ',
//           code: 'Space',
//           keyCode: 32,
//           which: 32,
//           bubbles: true,
//           cancelable: true,
//       });
//       comboDiv.dispatchEvent(spaceEvent);
//       // 사이즈 목록 가져오기
//       const sizeSpan = document.querySelectorAll('[role="listbox"] span.MuiBox-root.mui-latin-0');

//       // 사이즈 목록이 비어 있으면 → 스킵(null 반환)
//       if (sizeSpan.length === 0) {
//           console.log("⚠️ 모든 사이즈가 품절입니다. 다음 상품으로 이동합니다.");
//           return null; // 🚀 상품 수집 건너뛰기
//       } else {
//           // Array.from(...)으로 NodeList → 배열 변환 후, textContent를 쉼표로 연결
//           size = Array.from(sizeSpan)
//           .map(el => el.textContent?.trim() || '')
//           .filter(Boolean)  // 빈 값 제거
//           .join(', ');
//       }
//       }

//       return { site, designer, title, price, color, mainInfo, madeIn, styleId, size, brandstyleId, imageUrls };
//     },designerFromNode);

//     if (!productDetails || !productDetails.mainInfo || !productDetails.styleId || !productDetails.title || !productDetails.price || !productDetails.imageUrls.length || !productDetails.size || !productDetails.brandstyleId) {
//       console.warn('디올 데이터 누락 - 다음 productUrl로 이동');
//       continue; // 다음 productUrl로 이동
//     }

    
//     // 카테고리 매핑 데이터 찾기
//     const categoryMapping = await this.mappingRepository.findOne({ where: { siteUrl } });
//     if (!categoryMapping) {
//         throw new Error('매핑된 카테고리를 찾을 수 없습니다.');
//     }

//     try {
//     const existingProduct = await this.productRepository.findOne({ where: {
//       styleId: productDetails.styleId,
//       partnerKey: partnerKey, 
//       apiKey: apiKey
//       }
//     });
    
//     if (existingProduct) {
//       // 이미 존재하는 상품이므로 업데이트를 해야 함
//       console.log(`✅상품 업데이트: ${existingProduct.title} - styleID: ${existingProduct.styleId}`);
//       // 상품 정보를 업데이트 (기존 데이터베이스 업데이트)
//       existingProduct.siteUrl = siteUrl;
//       // // existingProduct.title = productDetails.title;
//       // existingProduct.designer = productDetails.designer;
//       existingProduct.size = productDetails.size;
//       existingProduct.price = productDetails.price;
//       // existingProduct.mainInfo = productDetails.mainInfo;
//       // existingProduct.partnerKey = partnerKey;
//       // existingProduct.apiKey = apiKey;
//       // existingProduct.color = productDetails.color;
//       existingProduct.touched = true;
//       existingProduct.categoryName = category.categoryName;
//       const godoMallCategoryName = category.godoMallCategoryName;
//       existingProduct.visitUrl = productUrl;
//         existingProduct.godoMallCategoryCode = godoMallCategoryCode;



//       // ✅ 상품 카테고리 코드 저장
//       existingProduct.godoMallCategoryCode = godoMallCategoryCode;

//       // ✅ 플랫폼 타입 결정 (8자리면 SMARTSTORE, 그 외엔 GODOMALL)
//       if (godoMallCategoryCode.length === 8) {
//           existingProduct.platform = 'smartstore';
//       } else {
//           existingProduct.platform = 'godomall';
//       }   

//       if (existingProduct.platform === 'smartstore') {
//         // ✅ 스마트스토어 수정
//         const auth = {
//           smartStoreID: partnerKey,
//           smartStoreSecret: apiKey,
//         };
//         await this.smartstoreApiService.updateSmartStoreProduct(existingProduct, auth, partnerKey,undefined,godoMallCategoryName);

//       } else {
//           // ✅ 고도몰 등록
//       const xmlUrl = await this.r2Service.uploadXmlToR2SmartStore(
//           existingProduct.styleId, 
//           existingProduct, 
//           godoMallCategoryCode, 
//           existingProduct.mainImageUrl, 
//           existingProduct.additionalImageUrls, 
//           partnerKey,
//           apiKey
//           );
//           await this.godoMallService.registerProductWithXmlUrl(partnerKey, apiKey, xmlUrl, existingProduct, existingProduct.styleId);
//       }

          
//       // ✅ DB에 저장
//       await this.productRepository.save(existingProduct);



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
//           page,
//           
//           productDetails.imageUrls[0],  // ✅ 이미지 URL을 첫 번째 인자로 전달
//           `${productDetails.styleId}-main.jpg`,  // ✅ 저장할 파일명
//           newProduct,
//           partnerKey,
//       );
//       newProduct.mainImageUrl = r2MainImageUrl; // ✅ R2 URL 저장
      
//       const additionalPromises = productDetails.imageUrls
//           .slice(1)  // index 1 이상부터
//           .map((url, idx) =>
//               this.uploadImageToR2(
//               page,
//               
//               url,
//               `${productDetails.styleId}-additional-${idx + 1}.jpg`,
//               newProduct,
//               partnerKey,
//               )
//           );

//       const additionalR2Urls = await Promise.all(additionalPromises);
//       newProduct.additionalImageUrls = additionalR2Urls; // ✅ 추가 이미지 리스트 저장

//       const allR2Urls = [newProduct.mainImageUrl,...(newProduct.additionalImageUrls || [])];
        
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
//                 Dior : siteUrl,
//               }
//               await this.smartstoreApiService.deleteUnsoldSmartstoreProducts(auth,siteUrls, partnerKey, apiKey, "Dior");
//           } else {
//               // ✅ 고도몰 품절 처리
//               await this.handleUnsoldProducts(siteUrl, partnerKey, apiKey, customId, accountPlatform);
//               await this.godoMallService.finalizeXmlDeletion(); // 추가된 호출
//           }
//       }




  // Bright Data Dior 크롤링 시작
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
    // 1️⃣ 카테고리 HTML 가져오기

    const categorys = await this.mappingRepository.findOne({
      where: { customId: customId, accountPlatform: accountPlatform, siteUrl: siteUrl },
    });

    const categoryHtml = await this.getHtmlFromUrlWithRetry(
      siteUrl,
      3,
      'category',
      ['fashion/products'],
    );
    const $category = cheerio.load(categoryHtml);

    const html = $category.html() || '';

    const productUrlSet = new Set<string>();
    const addProductUrl = (rawHref: string) => {
      const href = (rawHref || '')
        .replace(/\\u002F/g, '/')
        .replace(/\\\//g, '/')
        .replace(/&amp;/g, '&')
        .trim();

      if (!href || !href.includes('/fashion/products/')) return;

      try {
        const url = new URL(href, 'https://www.dior.com');
        url.hash = '';
        url.search = '';
        productUrlSet.add(url.href);
      } catch {
        return;
      }
    };

    [
      ...html.matchAll(/"productLink"\s*:\s*\{\s*"uri"\s*:\s*"([^"]+)"/g),
      ...html.matchAll(/\\"productLink\\"\s*:\s*\{\s*\\"uri\\"\s*:\s*\\"([^"]+)\\"/g),
    ].forEach(match => addProductUrl(match[1]));

    $category('a[href*="/fashion/products/"]').each((_, element) => {
      addProductUrl($category(element).attr('href') || '');
    });

    const productUrls = [...productUrlSet];

    console.log(`디올 최종 수집된 상품 URL 수: ${productUrls.length} - ${categorys?.categoryName || '카테고리 없음'}`);

    if (!productUrls.length) {
      throw new Error('상품 URL을 수집하지 못했습니다.');
    }

    const categoryMapping = await this.mappingRepository.findOne({
      where: { siteUrl },
    });

    if (!categoryMapping) {
      throw new Error('매핑된 카테고리를 찾을 수 없습니다.');
    }

    const category = categoryMapping;
    const godoMallCategoryName = category.godoMallCategoryName;

    const chunkSize = 15;

    for (let i = 0; i < productUrls.length; i += chunkSize) {

      const chunk = productUrls.slice(i, i + chunkSize);

      await Promise.all(
        chunk.map(async (productUrl,idx) => {

          const globalIndex = i + idx;

          console.log(
            `✅ (${globalIndex + 1}/${productUrls.length}) 디올 ${category?.categoryName || '카테고리 없음'} 수집 중`
          );

          try {

            // 2️⃣ 상품 HTML 가져오기

            const productHtml =
              await this.getHtmlFromUrlWithRetry(productUrl, 3, 'product');

            const $ = cheerio.load(productHtml);

            // 3️⃣ 상품 상세 파싱 (여기 그대로 유지)

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


            const site = 'Dior';
            const designer = isKids ? '디올 키즈' : '디올';

            let nextData: any = null;

            const nextDataRaw = $('#__NEXT_DATA__').html();

            if (nextDataRaw) {
              try {
                nextData = JSON.parse(nextDataRaw);
              } catch {
                nextData = null;
              }
            }

            const product = nextData?.props?.pageProps?.product;

            const title =
              product?.title ||
              $('[data-testid="fashion-product-title"]').text().trim();

            const rawPrice = $('span.price-line').text().trim();

            const domPrice = parseInt(
              rawPrice
                .replace(/\s/g, '')
                .replace('€', '')
                .replace(/\./g, '')
                .split(',')[0] || '0',
              10
            );

            const price = Number(product?.price?.value) || domPrice || 0;

            const styleId =
              product?.code ||
              product?.sku?.replace(/_TU$/, '') ||
              $('p[data-end-to-end="fashion-product-reference"]')
                .text()
                .replace(/Référence\s*:\s*/i, '')
                .trim() || '';

            const brandstyleId = styleId;

            const color =
              $('h2.MuiTypography-root').first().text().trim() || '';

            let size = '';
            let soldOut = false;

            $('script[type="application/ld+json"]').each((_, el) => {
              try {
                const json = JSON.parse($(el).html() || '');

                if (json?.['@type'] === 'Product' && Array.isArray(json.offers)) {

                  const availableSizes = json.offers
                    .filter((offer: any) =>
                      offer.availability?.includes('InStock')
                    )
                    .map((offer: any) => {
                      const sku: string = offer.sku || '';

                      const parts = sku.split('_');
                      let s = parts[parts.length - 1] || '';

                      s = s.replace(/^T|T$/g, '');

                      if (s === 'U') return '원사이즈';

                      return s;
                    })
                    .filter(Boolean);

                  if (availableSizes.length === 0) {
                    soldOut = true;
                    size = '';
                  } else {
                    size = [...new Set(availableSizes)].join(', ');
                  }
                }

              } catch {}
            });

            let mainInfo = '';
            let madeIn = '';

            if (product?.description) {
              mainInfo += product.description + '\n';
            }

            if (Array.isArray(product?.characteristics)) {
              for (const text of product.characteristics) {
                if (!text) continue;

                mainInfo += text + '\n';

                if (/Fabriqu/i.test(text)) {
                  const match = text.match(
                    /Fabriqu[eé]e?\s+en\s+([A-Za-zÀ-ÿ\-]+)/i
                  );

                  if (match) {
                    madeIn = match[1].trim();
                  }
                }
              }
            } else {
              $('[role="tabpanel"] li').each((_, el) => {

              const text = $(el).text().trim();

              if (!text) return;

              mainInfo += text + '\n';

              // madeIn
              if (/Fabriqu/i.test(text)) {

                const match = text.match(
                  /Fabriqu[eé]e?\s+en\s+([A-Za-zÀ-ÿ\-]+)/i
                );

                if (match) {
                  madeIn = match[1].trim();
                }
              }

              });
            }

            if (product?.sizeAndFit) {
              const lines = product.sizeAndFit.split('\n');
              for (const line of lines) {
                if (/Pour plus d'informations/i.test(line)) break;
                mainInfo += line.trim() + '\n';
              }
            }

            mainInfo = mainInfo.trim();

            const imageUrls = new Set<string>();

            const gallery = $('[data-testid="media-gallery"]').first();

            gallery.find('img').each((_, el) => {
              const src = $(el).attr('src');
              if (!src) return;

              const clean = src.replace(/&amp;/g, '&');

              if (
                clean.includes('assets.christiandior.com') &&
                clean.includes('/is/image/diorprod/') &&
                !clean.includes('/LOOK_')
              ) {
                imageUrls.add(clean);
              }
            });

            gallery.find('noscript').each((_, el) => {
              const html = $(el).html();
              if (!html) return;

              const $noscript = cheerio.load(html);

              $noscript('img').each((_, img) => {
                const src = $noscript(img).attr('src');
                if (!src) return;

                const clean = src.replace(/&amp;/g, '&');

                if (
                  clean.includes('assets.christiandior.com') &&
                  clean.includes('/is/image/diorprod/') &&
                  !clean.includes('/LOOK_')
                ) {
                  imageUrls.add(clean);
                }
              });
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

            

            /* =====================================================
              4️⃣ 데이터 유효성 체크
            ===================================================== */

            if (productDetails.soldOut) {
              console.warn(`⚠️ 디올 품절상품 감지`);
              return;  // 다음 productUrl로 이동
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

              console.warn('⚠️ 디올 데이터 누락 감지');

              // console.log('----- 수집된 데이터 전체 -----');
              // console.dir(productDetails, { depth: null });
              // console.log('--------------------------------');

              return;  // 다음 productUrl로 이동
            }

          

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
