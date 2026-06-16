// import { Injectable } from '@nestjs/common';
// import { InjectRepository } from '@nestjs/typeorm';
// import puppeteer, { Page, Browser } from 'puppeteer';
// import { GodoMallService } from 'src/godomall/godomall.service';
// import { Repository } from 'typeorm';
// import { R2Service } from '../cloudflare/r2.service';
// import * as fs from 'fs';
// import { CettireProduct } from 'src/product/cettireproduct.entity';
// import { CettireMapping } from 'src/mapping/cettirechmapping.entity';
// import { SmartstoreService } from 'src/smartstore/smartstore.service';

// interface CettireUrls {
//     categories: string[];
//     designers: string[];
// }

// interface CettireResult {
//     categories: { name: string; afterCategory: string, url: string;}[];
//     designers: { name: string, afterDesigner: string }[]; // 디자이너의 이름과 코드 포함
// }

// function loadProxies(): string[] {
//   const filePath = '\\\\CHANMIN\\Desktop\\CleanIP(유료프록시).txt';
//   const fileContent = fs.readFileSync(filePath, 'utf-8');
//   return fileContent.split('\n').map(line => line.trim()).filter(line => line.length > 0);
// }

// function getRandomProxy(proxies: string[]): string {
//     const randomIndex = Math.floor(Math.random() * proxies.length);
//     return proxies[randomIndex];
//   }
  
  
//   @Injectable()
//   export class CettireService {
//     constructor(
//       @InjectRepository(CettireProduct)
//       private readonly productRepository: Repository<CettireProduct>,
//       private readonly godoMallService: GodoMallService,
//       private readonly r2Service: R2Service,
//       private readonly smartstoreService: SmartstoreService,
//       @InjectRepository(CettireMapping) // 매핑된 카테고리
//       private readonly cettiremappingRepository: Repository<CettireMapping>,
         
//     ) {}
  
//   // 자동 스크롤 함수
//   private async autoScroll(page: Page) {
//       await page.evaluate(async () => {
//           let totalHeight = 0;
//           const distance = 1200; // 스크롤할 거리
//           const interval = 50;  // 스크롤 간격 (밀리초)
  
//           await new Promise<void>(resolve => {
//               const timer = setInterval(() => {
//                   window.scrollBy(0, distance); // 페이지를 스크롤
//                   totalHeight += distance;
  
//                   if (totalHeight >= document.body.scrollHeight) {
//                       clearInterval(timer); // 스크롤 완료 시 타이머 종료
//                       resolve(); // 프로미스 해결
//                   }
//               }, interval);
//           });
//       });
//   }
  
//   async processAfterCettireUrl(partnerKey: string, apiKey: string) {
//     console.log('시작: 매핑된 모든 엔티티 가져오기');
    
//     // 1. partnerKey와 apiKey에 맞는 매핑 엔티티 가져오기
//     const mappings = await this.cettiremappingRepository.find({
//         where: { partnerKey, apiKey },
//     });
//     console.log(`가져온 매핑 엔티티 수: ${mappings.length}`);

//     for (let i = 0; i < mappings.length; i++) {
//         const mapping = mappings[i];

//         const browser = await puppeteer.launch({
//             headless: true,
//             args: [
//                 '--disable-setuid-sandbox',
//                 '--remote-debugging-port=0',
//                 '--disable-gpu',
//                 '--disable-dev-shm-usage',
//                 '--disable-background-timer-throttling',
//                 '--disable-backgrounding-occluded-windows',
//                 '--disable-renderer-backgrounding',
//             ],
//         });

//         const page = await browser.newPage();
//         try {
//             await page.goto(mapping.baseUrl, { waitUntil: 'networkidle2' });

//             const pageDesigners = await page.evaluate(() => {
//                 const elements = document.querySelectorAll('div.VBlWriPnb6Fdf278CTmCJ li._28WlRGx-IQOoOVFl3rFtkK');
//                 return Array.from(elements).map(el => el.textContent?.trim() || '');
//             });
            
//             // 정규식 제거: 원본 그대로 비교
//             const storedDesigners = mapping.designers.split(',').map(designer => designer.trim());
            
//             // 대소문자 무시하고 원본 그대로 비교
//             const matchedDesigners = storedDesigners.filter(designer =>
//                 pageDesigners.some(pageDesigner =>
//                     pageDesigner.toLowerCase() === designer.toLowerCase() // 대소문자 무시 비교
//                 )
//             );
            
//             // 매칭된 디자이너 저장
//             if (matchedDesigners.length > 0) {
//                 mapping.afterDesigners = matchedDesigners.join(','); // 원본 그대로 저장
//                 await this.cettiremappingRepository.save(mapping);
//                 console.log(`${i + 1}/${mappings.length} baseUrl 저장 완료`);
//             } else {
//                 console.log(`${i + 1}/${mappings.length} 매칭된 디자이너가 없습니다.`);
//             }
//         } catch (error: any) {
//             console.error(`에러 발생 (매핑 ID: ${mapping.id}): ${(error as Error).message}`);
//         } finally {
//             await browser.close();
//         }
//     }
//     console.log('필터링 완료');
// }



  
  
  

