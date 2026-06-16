import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
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
import * as cheerio from 'cheerio';
import { wrapper } from 'axios-cookiejar-support';
import { CookieJar } from 'tough-cookie';

import { Product } from 'src/product/product.entity';
import { Mapping } from 'src/mapping/mapping.entity';
import { UpdateGateway } from 'src/update/update.gateway';
import type { Browser, Page } from 'puppeteer';
import puppeteer from 'puppeteer-extra';
import { UserService } from 'src/user/user.service';
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());



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



// function loadProxies2(): string[] {
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
//   'therow'
// );

// // 폴더 없으면 생성
// if (!fs.existsSync(errorLogDir)) {
//   fs.mkdirSync(errorLogDir, { recursive: true });
// }

// // 최종 로그 파일 경로
// const errorLogPath = path.join(errorLogDir, 'therow_error_log.txt');

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
export class TherowService {
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
// async getCategories(siteUrls: string[]): Promise<{ categoryName: string; url: string }[]> {
//     const allCategories: { categoryName: string; url: string }[] = [];
//     const proxyLines = await this.r2Service.loadBrightProxies2();
//     if (!proxyLines.length) {
//         console.warn('프록시 없음, 종료');
//         return;
//     }

//     // 랜덤으로 1개 선택
//     const raw = proxyLines[Math.floor(Math.random() * proxyLines.length)];
//     const proxy = parseAuthProxy(raw);
//     const proxyArg = `--proxy-server=http://${proxy.host}:${proxy.port}`;
  
//     async function processSiteUrls(urls: string[]): Promise<void> {
//       for (const siteUrl of urls) {
//         let retryCount = 0;
//         let success = false;
  
//         while (retryCount < 3 && !success) {
//           console.log(`🌍 [${siteUrl}]`);
  
//           const browser = await puppeteer.launch({
//             headless: false,
//             args: [
//               proxyArg,
//               '--remote-debugging-port=0',
//               '--no-sandbox',
//               '--disable-setuid-sandbox',
//               '--disable-dev-shm-usage',
//               '--disable-background-timer-throttling',
//               '--disable-backgrounding-occluded-windows',
//               '--disable-renderer-backgrounding',
//               '--disable-session-crashed-bubble',
//               '--no-first-run',
//               '--disable-accelerated-2d-canvas',
//               '--noerrdialogs',
//             ],
//           });
  
//           const page = await browser.newPage();
//           await page.authenticate({
//             username: proxy.username,
//             password: proxy.password,
//           });
//           await page.setUserAgent(
//             'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36'
//           );

//           await page.setViewport({ width: 1920, height: 1080 });
  
//           try {
//             await page.goto(siteUrl, { waitUntil: 'networkidle2', timeout: 30000 });
//             console.log(`🔍 ${siteUrl} 진행 중...`);
//             await new Promise((resolve) => setTimeout(resolve, 2000));
//             // 현재 URL 체크
//             const currentUrl = page.url();
//             if (currentUrl.includes('ko-kr')) {
//                 const correctedUrl = currentUrl.replace('ko-kr', 'ko-nl');
//                 console.log(`🔄 리디렉션 감지됨. ${correctedUrl} 로 재이동합니다.`);
//                 await page.goto(correctedUrl, { waitUntil: 'networkidle2', timeout: 30000 });
//                 await new Promise((resolve) => setTimeout(resolve, 2000));
//             }
  
//             const therowCategories: { categoryName: string; url: string }[] = await page.evaluate(() => {
//             const items: { categoryName: string; url: string }[] = [];

//             const firstLevelItems = document.querySelectorAll('li.HorizontalList__Item.header-menu');

//             firstLevelItems.forEach(firstLevelLi => {
//               const mainLink = firstLevelLi.querySelector('a.Heading.u-h6');
//               if (!mainLink) return;

//               const mainCategory = mainLink.textContent.trim();
//               if (mainCategory !== '여성' && mainCategory !== '남성') return;

//               const dropdownMenu = firstLevelLi.querySelector('.DropdownMenu');
//               if (!dropdownMenu) return;

//               const secondLevelItems = dropdownMenu.querySelectorAll('li.Linklist__Item[aria-haspopup="true"]');

//               secondLevelItems.forEach(secondLevelLi => {
//                 const categoryTypeLink = secondLevelLi.querySelector('a.Link.Link--secondary');
//                 const categoryType = categoryTypeLink ? categoryTypeLink.textContent.trim() : 'unknown';

//                 const subDropdownMenu = secondLevelLi.querySelector('.DropdownMenu');
//                 if (!subDropdownMenu) return;

//                 const subItems = subDropdownMenu.querySelectorAll('a.Link.Link--secondary');
//                 subItems.forEach(subLinkElement => {
//                   const subLink = subLinkElement as HTMLAnchorElement;  // 타입 캐스팅
//                   const subCategory = subLink.textContent.trim();
//                   const href = subLink.href;

//                   if (subCategory.includes('모두 보기') || subCategory.includes('View All')) return;  // 전체 보기 필터링

//                   items.push({
//                     categoryName: `${mainCategory} - ${categoryType} - ${subCategory}`,
//                     url: href
//                   });
//                 });
//               });
//             });
  
//               return items;
//             });
  
//             allCategories.push(...therowCategories);
//             console.log(`✅ 수집 완료: ${therowCategories.length}개`);
//             success = true;
  
//           } catch (error: any) {
//             console.error(`❌ [${siteUrl}] 오류 발생: ${error.message}`);
//             retryCount++;
//             console.warn(`⚠️ [${siteUrl}] 재시도 (${retryCount}/3)...`);
//           } finally {
//             await browser.close();
//           }
//         }
  
//         if (!success) {
//           console.warn(`🚫 [${siteUrl}] 3회 시도 후 실패. 건너뜀.`);
//         }
  
//         console.log(`🔄 다음 URL로 이동...`);
//       }
//     }
  
//     await processSiteUrls(siteUrls);
//     console.log(`🎯 모든 사이트에서 카테고리 수집 완료!`);
//     return allCategories;
//   }
  
async getCategories(siteUrls: string[]): Promise<{ categoryName: string; url: string }[]> {

  const allCategories: { categoryName: string; url: string }[] = [];

  const jar = new CookieJar();

  await jar.setCookie('country=NL', 'https://www.therow.com');
  await jar.setCookie('locale=nl-NL', 'https://www.therow.com');
  await jar.setCookie('currency=EUR', 'https://www.therow.com');

  const client = wrapper(
    axios.create({
      jar,
      withCredentials: true,
      timeout: 30000,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/145.0.0.0 Safari/537.36',
        'Accept-Language': 'en-NL,en;q=0.9',
      },
      validateStatus: () => true,
    }),
  );

