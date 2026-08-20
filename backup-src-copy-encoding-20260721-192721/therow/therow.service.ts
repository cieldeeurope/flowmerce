import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
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
import * as cheerio from 'cheerio';
import { wrapper } from 'axios-cookiejar-support';
import { CookieJar } from 'tough-cookie';

import { Product } from 'src/product/product.entity';
import { Mapping } from 'src/mapping/mapping.entity';
import { UpdateGateway } from 'src/update/update.gateway';
import type { Browser, Page } from 'puppeteer';
import puppeteer from 'puppeteer-extra';
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



// function loadProxies2(): string[] {
//     const filePath = '\\\\CHANMIN\\Desktop\\CleanIP(?좊즺?꾨줉??.txt';
//     const fileContent = fs.readFileSync(filePath, 'utf-8');
//     return fileContent.split('\n').map(line => line.trim()).filter(line => line.length > 0);
//   }

// function getRandomProxy(proxies: string[]): string {
//   const randomIndex = Math.floor(Math.random() * proxies.length);
//   return proxies[randomIndex];
// }

// ?먮윭 濡쒓렇 ???寃쎈줈 (lv ?대뜑 ??
// const errorLogDir = path.join(
//   '\\\\CHANMIN\\Desktop\\?щ·留?\?먮윭濡쒓렇',
//   'therow'
// );

// // ?대뜑 ?놁쑝硫??앹꽦
// if (!fs.existsSync(errorLogDir)) {
//   fs.mkdirSync(errorLogDir, { recursive: true });
// }

// // 理쒖쥌 濡쒓렇 ?뚯씪 寃쎈줈
// const errorLogPath = path.join(errorLogDir, 'therow_error_log.txt');

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
export class TherowService {
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

  private normalizeTherowMarketUrl(value: string): string {
    try {
      const url = new URL(value, 'https://www.therow.com');
      url.hostname = 'www.therow.com';
      url.hash = '';

      if (/^\/(collections|products)(?=\/|$)/i.test(url.pathname)) {
        url.pathname = `/ko-nl${url.pathname}`;
      } else if (/^\/[a-z]{2}(?:-[a-z]{2})?(?=\/|$)/i.test(url.pathname)) {
        url.pathname = url.pathname.replace(/^\/[a-z]{2}(?:-[a-z]{2})?(?=\/|$)/i, '/ko-nl');
      } else if (url.pathname === '/') {
        url.pathname = '/ko-nl';
      }

      return url.href;
    } catch {
      return value;
    }
  }

  private withTherowOc(value: string): string {
    try {
      const url = new URL(this.normalizeTherowMarketUrl(value), 'https://www.therow.com');
      url.searchParams.set('oc', 'NL');
      return url.href;
    } catch {
      return value;
    }
  }

  private getTherowCollectionProductsJsonUrl(siteUrl: string, pageIndex: number): string {
    const url = new URL(this.normalizeTherowMarketUrl(siteUrl), 'https://www.therow.com');
    url.pathname = `${url.pathname.replace(/\/+$/, '')}/products.json`;
    url.search = '';
    url.searchParams.set('limit', '250');
    url.searchParams.set('page', String(pageIndex));
    url.searchParams.set('oc', 'NL');
    return url.href;
  }

  private parseTherowProductsJson(payload: any): any[] {
    try {
      const parsed = typeof payload === 'string' ? JSON.parse(payload) : payload;
      return Array.isArray(parsed?.products) ? parsed.products : [];
    } catch {
      return [];
    }
  }


// 1. 移댄뀒怨좊━ 媛?몄삤湲?(?꾨줉??援먯껜 諛??ъ떆??濡쒖쭅 異붽?)
// async getCategories(siteUrls: string[]): Promise<{ categoryName: string; url: string }[]> {
//     const allCategories: { categoryName: string; url: string }[] = [];
//     const proxyLines = await this.r2Service.loadBrightProxies2();
//     if (!proxyLines.length) {
//         console.warn('?꾨줉???놁쓬, 醫낅즺');
//         return;
//     }

//     // ?쒕뜡?쇰줈 1媛??좏깮
//     const raw = proxyLines[Math.floor(Math.random() * proxyLines.length)];
//     const proxy = parseAuthProxy(raw);
//     const proxyArg = `--proxy-server=http://${proxy.host}:${proxy.port}`;
  
//     async function processSiteUrls(urls: string[]): Promise<void> {
//       for (const siteUrl of urls) {
//         let retryCount = 0;
//         let success = false;
  
//         while (retryCount < 3 && !success) {
//           console.log(`?뙇 [${siteUrl}]`);
  
//           const browser = await puppeteer.launch({
//             headless: false,
//             args: [
//               proxyArg,
//               '--remote-debugging-port=0',
//               '--no-sandbox',
//               '--disable-setuid-sandbox',
//               '--disable-dev-shm-usage',
//               '--disable-background-timer-throttling',
//               '--disable-backgrounding-occluded-windows',
//               '--disable-renderer-backgrounding',
//               '--disable-session-crashed-bubble',
//               '--no-first-run',
//               '--disable-accelerated-2d-canvas',
//               '--noerrdialogs',
//             ],
//           });
  
//           const page = await browser.newPage();
//           await page.authenticate({
//             username: proxy.username,
//             password: proxy.password,
//           });
//           await page.setUserAgent(
//             'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36'
//           );

//           await page.setViewport({ width: 1920, height: 1080 });
  
//           try {
//             await page.goto(siteUrl, { waitUntil: 'networkidle2', timeout: 30000 });
//             console.log(`?뵇 ${siteUrl} 吏꾪뻾 以?..`);
//             await new Promise((resolve) => setTimeout(resolve, 2000));
//             // ?꾩옱 URL 泥댄겕
//             const currentUrl = page.url();
//             if (currentUrl.includes('ko-kr')) {
//                 const correctedUrl = currentUrl.replace('ko-kr', 'ko-nl');
//                 console.log(`?봽 由щ뵒?됱뀡 媛먯??? ${correctedUrl} 濡??ъ씠?숉빀?덈떎.`);
//                 await page.goto(correctedUrl, { waitUntil: 'networkidle2', timeout: 30000 });
//                 await new Promise((resolve) => setTimeout(resolve, 2000));
//             }
  
//             const therowCategories: { categoryName: string; url: string }[] = await page.evaluate(() => {
//             const items: { categoryName: string; url: string }[] = [];

//             const firstLevelItems = document.querySelectorAll('li.HorizontalList__Item.header-menu');

//             firstLevelItems.forEach(firstLevelLi => {
//               const mainLink = firstLevelLi.querySelector('a.Heading.u-h6');
//               if (!mainLink) return;

//               const mainCategory = mainLink.textContent.trim();
//               if (!['women', 'men'].includes(mainCategory.toLowerCase())) return;

//               const dropdownMenu = firstLevelLi.querySelector('.DropdownMenu');
//               if (!dropdownMenu) return;

//               const secondLevelItems = dropdownMenu.querySelectorAll('li.Linklist__Item[aria-haspopup="true"]');

//               secondLevelItems.forEach(secondLevelLi => {
//                 const categoryTypeLink = secondLevelLi.querySelector('a.Link.Link--secondary');
//                 const categoryType = categoryTypeLink ? categoryTypeLink.textContent.trim() : 'unknown';

//                 const subDropdownMenu = secondLevelLi.querySelector('.DropdownMenu');
//                 if (!subDropdownMenu) return;

//                 const subItems = subDropdownMenu.querySelectorAll('a.Link.Link--secondary');
//                 subItems.forEach(subLinkElement => {
//                   const subLink = subLinkElement as HTMLAnchorElement;  // ???罹먯뒪??
//                   const subCategory = subLink.textContent.trim();
//                   const href = subLink.href;

//                   if (subCategory.includes('紐⑤몢 蹂닿린') || subCategory.includes('View All')) return;  // ?꾩껜 蹂닿린 ?꾪꽣留?

//                   items.push({
//                     categoryName: `${mainCategory} - ${categoryType} - ${subCategory}`,
//                     url: href
//                   });
//                 });
//               });
//             });
  
//               return items;
//             });
  
//             allCategories.push(...therowCategories);
//             console.log(`???섏쭛 ?꾨즺: ${therowCategories.length}媛?);
//             success = true;
  
//           } catch (error: any) {
//             console.error(`??[${siteUrl}] ?ㅻ쪟 諛쒖깮: ${error.message}`);
//             retryCount++;
//             console.warn(`Therow category fetch skipped: ${siteUrl}`);
//           } finally {
//             await browser.close();
//           }
//         }
  
//         if (!success) {
//           console.warn(`Therow category fetch skipped: ${siteUrl}`);
//         }
  
//         console.log(`?봽 ?ㅼ쓬 URL濡??대룞...`);
//       }
//     }
  
//     await processSiteUrls(siteUrls);
//     console.log(`?렞 紐⑤뱺 ?ъ씠?몄뿉??移댄뀒怨좊━ ?섏쭛 ?꾨즺!`);
//     return allCategories;
//   }
  
async getCategories(siteUrls: string[]): Promise<{ categoryName: string; url: string }[]> {

  const allCategories: { categoryName: string; url: string }[] = [];

  const jar = new CookieJar();

  await jar.setCookie('country=NL', 'https://www.therow.com');
  await jar.setCookie('locale=ko-NL', 'https://www.therow.com');
  await jar.setCookie('language=ko', 'https://www.therow.com');
  await jar.setCookie('currency=EUR', 'https://www.therow.com');

  const forceTherowLocale = (value: string) => {
    try {
      const url = new URL(value, 'https://www.therow.com');
      url.hostname = 'www.therow.com';
      url.hash = '';

      if (/^\/collections(?=\/|$)/i.test(url.pathname)) {
        url.pathname = `/ko-nl${url.pathname}`;
      } else if (/^\/[a-z]{2}-[a-z]{2}(?=\/|$)/i.test(url.pathname)) {
        url.pathname = url.pathname.replace(/^\/[a-z]{2}-[a-z]{2}(?=\/|$)/i, '/ko-nl');
      } else if (url.pathname === '/') {
        url.pathname = '/ko-nl';
      }

      return url.href;
    } catch {
      return value;
    }
  };

  const client = wrapper(
    axios.create({
      jar,
      withCredentials: true,
      timeout: 30000,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/145.0.0.0 Safari/537.36',
        'Accept-Language': 'ko-NL,ko;q=0.9,en-NL;q=0.8,en;q=0.7',
      },
      validateStatus: () => true,
    }),
  );

