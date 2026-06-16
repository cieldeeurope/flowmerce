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


class ProxyManager {
    private original: string[];
    private queue: string[];
  
    constructor(proxies: string[]) {
      this.original = [...proxies];
      this.queue = [];
      this.shuffle();
    }
  
    private shuffle() {
      this.queue = [...this.original];
      for (let i = this.queue.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [this.queue[i], this.queue[j]] = [this.queue[j], this.queue[i]];
      }
    }
  
    public getNextProxy(): string {
      if (this.queue.length === 0) {
        this.shuffle();
      }
      return this.queue.pop()!;
    }
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
//   'loewe'
// );

// // 폴더 없으면 생성
// if (!fs.existsSync(errorLogDir)) {
//   fs.mkdirSync(errorLogDir, { recursive: true });
// }

// // 최종 로그 파일 경로
// const errorLogPath = path.join(errorLogDir, 'loewe_error_log.txt');

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
export class LoeweService {
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


// 1. 카테고리 가져오기 (프록시 교체 및 재시도 로직 포함)
async getCategories(siteUrls: string[]): Promise<{ categoryName: string; url: string }[]> {
  const proxyLines = await this.r2Service.loadBrightProxies2();
  if (!proxyLines.length) {
      console.warn('프록시 없음, 종료');
      return;
  }

  // 랜덤으로 1개 선택
  const raw = proxyLines[Math.floor(Math.random() * proxyLines.length)];
  const proxy = parseAuthProxy(raw);
  const proxyArg = `--proxy-server=http://${proxy.host}:${proxy.port}`;
  const allCategories: { categoryName: string; url: string }[] = [];

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
            // //'--window-position=-9999,0',
          ]
        });

        const context = browser.defaultBrowserContext();
        const page = await browser.newPage();
        await page.authenticate({
          username: proxy.username,
          password: proxy.password,
        });
        await context.setCookie({
          name: 'dispatchSite',
          value: 'FR-en-LOE_EUR-EUR',
          domain: '.loewe.com',
          path: '/',
        });

     
        await page.evaluateOnNewDocument(() => {
            // Chrome DevTools 감지 방지
            const originalQuery = Object.getPrototypeOf(navigator.permissions).query;
            Object.getPrototypeOf(navigator.permissions).query = function (parameters) {
                if (parameters.name === 'notifications') {
                    return Promise.resolve({ state: Notification.permission });
                }
                return originalQuery.apply(this, arguments);
            };
        
            // WebRTC 감지 우회
            Object.defineProperty(window, 'RTCPeerConnection', {
                get: () => null,
            });
        
            Object.defineProperty(navigator, 'deviceMemory', {
                get: () => 8,
            });
        
            Object.defineProperty(navigator, 'hardwareConcurrency', {
                get: () => 4,
            });

            Object.defineProperty(navigator, 'plugins', {
                get: () => [1, 2, 3, 4, 5],
            });
              
        });
      
        await page.setViewport({ width: 1920, height: 1080 });
        await page.setCacheEnabled(false);

        await page.setExtraHTTPHeaders({
            Referer: 'https://www.loewe.com/eur/en/home',
            Origin: 'https://www.loewe.com',
        });

        try {
          await page.goto(siteUrl, { waitUntil: 'networkidle2', timeout: 30000 });
          console.log(`🔍 ${siteUrl} 진행 중...`);
          await new Promise((resolve) => setTimeout(resolve, 3000));

          const categoryResults = await page.evaluate(async () => {
            const clickButtonByText = (text: string) => {
              const buttons = Array.from(document.querySelectorAll('button.css-1fv9a4a.ei4k61c7'));
              const target = buttons.find(btn => btn.textContent?.trim() === text);
              if (target && target instanceof HTMLElement) {
                target.click();
              }
            };

            const collectCategories = () => {
              const uls = document.querySelectorAll('#categories-container ul.css-d6djed.ehrx1c52');
              const sliced = Array.from(uls).slice(1, 5);

              return sliced.flatMap(ul =>
                Array.from(ul.querySelectorAll('a[href]'))
                  .filter((a): a is HTMLAnchorElement => a instanceof HTMLAnchorElement)
                  .map(a => {
                    const url = a.href;
                    const match = url.match(/\/eur\/en\/([^?#]+)/);
                    if (!match) return null;

                    const parts = match[1].split('/');
                    if (parts.length < 3) return null;

                    return {
                      categoryName: `${parts[0]} - ${parts[1]} - ${parts[2]}`,
                      url
                    };
                  })
                  .filter((v): v is { categoryName: string; url: string } => v !== null)
              );
            };

            clickButtonByText("Women");
            await new Promise(resolve => setTimeout(resolve, 1500));
            const womenCategories = collectCategories();

            clickButtonByText("Men");
            await new Promise(resolve => setTimeout(resolve, 1500));
            const menCategories = collectCategories();

            return [...womenCategories, ...menCategories];
          });

          allCategories.push(...categoryResults);
          console.log(`✅ 수집 완료: ${categoryResults.length}개`);
          success = true;
        } catch (error: any) {
          console.error(`❌ 오류 발생: ${error.message}`);
          retryCount++;
          console.warn(`⚠️ 재시도 (${retryCount}/3)...`);
        } finally {
          await browser.close();
        }
      }

      if (!success) {
        console.warn(`🚫 [${siteUrl}] 3회 시도 후 실패`);
      }

      console.log(`🔄 다음 URL로 진행`);
    }
  }

  await processSiteUrls(siteUrls);
  console.log(`🎯 전체 사이트 카테고리 수집 완료`);
  return allCategories;
}

  