  for (const siteUrl of siteUrls) {

    let retryCount = 0;
    let success = false;

    while (retryCount < 3 && !success) {

      try {

        let res = await client.get(siteUrl);

        let finalUrl =
          res.request?.res?.responseUrl ||
          res.config?.url ||
          siteUrl;

        // 🔥 locale 강제
        if (finalUrl.includes('/ko-kr/') || finalUrl.includes('/fr-fr/')) {
          const correctedUrl = finalUrl
            .replace('/ko-kr/', '/ko-nl/')
            .replace('/fr-fr/', '/ko-nl/');

          res = await client.get(correctedUrl);
        }

        if (res.status !== 200) throw new Error(`HTTP ${res.status}`);

        const $ = cheerio.load(res.data);

        const items: { categoryName: string; url: string }[] = [];

        // =========================
        // 🔥 1depth (여성/남성)
        // =========================
        $('li.HorizontalList__Item.header-menu').each((_, el) => {

          const mainCategory = $(el).find('a.Heading.u-h6').text().trim();

          if (mainCategory !== '여성' && mainCategory !== '남성') return;

          const dropdown = $(el).find('.DropdownMenu').first();

          // =========================
          // 🔥 2depth
          // =========================
          dropdown.find('> ul > li').each((_, li) => {

            const link = $(li).children('a.Link--secondary').first();
            const name = link.text().trim();
            const href = link.attr('href');

            if (name && href && !name.includes('모두 보기')) {
              items.push({
                categoryName: `${mainCategory} - ${name}`,
                url: href.startsWith('http')
                  ? href
                  : `https://www.therow.com${href}`,
              });
            }

            // =========================
            // 🔥 3depth
            // =========================
            const subDropdown = $(li).find('.DropdownMenu');

            subDropdown.find('a.Link--secondary').each((_, sub) => {

              const subName = $(sub).text().trim();
              const subHref = $(sub).attr('href');

              if (!subName || !subHref) return;
              if (subName.includes('모두 보기')) return;

              items.push({
                categoryName: `${mainCategory} - ${name} - ${subName}`,
                url: subHref.startsWith('http')
                  ? subHref
                  : `https://www.therow.com${subHref}`,
              });

            });

          });

        });

        allCategories.push(...items);

        console.log(`✅ ${items.length}개 수집`);

        success = true;

      } catch (err: any) {
        console.error(`❌ ${err.message}`);
        retryCount++;
      }
    }

    if (!success) {
      console.warn(`🚫 ${siteUrl} 실패`);
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
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36"
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

  // Therow 사이트 크롤링 시작
//   async getProductsFromCategory(siteUrl: string, partnerKey: string,apiKey: string, customId:string, accountPlatform:string, godoMallCategoryCode: string): Promise<void> {
//     const serviceType = 'Therow';
//     const proxyLines = await this.r2Service.loadBrightProxies2();
//     if (!proxyLines.length) {
//         console.warn('프록시 없음, 종료');
//         return;
//     }

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

//     const MAX_RETRY = 5; // 최대 재시도 횟수
//     let retryAttempts = 0;
//     let index = 1;
//     let collectedProductUrls: string[] = [];
    

//     while (true) {
//         try {
//           try{
//           const pagedUrl = `${siteUrl}?page=${index}`;
//           await page.goto(pagedUrl, { waitUntil: 'networkidle2', timeout: 30000 });
//           await new Promise((resolve) => setTimeout(resolve, 3000));
//           // 현재 URL 체크
//           const currentUrl = page.url();
//           if (currentUrl.includes('ko-kr') || currentUrl.includes('fr-fr')) {
//               const correctedUrl = currentUrl
//               .replace('ko-kr', 'ko-nl')
//               .replace('fr-fr', 'ko-nl');
//               console.log(`🔄 리디렉션 감지됨. ${correctedUrl} 로 재이동합니다.`);
//               await page.goto(correctedUrl, { waitUntil: 'networkidle2', timeout: 30000 });
//               await new Promise((resolve) => setTimeout(resolve, 2000));
//           }
//           } catch (error: any) {
//             //logErrorToDesktop(error, `2.오류 발생`);
//             // 기존 브라우저와 페이지 닫기
//             if (page && !page.isClosed()) {
//                 await page.close();
//             }
//             if (browser) {
//                 await browser.close();
//             }
//             retryAttempts++;
//             if (retryAttempts >= 30) {
//                 throw new Error("30회 재시도 초과 - 크롤링 종료");
//             }
//             // 새로운 브라우저와 페이지 생성
//             browser = await puppeteer.launch({
//                 headless: false,
//                 args: [
//                     proxyArg,
//                     '--remote-debugging-port=0',
//                     '--no-sandbox',
//                     '--disable-setuid-sandbox',
//                     '--disable-dev-shm-usage',
//                     '--disable-background-timer-throttling',
//                     '--disable-backgrounding-occluded-windows',
//                     '--disable-renderer-backgrounding',
//                     '--disable-session-crashed-bubble',
//                     '--no-first-run',
//                     '--disable-accelerated-2d-canvas',
//                     '--noerrdialogs',
//                 ],
//             });
//             page = await browser.newPage();
//             await page.authenticate({
//               username: proxy.username,
//               password: proxy.password,
//             });
//             await page.setUserAgent(
//               'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36'
//             );
//             await page.setViewport({ width: 1920, height: 1080 });
//             continue;
//           }
//           // 현재 페이지에서 상품 URL 및 차단 여부 평가
//           const { currentPageProductUrls, isBlocked } = await page.evaluate(() => {
//             const productUrls = Array.from(
//                 new Set(
//                     Array.from(document.querySelectorAll('.ProductItem__Wrapper'))
//                         .filter(wrapper => {
//                             const soldOutLabel = wrapper.querySelector('.ProductItem__Label--soldOut');
//                             return !soldOutLabel;
//                         })
//                         .map(wrapper => {
//                             const link = wrapper.querySelector('a[href]');
//                             return link ? (link as HTMLAnchorElement).href : null;
//                         })
//                         .filter(Boolean)
//                 )
//             );

//             const bodyText = document.querySelector('body')?.textContent || '';
//             const isBlocked =
//                 document.querySelector('body') === null &&
//                 (bodyText.includes('Access Denied') ||
//                     bodyText.includes('Too Many Requests') ||
//                     bodyText.includes('429') ||
//                     bodyText.includes('Enforced timeout') ||
//                     bodyText.includes('net::ERR_TIMED_OUT'));

//             return { currentPageProductUrls: productUrls, isBlocked };
//         });


//         if (isBlocked) {
//             console.warn("페이지가 차단되었습니다. 프록시를 변경하여 다시 시도합니다.");
//              // 새로운 프록시 설정
//             // 기존 브라우저와 페이지 닫기
//             if (page && !page.isClosed()) {
//                 await page.close();
//             }
//             if (browser) {
//                 await browser.close();
//             }
//             retryAttempts++;
//             if (retryAttempts >= 30) {
//                 throw new Error("30회 재시도 초과 - 크롤링 종료");
//             }
//             // 새로운 브라우저와 페이지 생성
//             browser = await puppeteer.launch({
//                 headless: false,
//                 args: [
//                     proxyArg,
//                     '--remote-debugging-port=0',
//                     '--no-sandbox',
//                     '--disable-setuid-sandbox',
//                     '--disable-dev-shm-usage',
//                     '--disable-background-timer-throttling',
//                     '--disable-backgrounding-occluded-windows',
//                     '--disable-renderer-backgrounding',
//                     '--disable-session-crashed-bubble',
//                     '--no-first-run',
//                     '--disable-accelerated-2d-canvas',
//                     '--noerrdialogs',
//                 ],
//             });
//             page = await browser.newPage();
//             await page.authenticate({
//               username: proxy.username,
//               password: proxy.password,
//             });
//             await page.setUserAgent(
//               'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36'
//             );
//             await page.setViewport({ width: 1920, height: 1080 });
//             continue;
//         }


//         if (currentPageProductUrls.length === 0) {
//           console.log(`✅ 페이지 ${index}에서 더 이상 상품이 없습니다. 수집 종료`);
//           productUrls = collectedProductUrls;
//           break;
//         }

//         console.log(`📦 페이지 ${index}에서 ${currentPageProductUrls.length}개 상품 수집됨`);

//         // 중복 제거하며 누적 수집
//         collectedProductUrls = Array.from(new Set([...collectedProductUrls, ...currentPageProductUrls]));
        

//         index++; // 다음 페이지로 이동


//       } catch (error: any) {
//         console.error(`에러 발생: ${error.message}`);
//         //logErrorToDesktop(error, `3.오류 발생`);
//         if (error.message.includes('Enforced timeout') ||
//             error.message.includes('Navigation timeout') || 
//             error.message.includes('net::ERR_TIMED_OUT')) { 
//             console.error("Enforced timeout,Navigation timeout,ERR_TIMED_OUT 문제가 발생했습니다. 브라우저를 재시작합니다.");
//             if (browser) {
//                 try {
//                     // 기존 브라우저와 페이지 닫기
//                     if (page && !page.isClosed()) {
//                         await page.close();
//                     }
//                     if (browser) {
//                         await browser.close();
//                     }
//                     // 새로운 브라우저와 페이지 생성
//                     browser = await puppeteer.launch({
//                         headless: false,
//                         args: [
//                             proxyArg,
//                             '--remote-debugging-port=0',
//                             '--no-sandbox',
//                             '--disable-setuid-sandbox',
//                             '--disable-dev-shm-usage',
//                             '--disable-background-timer-throttling',
//                             '--disable-backgrounding-occluded-windows',
//                             '--disable-renderer-backgrounding',
//                             '--disable-session-crashed-bubble',
//                             '--no-first-run',
//                             '--disable-accelerated-2d-canvas',
//                             '--noerrdialogs',
//                         ],
//                     });
//                     page = await browser.newPage();
//                     await page.authenticate({
//                       username: proxy.username,
//                       password: proxy.password,
//                     });
//                     await page.setUserAgent(
//                       'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36'
//                     );
//                     await page.setViewport({ width: 1920, height: 1080 });
//                 } catch (closeError: any) {
//                     console.warn("브라우저 종료 중 추가 오류:", closeError.message);
//                 }
//             }
//              // 새로운 프록시 설정
//             retryAttempts++;
//             if (retryAttempts >= 30) {
//                 throw new Error("30회 재시도 초과 - 크롤링 종료");
//             }
//             continue; // 루프를 다시 시작
//         } else {
//             throw error; // 예상치 못한 에러는 상위로 전달
//         }
//       }
//     }
//   }
//     finally {

//     }

//     if (productUrls.length === 0) {
//       throw new Error('상품 URL을 수집하지 못했습니다. 모든 시도가 실패했습니다.');
//     }
//     console.log(`더로우 최종 수집된 상품 URL 수: ${productUrls.length} - ${category?.categoryName || '카테고리 없음'}`);

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
//             await page.goto(productUrl, { waitUntil: 'networkidle2', timeout: 30000 });
//             console.log(`✅ (${index + 1}/${productUrls.length}) 더로우 ${category?.categoryName || '카테고리 없음'}  수집 중`);
//             await new Promise((resolve) => setTimeout(resolve, 2000));
//             // 현재 URL 체크
//             const currentUrl = page.url();
//             if (currentUrl.includes('ko-kr') || currentUrl.includes('fr-fr')) {
//                 const correctedUrl = currentUrl
//                   .replace('ko-kr', 'ko-nl')
//                   .replace('fr-fr', 'ko-nl');
//                 console.log(`🔄 리디렉션 감지됨. ${correctedUrl} 로 재이동합니다.`);
//                 await page.goto(correctedUrl, { waitUntil: 'networkidle2', timeout: 30000 });
//                 await new Promise((resolve) => setTimeout(resolve, 2000));
//             }
//             success = true;
//             break; // 로딩 성공 시 루프 종료
//           } catch (error: any) {
//               loadAttempts++;
//               console.warn(`페이지 로드 실패 (프록시 변경 ${loadAttempts}/10): ${error.message}`);
//               //logErrorToDesktop(error, `4.오류 발생`);
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
//                           '--remote-debugging-port=0',
//                           '--no-sandbox',
//                           '--disable-setuid-sandbox',
//                           '--disable-dev-shm-usage',
//                           '--disable-background-timer-throttling',
//                           '--disable-backgrounding-occluded-windows',
//                           '--disable-renderer-backgrounding',
//                           '--disable-session-crashed-bubble',
//                           '--no-first-run',
//                           '--disable-accelerated-2d-canvas',
//                           '--noerrdialogs',
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
//                   //logErrorToDesktop(error, `5.오류 발생`);
//                   break;
//               }
//           }
//       }


      
//       const hasSoldOut = await page.evaluate(() => {
//         const waitlistButton = Array.from(document.querySelectorAll('button.ProductForm__AddToCart'))
//             .find(btn => btn.textContent?.trim() === 'Join The Waitlist');
//         return waitlistButton !== undefined;
//       });

//       if (hasSoldOut) {
//         console.log('❌ Join The Waitlist 상품 → 다음 상품으로 이동합니다.');
//         continue;  // 재고 없는 상품은 skip
//       }



//       const productDetails = await page.evaluate(async () => {
//         const site = 'Therow';
//         const designer = '더로우';
//         const titleElement = document.querySelector('h1.ProductMeta__Title.Heading.u-h2');
//         const title = titleElement ? titleElement.textContent?.trim() || '' : '';
//         const priceElement = document.querySelector('.ProductMeta__PriceList.Heading .ProductMeta__Price');
//         let finalPrice = 0;

//         if (priceElement) {
//             let rawPrice = priceElement.textContent?.trim() || '';
//             rawPrice = rawPrice.replace(/[^\d,]/g, '');  // 숫자와 쉼표만 남김
//             rawPrice = rawPrice.replace('.', '');        // . 제거 (751000)
//             rawPrice = rawPrice.replace(',', '.');       // ,를 .으로 변환 (7510.00)
//             finalPrice = Math.floor(parseFloat(rawPrice));
//         }
//         const color = document.querySelector('span.product-form__selected-value')?.textContent?.trim() || '';
        
//         const imageElements = document.querySelectorAll<HTMLImageElement>('.Product__SlideItem--image img');

//         const urlSet = new Set<string>();

//         const imageUrls = Array.from(imageElements).map(img => {
//             let url = img.getAttribute('src') || '';
//             if (!url) return '';

//             // // 로 시작하면 https:// 붙이기
//             if (url.startsWith('//')) {
//                 url = 'https:' + url;
//             }

//             // 중복 제거
//             if (!urlSet.has(url)) {
//                 urlSet.add(url);
//                 return url;
//             }

//             return '';
//         }).filter(url => url !== '');


//         let size: string | null = null;

//         // 1. '사이즈 선택' 버튼 중 화면에 보이는 것만 찾기
//         const sizeSelectButton = Array.from(document.querySelectorAll('button.ProductForm__Item'))
//             .find(btn => {
//                 const selectedValue = btn.querySelector('.ProductForm__SelectedValue');
//                 const isVisible = (btn as HTMLElement).offsetParent !== null; // display:none 무시 (보이는 버튼만)
//                 return isVisible && selectedValue && selectedValue.textContent?.includes('사이즈 선택');
//             });

//         if (!sizeSelectButton) {
//             // 사이즈 선택 버튼이 아예 없는 경우 (가방/지갑 or 선주문)
//             const addToCartButton = document.querySelector('button.ProductForm__AddToCart');
//             if (addToCartButton && addToCartButton.textContent?.includes('선주문')) {
//                 size = '선주문';
//             } else {
//                 size = '원사이즈';
//             }
//         } else {
//             // Popover ID를 통해 사이즈 목록 찾기
//             const popoverId = sizeSelectButton.getAttribute('aria-controls');
//             const popover = popoverId ? document.getElementById(popoverId) : null;

//             if (popover) {
//                 const sizeButtons = popover.querySelectorAll('button[data-action="select-value"]');
//                 const availableSizes = Array.from(sizeButtons)
//                     .filter(btn => !btn.classList.contains('unavailable-button'))  // 품절 아닌 것만
//                     .map(btn => btn.textContent?.trim() || '')
//                     .filter(value => value.length > 0);

//                 if (availableSizes.length === 0) {
//                     console.log('❌ 모든 사이즈 품절, 다음 상품으로 넘어갑니다.');
//                     size = null;
//                 } else {
//                     size = availableSizes.join(', ');
//                 }
//             } else {
//                 size = '원사이즈';
//             }
//         }
        
//         let mainInfo = '';

//         const descriptionElement = document.querySelector('.ProductMeta__Description .Rte');
//         if (descriptionElement) {
//             mainInfo += descriptionElement.textContent.trim() + '\n';
//         }

//         const additionalInfoItems = document.querySelectorAll('.product-more__content li');
//         const additionalInfoLines: string[] = [];
//         let madeIn = '';
//         let styleId = '';

//         additionalInfoItems.forEach(li => {
//             const text = li.textContent.trim();
//             additionalInfoLines.push(text);

//             if (text.startsWith('Made in')) {
//                 madeIn = text.replace('Made in', '').trim();
//             } else if (text.startsWith('제조국:')) {
//                 madeIn = text.replace('제조국:', '').trim();
//             }

//             if (text.startsWith('Style:')) {
//                 styleId = text.replace('Style:', '').trim();
//             } else if (text.startsWith('스타일:')) {
//                 styleId = text.replace('스타일:', '').trim();
//             }
//         });

//         if (additionalInfoLines.length > 0) {
//             mainInfo += additionalInfoLines.join('\n');
//         }

//         const brandstyleId = styleId;


//         return { site, designer, title, price: finalPrice, color, mainInfo, madeIn, styleId, size, brandstyleId, imageUrls };
//       });


//       if (!productDetails || !productDetails.mainInfo || !productDetails.styleId || !productDetails.title || !productDetails.price || !productDetails.imageUrls.length || !productDetails.size || !productDetails.brandstyleId) {
//         console.warn('더로우 데이터 누락 - 다음 productUrl로 이동');
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
//                     '--remote-debugging-port=0',
//                     '--no-sandbox',
//                     '--disable-setuid-sandbox',
//                     '--disable-dev-shm-usage',
//                     '--disable-background-timer-throttling',
//                     '--disable-backgrounding-occluded-windows',
//                     '--disable-renderer-backgrounding',
//                     '--disable-session-crashed-bubble',
//                     '--no-first-run',
//                     '--disable-accelerated-2d-canvas',
//                     '--noerrdialogs'
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
//                 await page.goto(productUrl, { waitUntil: 'networkidle2', timeout: 30000 });
//                 // 현재 URL 체크
//                 const currentUrl = page.url();
//                 if (currentUrl.includes('ko-kr')) {
//                     const correctedUrl = currentUrl.replace('ko-kr', 'ko-nl');
//                     console.log(`🔄 리디렉션 감지됨. ${correctedUrl} 로 재이동합니다.`);
//                     await page.goto(correctedUrl, { waitUntil: 'networkidle2', timeout: 30000 });
//                     await new Promise((resolve) => setTimeout(resolve, 2000));
//                 }
//             } catch (error: any) {
//                 console.warn(`프록시 변경 후에도 페이지 로드 실패: ${error.message}`);
//                 //logErrorToDesktop(error, `6.오류 발생`);
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
//         existingProduct.visitUrl = productUrl;
//         existingProduct.godoMallCategoryCode = godoMallCategoryCode;
//         existingProduct.categoryName = category.categoryName;

//         const godoMallCategoryName = category.godoMallCategoryName;



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
        
//         if (newProduct.platform === 'smartstore') {

//             // ★ 새로운 로직: 이미지 데이터를 base64 및 원본 URL 배열로 생성
//             const base64ImageList: string[] = [];
//             const originThumbnailUrls: string[] = [];

//             // ✅ 대표 이미지 + 추가 이미지 R2 URL 합치기
//             const allR2Urls = [newProduct.mainImageUrl,...(newProduct.additionalImageUrls || [])];

//             for (const r2Url of allR2Urls) {
//                 try {
//                     const response = await axios.get(r2Url, {
//                         responseType: 'arraybuffer',
//                         timeout: 10000,
//                     });
//                     const buffer = Buffer.from(response.data, 'binary');
//                     const base64 = buffer.toString('base64');
//                     base64ImageList.push(base64);
//                     originThumbnailUrls.push(r2Url);
//                 } catch (error: any) {
//                     console.error('이미지 R2 불러오기 실패:', r2Url, error.message);
//                     //logErrorToDesktop(error, `7.오류 발생`);
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
//                 //logErrorToDesktop(error, `8.오류 발생`);
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
//                 Therow : siteUrl,
//               }
//               await this.smartstoreApiService.deleteUnsoldSmartstoreProducts(auth,siteUrls, partnerKey, apiKey, "Therow");
//           } else {
//               // ✅ 고도몰 품절 처리
//               await this.handleUnsoldProducts(siteUrl, partnerKey, apiKey, customId, accountPlatform);
//               await this.godoMallService.finalizeXmlDeletion(); // 추가된 호출
//           }
//       }

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

  // 0️⃣ Cookie + axios client
  const jar = new CookieJar();

  await jar.setCookie('country=NL', 'https://www.therow.com');
  await jar.setCookie('locale=nl-NL', 'https://www.therow.com');
  await jar.setCookie('currency=EUR', 'https://www.therow.com');

  const client = wrapper(
    axios.create({
      jar,
      withCredentials: true,
      timeout: 30000,
      maxRedirects: 5,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36',
        'Accept-Language': 'en-NL,en;q=0.9',
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Upgrade-Insecure-Requests': '1',
      },
      validateStatus: () => true,
    }),
  );

  const collectedProductUrls: string[] = [];
  let pageIndex = 1;

  while (true) {
    const pageUrl =
      pageIndex === 1 ? siteUrl : `${siteUrl}?page=${pageIndex}`;


    let res = await client.get(pageUrl);

    let finalUrl =
      res.request?.res?.responseUrl ||
      res.config?.url ||
      pageUrl;

    if (finalUrl.includes('/ko-kr/') || finalUrl.includes('/fr-fr/')) {
      const correctedUrl = finalUrl
        .replace('/ko-kr/', '/ko-nl/')
        .replace('/fr-fr/', '/ko-nl/');


      res = await client.get(correctedUrl);
      finalUrl =
        res.request?.res?.responseUrl ||
        res.config?.url ||
        correctedUrl;
    }

    if (res.status === 503) {
      console.warn(`⚠️ 503 감지 (page ${pageIndex}) → 휴식 후 종료`);
      await new Promise(r =>
        setTimeout(r, 10000 + Math.random() * 5000),
      );
      break; // 또는 return
    }

    /* =========================
    * ❌ 기타 비정상 응답
    * ========================= */
    if (res.status !== 200 || !res.data) {
      throw new Error(`HTTP ${res.status} at page ${pageIndex}`);
    }

    const $ = cheerio.load(res.data);

    const pageProductUrls = Array.from(
      new Set(
        $('.ProductItem__Wrapper')
          .toArray()
          .filter(el => {
            // ❌ 품절 라벨 제거
            return !$(el).find('.ProductItem__Label--soldOut').length;
          })
          .map(el => {
            const href = $(el).find('a[href]').attr('href');
            return href
              ? `https://www.therow.com${href}`
              : null;
          })
          .filter(Boolean) as string[],
      ),
    );

    if (pageProductUrls.length === 0) {
      console.log(`✅ 페이지 ${pageIndex} → 상품 없음, 종료`);
      break;
    }

    console.log(`📦 페이지 ${pageIndex} → ${pageProductUrls.length}개 상품`);

    collectedProductUrls.push(...pageProductUrls);
    pageIndex++;
  }

  const productUrls = Array.from(new Set(collectedProductUrls));

  if (productUrls.length === 0) {
    throw new Error('상품 URL 수집 실패');
  }

  console.log(`🎯 더로우 최종 수집: ${productUrls.length}개 - ${category?.categoryName || '카테고리 없음'}`);

    for (const [index, productUrl] of productUrls.entries()) {
      await new Promise(r => setTimeout(r, 800 + Math.random() * 700));

      console.log(`✅ (${index + 1}/${productUrls.length}) 더로우 ${category?.categoryName || '카테고리 없음'} 수집 중`);

      // 1️⃣ 상품 페이지 요청
      let res = await client.get(productUrl);

      let finalUrl =
        res.request?.res?.responseUrl ||
        res.config?.url ||
        productUrl;

      // 2️⃣ locale 강제 보정
      if (finalUrl.includes('/ko-kr/') || finalUrl.includes('/fr-fr/')) {
        const correctedUrl = finalUrl
          .replace('/ko-kr/', '/ko-nl/')
          .replace('/fr-fr/', '/ko-nl/');

        console.log(`🔄 locale 보정 → ${correctedUrl}`);

        res = await client.get(correctedUrl);
        finalUrl =
          res.request?.res?.responseUrl ||
          res.config?.url ||
          correctedUrl;
      }

      if (res.status === 503) {
        console.warn(`⚠️ 503 감지 (page ${pageIndex}) → 휴식 후 종료`);
        await new Promise(r =>
          setTimeout(r, 10000 + Math.random() * 5000),
        );
        break; // 또는 return
      }
      
      if (res.status !== 200 || !res.data) {
        console.warn(`❌ HTTP ${res.status} → skip`);
        continue;
      }

      // 3️⃣ cheerio 로딩
      const $ = cheerio.load(res.data);
      await new Promise(r => setTimeout(r, 1000 + Math.random() * 1500));

      fs.writeFileSync(
        `therow_debug_${Date.now()}.html`,
        res.data,
        'utf-8'
      );


      // 4️⃣ 가격 추출
      let finalPrice = 0;
      const priceText = $('.ProductMeta__PriceList.Heading .ProductMeta__Price')
        .first()
        .text()
        .trim();

      if (priceText) {
        let raw = priceText.replace(/[^\d,]/g, '');
        raw = raw.replace('.', '');
        raw = raw.replace(',', '.');
        finalPrice = Math.floor(parseFloat(raw));
      }

      const productJsonText = $('script[data-product-json]').html();
      const productJson = productJsonText ? JSON.parse(productJsonText) : null;

      let size: string | null = null;

      if (productJson?.product?.variants) {
        const sizes = productJson.product.variants
          .filter(v => v.available === true)
          .map(v => v.option2)
          .filter(Boolean);

        size = sizes.length
          ? [...new Set(sizes)].join(', ')
          : null;

        // 👉 사이즈가 없으면 그때만 원사이즈 판단
        if (!size) {
          const addToCartText = $('button.ProductForm__AddToCart').text().trim();
          size = addToCartText.includes('선주문') ? '선주문' : '원사이즈';
        }
      }

      // 7️⃣ 기타 정보
      const title =
        $('h1.ProductMeta__Title').text().trim() || '';

      const color =
        $('span.product-form__selected-value').first().text().trim() || '';

      const imageUrls = Array.from(
        new Set(
          $('.Product__SlideItem--image img')
            .map((_, img) => {
              let src = $(img).attr('src') || '';
              if (src.startsWith('//')) src = 'https:' + src;
              return src;
            })
            .get()
            .filter(Boolean),
        ),
      );

      let mainInfo = '';
      const desc = $('.ProductMeta__Description .Rte').text().trim();
      if (desc) mainInfo += desc + '\n';

      let madeIn = '';
      let styleId = '';

      // =========================
      // 기존 구조
      // =========================

      $('.product-more__content li').each((_, li) => {

        const text = $(li).text().trim();

        // Made in
        if (/^(Made in|제조국:)/i.test(text)) {

          madeIn = text
            .replace(/^(Made in|제조국:)/i, '')
            .trim();
        }

        // Style / 스타일
        if (/^(Style|스타일):/i.test(text)) {

          styleId = text
            .replace(/^(Style|스타일):/i, '')
            .trim();
        }

      });

      // =========================
      // 🔥 신규 구조 fallback
      // =========================

      // styleId fallback
      if (!styleId) {

        styleId =
          $('.ProductMeta__Sku')
            .first()
            .text()
            .trim();
      }

      // madeIn fallback
      if (!madeIn) {

        $('.ProductMeta__CollapsibleContent li').each((_, li) => {

          const text = $(li).text().trim();

          if (/made in/i.test(text)) {

            madeIn = text
              .replace(/made in/i, '')
              .trim();
          }

        });
      }

      // 8️⃣ 유효성 체크
      if (
        !title ||
        !finalPrice ||
        !size ||
        !styleId ||
        !imageUrls.length
      ) {
        console.warn('⚠️ 데이터 누락 → skip');
        continue;
      }

      // 9️⃣ 최종 객체
      const productDetails = {
        site: 'Therow',
        designer: '더로우',
        title,
        price: finalPrice,
        color,
        size,
        styleId,
        brandstyleId: styleId,
        madeIn,
        mainInfo,
        imageUrls,
      };


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

        console.error(`상품 등록 처리 실패 (${productUrl}): ${errorMessage}`);

        if (
            errorMessage.includes('요청 수 소진') ||
            errorMessage.includes('구독 기간이 만료') ||
            errorMessage.includes('플랜 구독 후 이용할 수 있습니다.') ||
            errorMessage.includes('요청 수 설정이 없습니다.')
        ) {
            throw error; // 🔥 전체 스케줄 중단
        }

        continue;
    }
  }

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
  where: { touched: false, siteUrl, customId, accountPlatform} 
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
  
