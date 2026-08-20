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
import { GoogleTranslateService } from 'src/smartstore/google-translate.service';
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
export class AlaiaService {
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
        const allCategories: { categoryName: string; url: string; needsTranslation?: boolean }[] = [];

        const proxyLines = await this.r2Service.loadBrightProxies2();
        const proxy = pickProxy(proxyLines);
        const proxyArg = `--proxy-server=http://${proxy.host}:${proxy.port}`;

        for (const siteUrl of siteUrls) {
            let retryCount = 0;
            let success = false;

            while (retryCount < 3 && !success) {
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
                await page.setViewport({ width: 1920, height: 1080 });
                await page.setCacheEnabled(false);
                await page.setRequestInterception(true);
                page.on('request', (request) => {
                    const resourceType = request.resourceType();
                    if (resourceType === 'image' || resourceType === 'font') {
                        request.abort();
                    } else {
                        request.continue();
                    }
                });

                try {
                    await page.goto(siteUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    console.log(`Category crawl: ${siteUrl}`);

                    const categories = await page.evaluate((): { categoryName: string; url: string; needsTranslation?: boolean }[] => {
                        const results: { categoryName: string; url: string; needsTranslation?: boolean }[] = [];
                        const seen = new Set<string>();

                        const normalize = (value?: string | null): string =>
                            (value || '')
                                .replace(/\s+/g, ' ')
                                .replace(/\bNew\b/gi, '')
                                .replace(/\bNouveau\b/gi, '')
                                .trim();

                        const titleCaseSlug = (value?: string | null): string =>
                            normalize(value)
                                .split('-')
                                .filter(Boolean)
                                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                                .join(' ');

                        const badExactNames = new Set([
                            'garderob',
                            'mariage',
                            'collections',
                            'collection',
                            'uitgelicht',
                            'highlights',
                            'show',
                            'archetypes',
                            'about alaia',
                            'about alaïa',
                            'wishlist',
                            'book an appointment',
                            'store locator',
                            'maison roger vivier',
                        ]);

                        const isBadName = (name: string): boolean => {
                            const lower = normalize(name).toLowerCase();
                            return (
                                !lower ||
                                badExactNames.has(lower) ||
                                /^(summer fall|winter spring|summer spring|winter fall)\s+\d{2}$/i.test(lower)
                            );
                        };

                        const isBadUrl = (url: string): boolean => {
                            const lower = url.toLowerCase();
                            return [
                                '/account',
                                '/wishlist',
                                '/storelocator',
                                '/store-locator',
                                '/client-service',
                                '/contact',
                                '/history',
                                'book-luxury',
                                'savoir-faire',
                                'campaign',
                                'presentation',
                                'piece-unique',
                                'about-alaia',
                            ].some(token => lower.includes(token));
                        };

                        const addCategory = (categoryName: string, href: string | null, needsTranslation = false) => {
                            if (!categoryName || !href) return;

                            let absoluteUrl = '';
                            try {
                                absoluteUrl = new URL(href, location.origin).href.split('#')[0];
                            } catch {
                                return;
                            }

                            if (isBadUrl(absoluteUrl)) return;
                            if (seen.has(absoluteUrl)) return;
                            seen.add(absoluteUrl);

                            results.push({
                                categoryName: normalize(categoryName),
                                url: absoluteUrl,
                                needsTranslation,
                            });
                        };

                        const host = location.hostname.toLowerCase();

                        if (host.includes('cpcompany.com')) {
                            const groupLabels: Record<string, string> = {
                                clothing: 'Clothing',
                                accessories: 'Accessories',
                            };
                            const excludedSlugs = new Set(['spare-parts', 'publications']);

                            document.querySelectorAll('a[role="menuitem"][href*="/shop/main-collection/"]').forEach(element => {
                                const anchor = element as HTMLAnchorElement;
                                const href = anchor.getAttribute('href');
                                if (!href) return;

                                const url = new URL(href, location.origin);
                                const segments = url.pathname.toLowerCase().split('/').filter(Boolean);
                                const baseIndex = segments.indexOf('main-collection');
                                const group = segments[baseIndex + 1];
                                const slug = segments[baseIndex + 2];
                                if (!groupLabels[group] || !slug || excludedSlugs.has(slug)) return;

                                const name = normalize(anchor.textContent) || titleCaseSlug(slug);
                                if (isBadName(name)) return;

                                addCategory(`MAIN COLLECTION - ${groupLabels[group]} - ${name}`, href);
                            });
                        }

                        if (host.includes('maison-alaia.com')) {
                            const groupLabels: Record<string, string> = {
                                'ready-to-wear': 'Ready To Wear',
                                bags: 'Bags',
                                shoes: 'Shoes',
                                accessories: 'Accessories',
                            };

                            document.querySelectorAll('a[href*="/en-nl/cat/"]').forEach(element => {
                                const anchor = element as HTMLAnchorElement;
                                const href = anchor.getAttribute('href');
                                if (!href || href.includes('.html')) return;

                                const url = new URL(href, location.origin);
                                const segments = url.pathname.split('/').filter(Boolean);
                                const catIndex = segments.indexOf('cat');
                                const group = segments[catIndex + 1];
                                if (!groupLabels[group]) return;

                                let name = normalize(anchor.textContent);
                                if (!name || /^image link/i.test(name) || /^see all$/i.test(name)) {
                                    const slug = segments[catIndex + 2] || group;
                                    name = slug === group ? groupLabels[group] : titleCaseSlug(slug);
                                }
                                if (isBadName(name)) return;

                                const categoryName = name === groupLabels[group]
                                    ? `WOMEN - ${groupLabels[group]}`
                                    : `WOMEN - ${groupLabels[group]} - ${name}`;
                                addCategory(categoryName, href);
                            });
                        }

                        if (host.includes('toteme.com')) {
                            const allowedTop = new Set(['Ready-to-wear', 'Bags', 'Shoes', 'Jewelry', 'Accessories']);

                            document.querySelectorAll('a[data-theme-gtm-category="Shop"][href]').forEach(element => {
                                const anchor = element as HTMLAnchorElement;
                                const href = anchor.getAttribute('href');
                                if (!href) return;

                                const url = new URL(href, location.origin);
                                const path = url.pathname.toLowerCase();
                                if (!path.includes('/collections/') && !path.includes('/pages/denim')) return;
                                if (path.includes('garderob')) return;

                                const level = anchor.getAttribute('data-theme-gtm-level') || '';
                                const group = normalize(anchor.getAttribute('data-theme-gtm-sub-category'));
                                const name = normalize(anchor.getAttribute('data-theme-gtm-text') || anchor.textContent);
                                if (isBadName(name)) return;

                                if (level === 'secondary' && allowedTop.has(name)) {
                                    addCategory(`WOMEN - ${name}`, href);
                                }

                                if (level === 'tertiary') {
                                    if (/^shop all$/i.test(name)) return;
                                    if (!group || isBadName(group) || !allowedTop.has(group)) return;
                                    addCategory(`WOMEN - ${group} - ${name}`, href);
                                }
                            });
                        }

                        if (host.includes('delvaux.com')) {
                            const groupLabels: Record<string, string> = {
                                handtassen: 'Handtassen',
                                'kleine-lederwaren': 'Kleine lederwaren',
                                accessoires: 'Accessoires',
                            };

                            document.querySelectorAll('a.navigation-open__item[href*="/nl/producten/lijst/"]').forEach(element => {
                                const anchor = element as HTMLAnchorElement;
                                const href = anchor.getAttribute('href');
                                if (!href) return;

                                const url = new URL(href, location.origin);
                                const segments = url.pathname.toLowerCase().split('/').filter(Boolean);
                                const listIndex = segments.indexOf('lijst');
                                const group = segments[listIndex + 1];
                                if (!groupLabels[group]) return;

                                const name = normalize(anchor.textContent) || titleCaseSlug(segments[listIndex + 2]);
                                if (isBadName(name)) return;

                                addCategory(`${groupLabels[group]} - ${name}`, href, true);
                            });
                        }

                        if (host.includes('rogervivier.com')) {
                            const allowedParents = new Set(['souliers', 'sacs & petite maroquinerie', 'accessoires']);

                            Array.from(document.querySelectorAll('li.Header-nav-item')).forEach(item => {
                                const parentTitle = normalize(item.querySelector('.Header-nav-title')?.textContent);
                                if (!allowedParents.has(parentTitle.toLowerCase())) return;

                                let container: Element | null = item.nextElementSibling;
                                while (container && !container.classList.contains('Header-nav-content-container')) {
                                    container = container.nextElementSibling;
                                }
                                if (!container) return;

                                container.querySelectorAll('.Header-nav-subtitle a[href]').forEach(element => {
                                    const anchor = element as HTMLAnchorElement;
                                    const href = anchor.getAttribute('href');
                                    const firstSpan = anchor.querySelector('span:not(.additional-label)');
                                    const name = normalize(firstSpan?.textContent || anchor.textContent);
                                    if (isBadName(name)) return;

                                    addCategory(`${parentTitle} - ${name}`, href, true);
                                });
                            });
                        }

                        return results;
                    });

                    allCategories.push(...categories);
                    success = true;
                } catch (error: any) {
                    retryCount++;
                    console.error(`[${siteUrl}] category crawl failed (${retryCount}/3): ${error.message}`);
                } finally {
                    await browser.close();
                }
            }

            if (!success) {
                console.warn(`[${siteUrl}] category crawl skipped after 3 retries.`);
            }
        }

        const translatedCategories: { categoryName: string; url: string }[] = [];
        const finalSeen = new Set<string>();

        for (const cat of allCategories) {
            if (finalSeen.has(cat.url)) continue;
            finalSeen.add(cat.url);

            let categoryName = cat.categoryName;
            if (cat.needsTranslation) {
                try {
                    categoryName = await this.googleTranslateService.translateTextToEnglish(cat.categoryName);
                } catch (error: any) {
                    console.warn(`Category translation failed: ${cat.categoryName} - ${error.message}`);
                }
            }

            translatedCategories.push({
                categoryName,
                url: cat.url,
            });
        }

        console.log(`Category crawl complete: ${translatedCategories.length}`);
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
  
  
    
  
    // 알라이아 사이트 크롤링 시작
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

                const listingUrl = `${siteUrl}?start=0&sz=500&newPageSize=24`;

                await page.goto(listingUrl, {
                    waitUntil: 'domcontentloaded',
                    timeout: 20000
                }).catch(() => null);

                await page.waitForSelector('.region.product-item-wrapper .product[data-pid], .product[data-pid] a.plp-images[href], .product[data-pid] a.link[href]', {
                    timeout: 30000
                });

                productUrls = await page.evaluate(() => {
                    const urls = new Set<string>();
                    const normalizeText = (value: string | null | undefined) =>
                        (value || '').replace(/\s+/g, ' ').trim().toLowerCase();

                    const addUrl = (href: string | null) => {
                        if (!href || !href.includes('/product/')) return;
                        const absoluteUrl = href.startsWith('http') ? href : new URL(href, location.origin).href;
                        urls.add(absoluteUrl.split('?')[0]);
                    };

                    document.querySelectorAll('.region.product-item-wrapper .product[data-pid], .product[data-pid]').forEach(el => {
                        const tile = el.querySelector('.product-tile');
                        if (tile?.classList.contains('sold-out')) return;

                        const tileText = normalizeText(el.textContent);
                        const preorderText = normalizeText(el.querySelector('.notify-me-wrapper, .notify-me-label')?.textContent);
                        if (
                            tileText.includes('pre-order') ||
                            tileText.includes('preorder') ||
                            preorderText.includes('pre-order') ||
                            preorderText.includes('preorder')
                        ) {
                            return;
                        }

                        el.querySelectorAll('a.plp-images[href], a.link[href], a.view-product-cta[href], a[href*="/product/"][href]').forEach(anchor => {
                            addUrl(anchor.getAttribute('href'));
                        });
                    });

                    return Array.from(urls);
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
        console.log(`알라이아 최종 수집된 상품 URL 수: ${productUrls.length} - ${category?.categoryName || '카테고리 없음'}`);


        for (const [index, productUrl] of productUrls.entries()) {
            let loadAttempts = 0;

            while (loadAttempts < 10) {
                try {
                    if(!browser){
                        const proxy = pickProxy(proxyLines);
                        const proxyArg = `--proxy-server=http://${proxy.host}:${proxy.port}`;
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
                    console.log(`✅ (${index + 1}/${productUrls.length}) 알라이아 ${category?.categoryName || '카테고리 없음'}  수집 중`);
                    await page.waitForFunction(() => {
                        const hasProductJson = Array.from(document.querySelectorAll('script[type="application/ld+json"]'))
                            .some(script => {
                                const text = script.textContent || '';
                                return text.includes('"ProductGroup"') || text.includes('"Product"');
                            });
                        const hasProductDom = Boolean(
                            document.querySelector('.pdp-image-carousel .aal-product-image') ||
                            document.querySelector('#pdpAttrGroupAccordion') ||
                            document.querySelector('.cart-and-ipay, .normal-label')
                        );
                        return hasProductJson && hasProductDom;
                    }, { timeout: 15000 }).catch(() => {});
                    break; // ✅ 로딩 성공 시 루프 종료
                } catch (error: any) {
                    loadAttempts++;
                    console.warn(`알라이아 페이지 로드 실패 [${error.message}] (프록시 변경 ${loadAttempts}/3): ${error.message}`);
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


            const productDetails = await page.evaluate(() => {
                const site = 'Alaia';
                const designer = '알라이아';
                const normalizeText = (value: string | null | undefined) =>
                    (value || '').replace(/\s+/g, ' ').trim();
                const normalizeSku = (value: string | null | undefined) =>
                    normalizeText(value).replace(/[^a-z0-9]/gi, '').toUpperCase();
                const parsePrice = (value: unknown) => {
                    if (typeof value === 'number') return Math.floor(value);
                    const raw = normalizeText(String(value || ''));
                    if (!raw) return 0;
                    const cleaned = raw
                        .replace(/[^\d.,]/g, '')
                        .replace(/[.,](?=\d{3}(?:\D|$))/g, '')
                        .replace(',', '.');
                    const parsed = Number.parseFloat(cleaned);
                    return Number.isFinite(parsed) ? Math.floor(parsed) : 0;
                };
                const textWithBreaks = (element: Element | null) => {
                    if (!element) return '';
                    const clone = element.cloneNode(true) as HTMLElement;
                    clone.querySelectorAll('script, style, link, button, a').forEach(el => el.remove());
                    clone.querySelectorAll('br').forEach(br => br.replaceWith('\n'));
                    return clone.textContent
                        ?.split('\n')
                        .map(line => normalizeText(line))
                        .filter(Boolean)
                        .join('\n') || '';
                };
                const currentProductId =
                    document.querySelector('#measmerize-script')?.getAttribute('data-product-code') ||
                    document.querySelector('[data-product-code]')?.getAttribute('data-product-code') ||
                    (location.pathname.match(/-([A-Z0-9]+)\.html/i)?.[1] || '');
                const normalizedCurrentProductId = normalizeSku(currentProductId);

                const jsonObjects: any[] = [];
                const collectJsonObjects = (value: any) => {
                    if (!value) return;
                    if (Array.isArray(value)) {
                        value.forEach(collectJsonObjects);
                        return;
                    }
                    if (typeof value !== 'object') return;
                    jsonObjects.push(value);
                    Object.values(value).forEach(collectJsonObjects);
                };

                document.querySelectorAll('script[type="application/ld+json"]').forEach(script => {
                    const raw = script.textContent?.trim();
                    if (!raw) return;
                    try {
                        collectJsonObjects(JSON.parse(raw));
                    } catch {
                    }
                });

                const getTypeText = (item: any) => normalizeText(Array.isArray(item?.['@type']) ? item['@type'].join(' ') : item?.['@type']).toLowerCase();
                const productCandidates = jsonObjects.filter(item => {
                    const typeValue = getTypeText(item);
                    return typeValue.includes('product') || Boolean(item.productGroupID || item.sku || item.offers);
                });
                const productGroups = productCandidates.filter(item => getTypeText(item).includes('productgroup'));
                const matchesCurrentProduct = (item: any) => {
                    const ids = [
                        item?.productGroupID,
                        item?.sku,
                        item?.productID,
                        item?.mpn,
                        item?.model,
                    ].filter(Boolean).map((value: unknown) => normalizeSku(String(value)));
                    const images = Array.isArray(item?.image) ? item.image : [item?.image].filter(Boolean);
                    return ids.some(id => id && normalizedCurrentProductId && (id === normalizedCurrentProductId || id.includes(normalizedCurrentProductId) || normalizedCurrentProductId.includes(id))) ||
                        images.some((image: unknown) => normalizeSku(String(image)).includes(normalizedCurrentProductId));
                };
                const matchedProductGroup = productGroups.find(matchesCurrentProduct);
                const matchedProductJson = productCandidates.find(matchesCurrentProduct);
                const productJson = matchedProductGroup || matchedProductJson || (!normalizedCurrentProductId ? productGroups[0] || productCandidates[0] : {}) || {};
                const variantSource = Array.isArray(productJson.hasVariant) ? productJson.hasVariant : [];
                const variants = variantSource.length
                    ? variantSource
                    : productCandidates.filter(item => {
                        if (item === productJson) return false;
                        const itemGroup = normalizeSku(String(item.productGroupID || ''));
                        const groupId = normalizeSku(String(productJson.productGroupID || productJson.sku || ''));
                        return itemGroup && groupId && itemGroup === groupId;
                    });
                const getOffers = (json: any) => Array.isArray(json?.offers) ? json.offers : [json?.offers].filter(Boolean);
                const getAvailability = (json: any) => getOffers(json)
                    .map((offer: any) => normalizeText(offer?.availability).toLowerCase())
                    .join(' ');
                const isVariantInStock = (variant: any) => {
                    const availability = getAvailability(variant);
                    if (!availability) return true;
                    return !availability.includes('outofstock') && !availability.includes('soldout');
                };
                const inStockVariants = variants.filter(isVariantInStock);
                const getOfferPrice = (json: any) => {
                    const offers = getOffers(json);
                    for (const offer of offers) {
                        const offerPrice = parsePrice(offer?.price || offer?.lowPrice || offer?.highPrice);
                        if (offerPrice) return offerPrice;
                    }
                    return 0;
                };

                let soldOut = variants.length > 0 && inStockVariants.length === 0;
                const purchaseText = Array.from(document.querySelectorAll('.normal-label, .add-to-cart-actions, .cart-and-ipay'))
                    .map(el => normalizeText(el.textContent).toLowerCase())
                    .join(' ');
                if (
                    purchaseText.includes('pre-order') ||
                    purchaseText.includes('preorder') ||
                    purchaseText.includes('notify') ||
                    purchaseText.includes('sold out') ||
                    purchaseText.includes('coming soon')
                ) {
                    soldOut = true;
                }

                const title =
                    normalizeText(productJson.name) ||
                    normalizeText(document.querySelector('h1.product-name')?.textContent) ||
                    normalizeText(document.querySelector('.product-name')?.textContent);
                const price =
                    inStockVariants.map(getOfferPrice).find(Boolean) ||
                    variants.map(getOfferPrice).find(Boolean) ||
                    getOfferPrice(productJson) ||
                    parsePrice(document.querySelector('.normal-label .sales, .prices .sales, .price .sales, .sales')?.textContent);
                const color =
                    normalizeText(productJson.color) ||
                    normalizeText(document.querySelector('.color-attribute.selected .color-name, [data-attr="color"] .selected-value, .color-name')?.textContent);

                const normalizeUrl = (url: string | null | undefined) => {
                    if (!url) return '';
                    const cleanUrl = url.replace(/&amp;/g, '&').trim();
                    if (!cleanUrl) return '';
                    if (cleanUrl.startsWith('//')) return 'https:' + cleanUrl;
                    if (cleanUrl.startsWith('/')) return new URL(cleanUrl, location.origin).href;
                    return cleanUrl;
                };
                const imageCandidates: string[] = [];
                const pushImage = (value: any) => {
                    if (!value) return;
                    const url = normalizeUrl(String(value));
                    if (!url) return;
                    imageCandidates.push(url);
                };

                (Array.isArray(productJson.image) ? productJson.image : [productJson.image].filter(Boolean)).forEach(pushImage);

                if (!imageCandidates.length) {
                    document.querySelectorAll('.pdp-image-carousel .aal-product-image').forEach(item => {
                        const anchor = item.querySelector('a.pdp-image-item[href], a[href*="/dw/image/"]') as HTMLAnchorElement | null;
                        const image = item.querySelector('img[itemprop="image"], img[src], img[data-src]') as HTMLImageElement | null;

                        pushImage(anchor?.getAttribute('href'));
                        pushImage(image?.getAttribute('src'));

                        const srcset = image?.getAttribute('srcset');
                        if (srcset) {
                            const largest = srcset
                                .split(',')
                                .map(part => part.trim().split(/\s+/)[0])
                                .filter(Boolean)
                                .pop();
                            pushImage(largest);
                        }
                    });
                }

                const normalizedImageProductId = normalizeSku(String(productJson.productGroupID || productJson.sku || currentProductId));
                const imageUrls = Array.from(new Set(
                    imageCandidates
                        .map(normalizeUrl)
                        .filter(url => url.includes('/dw/image') && url.includes('/images/all-images/'))
                        .filter(url => !normalizedImageProductId || normalizeSku(url).includes(normalizedImageProductId))
                )).slice(0, 9);

                let size = '원사이즈';
                const variantSizes = Array.from(new Set(
                    inStockVariants
                        .map(variant => normalizeText(variant.size))
                        .filter(Boolean)
                        .map(value => /^(tu|one size|onesize|accessories_os)$/i.test(value) ? '원사이즈' : value)
                ));
                if (variantSizes.length) {
                    size = variantSizes.join(',');
                } else {
                    const sizeInputs = Array.from(document.querySelectorAll('[data-attr="size"] input[name="attribute-radio-size"], [data-attr="size"] input.options-select[data-attr-value]'));
                    if (sizeInputs.length) {
                    const sizes = Array.from(new Set(
                        sizeInputs
                            .filter(input => {
                                const radio = input as HTMLInputElement;
                                return !radio.disabled && !radio.hasAttribute('disabled');
                            })
                            .map(input => {
                                const label = input.closest('.attribute-item')?.querySelector('label');
                                const valueEl = label?.querySelector('.attribute-value');
                                const valueClone = valueEl?.cloneNode(true) as HTMLElement | undefined;
                                valueClone?.querySelectorAll('.attribute-selected-icon').forEach(el => el.remove());
                                const labelText = normalizeText(valueClone?.textContent || label?.textContent);
                                return labelText || normalizeText(input.getAttribute('data-attr-value'));
                            })
                            .filter(Boolean)
                            .map(value => value === 'TU' ? '원사이즈' : value)
                    ));

                    if (sizes.length) {
                        size = sizes.join(',');
                    } else {
                        soldOut = true;
                    }
                }
                }

                const mainInfoParts: string[] = [];
                const pushInfo = (value: string | null | undefined) => {
                    const lines = (value || '')
                        .split('\n')
                        .map(line => normalizeText(line))
                        .filter(Boolean);
                    const cleaned = lines.join('\n');
                    if (!cleaned || cleaned.length < 3) return;
                    if (!mainInfoParts.includes(cleaned)) mainInfoParts.push(cleaned);
                };

                pushInfo(productJson.description);
                pushInfo(productJson.material);
                document.querySelectorAll('#pdpAttrGroupAccordion .pdp-attr-group').forEach(group => {
                    const heading = normalizeText(group.querySelector('.pdp-attr-group-title span, .slider-heading h2')?.textContent);
                    const loweredHeading = heading.toLowerCase();
                    if (
                        loweredHeading.includes('delivery') ||
                        loweredHeading.includes('returns') ||
                        loweredHeading.includes('customer services')
                    ) {
                        return;
                    }
                    const body = textWithBreaks(group.querySelector('.slider-body.accordion-body, .accordion-body, .slider-body'));
                    if (!body) return;
                    pushInfo(heading ? heading + '\n' + body : body);
                });
                const mainInfo = mainInfoParts.join('\n\n');
                const madeIn = mainInfo.match(/made\s+in\s+([A-Za-z]+)/i)?.[1] || '';
                const styleId =
                    normalizeText(productJson.productGroupID) ||
                    normalizeText(productJson.sku) ||
                    currentProductId;
                const brandstyleId = styleId;

                return {
                    site,
                    designer,
                    title,
                    price,
                    color,
                    size,
                    soldOut,
                    mainInfo,
                    madeIn,
                    styleId,
                    brandstyleId,
                    imageUrls
                };
            });

            // 🔴 전부 품절
            if (!productDetails || productDetails.soldOut) {
                console.warn('알라이아 상품 품절 - 다음 productUrl로 이동');
                continue;
            }
            

            if (!productDetails || !productDetails.mainInfo || !productDetails.styleId || !productDetails.title || !productDetails.price || !productDetails.imageUrls.length || !productDetails.size || !productDetails.brandstyleId) {
                console.warn('알라이아 데이터 누락 - 다음 productUrl로 이동');
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
        
                const imageUrls = (productDetails.imageUrls || [])
                    .filter((url): url is string => typeof url === 'string' && !!url);
                const [mainImageUrl, ...restImages] = imageUrls;
        
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
    ){
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
            });
        } else {
            console.log(`🆕 스마트스토어 신규 등록: ${product.designer} ${product.title}`);
            // imageData 객체를 추가 파라미터로 전달
            const response = await this.smartstoreApiService.createSmartStoreProduct(
                product,
                smartstoreAuth,
                imageData,
                godoMallCategoryName
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
                await page.waitForFunction(() => {
                    const hasProductJson = Array.from(document.querySelectorAll('script[type="application/ld+json"]'))
                        .some(script => {
                            const text = script.textContent || '';
                            return text.includes('"ProductGroup"') || text.includes('"Product"');
                        });
                    const hasProductDom = Boolean(
                        document.querySelector('[data-attr="size"]') ||
                        document.querySelector('.cart-and-ipay, .normal-label, .add-to-cart-actions')
                    );
                    return hasProductJson && hasProductDom;
                }, { timeout: 15000 }).catch(() => {});

                const productDetails = await page.evaluate(() => {
                    const normalizeText = (value: string | null | undefined) =>
                        (value || '').replace(/\s+/g, ' ').trim();
                    const parsePrice = (value: unknown) => {
                        if (typeof value === 'number') return Math.floor(value);
                        const raw = normalizeText(String(value || ''));
                        if (!raw) return 0;
                        const cleaned = raw
                            .replace(/[^\d.,]/g, '')
                            .replace(/[.,](?=\d{3}(?:\D|$))/g, '')
                            .replace(',', '.');
                        const parsed = Number.parseFloat(cleaned);
                        return Number.isFinite(parsed) ? Math.floor(parsed) : 0;
                    };

                    let soldOut = false;
                    const purchaseText = Array.from(document.querySelectorAll('.normal-label, .add-to-cart-actions, .cart-and-ipay'))
                        .map(el => normalizeText(el.textContent).toLowerCase())
                        .join(' ');
                    if (
                        purchaseText.includes('pre-order') ||
                        purchaseText.includes('preorder') ||
                        purchaseText.includes('notify') ||
                        purchaseText.includes('sold out') ||
                        purchaseText.includes('coming soon')
                    ) {
                        soldOut = true;
                    }

                    const jsonObjects: any[] = [];
                    const collectJsonObjects = (value: any) => {
                        if (!value) return;
                        if (Array.isArray(value)) {
                            value.forEach(collectJsonObjects);
                            return;
                        }
                        if (typeof value !== 'object') return;
                        jsonObjects.push(value);
                        Object.values(value).forEach(collectJsonObjects);
                    };

                    document.querySelectorAll('script[type="application/ld+json"]').forEach(script => {
                        const raw = script.textContent?.trim();
                        if (!raw) return;
                        try {
                            collectJsonObjects(JSON.parse(raw));
                        } catch {
                        }
                    });

                    const currentProductId = location.pathname.match(/-([A-Z0-9]+)\.html/i)?.[1] || '';
                    const normalizeSku = (value: string | null | undefined) =>
                        normalizeText(value).replace(/[^a-z0-9]/gi, '').toUpperCase();
                    const normalizedCurrentProductId = normalizeSku(currentProductId);
                    const getTypeText = (item: any) => normalizeText(Array.isArray(item?.['@type']) ? item['@type'].join(' ') : item?.['@type']).toLowerCase();
                    const productCandidates = jsonObjects.filter(item => {
                        const typeValue = getTypeText(item);
                        return typeValue.includes('product') || Boolean(item.productGroupID || item.sku || item.offers);
                    });
                    const productGroups = productCandidates.filter(item => getTypeText(item).includes('productgroup'));
                    const matchesCurrentProduct = (item: any) => {
                        const ids = [item?.productGroupID, item?.sku, item?.productID, item?.mpn, item?.model]
                            .filter(Boolean)
                            .map((value: unknown) => normalizeSku(String(value)));
                        const images = Array.isArray(item?.image) ? item.image : [item?.image].filter(Boolean);
                        return ids.some(id => id && normalizedCurrentProductId && (id === normalizedCurrentProductId || id.includes(normalizedCurrentProductId) || normalizedCurrentProductId.includes(id))) ||
                            images.some((image: unknown) => normalizeSku(String(image)).includes(normalizedCurrentProductId));
                    };
                    const matchedProductGroup = productGroups.find(matchesCurrentProduct);
                    const matchedProductJson = productCandidates.find(matchesCurrentProduct);
                    const productJson = matchedProductGroup || matchedProductJson || (!normalizedCurrentProductId ? productGroups[0] || productCandidates[0] : {}) || {};
                    const variants = Array.isArray(productJson.hasVariant)
                        ? productJson.hasVariant
                        : productCandidates.filter(item => {
                            if (item === productJson) return false;
                            const itemGroup = normalizeSku(String(item.productGroupID || ''));
                            const groupId = normalizeSku(String(productJson.productGroupID || productJson.sku || ''));
                            return itemGroup && groupId && itemGroup === groupId;
                        });
                    const getOffers = (json: any) => Array.isArray(json?.offers) ? json.offers : [json?.offers].filter(Boolean);
                    const getAvailability = (json: any) => getOffers(json)
                        .map((offer: any) => normalizeText(offer?.availability).toLowerCase())
                        .join(' ');
                    const isVariantInStock = (variant: any) => {
                        const availability = getAvailability(variant);
                        if (!availability) return true;
                        return !availability.includes('outofstock') && !availability.includes('soldout');
                    };
                    const inStockVariants = variants.filter(isVariantInStock);
                    if (variants.length) {
                        soldOut = soldOut || inStockVariants.length === 0;
                    }
                    const getOfferPrice = (json: any) => {
                        const offers = getOffers(json);
                        for (const offer of offers) {
                            const offerPrice = parsePrice(offer?.price || offer?.lowPrice || offer?.highPrice);
                            if (offerPrice) return offerPrice;
                        }
                        return 0;
                    };
                    let price =
                        inStockVariants.map(getOfferPrice).find(Boolean) ||
                        variants.map(getOfferPrice).find(Boolean) ||
                        getOfferPrice(productJson);
                    if (!price) {
                        price = parsePrice(document.querySelector('.normal-label .sales, .prices .sales, .price .sales, .sales')?.textContent);
                    }

                    let size = '원사이즈';
                    const variantSizes = Array.from(new Set(
                        inStockVariants
                            .map(variant => normalizeText(variant.size))
                            .filter(Boolean)
                            .map(value => /^(tu|one size|onesize|accessories_os)$/i.test(value) ? '원사이즈' : value)
                    ));
                    if (variantSizes.length) {
                        size = variantSizes.join(',');
                    } else {
                        const sizeInputs = Array.from(document.querySelectorAll('[data-attr="size"] input[name="attribute-radio-size"], [data-attr="size"] input.options-select[data-attr-value]'));
                        if (sizeInputs.length) {
                        const sizes = Array.from(new Set(
                            sizeInputs
                                .filter(input => {
                                    const radio = input as HTMLInputElement;
                                    return !radio.disabled && !radio.hasAttribute('disabled');
                                })
                                .map(input => {
                                    const label = input.closest('.attribute-item')?.querySelector('label');
                                    const valueEl = label?.querySelector('.attribute-value');
                                    const valueClone = valueEl?.cloneNode(true) as HTMLElement | undefined;
                                    valueClone?.querySelectorAll('.attribute-selected-icon').forEach(el => el.remove());
                                    const labelText = normalizeText(valueClone?.textContent || label?.textContent);
                                    return labelText || normalizeText(input.getAttribute('data-attr-value'));
                                })
                                .filter(Boolean)
                                .map(value => value === 'TU' ? '원사이즈' : value)
                        ));

                        if (sizes.length) {
                            size = sizes.join(',');
                        } else {
                            soldOut = true;
                        }
                    }
                    }

                    return { price, size, soldOut };
                });


                if (!productDetails) {
                    continue;
                }

                if (!productDetails.soldOut) {
                    // ✅ 정상일 때만 DB 업데이트
                    product.lastModifiedDate = new Date();
                    if (productDetails.price) product.price = productDetails.price;
                    if (productDetails.size) product.size = productDetails.size;
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
                console.warn(`🚨 alaia 업데이트 실패: ${err.message}`);
            } finally {
                if (page && !page.isClosed()) await page.close();
                if (browser) await browser.close();
            }
        }
        console.error('❌ 모든 프록시 재시도 실패 → 업데이트 포기 (기존값 유지)');
    }
}
