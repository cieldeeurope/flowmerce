import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { GodoMallService } from 'src/godomall/godomall.service';
import { Repository } from 'typeorm';
import { R2Service } from '../cloudflare/r2.service';
import * as fs from 'fs';
import { Mapping } from 'src/mapping/mapping.entity';
import { Product } from 'src/product/product.entity';
import { UpdateGateway } from 'src/update/update.gateway';
import type { Browser, Page } from 'puppeteer';
import puppeteer from 'puppeteer-extra';
const sharp = require('sharp');
import axios from 'axios';
import { SmartstoreService } from 'src/smartstore/smartstore.service';
import { SmartstoreApiService } from 'src/smartstore/smartstore-api.service';
import { Cafe24Service } from 'src/cafe24/cafe24.service';
import { MakeshopService } from 'src/makeshop/makeshop.service';
import { HostingAccount } from 'src/hosting/hostingaccount.entity';
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

  @Injectable()
  export class HernoService {
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
      
      
  // 자동 스크롤 함수
  private async autoScroll(page: Page) {
  await page.evaluate(async () => {
    const distance = 400;
    const interval = 50;
    const waitAfterScroll = 5000;

    let previousScrollHeight = 0;

    while (true) {
      // 1️⃣ 현재 scrollHeight 저장
      const currentScrollHeight = document.body.scrollHeight;

      // 2️⃣ 맨 아래까지 스크롤
      let scrolledHeight = 0;

      await new Promise<void>(resolve => {
        const timer = setInterval(() => {
          window.scrollBy(0, distance);
          scrolledHeight += distance;

          if (scrolledHeight >= document.body.scrollHeight) {
            clearInterval(timer);
            resolve();
          }
        }, interval);
      });

      // 3️⃣ 로딩 대기
      await new Promise(res => setTimeout(res, waitAfterScroll));

      // 4️⃣ 높이 변화 체크
      const newScrollHeight = document.body.scrollHeight;

      if (newScrollHeight === currentScrollHeight || newScrollHeight === previousScrollHeight) {
        break; // ❌ 더 이상 로딩 없음
      }

      previousScrollHeight = currentScrollHeight;
    }
  });
}

  

// 1. 카테고리 가져오기 (프록시 교체 및 재시도 로직 추가)
async getCategories(siteUrls: string[]): Promise<{ categoryName: string; url: string }[]> {
    const allCategories: { categoryName: string; url: string }[] = [];

    const proxyLines = await this.r2Service.loadBrightProxies2();
    const proxy = pickProxy(proxyLines);
    const proxyArg = `--proxy-server=http://${proxy.host}:${proxy.port}`;

    for (const siteUrl of siteUrls) {
        let retryCount = 0;
        let success = false;

        while (retryCount < 3 && !success) {
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
            const context = browser.defaultBrowserContext();

            await context.setCookie(
                {
                    name: 'preferredCountry',
                    value: 'NL',
                    domain: '.herno.com',
                    path: '/',
                },
                {
                    name: 'preferredLanguage',
                    value: 'KO',
                    domain: '.herno.com',
                    path: '/',
                }
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

                try {

                await page.goto(siteUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
                console.log(`🔍 ${siteUrl} 진행 중...`);
                await page.waitForSelector(
                    '[data-category="women"]',
                    { visible: true, timeout: 30000 }
                );

                const categories = await page.evaluate(() => {
                    const results: { categoryName: string; url: string }[] = [];

                    const TARGETS = [
                        { selector: '[data-category="women"]', label: '여성' },
                        { selector: '[data-category="men"]', label: '남성' },
                    ];

                    TARGETS.forEach(({ selector, label }) => {
                        document
                        .querySelectorAll(`${selector} li.b-menu_category-level_3-item`)
                        .forEach(li => {
                            const a = li.querySelector('a.b-menu_category-level_3-link') as HTMLAnchorElement | null;
                            if (!a) return;

                            const sub = a.textContent?.trim();
                            if (!sub || sub === '전체 보기') return;

                            // ✅ 중분류 (level_2)
                            const middle = li
                            .closest('li.b-menu_category-level_2-item')
                            ?.querySelector('.b-menu_category-level_2-link')
                            ?.textContent
                            ?.trim();

                            if (!middle) return;

                            results.push({
                            categoryName: `${label} - ${middle} - ${sub}`,
                            url: a.href,
                            });
                        });
                    });

                    return results;
                    });


                // 결과 병합
                allCategories.push(...categories);
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
        console.log('🔄 다음 URL로 이동...');
    }

    console.log('🎯 모든 사이트에서 카테고리 수집 완료!');
    // ★ 이제 allCategories의 각 categoryName을 영어로 번역
    const translatedCategories = await Promise.all(
        allCategories.map(async (cat) => ({
        categoryName: cat.categoryName,
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
      timeout: 30000, // 타임아웃 설정
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36"
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
  
  
    
  
// 에르노 사이트 크롤링 시작
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
    const serviceType = 'herno';
    const proxyLines = await this.r2Service.loadBrightProxies2();
    

    let browser: Browser | null = null;
    let page: Page | null = null;
    let productUrls: string[] = [];

    const category = await this.mappingRepository.findOne({
        where: { customId: customId, accountPlatform: accountPlatform, siteUrl: siteUrl },
    });

    const MAX_RETRY = 5;
    let retryAttempts = 0; // 재시도 횟수 초기화
        
    while (retryAttempts < MAX_RETRY ) {
        let proxy = pickProxy(proxyLines);
        let proxyArg = `--proxy-server=http://${proxy.host}:${proxy.port}`;
        try {
            browser = await puppeteer.launch({
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

            const context = browser.defaultBrowserContext();

            await context.setCookie(
                {
                    name: 'preferredCountry',
                    value: 'NL',
                    domain: '.herno.com',
                    path: '/',
                },
                {
                    name: 'preferredLanguage',
                    value: 'KO',
                    domain: '.herno.com',
                    path: '/',
                }
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

            await page.goto(siteUrl, { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => null);
            await page.waitForSelector(
                'div.b-product_tile.js-product_tile.js-price_loaded a.js-producttile_link[href]',
                { visible: true, timeout: 30000 }
            );
            await this.autoScroll(page);
            await new Promise(resolve => setTimeout(resolve, 2000));

            productUrls = Array.from(
                new Set(
                    await page.evaluate(() => {
                    return Array.from(
                        document.querySelectorAll<HTMLAnchorElement>('div.b-product_tile.js-product_tile.js-price_loaded a.js-producttile_link[href]')
                    ).map(a => a.href);
                    })
                )
            );

            if (productUrls.length === 0) {
                throw new Error('상품 URL을 수집하지 못했습니다.');
            }

            break;
        }   catch (error: any) {
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
console.log(`에르노 최종 수집된 상품 URL 수: ${productUrls.length} - ${category?.categoryName || '카테고리 없음'}`);


for (const [index, productUrl] of productUrls.entries()) {
    let loadAttempts = 0;

    while (loadAttempts < 10) {
        try {
            if(!browser){
                const proxy = pickProxy(proxyLines);
                const proxyArg = `--proxy-server=http://${proxy.host}:${proxy.port}`;
                browser = await puppeteer.launch({
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

                const context = browser.defaultBrowserContext();

                await context.setCookie(
                    {
                        name: 'preferredCountry',
                        value: 'NL',
                        domain: '.herno.com',
                        path: '/',
                    },
                    {
                        name: 'preferredLanguage',
                        value: 'KO',
                        domain: '.herno.com',
                        path: '/',
                    }
                );
                
                await page.setViewport({width: 1920,height: 1080});
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
            }
    
            await page.goto(productUrl, { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => null);
             console.log(`✅ (${index + 1}/${productUrls.length}) 에르노 ${category?.categoryName || '카테고리 없음'}  수집 중`);
            await page.waitForSelector(
                'div.b-product_price.js-product_price',
                { visible: true, timeout: 30000 }
            );
            await new Promise(resolve => setTimeout(resolve, 2000));
            break; // ✅ 로딩 성공 시 루프 종료
        } catch (error: any) {
            loadAttempts++;
            console.warn(`에르노 페이지 로드 실패 [${error.message}] (프록시 변경 ${loadAttempts}/3): ${error.message}`);
            if (loadAttempts < 3) {
                if (page && !page.isClosed()) await page.close();
                if (browser) await browser.close();

                // 🔥 이 두 줄이 핵심
                page = null;
                browser = null;
                continue;
            } else {
                console.error('최대 로드 시도 초과 - 다음 URL로 이동합니다.');
                break;
            }
        }
    }

    
        const isAvailable = await page.evaluate(() => {
            const btn = document.querySelector<HTMLButtonElement>(
                'button.js-add_to_cart.b-product_add_to_cart-submit'
            );

            if (!btn) return false;
            if (btn.hasAttribute('disabled')) return false;

            return true;
        });

        if (!isAvailable) {
            continue;
        }

        const productDetails = await page.evaluate(async () => {

            let size = null;

            const sizeText = Array.from(
            document.querySelectorAll(
                'a.js-swatchanchor.js-togglerhover.b-swatches_size-link[data-variantattribute="size"]'
            )
            )
            .map(el => (el as HTMLElement).innerText.trim())
            .join(', ');

            if (!sizeText) {
                size = '원사이즈';
            } else {
                size = sizeText;
            }

            const site = 'Herno';
            const designer = '에르노';
            const titleElement = document.querySelector('span.b-product_name');
            const title = titleElement ? titleElement.textContent?.trim() || '' : '';
            let price = null;

            // 🔹 부모 컨테이너 고정
            const priceElement = document.querySelector(
            'div.b-product_price.js-product_price'
            );

            if (priceElement) {
            // 1️⃣ 세일가 우선
            const saleEl = priceElement.querySelector(
                'span.b-product_price-sales.js-product_price-sales'
            );

            // 2️⃣ 정가 fallback
            const regularEl = priceElement.querySelector(
                'div.js-product_price-standard.b-product_price-standard'
            );

            const targetEl = saleEl || regularEl;

            if (targetEl) {
                const raw = targetEl.textContent.trim(); // €606 / €975
                price = parseInt(raw.replace(/[^\d]/g, ''), 10);
            }
            }
            const color = document.querySelector('span.js_color-description')?.textContent?.trim() || '';

            const imageUrls = (() => {
                const origin = location.origin;

                // ✅ 현재 활성화된 thumbnails_slider 찾기
                const slider = Array.from(
                    document.querySelectorAll('.js-thumbnails_slider')
                ).find(el => {
                    const style = window.getComputedStyle(el);
                    return style.display !== 'none';
                });

                if (!slider) {
                    return [];
                }

                return Array.from(
                    slider.querySelectorAll(
                    'ul.js-thumbnails.b-product_thumbnails-list img.js-thumbnail_img-item'
                    )
                )
                .map(img => {
                const data = img.getAttribute('data-lgimg');
                if (!data) return null;

                try {
                    const parsed = JSON.parse(data);
                    const url = parsed.hires || parsed.url;
                    if (!url) return null;

                    return url.startsWith('http')
                    ? url
                    : origin + url;
                } catch {
                    return null;
                }
                })
                .filter(Boolean);
            })();


        
            let mainInfo = '';
            let madeIn = '';
            let styleId = '';
            let brandstyleId = '';

            const lines = [];

            // ===============================
            // 1️⃣ TAB 1 ~ TAB 3 텍스트 수집
            // ===============================
            ['#tab1', '#tab2', '#tab3'].forEach(selector => {
            const tab = document.querySelector(selector);
            if (!tab) return;

            tab.querySelectorAll(
                '.b-product_long_description, .b-product_material, .b-product_fit_information'
            ).forEach(el => {
                const text = (el as HTMLElement).innerText?.trim();
                if (!text) return;

                lines.push(text);

                // 🔹 제조국 추출
                if (!madeIn) {
                const match = text.match(/제조국\s*:\s*([^\n]+)/);
                if (match) {
                    madeIn = match[1].trim();
                }
                }
            });
            });

            if (lines.length > 0) {
            mainInfo = lines.join('\n');
            }

            // ===============================
            // 2️⃣ styleId / brandstyleId
            // ===============================
            const codeEl = document.querySelector('.b-product_master_id');
            if (codeEl) {
            const match = (codeEl as HTMLElement).innerText.match(/코드\s*:\s*([A-Za-z0-9]+)/);
            if (match) {
                styleId = match[1];
                brandstyleId = styleId;
            }
            }


            return { site, designer, title, price, color, mainInfo, madeIn, styleId, size, brandstyleId, imageUrls };
        });

        if (!productDetails || !productDetails.mainInfo || !productDetails.styleId || !productDetails.title || !productDetails.price || !productDetails.imageUrls.length || !productDetails.size || !productDetails.brandstyleId) {
            console.warn('에르노 데이터 누락 - 다음 productUrl로 이동');
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
    where: { touched: false, siteUrl, customId, accountPlatform } // categoryName로 필터링
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

            page = await browser.newPage();
            await page.authenticate({
                username: proxy.username,
                password: proxy.password,
            });

            await page.setUserAgent(
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36'
            );

            const context = browser.defaultBrowserContext();

            await context.setCookie(
                {
                    name: 'preferredCountry',
                    value: 'NL',
                    domain: '.herno.com',
                    path: '/',
                },
                {
                    name: 'preferredLanguage',
                    value: 'KO',
                    domain: '.herno.com',
                    path: '/',
                }
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

            
            await page.goto(visitUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
            await page.waitForSelector(
                'h1.b-product_container-title',
                { visible: true, timeout: 30000 }
            );
            await new Promise(resolve => setTimeout(resolve, 2000));

            
            const productDetails = await page.evaluate(async () => {

                const addToCartBtn = document.querySelector(
                    'button.js-add_to_cart.b-product_add_to_cart-submit'
                );

                // ❌ 버튼 없거나 disabled → 즉시 품절
                if (!addToCartBtn || addToCartBtn.hasAttribute('disabled')) {
                    return {
                    price: null,
                    size: null,
                    soldOut: true,
                    };
                }
                
                let size = null;

                const sizeText = Array.from(
                document.querySelectorAll(
                    'a.js-swatchanchor.js-togglerhover.b-swatches_size-link[data-variantattribute="size"]'
                )
                )
                .map(el => (el as HTMLElement).innerText.trim())
                .join(', ');

                if (!sizeText) {
                    size = '원사이즈';
                } else {
                    size = sizeText;
                }

                let price = null;

                // 🔹 부모 컨테이너 고정
                const priceElement = document.querySelector(
                'div.b-product_price.js-product_price'
                );

                if (priceElement) {
                // 1️⃣ 세일가 우선
                const saleEl = priceElement.querySelector(
                    'span.b-product_price-sales.js-product_price-sales'
                );

                // 2️⃣ 정가 fallback
                const regularEl = priceElement.querySelector(
                    'div.js-product_price-standard.b-product_price-standard'
                );

                const targetEl = saleEl || regularEl;

                if (targetEl) {
                    const raw = targetEl.textContent.trim(); // €606 / €975
                    price = parseInt(raw.replace(/[^\d]/g, ''), 10);
                }
                }


                const soldOut = !price || !size || size.length === 0; // ✅ 둘 중 하나라도 없으면 품절
                return { price, size ,soldOut};
                });


            if (!productDetails) {
                continue;
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
            return;

        } catch (err: any) {
            console.warn(`🚨 herno 업데이트 실패: ${err.message}`);
        } finally {
            if (page && !page.isClosed()) await page.close();
            if (browser) await browser.close();
        }
    }
    console.error('❌ 모든 프록시 재시도 실패 → 업데이트 포기 (기존값 유지)');
}
}