      console.log(`더로우 품절 처리 완료: ${product.title} (styleId: ${product.styleId})`);
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
  //logErrorToDesktop(error, `9.오류 발생`);
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

    //   async getProductUpdate(visitUrl: string, goodsNo: string, customId: string, accountPlatform: string){
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
//     //     const proxyLines = await this.r2Service.loadBrightProxies2();
//     //     const proxy = pickProxy(proxyLines);
//     //     const proxyArg = `--proxy-server=http://${proxy.host}:${proxy.port}`;

//     //     let browser: Browser | null = null;
//     //     let page: Page | null = null;

//     //     const partnerKey = account.partnerKey;
// const apiKey = account.apiKey;
//     //       where: {
//     goodsno: Number(goodsNo),
//     customId,
//     accountPlatform,
//   },
    //     });
    //     if (!product) return;

    //     try {
    //     browser = await puppeteer.launch({
    //       headless: false,
    //       args: [
    //         // proxyArg,
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


    //     // ✅ 헤더/UA 재설정
    //     await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36');
    //     await page.setViewport({ width: 1920, height: 1080 });
    //     await page.setCacheEnabled(false);
    //     await page.setRequestInterception(true);

    //     page.on('request', (request) => {
    //       // ✅ 요청 리소스 타입 확인
    //       const resourceType = request.resourceType();

