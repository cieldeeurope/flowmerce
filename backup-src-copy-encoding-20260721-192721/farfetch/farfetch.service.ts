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
import { Cafe24Service } from 'src/cafe24/cafe24.service';
import { MakeshopService } from 'src/makeshop/makeshop.service';
import type { Browser, Page } from 'puppeteer';
import puppeteer from 'puppeteer-extra';
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



interface FarfetchUrls {
    categories: string[];
    designers: string[];
}

interface FarfetchResult {
    categories: { categoryName: string; url: string; categoryNumbers: string; }[];
    designers: { name: string; code: string }[]; // 디자이너의 이름과 코드 포함
}


  @Injectable()
  export class FarfetchService {
    constructor(
        @InjectRepository(Product)
        private readonly productRepository: Repository<Product>,
        private readonly godoMallService: GodoMallService,
        private readonly r2Service: R2Service,
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
  
      
  
  
  
  // 파페치 카테고리 및 브랜드 가져오기
async farfetchCategorys(urls: FarfetchUrls): Promise<FarfetchResult> {

    const proxyLines = await this.r2Service.loadBrightProxies1();
    const proxy = pickProxy(proxyLines);
    const proxyArg = `--proxy-server=http://${proxy.host}:${proxy.port}`;

    let browser: Browser | null = null;
    let page: Page | null = null;

    const allCategories: {
        categoryName: string;
        url: string;
        categoryNumbers: string;
    }[] = [];

    const allDesigners = new Set<string>();

    try {

        while (true) {

            try {

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
                        '--disable-features=IsolateOrigins,site-per-process',
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
                    'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8'
                });

                await page.setViewport({
                    width: 1920,
                    height: 1080
                });

                for (const url of urls.categories) {

                    // 페이지 이동
                    await page.goto(url, {
                        waitUntil: 'domcontentloaded'
                    });

                    // 전체 필터 클릭
                    await page.waitForSelector(
                        'button[data-testid="filter-button"]',
                        { timeout: 15000 }
                    );

                    await page.evaluate(() => {

                        const filterButton = document.querySelector(
                            'button[data-testid="filter-button"]'
                        ) as HTMLElement;

                        filterButton?.click();
                    });

                    await new Promise((resolve) =>
                        setTimeout(resolve, 3000)
                    );

                    // 카테고리 이름 접두사 추가
                    let prefix = '';

                    if (url.includes('/women')) {

                        prefix = '여성 - ';

                        if (url.includes('/women/clothing')) {
                            prefix += '의류 - ';
                        }
                        else if (url.includes('/women/shoes')) {
                            prefix += '신발 - ';
                        }
                        else if (url.includes('/women/bags')) {
                            prefix += '가방 - ';
                        }
                        else if (url.includes('/women/accessories')) {
                            prefix += '악세사리 - ';
                        }
                        else if (url.includes('/women/jewellery')) {
                            prefix += '주얼리 - ';
                        }
                        else if (url.includes('/women/fine-jewellery')) {
                            prefix += '파인주얼리 - ';
                        }

                    } else if (url.includes('/men')) {

                        prefix = '남성 - ';

                        if (url.includes('/men/clothing')) {
                            prefix += '의류 - ';
                        }
                        else if (url.includes('/men/shoes')) {
                            prefix += '슈즈 - ';
                        }
                        else if (url.includes('/men/bags')) {
                            prefix += '가방 - ';
                        }
                        else if (url.includes('/men/accessories')) {
                            prefix += '악세사리 - ';
                        }
                        else if (url.includes('/men/watches')) {
                            prefix += '시계 - ';
                        }

                    } else if (url.includes('/kids')) {

                        prefix = '아동 - ';

                        if (url.includes('/kids/girls')) {
                            prefix += '여아 (2-12세) - ';
                        }
                        else if (url.includes('/kids/boys')) {
                            prefix += '남아 (2-12세) - ';
                        }
                        else if (url.includes('/kids/teen-girl')) {
                            prefix += '여아 (13-16세) - ';
                        }
                        else if (url.includes('/kids/teen-boy')) {
                            prefix += '남아 (13-16세) - ';
                        }
                    }

                    /* ======================================================
                       현재 열린 카테고리 목록
                    ====================================================== */

                    const categoryItems = await page.evaluate(() => {

                        const result: {
                            name: string;
                            href: string;
                            hasCheckbox: boolean;
                            hasAccordionButton: boolean;
                        }[] = [];

                        const listItems = document.querySelectorAll(
                            'section[data-testid="카테고리"] li[data-component="ListItem"]'
                        );

                        listItems.forEach((item) => {

                            const a = item.querySelector('a');

                            if (!a) {
                                return;
                            }

                            const checkbox =
                                item.querySelector(
                                    'input[type="checkbox"]'
                                );

                            const accordionButton =
                                item.querySelector(
                                    'button[data-component="AccordionButton"]'
                                );

                            let name = '';

                            // 체크박스 타입
                            if (checkbox) {

                                const label =
                                    item.querySelector(
                                        'label[data-component="FormControlLabel"]'
                                    );

                                name =
                                    label?.textContent?.trim() || '';
                            }
                            // 버튼 타입
                            else {

                                const labelSpan =
                                    a.querySelector(
                                        'span[id$="-label"]'
                                    );

                                name =
                                    labelSpan?.textContent?.trim() || '';
                            }

                            const href =
                                a.getAttribute('href') || '';

                            if (!name || !href) {
                                return;
                            }

                            result.push({
                                name,
                                href,
                                hasCheckbox: !!checkbox,
                                hasAccordionButton: !!accordionButton,
                            });
                        });

                        return result;
                    });

                    /* ======================================================
                       1차 체크박스 카테고리 처리
                    ====================================================== */

                    const checkboxHandles = await page.$$(
                        'section[data-testid="카테고리"] li[data-component="ListItem"] input[type="checkbox"]'
                    );

                    for (let i = 0; i < checkboxHandles.length; i++) {

                        const checkbox = checkboxHandles[i];

                        const category = categoryItems.filter(
                            (x) => x.hasCheckbox
                        )[i];

                        if (!category) {
                            continue;
                        }

                        const checked = await checkbox.evaluate(
                            (el: HTMLInputElement) => el.checked
                        );

                        if (!checked) {

                            await checkbox.evaluate(
                                (el: HTMLInputElement) => el.click()
                            );

                            await new Promise((resolve) =>
                                setTimeout(resolve, 1500)
                            );
                        }

                        const updatedUrl = page.url();

                        const categoryMatch =
                            updatedUrl.match(/category=([^&]+)/);

                        const categoryCodes =
                            categoryMatch
                                ? categoryMatch[1].split('%7C')
                                : [];

                        const categoryNumber =
                            categoryCodes[0] || '';

                        const categoryName =
                            `${prefix}${category.name}`;

                        console.log('📂 카테고리:', categoryName);
                        console.log('🔢 categoryNumbers:', categoryNumber);
                        console.log('🔗 baseUrl:', url);
                        console.log('----------------------');

                        allCategories.push({
                            categoryName,
                            url,
                            categoryNumbers: categoryNumber,
                        });

                        // 체크 해제
                        await checkbox.evaluate(
                            (el: HTMLInputElement) => el.click()
                        );

                        await new Promise((resolve) =>
                            setTimeout(resolve, 500)
                        );
                    }

                    /* ======================================================
                       버튼형 카테고리 처리
                       ex) 드레스
                    ====================================================== */

                    const buttonCategories = categoryItems.filter(
                        (x) => !x.hasCheckbox
                    );

                    for (const subcategory of buttonCategories) {

                        let retries = 0;

                        while (retries < 5) {

                            try {

                                console.log(
                                    `▶ 서브카테고리 접근: ${subcategory.name}`
                                );

                                await page.goto(
                                    `https://www.farfetch.com${subcategory.href}`,
                                    {
                                        waitUntil: 'domcontentloaded'
                                    }
                                );

                                await new Promise((resolve) =>
                                    setTimeout(resolve, 3000)
                                );

                                await page.waitForSelector(
                                    'button[data-testid="filter-button"]',
                                    { timeout: 15000 }
                                );

                                await page.evaluate(() => {

                                    (
                                        document.querySelector(
                                            'button[data-testid="filter-button"]'
                                        ) as HTMLElement
                                    )?.click();
                                });

                                await new Promise((resolve) =>
                                    setTimeout(resolve, 2000)
                                );

                                /* ==========================================
                                   체크박스 목록 추출
                                ========================================== */

                                const subCategoryData =
                                    await page.evaluate(() => {

                                    const result: {
                                        name: string;
                                        url: string;
                                    }[] = [];

                                    const checkboxes =
                                        document.querySelectorAll(
                                            'section[data-testid="카테고리"] li[data-component="ListItem"] input[data-component="CheckboxControlled"]'
                                        );

                                    checkboxes.forEach((checkbox) => {

                                        const li =
                                            checkbox.closest(
                                                'li[data-component="ListItem"]'
                                            );

                                        const a =
                                            li?.querySelector('a');

                                        const label =
                                            li?.querySelector(
                                                'label[data-component="FormControlLabel"]'
                                            );

                                        const name =
                                            label?.textContent?.trim() || '';

                                        const href =
                                            a?.getAttribute('href');

                                        if (name && href) {

                                            result.push({
                                                name,
                                                url: `https://www.farfetch.com${href}`,
                                            });
                                        }
                                    });

                                    return result;
                                });

                                /* ==========================================
                                   체크박스 순차 클릭
                                ========================================== */

                                const checkboxHandles =
                                    await page.$$(
                                        'section[data-testid="카테고리"] li[data-component="ListItem"] input[type="checkbox"]'
                                    );

                                for (let i = 0; i < checkboxHandles.length; i++) {

                                    const checkbox =
                                        checkboxHandles[i];

                                    const data =
                                        subCategoryData[i];

                                    if (!data) {
                                        continue;
                                    }

                                    const checked =
                                        await checkbox.evaluate(
                                            (el: HTMLInputElement) => el.checked
                                        );

                                    if (!checked) {

                                        await checkbox.evaluate(
                                            (el: HTMLInputElement) => el.click()
                                        );

                                        await new Promise((resolve) =>
                                            setTimeout(resolve, 1500)
                                        );
                                    }

                                    const updatedUrl = page.url();

                                    const match =
                                        updatedUrl.match(
                                            /category=([^&]+)/
                                        );

                                    const categoryNumbers =
                                        match
                                            ? match[1].split('%7C')
                                            : [];

                                    const categoryNumber =
                                        categoryNumbers[0] || '';

                                    const categoryName =
                                        `${prefix}${subcategory.name} - ${data.name}`;

                                    console.log(
                                        '📂 서브카테고리:',
                                        categoryName
                                    );

                                    console.log(
                                        '🔢 categoryNumbers:',
                                        categoryNumber
                                    );

                                    console.log(
                                        '🔗 subUrl:',
                                        subcategory.href
                                    );

                                    console.log(
                                        '----------------------'
                                    );

                                    allCategories.push({
                                        categoryName,
                                        url: `https://www.farfetch.com${subcategory.href}`,
                                        categoryNumbers: categoryNumber,
                                    });

                                    // 체크 해제
                                    await checkbox.evaluate(
                                        (el: HTMLInputElement) => el.click()
                                    );

                                    await new Promise((resolve) =>
                                        setTimeout(resolve, 500)
                                    );
                                }

                                console.log(
                                    `✅ 완료: ${subcategory.name}`
                                );

                                break;

                            } catch (error: any) {

                                console.error(
                                    `❌ 오류 (${subcategory.name})`,
                                    error.message || error
                                );

                                if (
                                    error.message?.includes('Timeout')
                                ) {

                                    console.warn(
                                        `⏱ Timeout → 재시도 ${retries + 1}/5`
                                    );
                                }

                                retries++;
                            }
                        }

                        if (retries === 5) {

                            console.error(
                                `🚫 ${subcategory.name} 5회 실패 → 스킵`
                            );
                        }
                    }
                }

                /* ======================================================
                   디자이너
                ====================================================== */

                for (const url of urls.designers) {

                    await page.goto(url, {
                        waitUntil: 'domcontentloaded'
                    });

                    await this.autoScroll(page);

                    const designers = await page.evaluate(() => {

                        const designerList: {
                            name: string;
                            text: string;
                        }[] = [];

                        const ulElements =
                            document.querySelectorAll('._f7eb07');

                        ulElements.forEach((ulElement) => {

                            const liElements =
                                ulElement.querySelectorAll('li');

                            liElements.forEach((li) => {

                                const aTag =
                                    li.querySelector('a');

                                if (aTag) {

                                    const name =
                                        aTag.getAttribute('name') || '';

                                    const text =
                                        aTag.textContent || '';

                                    designerList.push({
                                        name,
                                        text
                                    });
                                }
                            });
                        });

                        return designerList;
                    });

                    designers.forEach((designer) => {

                        const code =
                            designer.name.replace(/^dca/, '');

                        const name =
                            designer.text;

                        allDesigners.add(
                            `${name}|||${code}`
                        );
                    });
                }

                if (page && !page.isClosed()) {
                    await page.close();
                }

                if (browser) {
                    await browser.close();
                }

                return {
                    categories: allCategories,
                    designers: Array.from(allDesigners).map((item) => {

                        const [name, code] =
                            item.split('|||');

                        return {
                            name,
                            code
                        };
                    }),
                };

            } catch (error: any) {

                if (
                    error.message.includes('429') ||
                    error.message.includes('Too Many Requests')
                ) {

                } else {

                    throw error;
                }
            }
        }

    } finally {

        if (browser) {
            await browser.close();
        }
    }
}
  
  
  
  
    
  
// 파페치 사이트 크롤링 시작
async getProductsFromCategory(siteUrl: string, partnerKey: string, apiKey: string, customId:string, accountPlatform:string, godoMallCategoryCode:string): Promise<void> {
    const proxyLines = await this.r2Service.loadBrightProxies1();
    

    let browser: Browser | null = null;
    let page: Page | null = null;
    let productUrls: string[] = [];
    const productUrlSet = new Set<string>();

    const category = await this.mappingRepository.findOne({
        where: { customId: customId, accountPlatform: accountPlatform, siteUrl: siteUrl },
    });

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

    if (!account) {
        throw new Error('Hosting account not found.');
    }


    let pageUrl = '';
    let pageIndex = 1; // 페이지 인덱스 초기화
    const MAX_RETRY = 5;
    let retryAttempts = 0; // 재시도 횟수 초기화
    let finished = false;
        
    while (retryAttempts < MAX_RETRY && !finished) {
        let proxy = pickProxy(proxyLines);
        let proxyArg = `--proxy-server=http://${proxy.host}:${proxy.port}`;
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
            await page.setExtraHTTPHeaders({ 'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8' });
            await page.setRequestInterception(true);
            page.on('request', req => {
                const type = req.resourceType();
                if (type === 'image' || type === 'font') req.abort();
                else req.continue();
            });

                       
            while (true) {
                const baseUrl = new URL(siteUrl);
                const searchParams = new URLSearchParams(baseUrl.search);
                searchParams.set('page', pageIndex.toString());
                baseUrl.search = searchParams.toString();
                pageUrl = baseUrl.toString();

                // 페이지 이동 및 스크롤
                const response = await page.goto(pageUrl, { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => null);
                if (!response) {
                    throw new Error('NO_RESPONSE');
                }

                const status = response.status();

                // 1️⃣ HTTP 차단 감지
                if (status === 403 || status === 429) {
                    throw new Error(`BLOCKED_STATUS_${status}`);
                }

                // 2️⃣ HTML 내용 기반 차단 감지 (Akamai Access Denied)
                const html = await page.content();

                if (
                    html.includes('Access Denied') ||
                    html.includes('errors.edgesuite.net') ||
                    html.includes('Reference #') ||
                    html.includes('Request unsuccessful') ||
                    html.includes('AkamaiGHost')
                ) {
                throw new Error('AKAMAI_BLOCK');
                }
                
                await page.waitForFunction(
                    () =>
                        document.querySelectorAll('ul#catalog-grid a').length > 0,
                    { timeout: 15000 }
                );
                await this.autoScroll(page);
                await new Promise(resolve => setTimeout(resolve, 2000));

                // 페이지 데이터 평가
                const { currentPageProductUrls, hasNextPage } = await page.evaluate(() => {
                    const productUrls = Array.from(
                        document.querySelectorAll<HTMLAnchorElement>('ul#catalog-grid a')
                    ).map((link) => link.href);

                    const nextButton = document.querySelector('a[data-component="PaginationNextActionButton"]');
                    const hasNextPage =
                        nextButton !== null && nextButton.getAttribute('aria-disabled') !== 'true';

                    return { currentPageProductUrls: productUrls, hasNextPage };
                });



                if (currentPageProductUrls.length === 0) {
                    console.log("더 이상 상품이 없습니다. 반복문을 종료합니다.");
                    break;
                }

                currentPageProductUrls.forEach((url) => productUrlSet.add(url));

                if (!hasNextPage) {
                    console.log('더 이상 다음 페이지가 없습니다.');
                    finished = true;
                    break;
                }

                pageIndex++; // 🔥 다음 페이지로
            }
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
                console.error(`❌ 최대 재시도 횟수 초과: ${pageUrl}`);
                return; // 최대 재시도 횟수를 초과하면 함수 종료
            }

            // 다음 재시도를 위한 랜덤 대기 시간 (exponential backoff)
            const waitTime = Math.min(1000 * 2 ** retryAttempts, 10000); // 최대 10초 대기
            await new Promise((resolve) => setTimeout(resolve, waitTime));
        }
    }
    productUrls = [...productUrlSet];



