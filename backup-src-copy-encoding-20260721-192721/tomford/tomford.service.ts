import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { GodoMallService } from 'src/godomall/godomall.service';
import { Repository } from 'typeorm';
import { R2Service } from '../cloudflare/r2.service';
import * as fs from 'fs';
import * as cheerio from 'cheerio';
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
import { GoogleTranslateService } from 'src/smartstore/google-translate.service';
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
  export class TomfordService {
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
      
      
  // 자동 스크롤 함수
  private async autoScroll(page: Page) {
      await page.evaluate(async () => {
          let totalHeight = 0;
          const distance = 400; // 스크롤할 거리
          const interval = 50;  // 스크롤 간격 (밀리초)
  
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
  

// 1. 카테고리 가져오기 (프록시 교체 및 재시도 로직 추가)
async getCategories(siteUrls: string[]): Promise<{ categoryName: string; url: string }[]> {
    const allCategories: { categoryName: string; url: string }[] = [];
    const seenUrls = new Set<string>();

    const normalizeText = (value: string) =>
      value.replace(/\s+/g, ' ').trim();

    const humanize = (value: string) =>
      value
        .replace(/-/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase());

    const excludeSubRegex = /\b(view\s*all|discover\s*all|discover\s*more|shop\s*now|découvrir\s*tous\s*les\s*modèles)\b/i;
    const excludeMiddleRegex = /^(men|women)$/i;

    const collectCategories = ($: cheerio.CheerioAPI, baseUrl: string) => {
      const directCategories: { categoryName: string; url: string }[] = [];

      $('li.c-site-nav__item.dropdown').each((_, lvl1) => {
        const middle = normalizeText(
          $(lvl1).children('a.c-site-nav__link.dropdown-toggle').first().text(),
        );

        if (!middle || excludeMiddleRegex.test(middle)) {
          return;
        }

        $(lvl1).find('ul.c-site-nav__menu--lvl-2 li[role="presentation"] > a[href]').each((__, anchor) => {
          const href = $(anchor).attr('href');
          const sub = normalizeText($(anchor).text());

          if (!href || !sub || excludeSubRegex.test(sub)) {
            return;
          }

          const absoluteUrl = new URL(href, baseUrl).toString().split('?')[0];
          const parts = new URL(absoluteUrl).pathname.split('/').filter(Boolean);
          const genderIndex = parts.findIndex((part) => part.toLowerCase() === 'men' || part.toLowerCase() === 'women');

          if (genderIndex === -1) {
            return;
          }

          const label = parts[genderIndex].toLowerCase() === 'men' ? '남성' : '여성';
          directCategories.push({
            categoryName: `${label} - ${middle} - ${sub}`,
            url: absoluteUrl,
          });
        });
      });

      if (directCategories.length) {
        return directCategories;
      }

      return $('a[href]')
        .map((_, anchor) => {
          const href = $(anchor).attr('href');
          const sub = normalizeText($(anchor).text());

          if (!href || !sub || excludeSubRegex.test(sub)) {
            return null;
          }

          const absoluteUrl = new URL(href, baseUrl).toString().split('?')[0];
          const parts = new URL(absoluteUrl).pathname.split('/').filter(Boolean);
          const genderIndex = parts.findIndex((part) => part.toLowerCase() === 'men' || part.toLowerCase() === 'women');

          if (genderIndex === -1 || parts.length < genderIndex + 3) {
            return null;
          }

          const label = parts[genderIndex].toLowerCase() === 'men' ? '남성' : '여성';
          const middle = humanize(parts[genderIndex + 1] || '');

          if (!middle || excludeMiddleRegex.test(middle)) {
            return null;
          }

          return {
            categoryName: `${label} - ${middle} - ${sub}`,
            url: absoluteUrl,
          };
        })
        .get()
        .filter(Boolean);
    };

    for (const siteUrl of siteUrls) {
      let success = false;

      for (let attempt = 1; attempt <= 3 && !success; attempt++) {
        try {
          const categoryHtml = await this.r2Service.getHtmlFromUrl2(siteUrl);
          const $ = cheerio.load(categoryHtml);
          const categories = collectCategories($, siteUrl);

          if (!categories.length) {
            throw new Error('No categories found');
          }

          for (const category of categories) {
            if (seenUrls.has(category.url)) {
              continue;
            }

            seenUrls.add(category.url);
            allCategories.push(category);
          }

          console.log(`Tom Ford categories collected from ${siteUrl}: ${categories.length}`);
          success = true;
        } catch (error: any) {
          console.error(`Tom Ford category fetch failed [${siteUrl}] (${attempt}/3): ${error.message}`);
        }
      }

      if (!success) {
        console.warn(`Tom Ford category fetch skipped after retries: ${siteUrl}`);
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
  
  
    
  
// 톰포드 사이트 크롤링 시작
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
    const serviceType = 'tomford';
    const proxyLines = await this.r2Service.loadBrightProxies2();
    

    let browser: Browser | null = null;
    let page: Page | null = null;
    let productUrls: string[] = [];

    const category = await this.mappingRepository.findOne({
        where: { customId: customId, accountPlatform: accountPlatform, siteUrl: siteUrl },
    });


    const MAX_RETRY = 5;
    let retryAttempts = 0; // 재시도 횟수 초기화
        
    while (retryAttempts < MAX_RETRY) {
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

                       
            await page.goto(`${siteUrl}?start=0&sz=400`, { waitUntil: 'networkidle0', timeout: 20000 }).catch(() => null);
            await page.waitForSelector(
                'div.product[data-pid] div.pdp-link > a.link',
                { timeout: 30000 }
            );
            await this.autoScroll(page);
            await new Promise(resolve => setTimeout(resolve, 2000));

            productUrls = await page.evaluate(() => {
                return Array.from(
                    document.querySelectorAll<HTMLAnchorElement>(
                        'div.product[data-pid] div.pdp-link > a.link'
                    )
                ).map(a => a.href);
            });

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
console.log(`톰포드 최종 수집된 상품 URL 수: ${productUrls.length} - ${category?.categoryName || '카테고리 없음'}`);


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

                await page.setExtraHTTPHeaders({
                    'accept-language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
                    'sec-ch-ua': '"Chromium";v="145", "Google Chrome";v="145", "Not=A?Brand";v="8"',
                    'sec-ch-ua-mobile': '?0',
                    'sec-ch-ua-platform': '"Windows"',
                });

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
             console.log(`✅ (${index + 1}/${productUrls.length}) 톰포드 ${category?.categoryName || '카테고리 없음'}  수집 중`);
            await page.waitForSelector(
                'span.sales',
                { visible: true, timeout: 30000 }
            );
            break; // ✅ 로딩 성공 시 루프 종료
        } catch (error: any) {
            loadAttempts++;
            console.warn(`톰포드 페이지 로드 실패 [${error.message}] (프록시 변경 ${loadAttempts}/3): ${error.message}`);
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
            const btn = document.querySelector('#dataiads-add-to-cart');
            if (!btn) return false; // 버튼 자체 없으면 안전하게 품절 처리

            return !btn.classList.contains('disabled');
        });

        if (!isAvailable) {
            continue;
        }




        const productDetails = await page.evaluate(async () => {

            let size = null;

            const sizeList = document.querySelector('ul.size-attr-list');

            if (!sizeList) {
                size = '원사이즈';
            } else {
                const sizeItems = Array.from(
                sizeList.querySelectorAll('li.size-attr-item')
                );

                const sizes = sizeItems
                // ❌ disabled 제외
                .filter(li => !li.hasAttribute('disabled'))
                .map(li => li.getAttribute('aria-describedby'))
                .filter(Boolean);

                // 🔥 핵심 수정 포인트
                if (sizes.length === 0) {
                // 사이즈는 있는데 전부 품절
                return {
                    price: null,
                    size: null,
                    soldOut: true,
                };
                }

                const numericSizes = sizes.filter(s => /^\d+$/.test(s));
                const otherSizes = sizes.filter(s => !/^\d+$/.test(s));

                numericSizes.sort((a, b) => Number(a) - Number(b));

                size = [...numericSizes, ...otherSizes].join(', ');
            }
            

            const site = 'Tomford';
            const designer = '톰포드';
            const titleElement = document.querySelector('h1.product-name');
            const title = titleElement ? titleElement.textContent?.trim() || '' : '';
            const priceElement = document.querySelector('span.sales');
            const price = priceElement
            ? parseInt(priceElement.textContent.replace(/[^\d]/g, ''), 10)
            : null;


            let color = '';

            const variantColorEl = document.querySelector(
            'span.js-variant-color.c-product-detail__attributes__item__value'
            );

            if (variantColorEl) {
            const text = variantColorEl.textContent?.trim();
            if (text) {
                color = text;
            }
            }

            if (!color) {
            const colorBtn = Array.from(
                document.querySelectorAll('.c-product-detail__attr-btn--color')
            ).find(btn => btn.hasAttribute('disabled'));

            if (colorBtn) {
                color =
                colorBtn
                    .getAttribute('aria-label')
                    ?.replace(/^Select Color\s*/i, '')
                    .trim() || '';
            }
            }

            let imageUrls: string[] = [];

            const container = document.querySelector(
            '.js-carousel-main.c-product-detail__carousel--pdp'
            ) as HTMLElement | null;

            if (container) {
            const images: HTMLImageElement[] = [];

            // ✅ 1️⃣ slick 구조가 있는 경우
            const slickImgs = Array.from(
                container.querySelectorAll('.slick-slide img')
            ) as HTMLImageElement[];

            if (slickImgs.length > 0) {
                images.push(
                ...slickImgs.filter(img => {
                    const slide = img.closest('.slick-slide');
                    return slide && !slide.classList.contains('slick-cloned');
                })
                );
            } 
            // ✅ 2️⃣ slick 미적용 (이미지 1장 케이스)
            else {
                images.push(
                ...Array.from(
                    container.querySelectorAll('img')
                ) as HTMLImageElement[]
                );
            }

            imageUrls = images
                .map(img => {
                // ✅ srcset에서 최고 해상도 선택
                if (img.srcset) {
                    const best = img.srcset
                    .split(',')
                    .map(s => s.trim())
                    .map(s => {
                        const [url, size] = s.split(' ');
                        return { url, size: parseInt(size) || 0 };
                    })
                    .sort((a, b) => b.size - a.size)[0];

                    if (best?.url) return best.url;
                }

                return img.src || null;
                })
                .filter((url): url is string => Boolean(url));

            // ✅ 중복 제거
            imageUrls = Array.from(new Set(imageUrls));
            }


        
            let mainInfo = '';
            let madeIn = '';
            let styleId = '';
            let brandstyleId = '';

            const containers = document.querySelector(
            '#collapsible-details-description'
            );

            if (containers) {
            const resultLines: string[] = [];

            // ✅ 1️⃣ ul > li (Tom Ford 가방/액세서리)
            const liItems = containers.querySelectorAll('ul li');
            liItems.forEach(li => {
                const text = li.textContent?.trim();
                if (!text) return;

                // ❌ PRODUCT NO 제거
                if (/^product\s*no\s*:/i.test(text)) return;

                resultLines.push(text);
            });

            // ✅ 2️⃣ fallback: p 태그 (의류)
            if (resultLines.length === 0) {
                containers.querySelectorAll('p').forEach(p => {
                const text = p.textContent?.trim();
                if (text) resultLines.push(text);
                });
            }

            mainInfo = resultLines.join('\n');

            // ✅ 3️⃣ Made in은 "전체 텍스트"에서 한 번만 추출 (⭐ 핵심)
            const textBlob = (containers as HTMLElement).innerText;
            const madeInMatch = textBlob.match(
                /made\s+in\s+([a-z\s]+?)(?:\.|$)/i
            );
            if (madeInMatch) {
                madeIn = madeInMatch[1].trim();
            }
            }


            const url = location.href;
            const match = url.match(/\/([A-Z0-9-]+)\.html/i);
            if (match) {
                styleId = match[1];
            }

            brandstyleId = styleId || '';




            return { site, designer, title, price, color, mainInfo, madeIn, styleId, size, brandstyleId, imageUrls };
        });

        if (!productDetails || !productDetails.mainInfo || !productDetails.styleId || !productDetails.title || !productDetails.price || !productDetails.imageUrls.length || !productDetails.size || !productDetails.brandstyleId) {
            console.warn('톰포드 데이터 누락 - 다음 productUrl로 이동');
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
  console.error(`Account not found: ${customId} / ${accountPlatform}`);
  return;
}

const partnerKey = account.partnerKey;
const apiKey = account.apiKey;
    const MAX_RETRY = 2;
    
    const product = await this.productRepository.findOne({
        where: {
            goodsno: Number(goodsNo),
            customId,
            accountPlatform,
        },
    });
    if (!product) return;

    for (let attempt = 1; attempt <= MAX_RETRY; attempt++) {
        try {
            const html = await this.r2Service.getHtmlFromUrl2(visitUrl);
            const $ = cheerio.load(html || '');
            const isErrorPage = $('.error-page-container').length > 0;
            let productDetails: { soldOut: boolean; price: number | null; size: string | null };

            if (isErrorPage) {
                productDetails = { soldOut: true, price: null, size: null };
            } else {
                const addToCartBtn = $('#dataiads-add-to-cart').first();
                if (!addToCartBtn.length || (addToCartBtn.attr('class') || '').includes('disabled')) {
                    productDetails = { soldOut: true, price: null, size: null };
                } else {
                    let size: string | null = null;
                    const sizeList = $('ul.size-attr-list').first();
                    if (!sizeList.length) {
                        size = '원사이즈';
                    } else {
                        const sizes = sizeList.find('li.size-attr-item')
                            .toArray()
                            .filter(li => $(li).attr('disabled') === undefined)
                            .map(li => $(li).attr('aria-describedby') || '')
                            .filter(Boolean);
                        const numericSizes = sizes.filter(s => /^\d+$/.test(s)).sort((a, b) => Number(a) - Number(b));
                        const otherSizes = sizes.filter(s => !/^\d+$/.test(s));
                        size = sizes.length ? [...numericSizes, ...otherSizes].join(', ') : null;
                    }
                    const price = parseInt($('span.sales').first().text().replace(/[^\d]/g, ''), 10) || null;
                    productDetails = { price, size, soldOut: !price || !size };
                }
            }

            if (!productDetails.soldOut) {
                product.lastModifiedDate = new Date();
                product.price = productDetails.price;
                product.size = productDetails.size;
                await this.productRepository.save(product);
            }

            const xmlUrl = await this.r2Service.uploadXmlToR2Update(
                product,
                product.styleId,
                partnerKey,
                productDetails.soldOut
            );

            if (!xmlUrl) {
                console.error(`XML upload failed -> ${product.designer} ${product.title}`);
                return;
            }

            await this.userService.assertRequestAvailable(customId, 1);
            await this.godoMallService.registerProductWithXmlUrl(
                partnerKey,
                apiKey,
                xmlUrl,
                product,
                product.styleId
            );
            await this.userService.consumeRequest(customId, 1);

            this.gateway.sendProductUpdate(
                `${customId}:${accountPlatform}:${goodsNo}`,
                {
                status: 'success',
                price: product.price,
                size: product.size,
                updatedAt: new Date().toISOString(),
                }
            );

            await this.godoMallService.deleteUpdateXml(xmlUrl);

            console.log(`✅ 톰포드 상품 업데이트 완료: ${product.designer} ${product.title}`);
            return;

        } catch (err: any) {
            console.warn(`tomford snapshot update failed (${attempt}/${MAX_RETRY}): ${err.message}`);
        }
    }
    console.error('All tomford snapshot update retries failed.');
}
}