    //       if (resourceType === 'image') {
    //         request.abort(); // 🔒 이미지 요청만 차단
    //       } else {
    //         request.continue(); // ✅ 나머지는 정상 통과
    //       }
    //     });

    //     await page.goto(visitUrl, {waitUntil: 'domcontentloaded', timeout: 30000})
    //     await new Promise((resolve) => setTimeout(resolve, 2000));
    //     // 현재 URL 체크
    //     const currentUrl = page.url();
    //     if (currentUrl.includes('ko-kr') || currentUrl.includes('fr-fr')) {
    //         const correctedUrl = currentUrl
    //           .replace('ko-kr', 'ko-nl')
    //           .replace('fr-fr', 'ko-nl');
    //         console.log(`🔄 리디렉션 감지됨. ${correctedUrl} 로 재이동합니다.`);
    //         await page.goto(correctedUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    //         await page.waitForSelector(
    //             'span.sales',
    //             { visible: true, timeout: 30000 }
    //         );

    //     }

    //     let productDetails = await page.evaluate(async () => {
    //       const priceElement = document.querySelector('.ProductMeta__PriceList.Heading .ProductMeta__Price');
    //       let finalPrice = 0;

    //       if (priceElement) {
    //           let rawPrice = priceElement.textContent?.trim() || '';
    //           rawPrice = rawPrice.replace(/[^\d,]/g, '');  // 숫자와 쉼표만 남김
    //           rawPrice = rawPrice.replace('.', '');        // . 제거 (751000)
    //           rawPrice = rawPrice.replace(',', '.');       // ,를 .으로 변환 (7510.00)
    //           finalPrice = Math.floor(parseFloat(rawPrice));
    //       }


