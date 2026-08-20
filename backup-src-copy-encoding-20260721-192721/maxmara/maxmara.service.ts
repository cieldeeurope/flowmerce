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


// 에러 로그 저장 경로 (lv 폴더 안)
// const errorLogDir = path.join(
//   '\\\\CHANMIN\\Desktop\\크롤링\\에러로그',
//   'maxmara'
// );
// 폴더 없으면 생성
// if (!fs.existsSync(errorLogDir)) {
//   fs.mkdirSync(errorLogDir, { recursive: true });
// }

// // 최종 로그 파일 경로
// const errorLogPath = path.join(errorLogDir, 'maxmara_error_log.txt');

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
export class MaxmaraService {
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


// 1. 카테고리 가져오기 (최신 MaxMara 구조 대응)
async getCategories(siteUrls: string[]): Promise<{ categoryName: string; url: string }[]> {
  const allCategories: { categoryName: string; url: string }[] = [];
  const proxyLines = await this.r2Service.loadBrightProxies2();
  if (!proxyLines.length) {
    console.warn('⚠️ 프록시 없음, 종료');
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
        const browser = await puppeteer.launch({
          headless: true,
          args: [
            proxyArg,
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
        await page.setViewport({ width: 1800, height: 900 });

        try {
          await page.goto(siteUrl, { waitUntil: 'networkidle2', timeout: 30000 });
          console.log(`🔍 ${siteUrl} 접속 완료`);
          await new Promise(resolve => setTimeout(resolve, 2000));

          const categories: { categoryName: string; url: string }[] = await page.evaluate(() => {
            const BASE_URL = 'https://nl.maxmara.com';
            const results: { categoryName: string; url: string }[] = [];

            // 상위 메뉴: Clothing, Bags, Shoes 등
            document.querySelectorAll('li.header-nav__navigation-links__navigation-link[data-menu-item]').forEach(li => {
              const parentName = li.getAttribute('data-menu-item') || 
                                 li.querySelector('a.header-nav-item span')?.textContent?.trim() || '';
              if (!parentName) return;

              // 하위 메뉴 항목들
              li.querySelectorAll('section.header-subnav li.header-subnav-group__items-list__item a[href]').forEach(a => {
                const href = a.getAttribute('href');
                const childName = a.textContent?.trim();
                if (!href || !childName) return;

                const url = href.startsWith('http') ? href : `${BASE_URL}${href}`;
                results.push({
                  categoryName: `${parentName} - ${childName}`,
                  url,
                });
              });
            });

            // 중복 제거 (URL 기준)
            const seen = new Set();
            return results.filter(item => {
              if (seen.has(item.url)) return false;
              seen.add(item.url);
              return true;
            });
          });

          categories.forEach(c => allCategories.push(c));
          console.log(`✅ ${siteUrl} 카테고리 수집 완료: ${categories.length}개`);
          success = true;
        } catch (err: any) {
          console.error(`❌ [${siteUrl}] 오류: ${err.message}`);
          retryCount++;
          console.warn(`⚠️ 재시도 중... (${retryCount}/3)`);
        } finally {
          await browser.close();
        }
      }

      if (!success) {
        console.warn(`🚫 [${siteUrl}] 3회 시도 후 실패, 건너뜀.`);
      }

      console.log(`🔄 다음 URL로 이동...`);
    }
  }

  await processSiteUrls(siteUrls);
  console.log(`🎯 전체 카테고리 수집 완료!`);
  return allCategories;
}

  
  




private async uploadImageToR2(imageUrl: string, fileName: string, product: Product): Promise<string> {
  const MAX_RETRIES = 3;
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  try {
    if (!imageUrl) {
      console.error('이미지 URL이 유효하지 않습니다:', imageUrl);
      throw new Error('유효하지 않은 이미지 URL');
    }

    
if (product.platform === 'smartstore' || product.platform === 'cafe24') {
    
  return imageUrl;
    
}

    
    

    // ✅ 이미지 다운로드 (재시도 3회)
    let imageBuffer: Buffer = Buffer.alloc(0);
    let lastErr: any = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await axios.get(imageUrl, {
          responseType: 'arraybuffer',
          timeout: 10000,
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36',
          },
        });
        imageBuffer = Buffer.from(response.data, 'binary');
        break; // 다운로드 성공
      } catch (err: any) {
        lastErr = err;
        console.warn(
          `이미지 다운로드 실패 (${attempt}/${MAX_RETRIES}): ${err.message}`
        );
        if (attempt === MAX_RETRIES) throw err;
        await sleep(1000 * attempt); // 점진 backoff
      }
    }