private async uploadImageToR2(
  imageUrl: string,
  fileName: string,
  product: Product,
): Promise<string> {
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
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36',
        'Accept': 'image/jpeg,image/png,image/*;q=0.8,*/*;q=0.7', // WebP 강제 방지용
      },
    });

    let imageBuffer = Buffer.from(response.data, 'binary');

    // 메타데이터 확인
    const metadata = await sharp(imageBuffer).metadata();

    // 쿼리 스트링 제거 (예: ?sw=850&q=100)
    fileName = fileName.replace(/\?.*$/, '');

    // webp 또는 avif라면 JPEG로 변환 및 확장자 덮어쓰기
    if (metadata.format === 'webp' || metadata.format === 'avif') {

      // 이미지 포맷 변환
      imageBuffer = await sharp(imageBuffer).jpeg().toBuffer();

      // 파일명 확장자 무조건 .jpg로 덮어쓰기
      fileName = fileName.replace(/\.[^/.]+$/, '.jpg');
    }

    // R2에 업로드
    const r2ImageUrl = await this.r2Service.uploadImageToR2(
      fileName,
      imageBuffer,
      product,
    );

    return r2ImageUrl;
  } catch (error: any) {
    console.error(`🚫 이미지 업로드 실패 (${imageUrl}): ${error.message}`);
    //logErrorToDesktop(error, `1.오류 발생`);
    throw error;
  }
}


// 자동 스크롤 함수
private async autoScroll(page: Page) {
  await page.evaluate(async () => {
    const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

    let lastHeight = 0;

    while (true) {
      const prevScroll = window.scrollY;

      // 1️⃣ 부드럽게 내리기
      window.scrollBy(0, 300);
      await delay(50);

      const currentScroll = window.scrollY;

      // 2️⃣ 더 이상 안 내려가면 (바닥 근처)
      if (currentScroll === prevScroll) {

        // 👉 여기서만 2초 대기
        await delay(2000);

        const newHeight = document.body.scrollHeight;

        // 3️⃣ 더 안 늘어나면 진짜 끝
        if (newHeight === lastHeight) {
          break;
        }

        // 4️⃣ 늘어났으면 다시 계속 스크롤
        lastHeight = newHeight;
      }
    }
  });
}

  