    //       let size: string | null = null;

    //       // 1. '사이즈 선택' 버튼 중 화면에 보이는 것만 찾기
    //       const sizeSelectButton = Array.from(document.querySelectorAll('button.ProductForm__Item'))
    //           .find(btn => {
    //               const selectedValue = btn.querySelector('.ProductForm__SelectedValue');
    //               const isVisible = (btn as HTMLElement).offsetParent !== null; // display:none 무시 (보이는 버튼만)
    //               return isVisible && selectedValue && selectedValue.textContent?.includes('사이즈 선택');
    //           });

    //       if (!sizeSelectButton) {
    //           // 사이즈 선택 버튼이 아예 없는 경우 (가방/지갑 or 선주문)
    //           const addToCartButton = document.querySelector('button.ProductForm__AddToCart');
    //           if (addToCartButton && addToCartButton.textContent?.includes('선주문')) {
    //               size = '선주문';
    //           } else {
    //               size = '원사이즈';
    //           }
    //       } else {
    //           // Popover ID를 통해 사이즈 목록 찾기
    //           const popoverId = sizeSelectButton.getAttribute('aria-controls');
    //           const popover = popoverId ? document.getElementById(popoverId) : null;

    //           if (popover) {
    //               const sizeButtons = popover.querySelectorAll('button[data-action="select-value"]');
    //               const availableSizes = Array.from(sizeButtons)
    //                   .filter(btn => !btn.classList.contains('unavailable-button'))  // 품절 아닌 것만
    //                   .map(btn => btn.textContent?.trim() || '')
    //                   .filter(value => value.length > 0);