//   // 세타이어 카테고리 및 브랜드 가져오기
// async cettireCategorys(urls: CettireUrls): Promise<CettireResult> {
//     // const proxies = loadProxies();
//     // let proxy = getRandomProxy(proxies);

//     const browser: Browser = await puppeteer.launch({ headless: true,
//         args: [
//             // `--proxy-server=${proxy}`,
//             '--remote-debugging-port=0',
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
//         ], });
//     const page: Page = await browser.newPage();
//     const encodeSpace = (text: string) => text.replace(/ /g, '%20')  // 공백을 '%20'로 변환
//     .replace(/\+/g, '%2B') // '+'를 '%2B'로 변환
//     .replace(/&/g, '%26')  // '&'를 '%26'로 변환
//     .replace(/'/g, '%27'); // 작은따옴표를 '%27'로 변환

//     const allCategories: { name: string; afterCategory: string; url: string }[] = [];
//     const allDesigners: { name: string; afterDesigner: string }[] = [];

//     try {
//         // Process categories
//         for (const categoryUrl of urls.categories) {
//             await page.goto(categoryUrl, { waitUntil: 'networkidle2' });

//             const categories = await page.evaluate(() => {
//                 const categoryElements = document.querySelectorAll<HTMLDivElement>(
//                     'div._2Ut4uulYdfi8e5-Sff17jU div._3DTLKcu5j34wHIXK7gmNgm'
//                 );

//                 return Array.from(categoryElements).map((el) => el.textContent?.trim() || '');
//             });

//             // 접두사 추가
//             let prefix = '';
//             if (categoryUrl.includes('/women')) {
//                 prefix = '여성 - ';
//             } else if (categoryUrl.includes('/men')) {
//                 prefix = '남성 - ';
//             } else if (categoryUrl.includes('/kids')) {
//                 prefix = '아동 - ';
//             }

//             if (categoryUrl.includes('clothing')) prefix += '의류 - ';
//             else if (categoryUrl.includes('shoes')) prefix += '신발 - ';
//             else if (categoryUrl.includes('bags')) prefix += '가방 - ';
//             else if (categoryUrl.includes('accessories')) prefix += '악세사리 - ';
//             else if (categoryUrl.includes('jewelry')) prefix += '주얼리 - ';
//             else if (categoryUrl.includes('watches')) prefix += '시계 - ';

//             categories.forEach((name) => {
//                 const afterCategory = encodeSpace(name);
//                 const modifiedCategoryUrl = categoryUrl.replace('/es/', '/kr/'); // '/es/'를 '/kr/'로 변경
//                 const url = `${modifiedCategoryUrl}?menu%5Bproduct_type%5D=${afterCategory}`;
//                 allCategories.push({ name: `${prefix}${name}`, afterCategory, url });
//             });
//         }

//         // Process designers
//         for (const designerUrl of urls.designers) {
//             await page.goto(designerUrl, { waitUntil: 'networkidle2' });

//             const designers = await page.evaluate(() => {
//                 const designerElements = document.querySelectorAll<HTMLAnchorElement>(
//                     'ul._32WfxZ6tvTGZYjClPU5Z4R li a'
//                 );

//                 return Array.from(designerElements).map((el) => el.textContent?.trim() || '');
//             });

//             designers.forEach((name) => {
//                 const afterDesigner = encodeSpace(name);
//                 allDesigners.push({ name, afterDesigner });
//             });
//         }
//     } catch (error: any) {
//         console.error(`Error during crawling: ${(error as Error).message}`);
//     } finally {
//         await browser.close();
//     }

//     return { categories: allCategories, designers: allDesigners };
// }
  
  
  
  
    
  
// // 세타이어 사이트 크롤링 시작
// async getProductsFromCategory(baseUrl: string, partnerKey: string, apiKey: string, godoMallCategoryCode: string, smartstoreCategoryCode?: string): Promise<void> {
// const serviceType = 'cettire';
// const proxies = loadProxies();
// let proxy = getRandomProxy(proxies);
// let browser: Browser | null = null;
// let page: Page | null = null;
// let productUrls: string[] = [];

// const category = await this.cettiremappingRepository.findOne({
//     where: { partnerKey: partnerKey, apiKey: apiKey, baseUrl: baseUrl },
// });

// const afterDesigners = category.afterDesigners?.split(',') || []; // 매핑된 afterDesigners
// let retryAttempts = 0; // 재시도 횟수 초기화
// try {
//     browser = await puppeteer.launch({
//         headless: true,
//         args: [
//             `--proxy-server=${proxy}`,
//             '--remote-debugging-port=0',
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
//         ],
//     });

//     page = await browser.newPage();
//     await page.setUserAgent(
//         'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
//     );
//     await page.setViewport({
//         width: 1800,
//         height: 800,
//     });
    
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

