import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
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
import { Page, Browser } from 'puppeteer';
import puppeteer from 'puppeteer-extra';
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
import { UpdateGateway } from 'src/update/update.gateway';
import { UserService } from 'src/user/user.service';



const PORT_POOL = [9226, 9236, 9246, 9256, 9266, 9276, 9286, 9296];

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

function loadProxies(): string[] {
    const filePath = '\\\\CHANMIN\\Desktop\\CleanIP(유료프록시).txt';
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    return fileContent.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  }

function getRandomProxy(proxies: string[]): string {
  const randomIndex = Math.floor(Math.random() * proxies.length);
  return proxies[randomIndex];
}

interface LoropianaCookie {
  name: string;
  value: string;
  domain: string;
  path: string;
  expires?: number;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'Strict' | 'Lax' | 'None';
}
// 에러 로그 저장 경로
// const errorLogDir = path.join(
//   '\\\\CHANMIN\\Desktop\\크롤링\\에러로그',
//   'loropiana'
// );

// // 폴더 없으면 생성
// if (!fs.existsSync(errorLogDir)) {
//   fs.mkdirSync(errorLogDir, { recursive: true });
// }

// // 최종 로그 파일 경로
// const errorLogPath = path.join(errorLogDir, 'loropiana_error_log.txt');

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
export class LoropianaService {
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




// // 1. 카테고리 가져오기 (프록시 교체 및 재시도 로직 추가)
// async getCategories(siteUrls: string[]): Promise<{ categoryName: string; url: string }[]> {
//     const allCategories: { categoryName: string; url: string }[] = [];
//     const proxyLines = await this.r2Service.loadBrightProxies2();
//       if (!proxyLines.length) {
//           console.warn('프록시 없음, 종료');
//           return;
//       }

//     // 랜덤으로 1개 선택
//     const raw = proxyLines[Math.floor(Math.random() * proxyLines.length)];
//     const proxy = parseAuthProxy(raw);
//     const proxyArg = `--proxy-server=http://${proxy.host}:${proxy.port}`;
  
//     for (const siteUrl of siteUrls) {
//       let retryCount = 0;
//       let success = false;
  
//       while (retryCount < 3 && !success) {

  
//         const browser = await puppeteer.launch({
//           headless: true,
//           args: [
//             proxyArg,
//             '--remote-debugging-port=0',
//             '--disable-http2',
//             '--no-sandbox',
//             '--disable-setuid-sandbox',
//             '--disable-dev-shm-usage',
//             '--disable-background-timer-throttling',
//             '--disable-backgrounding-occluded-windows',
//             '--disable-renderer-backgrounding',
//             '--disable-session-crashed-bubble',
//             '--no-first-run',
//             '--disable-accelerated-2d-canvas',
//             '--noerrdialogs',
//             '--disable-web-security',
//             '--disable-features=IsolateOrigins,site-per-process',
//           ],
//         });
  
//         const page = await browser.newPage();
//         await page.authenticate({
//           username: proxy.username,
//           password: proxy.password,
//         });
//         await page.setUserAgent(
//           'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36'
//         );
//         await page.setViewport({ width: 1920, height: 1080 });
  
//         try {
//           await page.goto(siteUrl, { waitUntil: 'networkidle2', timeout: 30000 });
//           console.log(`🔍 ${siteUrl} 접속 성공, 카테고리 수집 시작`);
  
//           const categoriesWoman = await page.evaluate(() => {
//             const mainId = 'woman_55006';
//             const mainLabel = 'Women';
//             const container = document.querySelector(`li[id="${mainId}"]`);
//             if (!container) return [];
  
//             const results: { categoryName: string; url: string }[] = [];
//             const middleGroups = container.querySelectorAll('li.menu__item.menu__item--has-submenu');
  
//             middleGroups.forEach(group => {
//               const groupId = group.getAttribute('id') || '';
//               if (groupId.includes('by_line') || groupId.includes('highlights')) return;
  
//               const middleButton = group.querySelector('button.menu__item-btn:not([class*="menu__item-btn--"])');
//               if (!middleButton) return;
  
//               const middleCategory = middleButton.textContent.trim();
//               const anchors = group.querySelectorAll('li.menu__item a[href]');
  
//               anchors.forEach(anchor => {
//                 let skip = false;
//                 let currentNode = anchor.parentElement;
//                 while (currentNode && currentNode !== group) {
//                   if (currentNode.matches && currentNode.matches('li.menu__item.menu__item--has-submenu')) {
//                     const idAttr = currentNode.getAttribute('id') || "";
//                     if (idAttr.includes('by_line') || idAttr.includes('highlights')) {
//                       skip = true;
//                       break;
//                     }
//                   }
//                   currentNode = currentNode.parentElement;
//                 }
  
//                 if (skip) return;
//                 const smallCategory = anchor.textContent.trim();
//                 const categoryName = `${mainLabel} - ${middleCategory} - ${smallCategory}`;
//                 results.push({ categoryName, url: (anchor as HTMLAnchorElement).href });
//               });
//             });
  
//             return results;
//           });
  
//           const categoriesMan = await page.evaluate(() => {
//             const mainId = 'man_64736';
//             const mainLabel = 'Men';
//             const container = document.querySelector(`li[id="${mainId}"]`);
//             if (!container) return [];
  
//             const results: { categoryName: string; url: string }[] = [];
//             const middleGroups = container.querySelectorAll('li.menu__item.menu__item--has-submenu');
  
//             middleGroups.forEach(group => {
//               const groupId = group.getAttribute('id') || '';
//               if (groupId.includes('by_line') || groupId.includes('highlights')) return;
  
//               const middleButton = group.querySelector('button.menu__item-btn:not([class*="menu__item-btn--"])');
//               if (!middleButton) return;
  
//               const middleCategory = middleButton.textContent.trim();
//               const anchors = group.querySelectorAll('li.menu__item a[href]');
  
//               anchors.forEach(anchor => {
//                 let skip = false;
//                 let currentNode = anchor.parentElement;
//                 while (currentNode && currentNode !== group) {
//                   if (currentNode.matches && currentNode.matches('li.menu__item.menu__item--has-submenu')) {
//                     const idAttr = currentNode.getAttribute('id') || "";
//                     if (idAttr.includes('by_line') || idAttr.includes('highlights')) {
//                       skip = true;
//                       break;
//                     }
//                   }
//                   currentNode = currentNode.parentElement;
//                 }
  
//                 if (skip) return;
//                 const smallCategory = anchor.textContent.trim();
//                 const categoryName = `${mainLabel} - ${middleCategory} - ${smallCategory}`;
//                 results.push({ categoryName, url: (anchor as HTMLAnchorElement).href });
//               });
//             });
  
//             return results;
//           });
  
//           allCategories.push(...categoriesWoman, ...categoriesMan);
//           console.log(`✅ ${siteUrl}에서 수집한 카테고리 총 ${categoriesWoman.length + categoriesMan.length}개`);
  
//           success = true;
//         } catch (error: any) {
//           console.error(`❌ [${siteUrl}] 오류 발생: ${error.message}`);
//           retryCount++;
//           console.warn(`⚠️ [${siteUrl}] 재시도 (${retryCount}/3)...`);
//         } finally {
//           await browser.close();
//         }
//       }
  
//       if (!success) {
//         console.warn(`🚫 [${siteUrl}] 3회 시도 후 실패. 건너뜀.`);
//       }
  
//       console.log(`🔄 다음 URL로 이동...`);
//     }
  
//     console.log(`🎯 모든 사이트에서 카테고리 수집 완료!`);
//     return allCategories;
//   }
  