    //               if (availableSizes.length === 0) {
    //                   console.log('❌ 모든 사이즈 품절, 다음 상품으로 넘어갑니다.');
    //                   size = null;
    //               } else {
    //                   size = availableSizes.join(', ');
    //               }
    //           } else {
    //               size = '원사이즈';
    //           }
    //       }

    //       const soldOut = !finalPrice || !size || size.length === 0; // ✅ 둘 중 하나라도 없으면 품절
    //       return { price: finalPrice, size ,soldOut};
    //     });

    //     if (!productDetails) {
    //       productDetails = {
    //         price: 0,
    //         size: '',
    //         soldOut: true,
    //       };
    //     }

    //     if (!productDetails.soldOut) {
    //       // ✅ 정상일 때만 DB 업데이트
    //       product.lastModifiedDate = new Date();
    //       product.price = productDetails.price;
    //       product.size = productDetails.size;
    //       await this.productRepository.save(product);
    //     }

    //     // ✅ 1️⃣ XML 생성 및 R2 업로드
    //     const xmlUrl = await this.r2Service.uploadXmlToR2Update(
    //       product,
    //       product.styleId,
    //       partnerKey,
    //       productDetails.soldOut
    //     );

    //     // ✅ 업로드 실패 시 안전하게 중단
    //     if (!xmlUrl) {
    //       console.error(`❌ XML 업로드 실패 → ${product.designer} ${product.title}`);
    //       return;
    //     }

