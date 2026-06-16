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
//   'prada'
// );

// // 폴더 없으면 생성
// if (!fs.existsSync(errorLogDir)) {
//   fs.mkdirSync(errorLogDir, { recursive: true });
// }

// // 최종 로그 파일 경로
// const errorLogPath = path.join(errorLogDir, 'prada_error_log.txt');

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

function loadProxies(): string[] {
    const filePath = '\\\\CHANMIN\\Desktop\\CleanIP(유료프록시).txt';
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    return fileContent.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  }

function getRandomProxy(proxies: string[]): string {
  const randomIndex = Math.floor(Math.random() * proxies.length);
  return proxies[randomIndex];
}

@Injectable()
export class PradaService {
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
async getCategories(siteUrls: string[]): Promise<any[]> {
    const proxyLines = await this.r2Service.loadBrightProxies2();
    if (!proxyLines.length) {
        console.warn('프록시 없음, 종료');
        return;
    }

    // 랜덤으로 1개 선택
    const raw = proxyLines[Math.floor(Math.random() * proxyLines.length)];
    const proxy = parseAuthProxy(raw);
    const proxyArg = `--proxy-server=http://${proxy.host}:${proxy.port}`;    let allCategories = [];

    for (const siteUrl of siteUrls) {
        let retryCount = 0;
        let success = false;

        while (retryCount < 3 && !success) { // 최대 3회 재시도
            console.log(`${siteUrl} 작업 중..`);

            const browser = await puppeteer.launch({
                headless: true,
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
                    '--window-size=1920,1080',
                ],
            });

            const page = await browser.newPage();
            await page.authenticate({
                username: proxy.username,
                password: proxy.password,
            });
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36');
            await page.setRequestInterception(true);
            page.on('request', (req) => {
                const blockedResources = ['cookie', 'consent', 'geoip', 'geolocation', 'popup'];
                if (blockedResources.some(resource => req.url().includes(resource))) {
                    req.abort();
                } else {
                    req.continue();
                }
            });

            try {
                await page.goto(siteUrl, { waitUntil: 'networkidle2', timeout: 30000 });
                console.log(`🔍 ${siteUrl} 진행중...`);

                // ✅ Prada 카테고리 크롤링
                const categories = await page.evaluate(() => {
                    const results = [];

                    const normalize = (str) =>
                        str
                        .toLowerCase()
                        .trim()
                        .replace(/\s+/g, ' ')
                        .replace(/\s/g, '-');

                    const mainLis = document.querySelectorAll(
                        'li:has(> button .level-item-text__main)'
                    );

                    mainLis.forEach(mainLi => {
                        const mainText =
                        mainLi.querySelector('.level-item-text__main')?.textContent?.trim() || '';

                        /* =====================================================
                        * 1️⃣ WOMEN / MEN
                        * ===================================================== */
                        if (/^(Women|Men)$/i.test(mainText)) {
                        const main = normalize(mainText);

                        const secondItems = mainLi.querySelectorAll(
                            '.new-menu__second-level-item'
                        );

                        secondItems.forEach(secondLi => {
                            const middleText =
                            secondLi.querySelector('button .level-item-text__main')
                                ?.textContent?.trim() || '';

                            if (!middleText) return;

                            const middle = normalize(middleText);

                            const thirdLinks = secondLi.querySelectorAll(
                            '.new-menu__third-level-items a.level-item[href]'
                            );

                            // 소분류 없음
                            if (thirdLinks.length === 0) return;

                            thirdLinks.forEach(a => {
                            const subText =
                                a.querySelector('.level-item-text__main')
                                ?.textContent?.trim() || '';
                            const href = a.getAttribute('href') || '';

                            if (
                                !href ||
                                /view all/i.test(subText) ||
                                /geored/i.test(href)
                            ) return;

                            const sub = normalize(subText);

                            results.push({
                                categoryName: `${main} - ${middle} - ${sub}`,
                                url: `https://www.prada.com${href}`,
                            });
                            });
                        });
                        }

                        /* =====================================================
                        * 2️⃣ FINE JEWELRY (CATEGORIES 만)
                        * ===================================================== */
                        if (/fine\s*jewelry/i.test(mainText)) {
                        const main = 'fine-jewelry';

                        const categoryLinks = mainLi.querySelectorAll(
                            'a.level-item[href^="/de/en/fine-jewelry/categories/"]'
                        );

                        categoryLinks.forEach(a => {
                            const middleText =
                            a.querySelector('.level-item-text__main')
                                ?.textContent?.trim() || '';
                            const href = a.getAttribute('href') || '';

                            if (!middleText || /view all/i.test(middleText)) return;

                            const middle = normalize(middleText);

                            results.push({
                            categoryName: `${main} - ${middle}`,
                            url: `https://www.prada.com${href}`,
                            });
                        });
                        }
                    });

                    return results;
                });


                // ✅ 크롤링한 데이터를 allCategories 배열에 추가
                allCategories = allCategories.concat(categories);

                // ✅ 로그 추가
                console.log(`✅ ${siteUrl} 에서 가져온 카테고리 목록:`);
                console.table(categories);

                success = true; // 성공하면 while 루프 탈출
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

    console.log(`🎯 모든 사이트에서 카테고리 수집 완료!`);
    return allCategories;
}




  // 자동 스크롤 함수
  private async autoScroll(page: Page) {
    await page.evaluate(async () => {
      let totalHeight = 0;
      const distance = 100;
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
        const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
        const imageBuffer = Buffer.from(response.data, 'binary'); // 이미지 데이터를 버퍼로 변환

        // R2에 이미지 업로드
        const r2ImageUrl = await this.r2Service.uploadImageToR2(fileName, imageBuffer, product);
        return r2ImageUrl; // 업로드된 이미지의 URL 반환
    } catch (error: any) {
        console.error(`이미지 업로드 실패: ${error.message}`);
        //logErrorToDesktop(error, `1.오류 발생`);
        throw error;
    }
}

  // Prada 사이트 크롤링 시작
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
    const serviceType = 'prada';
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

    const category = await this.mappingRepository.findOne({
      where: { customId: customId, accountPlatform: accountPlatform, siteUrl: siteUrl },
  });

  try {
  browser = await puppeteer.launch({
    headless: true,
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
        '--window-size=1920,1080',
    ],
});

    page = await browser.newPage();
    await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36'
    );
    await page.authenticate({
        username: proxy.username,
        password: proxy.password,
    });
        
    const MAX_RETRY = 5; // 최대 재시도 횟수
    let retryAttempts = 0;

    while (retryAttempts < MAX_RETRY) {
        try {
            await page.goto(siteUrl, { waitUntil: 'networkidle2', timeout: 30000 });
            try {
                // ✅ 1. 쿠키 배너 닫기 버튼이 로드될 때까지 최대 5초 대기
                await page.waitForSelector('a.cookie__close_text span', { visible: true, timeout: 5000 });
            
                // ✅ 2. 버튼이 존재하면 span의 텍스트가 "Continue without accepting"인지 확인 후 클릭 실행
                const cookieCloseButton = await page.evaluateHandle(() => {
                    return Array.from(document.querySelectorAll('a.cookie__close_text span'))
                        .find(span => span.textContent.trim() === 'Continue without accepting')?.parentElement;
                });
            
                if (cookieCloseButton) {
                    await page.evaluate((btn) => btn.click(), cookieCloseButton);
                } else {
                    
                }
            } catch (error: any) {
                
            }
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
                    '--window-size=1920,1080',
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
            await page.setCacheEnabled(false);
            await page.setRequestInterception(true);
            page.on('request', (request) => {
                const url = request.url();
                if (
                    request.resourceType() === 'image' || 
                    request.resourceType() === 'font' ||
                    url.includes('cookie') || url.includes('consent')
                ) {
                    request.abort(); // 쿠키 관련 요청도 차단
                } else {
                    request.continue();
                }
            });

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
                  const moreButton = document.querySelector('[aria-label="Show more"]');
                  const isVisible = moreButton && window.getComputedStyle(moreButton).display !== 'none';
                  const hasMoreButton = !!isVisible;


          return { isBlocked, hasMoreButton};
      });

      if (isBlocked) {
          console.warn("페이지가 차단되었습니다. 프록시를 변경하여 다시 시도합니다.");
          ; // 새로운 프록시 설정
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
                    '--window-size=1920,1080',
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
          await page.goto(siteUrl, { waitUntil: 'networkidle2', timeout: 30000 });
          continue;
      }

      // 더보기 버튼 클릭
      if (hasMoreButton) {
        console.log("더보기 버튼이 감지되었습니다. 클릭 후 대기합니다.");
        await page.click('[aria-label="Show more"]');
        await new Promise((resolve) => setTimeout(resolve, 2000)); // UI 업데이트를 기다림
        await this.autoScroll(page);
        // ✅ 더 이상 스크롤할 수 없을 때까지 반복
        let lastHeight = await page.evaluate(() => document.body.scrollHeight);

        while (true) {
            await page.evaluate(() => window.scrollBy(0, 300)); // 스크롤 다운
            await new Promise(resolve => setTimeout(resolve, 2000)); // 2초 대기

            let newHeight = await page.evaluate(() => document.body.scrollHeight);
            
            if (newHeight === lastHeight) {
                console.log("✅ 스크롤 완료: 더 이상 로드할 상품 없음.");
                break; // 더 이상 스크롤이 안 내려가면 반복 종료
            }

            lastHeight = newHeight; // 높이 갱신
        }
        // ✅ 여기서 최신 상품 목록 다시 수집
        const allLoadedUrls = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('article a[href]'))
              .filter(a => {
                const text = a.textContent?.toLowerCase() || '';
                return !text.includes('notify me') && !text.includes('pre-order');
              })
              .map(a => (a as HTMLAnchorElement).href);
          });
        