  // 1. 카테고리 가져오기 (프록시 교체 및 재시도 로직 추가)
  async getCategories(siteUrls: string[]): Promise<{ categoryName: string; url: string }[]> {
    const allCategories: { categoryName: string; url: string }[] = [];
    const seenUrls = new Set<string>();

    const normalize = (str: string) =>
      str.replace(/\s+/g, ' ').trim();

    for (const siteUrl of siteUrls) {
      try {
        const html = await this.r2Service.getHtmlFromUrl2(siteUrl);
        const $ = cheerio.load(html);

        $('a[href]').each((_, el) => {
          const href = $(el).attr('href');
          if (!href) return;

          let absoluteUrl: string;

          try {
            absoluteUrl = new URL(href, siteUrl).toString().split('?')[0];
          } catch {
            return;
          }

          // =========================
          // 🔥 필터
          // =========================

          // ❌ 쓰레기 제거
          if (
            absoluteUrl.includes('/cm/') ||
            absoluteUrl.includes('/stories') ||
            absoluteUrl.includes('/gift') ||
            absoluteUrl.includes('/spring-summer') ||
            absoluteUrl.includes('icon=') ||
            absoluteUrl.includes('/lp-')
          ) return;

          const urlObj = new URL(absoluteUrl);
          const parts = urlObj.pathname.split('/').filter(Boolean);

          let gender = '';
          let middle = '';
          let small = '';

          // 🔥 c 위치 찾기 (핵심)
          const cIndex = parts.indexOf('c');
          if (cIndex === -1) return;

          // =========================
          // 🔥 케이스 1: /c/woman/xxx
          // =========================
          if (parts[cIndex + 1] === 'woman' || parts[cIndex + 1] === 'man') {
            gender = parts[cIndex + 1];

            const sub = parts[cIndex + 2] || '';

            if (sub === 'leather-goods' || sub === 'small-leather-goods') {
              middle = 'Bags';
            } else if (sub === 'accessories') {
              middle = 'Accessories';
            } else {
              middle = 'Ready to wear';
            }

            small = parts[cIndex + 3] || parts[cIndex + 2];
          }

          // =========================
          // 🔥 케이스 2: /c/shoes/woman/xxx
          // =========================
          else if (parts[cIndex + 1] === 'shoes') {
            gender = parts[cIndex + 2];
            middle = 'Shoes';
            small = parts[cIndex + 3];
          }

          // =========================
          // 🔥 최종 검증
          // =========================
          if (!gender || !middle || !small) return;

          // 보기 좋게
          const format = (str: string) =>
            str.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

          const categoryName = `${format(gender)} - ${middle} - ${format(small)}`;

          // =========================
          // 🔁 중복 제거
          // =========================
          if (seenUrls.has(absoluteUrl)) return;
          seenUrls.add(absoluteUrl);

          allCategories.push({
            categoryName,
            url: absoluteUrl,
          });
        });

        console.log(`Loro Piana categories collected from ${siteUrl}: ${allCategories.length}`);

      } catch (error: any) {
        console.error(`Loro Piana category fetch failed [${siteUrl}]: ${error.message}`);
      }
    }

    return allCategories;
  }
// private async uploadImageToR2(imageUrl: string, fileName: string, product: Product): Promise<string> {
//   try {
//     if (!imageUrl) {
//       console.error('이미지 URL이 유효하지 않습니다:', imageUrl);
//       throw new Error('유효하지 않은 이미지 URL');
//     }




//     // 이미지 다운로드
//     const response = await axios.get(imageUrl, {
//       responseType: 'arraybuffer',
//       timeout: 30000, // 타임아웃 설정
//       headers: {
//         "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36"
//       }
//     });
//     let imageBuffer = Buffer.from(response.data, 'binary'); // 이미지 데이터를 버퍼로 변환

//     // Sharp를 사용해서 이미지 메타데이터 확인 (형식 판별)
//     const metadata = await sharp(imageBuffer).metadata();
//     if (metadata.format === 'webp' || metadata.format === 'avif') {
//       // JPEG로 변환
//       imageBuffer = await sharp(imageBuffer)
//         .jpeg() // png()를 사용하면 PNG로 변환 가능
//         .toBuffer();
//       // 파일 이름 확장자를 .jpg로 변경 (.webp 또는 .avif 를 .jpg로)
//       fileName = fileName.replace(/\.(webp|avif)$/i, '.jpg');
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

private async uploadImageToR2(imageUrl: string,fileName: string,product: Product): Promise<string> {

  try {

    if (!imageUrl) {
      throw new Error('유효하지 않은 이미지 URL');
    }

    
    const response = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      timeout: 30000,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://de.loropiana.com/',
        'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8'
      }
    });

    let imageBuffer = Buffer.from(response.data);

    // 🔎 디버깅용 (문제 생길 때만 쓰면 됨)
    // console.log('Content-Type:', response.headers['content-type']);

    const metadata = await sharp(imageBuffer).metadata();

    if (
      metadata.format === 'webp' ||
      metadata.format === 'avif' ||
      metadata.format === 'heif'
    ) {
      imageBuffer = await sharp(imageBuffer)
        .jpeg({ quality: 90 })
        .toBuffer();

      fileName = fileName.replace(/\.(webp|avif|heif)$/i, '.jpg');
    }

    const r2ImageUrl = await this.r2Service.uploadImageToR2(
      
      fileName,
      imageBuffer,
      product,
    );

    return r2ImageUrl;

  } catch (error: any) {

    console.error(`🚫 Loropiana 이미지 업로드 실패: ${imageUrl}`);
    console.error(error.message);

    throw error;
  }
}

private async waitRandom(min = 2000, max = 5000): Promise<void> {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  await new Promise(resolve => setTimeout(resolve, delay));
}


  // 자동 스크롤 함수
  private async autoScroll(page: Page) {
    await page.evaluate(async () => {
      let totalHeight = 0;
      const distance = 500;
      await new Promise<void>(resolve => {
        const timer = setInterval(() => {
          window.scrollBy(0, distance);
          totalHeight += distance;
          if (totalHeight >= document.body.scrollHeight) {
            clearInterval(timer);
            resolve();
          }
        }, 50);
      });
    });
  }

  // Loropiana 사이트 크롤링 시작
//   async getProductsFromCategory(siteUrl: string, partnerKey: string,apiKey: string, customId:string, accountPlatform:string, godoMallCategoryCode: string): Promise<void> {
    // const account = await this.hostingAccountRepository.findOne({
    //   where: { customId, accountPlatform },
    // });

    