if (productUrls.length === 0) {
    throw new Error('상품 URL을 수집하지 못했습니다. 모든 시도가 실패했습니다.');
}
console.log(`최종 수집된 상품 URL 수: ${productUrls.length} - ${category?.categoryName || '카테고리 없음'}`);


for (const [index, productUrl] of productUrls.entries()) {
    let loadAttempts = 0;
    // let brandstyleId = '';

    while (loadAttempts < 3) {
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

                await page.setRequestInterception(true);
                page.on('request', req => {
                    const type = req.resourceType();
                    if (type === 'image' || type === 'font') req.abort();
                    else req.continue();
                });
            }
    
            const response = await page.goto(productUrl, { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => null);
            console.log(`파페치 (${index + 1}/${productUrls.length}) 수집 중`);
            try {
                await page.waitForFunction(
                    () =>
                    document.querySelector('button[data-component="AddToBag"]') ||
                    document.querySelector('button[aria-label*="쇼핑백"]') ||
                    document.querySelector('button[aria-label*="Add to bag"]'),
                    { timeout: 8000 }
                );

                await page.waitForSelector('img[data-component="Img"]', { timeout: 15000 });
            } catch {
            }
            await new Promise(resolve => setTimeout(resolve, 2000));

            if (!response) {
                throw new Error('NO_RESPONSE');
            }

            const status = response.status();

            // 1️⃣ HTTP 차단 감지
            if (status === 403 || status === 429) {
                throw new Error(`BLOCKED_STATUS_${status}`);
            }

            // 2️⃣ HTML 내용 기반 차단 감지 (Akamai Access Denied)
            const html = await page.content();

            if (
                html.includes('Access Denied') ||
                html.includes('errors.edgesuite.net') ||
                html.includes('Reference #') ||
                html.includes('Request unsuccessful') ||
                html.includes('AkamaiGHost')
            ) {
            throw new Error('AKAMAI_BLOCK');
            }

            // const html = await response.text();
            // // ✅ brandStyleId 로 변경
            // const match =
            //     html.match(/"brandStyleId":"([^"]+)"/) ||
            //     html.match(/\\"brandStyleId\\":\\"([^"]+)\\"/);

            // brandstyleId = match?.[1] || '';
                       
            break; // ✅ 로딩 성공 시 루프 종료
        } catch (error: any) {
            loadAttempts++;
            console.warn(`파페치 페이지 로드 실패 [${error.message}] (프록시 변경 ${loadAttempts}/3): ${error.message}`);
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
    
    // 👇 evaluate 전에 사이즈 버튼이 있으면 클릭만 수행
    const sizeButton = await page.$('div[role="combobox"][data-component="SizeSelectorLabel"]');
    if (sizeButton) {
    await sizeButton.click();
    await new Promise((resolve) => setTimeout(resolve,1000));
    }
    
    const productDetails = await page.evaluate(async() => {
        const site = 'Farfetch';
        const h1Element = document.querySelector('h1.ltr-i980jo.el610qn0');
        const designer = h1Element?.querySelector('a')?.textContent?.trim() || '';
        const title = h1Element?.querySelector('p')?.textContent?.trim() || '';
        
        // ---------------------------
        // 1️⃣ JSON-LD 파싱 (최우선)
        // ---------------------------
        let price = 0;
        let fixedPrice = 0;

        const ldJsonScripts = Array.from(
            document.querySelectorAll('script[type="application/ld+json"]')
        );

        for (const script of ldJsonScripts) {
            try {
            const json = JSON.parse(script.textContent || '');
            const offers = json?.offers || json?.hasVariant?.[0]?.offers;
            const specs = offers?.priceSpecification;

            if (Array.isArray(specs)) {
                for (const spec of specs) {
                if (spec.priceType?.includes('Strikethrough')) {
                    fixedPrice = Number(spec.price);
                } else {
                    price = Number(spec.price);
                }
                }
            }
            } catch {}
        }

        // ---------------------------
        // 2️⃣ JSON-LD 실패 시 DOM fallback
        // ---------------------------
        if (!price) {
            const priceFinal = document.querySelector('[data-component="PriceFinal"]');
            const priceLarge = document.querySelector('[data-component="PriceLarge"]');
            const priceOriginal = document.querySelector('[data-component="PriceOriginal"]');

            if (priceFinal) {
            price = parseInt(priceFinal.textContent.replace(/[₩,]/g, ''), 10);
            } else if (priceLarge) {
            price = parseInt(priceLarge.textContent.replace(/[₩,]/g, ''), 10);
            }

            if (priceOriginal) {
            fixedPrice = parseInt(priceOriginal.textContent.replace(/[₩,]/g, ''), 10);
            }
        }         
    
        // --- 사이즈 및 추가 옵션 가격 추출 (클릭 후 이미 펼쳐진 상태) ---
        let sizeString = '원사이즈';
        let addoptionpriceString = '0';

        const sizeElements = Array.from(document.querySelectorAll('ul[role="listbox"] li'));
        if (sizeElements.length > 0) {
            const sizesWithPrices = sizeElements
            .filter(el => el.getAttribute('role') === 'option')
            .map(el => {
                const sizeNumberSpan = el.querySelector('span.ltr-2pfgen-Body-BodyBold');
                const sizeDetailsSpans = el.querySelectorAll('span.ltr-1r5gb7q.e56f7b10');
                const sizeText = [
                sizeNumberSpan ? sizeNumberSpan.textContent.trim().replace(',', '.') : '',
                ...Array.from(sizeDetailsSpans).map(span => span.textContent.trim())
                ].filter(Boolean).join(' ');

                const optionPriceElement = el.querySelector('p[data-component="SizeSelectorOptionLabel"]');
                const optionPriceText = optionPriceElement?.textContent?.trim() || null;
                const optionPrice = optionPriceText
                ? parseInt(optionPriceText.replace(/[₩,]/g, ''), 10)
                : 0;
                const addoptionprice = optionPrice ? optionPrice - price : 0;

                return { size: sizeText, addoptionprice };
            })
            .filter(Boolean);

            sizeString = sizesWithPrices.map(e => e.size).join(', ');
            addoptionpriceString = sizesWithPrices.map(e => e.addoptionprice).join(', ');
        }

        // ---------------- 이미지 수집 ----------------

        let imageUrls: string[] = [];

        const normalizeFarfetchImageUrl = (
            src?: string | null
        ) => {

            if (
                !src ||
                !src.includes(
                    'cdn-images.farfetch-contents.com'
                )
            ) {
                return '';
            }

            const baseUrl = src.split('?')[0];

            return baseUrl
                .replace('_300.jpg', '_1000.jpg')
                .replace('_480.jpg', '_1000.jpg')
                .replace('_600.jpg', '_1000.jpg')
                .replace('_800.jpg', '_1000.jpg');
        };

        /* =====================================================
        1️⃣ 메인 이미지
        ===================================================== */

        const mainImage = document.querySelector<HTMLImageElement>(
            '#selected-image img[data-component="Img"]'
        );

        if (mainImage) {

            const src = normalizeFarfetchImageUrl(
                mainImage.currentSrc || mainImage.src
            );

            if (src) {
                imageUrls.push(src);
            }
        }

        /* =====================================================
        2️⃣ 썸네일 이미지들
        ===================================================== */

        const thumbnailImages = Array.from(
            document.querySelectorAll<HTMLImageElement>(
                '[data-carousel-item-button="true"] img[data-component="Img"]'
            )
        );

        thumbnailImages.forEach((img) => {

            const src = normalizeFarfetchImageUrl(
                img.currentSrc || img.src
            );

            if (
                src &&
                src.includes('cdn-images')
            ) {

                imageUrls.push(src);
            }
        });

        /* =====================================================
        3️⃣ fallback
        ===================================================== */

        if (imageUrls.length === 0) {

            const globalImages = Array.from(
                document.querySelectorAll<HTMLImageElement>(
                    'img[data-component="Img"]'
                )
            );

            globalImages.forEach((img) => {

                const src = normalizeFarfetchImageUrl(
                    img.currentSrc || img.src
                );

                if (
                    src &&
                    src.includes('cdn-images')
                ) {

                    imageUrls.push(src);
                }
            });
        }

        /* =====================================================
        4️⃣ 중복 제거
        ===================================================== */

        imageUrls = [...new Set(imageUrls)];

        /* =====================================================
        5️⃣ 최종 체크
        ===================================================== */

        if (imageUrls.length === 0) {
            return null;
        }
    
        /* ---------------- STYLE ID ---------------- */
        // 상품 ID 영역에서 첫 번째 ltr span을 styleId로 사용
        let styleId = '';

        const pTags = Array.from(document.querySelectorAll('p'));

        const farfetchIdEl = pTags.find(p =>
            p.textContent?.includes('파페치 ID')
        );

        if (farfetchIdEl) {
            const span = farfetchIdEl.querySelector('span[dir="ltr"]');
            if (span) {
                styleId = span.textContent.trim();
            }
        }

        /* ---------------- MAIN INFO ---------------- */

        let mainInfoText = '';

        const accordionPanel =
        document.querySelector('div[data-component="AccordionPanel"]');

        if (accordionPanel) {

        accordionPanel.querySelectorAll('h4, p, li').forEach(node => {
            const text = node.textContent?.trim();
            if (!text) return;

            mainInfoText += text + '<br/>';
        });

        }

        /* ---------------- BRAND STYLE ID ---------------- */

        let brandstyleId = '';

        const brandStyleSpan = Array.from(
        document.querySelectorAll('div[data-component="AccordionPanel"] span[dir="ltr"]')
        ).find(span =>
        span.closest('p')?.textContent?.includes('브랜드 스타일 ID')
        );

        if (brandStyleSpan) {
        brandstyleId = brandStyleSpan.textContent.trim();
        }

        /* ---------------- CLEAN MAIN INFO ---------------- */

        const mainInfo = mainInfoText
        .replace(/파페치/gi, '')
        .replace(/파페치\s*ID:\s*\d+/gi, '')
        .replace(/브랜드\s*스타일\s*ID:\s*[A-Z0-9_-]+/gi, '')
        .replace(/상품\s*ID/gi, '')
        .replace(/\s{2,}/g, ' ')
        .trim();

        const cleanedMainInfo = mainInfo
        .split(/<br\s*\/?>/i)
        .map(text => text.replace(/\s{2,}/g, ' ').trim())
        .filter(text => {
            if (!text) return false;

            return !(
                /^(?:farfetch\s*)?id\s*:?\s*\d+$/i.test(text) ||
                /^(?:파페치\s*)?id\s*:?\s*\d+$/i.test(text) ||
                /^상품\s*id\s*:?\s*[\w-]+$/i.test(text) ||
                /^brand\s*style\s*id\s*:?\s*[\w-]+$/i.test(text) ||
                /^브랜드\s*스타일\s*id\s*:?\s*[\w-]+$/i.test(text)
            );
        })
        .join('<br/>')
        .replace(/(?:^|<br\s*\/?>)\s*(?:farfetch\s*)?id\s*:?\s*\d+\s*(?=<br\s*\/?>|$)/gi, '')
        .replace(/(?:^|<br\s*\/?>)\s*(?:파페치\s*)?id\s*:?\s*\d+\s*(?=<br\s*\/?>|$)/gi, '')
        .replace(/(?:^|<br\s*\/?>)\s*상품\s*id\s*:?\s*[\w-]+\s*(?=<br\s*\/?>|$)/gi, '')
        .replace(/(?:^|<br\s*\/?>)\s*brand\s*style\s*id\s*:?\s*[\w-]+\s*(?=<br\s*\/?>|$)/gi, '')
        .replace(/(?:^|<br\s*\/?>)\s*브랜드\s*스타일\s*id\s*:?\s*[\w-]+\s*(?=<br\s*\/?>|$)/gi, '')
        .replace(/(?:<br\s*\/?>\s*){2,}/gi, '<br/>')
        .replace(/^(?:<br\s*\/?>\s*)+|(?:<br\s*\/?>\s*)+$/gi, '')
        .trim();

        return { site, designer, title, price, fixedPrice, mainInfo: cleanedMainInfo, styleId, brandstyleId,imageUrls, size: sizeString, addoptionprice: addoptionpriceString };
    });

    if (!productDetails?.imageUrls?.length) {
        console.warn("❌ 이미지 없음 → 스킵:", productUrl);
        continue;
    }

    if (!productDetails || Object.entries(productDetails).some(([key, value]) => {
        if (key === 'fixedPrice') return false; // fixedPrice는 없어도 OK
        if (key === 'imageUrls') return false; // 이미 위에서 체크했으니 제외
        return value === null || value === undefined || value === ''; // 나머지는 검증
    })) {
    const missingFields = productDetails 
        ? Object.entries(productDetails)
            .filter(([key, value]) => {
            if (key === 'fixedPrice') return false;
            return value === null || value === undefined || value === '';
            })
            .map(([key]) => key)
        : ['productDetails object'];
    console.warn("❌ productDetails 누락:", missingFields.join(", "), " URL:", productUrl);
    continue;
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
            // existingProduct.title = productDetails.title;
            // existingProduct.designer = productDetails.designer;
            // existingProduct.brandstyleId = productDetails.brandstyleId;
            existingProduct.size = productDetails.size;
            existingProduct.price = productDetails.price;
            existingProduct.fixedPrice = productDetails.fixedPrice
            // existingProduct.mainInfo = productDetails.mainInfo;
            existingProduct.addoptionprice = productDetails.addoptionprice;
            existingProduct.touched = true;
            existingProduct.visitUrl = productUrl;
            existingProduct.godoMallCategoryCode = godoMallCategoryCode;
            existingProduct.platform = existingProduct.platform || account.platform;

            await this.productRepository.save(existingProduct);

            switch (existingProduct.platform) {
                case 'godomall': {
                    const xmlUrl = await this.r2Service.uploadXmlToR2ByService(
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
                    break;
                }
                case 'cafe24': {
                    await this.userService.assertRequestAvailable(customId, 1);
                    await this.cafe24Service.updateProductFromEntity({
                        product: existingProduct,
                        mallId: resolvedPartnerKey,
                        accessToken: resolvedApiKey,
                    });
                    await this.userService.consumeRequest(customId, 1);
                    break;
                }
                case 'makeshop': {
                    await this.userService.assertRequestAvailable(customId, 1);
                    await this.makeshopService.updateProductFromEntity({
                        product: existingProduct,
                        shopId: partnerKey,
                        apiKey,
                    });
                    await this.userService.consumeRequest(customId, 1);
                    break;
                }
                default: {
                    console.warn('Unsupported platform: ' + existingProduct.platform);
                    break;
                }
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
            newProduct.visitUrl = productUrl;
            newProduct.godoMallCategoryCode = godoMallCategoryCode;


            await this.productRepository.save(newProduct);

            switch (newProduct.platform) {
                case 'godomall': {
                    console.log('Created product: ' + productDetails.title);

                    const xmlUrl = await this.r2Service.uploadXmlToR2ByService(
                        newProduct.styleId,
                        newProduct,
                        newProduct.mainImageUrl,
                        newProduct.additionalImageUrls,
                        partnerKey,
                        apiKey,
                    );

                    await this.userService.assertRequestAvailable(customId, 1);
                    await this.godoMallService.registerProductWithXmlUrl(
                        partnerKey,
                        apiKey,
                        xmlUrl,
                        newProduct,
                        newProduct.styleId,
                    );
                    await this.userService.consumeRequest(customId, 1);
                    break;
                }
                case 'cafe24': {
                    await this.userService.assertRequestAvailable(customId, 1);
                    await this.cafe24Service.createProductFromEntity({
                        product: newProduct,
                        mallId: resolvedPartnerKey,
                        accessToken: resolvedApiKey,
                    });
                    await this.userService.consumeRequest(customId, 1);
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
                    break;
                }
                default: {
                    console.warn('Unsupported platform: ' + newProduct.platform);
                    break;
                }
            }

        }
    } 
    try {
        if (page && !page.isClosed()) {
            await page.close();
        }
    } catch (error: any) {
        if (error.message.includes("Session with given id not found")) {
            console.warn("⚠️ Puppeteer 세션이 이미 닫혀 있어서 page.close()를 건너뜀.");
        } else {
            console.error("❌ 페이지 닫기 중 오류 발생:", error);
        }
    }
    
    try {
        if (browser && browser.connected) {
            await browser.close();
        }
    } catch (error: any) {
        console.warn("⚠️ 브라우저 닫기 중 오류 발생:", error.message);
    }
        

    switch (account.platform) {
        case 'godomall': {
            await this.handleUnsoldProducts(siteUrl, partnerKey, apiKey, customId, accountPlatform);
            await this.godoMallService.finalizeXmlDeletion();
            break;
        }
        case 'cafe24': {
            await this.handleUnsoldCafe24Products(siteUrl, resolvedPartnerKey, resolvedApiKey, customId, accountPlatform);
            break;
        }
        case 'makeshop': {
            await this.handleUnsoldMakeshopProducts(siteUrl, partnerKey, apiKey, customId, accountPlatform);
            break;
        }
        default: {
            console.warn('Unsupported platform: ' + account.platform);
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

// // async getProductUpdate(visitUrl: string, goodsNo: string, customId: string, accountPlatform: string){
// const account = await this.hostingAccountRepository.findOne({
//   where: {
//     customId,
//     accountPlatform,
//   },
// });

// if (!account) {
//   console.error(`❌ 계정 없음: ${customId} / ${accountPlatform}`);
//   return;
// }

// const partnerKey = account.partnerKey;
// const apiKey = account.apiKey;
// //     const MAX_RETRY = 2;
// //     const proxyLines = await this.r2Service.loadBrightProxies1();
    
// //     const partnerKey = account.partnerKey;
// const apiKey = account.apiKey;
// //         where: {
//     goodsno: Number(goodsNo),
//     customId,
//     accountPlatform,
//   },
//     });
//     if (!product) return;

//     for (let attempt = 1; attempt <= MAX_RETRY; attempt++) {
//         const proxy = pickProxy(proxyLines);
//         const proxyArg = `--proxy-server=http://${proxy.host}:${proxy.port}`;

//         let browser: Browser | null = null;
//         let page: Page | null = null;

//         try {
//             browser = await puppeteer.launch({
//                 headless: true,
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
//                     '--window-size=1920,1080',
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

//             await page.setExtraHTTPHeaders({
//                 'accept-language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
//                 'sec-ch-ua': '"Chromium";v="145", "Google Chrome";v="145", "Not=A?Brand";v="8"',
//                 'sec-ch-ua-mobile': '?0',
//                 'sec-ch-ua-platform': '"Windows"',
//             });

//             await page.setViewport({ width: 1920, height: 1080 });
//             await page.setCacheEnabled(false);
//             await page.setRequestInterception(true);

//             page.on('request', (request) => {
//             // ✅ 요청 리소스 타입 확인
//             const resourceType = request.resourceType();

//             if (resourceType === 'image') {
//                 request.abort(); // 🔒 이미지 요청만 차단
//             } else {
//                 request.continue(); // ✅ 나머지는 정상 통과
//             }
//             });

            
//             const response = await page.goto(visitUrl, { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => null);
//             try {
//                 await page.waitForFunction(
//                     () =>
//                     document.querySelector('button[data-component="AddToBag"]') ||
//                     document.querySelector('button[aria-label*="쇼핑백"]') ||
//                     document.querySelector('button[aria-label*="Add to bag"]'),
//                     { timeout: 8000 }
//                 );
//             } catch {
//             }
//             await new Promise(resolve => setTimeout(resolve, 2000));
//             if (!response) {
//                 console.warn('❌ 페이지 응답 실패');
//                 continue;
//             }
//             const status = response.status();
//             if (status === 429 || status === 403) {
//                 console.warn(`🚫 차단 응답 (${status}) 재시도`);
//                 continue; // 🔥 여기서 끝
//             }
//             // const html = await response.text();
//             // // ✅ brandStyleId 로 변경
//             // const match =
//             //     html.match(/"brandStyleId":"([^"]+)"/) ||
//             //     html.match(/\\"brandStyleId\\":\\"([^"]+)\\"/);

//             // const brandstyleId = match?.[1] || '';




//             // ✅ 사이즈 버튼이 로딩될 때까지 대기 (최대 2초)
//             try {
//             await page.waitForSelector('div[role="combobox"][data-component="SizeSelectorLabel"]', {
//                 timeout: 2000,
//             });
//             } catch {
//             }

//             // 👇 evaluate 전에 사이즈 버튼이 있으면 클릭만 수행
//             const sizeButton = await page.$('div[role="combobox"][data-component="SizeSelectorLabel"]');
//             if (sizeButton) {
//             await sizeButton.click();
//             await new Promise((resolve) => setTimeout(resolve,1000));
//             }

//             const productDetails = await page.evaluate(async () => {
//                 // ---------------------------
//                 // 1️⃣ JSON-LD 파싱 (최우선)
//                 // ---------------------------
//                 let price = 0;
//                 let fixedPrice = 0;

//                 const ldJsonScripts = Array.from(
//                     document.querySelectorAll('script[type="application/ld+json"]')
//                 );

//                 for (const script of ldJsonScripts) {
//                     try {
//                     const json = JSON.parse(script.textContent || '');
//                     const offers = json?.offers || json?.hasVariant?.[0]?.offers;
//                     const specs = offers?.priceSpecification;

//                     if (Array.isArray(specs)) {
//                         for (const spec of specs) {
//                         if (spec.priceType?.includes('Strikethrough')) {
//                             fixedPrice = Number(spec.price);
//                         } else {
//                             price = Number(spec.price);
//                         }
//                         }
//                     }
//                     } catch {}
//                 }

//                 // ---------------------------
//                 // 2️⃣ JSON-LD 실패 시 DOM fallback
//                 // ---------------------------
//                 if (!price) {
//                     const priceFinal = document.querySelector('[data-component="PriceFinal"]');
//                     const priceLarge = document.querySelector('[data-component="PriceLarge"]');
//                     const priceOriginal = document.querySelector('[data-component="PriceOriginal"]');

//                     if (priceFinal) {
//                     price = parseInt(priceFinal.textContent.replace(/[₩,]/g, ''), 10);
//                     } else if (priceLarge) {
//                     price = parseInt(priceLarge.textContent.replace(/[₩,]/g, ''), 10);
//                     }

//                     if (priceOriginal) {
//                     fixedPrice = parseInt(priceOriginal.textContent.replace(/[₩,]/g, ''), 10);
//                     }
//                 }

//                 // ✅ 1. 쇼핑백 버튼 체크 (최우선)
//                 const addToBagBtn =
//                     document.querySelector('button[data-component="AddToBag"]') ||
//                     document.querySelector('button[aria-label*="쇼핑백"]') ||
//                     document.querySelector('button[aria-label*="Add to bag"]');

//                 // 👉 쇼핑백 버튼 없으면 무조건 품절
//                 if (!addToBagBtn) {
//                     return {
//                     soldOut: true,
//                     price: 0,
//                     fixedPrice: 0,
//                     size: '',
//                     addoptionprice: '',
//                     };
//                 }
                
//                 // --- 사이즈 및 추가 옵션 가격 추출 (클릭 후 이미 펼쳐진 상태) ---
//                 let sizeString = '원사이즈';
//                 let addoptionpriceString = '0';

//                 const sizeElements = Array.from(document.querySelectorAll('ul[role="listbox"] li'));
//                 if (sizeElements.length > 0) {
//                     const sizesWithPrices = sizeElements
//                     .filter(el => el.getAttribute('role') === 'option')
//                     .map(el => {
//                         const sizeNumberSpan = el.querySelector('span.ltr-2pfgen-Body-BodyBold');
//                         const sizeDetailsSpans = el.querySelectorAll('span.ltr-1r5gb7q.e56f7b10');
//                         const sizeText = [
//                         sizeNumberSpan ? sizeNumberSpan.textContent.trim().replace(',', '.') : '',
//                         ...Array.from(sizeDetailsSpans).map(span => span.textContent.trim())
//                         ].filter(Boolean).join(' ');

//                         const optionPriceElement = el.querySelector('div.ltr-t7jvb2');
//                         const optionPriceText = optionPriceElement?.textContent?.trim() || null;
//                         const optionPrice = optionPriceText ? parseInt(optionPriceText.replace(/[₩,]/g, '')) : 0;
//                         const addoptionprice = optionPrice ? optionPrice - price : 0;

//                         return { size: sizeText, addoptionprice };
//                     })
//                     .filter(Boolean);

//                     sizeString = sizesWithPrices.map(e => e.size).join(', ');
//                     addoptionpriceString = sizesWithPrices.map(e => e.addoptionprice).join(', ');
//                 }

//                 const soldOut = price === 0 || !sizeString || sizeString.length === 0;
                
//                 return { price, fixedPrice, size: sizeString, addoptionprice: addoptionpriceString, soldOut };
//             });


//             if (!productDetails) {
//                 continue;
//             }

//             if (!productDetails.soldOut) {
//             // ✅ 정상일 때만 DB 업데이트
//             product.price = productDetails.price;
//             product.fixedPrice = productDetails.fixedPrice;
//             product.size = productDetails.size;
//             product.addoptionprice = productDetails.addoptionprice;
//             // product.brandstyleId = brandstyleId;
//             product.lastModifiedDate = new Date();
//             await this.productRepository.save(product);
//             }

//             // ✅ 1️⃣ XML 생성 및 R2 업로드
//             const xmlUrl = await this.r2Service.uploadXmlToR2Update(
//             product,
//             product.styleId,
//             partnerKey,
//             productDetails.soldOut
//             );

//             // ✅ 업로드 실패 시 안전하게 중단
//             if (!xmlUrl) {
//             console.error(`❌ XML 업로드 실패 → ${product.designer} ${product.title}`);
//             return;
//             }

//             // ✅ 2️⃣ 고도몰로 상품 등록/수정 API 호출
//             const partnerKey = product.partnerKey;
//             const apiKey = product.apiKey;
//             await this.godoMallService.registerProductWithXmlUrl(
//             partnerKey,
//             apiKey,
//             xmlUrl,
//             product,
//             product.styleId
//             );

//             // ✅ WebSocket으로 고도몰에 알림 전송
//             this.gateway.sendProductUpdate(
//   `${customId}:${accountPlatform}:${goodsNo}`,
//   {
//             status: 'success',
//             price: product.price,
//             size: product.size,
//             updatedAt: new Date().toISOString(),
//             });

//             // ✅ 3️⃣ 고도몰 반영 후 XML 바로 삭제
//             await this.godoMallService.deleteUpdateXml(xmlUrl);

//             console.log(`✅ ${product.designer} 상품 업데이트 완료`);
//             return;

//         } catch (err: any) {
//             console.warn(`🚨 farfetch 업데이트 실패: ${err.message}`);
//         } finally {
//             if (page && !page.isClosed()) await page.close();
//             if (browser) await browser.close();
//         }
//     }
//     console.error('❌ 모든 프록시 재시도 실패 → 업데이트 포기 (기존값 유지)');
// }



async getProductUpdate(visitUrl: string, goodsNo: string, customId: string, accountPlatform: string) {
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
        const MAX_RETRY = 5;
        let proxyLines = await this.r2Service.loadBrightProxies1();
        if (!proxyLines.length) {
            proxyLines = await this.r2Service.loadBrightProxies2();
        }
        if (!proxyLines.length) {
            console.warn('Farfetch update proxy list is empty');
            return;
        }
        
        const product = await this.productRepository.findOne({
            where: {
                goodsno: Number(goodsNo),
                customId,
                accountPlatform,
            },
        });
        if (!product) return;

        const farfetchUserAgent =
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36';
        const farfetchAcceptLanguage = 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7';
        const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
        const farfetchProfileRoot = `${process.cwd()}\\farfetch-puppeteer-profiles`;
        if (!fs.existsSync(farfetchProfileRoot)) {
            fs.mkdirSync(farfetchProfileRoot, { recursive: true });
        }
        const getFarfetchProfileDir = (proxy: ReturnType<typeof parseAuthProxy>) => {
            const randomId =
                typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
                    ? crypto.randomUUID()
                    : `${Date.now()}_${Math.random().toString(36).slice(2)}`;
            const key = `${proxy.host}_${proxy.port}_${randomId}`
                .replace(/[^a-zA-Z0-9_-]/g, '_')
                .slice(0, 120);
            return `${farfetchProfileRoot}\\${key}`;
        };
        const getFarfetchChromeExecutablePath = () => {
            const candidates = [
                'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
                'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
                process.env.LOCALAPPDATA ? `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe` : '',
            ].filter(Boolean);
            return candidates.find(candidate => fs.existsSync(candidate));
        };
        const getFarfetchRefererUrl = (targetUrl: string) => {
            try {
                const url = new URL(targetUrl);
                const gender = url.pathname.includes('/women/') ? 'women' : 'men';
                return `${url.origin}/kr/shopping/${gender}/items.aspx`;
            } catch {
                return 'https://www.farfetch.com/kr/shopping/men/items.aspx';
            }
        };
        const isBlockedHtml = (html: string) => {
            const text = (html || '').toLowerCase();
            return (
                text.includes('access denied') ||
                text.includes("you don't have permission") ||
                text.includes('errors.edgesuite.net') ||
                text.includes('akamai') ||
                text.includes('akamaighost') ||
                text.includes('request unsuccessful') ||
                text.includes('request was blocked') ||
                text.includes('captcha') ||
                text.includes('reference #')
            );
        };
        const isSameFarfetchProductUrl = (left: string, right: string) => {
            try {
                const leftUrl = new URL(left, 'https://www.farfetch.com');
                const rightUrl = new URL(right, 'https://www.farfetch.com');
                return leftUrl.pathname === rightUrl.pathname;
            } catch {
                return left === right;
            }
        };

        for (let attempt = 1; attempt <= MAX_RETRY; attempt++) {
            const proxy = pickProxy(proxyLines);
            const proxyArg = `--proxy-server=http://${proxy.host}:${proxy.port}`;
            const normalizedVisitUrl = visitUrl.replace(/^http:\/\//i, 'https://');
            const farfetchRefererUrl = getFarfetchRefererUrl(normalizedVisitUrl);
            const farfetchProfileDir = getFarfetchProfileDir(proxy);
            const farfetchChromeExecutablePath = getFarfetchChromeExecutablePath();
            if (!farfetchChromeExecutablePath) {
                console.warn('Farfetch update Chrome executable not found. Bundled Chromium may be blocked.');
            }

            let browser: Browser | null = null;
            let page: Page | null = null;

    try {
        // 1️⃣ 브라우저 실행
        browser = await puppeteer.launch({
            executablePath: farfetchChromeExecutablePath,
            headless: false,
            protocolTimeout: 60000,
            userDataDir: farfetchProfileDir,
            args: [
                proxyArg,
                '--remote-debugging-port=0',
                '--window-size=1920,1080',
                '--lang=ko-KR,ko,en-US,en',

                // 🔥 성능 핵심
                '--no-first-run',
                '--no-default-browser-check',
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',

                // ❗ Cloudflare 필수
                '--disable-blink-features=AutomationControlled',
                '--disable-features=IsolateOrigins,site-per-process,AutomationControlled',
                '--disable-infobars',
                '--disable-popup-blocking',
            ],
        });

        page = await browser.newPage();
        page.setDefaultNavigationTimeout(60000);
        page.setDefaultTimeout(30000);
        await page.authenticate({
            username: proxy.username,
            password: proxy.password,
        });

        await page.evaluateOnNewDocument(() => {
            Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
            Object.defineProperty(navigator, 'languages', { get: () => ['ko-KR', 'ko', 'en-US', 'en'] });
            Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
            Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 });
            Object.defineProperty(navigator, 'deviceMemory', { get: () => 8 });
            Object.defineProperty(navigator, 'platform', { get: () => 'Win32' });
            (window as any).chrome = (window as any).chrome || {};
            (window as any).chrome.runtime = (window as any).chrome.runtime || {};
        });

        await page.setViewport({
            width: 1920 + Math.floor(Math.random() * 40),
            height: 1080 + Math.floor(Math.random() * 30),
            deviceScaleFactor: 1,
        });

        await page.setUserAgent(farfetchUserAgent);

        await page.setExtraHTTPHeaders({
            'Accept-Language': farfetchAcceptLanguage,
            'Upgrade-Insecure-Requests': '1',
            'sec-ch-ua': '"Google Chrome";v="149", "Chromium";v="149", "Not)A;Brand";v="24"',
            'sec-ch-ua-arch': '"x86"',
            'sec-ch-ua-full-version-list': '"Google Chrome";v="149.0.7827.201", "Chromium";v="149.0.7827.201", "Not)A;Brand";v="24.0.0.0"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-model': '""',
            'sec-ch-ua-platform': '"Windows"',
            'sec-ch-ua-platform-version': '"15.0.0"',
        });
        await page.emulateTimezone('Asia/Seoul').catch(() => {});

        const client = await page.createCDPSession();
        await client.send('Network.enable').catch(() => {});
        await client.send('Network.setUserAgentOverride', {
            userAgent: farfetchUserAgent,
            acceptLanguage: farfetchAcceptLanguage,
            platform: 'Windows',
            userAgentMetadata: {
                brands: [
                    { brand: 'Google Chrome', version: '149' },
                    { brand: 'Chromium', version: '149' },
                    { brand: 'Not)A;Brand', version: '24' },
                ],
                fullVersionList: [
                    { brand: 'Google Chrome', version: '149.0.7827.201' },
                    { brand: 'Chromium', version: '149.0.7827.201' },
                    { brand: 'Not)A;Brand', version: '24.0.0.0' },
                ],
                fullVersion: '149.0.7827.201',
                platform: 'Windows',
                platformVersion: '15.0.0',
                architecture: 'x86',
                model: '',
                mobile: false,
                bitness: '64',
                wow64: false,
            },
        }).catch(() => {});

        // await page.setRequestInterception(true);
        // page.on('request', req => {
        //     const type = req.resourceType();
        //     if (type === 'image' || type === 'font') req.abort();
        //     else req.continue();
        // });

        // 2️⃣ 세션 생성용 진입
        console.log(`Farfetch update target URL: ${normalizedVisitUrl}`);
        console.log(`Farfetch update referer URL: ${farfetchRefererUrl}`);

        await page.goto(farfetchRefererUrl, {
            waitUntil: 'domcontentloaded',
            timeout: 45000,
        }).catch(() => null);
        await wait(2500 + Math.floor(Math.random() * 1500));

        const openedFromCategory = await page.evaluate((targetUrl) => {
            const normalizePath = (value: string) => {
                try {
                    return new URL(value, location.origin).pathname;
                } catch {
                    return value;
                }
            };
            const targetPath = normalizePath(targetUrl);
            const anchor = Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href]'))
                .find(link => normalizePath(link.href) === targetPath);
            if (!anchor) return false;
            anchor.scrollIntoView({ block: 'center', inline: 'center' });
            anchor.click();
            return true;
        }, normalizedVisitUrl).catch(() => false);

        let response = openedFromCategory
            ? await page.waitForNavigation({
                waitUntil: 'domcontentloaded',
                timeout: 45000,
            }).catch(() => null)
            : null;

        if (!response || !isSameFarfetchProductUrl(page.url(), normalizedVisitUrl)) {
            const directLinkId = 'farfetch-update-direct-product-link';
            await page.evaluate((targetUrl, linkId) => {
                let anchor = document.getElementById(linkId) as HTMLAnchorElement | null;
                if (!anchor) {
                    anchor = document.createElement('a');
                    anchor.id = linkId;
                    anchor.textContent = 'open product';
                    anchor.style.position = 'fixed';
                    anchor.style.left = '20px';
                    anchor.style.top = '20px';
                    anchor.style.zIndex = '2147483647';
                    anchor.style.background = '#fff';
                    anchor.style.color = '#000';
                    anchor.style.padding = '8px';
                    document.body.appendChild(anchor);
                }
                anchor.href = targetUrl;
            }, normalizedVisitUrl, directLinkId).catch(() => {});

            const directLink = await page.$(`#${directLinkId}`).catch(() => null);
            if (directLink) {
                response = await Promise.all([
                    page.waitForNavigation({
                        waitUntil: 'domcontentloaded',
                        timeout: 45000,
                    }).catch(() => null),
                    page.click(`#${directLinkId}`).catch(() => null),
                ]).then(([navigationResponse]) => navigationResponse);
            }
        }

        if (!response || !isSameFarfetchProductUrl(page.url(), normalizedVisitUrl)) {
            response = await page.goto(normalizedVisitUrl, {
                waitUntil: 'domcontentloaded',
                timeout: 45000,
                referer: farfetchRefererUrl,
            }).catch(() => null);
        }

        if (!response) throw new Error('NO_RESPONSE');
        const status = response.status();
        if (status === 403 || status === 429 || status >= 500) {
            console.warn(`Farfetch update blocked status ${status}. Waiting 5 seconds before retry.`);
            await wait(5000);
            const blockedTitle = await page.title().catch(() => '');
            const blockedPreview = await page.evaluate(() => (document.body?.innerText || '').slice(0, 300)).catch(() => '');
            const blockedCookies = await page.cookies().catch(() => []);
            console.warn(
                `Farfetch update debug: status=${status} responseUrl=${response.url()} currentUrl=${page.url()} title=${blockedTitle} cookies=${blockedCookies.length} body=${blockedPreview.replace(/\s+/g, ' ').trim()}`,
            );
            throw new Error(`BLOCKED_STATUS_${status}`);
        }
        if (!page.url().includes('/shopping/') || !page.url().includes('.aspx')) {
            throw new Error(`FARFETCH_REDIRECT_${page.url()}`);
        }

        await page.mouse.move(
            700 + Math.floor(Math.random() * 240),
            360 + Math.floor(Math.random() * 160),
            { steps: 12 },
        ).catch(() => {});

        await page.waitForFunction(
            () =>
                document.querySelector('script[type="application/ld+json"]') ||
                document.querySelector('[data-component="PriceFinal"]') ||
                document.querySelector('[data-component="PriceLarge"]') ||
                (document.body?.innerText || '').length > 1000,
            { timeout: 12000 },
        ).catch(() => {});
        await wait(1800 + Math.floor(Math.random() * 1800));

        // Use current browser DOM to avoid another protected fetch.
        const html = await page.content();
        if (page.url().includes('errors.edgesuite.net') || isBlockedHtml(html)) {
            console.warn('Farfetch update protection page detected. Waiting 5 seconds before retry.');
            await wait(5000);
            const blockedTitle = await page.title().catch(() => '');
            const blockedPreview = await page.evaluate(() => (document.body?.innerText || '').slice(0, 300)).catch(() => '');
            const blockedCookies = await page.cookies().catch(() => []);
            console.warn(
                `Farfetch update debug: status=${status} responseUrl=${response.url()} currentUrl=${page.url()} title=${blockedTitle} cookies=${blockedCookies.length} body=${blockedPreview.replace(/\s+/g, ' ').trim()}`,
            );
            throw new Error('AKAMAI_BLOCK');
        }

        // 4️⃣ HTML 파싱
        const $ = cheerio.load(html);

        let price = 0;
        let fixedPrice = 0;
        let soldOut = false;

        let sizeList: string[] = [];
        let addOptionPrices: number[] = [];

        /**
         * 5️⃣ JSON-LD 파싱 (가격 + 사이즈)
         */
        $('script[type="application/ld+json"]').each((_, el) => {
            try {
                const json = JSON.parse($(el).text());

                const offers =
                json?.offers ||
                json?.hasVariant?.[0]?.offers ||
                json?.hasVariant?.offers;

                // ✅ 가격
                const specs = offers?.priceSpecification;
                if (Array.isArray(specs)) {
                for (const spec of specs) {
                    if (spec.priceType?.includes('Strikethrough')) {
                    fixedPrice = Number(spec.price);
                    } else {
                    price = Number(spec.price);
                    }
                }
                }

                // ✅ 사이즈 (variant 기반) — ★ 여기 핵심 수정
                if (Array.isArray(json?.hasVariant)) {
                for (const v of json.hasVariant) {

                    // 🔥 1순위: schema.org size
                    let sizeName = v?.size?.toString().trim();

                    // 🔁 fallback: name에서 | 뒤만 사용
                    if (!sizeName && typeof v?.name === 'string') {
                    const parts = v.name.split('|');
                    sizeName = parts[parts.length - 1]?.trim();
                    }

                    if (!sizeName) continue;

                    sizeList.push(sizeName);

                    // 옵션 가격
                    let vPrice = price;
                    const vSpecs = v?.offers?.priceSpecification;
                    if (Array.isArray(vSpecs)) {
                    for (const sp of vSpecs) {
                        if (!sp.priceType?.includes('Strikethrough')) {
                        vPrice = Number(sp.price);
                        }
                    }
                    }

                    addOptionPrices.push(vPrice - price);
                }
                }
            } catch {}
        });


        // 6️⃣ 사이즈 fallback (JSON-LD에 없을 경우 HTML 기반)
        if (sizeList.length === 0) {
            $('ul[role="listbox"] li[role="option"]').each((_, el) => {
            const sizeText = $(el)
                .find('span')
                .map((_, s) => $(s).text().trim())
                .get()
                .filter(Boolean)
                .join(' ');

            if (sizeText) {
                sizeList.push(sizeText);
                addOptionPrices.push(0);
            }
            });
        }

        if (!price || sizeList.length === 0 || /sold\s*out/i.test(html)) {
            soldOut = true;
        }

        const productDetails = {
            price,
            fixedPrice,
            size: sizeList.join(', '),
            addoptionprice: addOptionPrices.join(', '),
            soldOut,
        };

        // 7️⃣ DB 업데이트
        if (!productDetails.soldOut) {
            product.price = productDetails.price;
            product.fixedPrice = productDetails.fixedPrice;
            product.size = productDetails.size;
            product.addoptionprice = productDetails.addoptionprice;
            product.lastModifiedDate = new Date();
            await this.productRepository.save(product);
        }

        // 8️⃣ XML 생성
        const xmlUrl = await this.r2Service.uploadXmlToR2Update(
            product,
            product.styleId,
            partnerKey,
            productDetails.soldOut
        );
        if (!xmlUrl) return;

        // 9️⃣ 고도몰 반영
        await this.userService.assertRequestAvailable(customId, 1);
        await this.godoMallService.registerProductWithXmlUrl(
            partnerKey,
            apiKey,
            xmlUrl,
            product,
            product.styleId
        );
        await this.userService.consumeRequest(customId, 1);

        // 🔟 알림
        this.gateway.sendProductUpdate(
            `${customId}:${accountPlatform}:${goodsNo}`,
            {
            status: 'success',
            price: product.price,
            size: product.size,
            updatedAt: new Date().toISOString(),
        });

        await this.godoMallService.deleteUpdateXml(xmlUrl);
        console.log(`✅ ${product.designer} 상품 업데이트 완료`);
        return;

        } catch (err: any) {
        console.warn(`🚨 farfetch 업데이트 실패: ${err.message}`);
        } finally {
        if (page && !page.isClosed()) await page.close();
        if (browser) await browser.close();
        if (farfetchProfileDir && fs.existsSync(farfetchProfileDir)) {
            try {
                fs.rmSync(farfetchProfileDir, { recursive: true, force: true });
            } catch (cleanupError: any) {
                console.warn(`Farfetch profile cleanup failed: ${cleanupError.message}`);
            }
        }
        }
    }

    console.error('❌ 모든 프록시 재시도 실패 → 업데이트 포기');
}
}
