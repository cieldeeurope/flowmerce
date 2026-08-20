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
    throw new Error('?꾨줉???놁쓬');
  }

  // 理쒖큹 1?? ?쒕뜡
  if (proxyIndex === -1) {
    proxyIndex = Math.floor(Math.random() * proxyLines.length);
  } else {
    // ?댄썑: ?ㅼ쓬 ?꾨줉??
    proxyIndex = (proxyIndex + 1) % proxyLines.length;
  }

  const raw = proxyLines[proxyIndex];
  return parseAuthProxy(raw);
}



function loadProxies(): string[] {
    const filePath = '\\\\CHANMIN\\Desktop\\CleanIP(?좊즺?꾨줉??.txt';
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    return fileContent.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  }

function getRandomProxy(proxies: string[]): string {
  const randomIndex = Math.floor(Math.random() * proxies.length);
  return proxies[randomIndex];
}

// ?먮윭 濡쒓렇 ???寃쎈줈 (lv ?대뜑 ??
// const errorLogDir = path.join(
//   '\\\\CHANMIN\\Desktop\\?щ·留?\?먮윭濡쒓렇',
//   'celine'
// );

// // ?대뜑 ?놁쑝硫??앹꽦
// if (!fs.existsSync(errorLogDir)) {
//   fs.mkdirSync(errorLogDir, { recursive: true });
// }

// // 理쒖쥌 濡쒓렇 ?뚯씪 寃쎈줈
// const errorLogPath = path.join(errorLogDir, 'celine_error_log.txt');

// // ?먮윭 ????⑥닔
// function //logErrorToDesktop(error: any, context: string = '') {
//   try {
//     const timestamp = new Date().toISOString();
//     const message = `[${timestamp}] ${context} - ${error?.message || error}\n`;

//     fs.appendFileSync(errorLogPath, message, 'utf-8');
//     console.error(message); // 湲곗〈 肄섏넄 異쒕젰???좎?
//   } catch (fileError) {
//     console.error('???먮윭 濡쒓렇 ????ㅽ뙣:', fileError.message);
//   }
// }

@Injectable()
export class CelineService {
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
    @InjectRepository(Mapping) // 留ㅽ븨??移댄뀒怨좊━
    private readonly mappingRepository: Repository<Mapping>,
    @InjectRepository(HostingAccount)
    private readonly hostingAccountRepository: Repository<HostingAccount>,
    private readonly userService: UserService,

  ) {}

  private async wait(ms: number): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, ms));
  }

  private async waitForCelineListingPageReady(page: Page, siteUrl: string): Promise<void> {
    const deadline = Date.now() + 45000;
    let lastHref = '';
    let stableReadyCount = 0;
    let lastErrorMessage = '';

    while (Date.now() < deadline) {
      try {
        const state = await page.evaluate(() => {
          const text = (value: string | null | undefined) =>
            String(value || '').replace(/\s+/g, ' ').trim();

          const grid = document.querySelector('[data-osearch-productgrid], ul.o-listing-grid');
          const productLinkCount = grid
            ? grid.querySelectorAll(
                'li.o-listing-grid__item a.m-product-listing__meta[href], ' +
                'li.o-listing-grid__item a.m-tile-slider__slide[href], ' +
                'li.o-listing-grid__item a[href*=".html"]',
              ).length
            : 0;
          const bodyText = text(document.body?.innerText).toLowerCase();

          return {
            href: window.location.href,
            readyState: document.readyState,
            hasListingData: Boolean(grid && productLinkCount > 0),
            isBlocked:
              bodyText.includes('access denied') ||
              bodyText.includes("don't have permission") ||
              bodyText.includes('captcha'),
          };
        });

        if (state.isBlocked) {
          throw new Error('Celine protection page returned');
        }

        if (state.readyState !== 'loading' && state.hasListingData) {
          if (state.href === lastHref) {
            stableReadyCount++;
          } else {
            lastHref = state.href;
            stableReadyCount = 1;
          }

          if (stableReadyCount >= 3) {
            return;
          }
        } else {
          stableReadyCount = 0;
          lastHref = state.href;
        }
      } catch (error: any) {
        lastErrorMessage = error?.message || String(error);
        if (
          !lastErrorMessage.includes('Execution context was destroyed') &&
          !lastErrorMessage.includes('Cannot find context') &&
          !lastErrorMessage.includes('Most likely because of a navigation')
        ) {
          throw error;
        }

        stableReadyCount = 0;
      }

      await this.wait(700);
    }

    throw new Error(`Celine listing page did not stabilize after goto: ${siteUrl}${lastErrorMessage ? ` (${lastErrorMessage})` : ''}`);
  }

  private async waitForCelineProductPageReady(page: Page, productUrl: string): Promise<void> {
    const deadline = Date.now() + 45000;
    let lastHref = '';
    let stableReadyCount = 0;
    let lastErrorMessage = '';

    while (Date.now() < deadline) {
      try {
        const state = await page.evaluate(() => {
          const text = (value: string | null | undefined) =>
            String(value || '').replace(/\s+/g, ' ').trim();

          const priceText = text(document.querySelector('div.o-product__header-titles span.prices')?.textContent);
          const titleText = text(document.querySelector('span.o-product__title-truncate')?.textContent);
          const productIdText = text(document.querySelector('span.product-id.d-none')?.textContent);
          const bodyText = text(document.body?.innerText).toLowerCase();

          return {
            href: window.location.href,
            readyState: document.readyState,
            hasProductData: Boolean(priceText || titleText || productIdText),
            isBlocked:
              bodyText.includes('access denied') ||
              bodyText.includes("don't have permission") ||
              bodyText.includes('captcha'),
          };
        });

        if (state.isBlocked) {
          throw new Error('Celine protection page returned');
        }

        if (state.readyState !== 'loading' && state.hasProductData) {
          if (state.href === lastHref) {
            stableReadyCount++;
          } else {
            lastHref = state.href;
            stableReadyCount = 1;
          }

          if (stableReadyCount >= 3) {
            return;
          }
        } else {
          stableReadyCount = 0;
          lastHref = state.href;
        }
      } catch (error: any) {
        lastErrorMessage = error?.message || String(error);
        if (
          !lastErrorMessage.includes('Execution context was destroyed') &&
          !lastErrorMessage.includes('Cannot find context') &&
          !lastErrorMessage.includes('Most likely because of a navigation')
        ) {
          throw error;
        }

        stableReadyCount = 0;
      }

      await this.wait(700);
    }

    throw new Error(`Celine product page did not stabilize after goto: ${productUrl}${lastErrorMessage ? ` (${lastErrorMessage})` : ''}`);
  }


