import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { GodoMallService } from 'src/godomall/godomall.service';
import { Repository } from 'typeorm';
import { R2Service } from '../cloudflare/r2.service';
import * as cheerio from 'cheerio';
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
import { getHtmlFromBrightDataUnlocker } from '../brightdata/brightdata-unlocker.util';


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
export class RogervivierService {
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
    private normalizeProductUrl(rawUrl: string | null | undefined, baseUrl: string): string | null {
        if (!rawUrl) return null;

        const cleanedUrl = rawUrl
            .replace(/&amp;/g, '&')
            .replace(/\\u002F/g, '/')
            .replace(/\\\//g, '/')
            .trim();

        if (!cleanedUrl || !cleanedUrl.includes('/p/')) return null;

        try {
            const productUrlMatch = cleanedUrl.match(/((?:https?:\/\/(?:www\.)?rogervivier\.com)?(?:\/[a-z]{2}-[a-z]{2})?\/[^"'<>\s\\)]+?\/p\/[A-Z0-9]+)\/?/i);
            const candidateUrl = productUrlMatch ? `${productUrlMatch[1]}/` : cleanedUrl;
            const url = new URL(candidateUrl, baseUrl);
            if (!url.hostname.includes('rogervivier.com')) return null;

            url.search = '';
            url.hash = '';

            if (!/\/p\/[^/?#]+\/?$/i.test(url.pathname)) return null;

            return url.href;
        } catch {
            return null;
        }
    }

    private extractProductUrlsFromHtml(html: string, baseUrl: string): string[] {
        const urls = new Set<string>();
        const normalizedHtml = (html || '')
            .replace(/&amp;/g, '&')
            .replace(/\\u002F/g, '/')
            .replace(/\\\//g, '/');

        const patterns = [
            /https?:\/\/(?:www\.)?rogervivier\.com\/[^"'<>\s\\]+\/p\/[^"'<>\s\\]+\/?/gi,
            /(?:\/[a-z]{2}-[a-z]{2})?\/[^"'<>\s\\]+\/p\/[^"'<>\s\\]+\/?/gi,
        ];

        for (const pattern of patterns) {
            const matches = normalizedHtml.match(pattern) || [];
            for (const match of matches) {
                const productUrl = this.normalizeProductUrl(match, baseUrl);
                if (productUrl) urls.add(productUrl);
            }
        }

        return Array.from(urls);
    }

    private extractExpectedProductCountFromHtml(html: string): number {
        const normalized = (html || '')
            .replace(/\\u00e9/g, 'é')
            .replace(/&eacute;/gi, 'é');
        const match = normalized.match(/(\d+)\s+R.{0,3}sultats/i);
        const count = match ? Number(match[1]) : 0;
        return Number.isFinite(count) ? count : 0;
    }

    private normalizeText(value: any): string {
        return String(value || '').replace(/\s+/g, ' ').trim();
    }

    private normalizeForMatch(value: any): string {
        return this.normalizeText(value)
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase();
    }

    private parsePrice(value: any): number {
        const raw = this.normalizeText(value);
        if (!raw) return 0;

        const cleaned = raw
            .replace(/[^\d.,]/g, '')
            .replace(/[.,](?=\d{3}(?:\D|$))/g, '')
            .replace(',', '.');

        const parsed = Number.parseFloat(cleaned);
        return Number.isFinite(parsed) ? Math.floor(parsed) : 0;
    }

    private normalizeAssetUrl(rawUrl: string | null | undefined, baseUrl: string): string {
        if (!rawUrl) return '';

        const firstUrl = rawUrl
            .split(',')
            .map(part => part.trim().split(/\s+/)[0])
            .find(Boolean) || '';

        const cleanUrl = firstUrl
            .replace(/&amp;/g, '&')
            .replace(/\\u002F/g, '/')
            .replace(/\\\//g, '/')
            .trim();

        if (!cleanUrl) return '';

        try {
            if (cleanUrl.startsWith('//')) return `https:${cleanUrl}`;
            if (cleanUrl.startsWith('/')) return new URL(cleanUrl, baseUrl).href;
            return cleanUrl;
        } catch {
            return cleanUrl;
        }
    }

    private parseJsonLdItems(html: string): any[] {
        const $ = cheerio.load(html || '');
        const items: any[] = [];

        $('script[type="application/ld+json"]').each((_, element) => {
            const raw = this.normalizeText($(element).html());
            if (!raw) return;

            try {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) {
                    items.push(...parsed);
                } else if (Array.isArray(parsed?.['@graph'])) {
                    items.push(...parsed['@graph']);
                } else {
                    items.push(parsed);
                }
            } catch {
                // ignore malformed structured data
            }
        });

        return items;
    }

    private findProductJson(jsonItems: any[], productUrl: string): any {
        const currentSku = productUrl.match(/\/p\/([A-Z0-9]+)/i)?.[1] || '';
        const isProduct = (item: any) => {
            const typeValue = Array.isArray(item?.['@type'])
                ? item['@type'].join(' ')
                : item?.['@type'];
            return this.normalizeText(typeValue).toLowerCase().includes('product');
        };

        return (
            jsonItems.find(item => {
                if (!isProduct(item)) return false;
                if (!currentSku) return true;
                return [item?.sku, item?.mpn].filter(Boolean).map(String).includes(currentSku);
            }) ||
            jsonItems.find(item => isProduct(item)) ||
            {}
        );
    }

    private async getRogerVivierHtml(url: string, _expect?: { element?: string; text?: string }): Promise<string> {
        return getHtmlFromBrightDataUnlocker(url, {
            debugLabel: 'rogervivier',
            saveRetryResponses: true,
            randomRetryDelay: true,
            country: 'fr',
        });
    }

    private collectProductUrlsFromListingHtml(html: string, listingUrl: string): {
        urls: string[];
        diagnostics: Record<string, any>;
    } {
        const $ = cheerio.load(html || '');
        const urls = new Set<string>();
        const expectedProductCount = this.extractExpectedProductCountFromHtml(html);

        $('.Product.product-list-item.Product-grid-item-container > a.Product-grid-item[href], .Product-grid-item-container a.Product-grid-item[href], a.Product-grid-item[href]').each((_, element) => {
            const productUrl = this.normalizeProductUrl($(element).attr('href'), listingUrl);
            if (productUrl) urls.add(productUrl);
        });

        if (!urls.size) {
            $('a[href*="/p/"]').each((_, element) => {
                const productUrl = this.normalizeProductUrl($(element).attr('href'), listingUrl);
                if (productUrl) urls.add(productUrl);
            });
        }

        if (!urls.size || (expectedProductCount > 0 && urls.size < expectedProductCount)) {
            for (const productUrl of this.extractProductUrlsFromHtml(html, listingUrl)) {
                urls.add(productUrl);
            }
        }

        const rawProductUrlCount = urls.size;
        let collectedUrls = Array.from(urls);
        if (expectedProductCount > 0 && collectedUrls.length > expectedProductCount) {
            collectedUrls = collectedUrls.slice(0, expectedProductCount);
        }

        return {
            urls: collectedUrls,
            diagnostics: {
                listingUrl,
                expectedProductCount,
                rawProductUrlCount,
                returnedProductUrlCount: collectedUrls.length,
                isCapped: expectedProductCount > 0 && rawProductUrlCount > expectedProductCount,
                hrefCount: $('a[href]').length,
                productCardCount: $('.Product.product-list-item.Product-grid-item-container, .Product-grid-item-container').length,
                skuPreview: $('.Product.product-list-item[data-sku], .Product-grid-item-container[data-sku]')
                    .map((_, element) => $(element).attr('data-sku'))
                    .get()
                    .filter(Boolean)
                    .slice(0, 10),
                gridHrefPreview: $('.Product-grid-item-container a.Product-grid-item[href], a.Product-grid-item[href], a[href*="/p/"]')
                    .map((_, element) => $(element).attr('href'))
                    .get()
                    .filter(Boolean)
                    .slice(0, 10),
                title: this.normalizeText($('title').text()),
                bodyText: this.normalizeText($('body').text()).slice(0, 300),
            },
        };
    }

    private async collectRogerVivierProductUrls(siteUrl: string): Promise<{
        urls: string[];
        diagnostics: Record<string, any>[];
    }> {
        const baseListingUrl = siteUrl
            .replace(/\/page\/\d+\/?$/i, '')
            .replace(/\/+$/, '');
        const listingUrls = [`${baseListingUrl}/page/20/`];
        const diagnosticsList: Record<string, any>[] = [];

        for (const listingUrl of listingUrls) {
            try {
                const html = await this.getRogerVivierHtml(listingUrl, {
                    element: '.Product-grid-item, a[href*="/p/"]',
                });
                const collected = this.collectProductUrlsFromListingHtml(html, listingUrl);
                diagnosticsList.push(collected.diagnostics);

                if (collected.urls.length) {
                    return {
                        urls: collected.urls,
                        diagnostics: diagnosticsList,
                    };
                }
            } catch (error: any) {
                diagnosticsList.push({
                    listingUrl,
                    brightDataError: error.message,
                });
            }
        }

        return {
            urls: [],
            diagnostics: diagnosticsList,
        };
    }

    private parseRogerVivierCategoriesFromHtml(html: string, siteUrl: string): {
        categoryName: string;
        url: string;
        needsTranslation?: boolean;
    }[] {
        const $ = cheerio.load(html || '');
        const results: { categoryName: string; url: string; needsTranslation?: boolean }[] = [];
        const seen = new Set<string>();
        const allowedParents = new Set(['souliers', 'sacs & petite maroquinerie', 'accessoires']);
        const badExactNames = new Set([
            'maison roger vivier',
            'wishlist',
            'store locator',
            'trouver une boutique',
            'nouvelle collection',
            'new collection',
        ]);

        const addCategory = (categoryName: string, href: string | null | undefined) => {
            const name = this.normalizeText(categoryName)
                .replace(/\bNew\b/gi, '')
                .replace(/\bNouveau\b/gi, '')
                .trim();
            const lowerName = name.toLowerCase();
            if (!name || badExactNames.has(lowerName)) return;

            try {
                const absoluteUrl = new URL(href || '', siteUrl).href.split('#')[0];
                const lowerUrl = absoluteUrl.toLowerCase();
                if (
                    !lowerUrl.includes('rogervivier.com') ||
                    lowerUrl.includes('/wishlist') ||
                    lowerUrl.includes('/storelocator') ||
                    lowerUrl.includes('/store-locator') ||
                    lowerUrl.includes('/client-service') ||
                    lowerUrl.includes('/contact')
                ) {
                    return;
                }
                if (seen.has(absoluteUrl)) return;
                seen.add(absoluteUrl);

                results.push({
                    categoryName: name,
                    url: absoluteUrl,
                    needsTranslation: true,
                });
            } catch {
                // skip malformed category url
            }
        };

        $('li.Header-nav-item').each((_, item) => {
            const parentTitle = this.normalizeText($(item).find('.Header-nav-title').first().text());
            if (!allowedParents.has(parentTitle.toLowerCase())) return;

            const container = $(item).nextAll('.Header-nav-content-container').first();
            if (!container.length) return;

            container.find('.Header-nav-subtitle a[href]').each((__, element) => {
                const anchor = $(element);
                const firstSpanText = this.normalizeText(anchor.find('span:not(.additional-label)').first().text());
                const name = firstSpanText || this.normalizeText(anchor.text());
                addCategory(`${parentTitle} - ${name}`, anchor.attr('href'));
            });
        });

        if (!results.length) {
            $('a[href*="/c/"]').each((_, element) => {
                const anchor = $(element);
                const name = this.normalizeText(anchor.find('span:not(.additional-label)').first().text()) || this.normalizeText(anchor.text());
                if (!name) return;
                addCategory(name, anchor.attr('href'));
            });
        }

        return results;
    }

    private parseRogerVivierProductDetails(html: string, productUrl: string): any {
        const $ = cheerio.load(html || '');
        const oneSize = '원사이즈';
        const site = 'Rogervivier';
        const designer = '로저비비에';
        const jsonItems = this.parseJsonLdItems(html);
        const productJson = this.findProductJson(jsonItems, productUrl);
        const currentSku = productUrl.match(/\/p\/([A-Z0-9]+)/i)?.[1] || '';

        const title =
            this.normalizeText(productJson?.name) ||
            this.normalizeText($('h1, .product-name, .Product-product-details-content-title').first().text());
        const color =
            this.normalizeText(productJson?.color) ||
            this.normalizeText($('.Product-grid-item-color, .selected-value.color-black').first().text());
        const styleId = this.normalizeText(productJson?.sku || productJson?.mpn || currentSku);
        const brandstyleId = styleId;
        const price = this.parsePrice($('.prd-price').first().text());

        const imageUrls = new Set<string>();
        $('.pdp-gallery .pdp-glly__w-img').each((_, item) => {
            const holder = $(item);
            const desktopSource =
                holder.find('source').filter((__, source) => $(source).attr('media') === '(min-width:1280px)').first().attr('srcset') ||
                holder.find('source[media*="1280"]').first().attr('srcset');
            const rawImage =
                desktopSource ||
                holder.find('img.pdp-glly__img').first().attr('data-src') ||
                holder.find('img.pdp-glly__img').first().attr('src') ||
                holder.find('img').first().attr('data-src') ||
                holder.find('img').first().attr('src') ||
                '';
            const imageUrl = this.normalizeAssetUrl(rawImage, productUrl);
            if (imageUrl.includes('/fashion/rogervivier/')) {
                imageUrls.add(imageUrl);
            }
        });

        const productImages = Array.isArray(productJson?.image)
            ? productJson.image
            : productJson?.image
                ? [productJson.image]
                : [];
        productImages.forEach((image: any) => {
            const imageUrl = this.normalizeAssetUrl(String(image || ''), productUrl);
            if (imageUrl) imageUrls.add(imageUrl);
        });

        const mainInfoParts: string[] = [];
        const cleanPush = (text: any) => {
            const value = this.normalizeText(text);
            if (value && value.length >= 2) mainInfoParts.push(value);
        };

        cleanPush($('.details-and-care-overlay-content .details-and-care-details__content').first().text());
        $('.details-and-care-overlay-content .details-and-care-features__content li').each((_, item) => cleanPush($(item).text()));
        cleanPush($('.details-and-care-overlay-content .details-and-care__cod').first().text());

        $('.size-and-fit__dimension-container').each((_, container) => {
            const titleText = this.normalizeText($(container).find('.size-and-fit__dimension-title').first().text()) || 'Dimensions';
            const rows = $(container)
                .find('.size-and-fit__dimension-row')
                .map((__, row) => {
                    const label = this.normalizeText($(row).find('.size-and-fit__dimension-label').first().text());
                    const value = this.normalizeText($(row).find('.size-and-fit__dimension-value').first().text());
                    return [label, value].filter(Boolean).join(' ');
                })
                .get()
                .filter(Boolean);

            if (rows.length) {
                cleanPush(`${titleText}: ${rows.join(' / ')}`);
            }
        });

        let mainInfo = Array.from(new Set(mainInfoParts)).join('\n');
        if (!mainInfo) {
            mainInfo = this.normalizeText(productJson?.description);
        }

        const madeInMatch = mainInfo.match(/Fabriqu[eé]\s+en\s+([A-Za-zÀ-ÿ]+)/i);
        const madeIn = this.normalizeText(madeInMatch?.[1]);

        const actionButtons = $('button.product-main-action, button.Product-product-details-content-add, button.js-selectSize-trigger, button[aria-label]')
            .map((_, button) => {
                const element = $(button);
                const text = this.normalizeText(element.text());
                const ariaLabel = this.normalizeText(element.attr('aria-label'));
                const className = this.normalizeText(element.attr('class'));
                const matchLabel = this.normalizeForMatch(`${ariaLabel} ${text}`);
                return {
                    text,
                    ariaLabel,
                    className,
                    disabled: element.attr('disabled') !== undefined,
                    ariaHidden: this.normalizeText(element.attr('aria-hidden')),
                    matchLabel,
                };
            })
            .get();
        const hasAny = (value: string, needles: string[]) => needles.some(needle => value.includes(needle));
        const soldOutButtonNeedles = ['me prevenir', 'prevenir', 'notify', 'out of stock', 'sold out'];
        const isSoldOutActionButton = (button: any) =>
            button.className.includes('js-notifyMe-trigger') ||
            hasAny(button.matchLabel, soldOutButtonNeedles);
        const selectSizeButton = actionButtons.find(button =>
            button.className.includes('js-selectSize-trigger') ||
            hasAny(button.matchLabel, ['selectionner une taille', 'select size'])
        );
        const addToCartButton = actionButtons.find(button => {
            if (button.className.includes('js-selectSize-trigger')) return false;
            if (button.disabled) return false;
            if (isSoldOutActionButton(button)) return false;
            return hasAny(button.matchLabel, ['ajouter au panier', 'add to cart']);
        });
        const soldOutActionButton = actionButtons.find(button => isSoldOutActionButton(button));

        const rawSizeItems = $('#size-selector .selectSize-item-container')
            .map((_, item) => {
                const element = $(item);
                return {
                    text: this.normalizeText(element.text()),
                    ariaLabel: this.normalizeText(element.attr('aria-label')),
                    className: this.normalizeText(element.attr('class')),
                    disabled: element.attr('disabled') !== undefined,
                    sizeClassName: this.normalizeText(element.find('.selectSize-item-size').first().attr('class')),
                };
            })
            .get();
        const sizes = Array.from(new Set(
            $('#size-selector .selectSize-item-container')
                .map((_, item) => {
                    const element = $(item);
                    const text = this.normalizeText(element.text());
                    const disabled = element.attr('disabled') !== undefined;
                    const sizeClassName = this.normalizeText(element.find('.selectSize-item-size').first().attr('class'));
                    if (disabled) return '';
                    if (sizeClassName.includes('out-of-stock')) return '';
                    if (this.normalizeForMatch(text).includes('me prevenir')) return '';
                    return this.normalizeText(element.find('.selectSize-item-size').first().text());
                })
                .get()
                .filter(Boolean)
        ));

        let size = oneSize;
        let soldOut = false;
        let soldOutReason = '';
        const sizeDebug: Record<string, any> = {
            hasSelectSizeButton: !!selectSizeButton,
            hasAddToCartButton: !!addToCartButton,
            buttonTexts: actionButtons.map(button => button.text).filter(Boolean),
            buttonStates: actionButtons,
            detectedMode: '',
            rawSizeItems,
            availableSizes: sizes,
        };

        if (selectSizeButton) {
            sizeDebug.detectedMode = 'sizeSelect';
            if (sizes.length) {
                size = sizes.join(',');
            } else {
                soldOut = true;
                soldOutReason = rawSizeItems.length
                    ? '사이즈 선택 항목은 있으나 선택 가능한 사이즈가 없음'
                    : '사이즈 선택 버튼은 있으나 Web Unlocker HTML에서 size selector 항목을 찾지 못함';
            }
        } else if (addToCartButton) {
            sizeDebug.detectedMode = 'oneSizeAddToCart';
            size = oneSize;
        } else {
            soldOut = true;
            sizeDebug.detectedMode = soldOutActionButton ? 'soldOutButton' : 'unknownButtonState';
            soldOutReason = soldOutActionButton
                ? `품절성 버튼 감지: ${soldOutActionButton.text || soldOutActionButton.ariaLabel}`
                : '장바구니/사이즈선택 버튼 모두 없음';
        }

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
            imageUrls: Array.from(imageUrls).slice(0, 9),
            soldOutReason,
            sizeDebug,
        };
    }
  


    async getCategories(siteUrls: string[]): Promise<{ categoryName: string; url: string }[]> {
        const allCategories: { categoryName: string; url: string; needsTranslation?: boolean }[] = [];

        for (const siteUrl of siteUrls) {
            try {
                console.log(`Category crawl: ${siteUrl}`);
                const categoryHtml = await this.getRogerVivierHtml(siteUrl, {
                    element: '.Header-nav-item, a[href*="/c/"]',
                });
                const categories = this.parseRogerVivierCategoriesFromHtml(categoryHtml, siteUrl);
                allCategories.push(...categories);
            } catch (error: any) {
                console.error(`[${siteUrl}] category crawl failed: ${error.message}`);
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
            const proxyLines = await this.r2Service.loadBrightProxies2().catch(() => []);
            let response;
            let lastError: any = null;
            const maxAttempts = Math.max(1, Math.min(proxyLines.length || 1, 3));

            for (let attempt = 0; attempt < maxAttempts; attempt++) {
                const proxy = proxyLines.length ? pickProxy(proxyLines) : null;

                try {
                    response = await axios.get(imageUrl, {
                        responseType: 'arraybuffer',
                        timeout: 30000, // 타임아웃 설정
                        headers: {
                            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36",
                            "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
                            "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
                            "Referer": product.visitUrl || "https://www.rogervivier.com/fr-fr/",
                        },
                        proxy: proxy
                            ? {
                                protocol: 'http',
                                host: proxy.host,
                                port: proxy.port,
                                auth: {
                                    username: proxy.username,
                                    password: proxy.password,
                                },
                            }
                            : undefined,
                    });
                    break;
                } catch (error: any) {
                    lastError = error;
                    console.warn(`로저비비에 이미지 다운로드 실패 (${attempt + 1}/${maxAttempts}): ${error.message}`);
                }
            }

            if (!response) {
                throw lastError || new Error('이미지 다운로드 실패');
            }
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
  
  
    
  
    // 로저비비에 사이트 크롤링 시작
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

        const collectedProductUrls = await this.collectRogerVivierProductUrls(siteUrl);
        const productUrls = collectedProductUrls.urls;

        if (!productUrls.length) {
            throw new Error(`상품 URL을 수집하지 못했습니다. diagnostics=${JSON.stringify(collectedProductUrls.diagnostics).slice(0, 1500)}`);
        }
        console.log(`로저비비에 최종 수집된 상품 URL 수: ${productUrls.length} - ${category?.categoryName || '카테고리 없음'}`);

        // 카테고리 매핑 데이터 찾기
        const categoryMapping = await this.mappingRepository.findOne({ where: { siteUrl } });
        if (!categoryMapping) {
            throw new Error('매핑된 카테고리를 찾을 수 없습니다.');
        }

        const processProduct = async (productUrl: string, index: number) => {
            console.log(`✅ (${index + 1}/${productUrls.length}) 로저비비에 ${category?.categoryName || '카테고리 없음'}  수집 중`);

            let productDetails: any = null;
            try {
                const productHtml = await this.getRogerVivierHtml(productUrl, {
                    element: 'script[type="application/ld+json"], .prd-price, .pdp-gallery, button.product-main-action',
                });
                productDetails = this.parseRogerVivierProductDetails(productHtml, productUrl);
            } catch (error: any) {
                console.warn(`로저비비에 상품 HTML 수집 실패 - 다음 productUrl로 이동: ${productUrl} - ${error.message}`);
                return;
            }

            // 🔴 전부 품절
            if (!productDetails || productDetails.soldOut) {
                console.warn('로저비비에 상품 품절 - 다음 productUrl로 이동:', {
                    productUrl,
                    title: productDetails?.title,
                    styleId: productDetails?.styleId,
                    price: productDetails?.price,
                    size: productDetails?.size,
                    soldOutReason: productDetails?.soldOutReason,
                    sizeDebug: productDetails?.sizeDebug,
                    mainInfoLength: productDetails?.mainInfo?.length || 0,
                    imageCount: productDetails?.imageUrls?.length || 0,
                });
                return;
            }
            

            if (!productDetails || !productDetails.mainInfo || !productDetails.styleId || !productDetails.title || !productDetails.price || !productDetails.imageUrls.length || !productDetails.size || !productDetails.brandstyleId) {
                const missingFields = [
                    !productDetails && 'productDetails',
                    productDetails && !productDetails.mainInfo && 'mainInfo',
                    productDetails && !productDetails.styleId && 'styleId',
                    productDetails && !productDetails.title && 'title',
                    productDetails && !productDetails.price && 'price',
                    productDetails && !productDetails.imageUrls.length && 'imageUrls',
                    productDetails && !productDetails.size && 'size',
                    productDetails && !productDetails.brandstyleId && 'brandstyleId',
                ].filter(Boolean);
                console.warn('로저비비에 데이터 누락 - 다음 productUrl로 이동:', {
                    productUrl,
                    missingFields,
                    title: productDetails?.title,
                    styleId: productDetails?.styleId,
                    price: productDetails?.price,
                    color: productDetails?.color,
                    size: productDetails?.size,
                    mainInfoLength: productDetails?.mainInfo?.length || 0,
                    imageCount: productDetails?.imageUrls?.length || 0,
                    soldOutReason: productDetails?.soldOutReason,
                    sizeDebug: productDetails?.sizeDebug,
                });
                return; // 다음 productUrl로 이동
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
                const newProduct = this.productRepository.create();
                Object.assign(newProduct, productDetails);
        
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

                return;
            }
        };

        const chunkSize = 30;
        for (let i = 0; i < productUrls.length; i += chunkSize) {
            const chunk = productUrls.slice(i, i + chunkSize);
            await Promise.all(chunk.map((productUrl, chunkIndex) => processProduct(productUrl, i + chunkIndex)));
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
                const productHtml = await this.getRogerVivierHtml(visitUrl, {
                    element: 'script[type="application/ld+json"], .prd-price, button.product-main-action',
                });
                const productDetails = this.parseRogerVivierProductDetails(productHtml, visitUrl);


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
                console.warn(`🚨 rogervivier 업데이트 실패 (${attempt}/${MAX_RETRY}): ${err.message}`);
            }
        }
        console.error('❌ 모든 Bright Data 재시도 실패 → 업데이트 포기 (기존값 유지)');
    }
}