//     const serviceType = 'Loropiana';
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

//     const userAgents = [
//       'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', // 최신 베타
//     ];


//     const category = await this.mappingRepository.findOne({
//       where: { customId: customId, accountPlatform: accountPlatform, siteUrl: siteUrl },
//   });

//   try {
//     browser = await puppeteer.launch({
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
//       ],
//     });
//     page = await browser.newPage();
//     await page.authenticate({
//       username: proxy.username,
//       password: proxy.password,
//     });


//     await page.setExtraHTTPHeaders({
//       'sec-ch-ua': '"Google Chrome";v="139", "Chromium";v="139", "Not=A?Brand";v="99"',
//       'sec-ch-ua-mobile': '?0',
//       'sec-ch-ua-platform': '"Windows"',
//       'upgrade-insecure-requests': '1',
//       'origin': 'https://de.loropiana.com',
//       'referer': 'https://de.loropiana.com/',
//       'accept-language': 'de-DE,de;q=0.9,en;q=0.8',
//     });



//     const MAX_RETRY = 5; // 최대 재시도 횟수
//     let retryAttempts = 0;

//     while (retryAttempts < MAX_RETRY) {
//         try {
//             await page.goto(siteUrl, { waitUntil: 'networkidle2', timeout: 30000 });
//             await new Promise(resolve => setTimeout(resolve, 2000));
//             // JS 라우터로 이동
//             await page.evaluate((url) => {
//               window.location.href = url;
//             }, siteUrl);

//             // 렌더 대기
//             await page.waitForSelector("ol.ais-InfiniteHits-list", { timeout: 15000 });
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
//               headless: false,
//               args: [
//                 proxyArg,
//                 '--disable-blink-features',
//                 '--disable-blink-features=AutomationControlled',
//                 '--disable-infobars',
//                 '--no-default-browser-check',
//                 '--no-first-run',
//                 '--log-level=0',
//                 '--disable-dev-shm-usage',
//                 '--no-sandbox',
//                 '--disable-setuid-sandbox',
//                 '--remote-debugging-port=0',
//                 '--disable-background-timer-throttling',
//                 '--disable-backgrounding-occluded-windows',
//                 '--disable-renderer-backgrounding',
//                 '--disable-session-crashed-bubble',
//                 '--disable-accelerated-2d-canvas',
//                 '--noerrdialogs',
//               ],
//             });

//             page = await browser.newPage();
//             await page.authenticate({
//               username: proxy.username,
//               password: proxy.password,
//             });

//             // ✅ HTTP 헤더 보강 (fingerprint.json에서 userAgent는 이미 반영됨)
//             await page.setExtraHTTPHeaders({
//               'sec-ch-ua': '"Google Chrome";v="139", "Chromium";v="139", "Not=A?Brand";v="99"',
//               'sec-ch-ua-mobile': '?0',
//               'sec-ch-ua-platform': '"Windows"',
//               'upgrade-insecure-requests': '1',
//               'origin': 'https://de.loropiana.com',
//               'referer': 'https://de.loropiana.com/',
//               'accept-language': 'de-DE,de;q=0.9,en;q=0.8',
//             });

//               await page.setViewport({ width: 1920, height: 1080 });
//           // 다음 재시도를 위한 랜덤 대기 시간 (exponential backoff)
//           const waitTime = Math.min(1000 * 2 ** retryAttempts, 10000); // 최대 10초 대기
//           await new Promise((resolve) => setTimeout(resolve, waitTime));
//         }
//     }

//     while (true) {
//         try {
//             // 현재 페이지에서 상품 URL 및 차단 여부 평가
//             const { isBlocked, hasMoreButton } = await page.evaluate(() => {
//               const bodyText = document.querySelector('body')?.textContent || '';
            
//               const isBlocked =
//                 document.querySelector('body') === null &&
//                 (bodyText.includes('Access Denied') ||
//                   bodyText.includes('Too Many Requests') ||
//                   bodyText.includes('429') ||
//                   bodyText.includes('Enforced timeout') ||
//                   bodyText.includes('net::ERR_TIMED_OUT'));
            
//               const moreButton = document.querySelector('button.ais-InfiniteHits-loadMore.btn.btn-outline-primary.col-12.col-sm-2.my-4.d-block.mx-auto');
//               const hasMoreButton = moreButton !== null;
            
//               return { isBlocked, hasMoreButton };
//             });

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
//           // ✅ fingerprint.json 기반 브라우저 실행
//           browser = await puppeteer.launch({
//             headless: false,
//             args: [
//               proxyArg,
//               '--disable-blink-features',
//               '--disable-blink-features=AutomationControlled',
//               '--disable-infobars',
//               '--no-default-browser-check',
//               '--no-first-run',
//               '--log-level=0',
//               '--disable-dev-shm-usage',
//               '--no-sandbox',
//               '--disable-setuid-sandbox',
//               '--remote-debugging-port=0',
//               '--disable-background-timer-throttling',
//               '--disable-backgrounding-occluded-windows',
//               '--disable-renderer-backgrounding',
//               '--disable-session-crashed-bubble',
//               '--disable-accelerated-2d-canvas',
//               '--noerrdialogs',
//             ],
//           });
//           page = await browser.newPage();
//           await page.authenticate({
//             username: proxy.username,
//             password: proxy.password,
//           });

//           // ✅ HTTP 헤더 보강 (fingerprint.json에서 userAgent는 이미 반영됨)
//           await page.setExtraHTTPHeaders({
//             'sec-ch-ua': '"Google Chrome";v="139", "Chromium";v="139", "Not=A?Brand";v="99"',
//             'sec-ch-ua-mobile': '?0',
//             'sec-ch-ua-platform': '"Windows"',
//             'upgrade-insecure-requests': '1',
//             'origin': 'https://de.loropiana.com',
//             'referer': 'https://de.loropiana.com/',
//             'accept-language': 'de-DE,de;q=0.9,en;q=0.8',
//           });

//         await page.setViewport({ width: 1920, height: 1080 });
//         await this.waitRandom();
//         await page.goto(siteUrl, { waitUntil: 'networkidle2', timeout: 30000 });
//         continue;
//       }

//     // 더보기 버튼 클릭
//     if (hasMoreButton) {
//       console.log("더보기 버튼 클릭 반복 시작");
    
//       while (true) {
//         const hasMore = await page.evaluate(() => {
//           const moreBtn = document.querySelector('button.ais-InfiniteHits-loadMore.btn.btn-outline-primary.col-12.col-sm-2.my-4.d-block.mx-auto') as HTMLElement;          if (moreBtn) {
//             moreBtn.click();
//             return true;
//           }
//           return false;
//         });
    
//         if (!hasMore) {
//           break;
//         }
    
//         await new Promise(resolve => setTimeout(resolve, 2000));
//       }
    
//       // ✅ 여기서 최신 상품 목록 다시 수집
//       const allLoadedUrls = await page.evaluate(() => {
//         return Array.from(
//           document.querySelectorAll('ol.ais-InfiniteHits-list.row.product-grid div.product-tile.mb-6 a[href]')