    //     // ✅ 2️⃣ 고도몰로 상품 등록/수정 API 호출
    //     const partnerKey = product.partnerKey;
    //     const apiKey = product.apiKey;
    //     await this.godoMallService.registerProductWithXmlUrl(
    //       partnerKey,
    //       apiKey,
    //       xmlUrl,
    //       product,
    //       product.styleId
    //     );

    //     // ✅ WebSocket으로 고도몰에 알림 전송
    //     this.gateway.sendProductUpdate(
  // `${customId}:${accountPlatform}:${goodsNo}`,
  // {
    //       status: 'success',
    //       price: product.price,
    //       size: product.size,
    //       updatedAt: new Date().toISOString(),
    //     });

    //     // ✅ 3️⃣ 고도몰 반영 후 XML 바로 삭제
    //     await this.godoMallService.deleteUpdateXml(xmlUrl);

    //     console.log(`✅ ${product.designer} 상품 업데이트 완료`);

    //   } catch (err: any) {
    //     console.warn(`🚨 Therow 업데이트 실패: ${err.message}`);
    //     if (page && !page.isClosed()) await page.close();
    //     if (browser) await browser.close();
    //   } finally {
    //     if (page && !page.isClosed()) await page.close();
    //     if (browser) await browser.close();
    //   }
    // }


async getProductUpdate(visitUrl: string, goodsNo: string, customId: string, accountPlatform: string) {
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

  /* =========================
   * 0️⃣ CookieJar + axios client
   * ========================= */
  const jar = new CookieJar();

  // 🔥 locale 강제 쿠키
  await jar.setCookie('country=NL', 'https://www.therow.com');
  await jar.setCookie('locale=nl-NL', 'https://www.therow.com');
  await jar.setCookie('currency=EUR', 'https://www.therow.com');

  const client = wrapper(
    axios.create({
      jar,
      withCredentials: true,
      timeout: 30000,
      maxRedirects: 5,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36',
        'Accept-Language': 'en-NL,en;q=0.9',
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Upgrade-Insecure-Requests': '1',
      },
      validateStatus: () => true,
    }),
  );

