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
//   'maisonmargiela'
// );

// // 폴더 없으면 생성
// if (!fs.existsSync(errorLogDir)) {
//   fs.mkdirSync(errorLogDir, { recursive: true });
// }

// // 최종 로그 파일 경로
// const errorLogPath = path.join(errorLogDir, 'maisonmargiela_error_log.txt');

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
export class MaisonmargielaService {
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
            headless: true,
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
  
            const categories: { categoryName: string; url: string }[] = await page.evaluate(() => {
              const configs = [
                // ===== MM =====
                {
                  selector:
                    '[data-category-id="mm-woman"] [id="mm-woman"] div.submenu-content ul.mm-menu__secondary__list li a[href]',
                  type: 'mm',
                  prefix: 'women',
                  urlRegex: /maison-margiela\/([^?#]+)/i,
                },
                {
                  selector:
                    '[data-category-id="mm-man"] [id="mm-man"] div.submenu-content ul.mm-menu__secondary__list li a[href]',
                  type: 'mm',
                  prefix: 'men',
                  urlRegex: /maison-margiela\/([^?#]+)/i,
                },

                // ===== MM6 =====
                {
                  selector:
                    '[data-category-id="mm6-woman"] [id="mm6-woman"] div.submenu-content ul.mm-menu__secondary__list li a[href]',
                  type: 'mm6',
                  prefix: 'mm6 women',
                  urlRegex: /mm6\/([^?#]+)/i,
                },
                {
                  selector:
                    '[data-category-id="mm6-man"] [id="mm6-man"] div.submenu-content ul.mm-menu__secondary__list li a[href]',
                  type: 'mm6',
                  prefix: 'mm6 men',
                  urlRegex: /mm6\/([^?#]+)/i,
                },
              ];

              const results: { categoryName: string; url: string }[] = [];

              configs.forEach(({ selector, prefix, urlRegex }) => {
                const anchors = Array.from(
                  document.querySelectorAll(selector)
                ) as HTMLAnchorElement[];

                anchors.forEach(anchor => {
                  const url = anchor.href;

                  // ❌ Featured 카테고리 제외 (MM / MM6 공통)
                  if (url.includes('/featured/')) return;

                  const match = url.match(urlRegex);
                  if (!match || !match[1]) return;

                  const parts = match[1].split('/').filter(Boolean);

                  // women/men + 중분류 + 소분류 이상만
                  if (parts.length < 3) return;

                  // MM: women - xxx - yyy
                  // MM6: mm6 women - xxx - yyy
                  const categoryName = `${prefix} - ${parts
                    .slice(1)
                    .join(' -')}`;

                  results.push({ categoryName, url });
                });
              });

              return results;
            });

  
            allCategories.push(...categories);
            console.log(`✅ 수집 완료: ${categories.length}개`);
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

  // Maisonmargiela 사이트 크롤링 시작
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
    const serviceType = 'Maisonmargiela';
    const proxyLines = await this.r2Service.loadBrightProxies2();
      if (!proxyLines.length) {
          console.warn('프록시 없음, 종료');
          return;
      }

    // 랜덤으로 1개 선택
    const raw = proxyLines[Math.floor(Math.random() * proxyLines.length)];
    const proxy = parseAuthProxy(raw);
    const proxyArg = `--proxy-server=http://${proxy.host}:${proxy.port}`;
    let browser: Browser | null = null;
    let page: Page | null = null;
    let productUrls: string[] = [];
    let designer = '';

    const category = await this.mappingRepository.findOne({
      where: { customId: customId, accountPlatform: accountPlatform, siteUrl: siteUrl },
  });

  try {
  browser = await puppeteer.launch({
    headless: true,
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
        const resourceType = request.resourceType();
        if (resourceType === 'image' || resourceType === 'font') {
            request.abort(); // 이미지와 폰트 요청 차단
        } else {
            request.continue(); // 나머지 요청은 진행
        }
    });

    const MAX_RETRY = 5; // 최대 재시도 횟수
    let retryAttempts = 0;

    while (retryAttempts < MAX_RETRY) {
        try {
            await page.goto(siteUrl, { waitUntil: 'networkidle2', timeout: 30000 });
            if (siteUrl.includes('/mm6/')) {
              designer = '메종마르지엘라 MM6';
            } else {
              designer = '메종마르지엘라';
            }
            await new Promise(resolve => setTimeout(resolve, 3000));
            break; // 성공하면 반복 종료
        } catch (error: any) {
            console.warn(`⚠️ 페이지 이동 실패 (시도 ${retryAttempts + 1}/${MAX_RETRY}): ${error.message}`);
            //logErrorToDesktop(error, `2.오류 발생`);

            retryAttempts++;

            if (page && !page.isClosed()) {
                await page.close();
            }
            if (browser) {
                await browser.close();
            }

            if (retryAttempts >= MAX_RETRY) {
                console.error(`❌ 최대 재시도 횟수 초과: ${siteUrl}`);
                //logErrorToDesktop(error, `3.오류 발생`);
                return; // 최대 재시도 횟수를 초과하면 함수 종료
            }

            browser = await puppeteer.launch({
                headless: true,
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
            page = await browser.newPage();
            await page.authenticate({
              username: proxy.username,
              password: proxy.password,
            });
            await page.setUserAgent(
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36'
              );
            await page.setViewport({ width: 1920, height: 1080 });

            // 다음 재시도를 위한 랜덤 대기 시간 (exponential backoff)
            const waitTime = Math.min(1000 * 2 ** retryAttempts, 10000); // 최대 10초 대기
            await new Promise((resolve) => setTimeout(resolve, waitTime));
        }
    }

    while (true) {
        try {
            // 현재 페이지에서 상품 URL 및 차단 여부 평가
            const { isBlocked, hasMoreButton} = await page.evaluate(() => {
                const bodyText = document.querySelector('body')?.textContent || '';

            const isBlocked =
                document.querySelector('body') === null &&
                (bodyText.includes('Access Denied') ||
                    bodyText.includes('Too Many Requests') ||
                    bodyText.includes('429') ||
                    bodyText.includes('Enforced timeout') ||
                    bodyText.includes('net::ERR_TIMED_OUT'));

            const moreButton = document.querySelector('button.button.button-load-more.js_button-load-more.pointer.mm-button.-sm.-outline');
            const hasMoreButton = moreButton !== null;

          return { isBlocked, hasMoreButton};
      });

      if (isBlocked) {
          console.warn("페이지가 차단되었습니다. 프록시를 변경하여 다시 시도합니다.");
          // 기존 브라우저와 페이지 닫기
          if (page && !page.isClosed()) {
              await page.close();
          }
          if (browser) {
              await browser.close();
          }
          retryAttempts++;
          if (retryAttempts >= 30) {
              throw new Error("30회 재시도 초과 - 크롤링 종료");
          }
          // 새로운 브라우저와 페이지 생성
          browser = await puppeteer.launch({
              headless: true,
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
          page = await browser.newPage();
          await page.authenticate({
            username: proxy.username,
            password: proxy.password,
          });
          await page.setUserAgent(
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36'
          );
          await page.setViewport({ width: 1920, height: 1080 });
          await page.goto(siteUrl, { waitUntil: 'networkidle2', timeout: 30000 });
          continue;
      }


        // 더보기 버튼 클릭
        if (hasMoreButton) {
            console.log("더보기 버튼 클릭 반복 시작...");
    
            while (true) {
            const hasMore = await page.evaluate(() => {
                const moreBtn = document.querySelector('button.button.button-load-more.js_button-load-more.pointer.mm-button.-sm.-outline') as HTMLElement;
                if (moreBtn) {
                moreBtn.click();
                return true;
                }
                return false;
            });
    
            if (!hasMore) {
                console.log("더보기 버튼이 사라졌습니다.");
                break;
            }
    
            await new Promise((resolve) => setTimeout(resolve, 2000)); // 클릭 후 대기
            }
            // ✅ 여기서 최신 상품 목록 다시 수집
      const allLoadedUrls = await page.evaluate(() => {
        return Array.from(
          document.querySelectorAll('[itemid="#product"] div.product div.single-element-content.product-tile > a[href]')
        ).map(a => (a as HTMLAnchorElement).href);
      });
    
      productUrls = allLoadedUrls;
      break;
    } else {    
      const firstPageUrls = await page.evaluate(() => {
        return Array.from(
          document.querySelectorAll('[itemid="#product"] div.product div.single-element-content.product-tile > a[href]')
        ).map(a => (a as HTMLAnchorElement).href);
      });
    
      productUrls = firstPageUrls;
      break;
    }
    } catch (error: any) {
      console.error(`에러 발생: ${error.message}`);
      //logErrorToDesktop(error, `4.오류 발생`);
      if (error.message.includes('Enforced timeout') ||
          error.message.includes('Navigation timeout') || 
          error.message.includes('net::ERR_TIMED_OUT')) { 
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
                  browser = await puppeteer.launch({
                      headless: true,
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
                  page = await browser.newPage();
                  await page.authenticate({
                    username: proxy.username,
                    password: proxy.password,
                  });
                  await page.setUserAgent(
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36'
                  );
                  await page.setViewport({ width: 1920, height: 1080 });
              } catch (closeError: any) {
                  console.warn("브라우저 종료 중 추가 오류:", closeError.message);
              }
          }
           
          retryAttempts++;
          if (retryAttempts >= 30) {
              throw new Error("30회 재시도 초과 - 크롤링 종료");
          }
          continue; // 루프를 다시 시작
      } else {
          throw error; // 예상치 못한 에러는 상위로 전달
      }
    }
  }
}
    finally {
    // // 모든 작업 종료 시 브라우저 닫기
    // if (page && !page.isClosed()) {
    // await page.close();
    // }
    // if (browser) {
    // await browser.close();
    // }
    }

    if (productUrls.length === 0) {
      throw new Error('상품 URL을 수집하지 못했습니다. 모든 시도가 실패했습니다.');
    }
    console.log(`메종마르지엘라 최종 수집된 상품 URL 수: ${productUrls.length} - ${category?.categoryName || '카테고리 없음'}`);

    // // 새로운 브라우저와 페이지 생성
    // browser = await puppeteer.launch({
    //     headless: true,
    //     args: [
    //         proxyArg,
    //         '--remote-debugging-port=0',
    //         '--no-sandbox',
    //         '--disable-setuid-sandbox',
    //         '--disable-dev-shm-usage',
    //         '--disable-background-timer-throttling',
    //         '--disable-backgrounding-occluded-windows',
    //         '--disable-renderer-backgrounding',
    //         '--disable-session-crashed-bubble',
    //         '--no-first-run',
    //         '--disable-accelerated-2d-canvas',
    //         '--noerrdialogs',
    //     ],
    // });
    // page = await browser.newPage();
    // await page.setUserAgent(
    //   'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36'
    // );
    
    // await page.setViewport({ width: 1920, height: 1080 });
    for (const [index, productUrl] of productUrls.entries()) {
      let loadAttempts = 0;
      let success = false;

      while (loadAttempts < 10) {
        try {
            await page.goto(productUrl, { waitUntil: 'networkidle2', timeout: 30000 });
            console.log(`✅ (${index + 1}/${productUrls.length}) 메종마르지엘라 ${category?.categoryName || '카테고리 없음'}  수집 중`);
            await new Promise((resolve) => setTimeout(resolve, 2000));
            success = true;
            break; // 로딩 성공 시 루프 종료
          } catch (error: any) {
              loadAttempts++;
              console.warn(`페이지 로드 실패 (프록시 변경 ${loadAttempts}/10): ${error.message}`);
              //logErrorToDesktop(error, `5.오류 발생`);
              if (loadAttempts < 10) {
                  
                  console.log(`새로운 프록시로 변경: ${proxy}`);
                  if (page && !page.isClosed()) {
                      await page.close();
                  }
                  if (browser) {
                      await browser.close();
                  }
                  browser = await puppeteer.launch({
                      headless: true,
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
                  page = await browser.newPage();
                  await page.authenticate({
                    username: proxy.username,
                    password: proxy.password,
                  });
                  await page.setUserAgent(
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36'
                  );
                  await page.setViewport({ width: 1920, height: 1080 });
                continue;
              } else {
                  console.error('최대 로드 시도 초과 - 다음 URL로 이동합니다.');
                  //logErrorToDesktop(error, `6.오류 발생`);
                  break;
              }
          }
      }



      const productDetails = await page.evaluate(async (designerFromNode) => {
        const site = 'Maisonmargiela';
        const designer = designerFromNode;
        const titleElement = document.querySelector('h1[class="title"]');
        const title = titleElement ? titleElement.textContent?.trim() || '' : '';
        const priceElement = document.querySelector<HTMLSpanElement>('div.prices div.price span .value');
        const price = priceElement ? parseFloat(priceElement.getAttribute('content') || '0') : 0;
        const selectedColor = document.querySelector('input.mm-color-swatch__inner.selected-color');
        const color = selectedColor?.getAttribute('data-display-value') || null;        

        
        
        // 먼저 첫 번째 슬라이더만 선택
        const swiperSelector =
          designer === '메종마르지엘라 MM6'
            ? 'div.image-carousel-col.product-brand-mm6 ul.swiper-wrapper'
            : 'div.image-carousel-col.product-brand-mm ul.swiper-wrapper';

        // 먼저 첫 번째 슬라이더만 선택
        const firstSwiper = document.querySelector(swiperSelector);
        const imageSlides = firstSwiper ? Array.from(firstSwiper.querySelectorAll('li.swiper-slide.product-slide')) : [];

        const imageUrls: string[] = imageSlides.map((slide) => {
        const img = slide.querySelector('img');
        if (!img) return '';

        const srcset = img.getAttribute('data-srcset') || img.getAttribute('srcset') || '';
        if (!srcset) return '';

        // srcset 파싱 → 각 항목: { url, size }
        const srcList = srcset.split(',').map(item => {
            const parts = item.trim().split(/\s+/);
            const url = parts[0];
            const size = parseInt(parts[1]) || 0;
            return { url, size };
        });

        // 1024w 항목 찾기
        const selectedItem = srcList.find(item => item.size === 1024);
        const chosenUrl = selectedItem ? selectedItem.url : '';

        // 필터링: mp4나 poster-video는 제외
        if (chosenUrl.includes('/images/is/poster-video/') || chosenUrl.endsWith('.mp4')) return '';

        return chosenUrl;
        }).filter(url => url !== '');
       


        let size;
        const sizeWrapper = document.querySelector('div.custom-select-wrap');

        if (!sizeWrapper) {
        // 사이즈 선택 영역이 없으면 원사이즈 제품
        size = '원사이즈';
        } else {
        // 재고 있는 사이즈만 추출
        const sizeList = Array.from(
            sizeWrapper.querySelectorAll<HTMLElement>('[data-attr-selectable="true"]')
        ).map(el => el.textContent?.trim() || '').filter(Boolean);

        if (sizeList.length === 0) {
            console.log("⚠️ 모든 사이즈가 품절입니다. 다음 상품으로 넘어갑니다.");
            return null;
        }

        size = sizeList
        .map(size => size.replace(',', '.'))
        .join(', ');
        }


        let mainInfo = '';
        // 📌 상품 설명
        const descriptionElement = document.querySelector('#product-description-content') as HTMLElement;
        const description = descriptionElement?.innerText.trim() || '';
        if (description) {
            mainInfo += `${description}\n\n`;
        }

        // 📌 Item Code
        const itemCodeElement = document.querySelector('#product-mfc');
        const itemCode = itemCodeElement?.textContent?.trim() || '';
        if (itemCode) {
            mainInfo += `${itemCode}\n\n`;
        }

        // 📌 상세 정보 (특성, 소재 등)
        const detailList = Array.from(document.querySelectorAll('.product-details-list'))
          .map(div => div.textContent.trim())
          .filter(Boolean)
          .flatMap(text => text.split('\n')) // 줄바꿈으로 나눠 각 줄 처리
          .map(line => line.trim())
          .filter(line => line.length > 0);

        if (detailList.length > 0) {
          detailList.forEach(detail => {
            mainInfo += `- ${detail}\n`;
          });
        }

        // ✅ 기존 스타일 유지: mainInfo에서 직접 추출
        const styleId = itemCode;
        const brandstyleId = itemCode;

        const madeInMatch = mainInfo.match(/- Made in\s+([^\n]+)/i);
        const madeIn = madeInMatch ? madeInMatch[1].trim() : '';


        return { site, designer, title, price, color, mainInfo, madeIn, styleId, size, brandstyleId, imageUrls };
      },designer );


      if (!productDetails || !productDetails.mainInfo || !productDetails.styleId || !productDetails.title || !productDetails.price || !productDetails.imageUrls.length || !productDetails.size || !productDetails.brandstyleId) {
        console.warn('메종마르지엘라 데이터 누락 - 다음 productUrl로 이동');
        continue; // 다음 productUrl로 이동
        }

      // 이미지가 없는 경우 상품을 건너뜀
      if (!productDetails || productDetails.imageUrls.length === 0) {
        if (loadAttempts < 2) {
            loadAttempts++;
            console.log('이미지가 없는 상품입니다. 프록시 변경 후 다시 시도합니다.');
            
            // 프록시 변경
            
            console.log(`새로운 프록시로 변경: ${proxy}`);
            
            // 기존 브라우저와 페이지 닫기
            if (page && !page.isClosed()) {
                await page.close();
            }
            if (browser) {
                await browser.close();
            }
        
            // 새로운 브라우저와 페이지 생성
            browser = await puppeteer.launch({
                headless: true,
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
                ]
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
            // 동일한 productUrl로 다시 접속
            try {
                await page.goto(productUrl, { waitUntil: 'networkidle2', timeout: 30000 });
            } catch (error: any) {
                console.warn(`프록시 변경 후에도 페이지 로드 실패: ${error.message}`);
                //logErrorToDesktop(error, `7.오류 발생`);
                continue; // 동일 URL 재시도 실패 시 다음 URL로 이동
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

  if (page && !page.isClosed()) {
    await page.close();
  }
  if (browser) {
    await browser.close();
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
          
              console.log(`메종마르지엘라 품절 처리 완료: ${product.title} (styleId: ${product.styleId})`);
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
        const proxy = pickProxy(proxyLines);
        const proxyArg = `--proxy-server=http://${proxy.host}:${proxy.port}`;

        let browser: Browser | null = null;
        let page: Page | null = null;

        try {
        browser = await puppeteer.launch({
          headless: true,
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

        await page.goto(visitUrl, {waitUntil: 'networkidle2', timeout: 30000})
        // await new Promise(resolve => setTimeout(resolve, 3000));

        let productDetails = await page.evaluate(async () => {
          const priceElement = document.querySelector<HTMLSpanElement>('div.prices div.price span .value');
          const price = priceElement ? parseFloat(priceElement.getAttribute('content') || '0') : 0;

          let size;
          const sizeWrapper = document.querySelector('div.custom-select-wrap');

          if (!sizeWrapper) {
          // 사이즈 선택 영역이 없으면 원사이즈 제품
          size = '원사이즈';
          } else {
          // 재고 있는 사이즈만 추출
          const sizeList = Array.from(
              sizeWrapper.querySelectorAll<HTMLElement>('[data-attr-selectable="true"]')
          ).map(el => el.textContent?.trim() || '').filter(Boolean);

          if (sizeList.length === 0) {
              console.log("⚠️ 모든 사이즈가 품절입니다. 다음 상품으로 넘어갑니다.");
              return null;
          }

          size = sizeList
          .map(size => size.replace(',', '.'))
          .join(', ');
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

        console.log(`✅ ${product.designer} 상품 업데이트 완료`);

      } catch (err: any) {
        console.warn(`🚨 Maisonmargiela 업데이트 실패: ${err.message}`);
        if (page && !page.isClosed()) await page.close();
        if (browser) await browser.close();
      } finally {
        if (page && !page.isClosed()) await page.close();
        if (browser) await browser.close();
      }
    }
  }
}
