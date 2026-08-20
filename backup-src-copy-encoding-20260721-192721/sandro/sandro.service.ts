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
import { GoogleTranslateService } from 'src/smartstore/google-translate.service';
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
//   'Sandro'
// );

// // 폴더 없으면 생성
// if (!fs.existsSync(errorLogDir)) {
//   fs.mkdirSync(errorLogDir, { recursive: true });
// }

// // 최종 로그 파일 경로
// const errorLogPath = path.join(errorLogDir, 'bottega_error_log.txt');

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
export class SandroService {
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




// 1. 카테고리 가져오기 (프록시 교체 및 재시도 로직 포함)
async getCategories(
  siteUrls: string[]
): Promise<{ categoryName: string; url: string }[]> {
  const allCategories: { categoryName: string; url: string }[] = [];
  const proxyLines = await this.r2Service.loadBrightProxies2();

  if (!proxyLines.length) {
    console.warn("프록시 없음, 종료");
    return;
  }

  // 랜덤 프록시 선택
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
            "--remote-debugging-port=0",
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-background-timer-throttling",
            "--disable-backgrounding-occluded-windows",
            "--disable-renderer-backgrounding",
            "--disable-session-crashed-bubble",
            "--no-first-run",
            "--disable-accelerated-2d-canvas",
            "--noerrdialogs",
          ],
        });

        const page = await browser.newPage();
        await page.authenticate({
          username: proxy.username,
          password: proxy.password,
        });

        await page.setUserAgent(
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36"
        );

        await page.setViewport({ width: 1920, height: 1080 });

        try {
          await page.goto(siteUrl, {
            waitUntil: "networkidle2",
            timeout: 30000,
          });

          console.log(`🔍 ${siteUrl} 진행 중...`);
          await new Promise((resolve) => setTimeout(resolve, 2000));

          // ================================
          // 🔥 Sandro 카테고리 수집 로직
          // ================================
          const sandroCats = await page.evaluate(() => {
            const sleep = (ms: number) =>
              new Promise((r) => setTimeout(r, ms));

            function hover(el: HTMLElement) {
              el.dispatchEvent(
                new MouseEvent("mouseover", { bubbles: true })
              );
            }

            const results: { categoryName: string; url: string }[] = [];
            const set = new Set<string>();

            const add = (item: { categoryName: string; url: string }) => {
              if (!set.has(item.url)) {
                set.add(item.url);
                results.push(item);
              }
            };

            // ❌ Level-2 제외
            const excludeLv2 = [
              "Cadeaux",
              "Seconde main",
              "Seconde Main",
            ];

            // ❌ Level-3 제목 (블럭) 통째로 제외
            const excludeLv3Titles = [
              "Sélections",
              "SELECTIONS",
              "Sélection",
              "SELECTION",
              "La sélection",
              "LA SELECTION",
            ];

            async function collect(genderName: string, selector: string) {
              const root = document.querySelector(
                selector
              ) as HTMLElement;
              if (!root) return;

              hover(root);
              await sleep(500);

              const lv2Nodes = [
                ...document.querySelectorAll(
                  `.category-level-2[aria-label="${genderName}"] li.level-2`
                ),
              ];

              for (const lv2 of lv2Nodes) {
                const a = lv2.querySelector("a");
                if (!a) continue;

                const midName = a.innerText.trim();
                const id = a.id;
                if (!midName || !id) continue;

                // ❌ Level-2 제외
                if (
                  excludeLv2.some((e) =>
                    midName.toLowerCase().includes(e.toLowerCase())
                  )
                )
                  continue;

                // lv3 panel
                const panel = document.querySelector(
                  `.category-level-3[data-categoryid="${id}"]`
                ) as HTMLElement;

                if (!panel) continue;

                // lv3 블럭 읽기
                const lv3Blocks = [
                  ...panel.querySelectorAll("li.level-3"),
                ];

                for (const block of lv3Blocks) {
                  const title =
                    block
                      .querySelector("label.heading-link")
                      ?.textContent?.trim() || "";

                  // ❌ Sélections 블럭 전체 제외
                  if (
                    excludeLv3Titles.some((e) =>
                      title.toLowerCase().includes(e.toLowerCase())
                    )
                  )
                    continue;

                  // lv4 링크
                  const lv4Links = [
                    ...block.querySelectorAll("a.level-4-link[href]"),
                  ] as HTMLAnchorElement[];

                  if (lv4Links.length === 0) continue;

                  for (const l4 of lv4Links) {
                    const name = l4.innerText.trim();
                    const url = l4.href;

                    if (!name || !url) continue;

                    add({
                      categoryName: `${genderName.toUpperCase()} - ${midName} - ${name}`,
                      url,
                    });
                  }
                }
              }
            }

            // 실행
            return (async () => {
              await collect("Woman", "a#Woman");
              await collect("Man", "a#Man");
              return results;
            })();
          });

          // 결과 push
          allCategories.push(...sandroCats);

          console.log(`✅ 수집 완료: ${sandroCats.length}개`);
          success = true;
        } catch (err: any) {
          console.error(
            `❌ [${siteUrl}] 오류 발생: ${err.message}`
          );
          retryCount++;
          console.warn(
            `⚠️ [${siteUrl}] 재시도 (${retryCount}/3)...`
          );
        } finally {
          await browser.close();
        }
      }

      if (!success) {
        console.warn(`🚫 [${siteUrl}] 3회 시도 후 실패, 건너뜀.`);
      }
    }
  }

  await processSiteUrls(siteUrls);

  console.log("🎯 모든 사이트 카테고리 수집 완료!");

  const translatedCategories = await Promise.all(
    allCategories.map(async (cat) => ({
      categoryName: await this.googleTranslateService.translateTextToEnglish(cat.categoryName),
      url: cat.url,
    }))
  );
  
  return translatedCategories;
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
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36"
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
      const distance = 250;
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

    private async scrollUntilFullyLoaded(page: Page): Promise<void> {
    let previousHeight = await page.evaluate(() => document.body.scrollHeight);
  
    while (true) {
      // 1. 현재 정의된 autoScroll 실행
      await this.autoScroll(page);
  
      // 2. 10초 대기
      await new Promise((resolve) => setTimeout(resolve, 10000));

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

  // Sandro 사이트 크롤링 시작
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
    await page.setViewport({ width: 1920, height: 1080 });

    const MAX_RETRY = 5; // 최대 재시도 횟수
    let retryAttempts = 0;

    while (retryAttempts < MAX_RETRY) {
        try {
            await page.goto(siteUrl, { waitUntil: 'networkidle2', timeout: 30000 });
            await new Promise((resolve) => setTimeout(resolve, 3000));
            try{
              await page.evaluate(() => {
                const btn = document.querySelector(".didomi-continue-without-agreeing");
                if (btn) {
                  console.log("거절클릭");
                  (btn as HTMLElement).click();
                } else {
                  console.log("버튼없음");
                }
              });
            } catch (e: any) {
              console.log("⚠️ Sandro 거절 버튼 오류:", e.message);
            }
            try {
              // -----------------------------------------------------
              // 1) "Voir tout" (전체 보기) 먼저 찾고 클릭
              // -----------------------------------------------------
              let voirToutBtn = null;

              const allEls = await page.$$("a, button");
              for (const el of allEls) {
                const text = await page.evaluate((el) => el.textContent?.trim().toLowerCase(), el);

                if (text && text === "voir tout") {
                  voirToutBtn = el;
                  break;
                }
              }

              if (voirToutBtn) {
                await voirToutBtn.click();

                await new Promise((resolve) => setTimeout(resolve, 10000));

              } else {
                // -----------------------------------------------------
                // 2) "Voir tout" 없으면 → "Voir plus" 반복 클릭
                // -----------------------------------------------------

                while (true) {
                  let voirPlusBtn = null;

                  const all = await page.$$("a, button");
                  for (const el of all) {
                    const text = await page.evaluate((el) => el.textContent?.trim().toLowerCase(), el);
                    if (text && text === "voir plus") {
                      voirPlusBtn = el;
                      break;
                    }
                  }

                  if (!voirPlusBtn) {
                    break;
                  }

                  await voirPlusBtn.click();

                  await new Promise((resolve) => setTimeout(resolve, 3000));
                }
              }

            } catch (e: any) {
              console.log("⚠️ Sandro 버튼 처리 오류:", e.message);
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
            const { currentPageProductUrls, isBlocked } = await page.evaluate(() => {
              const productUrls = Array.from(document.querySelectorAll('div.product'))
                .filter(product => {
                  const stockEl = product.querySelector(".stock");
                  if (!stockEl) return true;

                  const text = stockEl.textContent?.trim().toLowerCase();
                  return !text.includes("indisponible");
                })
                .map(product => {
                  const a = product.querySelector("a[href]") as HTMLAnchorElement;
                  return a ? a.href : null;
                })
                .filter(Boolean);

              const bodyText = document.querySelector('body')?.textContent || '';
              const isBlocked =
                (bodyText.includes('Access Denied') ||
                bodyText.includes('Too Many Requests') ||
                bodyText.includes('429') ||
                bodyText.includes('Enforced timeout') ||
                bodyText.includes('net::ERR_TIMED_OUT'));

              return { currentPageProductUrls: productUrls, isBlocked };
            });


      if (isBlocked) {
          console.warn("페이지가 차단되었습니다. 프록시를 변경하여 다시 시도합니다.");
           // 새로운 프록시 설정
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

      if (currentPageProductUrls.length === 0) {
        console.log("더 이상 상품이 없습니다. 반복문을 종료합니다.");
        } else {
            productUrls = currentPageProductUrls;
        }
      // 한 번 수집 후 while 루프 종료
      break;

    } catch (error: any) {
      console.error(`에러 발생: ${error.message}`);
      //logErrorToDesktop(error, `3.오류 발생`);
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
    console.log(`산드로 최종 수집된 상품 URL 수: ${productUrls.length} - ${category?.categoryName || '카테고리 없음'}`);

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
            console.log(`✅ (${index + 1}/${productUrls.length}) 산드로 ${category?.categoryName || '카테고리 없음'}  수집 중`);
            await new Promise((resolve) => setTimeout(resolve, 2000));
            try{
              await page.evaluate(() => {
                const btn = document.querySelector(".didomi-continue-without-agreeing");
                if (btn) {
                  console.log("거절클릭");
                  (btn as HTMLElement).click();
                } else {
                  console.log("버튼없음");
                }
              });
            } catch (e: any) {
              console.log("⚠️ Sandro 거절 버튼 오류:", e.message);
            }
            success = true;
            break; // 로딩 성공 시 루프 종료
          } catch (error: any) {
              loadAttempts++;
              console.warn(`페이지 로드 실패 (프록시 변경 ${loadAttempts}/10): ${error.message}`);
              //logErrorToDesktop(error, `4.오류 발생`);
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
                  break;
              }
          }
      }
    
      const productDetails = await page.evaluate(async () => {
        const site = 'Sandro';
        const designer = '산드로';
        const titleElement = document.querySelector('h1.product-name.primary-font-flat-bold-u-md.mb-0.pr-6');
        const title = titleElement ? titleElement.textContent?.trim() || '' : '';
        const priceElement = document.querySelector('div.col-12 div.price span.sales');
        let price = 0;
        if (priceElement) {
          const raw = priceElement.textContent.replace(/[^\d.]/g, "");
          // 반올림
          price = Math.round(parseFloat(raw));
        }

        const color = document.querySelector(".color-listing .swatch .color-name")?.textContent?.trim() || "";
        

        // 1) 카테고리 텍스트 추출
        const breadcrumbElements = Array.from(
          document.querySelectorAll("ol.breadcrumb a.breadcrumb-item")
        );

        const breadcrumbTexts = breadcrumbElements.map(el =>
          el.textContent?.trim() || ""
        );

        // 의류 카테고리 여부 체크
        const isPretAPorter = breadcrumbTexts.some(text =>
          text.toLowerCase().includes("prêt-à-porter") ||
          text.toLowerCase().includes("pret-a-porter")
        );


        // 2) 이미지 Picture 요소 모으기
        const slideElements = document.querySelectorAll(
          "ul.pdpCarousel-container.big-images.d-none.d-md-block li.image-content picture"
        );

        const imageElements: HTMLPictureElement[] = [];
        slideElements.forEach((pic) => {
          if (pic) imageElements.push(pic as HTMLPictureElement);
        });


        // 3) 이미지 URL 추출
        let imageUrls: string[] = imageElements
          .map(picture => {
            const sources = Array.from(picture.querySelectorAll("source"));
            let target: HTMLSourceElement | null = null;

            // (min-width: 768px) 우선
            target = sources.find(src => {
              const media = src.getAttribute("media") || "";
              return typeof media === "string" && media.includes("(min-width: 768px)");
            });

            // 없으면 첫 번째 source
            if (!target && sources.length > 0) {
              target = sources[0];
            }

            // 그래도 없으면 img fallback
            if (!target) {
              const img = picture.querySelector("img");
              return img ? img.src : "";
            }

            // srcset 파싱
            const srcset = target.getAttribute("srcset");
            if (!srcset) {
              const img = picture.querySelector("img");
              return img ? img.src : "";
            }

            const candidateStrings = srcset.split(/\s*,\s*/);
            const candidates = candidateStrings.map(c => {
              const parts = c.trim().split(/\s+/);
              const url = parts[0];
              const size = parts[1] ? parseInt(parts[1].replace("w", ""), 10) : 0;
              return { url, size };
            });

            const desiredSize = 1000;

            // exact match
            let selected = candidates.find(c => c.size === desiredSize);

            // 없으면 가장 가까운 해상도로
            if (!selected) {
              candidates.sort(
                (a, b) => Math.abs(a.size - desiredSize) - Math.abs(b.size - desiredSize)
              );
              selected = candidates[0];
            }

            let finalUrl = selected?.url || "";
            if (finalUrl.startsWith("//")) finalUrl = "https:" + finalUrl;

            return finalUrl;
          })
          .filter(url => url !== "");


        // 4) 카테고리가 Prêt-à-porter라면 → 이미지 순서 조정
        if (isPretAPorter && imageUrls.length > 1) {
          const last = imageUrls.pop(); // 마지막 이미지 제거
          imageUrls.unshift(last!);     // 맨 앞에 추가
        }

        imageUrls = imageUrls.filter(url => !url.includes('_H_V.'));
        

        const sizeElements = document.querySelectorAll(
          'ul.size-list-container li.option-item.dropdown-item'
        );

        let size;

        if (!sizeElements || sizeElements.length === 0) {
          size = '원사이즈';
        } else {

          const sizeList = Array.from(sizeElements)
            .filter(li => !li.classList.contains('unselected')) // ❌ 품절 제거
            .map(li => {
              const val = li.querySelector('.option-value');
              return val ? val.textContent.trim() : null;
            })
            .filter(Boolean);

          if (sizeList.length === 0) {
            return null; // 모든 사이즈 품절 → 스킵
          }

          // ⭐ 원사이즈 판별
          const onlyOne = sizeList.length === 1;
          const v = sizeList[0]?.toUpperCase();

          if (
            onlyOne &&
            ['TU', 'TAILLE UNIQUE', 'ONE SIZE', 'UNI'].includes(v)
          ) {
            size = '원사이즈';
          } else {
            size = [...new Set(sizeList)].join(', ');
          }
        }





        function sleep(ms) {
          const start = Date.now();
          while (Date.now() - start < ms) {}
        }

        const TARGETS = ["DESCRIPTION", "COMPOSITION ET ENTRETIEN"];

        // <span data-action-panel="...">
        const panelSpans = Array.from(document.querySelectorAll("span[data-action-panel]"));

        const panelMap = {};
        panelSpans.forEach(span => {
          const title = span.getAttribute("data-action-panel")?.trim();
          const contentId = span.getAttribute("data-content-id")?.trim();
          if (title && contentId) {
            panelMap[title] = { span, contentId };
          }
        });

        // 클릭 순서대로
        for (const key of TARGETS) {
          const entry = panelMap[key];
          if (!entry) continue;

          entry.span.click();
          sleep(900);
        }

        // TEXT 수집
        let mainInfoParts: string[] = [];

        for (const key of TARGETS) {
          const entry = panelMap[key];
          if (!entry) continue;

          const box = document.querySelector(
            `#collapsible-${entry.contentId.replace("product-detail", "description")}`
          ) as HTMLAnchorElement;

          if (box) {
            const txt = box.innerText.trim();
            if (txt) mainInfoParts.push(txt);
          }
        }

        let mainInfo = mainInfoParts.join("\n\n");

        // UI 잡음 제거
        mainInfo = mainInfo
          .replace(/Voir les détails/gi, "")
          .replace(/Masquer les détails/gi, "")
          .replace(/Guide des tailles/gi, "")
          .replace(/NOS ENGAGEMENTS/gi, "")
          .replace(/\n{3,}/g, "\n\n")
          .trim();

        let styleId = "";
        const refBox = document.querySelector(".reference-id") as HTMLAnchorElement;
        if (refBox) {
          const txt = refBox.innerText;
          const m = txt.match(/Référence\s*:\s*(.+)/i);
          if (m) styleId = m[1].trim();
        }

        const brandstyleId = styleId;

        let madeIn = "";
        const madeMatch = mainInfo.match(/(Fabriqué en|Made in)\s+([A-Za-zÀ-ÿ]+)/i);
        if (madeMatch) madeIn = madeMatch[2].trim();


        return { site, designer, title, price, color, mainInfo, madeIn, styleId, size, brandstyleId, imageUrls };
      });


      if (!productDetails || !productDetails.mainInfo || !productDetails.styleId || !productDetails.title || !productDetails.price || !productDetails.imageUrls.length || !productDetails.size || !productDetails.brandstyleId) {
        console.warn('산드로 데이터 누락 - 다음 productUrl로 이동');
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
                //logErrorToDesktop(error, `5.오류 발생`);
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
          
              console.log(`산드로 품절 처리 완료: ${product.title} (styleId: ${product.styleId})`);
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
          //logErrorToDesktop(error, `8.오류 발생`);
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
            '--noerrdialogs'
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

        await page.goto(visitUrl, {waitUntil: 'networkidle2', timeout: 30000})
        // await new Promise(resolve => setTimeout(resolve, 3000));

        let productDetails = await page.evaluate(async () => {
          const priceElement = document.querySelector('div.col-12 div.price span.sales');
          let price = 0;
          if (priceElement) {
            const raw = priceElement.textContent.replace(/[^\d.]/g, "");
            // 반올림
            price = Math.round(parseFloat(raw));
          }

          const sizeElements = document.querySelectorAll(
            'ul.size-list-container li.option-item.dropdown-item'
          );

          let size;

          if (!sizeElements || sizeElements.length === 0) {
            size = '원사이즈';
          } else {

            const sizeList = Array.from(sizeElements)
              .filter(li => !li.classList.contains('unselected')) // ❌ 품절 제거
              .map(li => {
                const val = li.querySelector('.option-value');
                return val ? val.textContent.trim() : null;
              })
              .filter(Boolean);

            if (sizeList.length === 0) {
              return null; // 모든 사이즈 품절 → 스킵
            }

            // ⭐ 원사이즈 판별
            const onlyOne = sizeList.length === 1;
            const v = sizeList[0]?.toUpperCase();

            if (
              onlyOne &&
              ['TU', 'TAILLE UNIQUE', 'ONE SIZE', 'UNI'].includes(v)
            ) {
              size = '원사이즈';
            } else {
              size = [...new Set(sizeList)].join(', ');
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

        console.log(`✅ ${product.designer} 상품 업데이트 완료`);

      } catch (err: any) {
        console.warn(`🚨 Sandro 업데이트 실패: ${err.message}`);
        if (page && !page.isClosed()) await page.close();
        if (browser) await browser.close();
      } finally {
        if (page && !page.isClosed()) await page.close();
        if (browser) await browser.close();
      }
    }
  }      
}
