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


// const errorLogDir = path.join(
//   '\\\\CHANMIN\\Desktop\\크롤링\\에러로그',
//   'moncler'
// );

// // 폴더 없으면 생성
// if (!fs.existsSync(errorLogDir)) {
//   fs.mkdirSync(errorLogDir, { recursive: true });
// }

// // 최종 로그 파일 경로
// const errorLogPath = path.join(errorLogDir, 'moncler_error_log.txt');

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
export class MonclerService {
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

// 1. 카테고리 가져오기 (재시도 로직 추가) 
async getCategories(siteUrls: string[]): Promise<{ categoryName: string; url: string }[]> {
  const proxyLines = await this.r2Service.loadBrightProxies2();
  if (!proxyLines.length) {
      console.warn('프록시 없음, 종료');
      return;
  }

  // 랜덤으로 1개 선택
  const raw = proxyLines[Math.floor(Math.random() * proxyLines.length)];
  const proxy = parseAuthProxy(raw);
  const proxyArg = `--proxy-server=http://${proxy.host}:${proxy.port}`;  const allCategories: { categoryName: string; url: string }[] = [];

  async function processSiteUrls(urls: string[]): Promise<void> {
    for (const siteUrl of urls) {
      let retryCount = 0;
      let success = false;

      while (retryCount < 3 && !success) {
        console.log(`🌍 [${siteUrl}] 프록시 사용: ${proxy}`);
        const browser = await puppeteer.launch({
          headless: true,
          args: [
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
        await page.setViewport({ width: 1800, height: 800 });

        try {
          await page.goto(siteUrl, { waitUntil: 'networkidle2', timeout: 30000 });
          console.log(`🔍 ${siteUrl} 진행 중...`);
          await new Promise(resolve => setTimeout(resolve, 2000));

          try {
            // ✅ 쿠키 배너가 뜰 경우 'Continue without accepting' 버튼 클릭
            const cookieButton = await page.$('button.onetrust-close-btn-handler');
            if (cookieButton) {
              await cookieButton.click();
              console.log("🍪 쿠키 배너 닫기 버튼 클릭 완료");
              await new Promise(resolve => setTimeout(resolve,2000));
            }
          } catch (err: any) {
            console.log("⚠️ 쿠키 배너가 없거나 이미 닫힘, 무시하고 진행");
          }

          // ✅ Moncler 전용 카테고리 추출 로직
          const categories: { categoryName: string; url: string }[] = [];

          const sections = ["Men", "Women", "Children"];
          for (const section of sections) {
            // 해당 span 찾기
            const spans = await page.$$('span.textStyle_subheading-2.ta_left');
            let target = null;
            for (const span of spans) {
              const text = await page.evaluate(el => el.textContent?.trim(), span);
              if (text === section) {
                target = span;
                break;
              }
            }

            if (!target) {
              console.log(`❌ ${section} 메뉴를 찾지 못함`);
              continue;
            }

            // hover
            await target.hover();
            await new Promise(resolve => setTimeout(resolve, 2000));

            // 드롭다운 내부 카테고리 추출
            const cats = await page.evaluate((baseUrl, section) => {
              const results: { categoryName: string; url: string }[] = [];
              let currentTop = "";

              const links = document.querySelectorAll('a[data-radix-collection-item]');
              links.forEach(a => {
                const span = a.querySelector("span");
                if (!span) return;

                const name = span.textContent?.trim() || "";
                const url = a.getAttribute("href") || "";

                // 대표 카테고리(subheading-1)
                if (span.classList.contains("textStyle_subheading-1")) {
                  currentTop = name;
                  return;
                }

                // "View All" 제거
                if (/^View All/i.test(name)) return;

                if (name && url) {
                  results.push({
                    categoryName: `${section} - ${currentTop} - ${name}`,
                    url: baseUrl + url.replace(/^\/+/, ""),
                  });
                }
              });

              return results;
            }, "https://www.moncler.com/", section);

            console.log(`✅ ${section}: ${cats.length}개 카테고리 추출`);
            categories.push(...cats);

            // hover 해제 대기
            await new Promise(resolve => setTimeout(resolve, 1000));
          }

          categories.forEach(category => {
            allCategories.push(category);
          });

          console.log(`📦 ${siteUrl} 총 ${categories.length}개 카테고리 수집`);
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

      console.log(`🔄 다음 URL로 이동...`);
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
      // 파일 이름에 .jpg 확장자 적용 (필요한 경우)
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

  // 자동 스크롤 함수
  private async autoScroll(page: Page) {
    await page.evaluate(async () => {
      let totalHeight = 0;
      const distance = 50;
      await new Promise<void>(resolve => {
        const timer = setInterval(() => {
          window.scrollBy(0, distance);
          totalHeight += distance;
          if (totalHeight >= document.body.scrollHeight) {
            clearInterval(timer);
            resolve();
          }
        }, 150);
      });
    });
  }

  // Moncler 사이트 크롤링 시작
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
    const serviceType = 'Moncler';
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
    let designerFromNode = '';

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
    await page.setViewport({ width: 1800, height: 800 });


    const MAX_RETRY = 5; // 최대 재시도 횟수
    let retryAttempts = 0;

    while (retryAttempts < MAX_RETRY) {
        try {
            await page.goto(siteUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
            const kidsKeywords = [
              '/junior',
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

            // URL 소문자 기준으로 검사
            const urlLower = siteUrl.toLowerCase();

            const isKids = kidsKeywords.some(keyword =>
              urlLower.includes(keyword.toLowerCase())
            );

            designerFromNode = isKids
              ? '몽클레어 키즈'
              : '몽클레어';
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

            // 프록시 변경
            
            console.log(`새로운 프록시로 변경: ${proxy}`);

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


        await page.waitForSelector('div[data-static-component="product-tile"]', {
          timeout: 60000
        });

        await this.autoScroll(page);
        await new Promise((resolve) => setTimeout(resolve, 2000));
        // ✅ Moncler 상품 URL 추출 (모든 구조 대응)
        productUrls = await page.evaluate(() => {
          const anchors = Array.from(
            document.querySelectorAll('div[data-static-component="product-tile"] a[href*="/en-"][href$=".html"]')
          ) as HTMLAnchorElement[];

          const urls = anchors
            .map(a => a.href)
            // Moncler 상품 코드(-K 또는 숫자/알파벳 패턴) 필터
            .filter(href => /[A-Z0-9]{6,}\.html$/.test(href) || href.includes('-K'))
            // coming soon, out-of-stock 제외
            .filter(href => !href.includes('coming-soon') && !href.includes('out-of-stock'))
            .filter(Boolean);

          // ✅ 중복 제거
          return Array.from(new Set(urls));
        });


        // ✅ 중복 제거 (보호용 한 번 더)
        productUrls = Array.from(new Set(productUrls));
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

                  // 프록시 변경
                  
                  console.log(`새로운 프록시로 변경: ${proxy}`);

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

    }

    if (productUrls.length === 0) {
      throw new Error('상품 URL을 수집하지 못했습니다. 모든 시도가 실패했습니다.');
    }
    console.log(`몽클레어 최종 수집된 상품 URL 수: ${productUrls.length} - ${category?.categoryName || '카테고리 없음'}`);

    for (const [index, productUrl] of productUrls.entries()) {
      let loadAttempts = 0;
      let success = false;

      while (loadAttempts < 10) {
        try {
            await page.goto(productUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
            try {
              await page.waitForSelector(
                'p.textStyle_subheading-2 span:last-child',
                { timeout: 10000 }
              );
            } catch {}
            console.log(`✅ (${index + 1}/${productUrls.length}) 몽클레어 ${category?.categoryName || '카테고리 없음'}  수집 중`);
            await new Promise((resolve) => setTimeout(resolve, 3000));
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

                  // 프록시 변경
                  
                  console.log(`새로운 프록시로 변경: ${proxy}`);

                  
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

      const isSoldOut = await page.evaluate(() => {
        const btn = document.querySelector(
          'button[data-name="pdp-atc-button"]'
        );

        if (!btn) return false;

        const text = btn.textContent?.trim().toUpperCase() || '';
        const isDisabled =
          btn.hasAttribute('disabled') ||
          btn.getAttribute('aria-disabled') === 'true';

        return text === 'NOTIFY ME' || isDisabled;
      });

      if (isSoldOut) {
        continue;
      }

      


      const productDetails = await page.evaluate(async (designerFromNode, pageUrl) => {
        const site = 'Moncler';
        const designer = designerFromNode;
        const titleElement = document.querySelector('h1.flex-g_1.textStyle_heading-4') as HTMLElement | null;
        const title = titleElement ? titleElement.textContent?.trim() : '';
        const priceElement = document.querySelector(
          'p.textStyle_subheading-2 span:last-child'
        ) as HTMLElement | null;

        let price = 0;

        if (priceElement) {
          const rawText = priceElement.textContent?.trim() || '';

          // 1️⃣ 기본 파싱 (성인)
          price = Math.floor(
            parseFloat(
              rawText
                .replace('€', '')
                .replace(/\./g, '')
                .replace(',', '.')
                .trim()
            )
          );

          // 2️⃣ 키즈 대응: NaN 이면 "From €" 제거 후 재시도
          if (Number.isNaN(price)) {
            price = Math.floor(
              parseFloat(
                rawText
                  .replace(/from\s*/i, '') // 🔥 핵심
                  .replace('€', '')
                  .replace(/\./g, '')
                  .replace(',', '.')
                  .trim()
              )
            );
          }
        }

        // ✅ 컬러 추출
        let color = '';

        const colorBtn = document.querySelector('button[aria-label^="Select color:"]') as HTMLElement | null;
        if (colorBtn) {
          // 1) 버튼 기반
          color = colorBtn.getAttribute('aria-label')
            ?.replace('Select color: ', '')
            .trim() || '';
        } else {
          // 2) "Color:" 텍스트 포함된 span 기반
          const colorSpan = Array.from(document.querySelectorAll('span'))
            .find(span => span.textContent?.includes('Color:'));
          if (colorSpan) {
            const inner = colorSpan.querySelector('span');
            if (inner) {
              color = inner.textContent.trim();
            } else {
              color = colorSpan.textContent.replace('Color:', '').trim();
            }
          }
        }

        // ✅ 라벨 제거 보정
        color = color.replace(/^Color:\s*/i, '').trim();

        

        // ✅ 이미지 추출 (상위 div.h_full.w_full.ov_hidden 내부만)
        function getDetailImages(): string[] {
          const container = document.querySelector('div.h_full.w_full.ov_hidden');
          if (!container) return [];

          const imgs = Array.from(container.querySelectorAll('img[src]'));

          return imgs
            .map(img => img.getAttribute('src'))
            .filter((url): url is string => Boolean(url))
            .map(url => url.split('#')[0]); // # 제거
        }

        // ✅ breadcrumb 카테고리 추출
        function getBreadcrumbText(): string {
          const liTexts = Array.from(
            new Set(
              Array.from(document.querySelectorAll('nav[aria-label="Breadcrumbs"] ol li a span'))
                .map(span => span.textContent?.trim() || '')
                .filter(Boolean)
            )
          );
          return liTexts.join(' > ');
        }

        // ✅ 최종 합치기
        const detailImages = getDetailImages();
        let imageUrls = detailImages;

        const breadcrumbText = getBreadcrumbText();
        if (/Ready-To-Wear|Outerwear/i.test(breadcrumbText)) {
          if (imageUrls.length >= 3) {
            const thirdImg = imageUrls[2];
            imageUrls.splice(2, 1);
            imageUrls.unshift(thirdImg);
          }
        }


        // ✅ 사이즈 추출 (Radix UI / sticky / accessory 전부 대응 - 최종본)
        async function getSizes(): Promise<string> {
          let size = '';
          const oneSizeLabel = '\uC6D0\uC0AC\uC774\uC988';
          const isLikelySizedProduct = /\/(ready-to-wear|pret-a-porter|clothing|shoes|sneakers|boots|loafers|sandals|pumps|flats|belts|denim|pants|trousers|shorts|skirts|dresses|jackets|coats|tops|shirts|knitwear|sweaters|swimwear|outerwear)\b/i
            .test(pageUrl || window.location.href);

          // 1️⃣ Size combobox 찾기
          const sizeButton = Array.from(
            document.querySelectorAll<HTMLButtonElement>('button[role="combobox"]')
          ).find(btn => /size:/i.test(btn.textContent || ''));

          // 🔹 공통 유틸: 옵션 수집
          const collectOptions = (): string[] => {
            const optionEls = document.querySelectorAll<HTMLDivElement>(
              'div[role="option"]'
            );

            return Array.from(optionEls)
              .map(option => {
                // 가장 안전한 텍스트 추출
                const text = option.innerText
                  ?.replace(/\n/g, ' ')                  // 줄바꿈 제거
                  .replace(/Limited Availability/i, '')  // 문구 제거
                  .trim() || '';

                // 품절 / 알림 제외
                if (/notify|sold out|unavailable/i.test(text)) return null;

                // 사이즈 패턴만 허용 (S, M, L, 48, 50 등)
                if (!text) return null;

                return text.replace(',', '.');
              })
              .filter((v): v is string => !!v);
          };

          // 2️⃣ Size 버튼이 있는 경우 (의류)
          if (sizeButton) {
            // ✅ STEP 0. 무조건 화면 중앙으로
            sizeButton.scrollIntoView({ block: 'center' });
            await new Promise(r => setTimeout(r, 300));

            // ✅ STEP 1. sticky / collapsed 상태 해제 (⭐ 핵심)
            document.body.removeAttribute('data-sticky-container-collapsed-on');
            document.body.removeAttribute('data-sticky-container');

            // ✅ STEP 2. Radix UI 열기 시도 (pointer 이벤트 풀세트)
            sizeButton.dispatchEvent(
              new PointerEvent('pointerdown', { bubbles: true })
            );
            sizeButton.dispatchEvent(
              new PointerEvent('pointerup', { bubbles: true })
            );
            sizeButton.click();

            // ✅ STEP 3. DOM 렌더 대기
            await new Promise(r => setTimeout(r, 1200));

            // ✅ STEP 4. 1차 옵션 수집
            let sizes = collectOptions();

            // ❗ 아직 안 떴으면 → 상태 강제 OPEN
            if (sizes.length === 0) {
              sizeButton.setAttribute('data-state', 'open');
              sizeButton.setAttribute('aria-expanded', 'true');

              await new Promise(r => setTimeout(r, 800));
              sizes = collectOptions();
            }

            // ❗ 그래도 없으면 → keyboard fallback
            if (sizes.length === 0) {
              sizeButton.dispatchEvent(
                new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
              );
              sizeButton.dispatchEvent(
                new KeyboardEvent('keyup', { key: 'Enter', bubbles: true })
              );

              await new Promise(r => setTimeout(r, 800));
              sizes = collectOptions();
            }

            // ✅ 결과 정리
            if (sizes.length === 0) {
              // 사이즈 셀렉터는 있는데 옵션이 없음 → 품절
              size = '';
            } else {
              size = Array.from(new Set(sizes)).join(', ');
            }

          } else {
            // 3️⃣ 악세사리 / 원사이즈 (Size 버튼 자체가 없음)
            const accSizeEl = document.querySelector<HTMLElement>(
              'div.d_flex.gap_0 p span'
            );

            if (accSizeEl && accSizeEl.textContent?.trim()) {
              size = accSizeEl.textContent.trim();
            } else {
              return isLikelySizedProduct ? '' : oneSizeLabel;
            }
          }

          return size;
        }

        // ▶ 실제 호출
        const size = await getSizes();





        let mainInfo = '';
        let styleId = '';
        let brandstyleId = '';
        let madeIn = '';

        // ✅ Product Details 탭 먼저 시도
        const descriptionBlock = document.querySelector('div[role="tabpanel"][id*="product-detail"]');
        if (descriptionBlock) {
          const descParts: string[] = [];
          const paragraphs = Array.from(descriptionBlock.querySelectorAll('p'))
            .map(p => p.textContent?.trim() || '')
            .filter(Boolean);

          const bullets = Array.from(descriptionBlock.querySelectorAll('li'))
            .map(li => li.textContent?.trim() || '')
            .filter(Boolean);

          if (paragraphs.length) descParts.push(...paragraphs);
          if (bullets.length) descParts.push(...bullets);

          mainInfo = descParts.join('<br/>');
        }

        // ✅ 만약 mainInfo가 비어있다면 → Details & Care 버튼 클릭
        if (!mainInfo) {
          const detailsBtn = Array.from(document.querySelectorAll('button'))
            .find(btn => btn.textContent?.includes('Details & Care'));
          if (detailsBtn) {
            (detailsBtn as HTMLElement).click(); // 👉 클릭 방식 그대로
            await new Promise(resolve => setTimeout(resolve, 1000));

            const detailBlock = document.querySelector('div[role="tabpanel"][id*="product-detail"]');
            if (detailBlock) {
              const descParts: string[] = [];
              const paragraphs = Array.from(detailBlock.querySelectorAll('p'))
                .map(p => p.textContent?.trim() || '')
                .filter(Boolean);

              const bullets = Array.from(detailBlock.querySelectorAll('li'))
                .map(li => li.textContent?.trim() || '')
                .filter(Boolean);

              if (paragraphs.length) descParts.push(...paragraphs);
              if (bullets.length) descParts.push(...bullets);

              mainInfo = descParts.join('<br/>');
            }
          }
        }

        // ✅ Composition & Care 탭 버튼 "Enter" 이벤트 후 수집
        const compTabBtn = Array.from(document.querySelectorAll('button[role="tab"]'))
          .find(btn => btn.textContent?.includes('Composition & Care'));
        if (compTabBtn) {
          compTabBtn.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
          compTabBtn.dispatchEvent(new KeyboardEvent("keyup", { key: "Enter", bubbles: true }));
          await new Promise(resolve => setTimeout(resolve, 1000));

          const compositionBlock = document.querySelector('div[role="tabpanel"][id*="composition"]');
          if (compositionBlock) {
            const compParts: string[] = [];
            const paragraphs = Array.from(compositionBlock.querySelectorAll('p'))
              .map(p => p.textContent?.trim() || '')
              .filter(Boolean);

            const bullets = Array.from(compositionBlock.querySelectorAll('li'))
              .map(li => li.textContent?.trim() || '')
              .filter(Boolean);

            if (paragraphs.length) compParts.push(...paragraphs);
            if (bullets.length) compParts.push(...bullets);

            if (compParts.length) {
              if (mainInfo) mainInfo += '<br/>';
              mainInfo += compParts.join('<br/>');
            }

            // ✅ Made in 추출
            const lastPs = Array.from(compositionBlock.querySelectorAll('p'))
              .map(p => p.textContent?.trim())
              .filter(Boolean);

            if (lastPs.length >= 1) {
              const madeInText = lastPs[lastPs.length - 1];
              if (madeInText.startsWith('Made in')) {
                madeIn = madeInText.replace('Made in', '').trim();
              }
            }
          }
        }

        // ✅ styleId / brandstyleId 추출
        const currentUrl = window.location.href;
        const urlMatch = currentUrl.match(/-([A-Z0-9]+)\.html$/);
        if (urlMatch) {
          styleId = urlMatch[1];
          brandstyleId = styleId;
        }

      
        return { site, designer, title, price, color, mainInfo, madeIn, styleId, size, brandstyleId, imageUrls };
      }, designerFromNode, productUrl);


      const missingFields = [];

      if (!productDetails) {
        missingFields.push('productDetails');
      } else {
        if (!productDetails.mainInfo) missingFields.push('mainInfo');
        if (!productDetails.styleId) missingFields.push('styleId');
        if (!productDetails.title) missingFields.push('title');
        if (!productDetails.price) missingFields.push('price');
        if (!productDetails.imageUrls?.length) missingFields.push('imageUrls');
        if (!productDetails.size) missingFields.push('size');
        if (!productDetails.brandstyleId) missingFields.push('brandstyleId');
      }

      if (missingFields.length > 0) {
        console.warn(`몽클레어 데이터 누락 (${productUrl}) →`, missingFields);
        continue;
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
          
              console.log(`몽클레어 품절 처리 완료: ${product.title} (styleId: ${product.styleId})`);
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
        try {
          await page.waitForSelector(
            'p.textStyle_subheading-2 span:last-child',
            { timeout: 10000 }
          );
        } catch {}

        let productDetails = await page.evaluate(async (pageUrl) => {
          const priceElement = document.querySelector('p.textStyle_body-1') as HTMLElement | null;
          const price = priceElement
            ? Math.floor(
                parseFloat(
                  priceElement.textContent
                    ?.replace('€', '')
                    .trim()
                    .replace('.', '')
                    .replace(',', '.') || '0'
                )
              )
            : 0;

          // ✅ 사이즈 추출 (모든 예외 처리 통합 버전)
          async function getSizes(): Promise<string> {
            let size = '';
            const oneSizeLabel = '\uC6D0\uC0AC\uC774\uC988';
            const isLikelySizedProduct = /\/(ready-to-wear|pret-a-porter|clothing|shoes|sneakers|boots|loafers|sandals|pumps|flats|belts|denim|pants|trousers|shorts|skirts|dresses|jackets|coats|tops|shirts|knitwear|sweaters|swimwear|outerwear)\b/i
              .test(pageUrl || window.location.href);

            // 1️⃣ "Size:" 버튼 탐색
            const sizeButton = Array.from(
              document.querySelectorAll<HTMLButtonElement>('button[role="combobox"]')
            ).find(btn => btn.textContent?.includes('Size:'));

            if (sizeButton) {
              // ✅ Radix UI 감지
              const isRadix =
                sizeButton.hasAttribute('aria-controls') ||
                sizeButton.hasAttribute('data-state') ||
                sizeButton.className.includes('radix') ||
                sizeButton.getAttributeNames().some(attr => attr.startsWith('data-radix'));

              if (isRadix) {
                console.log('🧩 Radix UI 감지됨 → click() + mouse event 사용');
                const mouseDown = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
                const mouseUp = new MouseEvent('mouseup', { bubbles: true, cancelable: true });
                sizeButton.dispatchEvent(mouseDown);
                sizeButton.dispatchEvent(mouseUp);
                sizeButton.click();
              } else {
                console.log('⌨️ 일반 combobox → KeyboardEvent(Enter) 사용');
                sizeButton.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
                sizeButton.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', bubbles: true }));
              }

              // 옵션 DOM 뜰 때까지 대기
              await new Promise(resolve => setTimeout(resolve, 1500));

              // ✅ PC / 모바일 모두 대응 (공통 selector)
              const optionEls = document.querySelectorAll<HTMLDivElement>('div[role="option"][data-radix-collection-item], div[role="option"]');

              const sizes = Array.from(optionEls)
                .map(option => {
                  // 1️⃣ 실제 사이즈 텍스트는 보통 첫 번째 span.w_10 안에 존재
                  const sizeSpan = option.querySelector<HTMLSpanElement>('span.w_10') ||
                                  option.querySelector<HTMLSpanElement>('span:not([class*="textStyle_subheading-2"])');
                  const sizeText = sizeSpan?.textContent?.trim() || '';

                  // 2️⃣ 품절 관련 문구 필터링
                  const hasNotify = Array.from(option.querySelectorAll('button, span'))
                    .some(el => /Notify Me|Sold Out|Unavailable/i.test(el.textContent || ''));

                  // 3️⃣ 유효한 사이즈만 리턴
                  if (sizeText && !hasNotify) return sizeText;
                  return null;
                })
                .filter((v): v is string => !!v);

              if (sizes.length === 0) {
                console.log('⚠️ 모든 사이즈가 품절입니다.');
                size = '';
              } else {
                size = Array.from(new Set(sizes))
                  .map(s => s.replace(',', '.'))
                  .join(', ');
              }
            } else {
              // 3️⃣ 악세사리 / 원사이즈 처리
              const accSizeEl = document.querySelector<HTMLSpanElement>(
                'div.d_flex.gap_0 p span.ai_center.d_flex.gap_1.pos_relative span'
              );
              if (accSizeEl && accSizeEl.textContent?.trim()) {
                size = accSizeEl.textContent.trim();
              } else {
                return isLikelySizedProduct ? '' : oneSizeLabel;
              }
            }

            return size;
          }

          // 마지막에 호출
          const size = await getSizes();


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
        console.warn(`🚨 Moncler 업데이트 실패: ${err.message}`);
        if (page && !page.isClosed()) await page.close();
        if (browser) await browser.close();
      } finally {
        if (page && !page.isClosed()) await page.close();
        if (browser) await browser.close();
      }
    }
  }
}