//     await page.goto(baseUrl, { waitUntil: 'networkidle2', timeout: 15000 });

//     // 'filterDesigner' 클릭
//     const filterClicked = await page.evaluate(() => {
//         const designerClick = document.querySelector('h4.j9vRkKCxL1ndGZfbcbo_5');
//         if (designerClick instanceof HTMLElement) {
//             designerClick.scrollIntoView(); // 요소 스크롤
//             designerClick.click(); // 클릭
//             return true;
//         }
//         return false;
//     });

//     if (!filterClicked) {
//         console.log("필터 디자이너 버튼을 찾을 수 없습니다.");
//         return; // 버튼 클릭 실패 시 종료
//     }

//     console.log("필터 디자이너 버튼 클릭 완료!");

//     // 필터 메뉴가 열릴 때까지 3초 대기
//     await new Promise((resolve) => setTimeout(resolve, 2000)); // 모든 클릭이 완료된 후 대기

//     // 매핑된 디자이너와 일치하는 요소 클릭
//     const designersClicked = new Set(); // 중복 클릭 방지

//     for (const designer of afterDesigners) {
//         const clicked = await page.evaluate((designer) => {
//             const elements = Array.from(document.querySelectorAll('li._28WlRGx-IQOoOVFl3rFtkK'));
    
//             for (const element of elements) {
//                 // 대소문자를 무시한 비교
//                 if (element.textContent?.trim().toLowerCase() === designer.toLowerCase()) { 
//                     (element as HTMLElement).click(); // 클릭
//                     return true;
//                 }
//             }
//             return false; // 일치하는 요소 없음
//         }, designer);
    
//         if (clicked) {
//             designersClicked.add(designer); // 클릭한 디자이너 추가
//             console.log(`클릭 완료: ${designer}`);
//             await new Promise((resolve) => setTimeout(resolve, 3000)); // 클릭 후 3초 대기
//         } else {
//             console.log(`일치하는 디자이너 없음: ${designer}`);
//         }
//     }

//     console.log(`클릭 완료된 디자이너 목록: ${Array.from(designersClicked).join(', ')}`);

//     while (true) {
//         try {

//             // 스크롤을 페이지 끝까지 내림
//             await this.autoScroll(page);

//             // 현재 페이지에서 상품 URL 및 차단 여부 평가
//             const { currentPageProductUrls, isBlocked, hasMoreButton } = await page.evaluate(() => {
//                 const productUrls = Array.from(
//                     document.querySelectorAll<HTMLAnchorElement>('div._3kWsUD-sruWkbllx1UtLKW a')
//                 ).map((link) => link.href);

//                 const bodyText = document.querySelector('body')?.textContent || '';
//                 const isBlocked =
//                     document.querySelector('div._3kWsUD-sruWkbllx1UtLKW a') === null &&
//                     (bodyText.includes('Access Denied') ||
//                         bodyText.includes('Too Many Requests') ||
//                         bodyText.includes('429') ||
//                         bodyText.includes('Enforced timeout') ||
//                         bodyText.includes('net::ERR_TIMED_OUT'));

//                 const moreButton = document.querySelector('button._2_uoPWn988k7K6vk5euW2G');
//                 const hasMoreButton = moreButton !== null;

//                 return { currentPageProductUrls: productUrls, isBlocked, hasMoreButton };
//             });

//             if (isBlocked) {
//                 console.warn("페이지가 차단되었습니다. 프록시를 변경하여 다시 시도합니다.");
//                 proxy = getRandomProxy(proxies); // 새로운 프록시 설정
//                 // 기존 브라우저와 페이지 닫기
//                 if (page && !page.isClosed()) {
//                     await page.close();
//                 }
//                 if (browser) {
//                     await browser.close();
//                 }
//                 retryAttempts++;
//                 if (retryAttempts >= 30) {
//                     throw new Error("30회 재시도 초과 - 크롤링 종료");
//                 }
//                 // 새로운 브라우저와 페이지 생성
//                 browser = await puppeteer.launch({
//                     headless: true,
//                     args: [
//                         `--proxy-server=${proxy}`,
//                         '--remote-debugging-port=0',
//                         '--no-sandbox',
//                         '--disable-setuid-sandbox',
//                         '--disable-dev-shm-usage',
//                         '--disable-background-timer-throttling',
//                         '--disable-backgrounding-occluded-windows',
//                         '--disable-renderer-backgrounding',
//                         '--disable-session-crashed-bubble',
//                         '--no-first-run',
//                         '--disable-accelerated-2d-canvas',
//                         '--noerrdialogs',
//                     ],
//                 });
//                 page = await browser.newPage();
//                 await page.setUserAgent(
//                     'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
//                 );
//                 await page.setCacheEnabled(false);
//                 await page.setRequestInterception(true);
//                 page.on('request', (request) => {
//                     const resourceType = request.resourceType();
//                     if (resourceType === 'image' || resourceType === 'font') {
//                         request.abort(); // 이미지와 폰트 요청 차단
//                     } else {
//                         request.continue(); // 나머지 요청은 진행
//                     }
//                 });
//                 await page.goto(baseUrl, { waitUntil: 'networkidle2', timeout: 15000 });
//                 continue;
//             }

