import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { GodoMallService } from 'src/godomall/godomall.service';
import { Repository } from 'typeorm';
import { R2Service } from '../cloudflare/r2.service';
import { Mapping } from 'src/mapping/mapping.entity';
import { Product } from 'src/product/product.entity';
import { UpdateGateway } from 'src/update/update.gateway';
const sharp = require('sharp');
import axios from 'axios';
import { SmartstoreService } from 'src/smartstore/smartstore.service';
import { SmartstoreApiService } from 'src/smartstore/smartstore-api.service';
import { Cafe24Service } from 'src/cafe24/cafe24.service';
import { MakeshopService } from 'src/makeshop/makeshop.service';
import { HostingAccount } from 'src/hosting/hostingaccount.entity';
import { GoogleTranslateService } from 'src/smartstore/google-translate.service';
import { UserService } from 'src/user/user.service';
import * as cheerio from 'cheerio';
import puppeteer from 'puppeteer';
import type { Browser, Page } from 'puppeteer';
import { spawn, type ChildProcess } from 'child_process';
import { existsSync, mkdirSync, rmSync, statSync } from 'fs';
import * as path from 'path';

const BERLUTI_CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BERLUTI_HOME_URL = 'https://www.berluti.com/en-nl/';
const BERLUTI_CHROME_PORTS = Array.from({ length: 100 }, (_, index) => 9223 + index);
const BERLUTI_PROFILE_ROOT = path.join(process.cwd(), 'berluti-chrome-profiles');
const BERLUTI_LOCK_ROOT = path.join(BERLUTI_PROFILE_ROOT, 'locks');
const BERLUTI_PORT_LOCK_STALE_MS = 5 * 60 * 1000;
const berlutiActiveChromePorts = new Set<number>();

type BerlutiChromeSession = {
    port: number;
    profileDir: string;
    chromeProcess: ChildProcess;
    browser: Browser;
    page: Page;
};

@Injectable()
export class BerlutiService {
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

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    private shuffleChromePorts(): number[] {
        const ports = [...BERLUTI_CHROME_PORTS];
        for (let i = ports.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [ports[i], ports[j]] = [ports[j], ports[i]];
        }
        return ports;
    }

    private async isChromeDebugPortOpen(port: number): Promise<boolean> {
        try {
            await axios.get(`http://127.0.0.1:${port}/json/version`, { timeout: 500, proxy: false });
            return true;
        } catch {
            return false;
        }
    }

    private getBerlutiPortLockDir(port: number): string {
        return path.join(BERLUTI_LOCK_ROOT, String(port));
    }

    private tryAcquireBerlutiPortLock(port: number): boolean {
        mkdirSync(BERLUTI_LOCK_ROOT, { recursive: true });
        try {
            mkdirSync(this.getBerlutiPortLockDir(port));
            return true;
        } catch {
            return false;
        }
    }

    private releaseBerlutiPortLock(port: number) {
        try {
            rmSync(this.getBerlutiPortLockDir(port), { recursive: true, force: true });
        } catch {}
    }

    private isBerlutiPortLockStale(port: number): boolean {
        try {
            const stat = statSync(this.getBerlutiPortLockDir(port));
            return Date.now() - stat.mtimeMs > BERLUTI_PORT_LOCK_STALE_MS;
        } catch {
            return false;
        }
    }

    private async reserveBerlutiChromePort(): Promise<number> {
        for (const port of this.shuffleChromePorts()) {
            if (berlutiActiveChromePorts.has(port)) continue;

            berlutiActiveChromePorts.add(port);
            let hasLock = this.tryAcquireBerlutiPortLock(port);
            if (!hasLock) {
                const alreadyOpen = await this.isChromeDebugPortOpen(port);
                if (!alreadyOpen && this.isBerlutiPortLockStale(port)) {
                    this.releaseBerlutiPortLock(port);
                    hasLock = this.tryAcquireBerlutiPortLock(port);
                }
            }
            if (!hasLock) {
                berlutiActiveChromePorts.delete(port);
                continue;
            }

            const alreadyOpen = await this.isChromeDebugPortOpen(port);
            if (!alreadyOpen) {
                return port;
            }
            this.releaseBerlutiPortLock(port);
            berlutiActiveChromePorts.delete(port);
        }

        throw new Error('사용 가능한 벨루티 크롬 포트가 없습니다.');
    }

    private releaseBerlutiChromePort(port: number) {
        this.releaseBerlutiPortLock(port);
        berlutiActiveChromePorts.delete(port);
    }

    private async closeBrowserWithTimeout(browser: Browser, timeoutMs = 5000) {
        await Promise.race([
            browser.close(),
            this.sleep(timeoutMs).then(() => {
                throw new Error('browser.close timeout');
            }),
        ]);
    }

    private createBerlutiProfileDir(port: number): string {
        mkdirSync(BERLUTI_PROFILE_ROOT, { recursive: true });
        const profileDir = path.join(
            BERLUTI_PROFILE_ROOT,
            `profile-${port}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
        );
        mkdirSync(profileDir, { recursive: true });
        return profileDir;
    }

    private async waitForChromeDebugPort(port: number, timeoutMs = 20000) {
        const startedAt = Date.now();
        let lastError = '';

        while (Date.now() - startedAt < timeoutMs) {
            try {
                await axios.get(`http://127.0.0.1:${port}/json/version`, { timeout: 1000, proxy: false });
                return;
            } catch (error: any) {
                lastError = error?.message || '';
                await this.sleep(500);
            }
        }

