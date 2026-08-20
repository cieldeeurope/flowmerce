import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { GodoMallService } from 'src/godomall/godomall.service';
import { Repository } from 'typeorm';
import { R2Service } from '../cloudflare/r2.service';
import axios from 'axios';
import * as cheerio from 'cheerio';
const sharp = require('sharp');
import { SmartstoreService } from 'src/smartstore/smartstore.service';
import { SmartstoreApiService } from 'src/smartstore/smartstore-api.service';
import { Cafe24Service } from 'src/cafe24/cafe24.service';
import { MakeshopService } from 'src/makeshop/makeshop.service';
import { HostingAccount } from 'src/hosting/hostingaccount.entity';
import { Product } from 'src/product/product.entity';
import { Mapping } from 'src/mapping/mapping.entity';
import { UpdateGateway } from 'src/update/update.gateway';
import { GoogleTranslateService } from 'src/smartstore/google-translate.service';
import { UserService } from 'src/user/user.service';
import * as fs from 'fs';
import * as path from 'path';


@Injectable()
export class HermesService {

    private unlockerRequestQueue: Promise<void> = Promise.resolve();
    private unlockerLastRequestAt = 0;
    private unlockerSlowModeUntil = 0;

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

    private sleep(ms: number) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    private normalizeHermesText(value: any): string {
        const raw = String(value || '')
            .replace(/\\u003Cbr\s*\/?>/gi, '\n')
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/\u00a0/g, ' ')
            .replace(/&nbsp;/gi, ' ');

        if (!raw) return '';

        const $ = cheerio.load('<div id="hermes-text"></div>');
        $('#hermes-text').html(raw);