//         ).map(a => (a as HTMLAnchorElement).href);
//       });
    
//       productUrls = [...new Set(allLoadedUrls)]; // ✅ 중복 제거
//       break;
//     } else {    
//       const firstPageUrls = await page.evaluate(() => {
//         return Array.from(
//           document.querySelectorAll('ol.ais-InfiniteHits-list.row.product-grid div.product-tile.mb-6 a[href]')

//         ).map(a => (a as HTMLAnchorElement).href);
//       });
    
//       productUrls = [...new Set(firstPageUrls)]; // ✅ 중복 제거
//       break;
//     }
//   } catch (error: any) {
//       console.error(`에러 발생: ${error.message}`);
//       //logErrorToDesktop(error, `6.오류 발생`);
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
//                   browser = await puppeteer.launch({
//                     headless: false,
//                     args: [
//                       proxyArg,
//                       '--disable-blink-features',
//                       '--disable-blink-features=AutomationControlled',
//                       '--disable-infobars',
//                       '--no-default-browser-check',
//                       '--no-first-run',
//                       '--log-level=0',
//                       '--disable-dev-shm-usage',
//                       '--no-sandbox',
//                       '--disable-setuid-sandbox',
//                       '--remote-debugging-port=0',
//                       '--disable-background-timer-throttling',
//                       '--disable-backgrounding-occluded-windows',
//                       '--disable-renderer-backgrounding',
//                       '--disable-session-crashed-bubble',
//                       '--disable-accelerated-2d-canvas',
//                       '--noerrdialogs',
//                     ],
//                   });

//                   page = await browser.newPage();
//                   await page.authenticate({
//                     username: proxy.username,
//                     password: proxy.password,
//                   });

//                   // ✅ HTTP 헤더 보강 (fingerprint.json에서 userAgent는 이미 반영됨)
//                   await page.setExtraHTTPHeaders({
//                     'sec-ch-ua': '"Google Chrome";v="139", "Chromium";v="139", "Not=A?Brand";v="99"',
//                     'sec-ch-ua-mobile': '?0',
//                     'sec-ch-ua-platform': '"Windows"',
//                     'upgrade-insecure-requests': '1',
//                     'origin': 'https://de.loropiana.com',
//                     'referer': 'https://de.loropiana.com/',
//                     'accept-language': 'de-DE,de;q=0.9,en;q=0.8',
//                   });
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

//     }

//     if (productUrls.length === 0) {
//       throw new Error('상품 URL을 수집하지 못했습니다. 모든 시도가 실패했습니다.');
//     }
//     console.log(`로로피아나 최종 수집된 상품 URL 수: ${productUrls.length} - ${category?.categoryName || '카테고리 없음'}`);

    
//     for (const [index, productUrl] of productUrls.entries()) {
//       let loadAttempts = 0;
//       let success = false;
//       let soldOut = false;


//       while (loadAttempts < 10) {
//         try {
//             await page.goto(productUrl, { waitUntil: 'networkidle2', timeout: 30000 });
//             console.log(`✅ (${index + 1}/${productUrls.length}) 로로피아나 ${category?.categoryName || '카테고리 없음'}  수집 중`);
//             // 🚨 DOM 안정화 대기
//             await page.waitForSelector('body', { timeout: 10000 });
//             await new Promise((resolve) => setTimeout(resolve, 2000));

//             const isOutOfStock = await page.evaluate(() => {
//               const notifyMeButton = document.querySelector('button.btn.btn-primary.btn-block.disabled');
//               return notifyMeButton !== null; // 버튼이 있으면 품절, 없으면 재고 있음
//             });
              
//             if (isOutOfStock) {
//               soldOut = true;
//               break; // while 루프 종료
//             }
//             success = true;
//             break; // 로딩 성공 시 루프 종료
//           } catch (error: any) {
//               loadAttempts++;
//               console.warn(`페이지 로드 실패 (재시도 ${loadAttempts}/10): ${error.message}`);
//               //logErrorToDesktop(error, `7.오류 발생`);
//               if (loadAttempts < 10) {
//                 if (page && !page.isClosed()) {
//                     await page.close();
//                 }
//                 if (browser) {
//                     await browser.close();
//                 }
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
//                   ],
//                 });

//                 page = await browser.newPage();
//                 await page.authenticate({
//                   username: proxy.username,
//                   password: proxy.password,
//                 });
                
//                 // ✅ HTTP 헤더 보강 (fingerprint.json에서 userAgent는 이미 반영됨)
//                 await page.setExtraHTTPHeaders({
//                   'sec-ch-ua': '"Google Chrome";v="139", "Chromium";v="139", "Not=A?Brand";v="99"',
//                   'sec-ch-ua-mobile': '?0',
//                   'sec-ch-ua-platform': '"Windows"',
//                   'upgrade-insecure-requests': '1',
//                   'origin': 'https://de.loropiana.com',
//                   'referer': 'https://de.loropiana.com/',
//                   'accept-language': 'de-DE,de;q=0.9,en;q=0.8',
//                 });

//                 await page.setViewport({ width: 1920, height: 1080 });
//                 await this.waitRandom();
//                 continue;
//                 } else {
//                     console.error('최대 로드 시도 초과 - 다음 URL로 이동합니다.');
//                     break;
//                 }
//           }
//       }

//       if (!success) {
//         // ✅ page.goto 완전히 실패했으면 다음 productUrl로 넘어감
//         continue;
//       }

      

      
//       const productDetails = await page.evaluate(async () => {
//         const site = 'Loropiana';
//         const designer = '로로피아나';
//         const titleElement = document.querySelector('h1.product-name.h5.mb-1.hidden-sm-down');
//         const title = titleElement ? titleElement.textContent?.trim() || '' : '';
//         const priceElement = document.querySelector<HTMLSpanElement>('div.price.small span .value');
//         const price = priceElement ? parseFloat(priceElement.getAttribute('content') || '0') : 0;
//         const color = document.querySelector('span.selected-color-label')?.textContent?.trim() || '';
//         const colorMatch = color.match(/\((.*?)\)/);
//         const colorCode = colorMatch ? colorMatch[1] : '';

//         const imageElements = document.querySelectorAll('div.swiper-wrapper.flex-lg-wrap img[src]');

//         const imageUrls = Array.from(imageElements).map((img) => {
//           const url = img.getAttribute('data-src') || img.getAttribute('src') || '';
//           if (!url) return '';

//           // 필터링: mp4 또는 video 형식 제외
//           if (url.endsWith('.mp4') || url.includes('/images/is/poster-video/')) return '';

//           return url;
//         }).filter(url => url !== '');

        

//         const sizeSelectWrapper = document.querySelector('div.row.mb-4.js-product-size');

//         let size = '원사이즈'; // 기본값

//         if (sizeSelectWrapper) {
//           const selectElement = sizeSelectWrapper.querySelector('select.select-size');
          