//             if (currentPageProductUrls.length === 0) {
//                 console.log("더 이상 상품이 없습니다. 반복문을 종료합니다.");
//                 break;
//             }



//             // 더보기 버튼 클릭
//             if (hasMoreButton) {
//                 console.log("더보기 버튼이 감지되었습니다. 클릭 후 대기합니다.");
//                 await page.click('button._2_uoPWn988k7K6vk5euW2G');
//                 await new Promise((resolve) => setTimeout(resolve, 2000)); // UI 업데이트를 기다림
//             } else {
//                 console.log("더 이상 더보기 버튼이 없습니다.");
//                 productUrls = productUrls.concat(currentPageProductUrls);
//                 break;
//             }
//         } catch (error: any) {
//             console.error(`에러 발생: ${(error as Error).message}`);
//             if ((error as Error).message.includes('Enforced timeout') ||
//                 (error as Error).message.includes('Navigation timeout') || 
//                 (error as Error).message.includes('net::ERR_TIMED_OUT')) { 
//                 console.error("Enforced timeout,Navigation timeout,ERR_TIMED_OUT 문제가 발생했습니다. 브라우저를 재시작합니다.");
//                 if (browser) {
//                     try {
//                         // 기존 브라우저와 페이지 닫기
//                         if (page && !page.isClosed()) {
//                             await page.close();
//                         }
//                         if (browser) {
//                             await browser.close();
//                         }
//                         // 새로운 브라우저와 페이지 생성
//                         browser = await puppeteer.launch({
//                             headless: true,
//                             args: [
//                                 `--proxy-server=${proxy}`,
//                                 '--remote-debugging-port=0',
//                                 '--no-sandbox',
//                                 '--disable-setuid-sandbox',
//                                 '--disable-dev-shm-usage',
//                                 '--disable-background-timer-throttling',
//                                 '--disable-backgrounding-occluded-windows',
//                                 '--disable-renderer-backgrounding',
//                                 '--disable-session-crashed-bubble',
//                                 '--no-first-run',
//                                 '--disable-accelerated-2d-canvas',
//                                 '--noerrdialogs',
//                             ],
//                         });
//                         page = await browser.newPage();
//                         await page.setUserAgent(
//                             'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
//                         );
//                         await page.setCacheEnabled(false);
//                         await page.setRequestInterception(true);
//                         page.on('request', (request) => {
//                             const resourceType = request.resourceType();
//                             if (resourceType === 'image' || resourceType === 'font') {
//                                 request.abort(); // 이미지와 폰트 요청 차단
//                             } else {
//                                 request.continue(); // 나머지 요청은 진행
//                             }
//                         });
//                     } catch (closeError: any) {
//                         console.warn("브라우저 종료 중 추가 오류:", close(error as Error).message);
//                     }
//                 }
//                 proxy = getRandomProxy(proxies); // 새로운 프록시 설정
//                 retryAttempts++;
//                 if (retryAttempts >= 30) {
//                     throw new Error("30회 재시도 초과 - 크롤링 종료");
//                 }
//                 continue; // 루프를 다시 시작
//             } else {
//                 throw error; // 예상치 못한 에러는 상위로 전달
//             }
//         }
//     }
// } finally {
//     // 모든 작업 종료 시 브라우저 닫기
//     if (page && !page.isClosed()) {
//       await page.close();
//     }
//     if (browser) {
//       await browser.close();
//     }
//   }

// if (productUrls.length === 0) {
//     throw new Error('상품 URL을 수집하지 못했습니다. 모든 시도가 실패했습니다.');
// }
// console.log(`최종 수집된 상품 URL 수: ${productUrls.length} - ${category?.categoryName || '카테고리 없음'}`);

// // 상품 URL 접속 전 요청 차단 해제 또는 재설정
// await page.setCacheEnabled(false);
// await page.setRequestInterception(false); // 모든 차단 규칙 해제
// page.removeAllListeners('request'); // 기존 이벤트 핸들러 제거

// for (const [index, productUrl] of productUrls.entries()) {
//     let loadAttempts = 0;
//     let success = false;