  try {

    let res = await client.get(visitUrl);

    let finalUrl =
      res.request?.res?.responseUrl ||
      res.config?.url ||
      visitUrl;

    if (finalUrl.includes('/ko-kr/')) {
      const correctedUrl = finalUrl.replace('/ko-kr/', '/ko-nl/');

      res = await client.get(correctedUrl);

      finalUrl =
        res.request?.res?.responseUrl ||
        res.config?.url ||
        correctedUrl;

    }

    if (res.status === 503) {
      console.warn(`⚠️ 503 감지 → 상품 업데이트 스킵 (휴식 후 종료)`);
      await new Promise(r =>
        setTimeout(r, 10000 + Math.random() * 5000),
      );
      return; // ✅ 여기서 끝
    }


    if (res.status !== 200 || !res.data) {
      throw new Error(`HTTP ${res.status}`);
    }

    const $ = cheerio.load(res.data);

    let finalPrice = 0;

    const priceText = $('.ProductMeta__PriceList.Heading .ProductMeta__Price')
      .first()
      .text()
      .trim();


    if (priceText) {
      let raw = priceText.replace(/[^\d,]/g, '');
      raw = raw.replace('.', '');
      raw = raw.replace(',', '.');

      finalPrice = Math.floor(parseFloat(raw));
    }

    const productJsonText = $('script[data-product-json]').html();
    const productJson = productJsonText ? JSON.parse(productJsonText) : null;

    let size: string | null = null;

    if (productJson?.product?.variants) {
      const sizes = productJson.product.variants
        .filter(v => v.available === true)
        .map(v => v.option2)
        .filter(Boolean);

      size = sizes.length
        ? [...new Set(sizes)].join(', ')
        : null;

      // 👉 사이즈가 없으면 그때만 원사이즈 판단
      if (!size) {
        const addToCartText = $('button.ProductForm__AddToCart').text().trim();
        size = addToCartText.includes('선주문') ? '선주문' : '원사이즈';
      }
    }


    const soldOut = !finalPrice || !size || size.length === 0;

    if (!soldOut) {
      product.lastModifiedDate = new Date();
      product.price = finalPrice;
      product.size = size;
      await this.productRepository.save(product);
    }

    const xmlUrl = await this.r2Service.uploadXmlToR2Update(
      product,
      product.styleId,
      partnerKey,
      soldOut,
    );

    if (!xmlUrl) {
      console.error(`❌ XML 업로드 실패 → ${product.designer} ${product.title}`);
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
    });

    await this.godoMallService.deleteUpdateXml(xmlUrl);

    console.log(`✅ The Row 상품 업데이트 완료`);
  } catch (err: any) {
    console.warn(`🚨 Therow axios 업데이트 실패: ${err.message}`);
  }
}

}