//           if (selectElement) {
//             const inStockOptions = Array.from(selectElement.querySelectorAll('option'))
//               .filter(option =>
//                 !option.disabled &&
//                 option.value.trim() !== '' &&
//                 !['select size', 'auswählen', 'sélectionner'].includes(option.textContent.trim().toLowerCase())
//               )
//               .map(option => {
//                 const displayValue = option.getAttribute('data-attr-display-value')?.trim() || option.textContent.trim();
//                 return displayValue === 'NR' ? '원사이즈' : displayValue;
//               })
//               .filter(Boolean); // 빈 값 제거

//             if (inStockOptions.length === 0) {
//               console.log('⚠️ 모든 사이즈가 품절입니다. 다음 상품으로 넘어갑니다.');
//               return null;
//             }

//             // NR만 있을 경우 size = '원사이즈' 로 유지되고, 그 외엔 리스트로
//             const hasOnlyNR = inStockOptions.length === 1 && inStockOptions[0] === '원사이즈';
//             size = hasOnlyNR ? '원사이즈' : inStockOptions.map(s => s.replace(',', '.')).join(', ');
//           }
//         }




//         let mainInfo = '';

//         // 1. 상품 설명 (상단 문단)
//         const descElement = document.querySelector('div.e-shop-description.js-product-description p') as HTMLElement;
//         if (descElement) {
//           mainInfo += `${descElement.innerText.trim()}\n\n`;
//         }

//         // 2. 상세 정보 (br 태그 포함 텍스트)
//         const detailsElement = document.querySelector('div.card-body.px-0');
//         if (detailsElement) {
//           // <br>을 줄바꿈으로 변환하여 텍스트 정리
//           const cloned = detailsElement.cloneNode(true) as HTMLElement;
//           cloned.querySelectorAll('br').forEach(br => br.replaceWith('\n'));
//           mainInfo += `${cloned.innerText.trim()}\n\n`;
//         }

//         // 3. 스타일 ID 추출
//         // styleId 추출 (mainInfo 기반)
//         const styleIdMatch = mainInfo.match(/Product code\s*:\s*([\w\d\.\-]+)/i);
//         let styleId = styleIdMatch ? styleIdMatch[1].trim() : '';

//         // styleId + colorCode 합치기
//         if (styleId && colorCode) {
//           styleId = `${styleId}_${colorCode}`;
//         }
//         const brandstyleId = styleId;

//         // 4. Made in 추출
//         const madeInMatch = mainInfo.match(/Made in\s+([^\n]+)/i);
//         const madeIn = madeInMatch ? madeInMatch[1].trim() : '';


//         return { site, designer, title, price, color, mainInfo, madeIn, styleId, size, brandstyleId, imageUrls };
//       });


//       if (!productDetails || !productDetails.mainInfo || !productDetails.styleId || !productDetails.title || !productDetails.price || !productDetails.imageUrls.length || !productDetails.size || !productDetails.brandstyleId) {
//         console.warn('로로피아나 데이터 누락 - 다음 productUrl로 이동');
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
        
//             browser = await puppeteer.launch({
//               headless: false,
//               args: [
//                 proxyArg,
//                 '--disable-blink-features',
//                 '--disable-blink-features=AutomationControlled',
//                 '--disable-infobars',
//                 '--no-default-browser-check',
//                 '--no-first-run',
//                 '--log-level=0',
//                 '--disable-dev-shm-usage',
//                 '--no-sandbox',
//                 '--disable-setuid-sandbox',
//                 '--remote-debugging-port=0',
//                 '--disable-background-timer-throttling',
//                 '--disable-backgrounding-occluded-windows',
//                 '--disable-renderer-backgrounding',
//                 '--disable-session-crashed-bubble',
//                 '--disable-accelerated-2d-canvas',
//                 '--noerrdialogs',
//               ],
//             });

//             page = await browser.newPage();
//             await page.authenticate({
//               username: proxy.username,
//               password: proxy.password,
//             });
            
//             // ✅ HTTP 헤더 보강 (fingerprint.json에서 userAgent는 이미 반영됨)
//             await page.setExtraHTTPHeaders({
//               'sec-ch-ua': '"Google Chrome";v="139", "Chromium";v="139", "Not=A?Brand";v="99"',
//               'sec-ch-ua-mobile': '?0',
//               'sec-ch-ua-platform': '"Windows"',
//               'upgrade-insecure-requests': '1',
//               'origin': 'https://de.loropiana.com',
//               'referer': 'https://de.loropiana.com/',
//               'accept-language': 'de-DE,de;q=0.9,en;q=0.8',
//             });

//             await page.setViewport({ width: 1920, height: 1080 });
//             try {
//                 await page.goto(productUrl, { waitUntil: 'networkidle2', timeout: 30000 });
//             } catch (error: any) {
//                 console.warn(`프록시 변경 후에도 페이지 로드 실패: ${error.message}`);
//                 //logErrorToDesktop(error, `9.오류 발생`);
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
//  newProduct.godoMallCategoryCode = godoMallCategoryCode;


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
//                     //logErrorToDesktop(error, `10.오류 발생`);
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
//                 //logErrorToDesktop(error, `11.오류 발생`);
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
//                 Loropiana : siteUrl,
//               }
//               await this.smartstoreApiService.deleteUnsoldSmartstoreProducts(auth,siteUrls, partnerKey, apiKey, "Loropiana");
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
          
              console.log(`로로피아나 품절 처리 완료: ${product.title} (styleId: ${product.styleId})`);
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
            const html = await this.r2Service.getHtmlFromUrl2(visitUrl);
            const $ = cheerio.load(html || '');
            const price = Number.parseFloat($('div.price.small span .value').first().attr('content') || '0') || 0;
            let size = '원사이즈';
            const selectElement = $('div.row.mb-4.js-product-size select.select-size').first();

            if (selectElement.length) {
              const inStockOptions = selectElement.find('option')
                .toArray()
                .filter(option => {
                  const optionEl = $(option);
                  const text = (optionEl.text() || '').trim().toLowerCase();
                  return optionEl.attr('disabled') === undefined &&
                    (optionEl.attr('value') || '').trim() !== '' &&
                    !['select size', 'auswählen', 's챕lectionner', 'sélectionner'].includes(text);
                })
                .map(option => {
                  const optionEl = $(option);
                  const displayValue = (optionEl.attr('data-attr-display-value') || optionEl.text() || '').trim();
                  return displayValue === 'NR' ? '원사이즈' : displayValue;
                })
                .filter(Boolean);

              if (!inStockOptions.length) {
                const productDetails = { price: 0, size: '', soldOut: true };
                const xmlUrl = await this.r2Service.uploadXmlToR2Update(product, product.styleId, partnerKey, productDetails.soldOut);
                if (!xmlUrl) return;
                await this.userService.assertRequestAvailable(customId, 1);
                await this.godoMallService.registerProductWithXmlUrl(partnerKey, apiKey, xmlUrl, product, product.styleId);
                await this.userService.consumeRequest(customId, 1);
                this.gateway.sendProductUpdate(`${customId}:${accountPlatform}:${goodsNo}`, { status: 'success', price: product.price, size: product.size, updatedAt: new Date().toISOString() });
                await this.godoMallService.deleteUpdateXml(xmlUrl);
                return;
              }

              size = inStockOptions.length === 1 && inStockOptions[0] === '원사이즈'
                ? '원사이즈'
                : inStockOptions.map(s => s.replace(',', '.')).join(', ');
            }

            const productDetails = { price, size, soldOut: !price || !size };

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
            console.log(`Loropiana product update complete: ${product.designer} ${product.title}`);
            return;
          } catch (err: any) {
            console.warn(`Loropiana snapshot update failed (${attempt}/${MAX_RETRY}): ${err.message}`);
          }
        }
      }

      