    // ✅ Sharp 메타데이터 확인 (형식 판별)
    const metadata = await sharp(imageBuffer).metadata();

    if (metadata.format === 'webp') {
      // webp → jpeg 변환 (기존 로직 유지)
      imageBuffer = await sharp(imageBuffer).jpeg().toBuffer();
      fileName = fileName.replace(/\.webp$/i, '.jpg');
    }

    // ✅ R2 업로드 (재시도 3회)
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const r2ImageUrl = await this.r2Service.uploadImageToR2(
          fileName,
          imageBuffer,
          product,
        );
        return r2ImageUrl; // 성공 시 즉시 반환
      } catch (err: any) {
        lastErr = err;
        console.warn(
          `R2 업로드 실패 (${attempt}/${MAX_RETRIES}): ${err.message}`
        );
        if (attempt === MAX_RETRIES) throw err;
        await sleep(1000 * attempt); // 점진 backoff
      }
    }

    // 이 도달점은 원래 오면 안 됨
    throw lastErr || new Error('알 수 없는 오류');
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
      const distance = 150;
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

  // maxmara 사이트 크롤링 시작
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
    const serviceType = 'Maxmara';
    let browser: Browser | null = null;
    let page: Page | null = null;
    let productUrls: string[] = [];

    const category = await this.mappingRepository.findOne({
      where: { customId: customId, accountPlatform: accountPlatform, siteUrl: siteUrl },
  });

    const proxyLines = await this.r2Service.loadBrightProxies2();
      if (!proxyLines.length) {
          console.warn('프록시 없음, 종료');
          return;
      }

    // 랜덤으로 1개 선택
    const raw = proxyLines[Math.floor(Math.random() * proxyLines.length)];
    const proxy = parseAuthProxy(raw);
    const proxyArg = `--proxy-server=http://${proxy.host}:${proxy.port}`;

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
    await page.setViewport({ width: 1800, height: 800 });


    const MAX_RETRY = 5; // 최대 재시도 횟수
    let retryAttempts = 0;

    while (retryAttempts < MAX_RETRY) {
        try {
            await page.goto(siteUrl, { waitUntil: 'networkidle2', timeout: 30000 });
            await new Promise((resolve) => setTimeout(resolve, 3000));
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
            await page.setViewport({ width: 1800, height: 800 });

            // 다음 재시도를 위한 랜덤 대기 시간 (exponential backoff)
            const waitTime = Math.min(1000 * 2 ** retryAttempts, 10000); // 최대 10초 대기
            await new Promise((resolve) => setTimeout(resolve, waitTime));
        }
    }

    while (true) {
        try {
            // 현재 페이지에서 상품 URL 및 차단 여부 평가
            const { currentPageProductUrls, isBlocked, hasMoreButton } = await page.evaluate(() => {
                // 👉 상품 URL 추출
                const productUrls = Array.from(
                  document.querySelectorAll('.c-product-card a[href*="/p-"]')
                )
                  .map(a => (a as HTMLAnchorElement).href)
                  .filter((url, index, self) => url && self.indexOf(url) === index); // 중복 제거


                // 👉 차단 여부 감지
                const bodyText = document.querySelector('body')?.textContent || '';
                const isBlocked =
                    document.querySelector('body') === null &&
                    (bodyText.includes('Access Denied') ||
                    bodyText.includes('Too Many Requests') ||
                    bodyText.includes('429') ||
                    bodyText.includes('Enforced timeout') ||
                    bodyText.includes('net::ERR_TIMED_OUT'));

                // 👉 더보기 버튼 존재 여부 체크
                const moreButton = document.querySelector('button[data-infinite-scroll], button.infinite-scroll__link') as HTMLElement;
                let hasMoreButton = false;
                if (moreButton) {
                    const style = window.getComputedStyle(moreButton);
                    if (style.display !== 'none' && style.visibility !== 'hidden' && moreButton.offsetParent !== null) {
                    hasMoreButton = true;
                    }
                }

                return { currentPageProductUrls: productUrls, isBlocked, hasMoreButton };
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
          await page.setViewport({ width: 1800, height: 800 });
          await page.goto(siteUrl, { waitUntil: 'networkidle2', timeout: 30000 });
          continue;
      }

      if (currentPageProductUrls.length === 0) {
          console.log("더 이상 상품이 없습니다. 반복문을 종료합니다.");
          break;
      }

        // 더보기 버튼 클릭
        if (hasMoreButton) {
            console.log("더보기 버튼이 감지되었습니다. 클릭 후 대기합니다.");
            await page.evaluate(() => {
                const showMore = document.querySelector('button[data-infinite-scroll], button.infinite-scroll__link') as HTMLElement | null;
                if (showMore) {
                showMore.click();
                }
            });

            await new Promise((resolve) => setTimeout(resolve, 2000)); // UI 업데이트 대기
            await this.autoScroll(page); // 천천히 스크롤

            // 👇 스크롤이 다시 올라가면 다시 내리기 (무한반복)
            let stableCount = 0;
            while (true) {
              const atBottom = await page.evaluate(() => {
                const scrollY = window.scrollY;
                const maxScroll = document.body.scrollHeight - window.innerHeight;
                const diff = maxScroll - scrollY;
                return diff <= 5; // 거의 맨 아래면 true
              });

              if (atBottom) {
                stableCount++;
              } else {
                await page.evaluate(() => window.scrollBy(0, window.innerHeight * 0.6));
                stableCount = 0; // 다시 움직였으니 카운트 초기화
              }

              // 2초 대기 후 다시 검사
              await new Promise((resolve) => setTimeout(resolve, 12000));

              // 2번 연속 같은 위치면 완전 로딩 완료로 간주
              if (stableCount >= 2) {
                break;
              }
            }

            // 👉 스크롤 완료 후 다시 상품 URL 수집
            const newUrls = await page.evaluate(() => {
                return Array.from(document.querySelectorAll('div.column a[href]'))
                .map(a => (a as HTMLAnchorElement).href)
                .filter(Boolean);
            });

            productUrls = Array.from(new Set([...productUrls, ...newUrls]));

        } else {
            console.log("더보기 버튼이 없습니다.");
            productUrls = Array.from(new Set([...productUrls, ...currentPageProductUrls]));
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
                  await page.setViewport({ width: 1800, height: 800 });
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
    console.log(`막스마라 최종 수집된 상품 URL 수: ${productUrls.length} - ${category?.categoryName || '카테고리 없음'}`);

    // // 새로운 브라우저와 페이지 생성
    // browser = await puppeteer.launch({
    //     headless: true,
    //     args: [
    //         
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
    
    // await page.setViewport({ width: 1800, height: 800 });
    for (const [index, productUrl] of productUrls.entries()) {
      let loadAttempts = 0;
      let success = false;

      while (loadAttempts < 10) {
        try {
            await page.goto(productUrl, { waitUntil: 'networkidle2', timeout: 30000 });
            console.log(`✅ (${index + 1}/${productUrls.length}) 막스마라 ${category?.categoryName || '카테고리 없음'}  수집 중`);
            await new Promise((resolve) => setTimeout(resolve, 2000));       
            success = true;
            break; // 로딩 성공 시 while 루프 탈출
          
          } catch (error: any) {
              loadAttempts++;
              console.warn(`페이지 로드 실패 (재시도 ${loadAttempts}/10): ${error.message}`);
              //logErrorToDesktop(error, `5.오류 발생`);
              if (loadAttempts < 10) {
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
                  await page.setViewport({ width: 1800, height: 800 });
                continue;
              } else {
                  console.error('최대 로드 시도 초과 - 다음 URL로 이동합니다.');
                  //logErrorToDesktop(error, `6.오류 발생`);
                  break;
              }
          }
      }



      const productDetails = await page.evaluate(async () => {
        const site = 'Maxmara';
        const designer = '막스마라';
        const titleElement = document.querySelector('div.pdp__info__header__name h1');
        let title = titleElement ? titleElement.textContent?.trim() || '' : '';

        // ✅ 줄바꿈/공백/탭 제거
        title = title.replace(/\s*[\n\r]+\s*/g, ' '); // 개행 제거
        title = title.replace(/\s*-\s*/g, ' - ');     // 하이픈 앞뒤 정리
        title = title.replace(/\s{2,}/g, ' ');        // 중복 공백 제거
        const priceElement = document.querySelector('span.prices__full');
        const price = priceElement ? Math.floor(parseFloat(priceElement.textContent.replace(/[€,]/g, '').trim())) : 0;
        const color = document.querySelector('span.pdp-colors__color')?.textContent?.trim() || '';

        

        function getBreadcrumbText() {
          return Array.from(
            new Set(
              Array.from(document.querySelectorAll('.breadcrumbs a'))
                .map(a => a.textContent?.trim() || '')
                .filter(Boolean)
            )
          ).join(' > ');
        }

        const breadcrumbText = getBreadcrumbText();

        const clothingKeywords = [
          'COATS',
          'ATELIER',
          'JACKETS AND BLAZERS',
          'TAILLEUR SARTORIALE',
          'PADDED COATS',
          'TRENCH COATS',
          'THE CUBE - CAMELUXE',
          'LEATHER JACKETS',
          'CAPES',
          'DRESSES',
          'JUMPSUITS',
          'KNITWEAR AND SWEATSHIRTS',
          'SUIT',
          'SHIRTS AND TOPS',
          'T-SHIRTS',
          'SKIRTS',
          'TROUSERS',
          'DENIM'
        ];

        const isClothing = clothingKeywords.some(k =>
          breadcrumbText.toUpperCase().includes(k)
        );

        /* =========================
          이미지 (slick-list 기준)
        ========================= */
        const container = document.querySelector('.slick-list.draggable');

        let imageUrls: string[] = [];

        if (container) {
          imageUrls = Array.from(
            container.querySelectorAll('.slick-slide')
          )
            .filter(slide => !slide.classList.contains('slick-cloned'))
            .map(slide => {
              const btn = slide.querySelector('button.pdp__images__image');
              if (!btn) return null;

              const zoom = btn.getAttribute('data-zoom-image');
              if (zoom) return zoom.split('#')[0];

              const img = slide.querySelector('img');
              return img ? img.src.split('#')[0] : null;
            })
            .filter((v): v is string => !!v);
        }

        /* =========================
          의류일 경우 → 마지막을 맨앞으로
        ========================= */
        if (isClothing && imageUrls.length > 1) {
          const last = imageUrls[imageUrls.length - 1];
          imageUrls = [last, ...imageUrls.slice(0, imageUrls.length - 1)];
        }



        

        let size: string;

        // ✅ 1️⃣ MaxMara 전용 사이즈 선택 구조
        const btns = document.querySelectorAll(
          '.pdp__info__header__sizes__selectors__selector'
        );

        if (!btns.length) {
          // ✅ 사이즈 선택 UI가 없을 경우 → 가방/악세사리류로 간주
          size = '원사이즈';
        } else {
          const sizes = Array.from(btns)
            .map((el) => {
              const input = el.querySelector('input[name="size"]');
              const label = el.querySelector('label');
              if (!input || !label) return null;

              // ✅ data-unavailable="" → 재고 있음 / 값이 있거나 disabled면 품절
              const dataUnavailable = input.getAttribute('data-unavailable');
              const unavailable =
                input.hasAttribute('disabled') ||
                (dataUnavailable && dataUnavailable.trim().length > 0);

              if (unavailable) return null; // 품절 제외

              const value =
                label.textContent?.trim().replace(',', '.').replace(/\s+/g, ' ') || '';
              return value;
            })
            .filter((v): v is string => !!v); // null 제거

          if (sizes.length === 0) {
            console.log('⚠️ 모든 사이즈가 품절입니다. 다음 상품으로 이동합니다.');
            return null; // 전체 품절 → 상품 skip
          }

          // ✅ 중복 제거 후 문자열 결합
          size = Array.from(new Set(sizes)).join(', ');
        }



        let mainInfo = '';

        // ✅ 1️⃣ 상품 설명 (Details 섹션)
        const descriptionBlock = document.querySelector<HTMLDivElement>(
          '.pdp__details--description'
        );
        if (descriptionBlock) {
          const descParts: string[] = [];

          // <p> 태그 텍스트
          const paragraphs = Array.from(
            descriptionBlock.querySelectorAll<HTMLParagraphElement>('p')
          )
            .map((p) => p.textContent?.trim() || '')
            .filter(Boolean);

          // <li> bullet 항목
          const bullets = Array.from(
            descriptionBlock.querySelectorAll<HTMLLIElement>('li')
          )
            .map((li) => li.textContent?.trim() || '')
            .filter(Boolean);

          if (paragraphs.length) descParts.push(...paragraphs);
          if (bullets.length) descParts.push(...bullets);

          if (descParts.length) {
            mainInfo += descParts.join('<br/>');
          }
        }

        // ✅ 2️⃣ 소재 및 관리 (Composition and care 섹션)
        const compositionBlock = document.querySelector<HTMLDivElement>(
          '.pdp__details--composition .pdp__details__text'
        );
        if (compositionBlock) {
          let compTexts = Array.from(
            compositionBlock.querySelectorAll<HTMLParagraphElement>('p')
          )
            .map((p) => p.textContent?.trim() || '')
            .filter(Boolean);

          // 마지막 <p> (주소 정보) 제거
          if (compTexts.length > 1) {
            const last = compTexts[compTexts.length - 1];
            if (last.includes('Distributed by Max Mara')) {
              compTexts.pop();
            }
          }

          if (compTexts.length) {
            if (mainInfo) mainInfo += '<br/>';
            mainInfo += compTexts.join('<br/>');
          }
        }

        // ✅ 3️⃣ 스타일 코드 추출 (Product code)
        let styleId = '';
        let brandstyleId = '';
        const productCodeEl = document.querySelector<HTMLParagraphElement>(
          '.pdp__details__code'
        );
        if (productCodeEl) {
          const codeText = productCodeEl.textContent?.trim() || '';
          // "Product code: 1046025206041 - BELLUNO" → 그룹 추출
          const match = codeText.match(/Product code:\s*([^\s]+ - [A-Z0-9]+)/i);
          if (match) {
            styleId = match[1].trim();
            brandstyleId = styleId;
          }
        }

        // ✅ 4️⃣ 원산지 (고정)
        const madeIn = 'Italy';

        return { site, designer, title, price, color, mainInfo, madeIn, styleId, size, brandstyleId, imageUrls };
      });


      if (!productDetails || !productDetails.mainInfo || !productDetails.styleId || !productDetails.title || !productDetails.price || !productDetails.imageUrls.length || !productDetails.size || !productDetails.brandstyleId) {
        console.warn('막스마라 데이터 누락 - 다음 productUrl로 이동');
        continue; // 다음 productUrl로 이동
        }

      // 이미지가 없는 경우 상품을 건너뜀
      if (!productDetails || productDetails.imageUrls.length === 0) {
        if (loadAttempts < 2) {
            loadAttempts++;
            console.log('이미지가 없는 상품입니다. 다시 시도합니다.');        
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
            await page.setViewport({ width: 1800, height: 800 });
            // 동일한 productUrl로 다시 접속
            try {
                await page.goto(productUrl, { waitUntil: 'networkidle2', timeout: 30000 });
            } catch (error: any) {
                console.warn(`재시도 후에도 페이지 로드 실패: ${error.message}`);
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
          
              console.log(`막스마라 품절 처리 완료: ${product.title} (styleId: ${product.styleId})`);
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

        await page.goto(visitUrl, {waitUntil: 'domcontentloaded', timeout: 30000})
        await page.waitForSelector('span.prices__full', {
          visible: true,
          timeout: 5000,
        });
        

        let productDetails = await page.evaluate(async () => {

          const addToCartBtn = document.querySelector(
            'button.js-add-to-cart'
          ) as HTMLButtonElement | null;

          // 🔥 1️⃣ 쇼핑백 버튼 자체가 없으면 품절
          if (!addToCartBtn) {
            return {
              price: 0,
              size: '',
              soldOut: true,
            };
          }
          
          const priceElement = document.querySelector('span.prices__full');
          const price = priceElement ? Math.floor(parseFloat(priceElement.textContent.replace(/[€,]/g, '').trim())) : 0;

          let size: string;

          // ✅ 1️⃣ MaxMara 전용 사이즈 선택 구조
          const btns = document.querySelectorAll(
            '.pdp__info__header__sizes__selectors__selector'
          );

          if (!btns.length) {
            // ✅ 사이즈 선택 UI가 없을 경우 → 가방/악세사리류로 간주
            size = '원사이즈';
          } else {
            const sizes = Array.from(btns)
              .map((el) => {
                const input = el.querySelector('input[name="size"]');
                const label = el.querySelector('label');
                if (!input || !label) return null;

                // ✅ data-unavailable="" → 재고 있음 / 값이 있거나 disabled면 품절
                const dataUnavailable = input.getAttribute('data-unavailable');
                const unavailable =
                  input.hasAttribute('disabled') ||
                  (dataUnavailable && dataUnavailable.trim().length > 0);

                if (unavailable) return null; // 품절 제외

                const value =
                  label.textContent?.trim().replace(',', '.').replace(/\s+/g, ' ') || '';
                return value;
              })
              .filter((v): v is string => !!v); // null 제거

            if (sizes.length === 0) {
              console.log('⚠️ 모든 사이즈가 품절입니다. 다음 상품으로 이동합니다.');
              return null; // 전체 품절 → 상품 skip
            }

            // ✅ 중복 제거 후 문자열 결합
            size = Array.from(new Set(sizes)).join(', ');
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
        console.warn(`🚨 Miumiu 업데이트 실패: ${err.message}`);
        if (page && !page.isClosed()) await page.close();
        if (browser) await browser.close();
      } finally {
        if (page && !page.isClosed()) await page.close();
        if (browser) await browser.close();
      }
    }
  }
}