        return ($('#hermes-text').text() || raw)
            .replace(/\r/g, '')
            .split('\n')
            .map(line => line.replace(/\s+/g, ' ').trim())
            .filter(Boolean)
            .join('\n')
            .trim();
    }

    private normalizeHermesSize(value: any): string {
        return this.normalizeHermesText(value)
            .replace(/(\d),(\d)/g, '$1.$2')
            .replace(/\s*-\s*/g, '-')
            .replace(/\s*cm\b/gi, 'cm')
            .replace(/\s*mm\b/gi, 'mm')
            .trim();
    }

    private extractHermesWristSize(...values: any[]): string {
        for (const value of values) {
            const text = this.normalizeHermesText(value);
            const cmRange = text.match(/\b\d{1,2}[,.]\d\s*-\s*\d{1,2}\s*cm\b/i);
            if (cmRange) {
                return this.normalizeHermesSize(cmRange[0]);
            }

            const mmRange = text.match(/\b\d{2,3}\s*-\s*\d{2,3}\s*mm\b/i);
            if (mmRange) {
                return this.normalizeHermesSize(mmRange[0]);
            }
        }

        return '';
    }

    private getHermesJsonLdProduct($: cheerio.CheerioAPI): any {
        const products: any[] = [];

        const collect = (value: any) => {
            if (!value) return;

            if (Array.isArray(value)) {
                value.forEach(collect);
                return;
            }

            if (typeof value !== 'object') return;

            const typeValue = Array.isArray(value['@type'])
                ? value['@type'].join(' ')
                : value['@type'];
            const typeText = this.normalizeHermesText(typeValue).toLowerCase();

            if (typeText.includes('product') || value.sku || value.mpn || value.offers) {
                products.push(value);
            }

            if (value['@graph']) {
                collect(value['@graph']);
            }
        };

        $('script[type="application/ld+json"], script#microdata').each((_, element) => {
            const raw = ($(element).html() || '').trim();
            if (!raw) return;

            try {
                collect(JSON.parse(raw));
            } catch {
                return;
            }
        });

        return products.find(product => product?.sku || product?.mpn || product?.offers) || products[0] || {};
    }

    private getHermesOfferPrice(productJson: any): number {
        const offers = Array.isArray(productJson?.offers)
            ? productJson.offers
            : [productJson?.offers].filter(Boolean);

        for (const offer of offers) {
            const rawPrice = offer?.price ?? offer?.lowPrice ?? offer?.highPrice;
            const price = Number.parseInt(String(rawPrice || '').replace(/[^\d]/g, ''), 10);
            if (Number.isFinite(price) && price > 0) return price;
        }

        return 0;
    }

    private isHermesJsonInStock(productJson: any): boolean {
        const offers = Array.isArray(productJson?.offers)
            ? productJson.offers
            : [productJson?.offers].filter(Boolean);

        const availability = offers
            .map((offer: any) => this.normalizeHermesText(offer?.availability).toLowerCase())
            .join(' ');

        if (!availability) return false;
        return availability.includes('instock') && !availability.includes('outofstock') && !availability.includes('soldout');
    }

    private async waitForBrightDataUnlockerSlot() {
        const normalIntervalMs = 0;
        const slowIntervalMs = 0;
        const minIntervalMs =
            Date.now() < this.unlockerSlowModeUntil
                ? slowIntervalMs
                : normalIntervalMs;

        const nextRequest = this.unlockerRequestQueue.then(async () => {
            const waitMs = Math.max(
                0,
                this.unlockerLastRequestAt + minIntervalMs - Date.now(),
            );

            if (waitMs > 0) {
                await this.sleep(waitMs);
            }

            this.unlockerLastRequestAt = Date.now();
        });

        this.unlockerRequestQueue = nextRequest.catch(() => undefined);
        await nextRequest;
    }

    private activateBrightDataUnlockerSlowMode(reason: string) {
        const slowModeMs = 0;

        this.unlockerSlowModeUntil = Math.max(
            this.unlockerSlowModeUntil,
            Date.now() + slowModeMs,
        );

        console.warn(
            `Hermes Unlocker slow mode activated for ${Math.ceil(slowModeMs / 1000)}s: ${reason}`,
        );
    }

    private getBrightDataErrorText(error: any): string {
        const data = error?.response?.data;

        if (Buffer.isBuffer(data)) {
            return data.toString('utf8');
        }

        if (typeof data === 'string') {
            return data;
        }

        if (data) {
            try {
                return JSON.stringify(data);
            } catch {}
        }

        return error?.message || String(error || '');
    }

    private isBrightDataThrottle(errorOrText: any): boolean {
        const text =
            typeof errorOrText === 'string'
                ? errorOrText
                : this.getBrightDataErrorText(errorOrText);

        return /auto-throttled|low success rate|sr_rate_limit|decrease your request rate|429/i.test(text);
    }

    private extractBrightDataUnlockerHtml(data: any): string | null {
        if (!data) return null;

        if (typeof data === 'string') {
            const trimmed = data.trim();

            if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
                try {
                    const parsed = JSON.parse(trimmed);
                    return this.extractBrightDataUnlockerHtml(parsed);
                } catch {
                    return data;
                }
            }

            return data;
        }

        const possibleHtml =
            data.body ||
            data.html ||
            data.page_html ||
            data.content ||
            data.response ||
            data.data;

        return typeof possibleHtml === 'string'
            ? this.extractBrightDataUnlockerHtml(possibleHtml)
            : null;
    }

    private getBrightDataUnlockerCountry(url: string): string | undefined {
        const override = process.env.BRIGHTDATA_UNLOCKER_COUNTRY;
        if (override) return override;

        try {
            const path = new URL(url).pathname.toLowerCase();
            const countryCode = path.match(/^\/([a-z]{2})(?:\/|$)/)?.[1];
            const countryMap: Record<string, string> = {
                fr: 'fr',
                de: 'de',
                it: 'it',
                es: 'es',
                nl: 'nl',
                be: 'be',
                ch: 'ch',
                gb: 'gb',
                uk: 'gb',
                us: 'us',
                ca: 'ca',
                jp: 'jp',
                kr: 'kr',
                au: 'au',
            };

            return countryCode ? countryMap[countryCode] : undefined;
        } catch {
            return undefined;
        }
    }

    private getBrightDataDebugFilePath(url: string, extension = 'png'): string {
        const debugDir = path.join(process.cwd(), 'brightdata-debug', 'hermes');
        fs.mkdirSync(debugDir, { recursive: true });

        const urlPart = url
            .replace(/^https?:\/\//i, '')
            .replace(/[^a-z0-9]+/gi, '-')
            .replace(/^-+|-+$/g, '')
            .slice(0, 120);

        return path.join(debugDir, `${Date.now()}-${urlPart || 'unlocker'}.${extension}`);
    }

    private async captureBrightDataUnlockerScreenshot(
        url: string,
        apiKey: string,
        zone: string,
        country?: string,
    ): Promise<string | null> {
        try {
            const payload: Record<string, any> = {
                zone,
                url,
                format: 'raw',
                method: 'GET',
                data_format: 'screenshot',
            };

            if (country) {
                payload.country = country;
            }

            await this.waitForBrightDataUnlockerSlot();

            const response = await axios.post(
                'https://api.brightdata.com/request',
                payload,
                {
                    headers: {
                        Authorization: `Bearer ${apiKey}`,
                        'Content-Type': 'application/json',
                    },
                    timeout: 180000,
                    responseType: 'arraybuffer',
                    transformResponse: [(data) => data],
                },
            );

            const buffer = Buffer.from(response.data);

            if (!buffer.length) {
                console.warn(`Hermes Unlocker screenshot empty: ${url}`);
                return null;
            }

            const contentType = String(response.headers?.['content-type'] || '').toLowerCase();
            const isPng =
                buffer.length >= 8 &&
                buffer[0] === 0x89 &&
                buffer[1] === 0x50 &&
                buffer[2] === 0x4e &&
                buffer[3] === 0x47;
            const isJpeg =
                buffer.length >= 3 &&
                buffer[0] === 0xff &&
                buffer[1] === 0xd8 &&
                buffer[2] === 0xff;
            const isImage = contentType.startsWith('image/') || isPng || isJpeg;
            const extension = isPng ? 'png' : isJpeg ? 'jpg' : isImage ? 'img' : 'txt';
            const filePath = this.getBrightDataDebugFilePath(url, extension);

            if (!isImage) {
                const text = buffer.toString('utf8').trim();
                if (this.isBrightDataThrottle(text)) {
                    this.activateBrightDataUnlockerSlowMode(text);
                }
                fs.writeFileSync(
                    filePath,
                    text || `Non-image Bright Data response. content-type=${contentType || 'unknown'}`,
                    'utf8',
                );
                console.warn(`Hermes Unlocker diagnostic saved: ${filePath}`);
                return filePath;
            }

            fs.writeFileSync(filePath, new Uint8Array(buffer));

            console.warn(`Hermes Unlocker screenshot saved: ${filePath}`);
            return filePath;
        } catch (error: any) {
            if (this.isBrightDataThrottle(error)) {
                this.activateBrightDataUnlockerSlowMode(this.getBrightDataErrorText(error));
            }

            const errorData = error?.response?.data;
            if (errorData) {
                const buffer = Buffer.from(errorData);
                const filePath = this.getBrightDataDebugFilePath(url, 'txt');
                fs.writeFileSync(
                    filePath,
                    buffer.toString('utf8') || error?.message || 'Bright Data screenshot request failed',
                    'utf8',
                );
                console.warn(`Hermes Unlocker diagnostic saved: ${filePath}`);
                return filePath;
            }

            console.warn(
                `Hermes Unlocker screenshot failed: ${url} - ${error?.message || error}`,
            );
            return null;
        }
    }

    private hasHtmlSelectorContent(html: string | null, selector: string): boolean {
        if (!html) return false;

        const $ = cheerio.load(html);
        const element = $(selector).first();

        if (!element.length) return false;

        return !!(element.html() || element.text() || '').trim();
    }

    private async getHtmlFromUnlocker(
        url: string,
        options?: {
            requiredMarker?: string;
            requiredSelector?: string;
            expect?: { element?: string; text?: string };
        },
    ): Promise<string> {
        const apiKey =
            process.env.BRIGHTDATA_UNLOCKER_API_KEY ||
            process.env.BRIGHTDATA_API_KEY ||
            process.env.BRIGHTDATA_API_TOKEN;

        if (!apiKey) {
            throw new Error('Bright Data Unlocker API key is missing.');
        }

        const zone = process.env.BRIGHTDATA_UNLOCKER_ZONE || 'unlocker_normal';
        const country = this.getBrightDataUnlockerCountry(url);
        const maxAttempts = Number(process.env.BRIGHTDATA_UNLOCKER_MAX_ATTEMPTS || 4);
        const fallbackFormats = ['raw', 'raw', 'json', 'raw', 'json'];
        let lastError: any;

        for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
            const format = fallbackFormats[(attempt - 1) % fallbackFormats.length];

            try {
                const payload: Record<string, any> = {
                    zone,
                    url,
                    format,
                    method: 'GET',
                };

                if (country) {
                    payload.country = country;
                }

                const headers: Record<string, string> = {
                    Authorization: `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                };

                if (options?.expect) {
                    headers['x-unblock-expect'] = JSON.stringify(options.expect);
                }

                await this.waitForBrightDataUnlockerSlot();

                const response = await axios.post(
                    'https://api.brightdata.com/request',
                    payload,
                    {
                        headers,
                        timeout: 120000,
                        responseType: 'text',
                        transformResponse: [(data) => data],
                    },
                );

                const html = this.extractBrightDataUnlockerHtml(response.data);

                const hasRequiredMarker =
                    !options?.requiredMarker || !!html?.includes(options.requiredMarker);
                const hasRequiredSelector =
                    !options?.requiredSelector || this.hasHtmlSelectorContent(
                        html,
                        options.requiredSelector,
                    );

                if (html && html.trim().length > 0 && hasRequiredMarker && hasRequiredSelector) {
                    return html;
                }

                const missingReason = html && html.trim().length > 0
                    ? options?.requiredSelector && !hasRequiredSelector
                        ? `Unlocker response missing selector "${options.requiredSelector}" (${format})`
                        : `Unlocker response missing marker "${options?.requiredMarker}" (${format})`
                    : `Empty Unlocker response body (${format})`;

                lastError = new Error(
                    missingReason,
                );
                console.warn(
                    html && html.trim().length > 0
                        ? `Hermes Unlocker missing required html retry ${attempt}/${maxAttempts}: ${options?.requiredSelector || options?.requiredMarker} - ${url}`
                        : `Hermes Unlocker empty body retry ${attempt}/${maxAttempts}: ${url}`,
                );
            } catch (error: any) {
                lastError = error;
                if (this.isBrightDataThrottle(error)) {
                    this.activateBrightDataUnlockerSlowMode(this.getBrightDataErrorText(error));
                }
                console.warn(
                    `Hermes Unlocker retry ${attempt}/${maxAttempts}: ${error?.message || error}`,
                );
            }

            if (attempt < maxAttempts) {
                await this.sleep(Math.min(10000, 1500 * attempt));
            }
        }

        const screenshotPath = await this.captureBrightDataUnlockerScreenshot(
            url,
            apiKey,
            zone,
            country,
        );

        throw new Error(
            `Bright Data Unlocker HTML failed: ${url} - ${lastError?.message || lastError || 'unknown error'}${screenshotPath ? ` - screenshot: ${screenshotPath}` : ''}`,
        );
    }


    parseHermesCategories($: cheerio.CheerioAPI) {

        const results: { categoryName: string; url: string }[] = [];

        $('.parent-category').each((_, parent) => {

            const parentName = $(parent)
            .find('button span')
            .first()
            .text()
            .trim();

            if (!parentName) return;

            $(parent)
            .find('li.sub-category-block')
            .each((_, block) => {

                const middleName =
                $(block).find('span.sub-category-item').first().text().trim() ||
                $(block).find('a.menu-link-lvl2').first().text().trim();

                if (!middleName) return;

                $(block)
                .find('a.menu-link-lvl3[href]')
                .each((_, link) => {

                    const subName = $(link).text().trim();
                    const href = $(link).attr('href');

                    if (!href || !subName) return;

                    /* 필터 */

                    if (
                    subName.includes('Collection') ||
                    subName.includes('Défilé') ||
                    subName.includes('Expressions')
                    ) {
                    return;
                    }

                    if (href.includes('/content/')) return;

                    const categoryName =
                    `${parentName} - ${middleName} - ${subName}`;

                    const url = new URL(
                    href,
                    'https://www.hermes.com'
                    ).href;

                    results.push({
                    categoryName,
                    url,
                    });

                });

            });

        });

        return results;

    }

    async getCategories(siteUrls: string[]): Promise<{ categoryName: string; url: string }[]> {

        const allCategories: { categoryName: string; url: string }[] = [];

        for (const pageUrl of siteUrls) {

            const html = await this.r2Service.getHtmlFromUrl2(pageUrl);

            const $ = cheerio.load(html);

            const categories = this.parseHermesCategories($);

            allCategories.push(...categories);

        }

        /* 번역 */

        const translatedCategories = await Promise.all(
            allCategories.map(async (cat) => ({
            categoryName:
                await this.googleTranslateService.translateTextToEnglish(cat.categoryName),
            url: cat.url,
            }))
        );

        console.log(`✅ Hermes 카테고리 총 ${translatedCategories.length}개`);

        return translatedCategories;

    }

    private async uploadImageToR2(imageUrl: string,fileName: string,product: Product,partnerKey: string,): Promise<string> {

        try {

            if (!imageUrl) {
            throw new Error('유효하지 않은 이미지 URL');
            }

            
if (product.platform === 'smartstore' || product.platform === 'cafe24') {
            
  return imageUrl;
            
}

            
            

            /* --------------------------------------------------
            Hermes CDN URL 보정
            -------------------------------------------------- */

            if (imageUrl.startsWith('//')) {
            imageUrl = 'https:' + imageUrl;
            }

            /* --------------------------------------------------
            이미지 다운로드
            -------------------------------------------------- */

            const response = await axios.get(imageUrl, {
            responseType: 'arraybuffer',
            timeout: 15000,
            headers: {
                'User-Agent': 'Mozilla/5.0',
                'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
                'Referer': 'https://www.hermes.com/',
            },
            });

            let imageBuffer = Buffer.from(response.data);

            /* --------------------------------------------------
            webp / avif → jpeg 변환
            -------------------------------------------------- */

            const metadata = await sharp(imageBuffer).metadata();

            if (metadata.format === 'webp' || metadata.format === 'avif') {

            imageBuffer =
                await sharp(imageBuffer)
                .jpeg({ quality: 95 })
                .toBuffer();

            fileName =
                fileName.replace(/\.(webp|avif)$/i, '.jpg');

            }

            /* --------------------------------------------------
            R2 업로드
            -------------------------------------------------- */

            const r2Url =
            await this.r2Service.uploadImageToR2(
                fileName,
                imageBuffer,
                product,
            );

            return r2Url;

        } catch (error: any) {

            console.warn(
            `🚫 Hermes 이미지 업로드 실패 (${imageUrl}): ${error.message}`
            );

            throw error;

        }

    }


    // BrightData Hermes 크롤링 시작
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
        const serviceType = 'Hermes';

        const category = await this.mappingRepository.findOne({
            where: { customId: customId, accountPlatform: accountPlatform, siteUrl: siteUrl },
        });
        
        let pageIndex = 1;
        let stop = false;

        const allProductUrls: string[] = [];
        const seenUrls = new Set<string>();

        while (!stop) {

            const pages = [
            pageIndex,
            pageIndex + 1,
            pageIndex + 2
            ];

            const results = await Promise.all(

            pages.map(async (page) => {

                const pageUrl =
                page === 1
                    ? siteUrl
                    : `${siteUrl}?page=${page}`;

                let html: string | null = null;

                try {

                html = await this.r2Service.getHtmlFromUrl2(pageUrl);

                } catch {

                console.warn(`⚠️ 페이지 HTML 없음 → ${pageUrl}`);

                return {
                    page,
                    urls: []
                };

                }

                if (!html) {
                return {
                    page,
                    urls: []
                };
                }

                const $ = cheerio.load(html);

                const urls =
                $('a[href*="/product/"]')
                    .map((_, el) => {

                    const href = $(el).attr('href');

                    if (!href) return null;

                    if (href.startsWith('http')) return href;

                    return `https://www.hermes.com${href}`;

                    })
                    .get()
                    .filter(Boolean);

                return {
                page,
                urls: [...new Set(urls)]
                };

            })

            );

            let foundEmpty = false;

            for (const result of results) {

                if (result.urls.length === 0) {
                    foundEmpty = true;
                }

                for (const url of result.urls) {

                    // 🔥 이미 수집된 상품이면 → Hermes page redirect 감지
                    if (seenUrls.has(url)) {
                    console.log(`중복 상품 감지 → 크롤링 종료 (${url})`);
                    stop = true;
                    break;
                    }

                    seenUrls.add(url);
                    allProductUrls.push(url);
                }

                if (stop) break;
                }

            if (foundEmpty) {
            stop = true;
            } else {
            pageIndex += 3;
            }

        }

        const uniqueProductUrls = allProductUrls;

        console.log(`에르메스 최종 수집된 상품 URL 수: ${uniqueProductUrls.length} - ${category?.categoryName || '카테고리 없음'}`);

        if (!uniqueProductUrls.length) {
            throw new Error('Hermes 상품 URL 수집 실패');
        }

        const chunkSize = 15;

        for (let i = 0; i < uniqueProductUrls.length; i += chunkSize) {

            const chunk =
            uniqueProductUrls.slice(i, i + chunkSize);

            await Promise.all(

            chunk.map(async (productUrl, idx) => {

                const globalIndex = i + idx;

                console.log(
                `✅ (${globalIndex + 1}/${uniqueProductUrls.length}) Hermes 수집`
                );

                try {

                    const productHtml =
                        await this.r2Service.getHtmlFromUrl2(productUrl);

                    const $ = cheerio.load(productHtml);

                    /* =====================================================
                        Hermes 상품 파싱
                    ===================================================== */

                    const site = 'Hermes';
                    const designer = '에르메스';

                    const jsonRaw =
                        $('script#hermes-state').html();

                    if (!jsonRaw) {
                        console.warn('⚠️ hermes-state 없음');
                        return;
                    }

                    let state: any;

                    try {
                        state = JSON.parse(jsonRaw);
                    } catch {
                        console.warn('⚠️ JSON 파싱 실패');
                        return;
                    }

                    let product: any = null;

                    for (const key of Object.keys(state)) {

                        const node = state[key]?.b;

                        if (node?.sku && node?.price) {
                        product = node;
                        break;
                        }

                    }

                    if (!product) {
                        console.warn('⚠️ Hermes product node 없음');
                        return;
                    }

                    const jsonLdProduct = this.getHermesJsonLdProduct($);
                    const jsonLdInStock = this.isHermesJsonInStock(jsonLdProduct);

                    /* ---------------- TITLE ---------------- */

                    const title =
                        (product.title || jsonLdProduct.name || '')
                        .replace(/[«»]/g, '')
                        .trim();

                    /* ---------------- STYLE ---------------- */

                    const styleId =
                        this.normalizeHermesText(
                            product.sku ||
                            jsonLdProduct.sku ||
                            jsonLdProduct.mpn ||
                            productUrl.match(/-([A-Z0-9]+)\/?$/i)?.[1] ||
                            ''
                        );

                    const brandstyleId = styleId;

                    /* ---------------- PRICE ---------------- */

                    const price =
                        parseInt(product.price || '0', 10) || this.getHermesOfferPrice(jsonLdProduct);

                    /* ---------------- COLOR ---------------- */

                    const color =
                        product.simpleAttributes?.colorHermes || jsonLdProduct.color || '';

                    /* ---------------- MADE IN ---------------- */

                    let madeIn =
                        product.simpleAttributes?.madeIn || '';

                    madeIn = madeIn.replace(/^Fabriqué\s+en\s+/i, '').trim();

                    /* ---------------- DESCRIPTION ---------------- */

                    let description =
                        product.simpleAttributes?.description || jsonLdProduct.description || '';

                    description = this.normalizeHermesText(description)
                        .replace(/\\u003Cbr\s*\/?>/g, '\n')
                        .replace(/[«»]/g, '')
                        .trim();

                    const mainInfo =
                        [description, madeIn].filter(Boolean).join('\n\n').trim();

                    /* SIZE + SOLDOUT */

                    let size = '';
                    let soldOut = false;

                    const variants = product.variants || {};

                    const sizes = variants.sizes || [];
                    const colors = variants.colors || [];

                    let sizeArr: string[] = [];
                    const wristSize = this.extractHermesWristSize(
                        product.simpleAttributes?.size,
                        product.simpleAttributes?.description,
                        product.simpleAttributes?.dimensions,
                        jsonLdProduct.description,
                        $('body').text(),
                        productHtml,
                    );

                    /* 1️⃣ 의류 (sizes 존재) */

                    if (sizes.length > 0) {

                    sizeArr = sizes
                        .filter((s: any) => s.stock?.ecom === true)
                        .map((s: any) => this.normalizeHermesSize(s.size || ''))
                        .filter(Boolean);

                    if (sizeArr.length > 0) {
                        size = sizeArr.join(',');   // ← 기존 구조 유지
                    } else {
                        soldOut = true;
                    }

                    }

                    /* 2️⃣ 가방 / 액세서리 */

                    else {

                    const hasStock = colors.some(
                        (c: any) => c.stock?.ecom === true
                    ) || product.stock?.ecom === true || jsonLdInStock;

                    if (wristSize) {
                        sizeArr = [wristSize];
                        size = wristSize;
                    } else if (hasStock) {
                        sizeArr = ['원사이즈'];
                        size = '원사이즈';
                    } else {
                        soldOut = true;
                    }

                    }

                    if (size) {
                        size = this.normalizeHermesSize(size);
                    }

                    /* ---------------- IMAGES ---------------- */

                    let imageUrls = $('div.carousel-container img')
                    .map((_, el) => {

                        let src = $(el).attr('src');
                        if (!src) return null;

                        if (src.includes('-64-64')) return null; // 썸네일 제거

                        if (src.startsWith('//')) {
                        src = 'https:' + src;
                        }

                        return src.split('?')[0];

                    })
                    .get()
                    .filter(Boolean);

                    /* 중복 제거 */

                    imageUrls = [...new Set(imageUrls)];

                    /* =====================================================
                        productDetails 생성
                    ===================================================== */

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

                    /* =====================================================
                4️⃣ 유효성 체크 (디올과 동일)
                ===================================================== */

                if (
                    !productDetails.mainInfo ||
                    !productDetails.styleId ||
                    !productDetails.title ||
                    !productDetails.price ||
                    !productDetails.imageUrls.length ||
                    !productDetails.size ||
                    !productDetails.brandstyleId
                ) {

                    console.warn('⚠️ Hermes 데이터 누락 감지');

                    const missing = [];

                    if (!productDetails.mainInfo) missing.push('mainInfo');
                    if (!productDetails.styleId) missing.push('styleId');
                    if (!productDetails.title) missing.push('title');
                    if (!productDetails.price) missing.push('price');
                    if (!productDetails.imageUrls.length) missing.push('imageUrls');
                    if (!productDetails.size) missing.push('size');
                    if (!productDetails.brandstyleId) missing.push('brandstyleId');

                    console.log('❌ 누락 필드:', missing.join(', '));

                    return;
                }

                if (productDetails.soldOut) {
                console.warn(`❌ Hermes 품절상품 감지 → ${productDetails.title || productUrl}`);
                return;
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
                        partnerKey,
                    );
            
                    newProduct.mainImageUrl = r2MainImageUrl;
            
                    const additionalR2Urls: string[] = [];
            
                    for (let i = 0; i < restImages.length; i++) {
                        try {
                        const r2Url = await this.uploadImageToR2(
                            restImages[i],
                            `${productDetails.styleId}-additional-${i + 1}.jpg`,
                            newProduct,
                            partnerKey,
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
        
            console.log(`에르메스 품절 처리 완료: ${product.title} (styleId: ${product.styleId})`);
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
            console.log(`🔄 스마트스토어 상품 업데이트: ${product.designer} ${product.title}`);
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
            console.log(`🆕 스마트스토어 신규 등록: ${product.designer} ${product.title} ${product.brandstyleId}`);
            // imageData 객체를 추가 파라미터로 전달
            const response = await this.smartstoreApiService.createSmartStoreProduct(
            product,
            smartstoreAuth,
            imageData,
            godoMallCategoryName,
            );
        }
    }
    

}