//     async getProductsFromCategory(siteUrl: string, partnerKey: string,apiKey: string, customId:string, accountPlatform:string, godoMallCategoryCode: string): Promise<void> {
    // const account = await this.hostingAccountRepository.findOne({
    //   where: { customId, accountPlatform },
    // });
//     const serviceType = 'Loropiana';
//     let portIndex = 0;
//     let browser: Browser | null = null;
//     let page: Page | null = null;
//     let productUrls: string[] = [];
//     let designerFromNode = '';


//     const category = await this.mappingRepository.findOne({
//       where: { customId: customId, accountPlatform: accountPlatform, siteUrl: siteUrl },
//   });

//   try {
//     ({ browser, page } = await connectSilkChrome(PORT_POOL[portIndex]));

//     console.log('✅ 실크롬 attach 완료');

//     const MAX_RETRY = 20; // 최대 재시도 횟수
//     let retryAttempts = 0;

//     while (retryAttempts < MAX_RETRY) {
//         try {
//             await page.goto(siteUrl, { waitUntil: 'networkidle2', timeout: 30000 });
//             const kidsKeywords = [
//               '/junior',
//               'boys',
//               'childrens',
//               'girls',
//               'baby',
//               'bekleidung',
//               'children',
//               '키즈',
//               'kids',
//               'enfant',
//             ];

//             // URL 소문자 기준으로 검사
//             const urlLower = siteUrl.toLowerCase();

//             const isKids = kidsKeywords.some(keyword =>
//               urlLower.includes(keyword.toLowerCase())
//             );
            
//             designerFromNode = isKids
//               ? '로로피아나 키즈'
//               : '로로피아나';
//             await new Promise(resolve => setTimeout(resolve, 2000));
//             try {
//               await page.waitForSelector('#onetrust-reject-all-handler', {
//                 timeout: 5000,
//                 visible: true,
//               });
//               await page.click('#onetrust-reject-all-handler');
//             } catch (e: any) {
//             }

//             // JS 라우터로 이동
//             // await page.evaluate((url) => {
//             //   window.location.href = url;
//             // }, siteUrl);

//             // 렌더 대기
//             await page.waitForSelector("ol.ais-InfiniteHits-list.row.product-grid", { timeout: 15000 });
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

//           const waitTime = Math.min(1000 * 2 ** retryAttempts, 10000); // 최대 10초 대기
//           await new Promise((resolve) => setTimeout(resolve, waitTime));
//         }
//     }

//     while (true) {
//         try {
//             // 현재 페이지에서 상품 URL 및 차단 여부 평가
//             // const { isBlocked, hasMoreButton } = await page.evaluate(() => {
//             const { hasMoreButton } = await page.evaluate(() => {
//               const bodyText = document.querySelector('body')?.textContent || '';
            
//               // const isBlocked =
//               //   bodyText.includes('Access Denied') ||
//               //   bodyText.includes('Too Many Requests') ||
//               //   bodyText.includes('429') ||
//               //   bodyText.includes('Enforced timeout') ||
//               //   bodyText.includes('net::ERR_TIMED_OUT');
            
//               const moreButton = document.querySelector('button.ais-InfiniteHits-loadMore.btn.btn-outline-primary.col-12.col-sm-2.my-4.d-block.mx-auto');
//               const hasMoreButton = moreButton !== null;
            
//               // return { isBlocked, hasMoreButton };
//               return {  hasMoreButton };
//             });

//       // if (isBlocked) {
//       //     console.warn("페이지가 차단되었습니다. 프록시를 변경하여 다시 시도합니다.");

//       //     retryAttempts++;
//       //     if (retryAttempts >= 30) {
//       //         throw new Error("30회 재시도 초과 - 크롤링 종료");
//       //     }
//       //     portIndex = (portIndex + 1) % PORT_POOL.length;
//       //       const nextPort = PORT_POOL[portIndex];

//       //     ({ browser, page } = await connectSilkChrome(nextPort));
//       //   await this.waitRandom();
//       //   await page.goto(siteUrl, { waitUntil: 'networkidle2', timeout: 30000 });
//       //   continue;
//       // }

//     // 더보기 버튼 클릭
//     if (hasMoreButton) {
//       console.log("더보기 버튼 클릭 반복 시작");
    
//       while (true) {
//         const hasMore = await page.evaluate(() => {
//           const moreBtn = document.querySelector('button.ais-InfiniteHits-loadMore.btn.btn-outline-primary.col-12.col-sm-2.my-4.d-block.mx-auto') as HTMLElement;          if (moreBtn) {
//             moreBtn.click();
//             return true;
//           }
//           return false;
//         });
    
//         if (!hasMore) {
//           break;
//         }
    
//         await new Promise(resolve => setTimeout(resolve, 2000));
//       }
    
//       // ✅ 여기서 최신 상품 목록 다시 수집
//       const allLoadedUrls = await page.evaluate(() => {
//         return Array.from(
//           document.querySelectorAll('ol.ais-InfiniteHits-list.row.product-grid div.product-tile.mb-6 a[href]')

//         ).map(a => (a as HTMLAnchorElement).href);
//       });
    
//       productUrls = [...new Set(allLoadedUrls)]; // ✅ 중복 제거
//       break;
//     } else {    
//       const firstPageUrls = await page.evaluate(() => {
//         return Array.from(
//           document.querySelectorAll('ol.ais-InfiniteHits-list.row.product-grid div.product-tile.mb-6 a[href]')

//         ).map(a => (a as HTMLAnchorElement).href);
//       });
    
//       productUrls = [...new Set(firstPageUrls)]; // ✅ 중복 제거
//       break;
//     }
//   } catch (error: any) {
//       console.error(`에러 발생: ${error.message}`);
//       //logErrorToDesktop(error, `6.오류 발생`);
//       if (error.message.includes('Enforced timeout') ||
//           error.message.includes('Navigation timeout') || 
//           error.message.includes('net::ERR_TIMED_OUT')) { 
//           console.error("Enforced timeout,Navigation timeout,ERR_TIMED_OUT 문제가 발생했습니다. 브라우저를 재시작합니다.");
//           if (browser) {
//               try {

//                 portIndex = (portIndex + 1) % PORT_POOL.length;
//                 const nextPort = PORT_POOL[portIndex];