        throw new Error(`크롬 디버그 포트 연결 실패: ${port} ${lastError}`);
    }

    private async openBerlutiChromeSession(startUrl = BERLUTI_HOME_URL): Promise<BerlutiChromeSession> {
        if (!existsSync(BERLUTI_CHROME_PATH)) {
            throw new Error('크롬 실행 파일을 찾을 수 없습니다: ' + BERLUTI_CHROME_PATH);
        }

        const port = await this.reserveBerlutiChromePort();
        const profileDir = this.createBerlutiProfileDir(port);
        let chromeProcess: ChildProcess | null = null;
        let browser: Browser | null = null;

        try {
            chromeProcess = spawn(BERLUTI_CHROME_PATH, [
                `--remote-debugging-port=${port}`,
                `--user-data-dir=${profileDir}`,
                '--no-first-run',
                '--no-default-browser-check',
                '--disable-popup-blocking',
                '--window-size=1920,1080',
                startUrl,
            ], {
                stdio: 'ignore',
                windowsHide: false,
            });
            chromeProcess.unref();

            await this.waitForChromeDebugPort(port);
            browser = await puppeteer.connect({
                browserURL: `http://127.0.0.1:${port}`,
                defaultViewport: null,
            });

            const pages = await browser.pages();
            const page =
                pages.find(candidate => {
                    const currentUrl = candidate.url();
                    return currentUrl && currentUrl !== 'about:blank' && !currentUrl.startsWith('devtools://');
                }) ||
                pages.find(candidate => !candidate.url().startsWith('devtools://')) ||
                await browser.newPage();

            page.setDefaultNavigationTimeout(90000);
            page.setDefaultTimeout(45000);

            return { port, profileDir, chromeProcess, browser, page };
        } catch (error) {
            if (browser) {
                try {
                    await this.closeBrowserWithTimeout(browser);
                } catch {
                    try {
                        browser.disconnect();
                    } catch {}
                }
            }
            if (chromeProcess && !chromeProcess.killed) {
                try {
                    chromeProcess.kill();
                } catch {}
            }
            await this.deleteBerlutiProfileDir(profileDir);
            this.releaseBerlutiChromePort(port);
            throw error;
        }
    }

    private async closeBerlutiChromeSession(session: BerlutiChromeSession | null) {
        if (!session) return;

        try {
            await this.closeBrowserWithTimeout(session.browser);
        } catch {
            try {
                session.browser.disconnect();
            } catch {}
        }

        await this.sleep(1000);

        if (session.chromeProcess && !session.chromeProcess.killed) {
            try {
                session.chromeProcess.kill();
            } catch {}
        }

        await this.deleteBerlutiProfileDir(session.profileDir);
        this.releaseBerlutiChromePort(session.port);
    }

    private async deleteBerlutiProfileDir(profileDir: string) {
        const root = path.resolve(BERLUTI_PROFILE_ROOT);
        const target = path.resolve(profileDir);
        if (!target.startsWith(root + path.sep)) return;

        for (let attempt = 0; attempt < 12; attempt++) {
            try {
                if (existsSync(target)) {
                    rmSync(target, { recursive: true, force: true });
                }
                if (!existsSync(target)) return;
            } catch {}
            await this.sleep(700);
        }
    }

    private getBerlutiFallbackCategories(): { categoryName: string; url: string }[] {
        const baseUrl = 'https://www.berluti.com/en-nl';
        const groups = [
            {
                groupName: 'Shoes',
                items: [
                    ['Oxfords', '/shoes/oxfords/'],
                    ['Derbies & Buckle Shoes', '/shoes/derbies-buckle-shoes/'],
                    ['Loafers', '/shoes/loafers/'],
                    ['Boots', '/shoes/boots/'],
                    ['Sneakers', '/shoes/sneakers/'],
                    ['Sandals', '/sandal-collections/'],
                ],
            },
            {
                groupName: 'Leather Goods',
                items: [
                    ['Briefcases', '/leather-goods/briefcases/'],
                    ['Messenger bags', '/leather-goods/messenger-bags/'],
                    ['Backpacks', '/leather-goods/backpacks/'],
                    ['Tote bags', '/leather-goods/tote-bags/'],
                    ['Travel bags', '/leather-goods/travel-bags/'],
                    ['Wallets', '/leather-goods/wallets/'],
                    ['Cardholders', '/leather-goods/cardholders/'],
                    ['Cases & Covers', '/leather-goods/cases-covers/'],
                    ['Clutches', '/leather-goods/clutches/'],
                    ['Belts', '/leather-goods/belts/'],
                    ['High-Tech & Lifestyle', '/leather-goods/high-tech-lifestyle/'],
                ],
            },
            {
                groupName: 'Ready-to-wear',
                items: [
                    ['Leatherwear', '/ready-to-wear/leatherwear/'],
                    ['Coats & Blousons', '/ready-to-wear/coats-blousons/'],
                    ['Jackets & Suits', '/ready-to-wear/jackets-suits/'],
                    ['Knitwear & Sweatshirts', '/ready-to-wear/knitwear-sweatshirts/'],
                    ['Shirts', '/ready-to-wear/shirts/'],
                    ['Polos & Tshirts', '/ready-to-wear/polos-tshirts/'],
                    ['Trousers & Bermudas', '/ready-to-wear/trousers-bermudas/'],
                    ['Sunglasses', '/ready-to-wear/sunglasses/'],
                    ['Hat, Scarves & Gloves', '/ready-to-wear/hat--scarves-gloves/'],
                    ['Ties & Handkerchiefs', '/ready-to-wear/ties-handkerchiefs/'],
                    ['Socks', '/ready-to-wear/socks/'],
                ],
            },
        ];

        return groups.flatMap(group =>
            group.items.map(([name, path]) => ({
                categoryName: `MEN - ${group.groupName} - ${name}`,
                url: `${baseUrl}${path}`,
            }))
        );
    }

    private normalizeText(value: any): string {
        return String(value || '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
    }

    private normalizeSku(value: any): string {
        return this.normalizeText(value).replace(/[^a-z0-9]/gi, '').toUpperCase();
    }

    private normalizeSize(value: any): string {
        const text = this.normalizeText(value);
        if (!text) return '';
        return /^(tu|uni|os|o\/s|one size|onesize|one-size|accessories_os)$/i.test(text) ? '원사이즈' : text;
    }

    private parsePrice(value: any): number {
        if (typeof value === 'number') return Math.floor(value);
        const raw = this.normalizeText(value);
        if (!raw) return 0;

        const cleaned = raw
            .replace(/[^\d.,]/g, '')
            .replace(/[.,](?=\d{3}(?:\D|$))/g, '')
            .replace(',', '.');

        const parsed = Number.parseFloat(cleaned);
        return Number.isFinite(parsed) ? Math.floor(parsed) : 0;
    }

    private normalizeAssetUrl(rawUrl: any, baseUrl: string, preferLast = false): string {
        const raw = this.normalizeText(rawUrl).replace(/&amp;/g, '&').replace(/\\u002F/g, '/').replace(/\\\//g, '/');
        if (!raw) return '';

        const candidates = raw
            .split(',')
            .map(part => part.trim().split(/\s+/)[0])
            .filter(Boolean);
        const candidate = preferLast ? candidates[candidates.length - 1] : candidates[0];
        if (!candidate) return '';

        try {
            if (candidate.startsWith('//')) return `https:${candidate}`;
            if (candidate.startsWith('/')) return new URL(candidate, baseUrl).href;
            return candidate;
        } catch {
            return candidate;
        }
    }

    private pushUniqueUrl(list: string[], rawUrl: any, baseUrl: string, preferLast = false) {
        const url = this.normalizeAssetUrl(rawUrl, baseUrl, preferLast);
        if (!url || list.includes(url)) return;
        list.push(url);
    }

    private getCheerioTextWithBreaks($: any, element: any): string {
        const target = typeof element?.text === 'function' ? element : $(element);
        if (!target || !target.length) return '';

        const clone = target.clone();
        clone.find('script, style, link, button, a, svg').remove();
        clone.find('br').replaceWith('\n');
        clone.find('li').append('\n');

        return String(clone.text() || '')
            .split('\n')
            .map(line => this.normalizeText(line))
            .filter(Boolean)
            .join('\n');
    }

    private htmlToText(value: any): string {
        const raw = String(value || '');
        if (!/<[a-z][\s\S]*>/i.test(raw)) return this.normalizeText(raw);

        const $ = cheerio.load(`<div id="berluti-html-text">${raw}</div>`);
        return this.getCheerioTextWithBreaks($, $('#berluti-html-text'));
    }

    private pushInfoPart(parts: string[], value: any) {
        const text = this.htmlToText(value)
            .split('\n')
            .map(line => this.normalizeText(line))
            .filter(Boolean)
            .join('\n');

        if (!text || text.length < 2 || parts.includes(text)) return;
        parts.push(text);
    }

    private async dismissBerlutiNonProductModals(page: Page) {
        try {
            await page.evaluate(() => {
                const selectors = [
                    '#onetrust-reject-all-handler',
                    '.onetrust-close-btn-handler',
                    'button[data-dismiss="modal"][aria-label*="Close"]',
                    'button.close[data-dismiss="modal"]',
                    '.modal-dialog button.close',
                    '.modal-dialog [aria-label*="Close"]',
                ];

                for (const selector of selectors) {
                    const button = document.querySelector<HTMLElement>(selector);
                    if (!button) continue;
                    button.click();
                    return;
                }
            });
        } catch {}
    }

    private parseJsonLdItems(html: string): any[] {
        const $ = cheerio.load(html || '');
        const items: any[] = [];

        const collect = (value: any) => {
            if (!value) return;
            if (Array.isArray(value)) {
                value.forEach(collect);
                return;
            }
            if (typeof value !== 'object') return;
            items.push(value);
            if (Array.isArray(value['@graph'])) collect(value['@graph']);
        };

        $('script[type="application/ld+json"]').each((_, element) => {
            const raw = ($(element).html() || '').trim();
            if (!raw) return;
            try {
                collect(JSON.parse(raw));
            } catch {
                // malformed structured data can be ignored
            }
        });

        return items;
    }

    private jsonTypeText(item: any): string {
        return this.normalizeText(Array.isArray(item?.['@type']) ? item['@type'].join(' ') : item?.['@type']).toLowerCase();
    }

    private hasBerlutiProductSignals(html: string, productUrl = ''): boolean {
        if (!html) return false;

        const $ = cheerio.load(html || '');
        const pathSku = this.normalizeSku(
            productUrl.match(/\/([A-Z0-9]+(?:-[A-Z0-9]+)?)\.html/i)?.[1] ||
            productUrl.match(/\/p\/([^/]+)/i)?.[1] ||
            ''
        );

        const jsonItems = this.parseJsonLdItems(html);
        const hasProductJson = jsonItems.some(item => {
            const type = this.jsonTypeText(item);
            if (!type.includes('product') && !item?.sku && !item?.productGroupID && !item?.offers) return false;
            if (!pathSku) return Boolean(item?.name || item?.offers || item?.image);

            const ids = [item?.['@id'], item?.url, item?.sku, item?.productGroupID, item?.productID, item?.mpn, item?.model]
                .filter(Boolean)
                .map(value => this.normalizeSku(value));
            return ids.some(id => id && (id === pathSku || id.includes(pathSku) || pathSku.includes(id)));
        });

        if (hasProductJson) return true;

        return Boolean(
            $('.product-description.js-product-short-description, .js-product-short-description').length ||
            $('.prices-add-to-cart-actions, .js-add-to-cart-container').length ||
            $('.main-image-block .pdp-image-slide img').length ||
            $('#panel-product-details, [aria-labelledby="tab-product-details"], .product-details-content, .product-detail-accordion, .product-details').length ||
            $('.tab-panel-row, .row.no-gutters').filter((_, row) => {
                const label = this.normalizeText($(row).find('dt, .tab-panel-section-title').first().text()).toLowerCase();
                return label === 'id';
            }).length ||
            this.parsePrice($('.price, .sales, [class*="price"]').first().text())
        );
    }

    private isBerlutiProtectionHtml(html: string, productUrl = ''): boolean {
        if (!html) return true;
        if (this.hasBerlutiProductSignals(html, productUrl)) return false;

        const $ = cheerio.load(html || '');
        const titleText = this.normalizeText($('title').text()).toLowerCase();
        $('script, style, noscript, link, svg').remove();
        const bodyText = this.normalizeText($('body').text() || html).toLowerCase();

        return (
            titleText.includes('access denied') ||
            bodyText.includes('access denied') ||
            bodyText.includes("don't have permission") ||
            bodyText.includes('captcha') ||
            bodyText.includes('akamai') ||
            bodyText.includes('powered and protected by privacy') ||
            bodyText.includes('request was blocked')
        );
    }

    private findBerlutiProductJson(jsonItems: any[], productUrl: string): any {
        const productObjects = jsonItems.filter(item => {
            const type = this.jsonTypeText(item);
            return type.includes('product') || Boolean(item?.sku || item?.productGroupID || item?.offers);
        });

        const pathSku = this.normalizeSku(
            productUrl.match(/\/([A-Z0-9]+(?:-[A-Z0-9]+)?)\.html/i)?.[1] ||
            productUrl.match(/\/p\/([^/]+)/i)?.[1] ||
            ''
        );

        const matchesPageSku = (item: any) => {
            if (!pathSku) return false;
            const ids = [item?.['@id'], item?.url, item?.sku, item?.productGroupID, item?.productID, item?.mpn, item?.model]
                .filter(Boolean)
                .map(value => this.normalizeSku(value));
            return ids.some(id => id && (id === pathSku || id.includes(pathSku) || pathSku.includes(id)));
        };

        return (
            productObjects.find(matchesPageSku) ||
            productObjects.find(item => this.jsonTypeText(item).includes('productgroup')) ||
            productObjects[0] ||
            {}
        );
    }

    private getJsonOffers(json: any): any[] {
        return Array.isArray(json?.offers) ? json.offers : [json?.offers].filter(Boolean);
    }

    private getJsonOfferPrice(json: any): number {
        for (const offer of this.getJsonOffers(json)) {
            const price = this.parsePrice(offer?.price ?? offer?.lowPrice ?? offer?.highPrice);
            if (price) return price;
        }
        return 0;
    }

    private extractMadeIn(value: string): string {
        return this.normalizeText(value).match(/made\s+in\s+([A-Za-z]+)/i)?.[1] || '';
    }

    private parseBerlutiProductDetails(html: string, productUrl: string): any {
        const $ = cheerio.load(html || '');
        const site = 'Berluti';
        const designer = '벨루티';
        const jsonItems = this.parseJsonLdItems(html);
        const productJson = this.findBerlutiProductJson(jsonItems, productUrl);
        const productGroupIds = [
            productJson?.productGroupID,
            productJson?.['@id'],
            productJson?.sku,
            productJson?.mpn,
        ]
            .filter(Boolean)
            .map(value => this.normalizeSku(value));
        const linkedVariants = jsonItems.filter(item => {
            const type = this.jsonTypeText(item);
            if (!type.includes('product') || type.includes('productgroup')) return false;
            const variantGroupId = this.normalizeSku(
                typeof item?.isVariantOf === 'object'
                    ? item.isVariantOf?.['@id'] || item.isVariantOf?.productGroupID || item.isVariantOf?.sku
                    : item?.isVariantOf,
            );
            return Boolean(variantGroupId) && productGroupIds.includes(variantGroupId);
        });
        const variants = Array.isArray(productJson?.hasVariant) && productJson.hasVariant.length
            ? productJson.hasVariant
            : linkedVariants;
        const inStockVariants = variants.filter((variant: any) => {
            const availability = this.getJsonOffers(variant)
                .map(offer => this.normalizeText(offer?.availability).toLowerCase())
                .join(' ');
            return !availability || (!availability.includes('outofstock') && !availability.includes('soldout') && !availability.includes('discontinued'));
        });

        let size = '원사이즈';
        let soldOut = false;
        const addToCartText = this.normalizeText($('.prices-add-to-cart-actions, .js-add-to-cart-container').first().text()).toLowerCase();
        const hasNotifyMeButton =
            $('.prices-add-to-cart-actions .notify-me-button, .js-add-to-cart-container .notify-me-button, button.notify-me-button, button.trigger-notify-me-modal').length > 0 ||
            addToCartText.includes('notify me when available') ||
            addToCartText.includes('notify me');
        const sizeOptions = $('select.select-size option, select.custom-select.select-size option').filter((_, element) => {
            const option = $(element);
            const normalized = this.normalizeSize(
                option.attr('data-attr-value') ||
                option.attr('data-size-1-label') ||
                option.attr('data-size-2-label') ||
                option.text(),
            );
            return Boolean(normalized) && !/^select\s+size$/i.test(normalized);
        });
        if (sizeOptions.length) {
            const sizes: string[] = [];
            sizeOptions.each((_, element) => {
                const option = $(element);
                const className = option.attr('class') || '';
                const dataName = option.attr('data-name') || '';
                let selectableFromPayload: boolean | null = null;
                if (dataName) {
                    try {
                        const parsed = JSON.parse(dataName);
                        if (typeof parsed?.selectable === 'boolean') selectableFromPayload = parsed.selectable;
                    } catch {}
                }
                const isDisabled =
                    option.attr('disabled') !== undefined ||
                    className.includes('disabled') ||
                    selectableFromPayload === false;
                if (isDisabled) return;

                const normalized = this.normalizeSize(
                    option.attr('data-attr-value') ||
                    option.attr('data-size-1-label') ||
                    option.attr('data-size-2-label') ||
                    option.text(),
                ).replace(/^0(?=\d)/, '');
                if (normalized && !sizes.includes(normalized)) sizes.push(normalized);
            });
            if (sizes.length) {
                size = sizes.join(',');
            } else {
                soldOut = true;
            }
        } else {
            const sizeList = $('#sizeSelectorModal .js-size-selector-list.size-selector-list, #sizeSelectorModal .size-selector-list').first();
            if (sizeList.length) {
                const buttons = sizeList.find('.size-selector-btn').filter((_, element) => {
                    const className = $(element).attr('class') || '';
                    return !className.includes('size-selector-side-btn');
                });
                if (buttons.length) {
                    const sizes: string[] = [];
                    buttons.each((_, element) => {
                        const button = $(element);
                        const className = button.attr('class') || '';
                        if (button.attr('disabled') !== undefined || className.includes('disabled')) return;
                        const normalized = this.normalizeSize(button.text()).replace(/^0(?=\d)/, '');
                        if (normalized && !sizes.includes(normalized)) sizes.push(normalized);
                    });
                    if (sizes.length) {
                        size = sizes.join(',');
                    } else {
                        soldOut = true;
                    }
                }
            }
        }
        if (hasNotifyMeButton) {
            size = '원사이즈';
            soldOut = true;
        }

        let title = this.normalizeText(productJson?.name);
        const shortDescription = this.normalizeText($('.product-description.js-product-short-description, .js-product-short-description').first().text());
        title = [title, shortDescription].filter(Boolean).join(' ');

        const idRow = $('.tab-panel-row, .row.no-gutters').filter((_, row) => {
            const label = this.normalizeText($(row).find('dt, .tab-panel-section-title').first().text()).toLowerCase();
            return label === 'id';
        }).first();
        const styleId =
            this.normalizeText(idRow.find('dd, .tab-panel-section-content').first().text()) ||
            this.normalizeText(productJson?.sku || productJson?.mpn || productJson?.productGroupID || '');

        let price =
            inStockVariants.map((variant: any) => this.getJsonOfferPrice(variant)).find(Boolean) ||
            variants.map((variant: any) => this.getJsonOfferPrice(variant)).find(Boolean) ||
            this.getJsonOfferPrice(productJson);
        if (!price) {
            price = this.parsePrice($('.price, .sales, [class*="price"]').first().text());
        }

        const color = this.normalizeText(productJson?.color || variants.find((variant: any) => this.normalizeText(variant?.color))?.color);

        const imageUrls: string[] = [];
        $('.main-image-block.col-12.pr-lg-5 .pdp-image-slide img, .main-image-block .pdp-image-slide img').each((_, element) => {
            const image = $(element);
            this.pushUniqueUrl(imageUrls, image.attr('data-src') || image.attr('src'), productUrl);
            this.pushUniqueUrl(imageUrls, image.attr('srcset'), productUrl, true);
        });

        const pushSchemaImage = (value: any) => {
            if (!value) return;
            if (Array.isArray(value)) {
                value.forEach(pushSchemaImage);
                return;
            }
            if (typeof value === 'object') {
                pushSchemaImage(value.url || value.contentUrl);
                return;
            }
            this.pushUniqueUrl(imageUrls, value, productUrl);
        };
        pushSchemaImage(productJson?.image);
        variants.forEach((variant: any) => pushSchemaImage(variant?.image));
        const filteredImages = Array.from(new Set(imageUrls))
            .filter(url => /^https?:\/\//i.test(url))
            .filter(url => url.includes('/dw/image') || url.includes('berluti'))
            .slice(0, 9);

        const infoParts: string[] = [];
        this.pushInfoPart(infoParts, productJson?.description);
        this.pushInfoPart(
            infoParts,
            this.getCheerioTextWithBreaks(
                $,
                $('#panel-product-details, [aria-labelledby="tab-product-details"], .product-details-content, .product-detail-accordion, .product-details').first(),
            ),
        );
        const mainInfo = infoParts.join('\n\n');
        const madeIn = this.extractMadeIn(mainInfo);

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
            brandstyleId: styleId,
            imageUrls: filteredImages,
        };
    }

    private parseBerlutiProductUpdate(html: string, productUrl: string): any {
        const details = this.parseBerlutiProductDetails(html, productUrl);
        if (!details?.title && !details?.price && !details?.styleId) {
            return { price: 0, size: '', soldOut: true };
        }

        return {
            price: details.price,
            size: details.size,
            soldOut: details.soldOut,
        };
    }



    async getCategories(siteUrls: string[]): Promise<{ categoryName: string; url: string }[]> {
        const allCategories: { categoryName: string; url: string }[] = [];

        for (const siteUrl of siteUrls) {
            let success = false;

            for (let attempt = 1; attempt <= BERLUTI_CHROME_PORTS.length; attempt++) {
                let session: BerlutiChromeSession | null = null;

                try {
                    const navigationUrl = siteUrl.replace(/^http:\/\//i, 'https://');
                    session = await this.openBerlutiChromeSession();
                    const page = session.page;

                    console.log('Category crawl: ' + navigationUrl + ' (chrome port ' + session.port + ', attempt ' + attempt + ')');
                    await page.goto(navigationUrl, {
                        waitUntil: 'domcontentloaded',
                        timeout: 90000,
                        referer: navigationUrl,
                    });
                    await page.mouse.move(
                        700 + Math.floor(Math.random() * 240),
                        360 + Math.floor(Math.random() * 160),
                        { steps: 12 },
                    ).catch(() => {});
                    try {
                        await page.waitForSelector(
                            '#onetrust-reject-all-handler, #onetrust-accept-btn-handler, .onetrust-close-btn-handler, button[id*="accept"], button[id*="reject"]',
                            { timeout: 4000 },
                        );
                        await page.evaluate(() => {
                            const candidates = [
                                '#onetrust-reject-all-handler',
                                '.onetrust-close-btn-handler',
                                '#onetrust-accept-btn-handler',
                                'button[id*="reject"]',
                                'button[id*="accept"]',
                            ];
                            for (const selector of candidates) {
                                const button = document.querySelector<HTMLElement>(selector);
                                if (!button) continue;
                                button.click();
                                break;
                            }
                        });
                    } catch {}
                    await new Promise(resolve => setTimeout(resolve, 6500 + Math.floor(Math.random() * 3500)));

                    const html = await page.content();
                    const protectionCheck = cheerio.load(html || '');
                    const titleText = this.normalizeText(protectionCheck('title').text()).toLowerCase();
                    protectionCheck('script, style, noscript, link, svg').remove();
                    const bodyText = this.normalizeText(protectionCheck('body').text() || html).toLowerCase();
                    if (
                        !html ||
                        titleText.includes('access denied') ||
                        bodyText.includes('access denied') ||
                        bodyText.includes("don't have permission") ||
                        bodyText.includes('captcha') ||
                        bodyText.includes('powered and protected by privacy') ||
                        bodyText.includes('request was blocked')
                    ) {
                        throw new Error('Berluti protection page returned by Puppeteer');
                    }

                    const $ = cheerio.load(html || '');
                    const categories: { categoryName: string; url: string }[] = [];
                    const seen = new Set<string>();
                    const groups = [
                        { selector: '#submenu-shoes', name: 'Shoes', pathToken: 'shoes' },
                        { selector: '#submenu-leather_goods, #submenu-leather-goods', name: 'Leather Goods', pathToken: 'leather-goods' },
                        { selector: '#submenu-ready_to_wear, #submenu-ready-to-wear', name: 'Ready-to-wear', pathToken: 'ready-to-wear' },
                    ];
                    const isSkipName = (value: any) => {
                        const lower = this.normalizeText(value).toLowerCase();
                        return !lower ||
                            lower === 'view all' ||
                            lower === 'see all' ||
                            lower === 'all' ||
                            lower.startsWith('all ') ||
                            lower === 'shop all' ||
                            lower === 'new in' ||
                            lower === 'new arrivals' ||
                            lower === 'collection' ||
                            lower === 'collections' ||
                            lower === 'icons' ||
                            lower.includes('special collection');
                    };
                    const titleCaseSlug = (value: string) => this.normalizeText(value.replace(/[_-]+/g, ' '))
                        .split(' ')
                        .filter(Boolean)
                        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                        .join(' ');
                    const safeDecode = (value: string) => {
                        try {
                            return decodeURIComponent(value);
                        } catch {
                            return value;
                        }
                    };
                    const addCategory = (groupName: string, name: string, href: string | undefined) => {
                        if (isSkipName(name) || !href) return;
                        try {
                            const url = new URL(href, navigationUrl);
                            url.hash = '';
                            if (url.pathname.toLowerCase().includes('.html')) return;
                            const absoluteUrl = url.href;
                            if (seen.has(absoluteUrl)) return;
                            seen.add(absoluteUrl);
                            categories.push({ categoryName: `MEN - ${groupName} - ${this.normalizeText(name)}`, url: absoluteUrl });
                        } catch {
                            return;
                        }
                    };

                    groups.forEach(group => {
                        $(group.selector).find('a.dropdown-link[href], a[href]').each((_, element) => {
                            addCategory(group.name, $(element).text(), $(element).attr('href'));
                        });
                    });

                    if (!categories.length) {
                        $('a[href]').each((_, element) => {
                            const href = $(element).attr('href');
                            if (!href) return;

                            let url: URL;
                            try {
                                url = new URL(href, navigationUrl);
                            } catch {
                                return;
                            }

                            const pathname = url.pathname.toLowerCase();
                            if (pathname.includes('.html')) return;

                            const segments = pathname.split('/').filter(Boolean);
                            const group = groups.find(item => segments.includes(item.pathToken));
                            if (!group) return;

                            const groupIndex = segments.indexOf(group.pathToken);
                            const leafSegment = segments[groupIndex + 1];
                            if (!leafSegment) return;

                            const name = this.normalizeText($(element).text()) || titleCaseSlug(safeDecode(leafSegment));
                            addCategory(group.name, name, href);
                        });
                    }

                    if (!categories.length) {
                        throw new Error('카테고리 요소 없음');
                    }

                    allCategories.push(...categories);
                    success = true;
                } catch (error: any) {
                    console.error('[' + siteUrl + '] category crawl failed (chrome port ' + (session?.port || 'none') + '): ' + error.message);
                } finally {
                    await this.closeBerlutiChromeSession(session);
                }
                if (success) break;
            }

            if (!success) {
                console.warn('[' + siteUrl + '] category crawl skipped after 3 retries. fallback 사용');
            }
        }

        if (allCategories.length === 0) {
            allCategories.push(...this.getBerlutiFallbackCategories());
        }

        const seen = new Set<string>();
        const finalCategories = allCategories.filter(category => {
            if (seen.has(category.url)) return false;
            seen.add(category.url);
            return true;
        });

        console.log('Category crawl complete: ' + finalCategories.length);
        return finalCategories;
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
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36",
                    "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
                    "Referer": "https://www.berluti.com/en-nl/",
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
  
  
    
  
    // 벨루티 사이트 크롤링 시작
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

        let productUrls: string[] = [];

        const category = await this.mappingRepository.findOne({
            where: { customId: customId, accountPlatform: accountPlatform, siteUrl: siteUrl },
        });

        let activeSession: BerlutiChromeSession | null = null;

        for (let attempt = 1; attempt <= BERLUTI_CHROME_PORTS.length; attempt++) {
            try {
                const listingUrl = siteUrl.replace(/^http:\/\//i, 'https://');
                if (!activeSession) {
                    activeSession = await this.openBerlutiChromeSession();
                }
                const page = activeSession.page;

                console.log('Berluti listing URL: ' + listingUrl + ' (chrome port ' + activeSession.port + ', attempt ' + attempt + ')');
                await page.goto(listingUrl, {
                    waitUntil: 'domcontentloaded',
                    timeout: 90000,
                    referer: listingUrl,
                });
                await page.mouse.move(
                    700 + Math.floor(Math.random() * 240),
                    360 + Math.floor(Math.random() * 160),
                    { steps: 12 },
                ).catch(() => {});
                try {
                    await page.waitForSelector(
                        '#onetrust-reject-all-handler, #onetrust-accept-btn-handler, .onetrust-close-btn-handler, button[id*="accept"], button[id*="reject"]',
                        { timeout: 4000 },
                    );
                    await page.evaluate(() => {
                        const candidates = [
                            '#onetrust-reject-all-handler',
                            '.onetrust-close-btn-handler',
                            '#onetrust-accept-btn-handler',
                            'button[id*="reject"]',
                            'button[id*="accept"]',
                        ];
                        for (const selector of candidates) {
                            const button = document.querySelector<HTMLElement>(selector);
                            if (!button) continue;
                            button.click();
                            break;
                        }
                    });
                } catch {}
                await new Promise(resolve => setTimeout(resolve, 6500 + Math.floor(Math.random() * 3500)));
                await page.waitForSelector('.product-grid-wrapper', { timeout: 30000 }).catch(() => {});

                while (true) {
                    const clickedMore = await page.evaluate(() => {
                        const moreButton = document.querySelector<HTMLButtonElement>('.show-more button.more[data-url]');
                        if (!moreButton) return false;
                        if (moreButton.disabled || moreButton.getAttribute('aria-disabled') === 'true') return false;
                        moreButton.click();
                        return true;
                    }).catch(() => false);

                    if (!clickedMore) break;
                    console.log('Berluti Load More clicked');
                    await new Promise(resolve => setTimeout(resolve, 3000));
                }

                const html = await page.content();
                const protectionCheck = cheerio.load(html || '');
                const titleText = this.normalizeText(protectionCheck('title').text()).toLowerCase();
                protectionCheck('script, style, noscript, link, svg').remove();
                const bodyText = this.normalizeText(protectionCheck('body').text() || html).toLowerCase();
                if (
                    !html ||
                    titleText.includes('access denied') ||
                    bodyText.includes('access denied') ||
                    bodyText.includes("don't have permission") ||
                    bodyText.includes('captcha') ||
                    bodyText.includes('powered and protected by privacy') ||
                    bodyText.includes('request was blocked')
                ) {
                    throw new Error('Berluti protection page returned by Puppeteer');
                }

                const $ = cheerio.load(html || '');
                const urls = new Set<string>();
                const addUrl = (href: string | undefined) => {
                    if (!href || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:')) return;
                    try {
                        const url = new URL(href, listingUrl);
                        if (!url.hostname.includes('berluti.com')) return;
                        if (!url.pathname.toLowerCase().endsWith('.html')) return;
                        url.hash = '';
                        url.search = '';
                        urls.add(url.href);
                    } catch {
                        return;
                    }
                };

                const productGridWrapper = $('.product-grid-wrapper').first();
                productGridWrapper.find('.product-grid .product-tile-s, .product-grid .product-tile-xl').each((_, element) => {
                    const tile = $(element);
                    const tileText = this.normalizeText(tile.text()).toLowerCase();
                    const dataLayerText = this.normalizeText(
                        tile.attr('data-dl-object') ||
                        tile.find('[data-dl-object]').first().attr('data-dl-object') ||
                        '',
                    ).toLowerCase();
                    if (
                        tileText.includes('notify me') ||
                        tileText.includes('notify me when available') ||
                        tileText.includes('out of stock') ||
                        dataLayerText.includes('out of stock') ||
                        dataLayerText.includes('notify')
                    ) {
                        return;
                    }

                    const anchor = $(element).find('a.tile-name[href], .product-tile-image-slide a[href], a.d-block[href], a[href*=".html"]').first();
                    addUrl(anchor.attr('href'));
                });

                productUrls = Array.from(urls);
                console.log('Berluti listing URL count: ' + productUrls.length);
                if (!productUrls.length) {
                    throw new Error('상품 URL 없음');
                }
                break;
            } catch (error: any) {
                console.warn(`⚠️ 페이지 이동 실패 (chrome port ${activeSession?.port || 'none'}): ${error.message}`);
                await this.closeBerlutiChromeSession(activeSession);
                activeSession = null;
            }
        }
        


        if (productUrls.length === 0) {
            await this.closeBerlutiChromeSession(activeSession);
            activeSession = null;
            throw new Error('상품 URL을 수집하지 못했습니다. 모든 시도가 실패했습니다.');
        }
        console.log(`벨루티 최종 수집된 상품 URL 수: ${productUrls.length} - ${category?.categoryName || '카테고리 없음'}`);


        for (const [index, productUrl] of productUrls.entries()) {
            let productDetails: any = null;
            for (let attempt = 1; attempt <= BERLUTI_CHROME_PORTS.length; attempt++) {
                try {
                    const navigationUrl = productUrl.replace(/^http:\/\//i, 'https://');
                    if (!activeSession) {
                        activeSession = await this.openBerlutiChromeSession();
                    }
                    const page = activeSession.page;

                    console.log(`✅ (${index + 1}/${productUrls.length}) 벨루티 ${category?.categoryName || '카테고리 없음'} 수집 중 - chrome port ${activeSession.port}, attempt ${attempt}`);
                    await page.goto(navigationUrl, {
                        waitUntil: 'domcontentloaded',
                        timeout: 90000,
                        referer: siteUrl.replace(/^http:\/\//i, 'https://'),
                    });
                    await page.mouse.move(
                        700 + Math.floor(Math.random() * 240),
                        360 + Math.floor(Math.random() * 160),
                        { steps: 12 },
                    ).catch(() => {});
                    try {
                        await page.waitForSelector(
                            '#onetrust-reject-all-handler, #onetrust-accept-btn-handler, .onetrust-close-btn-handler, button[id*="accept"], button[id*="reject"]',
                            { timeout: 4000 },
                        );
                        await page.evaluate(() => {
                            const candidates = [
                                '#onetrust-reject-all-handler',
                                '.onetrust-close-btn-handler',
                                '#onetrust-accept-btn-handler',
                                'button[id*="reject"]',
                                'button[id*="accept"]',
                            ];
                            for (const selector of candidates) {
                                const button = document.querySelector<HTMLElement>(selector);
                                if (!button) continue;
                                button.click();
                                break;
                            }
                        });
                    } catch {}
                    await new Promise(resolve => setTimeout(resolve, 6500 + Math.floor(Math.random() * 3500)));

                    const productHtml = await page.content();
                    const protectionCheck = cheerio.load(productHtml || '');
                    const titleText = this.normalizeText(protectionCheck('title').text()).toLowerCase();
                    protectionCheck('script, style, noscript, link, svg').remove();
                    const bodyText = this.normalizeText(protectionCheck('body').text() || productHtml).toLowerCase();
                    if (
                        !productHtml ||
                        titleText.includes('access denied') ||
                        bodyText.includes('access denied') ||
                        bodyText.includes("don't have permission") ||
                        bodyText.includes('captcha') ||
                        bodyText.includes('powered and protected by privacy') ||
                        bodyText.includes('request was blocked')
                    ) {
                        throw new Error('Berluti protection page returned by Chrome port ' + activeSession.port);
                    }

                    productDetails = this.parseBerlutiProductDetails(productHtml, productUrl);
                    break;
                } catch (error: any) {
                    console.warn(`벨루티 페이지 로드 실패 (chrome port ${activeSession?.port || 'none'}) - 다음 포트로 이동합니다: ${productUrl} / ${error.message}`);
                    await this.closeBerlutiChromeSession(activeSession);
                    activeSession = null;
                }
            }

            if (!productDetails || productDetails.soldOut) {
                console.warn('벨루티 상품 품절 - 다음 productUrl로 이동');
                continue;
            }
            

            if (!productDetails || !productDetails.mainInfo || !productDetails.styleId || !productDetails.title || !productDetails.price || !productDetails.imageUrls.length || !productDetails.size || !productDetails.brandstyleId) {
                console.warn('벨루티 데이터 누락 - 다음 productUrl로 이동:', productUrl);
                console.warn('벨루티 누락 상세:', {
                    title: productDetails?.title,
                    price: productDetails?.price,
                    color: productDetails?.color,
                    size: productDetails?.size,
                    styleId: productDetails?.styleId,
                    brandstyleId: productDetails?.brandstyleId,
                    mainInfoLength: productDetails?.mainInfo?.length || 0,
                    imageCount: productDetails?.imageUrls?.length || 0,
                });
                continue; // 다음 productUrl로 이동
            }


            // 카테고리 매핑 데이터 찾기
            const categoryMapping = await this.mappingRepository.findOne({ where: { siteUrl } });
            if (!categoryMapping) {
                await this.closeBerlutiChromeSession(activeSession);
                activeSession = null;
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
                const newProduct = this.productRepository.create({
                    ...(productDetails as Record<string, any>),
                } as Partial<Product>);
        
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
                    await this.closeBerlutiChromeSession(activeSession);
                    activeSession = null;
                    throw error; // 🔥 전체 스케줄 중단
                }

                continue;
            }
        }
        await this.closeBerlutiChromeSession(activeSession);
        activeSession = null;
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
            console.error('Account not found: ' + customId + ' / ' + accountPlatform);
            return;
        }

        const partnerKey = account.partnerKey;
        const apiKey = account.apiKey;

        const product = await this.productRepository.findOne({
            where: {
                goodsno: Number(goodsNo),
                customId,
                accountPlatform,
            },
        });
        if (!product) return;

        for (let attempt = 1; attempt <= BERLUTI_CHROME_PORTS.length; attempt++) {
            let session: BerlutiChromeSession | null = null;

            try {
                const navigationUrl = visitUrl.replace(/^http:\/\//i, 'https://');
                session = await this.openBerlutiChromeSession();
                const page = session.page;

                console.log('Berluti update URL: ' + navigationUrl + ' (chrome port ' + session.port + ', attempt ' + attempt + ')');
                await page.goto(navigationUrl, {
                    waitUntil: 'domcontentloaded',
                    timeout: 90000,
                    referer: navigationUrl,
                });
                await page.mouse.move(
                    700 + Math.floor(Math.random() * 240),
                    360 + Math.floor(Math.random() * 160),
                    { steps: 12 },
                ).catch(() => {});
                try {
                    await page.waitForSelector(
                        '#onetrust-reject-all-handler, #onetrust-accept-btn-handler, .onetrust-close-btn-handler, button[id*="accept"], button[id*="reject"]',
                        { timeout: 4000 },
                    );
                    await page.evaluate(() => {
                        const candidates = [
                            '#onetrust-reject-all-handler',
                            '.onetrust-close-btn-handler',
                            '#onetrust-accept-btn-handler',
                            'button[id*="reject"]',
                            'button[id*="accept"]',
                        ];
                        for (const selector of candidates) {
                            const button = document.querySelector<HTMLElement>(selector);
                            if (!button) continue;
                            button.click();
                            break;
                        }
                    });
                } catch {}
                await this.dismissBerlutiNonProductModals(page);
                await new Promise(resolve => setTimeout(resolve, 6500 + Math.floor(Math.random() * 3500)));
                await this.dismissBerlutiNonProductModals(page);
                await this.sleep(800);

                const productHtml = await page.content();
                if (this.isBerlutiProtectionHtml(productHtml, visitUrl)) {
                    throw new Error('Berluti protection page returned by Puppeteer');
                }

                const productDetails = this.parseBerlutiProductUpdate(productHtml, visitUrl);

                if (!productDetails) {
                    continue;
                }

                if (!productDetails.soldOut) {
                    product.lastModifiedDate = new Date();
                    if (productDetails.price) product.price = productDetails.price;
                    if (productDetails.size) product.size = productDetails.size;
                    await this.productRepository.save(product);
                }

                const xmlUrl = await this.r2Service.uploadXmlToR2Update(
                    product,
                    product.styleId,
                    partnerKey,
                    productDetails.soldOut
                );

                if (!xmlUrl) {
                    console.error('XML upload failed -> ' + product.designer + ' ' + product.title);
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
                    customId + ':' + accountPlatform + ':' + goodsNo,
                    {
                    status: 'success',
                    price: product.price,
                    size: product.size,
                    updatedAt: new Date().toISOString(),
                });

                await this.godoMallService.deleteUpdateXml(xmlUrl);

                console.log('Berluti update complete: ' + product.designer + ' ' + product.title);
                return;

            } catch (err: any) {
                console.warn('berluti real chrome update failed (chrome port ' + (session?.port || 'none') + '): ' + err.message);
            } finally {
                await this.closeBerlutiChromeSession(session);
            }
        }
        console.error('All Berluti real chrome ports failed. Keeping existing product values.');
    }

}