private async autoScrollAndCollect(page: Page): Promise<Set<string>> {
  const collected = new Set<string>();

  // 1️⃣ 끝까지 스크롤 먼저
  await this.autoScroll(page);
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // 2️⃣ 한 번에 수집
  const urls: string[] = await page.evaluate(() => {
    return Array.from(
      document.querySelectorAll<HTMLAnchorElement>(
        'li[data-typeid="product-tile"] a[href]'
      )
    )
      .map(a => {
        const href = a.getAttribute('href');
        if (!href) return null;

        return href.startsWith('http')
          ? href
          : location.origin + href;
      })
      .filter((v): v is string => !!v);
  });

  urls.forEach(url => collected.add(url));

  return collected;
}


  // Loewe 사이트 크롤링 시작
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
    const serviceType = 'Loewe';
    const proxyLines = await this.r2Service.loadBrightProxies2();
    const proxy = pickProxy(proxyLines);
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
        //'--window-position=-9999,0',
    ],
});

    page = await browser.newPage();
    await page.authenticate({
      username: proxy.username,
      password: proxy.password,
    });

        const context = page.browserContext();
        await context.setCookie({
          name: 'dispatchSite',
          value: 'FR-en-LOE_EUR-EUR',
          domain: '.loewe.com',
          path: '/',
        });

     
        await page.evaluateOnNewDocument(() => {
            // Chrome DevTools 감지 방지
            const originalQuery = Object.getPrototypeOf(navigator.permissions).query;
            Object.getPrototypeOf(navigator.permissions).query = function (parameters) {
                if (parameters.name === 'notifications') {
                    return Promise.resolve({ state: Notification.permission });
                }
                return originalQuery.apply(this, arguments);
            };
        
            // WebRTC 감지 우회
            Object.defineProperty(window, 'RTCPeerConnection', {
                get: () => null,
            });
        
            Object.defineProperty(navigator, 'deviceMemory', {
                get: () => 8,
            });
        
            Object.defineProperty(navigator, 'hardwareConcurrency', {
                get: () => 4,
            });

            Object.defineProperty(navigator, 'plugins', {
                get: () => [1, 2, 3, 4, 5],
            });
              
        });
      
        await page.setViewport({ width: 1920, height: 1080 });
        await page.setCacheEnabled(false);

        await page.setExtraHTTPHeaders({
            Referer: 'https://www.loewe.com/eur/en/home',
            Origin: 'https://www.loewe.com',
        });


    const MAX_RETRY = 5; // 최대 재시도 횟수
    let retryAttempts = 0;

    while (retryAttempts < MAX_RETRY) {
        try {
            await page.goto(`${siteUrl}?c_refine=["c_LW_availability=In%20stock"]`, { waitUntil: 'domcontentloaded', timeout: 30000 });
            await page.waitForFunction(() => {
              return document.querySelector('a[href]') !== null;
            }, { timeout: 30000 });
            
            try {
            // Accept all 버튼 기다리기
            await page.waitForSelector('#onetrust-accept-btn-handler', { visible: true, timeout: 6000 });
            const acceptButton = await page.$('#onetrust-accept-btn-handler');
            if (acceptButton) {
              await page.evaluate((btn) => (btn as HTMLElement).click(), acceptButton);
              await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 10000 }).catch(() => {});
            }
          } catch (error: any) {
          }
          await new Promise((resolve) => setTimeout(resolve, 2000));
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
                    //'--window-position=-9999,0',
                ],
            });
            page = await browser.newPage();
            await page.authenticate({
              username: proxy.username,
              password: proxy.password,
            });

        const context = page.browserContext();
        await context.setCookie({
          name: 'dispatchSite',
          value: 'FR-en-LOE_EUR-EUR',
          domain: '.loewe.com',
          path: '/',
        });
     
        await page.evaluateOnNewDocument(() => {
            // Chrome DevTools 감지 방지
            const originalQuery = Object.getPrototypeOf(navigator.permissions).query;
            Object.getPrototypeOf(navigator.permissions).query = function (parameters) {
                if (parameters.name === 'notifications') {
                    return Promise.resolve({ state: Notification.permission });
                }
                return originalQuery.apply(this, arguments);
            };
        
            // WebRTC 감지 우회
            Object.defineProperty(window, 'RTCPeerConnection', {
                get: () => null,
            });
        
            Object.defineProperty(navigator, 'deviceMemory', {
                get: () => 8,
            });
        
            Object.defineProperty(navigator, 'hardwareConcurrency', {
                get: () => 4,
            });

            Object.defineProperty(navigator, 'plugins', {
                get: () => [1, 2, 3, 4, 5],
            });
              
        });
      
        await page.setViewport({ width: 1920, height: 1080 });
        await page.setCacheEnabled(false);

        await page.setExtraHTTPHeaders({
            Referer: 'https://www.loewe.com/eur/en/home',
            Origin: 'https://www.loewe.com',
        });


            // 다음 재시도를 위한 랜덤 대기 시간 (exponential backoff)
            const waitTime = Math.min(1000 * 2 ** retryAttempts, 10000); // 최대 10초 대기
            await new Promise((resolve) => setTimeout(resolve, waitTime));
        }
    }

    while (true) {
      try {
        const urls = await this.autoScrollAndCollect(page);
        productUrls = [...urls];
        break;
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
                        //'--window-position=-9999,0',
                      ],
                  });
                  page = await browser.newPage();
                  await page.authenticate({
                    username: proxy.username,
                    password: proxy.password,
                  });

        const context = page.browserContext();
        await context.setCookie({
          name: 'dispatchSite',
          value: 'FR-en-LOE_EUR-EUR',
          domain: '.loewe.com',
          path: '/',
        });
     
        await page.evaluateOnNewDocument(() => {
            // Chrome DevTools 감지 방지
            const originalQuery = Object.getPrototypeOf(navigator.permissions).query;
            Object.getPrototypeOf(navigator.permissions).query = function (parameters) {
                if (parameters.name === 'notifications') {
                    return Promise.resolve({ state: Notification.permission });
                }
                return originalQuery.apply(this, arguments);
            };
        
            // WebRTC 감지 우회
            Object.defineProperty(window, 'RTCPeerConnection', {
                get: () => null,
            });
        
            Object.defineProperty(navigator, 'deviceMemory', {
                get: () => 8,
            });
        
            Object.defineProperty(navigator, 'hardwareConcurrency', {
                get: () => 4,
            });

            Object.defineProperty(navigator, 'plugins', {
                get: () => [1, 2, 3, 4, 5],
            });
              
        });
      
        await page.setViewport({ width: 1920, height: 1080 });
        await page.setCacheEnabled(false);

        await page.setExtraHTTPHeaders({
            Referer: 'https://www.loewe.com/eur/en/home',
            Origin: 'https://www.loewe.com',
        });

              } catch (closeError: any) {
                  console.warn("브라우저 종료 중 추가 오류:", closeError.message);
              }
          }
           // 새로운 프록시 설정
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
    console.log(`✅ 로에베 최종 수집된 상품 URL 수: ${productUrls.length} - ${category?.categoryName || '카테고리 없음'}`);

    
    for (const [index, productUrl] of productUrls.entries()) {
      let loadAttempts = 0;
      let success = false;

      while (loadAttempts < 10) {
        try {
            await page.goto(productUrl, { waitUntil: 'networkidle2', timeout: 30000 });
            console.log(`✅ (${index + 1}/${productUrls.length}) 로에베 ${category?.categoryName || '카테고리 없음'}  수집 중`);
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
                        //'--window-position=-9999,0',
                      ],
                  });
                  page = await browser.newPage();
                  await page.authenticate({
                    username: proxy.username,
                    password: proxy.password,
                  });

        const context = page.browserContext();
        await context.setCookie({
          name: 'dispatchSite',
          value: 'FR-en-LOE_EUR-EUR',
          domain: '.loewe.com',
          path: '/',
        });
     
        await page.evaluateOnNewDocument(() => {
            // Chrome DevTools 감지 방지
            const originalQuery = Object.getPrototypeOf(navigator.permissions).query;
            Object.getPrototypeOf(navigator.permissions).query = function (parameters) {
                if (parameters.name === 'notifications') {
                    return Promise.resolve({ state: Notification.permission });
                }
                return originalQuery.apply(this, arguments);
            };
        
            // WebRTC 감지 우회
            Object.defineProperty(window, 'RTCPeerConnection', {
                get: () => null,
            });
        
            Object.defineProperty(navigator, 'deviceMemory', {
                get: () => 8,
            });
        
            Object.defineProperty(navigator, 'hardwareConcurrency', {
                get: () => 4,
            });

            Object.defineProperty(navigator, 'plugins', {
                get: () => [1, 2, 3, 4, 5],
            });
              
        });
      
        await page.setViewport({ width: 1920, height: 1080 });
        await page.setCacheEnabled(false);

        await page.setExtraHTTPHeaders({
            Referer: 'https://www.loewe.com/eur/en/home',
            Origin: 'https://www.loewe.com',
        });

                continue;
              } else {
                  console.error('최대 로드 시도 초과 - 다음 URL로 이동합니다.');
                  //logErrorToDesktop(error, `6.오류 발생`);
                  break;
              }
          }
      }


      
      const hasSoldOut = await page.evaluate(() => {
        return document.querySelector('[data-product-action="soldout"]') !== null;
      });
      
      if (hasSoldOut) {
        continue; // 문의하기 버튼이 있으면 재고 없음 → 다음 상품으로 건너뜁니다.
      }


      const productDetails = await page.evaluate(async (currentUrl) => {
        const site = 'Loewe';
        const designer = '로에베';
        const titleElement = document.querySelector('div.css-10d3b8l.e18joj062 h1');
        const title = titleElement && titleElement.textContent?titleElement.textContent.replace(/\s+/g, ' ').trim() : '';
        const priceElement = document.querySelector('div.css-1xdhyk6.e1laz5651');
        let price = 0;
        if (priceElement) {
            const rawPrice = priceElement.textContent?.replace(/[^\d,]/g, '') || '';
            // 유럽형식 쉼표 → 점으로 바꾸고 float 처리
            price = parseFloat(rawPrice.replace(',', '.').replace(/\./g, ''));
        }
        const label = Array.from(document.querySelectorAll('.attribute__label'))
            .find(el => el.textContent?.trim() === 'Colour');
        const color = label 
            ? label.closest('div.css-ga3b11.efxs03g1')?.querySelectorAll('p')[1]?.textContent?.trim() || ''
            : '';

        
        // 이미지 처리
        const imageElements = document.querySelectorAll('[data-testid="layout-image"] div.css-16uuj8k.e1bgrmee3');

        const imageUrls: string[] = Array.from(imageElements).map((element) => {
        const sourceElements = element.querySelectorAll('source');
        let chosenUrl = '';

        // (min-width: 1024px)에 해당하는 source를 우선 선택
        for (const source of Array.from(sourceElements)) {
            const media = source.getAttribute('media') || '';
            const srcset = source.getAttribute('srcset') || '';

            if (media.includes('min-width: 1024px') && srcset) {
            chosenUrl = srcset;
            break;
            }
        }

        // fallback: <img src="...">에서 직접 추출
        if (!chosenUrl) {
            const img = element.querySelector('img');
            if (img) {
            chosenUrl = img.getAttribute('src') || '';
            }
        }

        // 상대경로 → 절대경로 변환
        if (chosenUrl.startsWith('/')) {
            chosenUrl = new URL(chosenUrl, location.origin).href;
        }

        // 동영상 URL 또는 불필요한 항목 제외
        if (chosenUrl.includes('/images/is/poster-video/') || chosenUrl.endsWith('.mp4')) {
            return '';
        }

        return chosenUrl;
        }).filter(url => url !== '');


        

        const oneSizeLabel = '\uC6D0\uC0AC\uC774\uC988';
        const isLikelySizedProduct = /\/(ready-to-wear|pret-a-porter|clothing|shoes|sneakers|boots|loafers|sandals|pumps|flats|belts|denim|pants|trousers|shorts|skirts|dresses|jackets|coats|tops|shirts|knitwear|sweaters|swimwear)\b/i
          .test(currentUrl || window.location.href);

        const sizeElements = document.querySelectorAll('div.css-1hjcbr6.ettdky10');

        let size: string;

        if (!sizeElements || sizeElements.length === 0) {
        if (isLikelySizedProduct) return null;
        size = oneSizeLabel;
        } else {
        const sizeList = Array.from(sizeElements)
            .map(el => {
            const spanTexts = Array.from(el.querySelectorAll('span')).map(span => span.textContent?.trim() || '');
            return spanTexts;
            })
            // "Notify me"가 포함된 항목 제외
            .filter(spanTexts => !spanTexts.some(text => text.toLowerCase().includes('notify me')))
            // 유효한 사이즈만 추출
            .map(spanTexts => spanTexts[0]) // 첫 span이 사이즈 (예: "XXS")
            .filter(size => size && size.trim().length > 0);

        if (sizeList.length === 0) {
            console.log("⚠️ 모든 사이즈가 품절 또는 알림설정입니다.");
            size = null;
        } else {
            size = sizeList
            .map(size => size.replace(',', '.'))
            .join(', ');        }
        }



        let mainInfo = '';
        let styleId = '';
        let brandstyleId = '';
        let madeIn = '';

        // ✅ 1. 제품 설명 + 특징 텍스트 추출 (루트 블록 기준, sustainability 제외)
        const rootBlock = document.querySelector('div.css-xnslp4.euaqtmr0');
        if (rootBlock) {
        const sustainability = rootBlock.querySelector('[data-testid="sustainability"]');
        if (sustainability) {
            sustainability.remove(); // 제외
        }

        const textTags = rootBlock.querySelectorAll('p, li, span');
        const textLines = Array.from(textTags)
            .map(el => el.textContent?.trim())
            .filter(text => !!text && text.length > 1);
        mainInfo = textLines.join('\n');
        }

        // ✅ 2. Made in 추출 (css-o2vhvd.e1b708ep4)
        const madeInBlock = document.querySelector('div.css-o2vhvd.e1b708ep4') as HTMLElement;
        if (madeInBlock) {
        const infoPairs = madeInBlock.querySelectorAll('div.css-idfvfs.e1b708ep1');
        infoPairs.forEach(pair => {
            const labelSpan = pair.querySelector('span.css-1v2wgyo.e1b708ep0');
            const valueSpan = labelSpan?.nextElementSibling;
            const label = labelSpan?.textContent?.trim();
            const value = valueSpan?.textContent?.trim();

            if (label === 'Made in' && value) {
            madeIn = value;
            }
        });
        }

        const url = location.href;

        // 마지막 / 이후 ~ .html 까지 추출
        const match = url.match(/\/([^\/]+)\.html$/i);

        if (match) {
          styleId = match[1].replace('-', ''); // - 제거
          brandstyleId = styleId;
        }



        return { site, designer, title, price, color, mainInfo, madeIn, styleId, size, brandstyleId, imageUrls };
    }, productUrl);


      if (!productDetails || !productDetails.mainInfo || !productDetails.styleId || !productDetails.title || !productDetails.price || !productDetails.imageUrls.length || !productDetails.size || !productDetails.brandstyleId) {
        console.warn('로에베 데이터 누락 - 다음 productUrl로 이동');
        continue; // 다음 productUrl로 이동
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
          
              console.log(`로에베 품절 처리 완료: ${product.title} (styleId: ${product.styleId})`);
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
          //logErrorToDesktop(error, `11.오류 발생`);
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
            //'--window-position=-9999,0',
          ],
        });

    page = await browser.newPage();
    await page.authenticate({
      username: proxy.username,
      password: proxy.password,
    });

        const context = page.browserContext();
        await context.setCookie({
          name: 'dispatchSite',
          value: 'FR-en-LOE_EUR-EUR',
          domain: '.loewe.com',
          path: '/',
        });

     
        await page.evaluateOnNewDocument(() => {
            // Chrome DevTools 감지 방지
            const originalQuery = Object.getPrototypeOf(navigator.permissions).query;
            Object.getPrototypeOf(navigator.permissions).query = function (parameters) {
                if (parameters.name === 'notifications') {
                    return Promise.resolve({ state: Notification.permission });
                }
                return originalQuery.apply(this, arguments);
            };
        
            // WebRTC 감지 우회
            Object.defineProperty(window, 'RTCPeerConnection', {
                get: () => null,
            });
        
            Object.defineProperty(navigator, 'deviceMemory', {
                get: () => 8,
            });
        
            Object.defineProperty(navigator, 'hardwareConcurrency', {
                get: () => 4,
            });

            Object.defineProperty(navigator, 'plugins', {
                get: () => [1, 2, 3, 4, 5],
            });
              
        });
      
        await page.setViewport({ width: 1920, height: 1080 });
        await page.setCacheEnabled(false);

        await page.setExtraHTTPHeaders({
            Referer: 'https://www.loewe.com/eur/en/home',
            Origin: 'https://www.loewe.com',
        });
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
        await page.waitForSelector(
          'button[data-testid="find-and-reserve-in-store-btn"]',
          { visible: true, timeout: 30000 }
        );


        let productDetails = await page.evaluate(async (currentUrl) => {
          const priceElement = document.querySelector('div.css-1xdhyk6.e1laz5651');
          let price = 0;
          if (priceElement) {
              const rawPrice = priceElement.textContent?.replace(/[^\d,]/g, '') || '';
              // 유럽형식 쉼표 → 점으로 바꾸고 float 처리
              price = parseFloat(rawPrice.replace(',', '.').replace(/\./g, ''));
          }

          const oneSizeLabel = '\uC6D0\uC0AC\uC774\uC988';
          const isLikelySizedProduct = /\/(ready-to-wear|pret-a-porter|clothing|shoes|sneakers|boots|loafers|sandals|pumps|flats|belts|denim|pants|trousers|shorts|skirts|dresses|jackets|coats|tops|shirts|knitwear|sweaters|swimwear)\b/i
            .test(currentUrl || window.location.href);

          const sizeElements = document.querySelectorAll('div.css-1hjcbr6.ettdky10');
          let size: string;
          if (!sizeElements || sizeElements.length === 0) {
          if (isLikelySizedProduct) return null;
          size = oneSizeLabel;
          } else {
          const sizeList = Array.from(sizeElements)
              .map(el => {
              const spanTexts = Array.from(el.querySelectorAll('span')).map(span => span.textContent?.trim() || '');
              return spanTexts;
              })
              // "Notify me"가 포함된 항목 제외
              .filter(spanTexts => !spanTexts.some(text => text.toLowerCase().includes('notify me')))
              // 유효한 사이즈만 추출
              .map(spanTexts => spanTexts[0]) // 첫 span이 사이즈 (예: "XXS")
              .filter(size => size && size.trim().length > 0);

          if (sizeList.length === 0) {
              console.log("⚠️ 모든 사이즈가 품절 또는 알림설정입니다.");
              size = null;
          } else {
              size = sizeList
              .map(size => size.replace(',', '.'))
              .join(', ');        }
          }

          const soldOut = !price || !size || size.length === 0; // ✅ 둘 중 하나라도 없으면 품절
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
        console.warn(`🚨 Loewe 업데이트 실패: ${err.message}`);
        if (page && !page.isClosed()) await page.close();
        if (browser) await browser.close();
      } finally {
        if (page && !page.isClosed()) await page.close();
        if (browser) await browser.close();
      }
    }
  }
}