//                 ({ browser, page } = await connectSilkChrome(nextPort));
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
//     console.log(`로로피아나 최종 수집된 상품 URL 수: ${productUrls.length} - ${category?.categoryName || '카테고리 없음'}`);

    
//     for (const [index, productUrl] of productUrls.entries()) {
//       let loadAttempts = 0;
//       let success = false;
//       let soldOut = false;


//       while (loadAttempts < 10) {
//         try {
//             await page.goto(productUrl, { waitUntil: 'networkidle2', timeout: 30000 });
//             console.log(`✅ (${index + 1}/${productUrls.length}) 로로피아나 ${category?.categoryName || '카테고리 없음'}  수집 중`);
//             await page.waitForSelector('div.price.small span .value', { visible: true, timeout: 7000 });
//             await new Promise((resolve) => setTimeout(resolve, 2000));
//             const isOutOfStock = await page.evaluate(() => {
//               const notifyMeButton = document.querySelector('button.btn.btn-primary.btn-block.disabled');
//               return notifyMeButton !== null; // 버튼이 있으면 품절, 없으면 재고 있음
//             });
              
//             if (isOutOfStock) {
//               soldOut = true;
//               break; // while 루프 종료
//             }
//             success = true;
//             break; // 로딩 성공 시 루프 종료
//           } catch (error: any) {
//               loadAttempts++;
//               console.warn(`페이지 로드 실패 (재시도 ${loadAttempts}/10): ${error.message}`);
//               //logErrorToDesktop(error, `7.오류 발생`);
//               if (loadAttempts < 10) {
                
//                 portIndex = (portIndex + 1) % PORT_POOL.length;
//                 const nextPort = PORT_POOL[portIndex];

//                 ({ browser, page } = await connectSilkChrome(nextPort));
//                 await this.waitRandom();
//                 continue;
//               } else {
//                 console.error('최대 로드 시도 초과 - 다음 URL로 이동합니다.');
//                 break;
//               }
//           }
//       }

//       if (!success) {
//         // ✅ page.goto 완전히 실패했으면 다음 productUrl로 넘어감
//         continue;
//       }

      
//       const productDetails = await page.evaluate(async (designerFromNode) => {
//         const site = 'Loropiana';
//         const designer = designerFromNode;
//         const titleElement = document.querySelector('h1.product-name.h5.mb-1.hidden-sm-down');
//         const title = titleElement ? titleElement.textContent?.trim() || '' : '';
//         const priceElement = document.querySelector<HTMLSpanElement>('div.price.small span .value');
//         const price = priceElement ? parseFloat(priceElement.getAttribute('content') || '0') : 0;
//         const color = document.querySelector('span.selected-color-label')?.textContent?.trim() || '';
//         const colorMatch = color.match(/\((.*?)\)/);
//         const colorCode = colorMatch ? colorMatch[1] : '';

//         const imageElements = document.querySelectorAll('div.swiper-wrapper.flex-lg-wrap img[src]');

//         const imageUrls = Array.from(imageElements).map((img) => {
//           const url = img.getAttribute('data-src') || img.getAttribute('src') || '';
//           if (!url) return '';

//           // 필터링: mp4 또는 video 형식 제외
//           if (url.endsWith('.mp4') || url.includes('/images/is/poster-video/')) return '';

//           return url;
//         }).filter(url => url !== '');

        

//         const sizeSelectWrapper = document.querySelector('div.row.mb-4.js-product-size');

//         let size = '원사이즈'; // 기본값

//         if (sizeSelectWrapper) {
//           const selectElement = sizeSelectWrapper.querySelector('select.select-size');
          
//           if (selectElement) {
//             const inStockOptions = Array.from(selectElement.querySelectorAll('option'))
//               .filter(option =>
//                 !option.disabled &&
//                 option.value.trim() !== '' &&
//                 !['select size', 'auswählen', 'sélectionner'].includes(option.textContent.trim().toLowerCase())
//               )
//               .map(option => {
//                 const displayValue = option.getAttribute('data-attr-display-value')?.trim() || option.textContent.trim();
//                 return displayValue === 'NR' ? '원사이즈' : displayValue;
//               })
//               .filter(Boolean); // 빈 값 제거

//             if (inStockOptions.length === 0) {
//               console.log('⚠️ 모든 사이즈가 품절입니다. 다음 상품으로 넘어갑니다.');
//               return null;
//             }

//             // NR만 있을 경우 size = '원사이즈' 로 유지되고, 그 외엔 리스트로
//             const hasOnlyNR = inStockOptions.length === 1 && inStockOptions[0] === '원사이즈';
//             size = hasOnlyNR ? '원사이즈' : inStockOptions.map(s => s.replace(',', '.')).join(', ');
//           }
//         }




//         let mainInfo = '';

//         // 1. 상품 설명 (상단 문단)
//         const descElement = document.querySelector('div.e-shop-description.js-product-description p') as HTMLElement;
//         if (descElement) {
//           mainInfo += `${descElement.innerText.trim()}\n\n`;
//         }

//         // 2. 상세 정보 (br 태그 포함 텍스트)
//         const detailsElement = document.querySelector('div.card-body.px-0');
//         if (detailsElement) {
//           // <br>을 줄바꿈으로 변환하여 텍스트 정리
//           const cloned = detailsElement.cloneNode(true) as HTMLElement;
//           cloned.querySelectorAll('br').forEach(br => br.replaceWith('\n'));
//           mainInfo += `${cloned.innerText.trim()}\n\n`;
//         }

//         // 3. 스타일 ID 추출
//         // styleId 추출 (mainInfo 기반)
//         const styleIdMatch = mainInfo.match(/Product code\s*:\s*([\w\d\.\-]+)/i);
//         let styleId = styleIdMatch ? styleIdMatch[1].trim() : '';

//         // styleId + colorCode 합치기
//         if (styleId && colorCode) {
//           styleId = `${styleId}_${colorCode}`;
//         }
//         const brandstyleId = styleId;

//         // 4. Made in 추출
//         const madeInMatch = mainInfo.match(/Made in\s+([^\n]+)/i);
//         const madeIn = madeInMatch ? madeInMatch[1].trim() : '';


//         return { site, designer, title, price, color, mainInfo, madeIn, styleId, size, brandstyleId, imageUrls };
//       },designerFromNode);


//       if (!productDetails || !productDetails.mainInfo || !productDetails.styleId || !productDetails.title || !productDetails.price || !productDetails.imageUrls.length || !productDetails.size || !productDetails.brandstyleId) {
//         console.warn('로로피아나 데이터 누락 - 다음 productUrl로 이동');
//         continue; // 다음 productUrl로 이동
//       }

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
// existingProduct.godoMallCategoryCode = godoMallCategoryCode;



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
// newProduct.godoMallCategoryCode = godoMallCategoryCode;


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
//                     //logErrorToDesktop(error, `10.오류 발생`);
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
//                 continue;
//             }
//           } 

      //     // ✅ 플랫폼 타입에 따른 품절 처리
      //     if (godoMallCategoryCode.length === 8) {
      //         // ✅ 스마트스토어 품절 처리
      //         const auth = {
      //           smartStoreID: partnerKey,
      //           smartStoreSecret: apiKey,
      //         };

      //         const siteUrls = {
      //           Loropiana : siteUrl,
      //         }
      //         await this.smartstoreApiService.deleteUnsoldSmartstoreProducts(auth,siteUrls, partnerKey, apiKey, "Loropiana");
      //     } else {
      //         // ✅ 고도몰 품절 처리
      //         await this.handleUnsoldProducts(siteUrl, partnerKey, apiKey, customId, accountPlatform);
      //         await this.godoMallService.finalizeXmlDeletion(); // 추가된 호출
      //     }
      // }