  const requestTherowCategoryPage = async (rawUrl: string) => {
    let nextUrl = forceTherowLocale(rawUrl);
    const visitedUrls = new Set<string>();

    for (let redirectCount = 0; redirectCount < 6; redirectCount++) {
      if (visitedUrls.has(nextUrl)) {
        throw new Error(`The Row locale redirect loop: ${nextUrl}`);
      }
      visitedUrls.add(nextUrl);

      const response = await client.get(nextUrl, {
        maxRedirects: 0,
        headers: {
          Referer: 'https://www.therow.com/ko-nl',
        },
        validateStatus: () => true,
      });

      if (response.status >= 300 && response.status < 400 && response.headers?.location) {
        const redirectedUrl = new URL(response.headers.location, nextUrl).href;
        nextUrl = forceTherowLocale(redirectedUrl);
        continue;
      }

      const responseUrl =
        response.request?.res?.responseUrl ||
        response.config?.url ||
        nextUrl;
      const forcedResponseUrl = forceTherowLocale(responseUrl);

      if (forcedResponseUrl !== responseUrl && !visitedUrls.has(forcedResponseUrl)) {
        nextUrl = forcedResponseUrl;
        continue;
      }

      return response;
    }

    throw new Error(`The Row locale redirect failed: ${rawUrl}`);
  };