//     while (loadAttempts < 10) {
//         try {
//         await page.goto(productUrl, { waitUntil: 'networkidle2', timeout: 15000 });
//         console.log(`(${index + 1}/${productUrls.length}) 수집 중`);
//             success = true;
//             break; // 로딩 성공 시 루프 종료
//         } catch (error: any) {
//             loadAttempts++;
//             console.warn(`페이지 로드 실패 (프록시 변경 ${loadAttempts}/10): ${(error as Error).message}`);
//             if (loadAttempts < 10) {
//                 proxy = getRandomProxy(proxies);
//                 console.log(`새로운 프록시로 변경: ${proxy}`);
//                 if (page && !page.isClosed()) {
//                     await page.close();
//                 }
//                 if (browser) {
//                     await browser.close();
//                 }
//                 browser = await puppeteer.launch({
//                     headless: true,
//                     args: [
//                         `--proxy-server=${proxy}`,
//                         '--remote-debugging-port=0',
//                         '--no-sandbox',
//                         '--disable-setuid-sandbox',
//                         '--disable-dev-shm-usage',
//                         '--disable-background-timer-throttling',
//                         '--disable-backgrounding-occluded-windows',
//                         '--disable-renderer-backgrounding',
//                         '--disable-session-crashed-bubble',
//                         '--no-first-run',
//                         '--disable-accelerated-2d-canvas',
//                         '--noerrdialogs',
//                     ],
//                 });
//                 page = await browser.newPage();
//                 await page.setUserAgent(
//                     'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
//                 );
//                 await page.setCacheEnabled(false);
//                 await page.setRequestInterception(false); // 요청 차단 해제
//                 page.removeAllListeners('request'); // 기존 핸들러 제거
//                 continue;
//             } else {
//                 console.error('최대 로드 시도 초과 - 다음 URL로 이동합니다.');
//                 break;
//             }
//         }
//     }

    
//     const productDetails = await page.evaluate(async () => {
//         const site = 'cettire';

//         // **재고 상태 확인** - "재고 입고 시 알림" 버튼이 있는지 검사
//         const outOfStockButton = document.querySelector('div._33mdGpi_dgnH0bsLcZZhnR button.U_od70v-xtakRMkXKPWa6');
//         if (outOfStockButton && outOfStockButton.textContent?.trim() === '재고 입고 시 알림') {
//             return null; // 재고 없음 -> null 반환
//         }

//         // 디자이너와 타이틀 정보
//         const designerElement = document.querySelector('#product-detail--vendor-link');
//         const titleElement = document.querySelector('#product-detail--title');
//         const designer = designerElement ? designerElement.textContent?.trim() || 'Unknown' : 'Unknown';
//         const title = titleElement ? titleElement.textContent?.trim() || 'Unknown' : 'Unknown';
    
//         // 기본 가격
//         const priceElement = document.querySelector('#product-detail--price');
//         const price = priceElement
//             ? parseInt(priceElement.textContent.replace(/[^0-9]/g, ''), 10)
//             : 0;
    
//         // 이미지 URL 가져오기
//         const container = document.querySelector(
//             '.swiper-container.swiper-container-initialized.swiper-container-horizontal.swiper-container-pointer-events._vw97qz9r5OOF2eCm-9Pb'
//         ) as HTMLElement | null;            // swiper-slide 내부의 모든 img 요소 추출
//         const imageUrls = container
//         ? Array.from(container.querySelectorAll<HTMLImageElement>('.swiper-slide picture img'))
//               .map(img => img.src)
//               .slice(1, -1)
//         : [];


//         // 현재 URL에서 styleId 추출
//         const currentUrl = window.location.href; // 현재 페이지의 URL
//         const styleIdMatch = currentUrl.match(/\/products\/[^\/]+-([0-9]+)(?:\/|$)/); // "/products/" 이후 "-"로 구분된 숫자를 찾음
//         const styleId = styleIdMatch ? styleIdMatch[1] : 'Unknown';
    
//         // mainInfo (치수 및 사양)
//         const mainInfoBlock = document.querySelector('div.lc0cBYu9dqSeY--odA-DQ._1mSjbiRtjceyYSUsC1gjW6 div[style="display: block;"]');
//         const mainInfoHeader = mainInfoBlock?.querySelector('.VNU9qXeL96LyEtMHO2_hj')?.textContent.trim() || '';
//         const mainInfoDetails = mainInfoBlock?.querySelector('._3csgcokkLIL6WO9FCmWmQ4')?.innerHTML.trim() || '';
//         const mainInfo = `${mainInfoHeader}<br/>${mainInfoDetails}`;
    
//         // brandstyleId 추출 (디자이너 모델 번호 이후 값)
//         const brandstyleIdMatch = mainInfoDetails.match(/디자이너 모델 번호:\s*([a-zA-Z0-9]+)/);
//         const brandstyleId = brandstyleIdMatch ? brandstyleIdMatch[1] : 'Unknown';

//         // **color 값 추출 (디자이너 색상 또는 디자이너 컬러 이후 값)**
//         const colorMatch = mainInfoDetails.match(/디자이너 (?:색상|컬러):\s*([가-힣a-zA-Z0-9\s]+)/);
//         const color = colorMatch ? colorMatch[1].trim() : 'Unknown';
    
//         // 사이즈 및 추가 옵션 가격
//         const sizeElements = document.querySelectorAll('#product-detail--size-list ul li');
//         let sizesWithPrices = [];
    
//         if (sizeElements.length > 0) {
//             for (const el of sizeElements) {
//                 const sizeSpan = el.querySelector('span'); // 사이즈 텍스트
//                 const sizeText = sizeSpan ? sizeSpan.textContent.trim() : 'Unknown';
//                 const statusSpan = el.querySelector('._1sImFqCLafP2558CS0-NlL'); // 상태 텍스트
//                 const statusText = statusSpan ? statusSpan.textContent.trim() : '';
    