// BrightData Loropiana 크롤링 시작
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
  const serviceType = 'Loropiana';

  const category = await this.mappingRepository.findOne({
    where: { customId: customId, accountPlatform: accountPlatform, siteUrl: siteUrl },
  });

  let pageIndex = 1;
  let stop = false;
  const allProductUrls: string[] = [];

  while (!stop) {

    const pages = [
      pageIndex,
      pageIndex + 1,
      pageIndex + 2,
    ];

    console.log(`📄 페이지 묶음 수집 → ${pages.join(', ')}`);

    const results = await Promise.all(
      pages.map(async (page) => {

        const pageUrl =
          page === 1
            ? siteUrl
            : `${siteUrl}?page=${page}`;

        let html: string | null = null;

        try {
          html = await this.r2Service.getHtmlFromUrl2(pageUrl);
        } catch {
          console.warn(`⚠️ HTML 없음 → ${pageUrl}`);
          return { page, urls: [] };
        }

        if (!html) {
          return { page, urls: [] };
        }

        const $ = cheerio.load(html);

        const urls = $('ol.ais-InfiniteHits-list a[href]')
          .map((_, el) => $(el).attr('href'))
          .get()
          .filter(Boolean);

        return {
          page,
          urls: [...new Set(urls)]
        };
      })
    );

    let foundEmpty = false;

    for (const result of results) {

      console.log(`📦 page=${result.page} → ${result.urls.length}개`);

      if (result.urls.length === 0) {
        foundEmpty = true;
      }

      allProductUrls.push(...result.urls);
    }

    if (foundEmpty) {
      console.log('🛑 빈 페이지 감지 → 수집 종료');
      stop = true;
    } else {
      pageIndex += 3;
    }
  }

  const uniqueProductUrls = [...new Set(allProductUrls)];

  console.log(`로로피아나 ${uniqueProductUrls.length} - ${category?.categoryName || '카테고리 없음'}`);

  if (!uniqueProductUrls.length) {
    throw new Error('Loropiana 상품 URL 수집 실패');
  }

  const chunkSize = 15;

  for (let i = 0; i < uniqueProductUrls.length; i += chunkSize) {

    const chunk = uniqueProductUrls.slice(i, i + chunkSize);

    await Promise.all(
      chunk.map(async (productUrl,idx) => {

        const globalIndex = i + idx;

        console.log(
          `✅ (${globalIndex + 1}/${uniqueProductUrls.length}) 로로피아나 ${category?.categoryName || '카테고리 없음'} 수집 중`
        );

        try {

          const html = await this.r2Service.getHtmlFromUrl2(productUrl);
          const $ = cheerio.load(html);

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
            3️⃣ 로로피아나 상세 파싱 (BrightData 버전)
          ===================================================== */

          const site = 'Loropiana';
          const designer = isKids ? '로로피아나 키즈' : '로로피아나';

          let title = '';
          let price = 0;
          let color = '';
          let mainInfo = '';
          let madeIn = '';
          let styleId = '';
          let brandstyleId = '';
          let soldOut = false;

          // 🔥 LD+JSON
          $('script[type="application/ld+json"]').each((_, el) => {
            try {
              const json = JSON.parse($(el).html() || '{}');

              if (json['@type'] === 'Product') {

                title = json.name?.trim() || '';
                mainInfo = json.description?.trim() || '';

                const rawSku = json.sku?.trim() || '';

                if (rawSku) {
                  const parts = rawSku.split('_');
                  styleId = parts.length >= 2
                    ? `${parts[0]}_${parts[1]}`
                    : rawSku;
                  brandstyleId = styleId;
                }

                color = json.color?.trim() || '';

                if (json.offers) {
                  price = parseFloat(json.offers.price || '0');

                  const availability = json.offers.availability || '';
                  if (!availability.includes('InStock')) {
                    soldOut = true;
                  }
                }
              }
            } catch {}
          });

          /* ===================== IMAGES ===================== */

          const imageUrls = [
            ...new Set(
              $('.swiper-slide.pdp-image-container img')
                .map((_, el) =>
                  $(el).attr('data-src') ||
                  $(el).attr('src')
                )
                .get()
                .filter(src =>
                  src &&
                  src.includes('media.loropiana.com')
                )
                .map(src => src.replace(/&amp;/g, '&').split('?')[0])
            )
          ];

          /* ===================== DETAIL ===================== */

          const detailBlock = $('#eShopDetail .card-body');

          if (detailBlock.length) {

            let html = detailBlock.html() || '';
            html = html.replace(/<br\s*\/?>/gi, '\n');

            const detailText = cheerio
              .load(`<div>${html}</div>`)('div')
              .text()
              .replace(/\n{2,}/g, '\n')
              .trim();

            if (detailText) {
              mainInfo += '\n' + detailText;
            }

            const madeMatch =
              detailText.match(/Made in\s+([A-Za-z\s]+)(?=\n|$)/i);

            if (madeMatch) {
              madeIn = madeMatch[1].trim();
            }
          }

          mainInfo = mainInfo
            .replace(/Product code:\s*[A-Za-z0-9\-_]+\s*/gi, '')
            .replace(/\n{2,}/g, '\n')
            .trim();

          /* ===================== SIZE ===================== */

          let size = '';

          const options = $('select.select-size option:not(:disabled)')
            .map((_, el) =>
              $(el)
                .text()
                .trim()
                .replace(/(\d),(\d)/g, '$1.$2') // 🔥 42,5 → 42.5
            )
            .get()
            .filter(text => text && !/select/i.test(text));

          if (options.length === 1 && options[0] === 'NR') {
            size = '원사이즈';
          } else if (options.length > 0) {
            size = [...new Set(options)].join(', '); // 🔥 중복 제거까지
          }

          if (!size) {
            soldOut = true;
          }

          /* =====================================================
            🔥 productDetails 생성
          ===================================================== */

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
            imageUrls,
            soldOut,
          };

          if (productDetails.soldOut) {
            console.warn(`❌ Loropiana 품절 → ${productUrl}`);
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
            console.warn('⚠️ Loropiana 데이터 누락');
            console.dir(productDetails, { depth: null });
            return;
          }

          // 카테고리 매핑 데이터 찾기
          const categoryMapping = await this.mappingRepository.findOne({ where: { siteUrl } });
          if (!categoryMapping) {
              throw new Error('매핑된 카테고리를 찾을 수 없습니다.');
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
