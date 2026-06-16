import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { GodoMallService } from 'src/godomall/godomall.service';
import { Repository } from 'typeorm';
import { R2Service } from '../cloudflare/r2.service';
import * as fs from 'fs';
import { Product } from 'src/product/product.entity';
import { Mapping } from 'src/mapping/mapping.entity';
import { SmartstoreService } from 'src/smartstore/smartstore.service';
import { SmartstoreApiService } from 'src/smartstore/smartstore-api.service';
import { Cafe24Service } from 'src/cafe24/cafe24.service';
import { MakeshopService } from 'src/makeshop/makeshop.service';
import { HostingAccount } from 'src/hosting/hostingaccount.entity';
import { Page, Browser, BrowserContext } from 'puppeteer';
import puppeteer from 'puppeteer-extra';
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
import { UpdateGateway } from 'src/update/update.gateway';
import { UserService } from 'src/user/user.service';


interface CettireUrls {
    categories: string[];
    designers: string[];
}

interface CettireResult {
    categories: { categoryName: string; afterCategory: string, url: string;}[];
    designers: { name: string, afterDesigner: string }[]; // 디자이너의 이름과 코드 포함
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
  
function cleanCettireDesignerToken(value: string) {
  let token = String(value ?? '').trim();
  token = token.replace(/^[{\[]+|[}\]]+$/g, '').trim();

  if (
    (token.startsWith('"') && token.endsWith('"')) ||
    (token.startsWith("'") && token.endsWith("'"))
  ) {
    token = token.slice(1, -1).trim();
  }

  return token
    .normalize('NFKC')
    .replace(/[‘’`´]/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function parseCettireDesignerList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return Array.from(
      new Set(
        value
          .flatMap((item) => parseCettireDesignerList(item))
          .map((item) => cleanCettireDesignerToken(item))
          .filter(Boolean),
      ),
    );
  }

  if (value === null || value === undefined) {
    return [];
  }

  const raw = String(value).trim();
  if (!raw) {
    return [];
  }

  if (raw.startsWith('[') && raw.endsWith(']')) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parseCettireDesignerList(parsed);
      }
    } catch {
      // JSON 파싱 실패 시 일반 파서로 계속 진행
    }
  }

  const looksStructured =
    (raw.startsWith('{') && raw.endsWith('}')) ||
    (raw.startsWith('[') && raw.endsWith(']'));

  if (looksStructured) {
    const quotedValues = Array.from(raw.matchAll(/"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'/g))
      .map((match) => cleanCettireDesignerToken(match[1] ?? match[2] ?? ''))
      .filter(Boolean);

    if (quotedValues.length > 0) {
      return Array.from(new Set(quotedValues));
    }

    return Array.from(
      new Set(
        raw
          .slice(1, -1)
          .split(',')
          .map((item) => cleanCettireDesignerToken(item))
          .filter(Boolean),
      ),
    );
  }

  return Array.from(
    new Set(
      raw
        .split(',')
        .map((item) => cleanCettireDesignerToken(item))
        .filter(Boolean),
    ),
  );
}

function normalizeCettireDesignerName(value: string) {
  return cleanCettireDesignerToken(value).toLowerCase();
}

  @Injectable()
  export class CettireService {
    constructor(
        @InjectRepository(Product)
        private readonly productRepository: Repository<Product>,
        private readonly godoMallService: GodoMallService,
        private readonly r2Service: R2Service,
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
  
  // 자동 스크롤 함수
  private async autoScroll(page: Page) {
      await page.evaluate(async () => {
          let totalHeight = 0;
          const distance = 600; // 스크롤할 거리
          const interval = 100;  // 스크롤 간격 (밀리초)
  
          await new Promise<void>(resolve => {
              const timer = setInterval(() => {
                  window.scrollBy(0, distance); // 페이지를 스크롤
                  totalHeight += distance;
  
                  if (totalHeight >= document.body.scrollHeight) {
                      clearInterval(timer); // 스크롤 완료 시 타이머 종료
                      resolve(); // 프로미스 해결
                  }
              }, interval);
          });
      });
  }

  private async expandCettireDesignerFilter(page: Page) {
      await page
          .waitForFunction(
              () => {
                  const text = document.body?.innerText || '';
                  return /필터|filter|디자이너|designer|브랜드|brand/i.test(text);
              },
              { timeout: 15000 },
          )
          .catch(() => undefined);

      const expanded = await page.evaluate(async () => {
          const normalizeText = (value: string | null | undefined) =>
              String(value ?? '')
                  .replace(/\s+/g, ' ')
                  .trim()
                  .toLowerCase();

          const isVisible = (element: Element | null) => {
              if (!(element instanceof HTMLElement)) {
                  return false;
              }

              return Boolean(
                  element.offsetWidth ||
                      element.offsetHeight ||
                      element.getClientRects().length,
              );
          };

          const hasDesignerList = () => {
              const selectors = [
                  '#refinePortalDialog div[name] li',
                  'div[name] li._28WlRGx-IQOoOVFl3rFtkK',
                  'li._28WlRGx-IQOoOVFl3rFtkK',
                  'div[name] li',
                  'input[placeholder*="디자이너"]',
                  'input[placeholder*="designer" i]',
                  'input[aria-label*="디자이너"]',
                  'input[aria-label*="designer" i]',
              ];

              return selectors.some((selector) => {
                  const element = document.querySelector(selector);
                  return Boolean(element) && isVisible(element);
              });
          };

          const clickFirstMatching = (patterns: RegExp[]) => {
              const controls = Array.from(
                  document.querySelectorAll<HTMLElement>(
                      'button, [role="button"], summary, div, span',
                  ),
              );

              const target = controls.find((element) => {
                  if (!isVisible(element)) {
                      return false;
                  }

                  const text = normalizeText(element.textContent);
                  return patterns.some((pattern) => pattern.test(text));
              });

              if (!target) {
                  return false;
              }

              const clickableTarget =
                  target.closest<HTMLElement>('button, [role="button"], summary') ??
                  target;
              clickableTarget.click();
              return true;
          };

          if (hasDesignerList()) {
              return true;
          }

          clickFirstMatching([/필터/, /filter/]);
          await new Promise((resolve) => setTimeout(resolve, 500));

          if (hasDesignerList()) {
              return true;
          }

          clickFirstMatching([/디자이너/, /designer/, /브랜드/, /brand/]);
          await new Promise((resolve) => setTimeout(resolve, 500));

          return hasDesignerList();
      });

      if (expanded) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
  }

  private async extractCettirePageDesigners(page: Page): Promise<string[]> {
      const pageDesigners = await page.evaluate(() => {
          const selectors = [
              'div[name] li._28WlRGx-IQOoOVFl3rFtkK',
              'li._28WlRGx-IQOoOVFl3rFtkK',
              'div[name] li',
          ];

          const collected = selectors.flatMap((selector) =>
              Array.from(document.querySelectorAll<HTMLElement>(selector)).map((element) =>
                  (element.textContent || '').replace(/\s+/g, ' ').trim(),
              ),
          );

          const seen = new Set<string>();
          return collected.filter((value) => {
              if (!value || value.length <= 1) {
                  return false;
              }

              if (/^[A-Z]$/.test(value) || /^\d+$/.test(value)) {
                  return false;
              }

              if (seen.has(value)) {
                  return false;
              }

              seen.add(value);
              return true;
          });
      });

      return Array.from(
          new Set(
              pageDesigners
                  .map((item) => cleanCettireDesignerToken(item))
                  .filter(Boolean),
          ),
      );
  }

  private async isCettireProtectionPage(page: Page): Promise<boolean> {
      try {
          return await page.evaluate(() => {
              const text = (document.body?.innerText || '')
                  .replace(/\s+/g, ' ')
                  .trim()
                  .toLowerCase();

              if (!text) {
                  return false;
              }

              return (
                  text.includes('why is this step needed') ||
                  text.includes('we detected unusual activity') ||
                  text.includes('automated (bot) activity') ||
                  text.includes('use of developer or inspection tools') ||
                  text.includes('submit feedback')
              );
          });
      } catch {
          return false;
      }
  }

  private async assertCettireNotBlocked(page: Page) {
      const isBlocked = await this.isCettireProtectionPage(page);
      if (isBlocked) {
          throw new Error('세타이어 차단 페이지 감지 - 프록시 교체 필요');
      }
  }

  private async waitForCettireProductsOrBlock(
      page: Page,
      timeoutMs = 20000,
  ) {
      const startedAt = Date.now();

      while (Date.now() - startedAt < timeoutMs) {
          await this.assertCettireNotBlocked(page);

          const hasProducts = await page.evaluate(() =>
              Boolean(document.querySelector('a[href*="/products/"]')),
          );

          if (hasProducts) {
              return;
          }

          await new Promise((resolve) => setTimeout(resolve, 2000));
      }

      await this.assertCettireNotBlocked(page);
      throw new Error('세타이어 상품 목록 요소를 찾지 못했습니다.');
  }
  
  async processAfterCettireUrl(customId: string, accountPlatform: string) {
    console.log('시작: 매핑된 모든 엔티티 가져오기');
    const proxyLines = await this.r2Service.loadBrightProxies1();
    

    // 매핑 가져오기
    const mappings = await this.mappingRepository.find({
        where: { 
            site: 'Cettire',
            customId,
            accountPlatform,
         },
    });
    console.log(`가져온 매핑 엔티티 수: ${mappings.length}`);

    // ⭐ mapping loop
    for (let i = 0; i < mappings.length; i++) {
        const mapping = mappings[i];

        const MAX_RETRY = 5;
        let attempt = 0;
        let success = false;

        while (attempt < MAX_RETRY && !success) {
            
            const proxy = pickProxy(proxyLines);
            const proxyArg = `--proxy-server=http://${proxy.host}:${proxy.port}`;
            attempt++;
            console.log(`▶ (${i + 1}/${mappings.length}) ID=${mapping.id} / 시도 ${attempt}`);

            const browser = await puppeteer.launch({
                headless: false,
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
            await page.setUserAgent(
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36'
            );


            await page.setExtraHTTPHeaders({
                'accept-language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
                'sec-ch-ua': '"Chromium";v="145", "Google Chrome";v="145", "Not=A?Brand";v="8"',
                'sec-ch-ua-mobile': '?0',
                'sec-ch-ua-platform': '"Windows"',
            });
            await page.setRequestInterception(true);
            await page.setViewport({ width: 1920, height: 1080 });

            try {
                await page.goto(mapping.siteUrl, {
                    waitUntil: 'domcontentloaded',
                    timeout: 30000
                });

                await this.assertCettireNotBlocked(page);
                await this.waitForCettireProductsOrBlock(page, 20000);

                // 데이터 추출
                await this.expandCettireDesignerFilter(page);
                await this.assertCettireNotBlocked(page);

                const pageDesigners = await this.extractCettirePageDesigners(page);

                const storedDesigners = parseCettireDesignerList(mapping.designers);

                if (storedDesigners.length === 0) {
                    console.log(`⚠ 저장된 디자이너 없음 → ID=${mapping.id}`);
                    success = true;
                    continue;
                }

                if (pageDesigners.length === 0) {
                    throw new Error('세타이어 페이지에서 디자이너 필터를 찾지 못했습니다.');
                }

                const pageDesignerMap = new Map(
                    pageDesigners.map((designer) => [
                        normalizeCettireDesignerName(designer),
                        designer,
                    ]),
                );

                const matchedDesigners = Array.from(
                    new Set(
                        storedDesigners
                            .map((designer) =>
                                pageDesignerMap.get(
                                    normalizeCettireDesignerName(designer),
                                ),
                            )
                            .filter((designer): designer is string => Boolean(designer)),
                    ),
                );

                /*
                console.log(
                    `🔎 Cettire 디자이너 비교 → ID=${mapping.id}, 저장 ${storedDesigners.length}개 / 페이지 ${pageDesigners.length}개 / 매칭 ${matchedDesigners.length}개`,
                );

                */
                /*
                console.log(
                    'Cettire 디자이너 비교 → ID=' +
                        mapping.id +
                        ', 저장 ' +
                        storedDesigners.length +
                        '개 / 페이지 ' +
                        pageDesigners.length +
                        '개 / 매칭 ' +
                        matchedDesigners.length +
                        '개',
                );
                /*
                console.log(
                    `🔎 Cettire 디자이너 비교 → ID=${mapping.id}, 저장 ${storedDesigners.length}개 / 페이지 ${pageDesigners.length}개 / 매칭 ${matchedDesigners.length}개`,
                );

                */
                console.log(
                    'Cettire designer compare -> ID=' +
                        mapping.id +
                        ', stored=' +
                        storedDesigners.length +
                        ', page=' +
                        pageDesigners.length +
                        ', matched=' +
                        matchedDesigners.length,
                );
                if (matchedDesigners.length > 0) {
                    mapping.afterDesigners = matchedDesigners.join(',');
                    await this.mappingRepository.save(mapping);
                    console.log(`✔ 성공: 매칭 저장 완료 → ID=${mapping.id}`);
                } else {
                    console.log(`⚠ 매칭된 디자이너 없음 → ID=${mapping.id}`);
                }

                success = true; // ⭐ 성공 → 재시도 종료

            } catch (err: any) {
                console.error(`❌ 실패 (ID=${mapping.id}, 시도 ${attempt}) → ${err.message}`);
                if (attempt >= MAX_RETRY) {
                    console.error(`🚨 최대 재시도 도달 → 실패 처리하고 다음 매핑으로 이동`);
                } else {
                    console.log(`🔁 재시도 대기 중...`);
                    await new Promise(res => setTimeout(res, 1500));
                }

            } finally {
                await browser.close();
            }
        }
    }

    console.log('필터링 완료');
}




  
  
    private parseCettireMeta(url: string) {
        let gender = '';
        let category = '';

        if (url.includes('womens')) gender = '여성';
        else if (url.includes('mens')) gender = '남성';
        else if (url.includes('kids')) gender = '아동';

        if (url.includes('clothing')) category = '의류';
        else if (url.includes('shoes')) category = '신발';
        else if (url.includes('bags')) category = '가방';
        else if (url.includes('accessories')) category = '악세사리';
        else if (url.includes('jewelry')) category = '주얼리';
        else if (url.includes('watches')) category = '시계';

        return { gender, category };
    }
    

    // 세타이어 카테고리 및 브랜드 가져오기
    async cettireCategorys(urls: CettireUrls): Promise<CettireResult> {
        const proxyLines = await this.r2Service.loadBrightProxies1();
        const proxy = pickProxy(proxyLines);
        const proxyArg = `--proxy-server=http://${proxy.host}:${proxy.port}`;

        const browser: Browser = await puppeteer.launch({
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
        const page: Page = await browser.newPage();
        await page.authenticate({
            username: proxy.username,
            password: proxy.password,
        });

        const allCategories: { categoryName: string; afterCategory: string; url: string }[] = [];
        const allDesigners: { name: string; afterDesigner: string }[] = [];

        try {
            for (const categoryUrl of urls.categories) {
                await page.goto(categoryUrl, { waitUntil: 'networkidle2' });

                await page.waitForSelector('#filterCategoryList', {
                    timeout: 10000,
                });

                const { gender, category } = this.parseCettireMeta(categoryUrl);

                const categories = await page.evaluate(() => {
                    return Array.from(
                    document.querySelectorAll('#filterCategoryList > div')
                    )
                    .map(el => el.textContent?.trim())
                    .filter(text => text && text !== '' && text !== ' ');
                });

                const uniqueUrls = new Set<string>();

                categories.forEach((name) => {
                    const clean = name.trim();

                    // 🔥 핵심: 그냥 encodeURIComponent 쓰면 끝
                    const afterCategory = encodeURIComponent(clean);

                    const url = `${categoryUrl}?menu%5Bproduct_type%5D=${afterCategory}`.replace('/es/', '/kr/');

                    if (uniqueUrls.has(url)) return;
                    uniqueUrls.add(url);

                    allCategories.push({
                        categoryName: `${gender}-${category}-${clean}`, // UI용
                        afterCategory,
                        url,
                    });
                });
            }

            for (const designerUrl of urls.designers) {
                await page.goto(designerUrl, { waitUntil: 'networkidle2' });

                const designers = await page.evaluate(() => {
                    const selectors = [
                        'ul._32WfxZ6tvTGZYjClPU5Z4R li a',
                        'div[name] li a',
                        'li._28WlRGx-IQOoOVFl3rFtkK a',
                        'li._28WlRGx-IQOoOVFl3rFtkK',
                    ];

                    const values = selectors.flatMap((selector) =>
                        Array.from(document.querySelectorAll<HTMLElement>(selector)).map(
                            (el) => (el.textContent || '').replace(/\s+/g, ' ').trim(),
                        ),
                    );

                    return Array.from(
                        new Set(
                            values.filter(
                                (value) =>
                                    value &&
                                    value.length > 1 &&
                                    !/^[A-Z]$/.test(value) &&
                                    !/^\d+$/.test(value),
                            ),
                        ),
                    );
                });

                designers.forEach((name) => {
                    const afterDesigner = encodeURIComponent(name);
                    allDesigners.push({ name, afterDesigner });
                });
            }
        } catch (error: any) {
            console.error(`카테고리 추출 에러 : ${error.message}`);
        } finally {
            await browser.close();
        }

        console.log(`세타이어 카테고리 및 디자이너 완료`);
        return { categories: allCategories, designers: allDesigners };
    }
  


  
    
  
// 세타이어 사이트 크롤링 시작
async getProductsFromCategory(siteUrl: string, partnerKey: string, apiKey: string, customId:string, accountPlatform:string, godoMallCategoryCode:string): Promise<void> {
    const account = await this.hostingAccountRepository.findOne({
        where: { customId, accountPlatform },
    });const proxyLines = await this.r2Service.loadBrightProxies1();

    
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
    let context: BrowserContext | null = null;
    let page: Page | null = null;
    let productUrls: string[] = [];

    const category = await this.mappingRepository.findOne({
        where: { customId: customId, accountPlatform: accountPlatform, siteUrl: siteUrl },
    });

    const afterDesigners = category.afterDesigners
    ? category.afterDesigners.split(',').map(s => s.trim())
    : [];

        
        

        const MAX_RETRY = 5; // 최대 재시도 횟수
        let retryAttempts = 0;

        while (retryAttempts < MAX_RETRY) {
            const proxy = pickProxy(proxyLines);
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
                        '--disable-cache',
                        '--disable-application-cache',
                        '--disk-cache-size=0',
                        '--media-cache-size=0',
                        '--disable-logging',
                        '--log-level=3',
                        '--disable-crash-reporter',
                        '--window-size=1920,1080'
                    ],
                });
                const context = await browser.createBrowserContext();
                page = await context.newPage();

                await page.authenticate({
                    username: proxy.username,
                    password: proxy.password,
                });
                await page.setUserAgent(
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36'
                );


                await page.setExtraHTTPHeaders({
                    'accept-language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
                    'sec-ch-ua': '"Chromium";v="145", "Google Chrome";v="145", "Not=A?Brand";v="8"',
                    'sec-ch-ua-mobile': '?0',
                    'sec-ch-ua-platform': '"Windows"',
                });
                await page.setRequestInterception(true);


                await page.setViewport({width: 1920,height: 1080});
                page.on('request', async (request) => {
                    const url = request.url();

                    if (
                        request.method() === 'POST' &&
                        url.includes('/search-ai/pro-search/api/aiRecommendForProduct')
                    ) {
                        try {
                        const postData = request.postData();
                        if (!postData) {
                            return request.continue();
                        }

                        const body = JSON.parse(postData);

                        if (body?.productQueryInfo) {
                            body.productQueryInfo.vendorQuery = afterDesigners;

                            return request.continue({
                            headers: {
                                ...request.headers(),
                                'content-type': 'application/json',
                            },
                            postData: JSON.stringify(body),
                            });
                        }
                        } catch (e: any) {
                        console.warn('❌ aiRecommend parse 실패', e);
                        }
                    }

                    return request.continue();
                    });


                
                await page.goto(`${siteUrl}&page=23`, { waitUntil: 'networkidle2', timeout: 30000 }).catch(() => null);
                const blocked = await page.evaluate(() => {
                    const bodyText = document.body?.innerText || '';

                    if (bodyText.includes('You have reached the maximum number of calling the pages')) {
                        return 'RATE_LIMIT_BLOCK';
                    }

                    if (
                        bodyText.includes("Let's confirm you are human") ||
                        bodyText.includes('Complete the security check') ||
                        document.querySelector('#amzn-captcha-verify-button')
                    ) {
                        return 'BOT_VERIFICATION_BLOCK';
                    }

                    return null;
                });

                if (blocked) {
                    throw new Error(blocked);
                }
                await page.waitForSelector(
                    'div._3kWsUD-sruWkbllx1UtLKW a',
                    { timeout: 15000 }
                );
                await new Promise((resolve) => setTimeout(resolve, 3000));
                await this.autoScroll(page);
                await new Promise((resolve) => setTimeout(resolve, 3000));

                productUrls = await page.evaluate(() => {
                    return Array.from(
                    document.querySelectorAll('div._3kWsUD-sruWkbllx1UtLKW a')
                    ).map(a => (a as HTMLAnchorElement).href);
                });
                break; // 성공하면 반복 종료
            } catch (error: any) {
                console.warn(`⚠️ 페이지 이동 실패 (시도 ${retryAttempts + 1}/${MAX_RETRY}): ${error.message}`);

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

                // 다음 재시도를 위한 랜덤 대기 시간 (exponential backoff)
                const waitTime = Math.min(1000 * 2 ** retryAttempts, 10000); // 최대 10초 대기
                await new Promise((resolve) => setTimeout(resolve, waitTime));
            }
        }


    if (productUrls.length === 0) {
        throw new Error('상품 URL을 수집하지 못했습니다. 모든 시도가 실패했습니다.');
    }
    console.log(`최종 수집된 상품 URL 수: ${productUrls.length} - ${category?.categoryName || '카테고리 없음'}`);

    let needWarmup = false;

    for (const [index, productUrl] of productUrls.entries()) {
        let loadAttempts = 0;
        let success = false;

        while (loadAttempts < 10) {
            try {
                if(!browser){
                    const proxy = pickProxy(proxyLines);
                    const proxyArg = `--proxy-server=http://${proxy.host}:${proxy.port}`;
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
                            '--disable-cache',
                            '--disable-application-cache',
                            '--disk-cache-size=0',
                            '--media-cache-size=0',
                            '--disable-logging',
                            '--log-level=3',
                            '--disable-crash-reporter',
                            '--window-size=1920,1080'
                        ],
                    });
                    const context = await browser.createBrowserContext();
                    page = await context.newPage();
                    await page.authenticate({
                        username: proxy.username,
                        password: proxy.password,
                    });
                    await page.setUserAgent(
                        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36'
                    );

                    await page.setExtraHTTPHeaders({
                        'accept-language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
                        'sec-ch-ua': '"Chromium";v="145", "Google Chrome";v="145", "Not=A?Brand";v="8"',
                        'sec-ch-ua-mobile': '?0',
                        'sec-ch-ua-platform': '"Windows"',
                    });

                    await page.setViewport({
                        width: 1920,
                        height: 1080,
                    });
                    await new Promise((resolve) => setTimeout(resolve, 2000 + Math.random() * 2000));
                    await page.goto('https://www.cettire.com/kr', {waitUntil: 'networkidle2',timeout: 15000}).catch(() => null);
                }
                await page.goto(productUrl, { waitUntil: 'networkidle2', timeout: 15000 }).catch(() => null);

                const blocked = await page.evaluate(() => {
                    const bodyText = document.body?.innerText || '';

                    if (bodyText.includes('You have reached the maximum number of calling the pages')) {
                        return 'RATE_LIMIT_BLOCK';
                    }

                    if (
                        bodyText.includes("Let's confirm you are human") ||
                        bodyText.includes('Complete the security check') ||
                        document.querySelector('#amzn-captcha-verify-button')
                    ) {
                        return 'BOT_VERIFICATION_BLOCK';
                    }

                    return null;
                });

                if (blocked) {
                    throw new Error(blocked);
                }

                await page.waitForSelector(
                    '#product-detail--price',
                    { timeout: 15000 }
                );

                await new Promise((resolve) => setTimeout(resolve, 1000));
                console.log(`세타이어 (${index + 1}/${productUrls.length}) 수집 중`);
                success = true;
                break; // 로딩 성공 시 루프 종료
            } catch (error: any) {
                loadAttempts++;

                console.warn(`세타이어 페이지 로드 실패 [${error.message}] (프록시 변경 ${loadAttempts}/3): ${error.message}`);
                if (loadAttempts < 3) {
                    if (page && !page.isClosed()) await page.close();
                    if (browser) await browser.close();

                    // 🔥 이 두 줄이 핵심
                    page = null;
                    browser = null;
                    continue;
                } else {
                    console.error('최대 로드 시도 초과 - 다음 URL로 이동합니다.');
                    continue;
                }
            }
        }


        // ✅ "문의하기" 또는 "재입고 알림(Notify me)" 버튼이 있는 경우 → 재고 없음 처리
        const outOfStock = await page.evaluate(() => {
            const btn = document.querySelector('button.U_od70v-xtakRMkXKPWa6');
            return btn && btn.textContent?.trim().includes('재고 입고 시 알림');
        });
        if (outOfStock) {
            continue;
        }


        
        const productDetails = await page.evaluate(async () => {
            const site = 'Cettire';
            const designerElement = document.querySelector('#product-detail--vendor-link');
            const titleElement = document.querySelector('#product-detail--title');
            const designer = designerElement?.textContent?.trim() || '';
            const title = titleElement?.textContent?.trim() || '';
        
            // 기본 가격
            const priceElement = document.querySelector('#product-detail--price');
            const price = priceElement
                ? parseInt(priceElement.textContent.replace(/[^0-9]/g, ''), 10)
                : 0;
        
            // ✅ Swiper 이미지 수집 (다중 / 단일 모두 대응)
            const imageUrls = (() => {
            const wrapper = document.querySelector(
                '._1aaZ1SVhxttpeH9so_zp-Y .swiper-container._vw97qz9r5OOF2eCm-9Pb .swiper-wrapper'
            ) as HTMLElement | null;

            let urls: string[] = [];

            if (!wrapper) {
                return urls;
            }

            const slides = Array.from(
                wrapper.querySelectorAll('.swiper-slide')
            );

            // 🔹 1️⃣ data-swiper-slide-index 기반 수집 (다중 이미지)
            const map = new Map<number, string>();

            slides.forEach(slide => {
                const indexAttr = slide.getAttribute('data-swiper-slide-index');
                const img = slide.querySelector('picture img') as HTMLImageElement | null;

                if (!img?.src) return;

                if (indexAttr !== null) {
                const index = Number(indexAttr);
                if (!Number.isNaN(index) && !map.has(index)) {
                    map.set(index, img.src);
                }
                }
            });

            // 🔹 2️⃣ 다중 이미지 결과가 있으면 그대로 사용
            if (map.size > 0) {
                urls = Array.from(map.entries())
                .sort((a, b) => a[0] - b[0])
                .map(([, src]) => src);

                return urls;
            }

            // 🔹 3️⃣ fallback: swiper 이미지 1개짜리 케이스
            const singleImg = wrapper.querySelector(
                '.swiper-slide picture img'
            ) as HTMLImageElement | null;

            if (singleImg?.src) {
                urls = [singleImg.src];
                return urls;
            }

            return urls;
            })();



            // 현재 URL에서 styleId 추출
            const currentUrl = window.location.href; // 현재 페이지의 URL
            const styleIdMatch = currentUrl.match(/\/products\/[^\/]+-([0-9]+)(?:\/|$)/); // "/products/" 이후 "-"로 구분된 숫자를 찾음
            const styleId = styleIdMatch ? styleIdMatch[1] : '';
        
            // mainInfo (치수 및 사양)
            const mainInfoBlock = document.querySelector('div.lc0cBYu9dqSeY--odA-DQ._1mSjbiRtjceyYSUsC1gjW6 div[style="display: block;"]');
            const mainInfoHeader = mainInfoBlock?.querySelector('.VNU9qXeL96LyEtMHO2_hj')?.textContent.trim() || '';
            const mainInfoDetails = mainInfoBlock?.querySelector('._3csgcokkLIL6WO9FCmWmQ4')?.innerHTML.trim() || '';
            const mainInfo = `${mainInfoHeader}<br/>${mainInfoDetails}`;
        
            // brandstyleId 추출 (디자이너 모델 번호 이후 값)
            const brandstyleIdMatch = mainInfoDetails.match(/디자이너 모델 번호:\s*([a-zA-Z0-9]+)/);
            const brandstyleId = brandstyleIdMatch ? brandstyleIdMatch[1] : '';

            // **color 값 추출 (디자이너 색상 또는 디자이너 컬러 이후 값)**
            const colorMatch = mainInfoDetails.match(/디자이너 (?:색상|컬러):\s*([가-힣a-zA-Z0-9\s]+)/);
            const color = colorMatch ? colorMatch[1].trim() : '';
        
            // 🔹 사이즈 리스트 컨테이너 존재 여부 (핵심 기준)
            const sizeListEl = document.querySelector('#product-detail--size-list');

            // 사이즈 및 추가 옵션 가격
            const sizeElements = sizeListEl
            ? sizeListEl.querySelectorAll('ul li')
            : [];

            let sizesWithPrices = [];

            // 🔹 CASE 1: 사이즈 선택형 상품 → 기존 로직 그대로 순환 클릭
            if (sizeListEl && sizeElements.length > 0) {
            for (const el of sizeElements) {
                const sizeSpan = el.querySelector('span'); // 사이즈 텍스트
                const sizeText = sizeSpan?.textContent?.trim() || '';

                const statusSpan = el.querySelector('._1sImFqCLafP2558CS0-NlL'); // 상태 텍스트
                const statusText = statusSpan ? statusSpan.textContent.trim() : '';

                // ❌ 품절 / 비정상 사이즈 제외
                if (statusText === '품절' || !sizeText ) {
                continue;
                }

                (el as HTMLElement).click(); // 사이즈 클릭
                await new Promise((resolve) => setTimeout(resolve, 500)); // UI 업데이트 대기

                const updatedPriceElement = document.querySelector('#product-detail--price');
                const updatedPrice = updatedPriceElement
                ? parseInt(updatedPriceElement.textContent.replace(/[^0-9]/g, ''), 10)
                : price;

                const addoptionprice = updatedPrice - price;

                sizesWithPrices.push({
                size: sizeText,
                addoptionprice: addoptionprice,
                });
            }
            }

            // 🔹 결과 문자열 정리 (기존 스타일 유지)
            const sizeString =
            sizesWithPrices.length > 0
                ? sizesWithPrices.map(entry => entry.size).join(', ')
                : '원사이즈';

            const addoptionpriceString =
            sizesWithPrices.length > 0
                ? sizesWithPrices.map(entry => entry.addoptionprice).join(', ')
                : '0';

        
            // 최종 데이터 반환
            return {
                site,
                designer,
                title,
                price,
                mainInfo,
                styleId,
                color,
                brandstyleId,
                imageUrls,
                size: sizeString,
                addoptionprice: addoptionpriceString,
            };
        });

        if (!productDetails || productDetails.imageUrls.length === 0) {
            console.warn('⚠️ 이미지 없음 → 다음 상품으로 스킵');
            continue; // ✅ 여기서 다음 상품
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
            // 이미 존재하는 상품이므로 업데이트를 해야 함
            console.log(`상품 업데이트: ${productDetails.title} - styleID: ${productDetails.styleId}`);
            
            // 상품 정보를 업데이트 (기존 데이터베이스 업데이트)
            // existingProduct.siteUrl = siteUrl;
            // existingProduct.title = productDetails.title;
            existingProduct.designer = productDetails.designer;
            existingProduct.size = productDetails.size;
            existingProduct.price = productDetails.price;
            // existingProduct.mainInfo = productDetails.mainInfo;
            existingProduct.addoptionprice = productDetails.addoptionprice;
            // existingProduct.partnerKey = partnerKey;
            // existingProduct.apiKey = apiKey;
            // existingProduct.color = productDetails.color;
            existingProduct.touched = true;
            existingProduct.visitUrl = productUrl;
            existingProduct.godoMallCategoryCode = godoMallCategoryCode;

            const godoMallCategoryName = category.godoMallCategoryName;

            // ✅ 플랫폼 타입 결정 (8자리면 SMARTSTORE, 그 외엔 GODOMALL)
            let isSuccess = false;
            const platform = existingProduct.platform;

            if (platform === 'godomall') {
                // ✅ 고도몰 등록
                const xmlUrl = await this.r2Service.uploadXmlToR2ByService(
                    existingProduct.styleId, 
                    existingProduct, 
                    existingProduct.mainImageUrl, 
                    existingProduct.additionalImageUrls, 
                    partnerKey,
                    apiKey
                );
                await this.userService.assertRequestAvailable(customId, 1);
                await this.godoMallService.registerProductWithXmlUrl(partnerKey, apiKey, xmlUrl, existingProduct, existingProduct.styleId);
                await this.userService.consumeRequest(customId, 1);
                isSuccess = true;
            } else if (platform === 'smartstore') {
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
            // 새 상품이므로 기존 로직으로 등록 진행
            const newProduct = this.productRepository.create(productDetails);
            newProduct.mainImageUrl = productDetails.imageUrls[0];
            newProduct.additionalImageUrls = productDetails.imageUrls.slice(1); // 추가 이미지들 저장
            newProduct.touched = true;
            newProduct.categoryName = categoryMapping.categoryName;
            newProduct.customId = customId;
            newProduct.accountPlatform = accountPlatform;
            newProduct.platform = account.platform;
            newProduct.siteUrl = siteUrl;
            newProduct.color = productDetails.color;
            newProduct.visitUrl = productUrl;
newProduct.godoMallCategoryCode = godoMallCategoryCode;

            const godoMallCategoryName = category.godoMallCategoryName;

            let isSuccess = false;
            switch (newProduct.platform) {

                case 'godomall': {
                    // ✅ 고도몰 등록
                    const xmlUrl = await this.r2Service.uploadXmlToR2ByService(
                        newProduct.styleId,
                        newProduct,
                        newProduct.mainImageUrl,
                        newProduct.additionalImageUrls,
                        partnerKey,
                        apiKey
                    );
                    await this.userService.assertRequestAvailable(customId, 1);
                    await this.godoMallService.registerProductWithXmlUrl(partnerKey, apiKey, xmlUrl, newProduct, newProduct.styleId);
                    await this.userService.consumeRequest(customId, 1);
                    isSuccess = true;
                    break;
                }
                case 'smartstore': {
                    // await this.handleSmartstoreRegistration(
                    // newProduct,
                    // partnerKey,
                    // apiKey,
                    // { base64ImageList, originThumbnailUrls },
                    // godoMallCategoryName,
                    // );
                    // isSuccess = true;
                    // break;
                }
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
                // =========================
                // 🔴 UNKNOWN PLATFORM
                // =========================
                default: {
                    console.warn('Unsupported platform: ' + newProduct.platform);
                    break;
                }

                
            }
            if (isSuccess) {
                await this.productRepository.save(newProduct);
                console.log(`✅ 상품 저장 완료: ${productDetails.designer} ${productDetails.title}`);
            } 

        }
    } 
    if (page && !page.isClosed()) {
        await page.close();
    }
    if (context) {
        await context.close();
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
        console.warn('Unsupported platform (unsold): ' + account.platform);
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
    
        console.log(`품절 처리 완료: ${product.title} (styleId: ${product.styleId})`);
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
                    '--disable-cache',
                    '--disable-application-cache',
                    '--disk-cache-size=0',
                    '--media-cache-size=0',
                    '--disable-logging',
                    '--log-level=3',
                    '--disable-crash-reporter',
                    '--window-size=1920,1080'
                ],
            });

            const context = await browser.createBrowserContext();
            page = await context.newPage();
            await page.authenticate({
                username: proxy.username,
                password: proxy.password,
            });

            await page.setUserAgent(
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36'
            );
            await page.setExtraHTTPHeaders({
                'accept-language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
                'sec-ch-ua': '"Chromium";v="145", "Google Chrome";v="145", "Not=A?Brand";v="8"',
                'sec-ch-ua-mobile': '?0',
                'sec-ch-ua-platform': '"Windows"',
            });
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
            
            await page.goto('https://www.cettire.com/kr', {waitUntil: 'domcontentloaded', timeout: 15000}).catch(() => null);
            await page.goto(visitUrl, {waitUntil: 'domcontentloaded', timeout: 15000}).catch(() => null);

            // await page.waitForSelector(
            //     '#product-detail--price',
            //     { timeout: 20000 }
            // );
            await new Promise((resolve) => setTimeout(resolve, 2000));

            const productDetails = await page.evaluate(async () => {

                // ✅ 0️⃣ 페이지 없음 / 상품 내려감 체크 (최우선)
                const goShoppingLink = document.querySelector<HTMLAnchorElement>(
                    'a#goshopping'
                );

                if (goShoppingLink) {
                    console.log('🛑 SOLD OUT: 페이지 없음 (goshopping 감지)');
                    return {
                    soldOut: true,
                    reason: 'PAGE_NOT_FOUND',
                    };
                }

                // ✅ 0️⃣ 재입고 알림 버튼 존재 여부 (최우선)
                const restockBtn = document.querySelector(
                'button.U_od70v-xtakRMkXKPWa6'
                );

                if (restockBtn) {
                return {
                    soldOut: true,
                };
                }

                // 기본 가격
                const priceElement = document.querySelector('#product-detail--price');
                const price = priceElement
                    ? parseInt(priceElement.textContent.replace(/[^0-9]/g, ''), 10)
                    : 0;

                const sizeListEl = document.querySelector('#product-detail--size-list');
                const sizeElements = sizeListEl
                    ? sizeListEl.querySelectorAll('ul li')
                    : [];

                let sizesWithPrices: { size: string; addoptionprice: number }[] = [];

                /* =========================
                * 3️⃣ 사이즈 상품 → 사이즈 순환 클릭
                * ========================= */
                if (sizeElements.length > 0) {
                    for (let i = 0; i < sizeElements.length; i++) {
                              const el = sizeElements[i];


                    const sizeSpan = el.querySelector('span');
                    const sizeText = sizeSpan ? sizeSpan.textContent.trim() : 'Unknown';

                    const statusSpan = el.querySelector('._1sImFqCLafP2558CS0-NlL');
                    const statusText = statusSpan ? statusSpan.textContent.trim() : '';

                    // ❌ 품절 / 비정상 사이즈 제외
                    if (statusText === '품절' || sizeText === 'Unknown') {
                        continue;
                    }

                    (el as HTMLElement).click();
                    
                    // ✅ 마지막 사이즈만 더 길게 대기
                    const isLast = i === sizeElements.length - 1;
                    await new Promise(resolve =>
                        setTimeout(resolve, isLast ? 1500 : 500)
                    );

                    const updatedPriceElement = document.querySelector('#product-detail--price');
                    const updatedPrice = updatedPriceElement
                        ? parseInt(updatedPriceElement.textContent.replace(/[^0-9]/g, ''), 10)
                        : price;

                    sizesWithPrices.push({
                        size: sizeText,
                        addoptionprice: updatedPrice - price,
                    });
                    }
                }

                /* =========================
                * 4️⃣ 결과 정리
                * ========================= */

                let sizeString = '';
                let addoptionpriceString = '';

                // ✅ CASE 1: 사이즈 리스트 자체가 없음 → 원사이즈
                if (!sizeListEl) {
                    sizeString = '원사이즈';
                    addoptionpriceString = '0';
                }
                // ✅ CASE 2: 사이즈 정상 추출
                else if (sizesWithPrices.length > 0) {
                    sizeString = sizesWithPrices.map(v => v.size).join(', ');
                    addoptionpriceString = sizesWithPrices.map(v => v.addoptionprice).join(', ');
                }
                // ❌ CASE 3: 사이즈는 있는데 전부 품절
                else {
                    sizeString = '';
                    addoptionpriceString = '';
                }

                const soldOut =
                    !price ||
                    (sizeListEl && sizesWithPrices.length === 0);

            return { price, size:sizeString, addoptionprice: addoptionpriceString,soldOut};
            });

            if (!productDetails) {
            return;
            }

            if (!productDetails.soldOut) {
            // ✅ 정상일 때만 DB 업데이트
            product.price = productDetails.price;
            product.addoptionprice = productDetails.addoptionprice;
            product.size = productDetails.size;
            product.lastModifiedDate = new Date();
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
            return;

        } catch (err: any) {
            console.warn(`🚨 Cettire 업데이트 실패: ${err.message}`);
        } finally {
            if (page && !page.isClosed()) await page.close();
            if (browser) await browser.close();
        }
    }
    console.error('❌ 모든 프록시 재시도 실패 → 업데이트 포기 (기존값 유지)');
}
}

}
