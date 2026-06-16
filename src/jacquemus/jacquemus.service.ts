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
import * as cheerio from 'cheerio';
import axios from 'axios';
import { SmartstoreService } from 'src/smartstore/smartstore.service';
import { SmartstoreApiService } from 'src/smartstore/smartstore-api.service';
import { Cafe24Service } from 'src/cafe24/cafe24.service';
import { MakeshopService } from 'src/makeshop/makeshop.service';
import { HostingAccount } from 'src/hosting/hostingaccount.entity';
import { GoogleTranslateService } from 'src/smartstore/google-translate.service';
import { UserService } from 'src/user/user.service';
import { getHtmlFromBrightDataUnlocker } from '../brightdata/brightdata-unlocker.util';
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
  export class JacquemusService {
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
  
async getCategories(siteUrls: string[]): Promise<{ categoryName: string; url: string }[]> {
  const allCategories: { categoryName: string; url: string }[] = [];

  for (const siteUrl of siteUrls) {
    let retryCount = 0;
    let success = false;

    while (retryCount < 3 && !success) {
      try {
        console.log(`🔍 ${siteUrl} BrightData 요청 중...`);

        // ✅ BrightData HTML 가져오기 (이미 너 쓰고 있는거)
        const html = await getHtmlFromBrightDataUnlocker(siteUrl, {
          debugLabel: 'jacquemus',
          saveRetryResponses: true,
          randomRetryDelay: true,
        });

        if (!html || html.length < 5000) {
          throw new Error('❌ HTML 이상 (차단 의심)');
        }

        const categories = this.parseJacquemusCategories(html);

        allCategories.push(...categories);
        success = true;

      } catch (error: any) {
        console.error(`❌ [${siteUrl}] 오류: ${error.message}`);
        retryCount++;
        console.warn(`⚠️ 재시도 (${retryCount}/3)`);
      }
    }

    if (!success) {
      console.warn(`🚫 [${siteUrl}] 실패`);
    }
  }

  console.log('🎯 Jacquemus 카테고리 완료');

  return Array.from(
    new Map(allCategories.map(v => [v.url, v])).values()
  );
}

private parseJacquemusCategories(html: string): { categoryName: string; url: string }[] {
  const $ = cheerio.load(html);

  const results: { categoryName: string; url: string }[] = [];

  $('ul.header__nav__submenu[aria-label]').each((_, menu) => {

    const level1 = $(menu).attr('aria-label')?.trim();
    if (!level1) return;

    // ✅ 필요하면 필터
    const allowed = ['Women', 'Men', 'Bags', 'New_In'];
    if (!allowed.includes(level1)) return;

    $(menu).children('li.header__nav__sublist').each((_, li) => {

      const $li = $(li);
      const a = $li.children('a');

      if (!a.length) return;

      const level2 = a.find('span').first().text().trim();
      const url2 = a.attr('href');

      if (!level2 || !url2) return;

      const level3Menu = $li.children('ul');

      // ✅ 3depth 있음
      if (level3Menu.length) {

        level3Menu.find('li.header__nav__sublist').each((_, li3) => {

          const a3 = $(li3).find('a');
          if (!a3.length) return;

          const level3 = a3.find('span').first().text().trim();
          const url3 = a3.attr('href');

          if (!level3 || !url3) return;

          // ❌ View all 제거
          if (level3.toLowerCase().includes('view all')) return;

          results.push({
            categoryName: `${level1}-${level2}-${level3}`,
            url: url3.startsWith('http')
              ? url3
              : `https://www.jacquemus.com${url3}`,
          });

        });

      } else {

        // ❌ New In 중복 제거
        if (level2.toLowerCase().includes('new in')) return;

        results.push({
          categoryName: `${level1}-${level2}`,
          url: url2.startsWith('http')
            ? url2
            : `https://www.jacquemus.com${url2}`,
        });

      }

    });

  });

  return results;
}

// // 1. 카테고리 가져오기 (프록시 교체 및 재시도 로직 추가)
// async getCategories(siteUrls: string[]): Promise<{ categoryName: string; url: string }[]> {
//     const allCategories: { categoryName: string; url: string }[] = [];

//     const proxyLines = await this.r2Service.loadBrightProxies2();
    

//     for (const siteUrl of siteUrls) {
//         let retryCount = 0;
//         let success = false;

//         while (retryCount < 3 && !success) {
//             const proxy = pickProxy(proxyLines);
//             const proxyArg = `--proxy-server=http://${proxy.host}:${proxy.port}`;
//             const browser = await puppeteer.launch({
//             headless: false,
//             args: [
//                 proxyArg,
//                 '--disable-blink-features',
//                 '--disable-blink-features=AutomationControlled',
//                 '--disable-infobars',
//                 '--no-default-browser-check',
//                 '--no-first-run',
//                 '--log-level=0',
//                 '--disable-dev-shm-usage',
//                 '--no-sandbox',
//                 '--disable-setuid-sandbox',
//                 '--remote-debugging-port=0',
//                 '--disable-background-timer-throttling',
//                 '--disable-backgrounding-occluded-windows',
//                 '--disable-renderer-backgrounding',
//                 '--disable-session-crashed-bubble',
//                 '--disable-accelerated-2d-canvas',
//                 '--noerrdialogs',
//             ],
//             });

//             const page = await browser.newPage();
//             await page.authenticate({
//             username: proxy.username,
//             password: proxy.password,
//             });
//             await page.setUserAgent(
//                 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36'
//             );
//             await page.setExtraHTTPHeaders({
//                 'accept-language': 'en-NL,en;q=0.9',
//                 'sec-fetch-site': 'none',
//                 'sec-fetch-mode': 'navigate',
//                 'sec-fetch-user': '?1',
//                 'sec-fetch-dest': 'document',
//                 'upgrade-insecure-requests': '1',
//             });
//             await page.emulateTimezone('Europe/Amsterdam');

//             await page.evaluateOnNewDocument(() => {
                
//                 Object.defineProperty(navigator, 'webdriver', {
//                     get: () => false,
//                 });
//                 Object.defineProperty(navigator, 'languages', {
//                     get: () => ['en-NL', 'en'],
//                 });

//                 Object.defineProperty(navigator, 'plugins', {
//                     get: () => [1, 2, 3],
//                 });
//                 (window as any).chrome = { runtime: {} };
//             });
//             await page.setViewport({ width: 1920, height: 1080 });


//                 try {
//                     await page.goto(siteUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
//                     console.log(`🔍 ${siteUrl} 진행 중...`);

//                     // ✅ jacquemus 메가메뉴 렌더 완료 대기
//                     await page.waitForSelector(
//                         'li.c-site-nav__item--l1 > a.c-site-nav__link',
//                         {
//                             visible: true,   // ✅ 실제 화면에 렌더링되어 보일 때까지 대기
//                             timeout: 30000,
//                         }
//                     );


//                     const categories = await page.evaluate(() => {

//                         const results: { categoryName: string; url: string }[] = [];

//                         document.querySelectorAll('ul.header__nav__submenu').forEach(menu => {

//                             const level1 = menu.getAttribute('aria-label')?.trim();
//                             if (!level1) return;

//                             // ✅ WOMEN / MEN 만 허용
//                             const allowed = ['Women', 'Men'];
//                             if (!allowed.includes(level1)) return;

//                             menu.querySelectorAll(':scope > li.header__nav__sublist').forEach(level2Li => {

//                             const level2Anchor = level2Li.querySelector(':scope > a');
//                             if (!level2Anchor) return;

//                             const level2 = level2Anchor.querySelector('span')?.textContent?.trim();
//                             if (!level2) return;

//                             // ❌ Nieuw 포함 중분류 제거
//                             if (level2.toLowerCase().includes('nieuw')) return;

//                             const level3Menu = level2Li.querySelector(':scope > ul');

//                             // level3 존재
//                             if (level3Menu) {

//                                 level3Menu.querySelectorAll('li.header__nav__sublist').forEach(level3Li => {

//                                 const a = level3Li.querySelector('a');
//                                 if (!a) return;

//                                 const level3 = a.querySelector('span')?.textContent?.trim();
//                                 if (!level3) return;

//                                 results.push({
//                                     categoryName: `${level1}-${level2}-${level3}`,
//                                     url: (a as HTMLAnchorElement).href
//                                 });

//                                 });

//                             }

//                             // level3 없는 구조
//                             else {

//                                 results.push({
//                                 categoryName: `${level1}-${level2}`,
//                                 url: (level2Anchor as HTMLAnchorElement).href
//                                 });

//                             }

//                             });

//                         });

//                         // ✅ 중복 제거
//                         const unique = Array.from(
//                             new Map(results.map(v => [v.url, v])).values()
//                         );

//                         return unique;

//                         });

//                     // ✅ 결과 병합
//                     allCategories.push(...categories);
//                     success = true;

//                 } catch (error: any) {
//             console.error(`❌ [${siteUrl}] 오류 발생: ${error.message}`);
//             retryCount++;
//             console.warn(`⚠️ [${siteUrl}] 재시도 (${retryCount}/3)...`);

//             } finally {
//             await browser.close();
//             }
//         }

//         if (!success) {
//             console.warn(`🚫 [${siteUrl}] 3회 시도 후 실패. 건너뜀.`);
//         }
//         console.log('🔄 다음 URL로 이동...');
//     }

//     console.log('🎯 모든 사이트에서 카테고리 수집 완료!');
//     // ★ 이제 allCategories의 각 categoryName을 영어로 번역
//     const translatedCategories = await Promise.all(
//         allCategories.map(async (cat) => ({
//         categoryName: cat.categoryName,
//         url: cat.url,
//         }))
//     );
  
//     return translatedCategories;
// }
  
  
private async uploadImageToR2(imageUrl: string, fileName: string, product: Product): Promise<string> {
  try {
    if (!imageUrl) {
      console.error('이미지 URL이 유효하지 않습니다:', imageUrl);
      throw new Error('유효하지 않은 이미지 URL');
    }

    
if (product.platform === 'smartstore' || product.platform === 'cafe24') {
    
  return imageUrl;
    
}

    
    

    // 🔥 1️⃣ axios로 이미지 직접 다운로드
    const response = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
        'Referer': 'https://www.jacquemus.com/en_nl',
      },
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
    
    const category = await this.mappingRepository.findOne({
        where: { customId: customId, accountPlatform: accountPlatform, siteUrl: siteUrl },
    });

    if (!category) {
        throw new Error('매핑된 카테고리를 찾을 수 없습니다.');
    }

    /* ============================================================
        1️⃣ 카테고리 HTML (전체 상품)
    ============================================================ */

    const categoryHtml =
        await getHtmlFromBrightDataUnlocker(`${siteUrl}?sz=500`, {
          debugLabel: 'jacquemus',
          saveRetryResponses: true,
          randomRetryDelay: true,
        });

    if (!categoryHtml) {
        console.error(`❌ 카테고리 HTML 실패 skip: ${siteUrl}`);
        return; // 🔥 여기서 끊어야 전체 죽는거 방지
    }


    const $category = cheerio.load(categoryHtml);
            

    const productUrls = $category('product-tile')
        .map((_, el) => {
            const $el = $category(el);

            const flag = $el.attr('data-flag') || '';

            // ❌ coming-soon 제외
            if (flag.includes('coming-soon')) return null;

            const href = $el
            .find('.product__title a[href]')
            .attr('href');

            if (!href) return null;

            return href.startsWith('http')
            ? href
            : `https://www.jacquemus.com${href}`;
        })
        .get()
        .filter(Boolean);
        

    const uniqueProductUrls = [...new Set(productUrls)];

    if (uniqueProductUrls.length === 0) {
        throw new Error('상품 URL을 수집하지 못했습니다. 모든 시도가 실패했습니다.');
    }

    console.log(`자크뮈스 최종 수집된 상품 URL 수: ${productUrls.length} - ${category?.categoryName || '카테고리 없음'}`);

    const chunkSize = 20;


    for (let i = 0; i < uniqueProductUrls.length; i += chunkSize) {

        const chunk = uniqueProductUrls.slice(i, i + chunkSize);

        await Promise.all(chunk.map(async (productUrl, idx) => {

            const globalIndex = i + idx;

            console.log(`✅ (${globalIndex + 1}/${uniqueProductUrls.length}) 자크뮈스 ${category?.categoryName || '카테고리 없음'}  수집 중`);

            try {

            const productHtml =
            await getHtmlFromBrightDataUnlocker(productUrl, {
                debugLabel: 'jacquemus',
                saveRetryResponses: true,
                randomRetryDelay: true,
            });

            if (!productHtml) {
                console.warn(`⚠️ 상품 HTML 없음 skip: ${productUrl}`);
                return; // 🔥 여기서 끊어야 함
            }

            const $ = cheerio.load(productHtml);

            /* ===============================
                productDetails
            =============================== */

            const site = 'Jacquemus';
            const designer = '자크뮈스';

            const title =
            $('h1.productDetail__title').text().trim() || '';

            const price =
            parseFloat(
                $('.product__price__value').attr('value') || '0'
            );

            const color =
            $('div.color-names span').text().trim() || '';

            /* ---------- 이미지 ---------- */

            const imageUrls = $(
            '.productDetail__visuals__images img.productDetail__visuals__content'
            )
            .map((_, el) => $(el).attr('src'))
            .get()
            .filter(Boolean);

            /* ---------- 사이즈 ---------- */

            let size = '원사이즈';
            let soldOut = false;

            /* ---------- 1️⃣ 버튼 기반 품절 ---------- */

            const addToCartBtn = $('#addToCartBtn');
            const attr = addToCartBtn
            .find('#addToCartAddDefault')
            .attr('data-attribute') || '';

            const btnText = addToCartBtn
            .find('#addToCartAddDefault')
            .text()
            .trim()
            .toLowerCase();

            if (
            attr.includes('coming-soon') ||
            btnText.includes('waitlist')
            ) {
            soldOut = true;
            }

            const sizeBtns = $(
            'button.productDetail__sizesWrapper__size'
            );

            if (sizeBtns.length) {

            const sizes: string[] = [];

            sizeBtns.each((_, el) => {
                const isDisabled = $(el).hasClass('-disabled');
                const value = $(el).attr('data-value');

                if (!isDisabled && value) {
                sizes.push(value === 'OS' ? '원사이즈' : value);
                }
            });

            if (!sizes.length) {
                soldOut = true;
                size = '';
            } else {
                size = sizes.join(',');
            }
            }

            /* ---------- 상세 ---------- */

            let mainInfo = '';
            let madeIn = '';
            let styleId = '';

            const node = $('#pdp-details__content-1');

            if (node.length) {

                mainInfo = node.text().replace(/\n{2,}/g, '\n').trim();

                node.find('.productDetail__detailsPanel__productInfo')
                    .each((_, el) => {

                    const text = $(el).text().trim();

                    if (/made\s*in/i.test(text)) {
                        madeIn = text.replace(/made\s*in/i, '').trim();
                    }

                    if (/Ref\./i.test(text)) {
                        const match = text.match(/Ref\.\s*([A-Z0-9-]+)/i);
                        if (match) styleId = match[1].trim();
                    }
                });
            }

            const brandstyleId = styleId;

            const productDetails = {
            site,
            designer,
            title,
            price,
            color,
            mainInfo,
            madeIn,
            styleId,
            size,
            brandstyleId,
            imageUrls,
            soldOut,
            };

            /* 🔥 로그 출력 */
            // console.log('📦 productDetails:', productDetails);

            /* ---------- 검증 ---------- */

            if (productDetails.soldOut) {
                console.warn(`❌ 자크뮈스 품절`);
                return;
            }


            if (
            !productDetails.mainInfo ||
            !productDetails.styleId ||
            !productDetails.title ||
            !productDetails.price ||
            !productDetails.imageUrls.length ||
            !productDetails.size ||
            !productDetails.brandstyleId
            ) {
            console.warn('⚠️ 자크뮈스 데이터 누락');
            return;
            }


            // 카테고리 매핑 데이터 찾기
            const categoryMapping = await this.mappingRepository.findOne({
                where: { customId, accountPlatform, siteUrl }
            });

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

                    if (
                        errorMessage.includes('요청 수 소진') ||
                        errorMessage.includes('구독 기간이 만료') ||
                        errorMessage.includes('플랜 구독 후 이용할 수 있습니다.') ||
                        errorMessage.includes('요청 수 설정이 없습니다.')
                    ) {
                        throw error; // 🔥 전체 스케줄 중단
                    }

    
                    console.error(`❌ 상품 처리 실패 (${productUrl})`);
    
                    if (error.response) {
                        console.error('STATUS:', error.response.status);
                        console.error('HEADERS:', error.response.headers);
                        console.error('DATA:', error.response.data?.toString?.() || error.response.data);
                    }
    
                    else if (error.request) {
                        console.error('NO RESPONSE RECEIVED');
                    }
    
                    else {
                        console.error('ERROR MESSAGE:', error.message);
                    }
                }
            }));   
        }

        /* ============================================================
            3️⃣ 품절 정리
        ============================================================ */
    
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
// 자크뮈스 사이트 크롤링 시작
// async getProductsFromCategory(siteUrl: string, partnerKey: string,apiKey: string, customId:string, accountPlatform:string, godoMallCategoryCode: string): Promise<void> {
    // const account = await this.hostingAccountRepository.findOne({
    //   where: { customId, accountPlatform },
    // });
//     const serviceType = 'jacquemus';
//     const proxyLines = await this.r2Service.loadBrightProxies2();
    

//     let browser: Browser | null = null;
//     let page: Page | null = null;
//     let productUrls: string[] = [];

//     const category = await this.mappingRepository.findOne({
//         where: { customId: customId, accountPlatform: accountPlatform, siteUrl: siteUrl },
//     });


//     const MAX_RETRY = 5;
//     let retryAttempts = 0; // 재시도 횟수 초기화
        
//     while (retryAttempts < MAX_RETRY) {
//         let proxy = pickProxy(proxyLines);
//         let proxyArg = `--proxy-server=http://${proxy.host}:${proxy.port}`;
//         try {
//             browser = await puppeteer.launch({
//                 headless: false,
//                 args: [
//                     proxyArg,
//                     '--disable-blink-features',
//                     '--disable-blink-features=AutomationControlled',
//                     '--disable-infobars',
//                     '--no-default-browser-check',
//                     '--no-first-run',
//                     '--log-level=0',
//                     '--disable-dev-shm-usage',
//                     '--no-sandbox',
//                     '--disable-setuid-sandbox',
//                     '--remote-debugging-port=0',
//                     '--disable-background-timer-throttling',
//                     '--disable-backgrounding-occluded-windows',
//                     '--disable-renderer-backgrounding',
//                     '--disable-session-crashed-bubble',
//                     '--disable-accelerated-2d-canvas',
//                     '--noerrdialogs',
//                 ],
//             });

//             page = await browser.newPage();
//             await page.authenticate({
//                 username: proxy.username,
//                 password: proxy.password,
//             });
//             await page.setUserAgent(
//                 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36'
//             );
//             
//             await page.setViewport({ width: 1920, height: 1080 });
//             await page.setCacheEnabled(false);
//             await page.setRequestInterception(true);
//             page.on('request', (request) => {
//                 const resourceType = request.resourceType();
//                 if (resourceType === 'image' || resourceType === 'font') {
//                     request.abort(); // 이미지와 폰트 요청 차단
//                 } else {
//                     request.continue(); // 나머지 요청은 진행
//                 }
//             });

                       
//             await page.goto(`${siteUrl}?sz=500`, { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => null);
//             await page.waitForSelector(
//                 'product-tile .product__title a[href]',
//                 { timeout: 30000 }
//             );
//             await new Promise(resolve => setTimeout(resolve, 2000));

//             productUrls = await page.evaluate(() => {
//                 return Array.from(
//                     document.querySelectorAll<HTMLAnchorElement>(
//                         'product-tile .product__title a[href]'
//                     )
//                 ).map(a => a.href);
//             });

//             break;


//         }   catch (error: any) {
//             console.warn(`⚠️ 페이지 이동 실패 (시도 ${retryAttempts + 1}/${MAX_RETRY}): ${error.message}`);

//             retryAttempts++;

//             if (page && !page.isClosed()) {
//                 await page.close();
//             }
//             if (browser) {
//                 await browser.close();
//             }

//             if (retryAttempts >= MAX_RETRY) {
//                 console.error(`❌ 최대 재시도 횟수 초과: ${siteUrl}`);
//                 return; // 최대 재시도 횟수를 초과하면 함수 종료
//             }

//             // 다음 재시도를 위한 랜덤 대기 시간 (exponential backoff)
//             const waitTime = Math.min(1000 * 2 ** retryAttempts, 10000); // 최대 10초 대기
//             await new Promise((resolve) => setTimeout(resolve, waitTime));
//         }
//     }
    


// if (productUrls.length === 0) {
//     throw new Error('상품 URL을 수집하지 못했습니다. 모든 시도가 실패했습니다.');
// }
// console.log(`자크뮈스 최종 수집된 상품 URL 수: ${productUrls.length} - ${category?.categoryName || '카테고리 없음'}`);


// for (const [index, productUrl] of productUrls.entries()) {
//     let loadAttempts = 0;

//     while (loadAttempts < 10) {
//         try {
//             if(!browser){
//                 const proxy = pickProxy(proxyLines);
//                 const proxyArg = `--proxy-server=http://${proxy.host}:${proxy.port}`;
//                 browser = await puppeteer.launch({
//                     headless: false,
//                     args: [
//                         proxyArg,
//                         '--disable-blink-features',
//                         '--disable-blink-features=AutomationControlled',
//                         '--disable-infobars',
//                         '--no-default-browser-check',
//                         '--no-first-run',
//                         '--log-level=0',
//                         '--disable-dev-shm-usage',
//                         '--no-sandbox',
//                         '--disable-setuid-sandbox',
//                         '--remote-debugging-port=0',
//                         '--disable-background-timer-throttling',
//                         '--disable-backgrounding-occluded-windows',
//                         '--disable-renderer-backgrounding',
//                         '--disable-session-crashed-bubble',
//                         '--disable-accelerated-2d-canvas',
//                         '--noerrdialogs',
//                     ],
//                 });
//                 page = await browser.newPage();
//                 await page.authenticate({
//                     username: proxy.username,
//                     password: proxy.password,
//                 });
//                 await page.setUserAgent(
//                     'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36'
//                 );

//                 await page.setExtraHTTPHeaders({
//                     'accept-language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
//                     'sec-ch-ua': '"Chromium";v="145", "Google Chrome";v="145", "Not=A?Brand";v="8"',
//                     'sec-ch-ua-mobile': '?0',
//                     'sec-ch-ua-platform': '"Windows"',
//                 });

//                 await page.setViewport({width: 1920,height: 1080});
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
//             }
    
//             await page.goto(productUrl, { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => null);
//             console.log(`✅ (${index + 1}/${productUrls.length}) 자크뮈스 ${category?.categoryName || '카테고리 없음'}  수집 중`);
//             await page.waitForSelector(
//                 'div.product__price',
//                 { visible: true, timeout: 30000 }
//             );
//             break; // ✅ 로딩 성공 시 루프 종료
//         } catch (error: any) {
//             loadAttempts++;
//             console.warn(`자크뮈스 페이지 로드 실패 [${error.message}] (프록시 변경 ${loadAttempts}/3): ${error.message}`);
//             if (loadAttempts < 3) {
//                 if (page && !page.isClosed()) await page.close();
//                 if (browser) await browser.close();

//                 // 🔥 이 두 줄이 핵심
//                 page = null;
//                 browser = null;
//                 continue;
//             } else {
//                 console.error('최대 로드 시도 초과 - 다음 URL로 이동합니다.');
//                 break;
//             }
//         }
//     }
    
//         await page.evaluate(() => {
//             const btn = document.querySelector<HTMLButtonElement>('button.pdp-details__button');
//             if (btn) btn.click();
//         });
//         await new Promise(resolve => setTimeout(resolve, 2000));

//         const productDetails = await page.evaluate(async () => {

//             const site = 'Jacquemus';
//             const designer = '자크뮈스';
//             const titleElement = document.querySelector('h1.productDetail__title');
//             const title = titleElement ? titleElement.textContent?.trim() || '' : '';
//             const priceElement = document.querySelector('div.product__price');
//             const price = priceElement
//             ? parseInt(priceElement.textContent.replace(/[^\d]/g, ''), 10)
//             : null;
//             const color = document.querySelector('div.color-names span')?.textContent?.trim() || '';

//             const imageUrls = Array.from(
//             document.querySelectorAll(
//                 '.productDetail__visuals__images img.productDetail__visuals__content'
//             )
//             ).map(img => img.getAttribute('src')).filter(Boolean);


//             const nodes = document.querySelectorAll<HTMLButtonElement>(
//                 'button.productDetail__sizesWrapper__size'
//             );

//             let size = '원사이즈';

//             if (nodes.length) {
//                 const sizes = Array.from(nodes)
//                     .filter(btn => !btn.classList.contains('-disabled') && btn.dataset.url)
//                     .map(btn => {
//                     const v = btn.dataset.value || '';
//                     return v === 'OS' ? '원사이즈' : v;
//                     })
//                     .filter((v): v is string => !!v);

//                 // 🔴 전부 품절
//                 if (!sizes.length) {
//                     return { reason: 'soldout' };
//                 }

//                 size = sizes.join(',');
//             }
            
        
//             const node = document.querySelector(
//                 '.pdp-details__content[aria-hidden="false"]'
//             );

//             let mainInfo = '';
//             let madeIn = '';
//             let styleId = '';
//             let brandstyleId = '';

//             if (node) {

//                 /* ===============================
//                 1️⃣ mainInfo (그대로 유지)
//                 ============================== */

//                 mainInfo = (node as HTMLElement).innerText
//                     .replace(/\n{2,}/g, '\n')
//                     .trim();

//                 const composition = node.querySelector(
//                     '.productDetail__detailsPanel__productInfo.composition'
//                 )?.textContent?.trim();

//                 if (composition && !mainInfo.includes(composition)) {
//                     mainInfo += '\n' + composition;
//                 }

//                 /* ===============================
//                 2️⃣ madeIn + styleId
//                 ============================== */

//                 const infos = node.querySelectorAll(
//                     '.productDetail__detailsPanel__productInfo'
//                 );

//                 infos.forEach(el => {

//                     const text = el.textContent?.trim() || '';

//                     // ✅ Made in (대소문자 무시)
//                     if (/made\s*in/i.test(text)) {
//                         madeIn = text.replace(/made\s*in/i, '').trim();
//                     }

//                     // ✅ Ref.
//                     if (text.includes('Ref.')) {
//                         styleId = text.replace('Ref.', '').trim();
//                     }

//                 });

//                 /* ===============================
//                 3️⃣ brandstyleId
//                 ============================== */

//                 brandstyleId = styleId;
//             }


//             return { site, designer, title, price, color, mainInfo, madeIn, styleId, size, brandstyleId, imageUrls };
//         });


//         // 🔴 전부 품절
//         if (productDetails?.reason === 'soldout') {
//             console.warn('아워레가시 상품 품절 - 다음 productUrl로 이동');
//             continue;
//         }
        
//         if (!productDetails || !productDetails.mainInfo || !productDetails.styleId || !productDetails.title || !productDetails.price || !productDetails.imageUrls.length || !productDetails.size || !productDetails.brandstyleId) {
//             console.warn('자크뮈스 데이터 누락 - 다음 productUrl로 이동');
//             continue; // 다음 productUrl로 이동
//         }


//         // 카테고리 매핑 데이터 찾기
//         const categoryMapping = await this.mappingRepository.findOne({ where: { siteUrl } });
//         if (!categoryMapping) {
//             throw new Error('매핑된 카테고리를 찾을 수 없습니다.');
//         }

//         try {
//         const existingProduct = await this.productRepository.findOne({ where: {
//             styleId: productDetails.styleId,
//             partnerKey: partnerKey, 
//             apiKey: apiKey
//             }
//         });
        
//         if (existingProduct) {
//             // 이미 존재하는 상품이므로 업데이트를 해야 함
//             console.log(`✅상품 업데이트: ${existingProduct.title} - styleID: ${existingProduct.styleId}`);
            
//             // 상품 정보를 업데이트 (기존 데이터베이스 업데이트)
//             existingProduct.siteUrl = siteUrl;
//             existingProduct.size = productDetails.size;
//             // // existingProduct.title = productDetails.title;
//             existingProduct.price = productDetails.price;
//             existingProduct.touched = true;
//             existingProduct.categoryName = category.categoryName;
//             const godoMallCategoryName = category.godoMallCategoryName;
//             existingProduct.visitUrl = productUrl;
//             existingProduct.godoMallCategoryCode = godoMallCategoryCode;

//             // ✅ 상품 카테고리 코드 저장
//             existingProduct.godoMallCategoryCode = godoMallCategoryCode;

//             // ✅ 플랫폼 타입 결정 (8자리면 SMARTSTORE, 그 외엔 GODOMALL)
//             if (godoMallCategoryCode.length === 8) {
//                 existingProduct.platform = 'smartstore';
//             } else {
//                 existingProduct.platform = 'godomall';
//             }

//             if (existingProduct.platform === 'smartstore') {
//                 // ✅ 스마트스토어 수정
//                 const auth = {
//                     smartStoreID: partnerKey,
//                     smartStoreSecret: apiKey,
//                 };
//                 await this.smartstoreApiService.updateSmartStoreProduct(existingProduct, auth, partnerKey,undefined,godoMallCategoryName);

//             } else {
//                 // ✅ 고도몰 등록
//                 const xmlUrl = await this.r2Service.uploadXmlToR2SmartStore(
//                 existingProduct.styleId, 
//                 existingProduct, 
//                 godoMallCategoryCode, 
//                 existingProduct.mainImageUrl, 
//                 existingProduct.additionalImageUrls, 
//                 partnerKey,
//                 apiKey
//                 );
//                 await this.godoMallService.registerProductWithXmlUrl(partnerKey, apiKey, xmlUrl, existingProduct, existingProduct.styleId);
//             }
    
//             // ✅ DB에 저장
//             await this.productRepository.save(existingProduct);

//         } else {
//             // 새 상품이므로 기존 로직으로 등록 진행
//             const newProduct = this.productRepository.create(productDetails);
//             newProduct.mainImageUrl = productDetails.imageUrls[0];
//             newProduct.additionalImageUrls = productDetails.imageUrls.slice(1); // 추가 이미지들 저장
//             newProduct.touched = true;
//             newProduct.categoryName = categoryMapping.categoryName;
//             newProduct.customId = customId;
//             newProduct.accountPlatform = accountPlatform;
//             newProduct.siteUrl = siteUrl;
//             newProduct.color = productDetails.color;
//             newProduct.visitUrl = productUrl;
//             newProduct.godoMallCategoryCode = godoMallCategoryCode;

//             const godoMallCategoryName = category.godoMallCategoryName;

//             // ✅ 상품 카테고리 코드 저장
//             newProduct.godoMallCategoryCode = godoMallCategoryCode;

//             // ✅ 플랫폼 타입 결정
//             if (godoMallCategoryCode.length === 8) {
//                 newProduct.platform = 'smartstore';
//             } else {
//                 newProduct.platform = 'godomall';
//             }

//             const r2MainImageUrl = await this.uploadImageToR2(
//                 
//                 productDetails.imageUrls[0],  // ✅ 이미지 URL을 첫 번째 인자로 전달
//                 `${productDetails.styleId}-main.jpg`,  // ✅ 저장할 파일명
//                 newProduct,
//                 partnerKey
//             );
//             newProduct.mainImageUrl = r2MainImageUrl; // ✅ R2 URL 저장
            
//             const additionalR2Urls = [];
//             for (let i = 1; i < productDetails.imageUrls.length; i++) {
//                 const r2AdditionalImageUrl = await this.uploadImageToR2(
//                     
//                     productDetails.imageUrls[i],  // ✅ 추가 이미지 URL
//                     `${productDetails.styleId}-additional-${i}.jpg`,  // ✅ 저장할 파일명
//                     newProduct,
//                     partnerKey
//                 );
//                 additionalR2Urls.push(r2AdditionalImageUrl);
//             }
//             newProduct.additionalImageUrls = additionalR2Urls; // ✅ 추가 이미지 리스트 저장

//             const allR2Urls = [newProduct.mainImageUrl,...(newProduct.additionalImageUrls || [])];
            
//             if (newProduct.platform === 'smartstore') {

//                 // ★ 새로운 로직: 이미지 데이터를 base64 및 원본 URL 배열로 생성
//                 const base64ImageList: string[] = [];
//                 const originThumbnailUrls: string[] = [];

//                 for (const r2Url of allR2Urls) {
//                     try {
//                         const response = await axios.get(r2Url, {
//                             responseType: 'arraybuffer',
//                             timeout: 10000,
//                         });
//                         const buffer = Buffer.from(response.data, 'binary');
//                         const base64 = buffer.toString('base64');
//                         base64ImageList.push(base64);
//                         originThumbnailUrls.push(r2Url);
//                     } catch (error: any) {
//                         console.error('이미지 R2 불러오기 실패:', r2Url, error.message);
//                         //logErrorToDesktop(error, `8.오류 발생`);
//                     }
//                 }

//                 // ✅ 스마트스토어 등록
//                 await this.handleSmartstoreRegistration(newProduct, partnerKey, apiKey,{ base64ImageList, originThumbnailUrls },godoMallCategoryName);

//             } else {
//                 // ✅ 고도몰 등록
//                 const xmlUrl = await this.r2Service.uploadXmlToR2SmartStore(
//                     newProduct.styleId,
//                     newProduct,
//                     godoMallCategoryCode,
//                     newProduct.mainImageUrl,
//                     newProduct.additionalImageUrls,
//                     partnerKey,
//                     apiKey
//                 );
//                 await this.godoMallService.registerProductWithXmlUrl(partnerKey, apiKey, xmlUrl, newProduct, newProduct.styleId);
//             }
//             // ✅ DB에 저장
//             await this.productRepository.save(newProduct);
//             console.log(`✅ 상품 저장 완료: ${productDetails.designer} ${productDetails.title}`);
//             }
//         } catch (error: any) {
//             console.error(`상품 등록 처리 실패 (${productUrl}): ${error.message}`);
//             continue;
//         }
//     }
//     try {
//         if (page && !page.isClosed()) {
//             await page.close();
//         }
//     } catch (error: any) {
//         if (error.message.includes("Session with given id not found")) {
//             console.warn("⚠️ Puppeteer 세션이 이미 닫혀 있어서 page.close()를 건너뜀.");
//         } else {
//             console.error("❌ 페이지 닫기 중 오류 발생:", error);
//         }
//     }
    
//     try {
//         if (browser && browser.connected) {
//             await browser.close();
//         }
//     } catch (error: any) {
//         console.warn("⚠️ 브라우저 닫기 중 오류 발생:", error.message);
//     }

//     // 크롤링 작업 후 품절 처리 실행
//     await this.handleUnsoldProducts(siteUrl, partnerKey, apiKey, customId, accountPlatform); // 품절 처리
//     await this.godoMallService.finalizeXmlDeletion(); // 추가된 호출

// }


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
    where: { touched: false, siteUrl, customId, accountPlatform} // categoryName로 필터링
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

            
            await page.goto(visitUrl, { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => null);
            await page.waitForSelector(
                'div.product__price',
                { visible: true, timeout: 30000 }
            );

            const productDetails = await page.evaluate(() => {

                const priceElement = document.querySelector('div.product__price');
                const price = priceElement
                ? parseInt(priceElement.textContent.replace(/[^\d]/g, ''), 10)
                : null;

                const nodes = document.querySelectorAll<HTMLButtonElement>(
                    'button.productDetail__sizesWrapper__size'
                );

                let size = '원사이즈';

                if (nodes.length) {
                    const sizes = Array.from(nodes)
                        .filter(btn => !btn.classList.contains('-disabled') && btn.dataset.url)
                        .map(btn => {
                        const v = btn.dataset.value || '';
                        return v === 'OS' ? '원사이즈' : v;
                        })
                        .filter((v): v is string => !!v);

                    if (sizes.length) {
                        size = sizes.join(',');
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
            console.warn(`🚨 jacquemus 업데이트 실패: ${err.message}`);
        } finally {
            if (page && !page.isClosed()) await page.close();
            if (browser) await browser.close();
        }
    }
    console.error('❌ 모든 프록시 재시도 실패 → 업데이트 포기 (기존값 유지)');
}
}