// 1. 移댄뀒怨좊━ 媛?몄삤湲?(?꾨줉??援먯껜 諛??ъ떆??濡쒖쭅 異붽?)
async getCategories(siteUrls: string[]): Promise<{ categoryName: string; url: string }[]> {
  const proxyLines = await this.r2Service.loadBrightProxies2();
  if (!proxyLines.length) {
      console.warn('?꾨줉???놁쓬, 醫낅즺');
      return;
  }

  // ?쒕뜡?쇰줈 1媛??좏깮
  const raw = proxyLines[Math.floor(Math.random() * proxyLines.length)];
  const proxy = parseAuthProxy(raw);
  const proxyArg = `--proxy-server=http://${proxy.host}:${proxy.port}`;
  const allCategories: { categoryName: string; url: string }[] = [];
  
    // siteUrls瑜??쒗쉶?섎ŉ 媛??ъ씠?몄뿉 ????묒뾽
    async function processSiteUrls(urls: string[]): Promise<void> {
      for (const siteUrl of urls) {
        let retryCount = 0;
        let success = false;
  
        while (retryCount < 3 && !success) {
          console.log(`?뙇 [${siteUrl}] ?꾨줉???ъ슜: ${proxy}`);
  
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
          await page.setViewport({ width: 1800, height: 800 });
  
          try {
            await page.goto(siteUrl, { waitUntil: 'networkidle2', timeout: 30000 });
            console.log(`?뵇 ${siteUrl} 吏꾪뻾 以?..`);
            await new Promise((resolve) => setTimeout(resolve, 2000));
  
            // 1. ?ъ꽦 移댄뀒怨좊━ 異붿텧
            const womenCategories: { categoryName: string; url: string }[] =
              await page.evaluate(() => {
                const targetElement = document.querySelector('[data-gtm-name="WOMEN"]');
                if (!targetElement) {
                  console.error("?ъ꽦 ????붿냼瑜?李얠쓣 ???놁뒿?덈떎.");
                  return [];
                }
                const container = targetElement.parentElement;
                const nestedLinks = container.querySelectorAll('ul > li > ul > li a[href]') as NodeListOf<HTMLAnchorElement>;
                const results: { categoryName: string; url: string }[] = [];
                
                nestedLinks.forEach(link => {
                  const url = link.href;
                  const a = document.createElement('a');
                  a.href = url;
                  const segments = a.pathname.split('/').filter(seg => seg !== "");
                  let categoryName = "";
                  if (segments.length === 4) {
                    categoryName = `${segments[1]} - ${segments[2]} - ${segments[3]}`;
                  } else if (segments.length === 5) {
                    categoryName = `${segments[1]} - ${segments[2]} - ${segments[3]} - ${segments[4]}`;
                  }
                  if (categoryName) {
                    results.push({ categoryName, url });
                  }
                });
                return results;
              });
            
            // ?ъ꽦 移댄뀒怨좊━ 寃곌낵 ???
            womenCategories.forEach(category => {
              allCategories.push(category);
            });
            console.log(`??${siteUrl} ?ъ꽦 移댄뀒怨좊━: ${womenCategories.map(c => c.categoryName).join(', ')}`);
  
            // 2. ?⑥꽦 移댄뀒怨좊━ 異붿텧
            const menCategories: { categoryName: string; url: string }[] =
              await page.evaluate(() => {
                const targetElement = document.querySelector('[data-gtm-name="MEN"]');
                if (!targetElement) {
                  console.error("?⑥꽦 ????붿냼瑜?李얠쓣 ???놁뒿?덈떎.");
                  return [];
                }
                const container = targetElement.parentElement;
                const nestedLinks = container.querySelectorAll('ul > li > ul > li a[href]') as NodeListOf<HTMLAnchorElement>;
                const results: { categoryName: string; url: string }[] = [];
                
                nestedLinks.forEach(link => {
                  const url = link.href;
                  const a = document.createElement('a');
                  a.href = url;
                  const segments = a.pathname.split('/').filter(seg => seg !== "");
                  let categoryName = "";
                  if (segments.length === 4) {
                    categoryName = `${segments[1]} - ${segments[2]} - ${segments[3]}`;
                  } else if (segments.length === 5) {
                    categoryName = `${segments[1]} - ${segments[2]} - ${segments[3]} - ${segments[4]}`;
                  }
                  if (categoryName) {
                    results.push({ categoryName, url });
                  }
                });
                return results;
              });
            
            // ?⑥꽦 移댄뀒怨좊━ 寃곌낵 ???(異붽?)
            menCategories.forEach(category => {
              allCategories.push(category);
            });
            console.log(`??${siteUrl} ?⑥꽦 移댄뀒怨좊━: ${menCategories.map(c => c.categoryName).join(', ')}`);
  
            success = true; // ?깃났 ??while ?덉텧
          } catch (error: any) {
            console.error(`??[${siteUrl}] ?ㅻ쪟 諛쒖깮: ${error.message}`);
            retryCount++;
            console.warn(`?좑툘 [${siteUrl}] ?ъ떆??(${retryCount}/3)...`);
          } finally {
            await browser.close();
          }
        }
  
        if (!success) {
          console.warn(`?슟 [${siteUrl}] 3???쒕룄 ???ㅽ뙣. 嫄대꼫?.`);
        }
        console.log(`?봽 ?ㅼ쓬 URL濡??대룞...`);
      }
    }
  
    await processSiteUrls(siteUrls);
    console.log(`?렞 紐⑤뱺 ?ъ씠?몄뿉??移댄뀒怨좊━ ?섏쭛 ?꾨즺!`);
    return allCategories;
  }
  