//                 if (statusText === '품절' || sizeText === 'Unknown') {
//                     continue; // '품절' 상태이거나 사이즈가 'Unknown'인 경우 건너뜀
//                 }
    
//                 (el as HTMLElement).click(); // 사이즈 클릭
//                 await new Promise((resolve) => setTimeout(resolve, 1000)); // UI 업데이트를 기다림
    
//                 const updatedPriceElement = document.querySelector('#product-detail--price');
//                 const updatedPrice = updatedPriceElement
//                     ? parseInt(updatedPriceElement.textContent.replace(/[^0-9]/g, ''), 10)
//                     : price;
    
//                 const addoptionprice = updatedPrice - price;
    
//                 sizesWithPrices.push({
//                     size: sizeText,
//                     addoptionprice: addoptionprice,
//                 });
//             }
//         }
    
//         const sizeString = sizesWithPrices.length > 0 
//             ? sizesWithPrices.map(entry => entry.size).join(', ') 
//             : '원사이즈';
    
//         const addoptionpriceString = sizesWithPrices.length > 0 
//             ? sizesWithPrices.map(entry => entry.addoptionprice).join(', ') 
//             : '0';
    
//         // 최종 데이터 반환
//         return {
//             site,
//             designer,
//             title,
//             price,
//             mainInfo,
//             styleId,
//             color,
//             brandstyleId,
//             imageUrls,
//             size: sizeString,
//             addoptionprice: addoptionpriceString,
//         };
//     });
    
    
// // 이미지가 없는 경우 상품을 건너뜀
// if (!productDetails || productDetails.imageUrls.length === 0) {
// if (loadAttempts < 2) {
//     console.log('이미지가 없는 상품입니다. 프록시 변경 후 다시 시도합니다.');
    
//     // 프록시 변경
//     proxy = getRandomProxy(proxies);
//     console.log(`새로운 프록시로 변경: ${proxy}`);
    
//     // 기존 브라우저와 페이지 닫기
//     if (page && !page.isClosed()) {
//         await page.close();
//     }
//     if (browser) {
//         await browser.close();
//     }

//     // 새로운 브라우저와 페이지 생성
//     browser = await puppeteer.launch({
//         headless: true,
//         args: [
//             `--proxy-server=${proxy}`,
//             '--remote-debugging-port=0',
//             '--no-sandbox',
//             '--disable-setuid-sandbox',
//             '--disable-dev-shm-usage',
//             '--disable-background-timer-throttling',
//             '--disable-backgrounding-occluded-windows',
//             '--disable-renderer-backgrounding',
//             '--disable-session-crashed-bubble',
//             '--no-first-run',
//             '--disable-accelerated-2d-canvas',
//             '--noerrdialogs'
//         ]
//     });
//     page = await browser.newPage();
//     await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
//     await page.setCacheEnabled(false);
//     await page.setRequestInterception(false); // 요청 차단 해제
//     page.removeAllListeners('request'); // 기존 핸들러 제거
//     // 동일한 productUrl로 다시 접속
//     try {
//         await page.goto(productUrl, { waitUntil: 'networkidle2', timeout: 15000 });
//     } catch (error: any) {
//         console.warn(`프록시 변경 후에도 페이지 로드 실패: ${(error as Error).message}`);
//         continue; // 동일 URL 재시도 실패 시 다음 URL로 이동
//     }
//     continue; // 동일 productUrl로 재시도 완료
// } else {
//     console.log('이미지가 없는 상품입니다. 다음 productUrl로 이동합니다.');
//     continue; // 다음 productUrl로 이동
// }
// }
//         // 카테고리 매핑 데이터 찾기
//         const categoryMapping = await this.cettiremappingRepository.findOne({ where: { baseUrl } });
//         if (!categoryMapping) {
//             throw new Error('매핑된 카테고리를 찾을 수 없습니다.');
//         }

//         const existingProduct = await this.productRepository.findOne({ where: {
//         styleId: productDetails.styleId,
//         partnerKey: partnerKey, 
//         apiKey: apiKey
//         }
//         });
//         if (existingProduct) {
//         // 이미 존재하는 상품이므로 업데이트를 해야 함
//         console.log(`상품 업데이트: ${productDetails.title} - styleID: ${productDetails.styleId}`);
        
//         // 상품 정보를 업데이트 (기존 데이터베이스 업데이트)
//         existingProduct.godoMallCategoryCode = godoMallCategoryCode;
//         // existingProduct.title = productDetails.title;
//         existingProduct.designer = productDetails.designer;
//         existingProduct.size = productDetails.size;
//         existingProduct.price = productDetails.price;
//         existingProduct.mainInfo = productDetails.mainInfo;
//         existingProduct.addoptionprice = productDetails.addoptionprice;
//         existingProduct.partnerKey = partnerKey;
//         existingProduct.apiKey = apiKey;
//         existingProduct.color = productDetails.color;
//         existingProduct.touched = true;