          productUrls = allLoadedUrls;
          break;
        
        } else {
            await this.autoScroll(page);
             const firstPageUrls = await page.evaluate(() => {
                 return Array.from(document.querySelectorAll('article a[href]'))
                .filter(a => {
                    const text = a.textContent?.toLowerCase() || '';
                    return !text.includes('notify me') && !text.includes('pre-order');
                })
                .map(a => (a as HTMLAnchorElement).href);
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
                            '--window-size=1920,1080',
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
              } catch (closeError: any) {
                  console.warn("브라우저 종료 중 추가 오류:", closeError.message);
              }
          }
          ; // 새로운 프록시 설정
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

    }

    if (productUrls.length === 0) {
      throw new Error('상품 URL을 수집하지 못했습니다. 모든 시도가 실패했습니다.');
    }
    console.log(`프라다 최종 수집된 상품 URL 수: ${productUrls.length} - ${category?.categoryName || '카테고리 없음'}`);

    // 상품 URL 접속 전 요청 차단 해제 또는 재설정
    await page.setCacheEnabled(false);
    await page.setRequestInterception(true); // 요청 가로채기 활성화

    // 기존 이벤트 핸들러 제거 (중복 방지)
    page.removeAllListeners('request');

    page.on('request', (request) => {
        const url = request.url();

        // ✅ 쿠키 관련 요청만 차단
        if (url.includes('cookie') || url.includes('consent')) {
            request.abort(); // 쿠키 관련 요청 차단
        } else {
            request.continue(); // 나머지 요청 정상 처리
        }
    });

        
    for (const [index, productUrl] of productUrls.entries()) {
      let loadAttempts = 0;
      let success = false;

      while (loadAttempts < 10) {
          try {
            await page.goto(productUrl, { waitUntil: 'networkidle2', timeout: 30000 });
            try {
                const spanHandle = await page.waitForSelector('a.cookie__close_text span', {
                    visible: true,
                    timeout: 5000,
                });

                if (spanHandle) {
                    const spanText = await spanHandle.evaluate(el => el.textContent.trim());
                    if (spanText === 'Continue without accepting') {
                    await spanHandle.evaluate(el => {
                        const parent = el.parentElement;
                        if (parent) (parent as HTMLElement).click();
                    });
                    console.log("✅ 쿠키 배너 닫기 완료!");
                    }
                }
            } catch {
            // 버튼 없거나 이미 닫혀 있으면 무시
            }

            await page.setViewport({
                width: 1920,
                height: 1080,
            });
            await page.evaluate(() => {
                document.body.style.zoom = '1.00001';
            });
            await new Promise(resolve => setTimeout(resolve, 2000)); // 2초 대기
            await this.autoScroll(page);
            await new Promise(resolve => setTimeout(resolve, 5000)); // 5초 대기
            console.log(`✅ (${index + 1}/${productUrls.length}) 프라다 ${category?.categoryName || '카테고리 없음'}  수집 중`);
            success = true;
            break; // 로딩 성공 시 루프 종료
          } catch (error: any) {
                loadAttempts++;
                console.warn(`프라다 페이지 로드 실패 (프록시 변경 ${loadAttempts}/10): ${error.message}`);
                //logErrorToDesktop(error, `5.오류 발생`);

                if (loadAttempts < 10) {
                    ;
                    console.log(`새로운 프록시로 변경: ${proxy}`);

                    // 안전하게 page / browser 닫기
                    try {
                        if (page && !page.isClosed()) {
                            await page.close();
                        }
                    } catch (e: any) {
                        console.warn("⚠️ page.close 중 오류:", e.message);
                    }

                    try {
                        if (browser) {
                            await browser.close();
                        }
                    } catch (e: any) {
                        console.warn("⚠️ browser.close 중 오류:", e.message);
                    }

                    // 새로운 브라우저 & 페이지 생성
                    browser = await puppeteer.launch({
                        headless: true,
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
                            '--window-size=1920,1080',
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
                    await page.setCacheEnabled(false);

                    // 기존 요청 이벤트 제거 후 새로 등록
                    page.removeAllListeners('request');
                    await page.setRequestInterception(true);
                    page.on('request', (request) => {
                        const url = request.url();
                        if (url.includes('cookie') || url.includes('consent')) {
                            request.abort();
                        } else {
                            request.continue();
                        }
                    });

                    // 바로 다음 while 루프로 넘어가서 새 page만 사용
                    continue;

                } else {
                    console.error('최대 로드 시도 초과 - 다음 URL로 이동합니다.');
                    //logErrorToDesktop(error, `6.오류 발생`);
                    break;
                }
            }

      }

 
        let productDetails;
        let retryCount = 0;
        while (retryCount < 3) {
        productDetails = await page.evaluate(() => {
        const site = 'Prada';
        const designer = '프라다';
        const titleElement = document.querySelector('[data-element="product-title"]');
        const title = titleElement ? `${titleElement?.textContent?.trim() || ''}` : '';
        const priceElement = document.querySelector('[data-element="product-current-price"]');
        const price = priceElement ? parseInt(priceElement.textContent.replace(/[^\d]/g, ''), 10) : 0;
        const color = document.querySelector('.inline.relative.w-full.ml-sp-8.text-paragraph-medium.font-normal.lg\\:text-paragraph-small')?.textContent?.trim() || '';
        
        // 이미지 수집
        const imageElements = document.querySelectorAll("div.gallery-images.relative img");

        const imageUrls = Array.from(imageElements)
        .map(img => (img as HTMLImageElement).currentSrc || (img as HTMLImageElement).src) // ✅ Type Assertion 적용
        .filter(url => 
            url && 
            !url.includes("placeholder.svg") &&  // ✅ `placeholder.svg` 제거
            !url.includes("cross_selling_component") && // ✅ `cross-selling` 관련 이미지 제거
            url.endsWith(".jpg") // ✅ `jpg` 확장자만 포함
        );
        let size = '';

        // ✅ 사이즈 선택 버튼 클릭 시도
        const sizeButton = document.querySelector('[aria-label="Select size"]') as HTMLElement | null;
        if (sizeButton) {
            sizeButton.click();
            // ✅ 사용 가능한 사이즈만 수집
            const sizeElements = document.querySelectorAll('ul.size-picker-drawer__list li:not(.size-picker-drawer__list-item--unavailable) button');
            const sizeList = Array.from(sizeElements).map(button => button.textContent?.trim().replace(',', '.') || '');


            if (sizeList.length > 0) {
                size = sizeList.join(', '); // 사이즈를 콤마(,)로 구분해서 저장
            }
        }

        // ✅ 만약 사이즈 선택 버튼이 없거나, 사이즈 리스트가 비어있다면 '원사이즈' 설정
        if (!size) {
            size = '원사이즈';
        }


        // 🔹 "Product details" 버튼 클릭
        const detailsButton = Array.from(document.querySelectorAll('span.button-link__text'))
        .find(span => span.textContent.trim() === 'Product details');

        if (detailsButton) {
            (detailsButton as HTMLElement).click();
        }

        // 🔹 상품 상세 정보 가져오기 (Contact us 제외)
        let mainInfo = '';

        const detailsSection = document.querySelector('.product-details-wrapper');
        if (detailsSection) {
            const paragraphs = detailsSection.querySelectorAll('div[data-element="product-details"] p, div[data-element="product-details"] ul li');
            
            mainInfo = Array.from(paragraphs)
                .map(p => p.textContent?.trim() || '')
                .filter(text => !text.includes('Contact us')) // "Contact us" 제외
                .join('<br/>');
        }

        // 🔹 스타일 ID, 원산지 정보 추출
        const styleIdMatch = mainInfo.match(/Product code:\s*([\w\d_]+)/);

        const styleId = styleIdMatch ? styleIdMatch[1] : '';
        const brandstyleId = styleId;
        const madeIn = 'Made In Italy';

        return { site, designer, title, price, color, mainInfo, madeIn, styleId, size, brandstyleId, imageUrls };
      });

      if (productDetails &&
        productDetails.mainInfo &&
        productDetails.styleId &&
        productDetails.title &&
        productDetails.price &&
        productDetails.imageUrls.length &&
        productDetails.size &&
        productDetails.brandstyleId) {
        break; // 데이터 완전하면 루프 탈출
        }
        
        retryCount++;
        console.warn(`프라다 데이터 누락 - 재시도 ${retryCount}/3`);
        await new Promise(resolve => setTimeout(resolve, 3000));
        await page.reload({ waitUntil: 'networkidle2', timeout: 30000 });
    }
    
    if (!productDetails ||
        !productDetails.mainInfo ||
        !productDetails.styleId ||
        !productDetails.title ||
        !productDetails.price ||
        !productDetails.imageUrls.length ||
        !productDetails.size ||
        !productDetails.brandstyleId) {
        console.warn('3회 재시도에도 데이터 누락 - 다음 productUrl로 이동');
        continue; // 다음 URL로 이동
    }

      // 이미지가 없는 경우 상품을 건너뜀
      if (!productDetails || productDetails.imageUrls.length === 0) {
        if (loadAttempts < 2) {
            loadAttempts++;
            console.log('이미지가 없는 상품입니다. 프록시 변경 후 다시 시도합니다.');
            
            // 프록시 변경
            ;
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
                    '--window-size=1920,1080',
                ]
            });
            page = await browser.newPage();
            await page.authenticate({
                username: proxy.username,
                password: proxy.password,
            });
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36');
            await page.setCacheEnabled(false);
            await page.setRequestInterception(true); // 요청 가로채기 활성화

            // 기존 이벤트 핸들러 제거 (중복 방지)
            page.removeAllListeners('request');

            page.on('request', (request) => {
                const url = request.url();

                // ✅ 쿠키 관련 요청만 차단
                if (url.includes('cookie') || url.includes('consent')) {
                    request.abort(); // 쿠키 관련 요청 차단
                } else {
                    request.continue(); // 나머지 요청 정상 처리
                }
            });
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
        const newProductArray = this.productRepository.create(productDetails);
        const newProduct = Array.isArray(newProductArray) ? newProductArray[0] : newProductArray;

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
    where: { touched: false, siteUrl, customId, accountPlatform}
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
    where: { touched: false, siteUrl, customId, accountPlatform}
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
          
              console.log(`프라다 품절 처리 완료: ${product.title} (styleId: ${product.styleId})`);
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
              console.log(`🔄 스마트스토어 상품 업데이트: ${product.designer} ${product.title}`);
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
            const response = await this.smartstoreApiService.createSmartStoreProduct(
                product,
                smartstoreAuth,
                imageData,
                godoMallCategoryName
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
            '--window-size=1920,1080',
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

        const pradaHomeUrl = 'https://www.prada.com/de/en.html';
        await page.goto(visitUrl, {waitUntil: 'domcontentloaded', timeout: 30000});
        await page.waitForFunction((homeUrl) => {
          const currentUrl = location.href.split('?')[0].replace(/\/$/, '');
          return currentUrl === homeUrl || !!document.querySelector('[data-element="product-current-price"]');
        }, { timeout: 30000 }, pradaHomeUrl.replace(/\/$/, ''));

        const currentUrl = page.url().split('?')[0].replace(/\/$/, '');
        if (currentUrl === pradaHomeUrl.replace(/\/$/, '')) {
          console.warn(`⚠️ Prada 상품 없음/리다이렉트 감지 → ${page.url()}`);
        }


        let productDetails = await page.evaluate(async () => {
            const priceElement = document.querySelector('[data-element="product-current-price"]');
            const price = priceElement ? parseInt(priceElement.textContent.replace(/[^\d]/g, ''), 10) : 0;

            let size = '';

            // ✅ 사이즈 선택 버튼 클릭 시도
            const sizeButton = document.querySelector('[aria-label="Select size"]') as HTMLElement | null;
            if (sizeButton) {
                sizeButton.click();
                // ✅ 사용 가능한 사이즈만 수집
                const sizeElements = document.querySelectorAll('ul.size-picker-drawer__list li:not(.size-picker-drawer__list-item--unavailable) button');
                const sizeList = Array.from(sizeElements).map(button => button.textContent?.trim().replace(',', '.') || '');


                if (sizeList.length > 0) {
                    size = sizeList.join(', '); // 사이즈를 콤마(,)로 구분해서 저장
                }
            }

            // ✅ 만약 사이즈 선택 버튼이 없거나, 사이즈 리스트가 비어있다면 '원사이즈' 설정
            if (!size) {
                size = '원사이즈';
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
        console.warn(`🚨 Prada 업데이트 실패: ${err.message}`);
        if (page && !page.isClosed()) await page.close();
        if (browser) await browser.close();
      } finally {
        if (page && !page.isClosed()) await page.close();
        if (browser) await browser.close();
      }
    }
}

}