private async uploadImageToR2(imageUrl: string, fileName: string, product: Product): Promise<string> {
  try {
    if (!imageUrl) {
      console.error('?대?吏 URL???좏슚?섏? ?딆뒿?덈떎:', imageUrl);
      throw new Error('?좏슚?섏? ?딆? ?대?吏 URL');
    }

    
if (product.platform === 'smartstore' || product.platform === 'cafe24') {
    
  return imageUrl;
    
}

    
    

    // ?대?吏 ?ㅼ슫濡쒕뱶
    const response = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      timeout: 10000, // ??꾩븘???ㅼ젙
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36"
      }
    });
    let imageBuffer = Buffer.from(response.data, 'binary'); // ?대?吏 ?곗씠?곕? 踰꾪띁濡?蹂??

    // Sharp瑜??ъ슜?댁꽌 ?대?吏 硫뷀??곗씠???뺤씤 (?뺤떇 ?먮퀎)
    const metadata = await sharp(imageBuffer).metadata();
    if (metadata.format === 'webp') {
      // JPEG濡?蹂??
      imageBuffer = await sharp(imageBuffer)
        .jpeg() // png()瑜??ъ슜?섎㈃ PNG濡?蹂??媛??
        .toBuffer();
      // ?뚯씪 ?대쫫??.jpg ?뺤옣???곸슜 (?꾩슂??寃쎌슦)
      fileName = fileName.replace(/\.webp$/i, '.jpg');
    }

    // R2???대?吏 ?낅줈??
    const r2ImageUrl = await this.r2Service.uploadImageToR2(fileName, imageBuffer, product);
    return r2ImageUrl; // ?낅줈?쒕맂 ?대?吏??URL 諛섑솚
  } catch (error: any) {
    console.error(`?대?吏 ?낅줈???ㅽ뙣: ${error.message}`);
    //logErrorToDesktop(error, `1.?ㅻ쪟 諛쒖깮`);
    throw error;
  }
}

  // ?먮룞 ?ㅽ겕濡??⑥닔
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

  // Celine ?ъ씠???щ·留??쒖옉
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
    let categoryCollectionCompleted = false;

    const category = await this.mappingRepository.findOne({
      where: { customId: customId, accountPlatform: accountPlatform, siteUrl: siteUrl },
  });


  const proxyLines = await this.r2Service.loadBrightProxies2();
  if (!proxyLines.length) {
      console.warn('?꾨줉???놁쓬, 醫낅즺');
      return;
  }

  // ?쒕뜡?쇰줈 1媛??좏깮
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
    await page.setCacheEnabled(false);
    await page.setRequestInterception(true);
    page.on('request', (request) => {
        const resourceType = request.resourceType();
        if (resourceType === 'image' || resourceType === 'font') {
            request.abort(); // ?대?吏? ?고듃 ?붿껌 李⑤떒
        } else {
            request.continue(); // ?섎㉧吏 ?붿껌? 吏꾪뻾
        }
    });

    const MAX_RETRY = 5; // 理쒕? ?ъ떆???잛닔
    let retryAttempts = 0;

    while (retryAttempts < MAX_RETRY) {
        try {
            await page.goto(siteUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
            await this.waitForCelineListingPageReady(page, siteUrl);
            await this.autoScroll(page);
            await new Promise((resolve) => setTimeout(resolve, 3000));
            break; // ?깃났?섎㈃ 諛섎났 醫낅즺
        } catch (error: any) {
            console.warn(`?좑툘 ?섏씠吏 ?대룞 ?ㅽ뙣 (?쒕룄 ${retryAttempts + 1}/${MAX_RETRY}): ${error.message}`);
            //logErrorToDesktop(error, `2.?ㅻ쪟 諛쒖깮`);

            retryAttempts++;

            if (page && !page.isClosed()) {
                await page.close();
            }
            if (browser) {
                await browser.close();
            }

            if (retryAttempts >= MAX_RETRY) {
                console.error(`??理쒕? ?ъ떆???잛닔 珥덇낵: ${siteUrl}`);
                //logErrorToDesktop(error, `3.?ㅻ쪟 諛쒖깮`);
                return; // 理쒕? ?ъ떆???잛닔瑜?珥덇낵?섎㈃ ?⑥닔 醫낅즺
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

            // ?ㅼ쓬 ?ъ떆?꾨? ?꾪븳 ?쒕뜡 ?湲??쒓컙 (exponential backoff)
            const waitTime = Math.min(1000 * 2 ** retryAttempts, 10000); // 理쒕? 10珥??湲?
            await new Promise((resolve) => setTimeout(resolve, waitTime));
        }
    }

    while (true) {
        try {
            // ?꾩옱 ?섏씠吏?먯꽌 ?곹뭹 URL 諛?李⑤떒 ?щ? ?됯?
            const { currentPageProductUrls, isBlocked} = await page.evaluate(() => {
                    const grid = document.querySelector('[data-osearch-productgrid], ul.o-listing-grid') || document;
                    const productUrls = Array.from(grid.querySelectorAll(
                        'li.o-listing-grid__item a.m-product-listing__meta[href], ' +
                        'li.o-listing-grid__item a.m-tile-slider__slide[href], ' +
                        'li.o-listing-grid__item a[href*=".html"]'
                    ))
                    .map(a => {
                        const href = (a as HTMLAnchorElement).getAttribute('href') || '';
                        try {
                            const url = new URL(href, location.origin);
                            if (!url.hostname.includes('celine.com')) return '';
                            if (!url.pathname.toLowerCase().endsWith('.html')) return '';
                            url.hash = '';
                            url.search = '';
                            return url.href;
                        } catch {
                            return '';
                        }
                    })
                    .filter(Boolean);
            

            const bodyText = document.querySelector('body')?.textContent || '';

            const isBlocked =
                document.querySelector('body') === null &&
                (bodyText.includes('Access Denied') ||
                    bodyText.includes('Too Many Requests') ||
                    bodyText.includes('429') ||
                    bodyText.includes('Enforced timeout') ||
                    bodyText.includes('net::ERR_TIMED_OUT'));

            return { currentPageProductUrls: [...new Set(productUrls)], isBlocked };
      });

      if (isBlocked) {
          console.warn("?섏씠吏媛 李⑤떒?섏뿀?듬땲?? ?꾨줉?쒕? 蹂寃쏀븯???ㅼ떆 ?쒕룄?⑸땲??");
           // ?덈줈???꾨줉???ㅼ젙
          // 湲곗〈 釉뚮씪?곗?? ?섏씠吏 ?リ린
          if (page && !page.isClosed()) {
              await page.close();
          }
          if (browser) {
              await browser.close();
          }
          retryAttempts++;
          if (retryAttempts >= 30) {
              throw new Error("30???ъ떆??珥덇낵 - ?щ·留?醫낅즺");
          }
          // ?덈줈??釉뚮씪?곗?? ?섏씠吏 ?앹꽦
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
          await page.goto(siteUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
          await this.waitForCelineListingPageReady(page, siteUrl);
          continue;
      }

      if (currentPageProductUrls.length === 0) {
          console.log("???댁긽 ?곹뭹???놁뒿?덈떎. 諛섎났臾몄쓣 醫낅즺?⑸땲??");
          break;
      }

        productUrls = [...new Set([...productUrls, ...currentPageProductUrls])];
        
        // ?ㅽ겕濡??꾩쓽 ?믪씠 ?뺤씤
        const previousHeight = await page.evaluate(() => document.body.scrollHeight);
        // autoScroll ?⑥닔瑜??몄텧?섏뿬 ?섏씠吏瑜??ㅽ겕濡ㅽ븿
        await this.autoScroll(page);
        // UI ?낅뜲?댄듃瑜??꾪빐 5珥??湲?
        await new Promise((resolve) => setTimeout(resolve, 5000));
        // ?ㅽ겕濡????믪씠 ?뺤씤
        const newHeight = await page.evaluate(() => document.body.scrollHeight);
        if (newHeight === previousHeight) {
        console.log("?ㅽ겕濡??믪씠媛 蹂?섏? ?딆븘 ???댁긽 ?곹뭹??異붽??섏? ?딆뒿?덈떎. 諛섎났臾몄쓣 醫낅즺?⑸땲??");
        break;
        }
    } catch (error: any) {
      console.error(`?먮윭 諛쒖깮: ${error.message}`);
      //logErrorToDesktop(error, `4.?ㅻ쪟 諛쒖깮`);
      if (error.message.includes('Enforced timeout') ||
          error.message.includes('Navigation timeout') ||
          error.message.includes('net::ERR_TIMED_OUT') ||
          error.message.includes('Execution context was destroyed') ||
          error.message.includes('Cannot find context') ||
          error.message.includes('Most likely because of a navigation')) { 
          console.error("Enforced timeout,Navigation timeout,ERR_TIMED_OUT 臾몄젣媛 諛쒖깮?덉뒿?덈떎. 釉뚮씪?곗?瑜??ъ떆?묓빀?덈떎.");
          if (browser) {
              try {
                  // 湲곗〈 釉뚮씪?곗?? ?섏씠吏 ?リ린
                  if (page && !page.isClosed()) {
                      await page.close();
                  }
                  if (browser) {
                      await browser.close();
                  }
                  // ?덈줈??釉뚮씪?곗?? ?섏씠吏 ?앹꽦
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
                  await page.goto(siteUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
                  await this.waitForCelineListingPageReady(page, siteUrl);
                  await this.autoScroll(page);
                  await this.wait(3000);
              } catch (closeError: any) {
                  console.warn("釉뚮씪?곗? 醫낅즺 以?異붽? ?ㅻ쪟:", closeError.message);
              }
          }
           // ?덈줈???꾨줉???ㅼ젙
          retryAttempts++;
          if (retryAttempts >= 30) {
              throw new Error("30???ъ떆??珥덇낵 - ?щ·留?醫낅즺");
          }
          continue; // 猷⑦봽瑜??ㅼ떆 ?쒖옉
      } else {
          throw error; // ?덉긽移?紐삵븳 ?먮윭???곸쐞濡??꾨떖
      }
    }
  }
    categoryCollectionCompleted = true;
}
    finally {
      if (!categoryCollectionCompleted) {
        if (page && !page.isClosed()) {
          await page.close();
        }
        if (browser) {
          await browser.close();
        }
      }
    // // 紐⑤뱺 ?묒뾽 醫낅즺 ??釉뚮씪?곗? ?リ린
    // if (page && !page.isClosed()) {
    // await page.close();
    // }
    // if (browser) {
    // await browser.close();
    // }
    }

    if (productUrls.length === 0) {
      if (page && !page.isClosed()) {
        await page.close();
      }
      if (browser) {
        await browser.close();
      }
      throw new Error('?곹뭹 URL???섏쭛?섏? 紐삵뻽?듬땲?? 紐⑤뱺 ?쒕룄媛 ?ㅽ뙣?덉뒿?덈떎.');
    }
    console.log(`?由곕뒓 理쒖쥌 ?섏쭛???곹뭹 URL ?? ${productUrls.length} - ${category?.categoryName || '移댄뀒怨좊━ ?놁쓬'}`);

    // // ?덈줈??釉뚮씪?곗?? ?섏씠吏 ?앹꽦
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
    
    // await page.setViewport({ width: 1800, height: 800 });
    try {
    for (const [index, productUrl] of productUrls.entries()) {
      let loadAttempts = 0;
      let success = false;

      while (loadAttempts < 10) {
        try {
            await page.goto(productUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
            await this.waitForCelineProductPageReady(page, productUrl);
            console.log(`Celine (${index + 1}/${productUrls.length}) collect: ${category?.categoryName || 'category none'}`);
            await new Promise((resolve) => setTimeout(resolve, 3000));
            success = true;
            break; // 濡쒕뵫 ?깃났 ??猷⑦봽 醫낅즺
          } catch (error: any) {
              loadAttempts++;
              console.warn(`?섏씠吏 濡쒕뱶 ?ㅽ뙣 (?꾨줉??蹂寃?${loadAttempts}/10): ${error.message}`);
              //logErrorToDesktop(error, `5.?ㅻ쪟 諛쒖깮`);
              if (loadAttempts < 10) {
                  
                  console.log(`?덈줈???꾨줉?쒕줈 蹂寃? ${proxy}`);
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
                  console.error('理쒕? 濡쒕뱶 ?쒕룄 珥덇낵 - ?ㅼ쓬 URL濡??대룞?⑸땲??');
                  //logErrorToDesktop(error, `6.?ㅻ쪟 諛쒖깮`);
                  break;
              }
          }
      }


      const isAvailable = await page.evaluate(() => {
        const notifyMeDiv = document.querySelector('div.notify-me');
        const isNotifyMeAvailable = notifyMeDiv !== null && notifyMeDiv.hasAttribute('hidden');
      
        const cscDiv = document.querySelector('#cscExclusiveInformation');
        const isCscHidden = cscDiv !== null && cscDiv.classList.contains('s-hidden');
      
        // ????true???뚮쭔 ?ш퀬 ?덉쓬
        return isNotifyMeAvailable && isCscHidden;
      });
      
      if (!isAvailable) {
        continue; // ?봽 ?ш퀬 ?놁쑝硫??ㅼ쓬 ?곹뭹?쇰줈 嫄대꼫?곌린
      }

      // ?몙 媛寃??녿뒗 ?곹뭹 嫄대꼫?곌린
      const price = await page.evaluate(() => {
        const el = document.querySelector('div.o-product__header-titles span.prices');
        if (!el) return null;
        const priceText = el.textContent.replace(/[^\d]/g, '');
        return priceText ? parseInt(priceText, 10) : null;
      });

      if (price === null || isNaN(price)) {
        console.warn('??媛寃??녿뒗 ?곹뭹 嫄대꼫?');
        continue;
      }
 

      const productDetails = await page.evaluate(async (currentUrl) => {
        const site = 'Celine';
        const designer = '?由곕뒓';
        const titleElement = document.querySelector('span.o-product__title-truncate.f-body');
        const title = titleElement ? titleElement.textContent?.trim() || '' : '';
        const priceElement = document.querySelector('div.o-product__header-titles span.prices');
        const price = priceElement
          ? parseInt(priceElement.textContent.replace(/[^\d]/g, ''), 10)
          : null;
        const color = document.querySelector('p.m-selector__title')?.textContent?.trim() || '';
        
        const galleryLists = document.querySelectorAll('ul.o-product__gallery-imgs');

        // 紐⑤뱺 ?대?吏 ?붿냼瑜???ν븷 諛곗뿴
        const imageElements = [];
        galleryLists.forEach((list) => {
          const imgs = list.querySelectorAll(
            'li button[data-pswp-src], li button[data-pswp-srcset]'
          );
          imgs.forEach((img) => imageElements.push(img));
        });

        // 媛??대?吏??srcset?먯꽌 1440w(?먮뒗 媛??媛源뚯슫 ?댁긽????URL 異붿텧
        const imageUrls = imageElements
          .map((img) => {
            // ???듭떖 ?섏젙: pswp 怨꾩뿴 ?곗꽑
            const srcset =
              img.getAttribute('data-pswp-srcset') ||
              img.getAttribute('srcset') ||
              img.getAttribute('data-srcset') ||
              '';

            // srcset???꾩삁 ?놁쑝硫??⑥씪 src fallback
            if (!srcset) {
              return img.getAttribute('data-pswp-src') || '';
            }

            const candidateStrings = srcset.split(', ');
            const candidates = candidateStrings.map((candidate) => {
              const parts = candidate.trim().split(/\s+/);
              const url = parts[0];
              const size = parts[1] ? parseInt(parts[1], 10) : 0;
              return { url, size };
            });

            const desiredSize = 1440;
            let selectedItem = candidates.find((item) => item.size === desiredSize);

            if (!selectedItem) {
              candidates.sort(
                (a, b) => Math.abs(a.size - desiredSize) - Math.abs(b.size - desiredSize)
              );
              selectedItem = candidates[0];
            }

            return selectedItem ? selectedItem.url : '';
          })
          .filter((url) => url !== '');


        // ???ъ씠利??뺣낫 (CELINE 理쒖쥌)
        const oneSizeLabel = '\uC6D0\uC0AC\uC774\uC988';
        const isLikelySizedProduct = /\/(ready-to-wear|pret-a-porter|clothing|shoes|sneakers|boots|loafers|sandals|pumps|flats|belts|denim|pants|trousers|shorts|skirts|dresses|jackets|coats|tops|shirts|knitwear|sweaters|swimwear)\b/i
          .test(currentUrl || window.location.href);

        const selectorRoot = document.querySelector(
          '.o-product__selectors .m-selector--size'
        );

        let size;

        if (!selectorRoot) {
          if (isLikelySizedProduct) return null;
          size = oneSizeLabel;
        } else {
          const sizeElements = selectorRoot.querySelectorAll(
            'ul.m-selector__list li'
          );

          const sizeList = [];

          sizeElements.forEach(li => {
            const input = li.querySelector('input[type="radio"]');
            if (!input) return;

            // ???덉젅 ?ъ씠利??쒖쇅 (CELINE ?듭떖)
            if (input.classList.contains('s-disabled')) return;

            const value =
              input.getAttribute('data-value') ||
              li.textContent.trim();

            if (!value) return;

            sizeList.push(value.replace(',', '.'));
          });

          // ??以묐났 ?쒓굅
          const uniqueSizes = [...new Set(sizeList)];

          if (uniqueSizes.length === 0) {
            console.log('?좑툘 紐⑤뱺 ?ъ씠利덇? ?덉젅?낅땲?? ?ㅼ쓬 ?곹뭹?쇰줈 ?대룞?⑸땲??');
            return null;
          }

          size = uniqueSizes.join(', ');
        }


        // ?곸꽭 ?ㅻ챸
        let mainInfo = '';
        const descriptions = Array.from(
            document.querySelectorAll('ul.o-product__descriptions.m-accordion li.m-accordion__item div.a-text.f-body')
        ).map(el => el.textContent.trim());
        mainInfo = descriptions.join('<br/>');

        // ?ㅽ???ID
        let styleId = '';
        const styleIdMatch = mainInfo.match(/Reference\s*:\s*([\w\d\.\-]+)/);
        if (styleIdMatch) {
            styleId = styleIdMatch[1].trim();
        } else {
            const productIdElem = document.querySelector('span.product-id.d-none');
            if (productIdElem) {
                styleId = productIdElem.textContent.trim();
            }
        }

        const brandstyleId = styleId;
        const madeIn = 'Italy';

        return { site, designer, title, price, color, mainInfo, madeIn, styleId, size, brandstyleId, imageUrls };
    }, productUrl);



      if (
        !productDetails ||
        !productDetails.mainInfo ||
        !productDetails.styleId ||
        !productDetails.title ||
        !productDetails.imageUrls.length ||
        !productDetails.size ||
        !productDetails.brandstyleId ||
        productDetails.price === null || isNaN(productDetails.price) || productDetails.price === 0
      ) {
        console.warn('?由곕뒓 ?곗씠???꾨씫 - ?ㅼ쓬 productUrl濡??대룞');
        continue;
      }

      // ?대?吏媛 ?녿뒗 寃쎌슦 ?곹뭹??嫄대꼫?
      if (!productDetails || productDetails.imageUrls.length === 0) {
        if (loadAttempts < 2) {
            loadAttempts++;
            console.log('?대?吏媛 ?녿뒗 ?곹뭹?낅땲?? ?꾨줉??蹂寃????ㅼ떆 ?쒕룄?⑸땲??');
            
            // ?꾨줉??蹂寃?
            
            console.log(`?덈줈???꾨줉?쒕줈 蹂寃? ${proxy}`);
            
            // 湲곗〈 釉뚮씪?곗?? ?섏씠吏 ?リ린
            if (page && !page.isClosed()) {
                await page.close();
            }
            if (browser) {
                await browser.close();
            }
        
            // ?덈줈??釉뚮씪?곗?? ?섏씠吏 ?앹꽦
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
            // ?숈씪??productUrl濡??ㅼ떆 ?묒냽
            try {
                await page.goto(productUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
                await this.waitForCelineProductPageReady(page, productUrl);
            } catch (error: any) {
                console.warn(`?꾨줉??蹂寃??꾩뿉???섏씠吏 濡쒕뱶 ?ㅽ뙣: ${error.message}`);
                //logErrorToDesktop(error, `7.?ㅻ쪟 諛쒖깮`);
                continue; // ?숈씪 URL ?ъ떆???ㅽ뙣 ???ㅼ쓬 URL濡??대룞
            }
            continue; // ?숈씪 productUrl濡??ъ떆???꾨즺
        } else {
            console.log('?대?吏媛 ?녿뒗 ?곹뭹?낅땲?? ?ㅼ쓬 productUrl濡??대룞?⑸땲??');
            continue; // ?ㅼ쓬 productUrl濡??대룞
        }
        }

      // 移댄뀒怨좊━ 留ㅽ븨 ?곗씠??李얘린
      const categoryMapping = await this.mappingRepository.findOne({ where: { siteUrl } });
      if (!categoryMapping) {
          throw new Error('留ㅽ븨??移댄뀒怨좊━瑜?李얠쓣 ???놁뒿?덈떎.');
      }

      try {
      const existingProduct = await this.productRepository.findOne({ where: {
        styleId: productDetails.styleId,
        customId: customId, 
        accountPlatform: accountPlatform
        }
      });
      
      if (existingProduct) {
        // ?낅뜲?댄듃 濡쒖쭅
        console.log(`?낆긽???낅뜲?댄듃: ${existingProduct.title} - styleID: ${existingProduct.styleId}`);
        
        // ?곹뭹 ?뺣낫瑜??낅뜲?댄듃 (湲곗〈 ?곗씠?곕쿋?댁뒪 ?낅뜲?댄듃)
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
          // ???ㅻ쭏?몄뒪?좎뼱 ?섏젙
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
          // ??怨좊룄紐??깅줉
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

        // ???깃났?덉쓣 ?뚮쭔 ???
        if (isSuccess) {
          await this.productRepository.save(existingProduct);
        }

      } else {
        // ?????곹뭹 ?앹꽦
        const newProduct = this.productRepository.create(productDetails);

        newProduct.touched = true;
        newProduct.categoryName = categoryMapping.categoryName;
        newProduct.customId = customId;
        newProduct.platform = account.platform; // ??smartstore / godomall
        newProduct.accountPlatform = account.accountPlatform; // ??smartstore_1
        newProduct.siteUrl = siteUrl;
        newProduct.color = productDetails.color;
        newProduct.visitUrl = productUrl;
newProduct.godoMallCategoryCode = godoMallCategoryCode;

        const godoMallCategoryName = category.godoMallCategoryName;

        // =========================
        // ???대?吏 R2 ?낅줈??
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
            console.error('異붽? ?대?吏 ?낅줈???ㅽ뙣:', restImages[i], e.message);
          }
        }

        newProduct.additionalImageUrls = additionalR2Urls;

        const allR2Urls = [r2MainImageUrl, ...additionalR2Urls];

        // =========================
        // ???뚮옯?쇰퀎 泥섎━
        // =========================

        let isSuccess = false;
        switch (newProduct.platform) {

          // =========================
          // ?윟 SMARTSTORE
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
          // ?윟 GODOMALL
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
              console.warn(`???곹뭹 ?ㅽ궢?? ${newProduct.site} - ${newProduct.styleId}`);
            }
            break;
          }

          // =========================
          // ?뵶 UNKNOWN PLATFORM
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
            console.warn(`?좑툘 吏?먮릺吏 ?딅뒗 ?뚮옯?? ${newProduct.platform}`);
            break;
          }
        }

        // =========================
        // ??DB ???
        // =========================

        if (isSuccess) {
          await this.productRepository.save(newProduct);
          console.log(`???곹뭹 ????꾨즺: ${productDetails.designer} ${productDetails.title}`);
        } 
      }
    } catch (error: any) {
        const errorMessage = error?.message || '?????녿뒗 ?ㅻ쪟';

        console.error(`?곹뭹 ?깅줉 泥섎━ ?ㅽ뙣 (${productUrl}): ${errorMessage}`);

        if (
            errorMessage.includes('?붿껌 ???뚯쭊') ||
            errorMessage.includes('援щ룆 湲곌컙??留뚮즺') ||
            errorMessage.includes('?뚮옖 援щ룆 ???댁슜?????덉뒿?덈떎.') ||
            errorMessage.includes('?붿껌 ???ㅼ젙???놁뒿?덈떎.')
        ) {
            throw error; // ?뵦 ?꾩껜 ?ㅼ?以?以묐떒
        }

        continue;
    }
  }
    } finally {
      if (page && !page.isClosed()) {
        await page.close();
      }
      if (browser) {
        await browser.close();
      }
    }
  
  // ???뚮옯????낆뿉 ?곕Ⅸ ?덉젅 泥섎━
  switch (account.platform) {
    case 'smartstore': {
      await this.smartstoreApiService.deleteUnsoldSmartstoreProducts(
        siteUrl,
        customId,
        account.accountPlatform, // ??smartstore_1
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
      console.warn(`?좑툘 吏?먮릺吏 ?딅뒗 ?뚮옯??(?덉젅 泥섎━): ${account.platform}`);
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
          console.log(`?덉젅 泥섎━???곹뭹???놁뒿?덈떎: ${siteUrl}`);
          } else {
          // 2. ?덉젅 泥섎━ 濡쒖쭅
          for (const product of unsoldProducts) {
              // 湲곕낯 移댄뀒怨좊━ 肄붾뱶 ?뺤쓽
      
              
              // XML ?뚯씪 ?앹꽦 (?덉젅 泥섎━)
              const xmlUrl = await this.r2Service.uploadXmlToR2(
              product.styleId,
              product,
              
              product.mainImageUrl, // product?먯꽌 諛붾줈 媛?몄샂
              product.additionalImageUrls, // 異붽? ?대?吏???ъ슜
              partnerKey,
              apiKey
              );
          
              // 怨좊룄紐?API濡??덉젅 泥섎━ ?붿껌 ?꾩넚
              await this.userService.assertRequestAvailable(customId, 1);
              await this.godoMallService.registerProductWithXmlUrl(partnerKey,apiKey,xmlUrl, product, product.styleId);
              await this.userService.consumeRequest(customId, 1);
          
              console.log(`?由곕뒓 ?덉젅 泥섎━ ?꾨즺: ${product.title} (styleId: ${product.styleId})`);
          }
          }
      
          // 3. ?대떦 移댄뀒怨좊━? ?쇱튂?섎뒗 紐⑤뱺 ?곹뭹?ㅼ쓽 touched ?곹깭瑜?false濡?珥덇린??
          try {
          const updateResult = await this.productRepository.update(
              { siteUrl, customId, accountPlatform }, // ?대떦 移댄뀒怨좊━???곹뭹?ㅻ쭔 ?꾪꽣留?
              { touched: false } // touched瑜?false濡?珥덇린??
          );
      
          // 4. 珥덇린???꾨즺 濡쒓렇 異쒕젰
          console.log(`?대떦 移댄뀒怨좊━ (${siteUrl})??紐⑤뱺 ?곹뭹??touched ?곹깭媛 false濡?珥덇린?붾릺?덉뒿?덈떎.`);
          console.log('?낅뜲?댄듃??????', updateResult.affected); // ?낅뜲?댄듃??????濡쒓렇 異쒕젰
      
          } catch (error: any) {
          // 珥덇린??以??먮윭 諛쒖깮 ??濡쒓렇 異쒕젰
          console.error(`touched ?곹깭 珥덇린??以??ㅻ쪟 諛쒖깮: ${siteUrl}`, error.message);
          //logErrorToDesktop(error, `10.?ㅻ쪟 諛쒖깮`);
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
          console.log(`?봽 ?ㅻ쭏?몄뒪?좎뼱 ?곹뭹 ?낅뜲?댄듃: ${product.title}`);
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
          console.log(`?넅 ?ㅻ쭏?몄뒪?좎뼱 ?좉퇋 ?깅줉: ${product.designer} ${product.title}`);
          // imageData 媛앹껜瑜?異붽? ?뚮씪誘명꽣濡??꾨떖
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
  console.error(`??怨꾩젙 ?놁쓬: ${customId} / ${accountPlatform}`);
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
          // ???붿껌 由ъ냼??????뺤씤
          const resourceType = request.resourceType();

          if (resourceType === 'image') {
            request.abort(); // ?뵏 ?대?吏 ?붿껌留?李⑤떒
          } else {
            request.continue(); // ???섎㉧吏???뺤긽 ?듦낵
          }
        });

        await page.goto(visitUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await this.waitForCelineProductPageReady(page, visitUrl);

        let productDetails = await page.evaluate(async (currentUrl) => {
          const priceElement = document.querySelector('div.o-product__header-titles span.prices');
          const price = priceElement
            ? parseInt(priceElement.textContent.replace(/[^\d]/g, ''), 10)
            : null;

          // ?ъ씠利??뺣낫
          const oneSizeLabel = '\uC6D0\uC0AC\uC774\uC988';
          const isLikelySizedProduct = /\/(ready-to-wear|pret-a-porter|clothing|shoes|sneakers|boots|loafers|sandals|pumps|flats|belts|denim|pants|trousers|shorts|skirts|dresses|jackets|coats|tops|shirts|knitwear|sweaters|swimwear)\b/i
            .test(currentUrl || window.location.href);

          const sizeElements = document.querySelectorAll('div.m-selector.m-selector--grid.m-selector--size ul.m-selector__list li');
          let size;
          if (!sizeElements || sizeElements.length === 0) {
              if (isLikelySizedProduct) return null;
              size = oneSizeLabel;
          } else {
              const sizeList = Array.from(sizeElements)
                .filter(li => !li.querySelector('input.s-disabled'))
                .map(li => li.textContent.trim().replace(',', '.'));
              if (sizeList.length === 0) {
                  console.log("?좑툘 紐⑤뱺 ?ъ씠利덇? ?덉젅?낅땲?? ?ㅼ쓬 ?곹뭹?쇰줈 ?대룞?⑸땲??");
                  return null;
              }
              size = sizeList.join(', ');
          }

          const soldOut = !price || !size || size.length === 0; // ????以??섎굹?쇰룄 ?놁쑝硫??덉젅
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
          // ???뺤긽???뚮쭔 DB ?낅뜲?댄듃
          product.lastModifiedDate = new Date();
          product.price = productDetails.price;
          product.size = productDetails.size;
          await this.productRepository.save(product);
        }

        // ??1截뤴깵 XML ?앹꽦 諛?R2 ?낅줈??
        const xmlUrl = await this.r2Service.uploadXmlToR2Update(
          product,
          product.styleId,
          partnerKey,
          productDetails.soldOut
        );

        // ???낅줈???ㅽ뙣 ???덉쟾?섍쾶 以묐떒
        if (!xmlUrl) {
          console.error(`??XML ?낅줈???ㅽ뙣 ??${product.designer} ${product.title}`);
          return;
        }

        // ??2截뤴깵 怨좊룄紐곕줈 ?곹뭹 ?깅줉/?섏젙 API ?몄텧
        
        await this.userService.assertRequestAvailable(customId, 1);
        await this.godoMallService.registerProductWithXmlUrl(
          partnerKey,
          apiKey,
          xmlUrl,
          product,
          product.styleId
        );
        await this.userService.consumeRequest(customId, 1);

        // ??WebSocket?쇰줈 怨좊룄紐곗뿉 ?뚮┝ ?꾩넚
        this.gateway.sendProductUpdate(
  `${customId}:${accountPlatform}:${goodsNo}`,
  {
          status: 'success',
          price: product.price,
          size: product.size,
          updatedAt: new Date().toISOString(),
        });

        // ??3截뤴깵 怨좊룄紐?諛섏쁺 ??XML 諛붾줈 ??젣
        await this.godoMallService.deleteUpdateXml(xmlUrl);

        console.log('\u2705 \uC140\uB9B0\uB290 \uC0C1\uD488 \uC5C5\uB370\uC774\uD2B8 \uC644\uB8CC');
        return;

      } catch (err: any) {
        console.warn(`?슚 Celine ?낅뜲?댄듃 ?ㅽ뙣: ${err.message}`);
        if (page && !page.isClosed()) await page.close();
        if (browser) await browser.close();
      } finally {
        if (page && !page.isClosed()) await page.close();
        if (browser) await browser.close();
      }
    }
  }
}