//         if (godoMallCategoryCode) {
//             existingProduct.platform = 'godomall';
//         } else if (smartstoreCategoryCode) {
//             existingProduct.platform = 'smartstore';
//         }

//         await this.productRepository.save(existingProduct);
//         // ✅ 고도몰 등록
//         if (godoMallCategoryCode) {
//         const xmlUrl = await this.r2Service.uploadXmlToR2ByService( existingProduct.styleId, existingProduct, godoMallCategoryCode, existingProduct.mainImageUrl, existingProduct.additionalImageUrls, partnerKey);
//         await this.godoMallService.registerProductWithXmlUrl(partnerKey, apiKey, xmlUrl, existingProduct, existingProduct.styleId);
//         }

//         // ✅ 스마트스토어 등록
//         if (smartstoreCategoryCode) {
//             await this.handleSmartstoreRegistration(existingProduct, partnerKey, apiKey);
//         }

//     } else {
//         // 새 상품이므로 기존 로직으로 등록 진행
//         const newProduct = this.productRepository.create(productDetails);
//         newProduct.godoMallCategoryCode = godoMallCategoryCode;
//         newProduct.mainImageUrl = productDetails.imageUrls[0];
//         newProduct.additionalImageUrls = productDetails.imageUrls.slice(1); // 추가 이미지들 저장
//         newProduct.touched = true;
//         newProduct.categoryName = categoryMapping.categoryName;
//         newProduct.customId = customId;
//         newProduct.accountPlatform = accountPlatform;
//         newProduct.baseUrl = baseUrl;
//         newProduct.color = productDetails.color;


//         await this.productRepository.save(newProduct);

//         console.log(`상품 저장 완료: ${productDetails.title}`);
//         // ✅ 고도몰 등록
//         if (godoMallCategoryCode) {
//             const xmlUrl = await this.r2Service.uploadXmlToR2ByService(newProduct.styleId, newProduct, godoMallCategoryCode, newProduct.mainImageUrl, newProduct.additionalImageUrls, partnerKey);
//             await this.godoMallService.registerProductWithXmlUrl(partnerKey,apiKey,xmlUrl, newProduct, newProduct.styleId);
//             newProduct.platform = 'godomall';
//         }
//         // ✅ 스마트스토어 등록
//         if (smartstoreCategoryCode) {
//             await this.handleSmartstoreRegistration(newProduct, partnerKey, apiKey);
//             newProduct.platform = 'smartstore';
//         }
//         }
//     } 
//     if (page && !page.isClosed()) {
//     await page.close();
//     }
//     if (browser) {
//     await browser.close();
//     }
//     if (godoMallCategoryCode) {
//         // 크롤링 작업 후 품절 처리 실행
//         await this.handleUnsoldProducts(baseUrl,partnerKey,apiKey); // 품절 처리
//         await this.godoMallService.finalizeXmlDeletion(); // 추가된 호출
//     } else if (smartstoreCategoryCode) {
//         await this.handleUnsoldSmartstoreProducts(baseUrl, partnerKey, apiKey);
//     }
// }

// async handleUnsoldProducts(baseUrl: string,partnerKey: string,apiKey: string) {
//     const unsoldProducts = await this.productRepository.find({
//     where: { touched: false, baseUrl, partnerKey, apiKey, platform: 'godomall' } 
//     });

//     if (unsoldProducts.length === 0) {
//     console.log(`품절 처리할 상품이 없습니다: ${baseUrl}`);
//     } else {
//     // 2. 품절 처리 로직
//     for (const product of unsoldProducts) {
//         // 기본 카테고리 코드 정의

//         // XML 파일 생성 (품절 처리)
//         const xmlUrl = await this.r2Service.uploadXmlToR2(
//         product.styleId,
//         product,
//         
//         product.mainImageUrl, // product에서 바로 가져옴
//         product.additionalImageUrls, // 추가 이미지들 사용
//         partnerKey
//         );
    
//         // 고도몰 API로 품절 처리 요청 전송
//         await this.godoMallService.registerProductWithXmlUrl(partnerKey,apiKey,xmlUrl, product, product.styleId);
    
//         console.log(`품절 처리 완료: ${product.title} (styleId: ${product.styleId})`);
//     }
//     }

//     // 3. 해당 카테고리와 일치하는 모든 상품들의 touched 상태를 false로 초기화
//     try {
//     const updateResult = await this.productRepository.update(
//         { baseUrl, partnerKey, apiKey }, // 해당 카테고리의 상품들만 필터링
//         { touched: false } // touched를 false로 초기화
//     );

//     // 4. 초기화 완료 로그 출력
//     console.log(`해당 카테고리 (${baseUrl})의 모든 상품의 touched 상태가 false로 초기화되었습니다.`);
//     console.log('업데이트된 행 수:', updateResult.affected); // 업데이트된 행 수 로그 출력