  for (const siteUrl of siteUrls) {

    let retryCount = 0;
    let success = false;

    while (retryCount < 3 && !success) {

      try {

        const res = await requestTherowCategoryPage(siteUrl);

        if (res.status !== 200) throw new Error(`HTTP ${res.status}`);

        const $ = cheerio.load(res.data);

        const items: { categoryName: string; url: string }[] = [];
        const seenUrls = new Set<string>();
        const normalizeName = (value: any) =>
          String(value || '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
        const isViewAll = (value: string) => /^view all$/i.test(normalizeName(value));
        const pushCategory = (categoryName: string, href: any) => {
          const rawHref = normalizeName(href).replace(/&amp;/g, '&');
          if (!rawHref || !rawHref.includes('/collections/')) return;

          let url = '';
          try {
            const parsedUrl = new URL(rawHref, 'https://www.therow.com');
            parsedUrl.hash = '';
            parsedUrl.search = '';
            url = forceTherowLocale(`https://www.therow.com${parsedUrl.pathname}`);
          } catch {
            return;
          }

          const cleanCategoryName = normalizeName(categoryName);
          if (!cleanCategoryName || seenUrls.has(url)) return;

          seenUrls.add(url);
          items.push({ categoryName: cleanCategoryName, url });
        };

        // =========================
        // ?뵦 1depth (?ъ꽦/?⑥꽦)
        // =========================
        $('li.HorizontalList__Item.header-menu').each((_, el) => {

          const mainCategory = normalizeName($(el).children('a.Heading.u-h6').first().text());

          if (!['women', 'men'].includes(mainCategory.toLowerCase())) return;

          const dropdown = $(el).find('.DropdownMenu').first();

          // =========================
          // ?뵦 2depth
          // =========================
          dropdown.find('> ul > li').each((_, li) => {

            const link = $(li).children('a.Link--secondary').first();
            const name = normalizeName(link.clone().find('svg').remove().end().text());
            const href = link.attr('href');

            if (name && href && !isViewAll(name)) {
              pushCategory(`${mainCategory} - ${name}`, href);
            }

            // =========================
            // ?뵦 3depth
            // =========================
            const subDropdown = $(li).find('.DropdownMenu');

            subDropdown.find('a.Link--secondary').each((_, sub) => {

              const subName = normalizeName($(sub).clone().find('svg').remove().end().text());
              const subHref = $(sub).attr('href');

              if (!subName || !subHref) return;
              pushCategory(isViewAll(subName) ? `${mainCategory} - ${name}` : `${mainCategory} - ${name} - ${subName}`, subHref);

            });

          });

        });

        allCategories.push(...items);

        console.log(`Therow categories collected: ${items.length}`);

        success = true;

      } catch (err: any) {
        console.error(`Therow category fetch failed (${retryCount + 1}/3): ${err.message}`);
        retryCount++;
      }
    }

    if (!success) {
      console.warn(`Therow category fetch skipped: ${siteUrl}`);
    }
  }

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
      timeout: 30000, // ??꾩븘???ㅼ젙
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36"
      }
    });
    let imageBuffer = Buffer.from(response.data, 'binary'); // ?대?吏 ?곗씠?곕? 踰꾪띁濡?蹂??

    // Sharp瑜??ъ슜?댁꽌 ?대?吏 硫뷀??곗씠???뺤씤 (?뺤떇 ?먮퀎)
    const metadata = await sharp(imageBuffer).metadata();
    if (metadata.format === 'webp' || metadata.format === 'avif') {
      // JPEG濡?蹂??
      imageBuffer = await sharp(imageBuffer)
        .jpeg() // png()瑜??ъ슜?섎㈃ PNG濡?蹂??媛??
        .toBuffer();
      // ?뚯씪 ?대쫫 ?뺤옣?먮? .jpg濡?蹂寃?(.webp ?먮뒗 .avif 瑜?.jpg濡?
      fileName = fileName.replace(/\.(webp|avif)$/i, '.jpg');
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

  // Therow ?ъ씠???щ·留??쒖옉
//   async getProductsFromCategory(siteUrl: string, partnerKey: string,apiKey: string, customId:string, accountPlatform:string, godoMallCategoryCode: string): Promise<void> {
//     const serviceType = 'Therow';
//     const proxyLines = await this.r2Service.loadBrightProxies2();
//     if (!proxyLines.length) {
//         console.warn('?꾨줉???놁쓬, 醫낅즺');
//         return;
//     }

//     // ?쒕뜡?쇰줈 1媛??좏깮
//     const raw = proxyLines[Math.floor(Math.random() * proxyLines.length)];
//     const proxy = parseAuthProxy(raw);
//     const proxyArg = `--proxy-server=http://${proxy.host}:${proxy.port}`;
//     let browser: Browser | null = null;
//     let page: Page | null = null;
//     let productUrls: string[] = [];

//     const category = await this.mappingRepository.findOne({
//       where: { customId: customId, accountPlatform: accountPlatform, siteUrl: siteUrl },
//   });

//   try {
//   browser = await puppeteer.launch({
//     headless: false,
//     args: [
//         proxyArg,
//         '--disable-blink-features',
//         '--disable-blink-features=AutomationControlled',
//         '--disable-infobars',
//         '--no-default-browser-check',
//         '--no-first-run',
//         '--log-level=0',
//         '--disable-dev-shm-usage',
//         '--no-sandbox',
//         '--disable-setuid-sandbox',
//         '--remote-debugging-port=0',
//         '--disable-background-timer-throttling',
//         '--disable-backgrounding-occluded-windows',
//         '--disable-renderer-backgrounding',
//         '--disable-session-crashed-bubble',
//         '--disable-accelerated-2d-canvas',
//         '--noerrdialogs',
//     ],
// });

//     page = await browser.newPage();
//     await page.authenticate({
//       username: proxy.username,
//       password: proxy.password,
//     });

//     await page.setUserAgent(
//         'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36'
//       );
//     await page.setViewport({ width: 1920, height: 1080 });

//     const MAX_RETRY = 5; // 理쒕? ?ъ떆???잛닔
//     let retryAttempts = 0;
//     let index = 1;
//     let collectedProductUrls: string[] = [];
    

//     while (true) {
//         try {
//           try{
//           const pagedUrl = `${siteUrl}?page=${index}`;
//           await page.goto(pagedUrl, { waitUntil: 'networkidle2', timeout: 30000 });
//           await new Promise((resolve) => setTimeout(resolve, 3000));
//           // ?꾩옱 URL 泥댄겕
//           const currentUrl = page.url();
//           if (currentUrl.includes('ko-kr') || currentUrl.includes('fr-fr')) {
//               const correctedUrl = currentUrl
//               .replace('ko-kr', 'ko-nl')
//               .replace('fr-fr', 'ko-nl');
//               console.log(`?봽 由щ뵒?됱뀡 媛먯??? ${correctedUrl} 濡??ъ씠?숉빀?덈떎.`);
//               await page.goto(correctedUrl, { waitUntil: 'networkidle2', timeout: 30000 });
//               await new Promise((resolve) => setTimeout(resolve, 2000));
//           }
//           } catch (error: any) {
//             //logErrorToDesktop(error, `2.?ㅻ쪟 諛쒖깮`);
//             // 湲곗〈 釉뚮씪?곗?? ?섏씠吏 ?リ린
//             if (page && !page.isClosed()) {
//                 await page.close();
//             }
//             if (browser) {
//                 await browser.close();
//             }
//             retryAttempts++;
//             if (retryAttempts >= 30) {
//                 throw new Error("30???ъ떆??珥덇낵 - ?щ·留?醫낅즺");
//             }
//             // ?덈줈??釉뚮씪?곗?? ?섏씠吏 ?앹꽦
//             browser = await puppeteer.launch({
//                 headless: false,
//                 args: [
//                     proxyArg,
//                     '--remote-debugging-port=0',
//                     '--no-sandbox',
//                     '--disable-setuid-sandbox',
//                     '--disable-dev-shm-usage',
//                     '--disable-background-timer-throttling',
//                     '--disable-backgrounding-occluded-windows',
//                     '--disable-renderer-backgrounding',
//                     '--disable-session-crashed-bubble',
//                     '--no-first-run',
//                     '--disable-accelerated-2d-canvas',
//                     '--noerrdialogs',
//                 ],
//             });
//             page = await browser.newPage();
//             await page.authenticate({
//               username: proxy.username,
//               password: proxy.password,
//             });
//             await page.setUserAgent(
//               'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36'
//             );
//             await page.setViewport({ width: 1920, height: 1080 });
//             continue;
//           }
//           // ?꾩옱 ?섏씠吏?먯꽌 ?곹뭹 URL 諛?李⑤떒 ?щ? ?됯?
//           const { currentPageProductUrls, isBlocked } = await page.evaluate(() => {
//             const productUrls = Array.from(
//                 new Set(
//                     Array.from(document.querySelectorAll('.ProductItem__Wrapper'))
//                         .filter(wrapper => {
//                             const soldOutLabel = wrapper.querySelector('.ProductItem__Label--soldOut');
//                             return !soldOutLabel;
//                         })
//                         .map(wrapper => {
//                             const link = wrapper.querySelector('a[href]');
//                             return link ? (link as HTMLAnchorElement).href : null;
//                         })
//                         .filter(Boolean)
//                 )
//             );

//             const bodyText = document.querySelector('body')?.textContent || '';
//             const isBlocked =
//                 document.querySelector('body') === null &&
//                 (bodyText.includes('Access Denied') ||
//                     bodyText.includes('Too Many Requests') ||
//                     bodyText.includes('429') ||
//                     bodyText.includes('Enforced timeout') ||
//                     bodyText.includes('net::ERR_TIMED_OUT'));

//             return { currentPageProductUrls: productUrls, isBlocked };
//         });


//         if (isBlocked) {
//             console.warn("?섏씠吏媛 李⑤떒?섏뿀?듬땲?? ?꾨줉?쒕? 蹂寃쏀븯???ㅼ떆 ?쒕룄?⑸땲??");
//              // ?덈줈???꾨줉???ㅼ젙
//             // 湲곗〈 釉뚮씪?곗?? ?섏씠吏 ?リ린
//             if (page && !page.isClosed()) {
//                 await page.close();
//             }
//             if (browser) {
//                 await browser.close();
//             }
//             retryAttempts++;
//             if (retryAttempts >= 30) {
//                 throw new Error("30???ъ떆??珥덇낵 - ?щ·留?醫낅즺");
//             }
//             // ?덈줈??釉뚮씪?곗?? ?섏씠吏 ?앹꽦
//             browser = await puppeteer.launch({
//                 headless: false,
//                 args: [
//                     proxyArg,
//                     '--remote-debugging-port=0',
//                     '--no-sandbox',
//                     '--disable-setuid-sandbox',
//                     '--disable-dev-shm-usage',
//                     '--disable-background-timer-throttling',
//                     '--disable-backgrounding-occluded-windows',
//                     '--disable-renderer-backgrounding',
//                     '--disable-session-crashed-bubble',
//                     '--no-first-run',
//                     '--disable-accelerated-2d-canvas',
//                     '--noerrdialogs',
//                 ],
//             });
//             page = await browser.newPage();
//             await page.authenticate({
//               username: proxy.username,
//               password: proxy.password,
//             });
//             await page.setUserAgent(
//               'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36'
//             );
//             await page.setViewport({ width: 1920, height: 1080 });
//             continue;
//         }


//         if (currentPageProductUrls.length === 0) {
//           console.log(`???섏씠吏 ${index}?먯꽌 ???댁긽 ?곹뭹???놁뒿?덈떎. ?섏쭛 醫낅즺`);
//           productUrls = collectedProductUrls;
//           break;
//         }

//         console.log(`?벀 ?섏씠吏 ${index}?먯꽌 ${currentPageProductUrls.length}媛??곹뭹 ?섏쭛??);

//         // 以묐났 ?쒓굅?섎ŉ ?꾩쟻 ?섏쭛
//         collectedProductUrls = Array.from(new Set([...collectedProductUrls, ...currentPageProductUrls]));
        

//         index++; // ?ㅼ쓬 ?섏씠吏濡??대룞


//       } catch (error: any) {
//         console.error(`?먮윭 諛쒖깮: ${error.message}`);
//         //logErrorToDesktop(error, `3.?ㅻ쪟 諛쒖깮`);
//         if (error.message.includes('Enforced timeout') ||
//             error.message.includes('Navigation timeout') || 
//             error.message.includes('net::ERR_TIMED_OUT')) { 
//             console.error("Enforced timeout,Navigation timeout,ERR_TIMED_OUT 臾몄젣媛 諛쒖깮?덉뒿?덈떎. 釉뚮씪?곗?瑜??ъ떆?묓빀?덈떎.");
//             if (browser) {
//                 try {
//                     // 湲곗〈 釉뚮씪?곗?? ?섏씠吏 ?リ린
//                     if (page && !page.isClosed()) {
//                         await page.close();
//                     }
//                     if (browser) {
//                         await browser.close();
//                     }
//                     // ?덈줈??釉뚮씪?곗?? ?섏씠吏 ?앹꽦
//                     browser = await puppeteer.launch({
//                         headless: false,
//                         args: [
//                             proxyArg,
//                             '--remote-debugging-port=0',
//                             '--no-sandbox',
//                             '--disable-setuid-sandbox',
//                             '--disable-dev-shm-usage',
//                             '--disable-background-timer-throttling',
//                             '--disable-backgrounding-occluded-windows',
//                             '--disable-renderer-backgrounding',
//                             '--disable-session-crashed-bubble',
//                             '--no-first-run',
//                             '--disable-accelerated-2d-canvas',
//                             '--noerrdialogs',
//                         ],
//                     });
//                     page = await browser.newPage();
//                     await page.authenticate({
//                       username: proxy.username,
//                       password: proxy.password,
//                     });
//                     await page.setUserAgent(
//                       'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36'
//                     );
//                     await page.setViewport({ width: 1920, height: 1080 });
//                 } catch (closeError: any) {
//                     console.warn("釉뚮씪?곗? 醫낅즺 以?異붽? ?ㅻ쪟:", closeError.message);
//                 }
//             }
//              // ?덈줈???꾨줉???ㅼ젙
//             retryAttempts++;
//             if (retryAttempts >= 30) {
//                 throw new Error("30???ъ떆??珥덇낵 - ?щ·留?醫낅즺");
//             }
//             continue; // 猷⑦봽瑜??ㅼ떆 ?쒖옉
//         } else {
//             throw error; // ?덉긽移?紐삵븳 ?먮윭???곸쐞濡??꾨떖
//         }
//       }
//     }
//   }
//     finally {

//     }

//     if (productUrls.length === 0) {
//       throw new Error('?곹뭹 URL???섏쭛?섏? 紐삵뻽?듬땲?? 紐⑤뱺 ?쒕룄媛 ?ㅽ뙣?덉뒿?덈떎.');
//     }
//     console.log(`?붾줈??理쒖쥌 ?섏쭛???곹뭹 URL ?? ${productUrls.length} - ${category?.categoryName || '移댄뀒怨좊━ ?놁쓬'}`);

//     // // ?덈줈??釉뚮씪?곗?? ?섏씠吏 ?앹꽦
//     // browser = await puppeteer.launch({
//     //     headless: false,
//     //     args: [
//     //         proxyArg,
//     //         '--remote-debugging-port=0',
//     //         '--no-sandbox',
//     //         '--disable-setuid-sandbox',
//     //         '--disable-dev-shm-usage',
//     //         '--disable-background-timer-throttling',
//     //         '--disable-backgrounding-occluded-windows',
//     //         '--disable-renderer-backgrounding',
//     //         '--disable-session-crashed-bubble',
//     //         '--no-first-run',
//     //         '--disable-accelerated-2d-canvas',
//     //         '--noerrdialogs',
//     //     ],
//     // });
//     // page = await browser.newPage();
//     // await page.setUserAgent(
//     //   'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36'
//     // );
    
//     // await page.setViewport({ width: 1920, height: 1080 });
//     for (const [index, productUrl] of productUrls.entries()) {
//       let loadAttempts = 0;
//       let success = false;

//       while (loadAttempts < 10) {
//         try {
//             await page.goto(productUrl, { waitUntil: 'networkidle2', timeout: 30000 });
//             console.log(`??(${index + 1}/${productUrls.length}) ?붾줈??${category?.categoryName || '移댄뀒怨좊━ ?놁쓬'}  ?섏쭛 以?);
//             await new Promise((resolve) => setTimeout(resolve, 2000));
//             // ?꾩옱 URL 泥댄겕
//             const currentUrl = page.url();
//             if (currentUrl.includes('ko-kr') || currentUrl.includes('fr-fr')) {
//                 const correctedUrl = currentUrl
//                   .replace('ko-kr', 'ko-nl')
//                   .replace('fr-fr', 'ko-nl');
//                 console.log(`?봽 由щ뵒?됱뀡 媛먯??? ${correctedUrl} 濡??ъ씠?숉빀?덈떎.`);
//                 await page.goto(correctedUrl, { waitUntil: 'networkidle2', timeout: 30000 });
//                 await new Promise((resolve) => setTimeout(resolve, 2000));
//             }
//             success = true;
//             break; // 濡쒕뵫 ?깃났 ??猷⑦봽 醫낅즺
//           } catch (error: any) {
//               loadAttempts++;
//               console.warn(`?섏씠吏 濡쒕뱶 ?ㅽ뙣 (?꾨줉??蹂寃?${loadAttempts}/10): ${error.message}`);
//               //logErrorToDesktop(error, `4.?ㅻ쪟 諛쒖깮`);
//               if (loadAttempts < 10) {
                  
//                   console.log(`?덈줈???꾨줉?쒕줈 蹂寃? ${proxy}`);
//                   if (page && !page.isClosed()) {
//                       await page.close();
//                   }
//                   if (browser) {
//                       await browser.close();
//                   }
//                   browser = await puppeteer.launch({
//                       headless: false,
//                       args: [
//                           proxyArg,
//                           '--remote-debugging-port=0',
//                           '--no-sandbox',
//                           '--disable-setuid-sandbox',
//                           '--disable-dev-shm-usage',
//                           '--disable-background-timer-throttling',
//                           '--disable-backgrounding-occluded-windows',
//                           '--disable-renderer-backgrounding',
//                           '--disable-session-crashed-bubble',
//                           '--no-first-run',
//                           '--disable-accelerated-2d-canvas',
//                           '--noerrdialogs',
//                       ],
//                   });
//                   page = await browser.newPage();
//                   await page.authenticate({
//                     username: proxy.username,
//                     password: proxy.password,
//                   });
//                   await page.setUserAgent(
//                     'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36'
//                   );
//                   await page.setViewport({ width: 1920, height: 1080 });
//                 continue;
//               } else {
//                   console.error('理쒕? 濡쒕뱶 ?쒕룄 珥덇낵 - ?ㅼ쓬 URL濡??대룞?⑸땲??');
//                   //logErrorToDesktop(error, `5.?ㅻ쪟 諛쒖깮`);
//                   break;
//               }
//           }
//       }


      
//       const hasSoldOut = await page.evaluate(() => {
//         const waitlistButton = Array.from(document.querySelectorAll('button.ProductForm__AddToCart'))
//             .find(btn => btn.textContent?.trim() === 'Join The Waitlist');
//         return waitlistButton !== undefined;
//       });

//       if (hasSoldOut) {
//         console.log('??Join The Waitlist ?곹뭹 ???ㅼ쓬 ?곹뭹?쇰줈 ?대룞?⑸땲??');
//         continue;  // ?ш퀬 ?녿뒗 ?곹뭹? skip
//       }



//       const productDetails = await page.evaluate(async () => {
//         const site = 'Therow';
//         const designer = '?붾줈??;
//         const titleElement = document.querySelector('h1.ProductMeta__Title.Heading.u-h2');
//         const title = titleElement ? titleElement.textContent?.trim() || '' : '';
//         const priceElement = document.querySelector('.ProductMeta__PriceList.Heading .ProductMeta__Price');
//         let finalPrice = 0;

//         if (priceElement) {
//             let rawPrice = priceElement.textContent?.trim() || '';
//             rawPrice = rawPrice.replace(/[^\d,]/g, '');  // ?レ옄? ?쇳몴留??④?
//             rawPrice = rawPrice.replace('.', '');        // . ?쒓굅 (751000)
//             rawPrice = rawPrice.replace(',', '.');       // ,瑜?.?쇰줈 蹂??(7510.00)
//             finalPrice = Math.floor(parseFloat(rawPrice));
//         }
//         const color = document.querySelector('span.product-form__selected-value')?.textContent?.trim() || '';
        
//         const imageElements = document.querySelectorAll<HTMLImageElement>('.Product__SlideItem--image img');

//         const urlSet = new Set<string>();

//         const imageUrls = Array.from(imageElements).map(img => {
//             let url = img.getAttribute('src') || '';
//             if (!url) return '';

//             // // 濡??쒖옉?섎㈃ https:// 遺숈씠湲?
//             if (url.startsWith('//')) {
//                 url = 'https:' + url;
//             }

//             // 以묐났 ?쒓굅
//             if (!urlSet.has(url)) {
//                 urlSet.add(url);
//                 return url;
//             }

//             return '';
//         }).filter(url => url !== '');


//         let size: string | null = null;

//         // 1. '?ъ씠利??좏깮' 踰꾪듉 以??붾㈃??蹂댁씠??寃껊쭔 李얘린
//         const sizeSelectButton = Array.from(document.querySelectorAll('button.ProductForm__Item'))
//             .find(btn => {
//                 const selectedValue = btn.querySelector('.ProductForm__SelectedValue');
//                 const isVisible = (btn as HTMLElement).offsetParent !== null; // display:none 臾댁떆 (蹂댁씠??踰꾪듉留?
//                 return isVisible && selectedValue && selectedValue.textContent?.includes('?ъ씠利??좏깮');
//             });

//         if (!sizeSelectButton) {
//             // ?ъ씠利??좏깮 踰꾪듉???꾩삁 ?녿뒗 寃쎌슦 (媛諛?吏媛?or ?좎＜臾?
//             const addToCartButton = document.querySelector('button.ProductForm__AddToCart');
//             if (addToCartButton && addToCartButton.textContent?.includes('?좎＜臾?)) {
//                 size = '?좎＜臾?;
//             } else {
//                 size = '?먯궗?댁쫰';
//             }
//         } else {
//             // Popover ID瑜??듯빐 ?ъ씠利?紐⑸줉 李얘린
//             const popoverId = sizeSelectButton.getAttribute('aria-controls');
//             const popover = popoverId ? document.getElementById(popoverId) : null;

//             if (popover) {
//                 const sizeButtons = popover.querySelectorAll('button[data-action="select-value"]');
//                 const availableSizes = Array.from(sizeButtons)
//                     .filter(btn => !btn.classList.contains('unavailable-button'))  // ?덉젅 ?꾨땶 寃껊쭔
//                     .map(btn => btn.textContent?.trim() || '')
//                     .filter(value => value.length > 0);

//                 if (availableSizes.length === 0) {
//                     console.log('??紐⑤뱺 ?ъ씠利??덉젅, ?ㅼ쓬 ?곹뭹?쇰줈 ?섏뼱媛묐땲??');
//                     size = null;
//                 } else {
//                     size = availableSizes.join(', ');
//                 }
//             } else {
//                 size = '?먯궗?댁쫰';
//             }
//         }
        
//         let mainInfo = '';

//         const descriptionElement = document.querySelector('.ProductMeta__Description .Rte');
//         if (descriptionElement) {
//             mainInfo += descriptionElement.textContent.trim() + '\n';
//         }

//         const additionalInfoItems = document.querySelectorAll('.product-more__content li');
//         const additionalInfoLines: string[] = [];
//         let madeIn = '';
//         let styleId = '';

//         additionalInfoItems.forEach(li => {
//             const text = li.textContent.trim();
//             additionalInfoLines.push(text);

//             if (text.startsWith('Made in')) {
//                 madeIn = text.replace('Made in', '').trim();
//             } else if (text.startsWith('?쒖“援?')) {
//                 madeIn = text.replace('?쒖“援?', '').trim();
//             }

//             if (text.startsWith('Style:')) {
//                 styleId = text.replace('Style:', '').trim();
//             } else if (text.startsWith('?ㅽ???')) {
//                 styleId = text.replace('?ㅽ???', '').trim();
//             }
//         });

//         if (additionalInfoLines.length > 0) {
//             mainInfo += additionalInfoLines.join('\n');
//         }

//         const brandstyleId = styleId;


//         return { site, designer, title, price: finalPrice, color, mainInfo, madeIn, styleId, size, brandstyleId, imageUrls };
//       });


//       if (!productDetails || !productDetails.mainInfo || !productDetails.styleId || !productDetails.title || !productDetails.price || !productDetails.imageUrls.length || !productDetails.size || !productDetails.brandstyleId) {
//         console.warn('?붾줈???곗씠???꾨씫 - ?ㅼ쓬 productUrl濡??대룞');
//         continue; // ?ㅼ쓬 productUrl濡??대룞
//         }

//       // ?대?吏媛 ?녿뒗 寃쎌슦 ?곹뭹??嫄대꼫?
//       if (!productDetails || productDetails.imageUrls.length === 0) {
//         if (loadAttempts < 2) {
//             loadAttempts++;
//             console.log('?대?吏媛 ?녿뒗 ?곹뭹?낅땲?? ?꾨줉??蹂寃????ㅼ떆 ?쒕룄?⑸땲??');
            
//             // ?꾨줉??蹂寃?
            
//             console.log(`?덈줈???꾨줉?쒕줈 蹂寃? ${proxy}`);
            
//             // 湲곗〈 釉뚮씪?곗?? ?섏씠吏 ?リ린
//             if (page && !page.isClosed()) {
//                 await page.close();
//             }
//             if (browser) {
//                 await browser.close();
//             }
        
//             // ?덈줈??釉뚮씪?곗?? ?섏씠吏 ?앹꽦
//             browser = await puppeteer.launch({
//                 headless: false,
//                 args: [
//                     proxyArg,
//                     '--remote-debugging-port=0',
//                     '--no-sandbox',
//                     '--disable-setuid-sandbox',
//                     '--disable-dev-shm-usage',
//                     '--disable-background-timer-throttling',
//                     '--disable-backgrounding-occluded-windows',
//                     '--disable-renderer-backgrounding',
//                     '--disable-session-crashed-bubble',
//                     '--no-first-run',
//                     '--disable-accelerated-2d-canvas',
//                     '--noerrdialogs'
//                 ]
//             });
//             page = await browser.newPage();
//             await page.authenticate({
//               username: proxy.username,
//               password: proxy.password,
//             });
//             await page.setUserAgent(
//                 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36'
//               );
//             await page.setViewport({ width: 1920, height: 1080 });
//             // ?숈씪??productUrl濡??ㅼ떆 ?묒냽
//             try {
//                 await page.goto(productUrl, { waitUntil: 'networkidle2', timeout: 30000 });
//                 // ?꾩옱 URL 泥댄겕
//                 const currentUrl = page.url();
//                 if (currentUrl.includes('ko-kr')) {
//                     const correctedUrl = currentUrl.replace('ko-kr', 'ko-nl');
//                     console.log(`?봽 由щ뵒?됱뀡 媛먯??? ${correctedUrl} 濡??ъ씠?숉빀?덈떎.`);
//                     await page.goto(correctedUrl, { waitUntil: 'networkidle2', timeout: 30000 });
//                     await new Promise((resolve) => setTimeout(resolve, 2000));
//                 }
//             } catch (error: any) {
//                 console.warn(`?꾨줉??蹂寃??꾩뿉???섏씠吏 濡쒕뱶 ?ㅽ뙣: ${error.message}`);
//                 //logErrorToDesktop(error, `6.?ㅻ쪟 諛쒖깮`);
//                 continue; // ?숈씪 URL ?ъ떆???ㅽ뙣 ???ㅼ쓬 URL濡??대룞
//             }
//             continue; // ?숈씪 productUrl濡??ъ떆???꾨즺
//         } else {
//             console.log('?대?吏媛 ?녿뒗 ?곹뭹?낅땲?? ?ㅼ쓬 productUrl濡??대룞?⑸땲??');
//             continue; // ?ㅼ쓬 productUrl濡??대룞
//         }
//         }

//       // 移댄뀒怨좊━ 留ㅽ븨 ?곗씠??李얘린
//       const categoryMapping = await this.mappingRepository.findOne({ where: { siteUrl } });
//       if (!categoryMapping) {
//           throw new Error('留ㅽ븨??移댄뀒怨좊━瑜?李얠쓣 ???놁뒿?덈떎.');
//       }

//       try {
//       const existingProduct = await this.productRepository.findOne({ where: {
//         styleId: productDetails.styleId,
//         partnerKey: partnerKey, 
//         apiKey: apiKey
//         }
//       });
      
//       if (existingProduct) {
//         // ?대? 議댁옱?섎뒗 ?곹뭹?대?濡??낅뜲?댄듃瑜??댁빞 ??
//         console.log(`?낆긽???낅뜲?댄듃: ${existingProduct.title} - styleID: ${existingProduct.styleId}`);
        
//         // ?곹뭹 ?뺣낫瑜??낅뜲?댄듃 (湲곗〈 ?곗씠?곕쿋?댁뒪 ?낅뜲?댄듃)
//         existingProduct.siteUrl = siteUrl;
//         // // existingProduct.title = productDetails.title;
//         // existingProduct.designer = productDetails.designer;
//         existingProduct.size = productDetails.size;
//         existingProduct.price = productDetails.price;
//         // existingProduct.mainInfo = productDetails.mainInfo;
//         // existingProduct.partnerKey = partnerKey;
//         // existingProduct.apiKey = apiKey;
//         // existingProduct.color = productDetails.color;
//         existingProduct.touched = true;
//         existingProduct.visitUrl = productUrl;
//         existingProduct.godoMallCategoryCode = godoMallCategoryCode;
//         existingProduct.categoryName = category.categoryName;

//         const godoMallCategoryName = category.godoMallCategoryName;



//         // ???곹뭹 移댄뀒怨좊━ 肄붾뱶 ???
//         existingProduct.godoMallCategoryCode = godoMallCategoryCode;

//         // ???뚮옯?????寃곗젙 (8?먮━硫?SMARTSTORE, 洹??몄뿏 GODOMALL)
//         if (godoMallCategoryCode.length === 8) {
//             existingProduct.platform = 'smartstore';
//         } else {
//             existingProduct.platform = 'godomall';
//         }


//             // const r2MainImageUrl = await this.uploadImageToR2(
//             // 
//             // productDetails.imageUrls[0],  // ???대?吏 URL??泥?踰덉㎏ ?몄옄濡??꾨떖
//             // `${productDetails.styleId}-main.jpg`,  // ????ν븷 ?뚯씪紐?
//             // existingProduct,
//             // partnerKey
//             // );
//             // existingProduct.mainImageUrl = r2MainImageUrl; // ??R2 URL ???
            
//             // const additionalR2Urls = [];
//             // for (let i = 1; i < productDetails.imageUrls.length; i++) {
//             //     const r2AdditionalImageUrl = await this.uploadImageToR2(
//             //         
//             //         productDetails.imageUrls[i],  // ??異붽? ?대?吏 URL
//             //         `${productDetails.styleId}-additional-${i}.jpg`,  // ????ν븷 ?뚯씪紐?
//             //         existingProduct,
//             //         partnerKey
//             //     );
//             //     additionalR2Urls.push(r2AdditionalImageUrl);
//             // }
//             // existingProduct.additionalImageUrls = additionalR2Urls; // ??異붽? ?대?吏 由ъ뒪?????
    

//             if (existingProduct.platform === 'smartstore') {
//             //     // ??R2 ?낅줈???? R2 URL??湲곕컲?쇰줈 base64ImageList? originThumbnailUrls ?앹꽦
//             //     const base64ImageList: string[] = [];
//             //     const originThumbnailUrls: string[] = [];

//             //     // ????대?吏 R2 URL???ъ슜
//             //     try {
//             //     const mainResponse = await axios.get(existingProduct.mainImageUrl, { responseType: 'arraybuffer', timeout: 10000 });
//             //     const mainBuffer = Buffer.from(mainResponse.data, 'binary');
//             //     const mainBase64 = mainBuffer.toString('base64');
//             //     base64ImageList.push(mainBase64);
//             //     originThumbnailUrls.push(existingProduct.mainImageUrl);
//             //     } catch (error: any) {
//             //     console.error('????대?吏 R2 遺덈윭?ㅺ린 ?ㅽ뙣:', existingProduct.mainImageUrl, error.message);
//             //     }

//             //     // 異붽? ?대?吏 R2 URL???ъ슜
//             //     for (const r2url of existingProduct.additionalImageUrls) {
//             //         try {
//             //             const additionalResponse = await axios.get(r2url, { responseType: 'arraybuffer', timeout: 10000 });
//             //             const additionalBuffer = Buffer.from(additionalResponse.data, 'binary');
//             //             const additionalBase64 = additionalBuffer.toString('base64');
//             //             base64ImageList.push(additionalBase64);
//             //             originThumbnailUrls.push(r2url);
//             //         } catch (error: any) {
//             //             console.error('異붽? ?대?吏 R2 遺덈윭?ㅺ린 ?ㅽ뙣:', r2url, error.message);
//             //         }
//             //     }

//                 // ???ㅻ쭏?몄뒪?좎뼱 ?섏젙
//                 const auth = {
//                     smartStoreID: partnerKey,
//                     smartStoreSecret: apiKey,
//                 };
//                 await this.smartstoreApiService.updateSmartStoreProduct(existingProduct, auth, partnerKey,undefined,godoMallCategoryName);

//             } else {
//                 // ??怨좊룄紐??깅줉
//             const xmlUrl = await this.r2Service.uploadXmlToR2SmartStore(
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

            
//         // ??DB?????
//         await this.productRepository.save(existingProduct);



//     } else {
//         // ???곹뭹?대?濡?湲곗〈 濡쒖쭅?쇰줈 ?깅줉 吏꾪뻾
//         const newProduct = this.productRepository.create(productDetails);
//         newProduct.mainImageUrl = productDetails.imageUrls[0];
//         newProduct.additionalImageUrls = productDetails.imageUrls.slice(1); // 異붽? ?대?吏?????
//         newProduct.touched = true;
//         newProduct.categoryName = categoryMapping.categoryName;
//         newProduct.customId = customId;
//         newProduct.accountPlatform = accountPlatform;
//         newProduct.siteUrl = siteUrl;
//         newProduct.color = productDetails.color;
//         newProduct.visitUrl = productUrl;
//         newProduct.godoMallCategoryCode = godoMallCategoryCode;


//         const godoMallCategoryName = category.godoMallCategoryName;



//         // ???곹뭹 移댄뀒怨좊━ 肄붾뱶 ???
//         newProduct.godoMallCategoryCode = godoMallCategoryCode;

//         // ???뚮옯?????寃곗젙
//         if (godoMallCategoryCode.length === 8) {
//             newProduct.platform = 'smartstore';
//         } else {
//             newProduct.platform = 'godomall';
//         }


//         const r2MainImageUrl = await this.uploadImageToR2(
//             
//             productDetails.imageUrls[0],  // ???대?吏 URL??泥?踰덉㎏ ?몄옄濡??꾨떖
//             `${productDetails.styleId}-main.jpg`,  // ????ν븷 ?뚯씪紐?
//             newProduct,
//             partnerKey
//         );
//         newProduct.mainImageUrl = r2MainImageUrl; // ??R2 URL ???
        
//         const additionalR2Urls = [];
//         for (let i = 1; i < productDetails.imageUrls.length; i++) {
//             const r2AdditionalImageUrl = await this.uploadImageToR2(
//                 
//                 productDetails.imageUrls[i],  // ??異붽? ?대?吏 URL
//                 `${productDetails.styleId}-additional-${i}.jpg`,  // ????ν븷 ?뚯씪紐?
//                 newProduct,
//                 partnerKey
//             );
//             additionalR2Urls.push(r2AdditionalImageUrl);
//         }
//         newProduct.additionalImageUrls = additionalR2Urls; // ??異붽? ?대?吏 由ъ뒪?????
        
//         if (newProduct.platform === 'smartstore') {

//             // ???덈줈??濡쒖쭅: ?대?吏 ?곗씠?곕? base64 諛??먮낯 URL 諛곗뿴濡??앹꽦
//             const base64ImageList: string[] = [];
//             const originThumbnailUrls: string[] = [];

//             // ??????대?吏 + 異붽? ?대?吏 R2 URL ?⑹튂湲?
//             const allR2Urls = [newProduct.mainImageUrl,...(newProduct.additionalImageUrls || [])];

//             for (const r2Url of allR2Urls) {
//                 try {
//                     const response = await axios.get(r2Url, {
//                         responseType: 'arraybuffer',
//                         timeout: 10000,
//                     });
//                     const buffer = Buffer.from(response.data, 'binary');
//                     const base64 = buffer.toString('base64');
//                     base64ImageList.push(base64);
//                     originThumbnailUrls.push(r2Url);
//                 } catch (error: any) {
//                     console.error('?대?吏 R2 遺덈윭?ㅺ린 ?ㅽ뙣:', r2Url, error.message);
//                     //logErrorToDesktop(error, `7.?ㅻ쪟 諛쒖깮`);
//                 }
//             }

//             // ???ㅻ쭏?몄뒪?좎뼱 ?깅줉
//             await this.handleSmartstoreRegistration(newProduct, partnerKey, apiKey,{ base64ImageList, originThumbnailUrls },godoMallCategoryName);

//         } else {
//             // ??怨좊룄紐??깅줉
//             const xmlUrl = await this.r2Service.uploadXmlToR2SmartStore(
//                 newProduct.styleId,
//                 newProduct,
//                 godoMallCategoryCode,
//                 newProduct.mainImageUrl,
//                 newProduct.additionalImageUrls,
//                 partnerKey,
//                 apiKey
//             );
//             await this.godoMallService.registerProductWithXmlUrl(partnerKey, apiKey, xmlUrl, newProduct, newProduct.styleId);

//         }

//         // ??DB?????
//         await this.productRepository.save(newProduct);

//         console.log(`???곹뭹 ????꾨즺: ${productDetails.designer} ${productDetails.title}`);
//         }
//     } catch (error: any) {
//                 console.error(`?곹뭹 ?깅줉 泥섎━ ?ㅽ뙣 (${productUrl}): ${error.message}`);
//                 //logErrorToDesktop(error, `8.?ㅻ쪟 諛쒖깮`);
//                 // ?먮윭 諛쒖깮 ???대떦 ?곹뭹? 嫄대꼫?곌퀬 ?ㅼ쓬 ?곹뭹?쇰줈 ?섏뼱媛묐땲??
//                 continue;
//             }
//           } 
//           if (page && !page.isClosed()) {
//           await page.close();
//           }
//           if (browser) {
//           await browser.close();
//           }
//           // ???뚮옯????낆뿉 ?곕Ⅸ ?덉젅 泥섎━
//           if (godoMallCategoryCode.length === 8) {
//               // ???ㅻ쭏?몄뒪?좎뼱 ?덉젅 泥섎━
//               const auth = {
//                 smartStoreID: partnerKey,
//                 smartStoreSecret: apiKey,
//               };

//               const siteUrls = {
//                 Therow : siteUrl,
//               }
//               await this.smartstoreApiService.deleteUnsoldSmartstoreProducts(auth,siteUrls, partnerKey, apiKey, "Therow");
//           } else {
//               // ??怨좊룄紐??덉젅 泥섎━
//               await this.handleUnsoldProducts(siteUrl, partnerKey, apiKey, customId, accountPlatform);
//               await this.godoMallService.finalizeXmlDeletion(); // 異붽????몄텧
//           }
//       }

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

  // 0截뤴깵 Cookie + axios client
  const jar = new CookieJar();

  await jar.setCookie('country=NL', 'https://www.therow.com');
  await jar.setCookie('locale=ko-NL', 'https://www.therow.com');
  await jar.setCookie('language=ko', 'https://www.therow.com');
  await jar.setCookie('currency=EUR', 'https://www.therow.com');

  const client = wrapper(
    axios.create({
      jar,
      withCredentials: true,
      timeout: 30000,
      maxRedirects: 5,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36',
        'Accept-Language': 'ko-NL,ko;q=0.9,en-NL;q=0.8,en;q=0.7',
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Upgrade-Insecure-Requests': '1',
      },
      validateStatus: () => true,
    }),
  );

  const collectedProductUrls: string[] = [];
  let pageIndex = 1;

  while (pageIndex <= 50) {
    const pageUrl = this.getTherowCollectionProductsJsonUrl(siteUrl, pageIndex);
    let res: any = null;

    for (let attempt = 1; attempt <= 3; attempt++) {
      res = await client.get(pageUrl, {
        headers: {
          Accept: 'application/json,text/plain,*/*',
          Referer: this.withTherowOc(siteUrl),
        },
      });

      if (res.status !== 503) break;

      console.warn(`The Row products.json 503 retry ${attempt}/3 (page ${pageIndex})`);
      await new Promise(r =>
        setTimeout(r, 10000 + Math.random() * 5000),
      );
    }

    if (res.status === 503) {
      throw new Error(`The Row products.json 503 after retries (page ${pageIndex})`);
    }

    if (res.status !== 200 || !res.data) {
      throw new Error(`HTTP ${res.status} at page ${pageIndex}`);
    }

    const pageProducts = this.parseTherowProductsJson(res.data);
    if (!pageProducts.length) {
      console.log(`The Row page ${pageIndex}: no more products, stop`);
      break;
    }

    const pageProductUrls = pageProducts
      .filter((product: any) =>
        Array.isArray(product?.variants) &&
        product.variants.some((variant: any) => variant?.available === true),
      )
      .map((product: any) => {
        const handle = String(product?.handle || '').trim();
        return handle ? this.withTherowOc(`/products/${handle}`) : '';
      })
      .filter(Boolean);

    console.log(`The Row page ${pageIndex}: ${pageProductUrls.length}/${pageProducts.length} available products`);
    collectedProductUrls.push(...pageProductUrls);
    pageIndex++;
  }

  if (collectedProductUrls.length < 0) {
  while (true) {
    const pageUrl =
      pageIndex === 1 ? siteUrl : `${siteUrl}?page=${pageIndex}`;


    let res = await client.get(pageUrl);

    let finalUrl =
      res.request?.res?.responseUrl ||
      res.config?.url ||
      pageUrl;

    if (finalUrl.includes('/ko-kr/') || finalUrl.includes('/fr-fr/')) {
      const correctedUrl = finalUrl
        .replace('/ko-kr/', '/ko-nl/')
        .replace('/fr-fr/', '/ko-nl/');


      res = await client.get(correctedUrl);
      finalUrl =
        res.request?.res?.responseUrl ||
        res.config?.url ||
        correctedUrl;
    }

    if (res.status === 503) {
      console.warn(`?좑툘 503 媛먯? (page ${pageIndex}) ???댁떇 ??醫낅즺`);
      await new Promise(r =>
        setTimeout(r, 10000 + Math.random() * 5000),
      );
      break; // ?먮뒗 return
    }

    /* =========================
    * ??湲고? 鍮꾩젙???묐떟
    * ========================= */
    if (res.status !== 200 || !res.data) {
      throw new Error(`HTTP ${res.status} at page ${pageIndex}`);
    }

    const $ = cheerio.load(res.data);

    const pageProductUrls = Array.from(
      new Set(
        $('.ProductItem__Wrapper')
          .toArray()
          .filter(el => {
            // ???덉젅 ?쇰꺼 ?쒓굅
            return !$(el).find('.ProductItem__Label--soldOut').length;
          })
          .map(el => {
            const href = $(el).find('a[href]').attr('href');
            return href
              ? `https://www.therow.com${href}`
              : null;
          })
          .filter(Boolean) as string[],
      ),
    );

    if (pageProductUrls.length === 0) {
      console.log(`???섏씠吏 ${pageIndex} ???곹뭹 ?놁쓬, 醫낅즺`);
      break;
    }

    console.log(`?벀 ?섏씠吏 ${pageIndex} ??${pageProductUrls.length}媛??곹뭹`);

    collectedProductUrls.push(...pageProductUrls);
    pageIndex++;
  }

  }

  const productUrls = Array.from(new Set(collectedProductUrls));

  if (productUrls.length === 0) {
    console.log(`The Row available product URL count is 0 - ${category?.categoryName || '移댄뀒怨좊━ ?놁쓬'}`);
  }

  console.log(`?렞 ?붾줈??理쒖쥌 ?섏쭛: ${productUrls.length}媛?- ${category?.categoryName || '移댄뀒怨좊━ ?놁쓬'}`);

    for (const [index, rawProductUrl] of productUrls.entries()) {
      const productUrl = this.withTherowOc(rawProductUrl);
      await new Promise(r => setTimeout(r, 800 + Math.random() * 700));

      console.log(`The Row (${index + 1}/${productUrls.length}) collect: ${category?.categoryName || 'category none'}`);

      // 1截뤴깵 ?곹뭹 ?섏씠吏 ?붿껌
      let res: any = null;
      for (let detailAttempt = 1; detailAttempt <= 3; detailAttempt++) {
        res = await client.get(productUrl);

      let finalUrl =
        res.request?.res?.responseUrl ||
        res.config?.url ||
        productUrl;

      // 2截뤴깵 locale 媛뺤젣 蹂댁젙
      if (finalUrl.includes('/ko-kr/') || finalUrl.includes('/fr-fr/')) {
        const correctedUrl = this.withTherowOc(finalUrl
          .replace('/ko-kr/', '/ko-nl/')
          .replace('/fr-fr/', '/ko-nl/'));

        console.log(`?봽 locale 蹂댁젙 ??${correctedUrl}`);

        res = await client.get(correctedUrl);
        finalUrl =
          res.request?.res?.responseUrl ||
          res.config?.url ||
          correctedUrl;
      }

        if (res.status !== 503) break;

        console.warn(`The Row product detail 503 retry ${detailAttempt}/3: ${productUrl}`);
        await new Promise(r =>
          setTimeout(r, 10000 + Math.random() * 5000),
        );
      }

      if (res.status === 503) {
        throw new Error(`The Row product detail 503 after retries: ${productUrl}`);
      }
      
      if (res.status !== 200 || !res.data) {
        console.warn(`??HTTP ${res.status} ??skip`);
        continue;
      }

      // 3截뤴깵 cheerio 濡쒕뵫
      const $ = cheerio.load(res.data);
      await new Promise(r => setTimeout(r, 1000 + Math.random() * 1500));

      fs.writeFileSync(
        `therow_debug_${Date.now()}.html`,
        res.data,
        'utf-8'
      );


      // 4截뤴깵 媛寃?異붿텧
      let finalPrice = 0;
      const priceText = $('.ProductMeta__PriceList.Heading .ProductMeta__Price')
        .first()
        .text()
        .trim();

      if (priceText) {
        let raw = priceText.replace(/[^\d,]/g, '');
        raw = raw.replace('.', '');
        raw = raw.replace(',', '.');
        finalPrice = Math.floor(parseFloat(raw));
      }

      const productJsonText = $('script[data-product-json]').html();
      const productJson = productJsonText ? JSON.parse(productJsonText) : null;

      let size: string | null = null;

      if (productJson?.product?.variants) {
        const sizes = productJson.product.variants
          .filter(v => v.available === true)
          .map(v => v.option2)
          .filter(Boolean);

        size = sizes.length
          ? [...new Set(sizes)].join(', ')
          : null;

        // ?몛 ?ъ씠利덇? ?놁쑝硫?洹몃븣留??먯궗?댁쫰 ?먮떒
        if (!size) {
          const addToCartText = $('button.ProductForm__AddToCart').text().trim();
          const isUnavailable = /sold out|notify|unavailable|pre[-\s]?order/i.test(addToCartText);
          size = isUnavailable ? null : '\uC6D0\uC0AC\uC774\uC988';
        }
      }

      // 7截뤴깵 湲고? ?뺣낫
      const title =
        $('h1.ProductMeta__Title').text().trim() || '';

      const color =
        $('span.product-form__selected-value').first().text().trim() || '';

      const imageUrls = Array.from(
        new Set(
          $('.Product__SlideItem--image img')
            .map((_, img) => {
              let src = $(img).attr('src') || '';
              if (src.startsWith('//')) src = 'https:' + src;
              return src;
            })
            .get()
            .filter(Boolean),
        ),
      );

      let mainInfo = '';
      const desc = $('.ProductMeta__Description .Rte').text().trim();
      if (desc) mainInfo += desc + '\n';

      let madeIn = '';
      let styleId = '';

      // =========================
      // 湲곗〈 援ъ“
      // =========================

      $('.product-more__content li').each((_, li) => {

        const text = $(li).text().trim();

        // Made in
        if (/^(Made in|\uC81C\uC870\uAD6D)/i.test(text)) {

          madeIn = text
            .replace(/^(Made in|\uC81C\uC870\uAD6D)\s*:?\s*/i, '')
            .trim();
        }

        // Style
        if (/^(Style|\uC2A4\uD0C0\uC77C)\s*:/i.test(text)) {

          styleId = text
            .replace(/^(Style|\uC2A4\uD0C0\uC77C)\s*:\s*/i, '')
            .trim();
        }

      });

      // =========================
      // ?뵦 ?좉퇋 援ъ“ fallback
      // =========================

      // styleId fallback
      if (!styleId) {

        styleId =
          $('.ProductMeta__Sku')
            .first()
            .text()
            .trim();
      }

      // madeIn fallback
      if (!madeIn) {

        $('.ProductMeta__CollapsibleContent li').each((_, li) => {

          const text = $(li).text().trim();

          if (/made in/i.test(text)) {

            madeIn = text
              .replace(/made in/i, '')
              .trim();
          }

        });
      }

      // 8截뤴깵 ?좏슚??泥댄겕
      if (
        !title ||
        !finalPrice ||
        !size ||
        !styleId ||
        !imageUrls.length
      ) {
        console.warn('?좑툘 ?곗씠???꾨씫 ??skip');
        continue;
      }

      // 9截뤴깵 理쒖쥌 媛앹껜
      const productDetails = {
        site: 'Therow',
        designer: '\uB354\uB85C\uC6B0',
        title,
        price: finalPrice,
        color,
        size,
        styleId,
        brandstyleId: styleId,
        madeIn,
        mainInfo,
        imageUrls,
      };


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
  
      console.log(`?붾줈???덉젅 泥섎━ ?꾨즺: ${product.title} (styleId: ${product.styleId})`);
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
  //logErrorToDesktop(error, `9.?ㅻ쪟 諛쒖깮`);
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

    //   async getProductUpdate(visitUrl: string, goodsNo: string, customId: string, accountPlatform: string){
// const account = await this.hostingAccountRepository.findOne({
//   where: {
//     customId,
//     accountPlatform,
//   },
// });

// if (!account) {
//   console.error(`??怨꾩젙 ?놁쓬: ${customId} / ${accountPlatform}`);
//   return;
// }

// const partnerKey = account.partnerKey;
// const apiKey = account.apiKey;
//     //     const proxyLines = await this.r2Service.loadBrightProxies2();
//     //     const proxy = pickProxy(proxyLines);
//     //     const proxyArg = `--proxy-server=http://${proxy.host}:${proxy.port}`;

//     //     let browser: Browser | null = null;
//     //     let page: Page | null = null;

//     //     const partnerKey = account.partnerKey;
// const apiKey = account.apiKey;
//     //       where: {
//     goodsno: Number(goodsNo),
//     customId,
//     accountPlatform,
//   },
    //     });
    //     if (!product) return;

    //     try {
    //     browser = await puppeteer.launch({
    //       headless: false,
    //       args: [
    //         // proxyArg,
    //         '--disable-blink-features',
    //         '--disable-blink-features=AutomationControlled',
    //         '--disable-infobars',
    //         '--no-default-browser-check',
    //         '--no-first-run',
    //         '--log-level=0',
    //         '--disable-dev-shm-usage',
    //         '--no-sandbox',
    //         '--disable-setuid-sandbox',
    //         '--remote-debugging-port=0',
    //         '--disable-background-timer-throttling',
    //         '--disable-backgrounding-occluded-windows',
    //         '--disable-renderer-backgrounding',
    //         '--disable-session-crashed-bubble',
    //         '--disable-accelerated-2d-canvas',
    //         '--noerrdialogs',
    //       ],
    //     });

    //     page = await browser.newPage();
    //     await page.authenticate({
    //       username: proxy.username,
    //       password: proxy.password,
    //     });


    //     // ???ㅻ뜑/UA ?ъ꽕??
    //     await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36');
    //     await page.setViewport({ width: 1920, height: 1080 });
    //     await page.setCacheEnabled(false);
    //     await page.setRequestInterception(true);

    //     page.on('request', (request) => {
    //       // ???붿껌 由ъ냼??????뺤씤
    //       const resourceType = request.resourceType();

    //       if (resourceType === 'image') {
    //         request.abort(); // ?뵏 ?대?吏 ?붿껌留?李⑤떒
    //       } else {
    //         request.continue(); // ???섎㉧吏???뺤긽 ?듦낵
    //       }
    //     });

    //     await page.goto(visitUrl, {waitUntil: 'domcontentloaded', timeout: 30000})
    //     await new Promise((resolve) => setTimeout(resolve, 2000));
    //     // ?꾩옱 URL 泥댄겕
    //     const currentUrl = page.url();
    //     if (currentUrl.includes('ko-kr') || currentUrl.includes('fr-fr')) {
    //         const correctedUrl = currentUrl
    //           .replace('ko-kr', 'ko-nl')
    //           .replace('fr-fr', 'ko-nl');
    //         console.log(`?봽 由щ뵒?됱뀡 媛먯??? ${correctedUrl} 濡??ъ씠?숉빀?덈떎.`);
    //         await page.goto(correctedUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    //         await page.waitForSelector(
    //             'span.sales',
    //             { visible: true, timeout: 30000 }
    //         );

    //     }

    //     let productDetails = await page.evaluate(async () => {
    //       const priceElement = document.querySelector('.ProductMeta__PriceList.Heading .ProductMeta__Price');
    //       let finalPrice = 0;

    //       if (priceElement) {
    //           let rawPrice = priceElement.textContent?.trim() || '';
    //           rawPrice = rawPrice.replace(/[^\d,]/g, '');  // ?レ옄? ?쇳몴留??④?
    //           rawPrice = rawPrice.replace('.', '');        // . ?쒓굅 (751000)
    //           rawPrice = rawPrice.replace(',', '.');       // ,瑜?.?쇰줈 蹂??(7510.00)
    //           finalPrice = Math.floor(parseFloat(rawPrice));
    //       }


    //       let size: string | null = null;

    //       // 1. '?ъ씠利??좏깮' 踰꾪듉 以??붾㈃??蹂댁씠??寃껊쭔 李얘린
    //       const sizeSelectButton = Array.from(document.querySelectorAll('button.ProductForm__Item'))
    //           .find(btn => {
    //               const selectedValue = btn.querySelector('.ProductForm__SelectedValue');
    //               const isVisible = (btn as HTMLElement).offsetParent !== null; // display:none 臾댁떆 (蹂댁씠??踰꾪듉留?
    //               return isVisible && selectedValue && selectedValue.textContent?.includes('?ъ씠利??좏깮');
    //           });

    //       if (!sizeSelectButton) {
    //           // ?ъ씠利??좏깮 踰꾪듉???꾩삁 ?녿뒗 寃쎌슦 (媛諛?吏媛?or ?좎＜臾?
    //           const addToCartButton = document.querySelector('button.ProductForm__AddToCart');
    //           if (addToCartButton && addToCartButton.textContent?.includes('?좎＜臾?)) {
    //               size = '?좎＜臾?;
    //           } else {
    //               size = '?먯궗?댁쫰';
    //           }
    //       } else {
    //           // Popover ID瑜??듯빐 ?ъ씠利?紐⑸줉 李얘린
    //           const popoverId = sizeSelectButton.getAttribute('aria-controls');
    //           const popover = popoverId ? document.getElementById(popoverId) : null;

    //           if (popover) {
    //               const sizeButtons = popover.querySelectorAll('button[data-action="select-value"]');
    //               const availableSizes = Array.from(sizeButtons)
    //                   .filter(btn => !btn.classList.contains('unavailable-button'))  // ?덉젅 ?꾨땶 寃껊쭔
    //                   .map(btn => btn.textContent?.trim() || '')
    //                   .filter(value => value.length > 0);

    //               if (availableSizes.length === 0) {
    //                   console.log('??紐⑤뱺 ?ъ씠利??덉젅, ?ㅼ쓬 ?곹뭹?쇰줈 ?섏뼱媛묐땲??');
    //                   size = null;
    //               } else {
    //                   size = availableSizes.join(', ');
    //               }
    //           } else {
    //               size = '?먯궗?댁쫰';
    //           }
    //       }

    //       const soldOut = !finalPrice || !size || size.length === 0; // ????以??섎굹?쇰룄 ?놁쑝硫??덉젅
    //       return { price: finalPrice, size ,soldOut};
    //     });

    //     if (!productDetails) {
    //       productDetails = {
    //         price: 0,
    //         size: '',
    //         soldOut: true,
    //       };
    //     }

    //     if (!productDetails.soldOut) {
    //       // ???뺤긽???뚮쭔 DB ?낅뜲?댄듃
    //       product.lastModifiedDate = new Date();
    //       product.price = productDetails.price;
    //       product.size = productDetails.size;
    //       await this.productRepository.save(product);
    //     }

    //     // ??1截뤴깵 XML ?앹꽦 諛?R2 ?낅줈??
    //     const xmlUrl = await this.r2Service.uploadXmlToR2Update(
    //       product,
    //       product.styleId,
    //       partnerKey,
    //       productDetails.soldOut
    //     );

    //     // ???낅줈???ㅽ뙣 ???덉쟾?섍쾶 以묐떒
    //     if (!xmlUrl) {
    //       console.error(`??XML ?낅줈???ㅽ뙣 ??${product.designer} ${product.title}`);
    //       return;
    //     }

    //     // ??2截뤴깵 怨좊룄紐곕줈 ?곹뭹 ?깅줉/?섏젙 API ?몄텧
    //     const partnerKey = product.partnerKey;
    //     const apiKey = product.apiKey;
    //     await this.godoMallService.registerProductWithXmlUrl(
    //       partnerKey,
    //       apiKey,
    //       xmlUrl,
    //       product,
    //       product.styleId
    //     );

    //     // ??WebSocket?쇰줈 怨좊룄紐곗뿉 ?뚮┝ ?꾩넚
    //     this.gateway.sendProductUpdate(
  // `${customId}:${accountPlatform}:${goodsNo}`,
  // {
    //       status: 'success',
    //       price: product.price,
    //       size: product.size,
    //       updatedAt: new Date().toISOString(),
    //     });

    //     // ??3截뤴깵 怨좊룄紐?諛섏쁺 ??XML 諛붾줈 ??젣
    //     await this.godoMallService.deleteUpdateXml(xmlUrl);

    //     console.log(`??${product.designer} ?곹뭹 ?낅뜲?댄듃 ?꾨즺`);

    //   } catch (err: any) {
    //     console.warn(`?슚 Therow ?낅뜲?댄듃 ?ㅽ뙣: ${err.message}`);
    //     if (page && !page.isClosed()) await page.close();
    //     if (browser) await browser.close();
    //   } finally {
    //     if (page && !page.isClosed()) await page.close();
    //     if (browser) await browser.close();
    //   }
    // }


async getProductUpdate(visitUrl: string, goodsNo: string, customId: string, accountPlatform: string) {
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

  /* =========================
   * 0截뤴깵 CookieJar + axios client
   * ========================= */
  const jar = new CookieJar();

  // ?뵦 locale 媛뺤젣 荑좏궎
  await jar.setCookie('country=NL', 'https://www.therow.com');
  await jar.setCookie('locale=ko-NL', 'https://www.therow.com');
  await jar.setCookie('language=ko', 'https://www.therow.com');
  await jar.setCookie('currency=EUR', 'https://www.therow.com');

  const client = wrapper(
    axios.create({
      jar,
      withCredentials: true,
      timeout: 30000,
      maxRedirects: 5,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36',
        'Accept-Language': 'ko-NL,ko;q=0.9,en-NL;q=0.8,en;q=0.7',
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Upgrade-Insecure-Requests': '1',
      },
      validateStatus: () => true,
    }),
  );

  try {

    const targetVisitUrl = this.withTherowOc(visitUrl);
    let res: any = null;
    for (let updateAttempt = 1; updateAttempt <= 3; updateAttempt++) {
      res = await client.get(targetVisitUrl);
      if (res.status !== 503) break;

      console.warn(`The Row update 503 retry ${updateAttempt}/3: ${targetVisitUrl}`);
      await new Promise(r =>
        setTimeout(r, 10000 + Math.random() * 5000),
      );
    }

    let finalUrl =
      res.request?.res?.responseUrl ||
      res.config?.url ||
      targetVisitUrl;

    if (finalUrl.includes('/ko-kr/')) {
      const correctedUrl = this.withTherowOc(finalUrl.replace('/ko-kr/', '/ko-nl/'));

      res = await client.get(correctedUrl);

      finalUrl =
        res.request?.res?.responseUrl ||
        res.config?.url ||
        correctedUrl;

    }

    if (res.status === 503) {
      console.warn(`The Row update still returned 503 after retries: ${targetVisitUrl}`);
      await new Promise(r =>
        setTimeout(r, 10000 + Math.random() * 5000),
      );
      throw new Error(`The Row update 503 after retries: ${targetVisitUrl}`);
    }


    if (res.status !== 200 || !res.data) {
      throw new Error(`HTTP ${res.status}`);
    }

    const $ = cheerio.load(res.data);

    let finalPrice = 0;

    const priceText = $('.ProductMeta__PriceList.Heading .ProductMeta__Price')
      .first()
      .text()
      .trim();


    if (priceText) {
      let raw = priceText.replace(/[^\d,]/g, '');
      raw = raw.replace('.', '');
      raw = raw.replace(',', '.');

      finalPrice = Math.floor(parseFloat(raw));
    }

    const productJsonText = $('script[data-product-json]').html();
    const productJson = productJsonText ? JSON.parse(productJsonText) : null;

    let size: string | null = null;

    if (productJson?.product?.variants) {
      const sizes = productJson.product.variants
        .filter(v => v.available === true)
        .map(v => v.option2)
        .filter(Boolean);

      size = sizes.length
        ? [...new Set(sizes)].join(', ')
        : null;

      // ?몛 ?ъ씠利덇? ?놁쑝硫?洹몃븣留??먯궗?댁쫰 ?먮떒
      if (!size) {
        const addToCartText = $('button.ProductForm__AddToCart').text().trim();
        const isUnavailable = /sold out|notify|unavailable|pre[-\s]?order/i.test(addToCartText);
        size = isUnavailable ? null : '\uC6D0\uC0AC\uC774\uC988';
      }
    }


    const soldOut = !finalPrice || !size || size.length === 0;

    if (!soldOut) {
      product.lastModifiedDate = new Date();
      product.price = finalPrice;
      product.size = size;
      await this.productRepository.save(product);
    }

    const xmlUrl = await this.r2Service.uploadXmlToR2Update(
      product,
      product.styleId,
      partnerKey,
      soldOut,
    );

    if (!xmlUrl) {
      console.error(`\u274C XML \uC5C5\uB85C\uB4DC \uC2E4\uD328: ${product.designer} ${product.title}`);
      return;
    }

    await this.userService.assertRequestAvailable(customId, 1);
    await this.godoMallService.registerProductWithXmlUrl(
      partnerKey,
      apiKey,
      xmlUrl,
      product,
      product.styleId,
    );
    await this.userService.consumeRequest(customId, 1);

    this.gateway.sendProductUpdate(
  `${customId}:${accountPlatform}:${goodsNo}`,
  {
      status: 'success',
      price: product.price,
      size: product.size,
      updatedAt: new Date().toISOString(),
    });

    await this.godoMallService.deleteUpdateXml(xmlUrl);

    console.log('\u2705 \uB354\uB85C\uC6B0 \uC0C1\uD488 \uC5C5\uB370\uC774\uD2B8 \uC644\uB8CC');
  } catch (err: any) {
    console.warn(`\uD83D\uDEA8 \uB354\uB85C\uC6B0 \uC5C5\uB370\uC774\uD2B8 \uC2E4\uD328: ${err.message}`);
  }
}

}