//     } catch (error: any) {
//     // 초기화 중 에러 발생 시 로그 출력
//     console.error(`touched 상태 초기화 중 오류 발생: ${baseUrl}`, (error as Error).message);
//     }
// }

// async handleUnsoldSmartstoreProducts(baseUrl: string, partnerKey: string, apiKey: string) {
//     const unsoldProducts = await this.productRepository.find({
//         where: { touched: false, baseUrl, partnerKey, apiKey, platform: 'SMARTSTORE' }
//     });

//     if (unsoldProducts.length === 0) {
//         console.log(`📌 스마트스토어에서 삭제할 상품이 없습니다: ${baseUrl}`);
//         return;
//     }

//     console.log(`🗑️ 스마트스토어 상품 삭제 시작 (총 ${unsoldProducts.length}개)`);

//     for (const product of unsoldProducts) {
//         if (!product.smartstoreChannelProductNo) {
//             console.warn(`⚠️ smartstoreChannelProductNo가 없어 삭제할 수 없습니다: ${product.title}`);
//             continue;
//         }

//         try {
//             const channelProductNo = product.smartstoreChannelProductNo; // ✅ 이걸로 API 요청
//             await this.smartstoreService.deleteProduct(
//                 { smartStoreID: partnerKey, smartStoreSecret: apiKey },
//                 channelProductNo
//             );
//             console.log(`✅ 스마트스토어 상품 삭제 완료: ${product.title} (channelProductNo: ${channelProductNo})`);

//             // 📌 DB에서도 삭제
//             await this.productRepository.remove(product);
//         } catch (error: any) {
//             console.error(`❌ 스마트스토어 상품 삭제 실패: ${product.title} - ${(error as Error).message}`);
//         }
//     }

//     console.log(`🚀 스마트스토어(${baseUrl})의 모든 품절 상품 삭제 완료`);
// }



// async handleSmartstoreRegistration(
//     product: CettireProduct, 
//     partnerKey: string, 
//     apiKey: string, 
//     smartstoreCategoryCode?: string // 스마트스토어 카테고리 코드 추가
// ) {
//     const smartstoreAuth = {
//         smartStoreID: partnerKey, // 로그인한 사용자의 CLIENT_ID
//         smartStoreSecret: apiKey, // 로그인한 사용자의 SECRET
//     };

//     if (!smartstoreCategoryCode) {
//         console.warn(`⚠️ 스마트스토어 카테고리 코드가 없습니다. 상품 등록을 건너뜁니다: ${product.title}`);
//         return;
//     }

//     if (product.smartstoreChannelProductNo) {
//         console.log(`🔄 스마트스토어 상품 업데이트: ${product.title}`);
//         await this.smartstoreService.updateProduct(
//             smartstoreAuth, 
//             product.smartstoreChannelProductNo.toString(),
//             {
//                 originProduct: {
//                     name: product.title,
//                     salePrice: product.price,
//                     stockQuantity: 100,
//                     detailContent: product.mainInfo,
//                     images: {
//                         representativeImage: { url: product.mainImageUrl },
//                         optionalImages: product.additionalImageUrls.map(url => ({ url })),
//                     },
//                     detailAttribute: {
//                         optionInfo: {
//                             useStockManagement: true,
//                             optionCombinations: product.size.split(',').map((size, index) => ({
//                                 optionName1: size.trim(),
//                                 price: product.addoptionprice.split(',')[index] || '0',
//                                 stockQuantity: 100,
//                             })),
//                         },
//                     },
//                 },
//             }
//         );
//     } else {
//         console.log(`🆕 스마트스토어 신규 등록: ${product.title}`);
//         const response = await this.smartstoreService.createProduct(smartstoreAuth, {
//             originProduct: {
//                 statusType: 'SALE',
//                 leafCategoryId: smartstoreCategoryCode, // 로그인한 사용자의 스마트스토어 카테고리 ID
//                 name: product.title,
//                 salePrice: product.price,
//                 stockQuantity: 100,
//                 detailContent: product.mainInfo,
//                 images: {
//                     representativeImage: { url: product.mainImageUrl },
//                     optionalImages: product.additionalImageUrls.map(url => ({ url })),
//                 },
//                 detailAttribute: {
//                     optionInfo: {
//                         useStockManagement: true,
//                         optionCombinations: product.size.split(',').map((size, index) => ({
//                             optionName1: size.trim(),
//                             price: product.addoptionprice.split(',')[index] || '0',
//                             stockQuantity: 100,
//                         })),
//                     },
//                 },
//             },
//         });

//         if (response?.smartstoreChannelProductNo) {
//             product.smartstoreChannelProductNo = response.smartstoreChannelProductNo;
//             product.platform = 'smartstore';
//             await this.productRepository.save(product);
//             console.log(`✅ 스마트스토어 상품 등록 완료: ${product.title} (smartstoreChannelProductNo: ${response.smartstoreChannelProductNo})`);
//         } else {
//             console.warn(`⚠️ 스마트스토어 상품 등록 실패: ${product.title}`);
//         }
//     }
// }

// }


