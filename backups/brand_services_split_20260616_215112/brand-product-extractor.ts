import type { Page } from 'puppeteer';

export interface BrandProductDetails {
    site: string;
    designer: string;
    title: string;
    price: number;
    color: string;
    size: string;
    soldOut: boolean;
    mainInfo: string;
    madeIn: string;
    styleId: string;
    brandstyleId: string;
    imageUrls: string[];
}

export interface BrandProductUpdateDetails {
    price: number;
    size: string;
    soldOut: boolean;
}

export async function waitForBrandProductPage(page: Page, timeout = 30000): Promise<void> {
    await page.waitForFunction(() => {
        const hasProductJson = Array.from(document.querySelectorAll('script[type="application/ld+json"]'))
            .some(script => {
                const text = script.textContent || '';
                return text.includes('"ProductGroup"') || text.includes('"Product"');
            });

        const selectors = [
            '.details_and_care',
            '.product-name-united-block',
            '.row.size.size-section',
            '.b-size_selection-item',
            '.main-image-block',
            '#sizeSelectorModal',
            '.ProductDetailImages',
            '.product_size_selector',
            '.ProductLongDescription',
            '.btn-addtocart',
            '[role="listbox"][id^="listbox-selectsize"]',
        ];

        return hasProductJson || selectors.some(selector => Boolean(document.querySelector(selector)));
    }, { timeout }).catch(() => {});
}

export async function prepareBrandProductDetailPage(page: Page): Promise<void> {
    await page.evaluate(() => {
        const textOf = (element: Element | null | undefined) =>
            (element?.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();

        const offwhiteSizeButton = Array.from(document.querySelectorAll<HTMLButtonElement>('button'))
            .find(button => {
                const text = textOf(button);
                return button.className.includes('product_size_selector') ||
                    text === 'select size' ||
                    text.includes('select size');
            });

        if (offwhiteSizeButton) {
            offwhiteSizeButton.click();
        }
    }).catch(() => {});

    await page.waitForSelector(
        '.size-selector__wrap .size-selector__item, .SizeSelectorFlyout__size-selector-flyout__list--cYbzY .size-selector__item, [class*="size-selector"] [class*="variation-size"]',
        { timeout: 8000 }
    ).catch(() => {});
}

export async function extractBrandProductDetails(page: Page): Promise<BrandProductDetails> {
    return page.evaluate(() => {
        const oneSize = '원사이즈';
        const host = location.hostname.toLowerCase();
        const site = host.includes('jimmychoo.com')
            ? 'Jimmychoo'
            : host.includes('versace.com')
                ? 'Versace'
                : host.includes('berluti.com')
                    ? 'Berluti'
                    : host.includes('off---white.com')
                        ? 'Offwhite'
                        : host.includes('etro.com')
                            ? 'Etro'
                            : '';
        const designer = site === 'Jimmychoo'
            ? '지미추'
            : site === 'Versace'
                ? '베르사체'
                : site === 'Berluti'
                    ? '벨루티'
                    : site === 'Offwhite'
                        ? '오프화이트'
                        : site === 'Etro'
                            ? '에트로'
                            : '';

        const normalizeText = (value: unknown) =>
            String(value || '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
        const normalizeSku = (value: unknown) =>
            normalizeText(value).replace(/[^a-z0-9]/gi, '').toUpperCase();
        const normalizeSize = (value: unknown) => {
            const text = normalizeText(value);
            if (!text) return '';
            return /^(tu|uni|os|o\/s|one size|onesize|one-size|accessories_os)$/i.test(text) ? oneSize : text;
        };
        const parsePrice = (value: unknown) => {
            if (typeof value === 'number') return Math.floor(value);
            const raw = normalizeText(value);
            if (!raw) return 0;
            const cleaned = raw
                .replace(/[^\d.,]/g, '')
                .replace(/[.,](?=\d{3}(?:\D|$))/g, '')
                .replace(',', '.');
            const parsed = Number.parseFloat(cleaned);
            return Number.isFinite(parsed) ? Math.floor(parsed) : 0;
        };
        const normalizeUrl = (url: unknown) => {
            const raw = normalizeText(url).replace(/&amp;/g, '&');
            if (!raw) return '';
            if (raw.startsWith('//')) return 'https:' + raw;
            if (raw.startsWith('/')) return new URL(raw, location.origin).href;
            return raw;
        };
        const firstSrcsetUrl = (srcset: string | null | undefined) =>
            (srcset || '').split(',').map(part => part.trim().split(/\s+/)[0]).filter(Boolean).pop() || '';
        const textWithBreaks = (element: Element | null) => {
            if (!element) return '';
            const clone = element.cloneNode(true) as HTMLElement;
            clone.querySelectorAll('script, style, link, button, a, svg').forEach(el => el.remove());
            clone.querySelectorAll('br').forEach(br => br.replaceWith('\n'));
            clone.querySelectorAll('li').forEach(li => li.appendChild(document.createTextNode('\n')));
            return (clone.textContent || '')
                .split('\n')
                .map(line => normalizeText(line))
                .filter(Boolean)
                .join('\n');
        };
        const pushUnique = (list: string[], value: unknown) => {
            const url = normalizeUrl(value);
            if (!url || list.includes(url)) return;
            list.push(url);
        };
        const htmlToText = (value: unknown) => {
            const raw = String(value || '');
            if (!/<[a-z][\s\S]*>/i.test(raw)) return raw;
            const wrapper = document.createElement('div');
            wrapper.innerHTML = raw;
            return textWithBreaks(wrapper);
        };
        const pushInfo = (parts: string[], value: unknown) => {
            const text = htmlToText(value)
                .split('\n')
                .map(line => normalizeText(line))
                .filter(Boolean)
                .join('\n');
            if (!text || text.length < 2 || parts.includes(text)) return;
            parts.push(text);
        };
        const extractMadeIn = (value: string) =>
            value.match(/made\s+in\s+([A-Za-z]+)/i)?.[1] || '';

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
        const typeText = (item: any) => normalizeText(Array.isArray(item?.['@type']) ? item['@type'].join(' ') : item?.['@type']).toLowerCase();
        const productObjects = jsonObjects.filter(item => {
            const type = typeText(item);
            return type.includes('product') || Boolean(item?.sku || item?.productGroupID || item?.offers);
        });
        const productGroups = productObjects.filter(item => typeText(item).includes('productgroup'));
        const plainProducts = productObjects.filter(item => typeText(item) === 'product' || typeText(item).includes(' product'));
        const pathSku = normalizeSku(
            location.pathname.match(/(?:-|\/)([A-Z0-9]{6,}(?:-[A-Z0-9]+)?)\.html/i)?.[1] ||
            location.pathname.match(/\/p\/([^/]+)/i)?.[1] ||
            location.pathname.match(/\/([A-Z0-9]{6,}(?:-[A-Z0-9]+)?)(?:\/)?$/i)?.[1] ||
            ''
        );
        const matchesPageSku = (item: any) => {
            if (!pathSku) return false;
            const ids = [item?.sku, item?.productGroupID, item?.productID, item?.mpn, item?.model]
                .filter(Boolean)
                .map(normalizeSku);
            return ids.some(id => id && (id === pathSku || id.includes(pathSku) || pathSku.includes(id)));
        };
        const productJson =
            (site === 'Offwhite'
                ? plainProducts.find(matchesPageSku) || plainProducts[0] || productObjects.find(matchesPageSku)
                : productGroups.find(matchesPageSku) || productGroups[0] || productObjects.find(matchesPageSku) || productObjects[0]) || {};
        const variants = Array.isArray(productJson.hasVariant)
            ? productJson.hasVariant
            : productObjects.filter(item => {
                if (item === productJson) return false;
                const groupId = normalizeSku(productJson.productGroupID || productJson.sku);
                const itemGroupId = normalizeSku(item.productGroupID || item.isVariantOf?.productGroupID);
                return groupId && itemGroupId && groupId === itemGroupId;
            });
        const getOffers = (json: any) => Array.isArray(json?.offers) ? json.offers : [json?.offers].filter(Boolean);
        const availabilityText = (json: any) => getOffers(json).map((offer: any) => normalizeText(offer?.availability).toLowerCase()).join(' ');
        const inStockFromAvailability = (text: string) => {
            if (!text) return true;
            return !text.includes('outofstock') && !text.includes('soldout') && !text.includes('discontinued');
        };
        const isVariantInStock = (variant: any) => inStockFromAvailability(availabilityText(variant));
        const inStockVariants = variants.filter(isVariantInStock);
        const getOfferPrice = (json: any) => {
            const offers = getOffers(json);
            for (const offer of offers) {
                const price = parsePrice(offer?.price ?? offer?.lowPrice ?? offer?.highPrice);
                if (price) return price;
            }
            return 0;
        };

        const extractSchemaImages = (json: any) => {
            const urls: string[] = [];
            const push = (value: any) => {
                if (!value) return;
                if (Array.isArray(value)) {
                    value.forEach(push);
                    return;
                }
                if (typeof value === 'object') {
                    push(value.url || value.contentUrl);
                    return;
                }
                pushUnique(urls, value);
            };
            push(json.image);
            variants.forEach((variant: any) => push(variant.image));
            return urls;
        };

        const extractJimmyChooSize = () => {
            if (variants.length) {
                const available = Array.from(new Set(inStockVariants.map((variant: any) => normalizeSize(variant.size)).filter(Boolean)));
                if (available.length) return { size: available.join(','), soldOut: false };
                return { size: oneSize, soldOut: true };
            }
            const productAvailability = availabilityText(productJson);
            return { size: oneSize, soldOut: !inStockFromAvailability(productAvailability) };
        };
        const extractVersaceSize = () => {
            const section = document.querySelector('.row.size.size-section, [data-attr="size"].size-section, [data-attr="size"]');
            if (!section) return { size: oneSize, soldOut: false };
            const options = Array.from(section.querySelectorAll('.size-option, .b-size_selection-item, input[data-attr-value], input[data-displayvalue], label[data-isinstock]'));
            const sizes: string[] = [];
            options.forEach(option => {
                const element = option as HTMLElement;
                const input = element.matches('input') ? element as HTMLInputElement : element.querySelector('input[data-attr-value], input[data-displayvalue]') as HTMLInputElement | null;
                const label = element.matches('label') ? element as HTMLElement : element.querySelector('label') as HTMLElement | null;
                const inStockValue = element.getAttribute('data-isinstock') || input?.getAttribute('data-isinstock') || label?.getAttribute('data-isinstock') || '';
                const aria = normalizeText(input?.getAttribute('aria-label') || element.getAttribute('aria-label') || label?.getAttribute('aria-label')).toLowerCase();
                const className = `${element.className || ''} ${input?.className || ''}`.toLowerCase();
                const isUnavailable =
                    inStockValue.toLowerCase() === 'false' ||
                    aria.includes('out of stock') ||
                    className.includes('disabled') ||
                    className.includes('unselectable') ||
                    Boolean(input?.disabled);
                if (isUnavailable) return;
                const size = normalizeSize(input?.getAttribute('data-displayvalue') || input?.getAttribute('data-attr-value') || label?.textContent || element.textContent);
                if (size && !sizes.includes(size)) sizes.push(size);
            });
            return sizes.length ? { size: sizes.join(','), soldOut: false } : { size: oneSize, soldOut: true };
        };
        const extractBerlutiSize = () => {
            const list = document.querySelector('#sizeSelectorModal .js-size-selector-list.size-selector-list, #sizeSelectorModal .size-selector-list');
            if (!list) return { size: oneSize, soldOut: false };
            const buttons = Array.from(list.querySelectorAll<HTMLButtonElement>('.size-selector-btn'))
                .filter(button => !button.className.includes('size-selector-side-btn'));
            if (!buttons.length) return { size: oneSize, soldOut: false };
            const sizes = buttons
                .filter(button => !button.disabled && !button.classList.contains('disabled'))
                .map(button => normalizeSize(button.textContent))
                .filter(Boolean)
                .map(size => size.replace(/^0(?=\d)/, ''));
            const unique = Array.from(new Set(sizes));
            return unique.length ? { size: unique.join(','), soldOut: false } : { size: oneSize, soldOut: true };
        };
        const extractOffwhiteSize = () => {
            const productAvailability = availabilityText(productJson);
            const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>('button'));
            const hasSizeButton = buttons.some(button => {
                const text = normalizeText(button.textContent).toLowerCase();
                return button.className.includes('product_size_selector') || text.includes('select size');
            });
            const hasAddButton = buttons.some(button => {
                const text = normalizeText(button.textContent).toLowerCase();
                return (text.includes('add to bag') || text.includes('add to cart')) &&
                    !text.includes('notify') &&
                    !text.includes('out of stock') &&
                    !text.includes('sold out');
            });

            if (!hasSizeButton && productAvailability && !inStockFromAvailability(productAvailability) && !hasAddButton) {
                return { size: oneSize, soldOut: true };
            }
            if (!hasSizeButton) return { size: oneSize, soldOut: false };

            const items = Array.from(document.querySelectorAll(
                '.size-selector__wrap .size-selector__item, .SizeSelectorFlyout__size-selector-flyout__list--cYbzY .size-selector__item, [class*="size-selector"] [class*="size-selector__item"]'
            ));
            if (!items.length) return { size: oneSize, soldOut: false };

            const sizes = items
                .filter(item => {
                    const detail = normalizeText(item.querySelector('.size-selector__variation-details, [class*="variation-details"]')?.textContent).toLowerCase();
                    return !item.className.toString().includes('notify-me') && !detail.includes('notify');
                })
                .map(item => normalizeSize(item.querySelector('.size-selector__variation-size, [class*="variation-size"]')?.textContent))
                .filter(Boolean);
            const unique = Array.from(new Set(sizes));
            return unique.length ? { size: unique.join(','), soldOut: false } : { size: oneSize, soldOut: true };
        };
        const extractEtroSize = () => {
            if (document.querySelector('.btn-addtocart.btn-addtocart--notifyme')) {
                return { size: oneSize, soldOut: true };
            }
            const options = Array.from(document.querySelectorAll('[role="listbox"][id^="listbox-selectsize"] li[role="option"], ul[role="listbox"] li[role="option"]'));
            if (!options.length) return { size: oneSize, soldOut: false };
            const sizes = options
                .filter(option => option.getAttribute('data-available') !== 'false')
                .map(option => normalizeSize(option.getAttribute('data-displayvalue') || option.getAttribute('value') || option.textContent))
                .filter(Boolean);
            const unique = Array.from(new Set(sizes));
            return unique.length ? { size: unique.join(','), soldOut: false } : { size: oneSize, soldOut: true };
        };

        const sizeState = site === 'Jimmychoo'
            ? extractJimmyChooSize()
            : site === 'Versace'
                ? extractVersaceSize()
                : site === 'Berluti'
                    ? extractBerlutiSize()
                    : site === 'Offwhite'
                        ? extractOffwhiteSize()
                        : site === 'Etro'
                            ? extractEtroSize()
                            : { size: oneSize, soldOut: false };

        let title = normalizeText(productJson.name);
        if (site === 'Jimmychoo') {
            const mainName = normalizeText(document.querySelector('.product-name-united-block .product-name, .js-product-name')?.textContent);
            const shortDescription = normalizeText(document.querySelector('.product-name-united-block .product-short-description, .product-short-description')?.textContent);
            title = [mainName || title, shortDescription].filter(Boolean).join(' ');
        } else if (site === 'Berluti') {
            const shortDescription = normalizeText(document.querySelector('.product-description.js-product-short-description, .js-product-short-description')?.textContent);
            title = [title, shortDescription].filter(Boolean).join(' ');
        }

        let styleId = site === 'Jimmychoo'
            ? normalizeText(productJson.productGroupID || productJson.sku || productJson.mpn || '')
            : normalizeText(productJson.sku || productJson.mpn || productJson.productGroupID || '');
        if (site === 'Berluti') {
            const idRow = Array.from(document.querySelectorAll('.tab-panel-row, .row.no-gutters')).find(row => {
                const dt = normalizeText(row.querySelector('dt, .tab-panel-section-title')?.textContent).toLowerCase();
                return dt === 'id';
            });
            styleId = normalizeText(idRow?.querySelector('dd, .tab-panel-section-content')?.textContent) || styleId;
        }
        const brandstyleId = styleId;

        let price =
            inStockVariants.map(getOfferPrice).find(Boolean) ||
            variants.map(getOfferPrice).find(Boolean) ||
            getOfferPrice(productJson);
        if (!price) {
            price = parsePrice(document.querySelector('.price, .sales, [class*="price"]')?.textContent);
        }

        let color = normalizeText(productJson.color || variants.find((variant: any) => normalizeText(variant.color))?.color);
        if (site === 'Etro') {
            color = normalizeText(inStockVariants.find((variant: any) => normalizeText(variant.color))?.color || variants.find((variant: any) => normalizeText(variant.color))?.color || color);
        }

        const imageUrls: string[] = [];
        if (site === 'Berluti') {
            document.querySelectorAll('.main-image-block.col-12.pr-lg-5 .pdp-image-slide img, .main-image-block .pdp-image-slide img').forEach(image => {
                const img = image as HTMLImageElement;
                pushUnique(imageUrls, img.getAttribute('data-src') || img.getAttribute('src'));
                pushUnique(imageUrls, firstSrcsetUrl(img.getAttribute('srcset')));
            });
        } else if (site === 'Offwhite') {
            document.querySelectorAll('.ProductDetailImages img, .ProductDetailImages source, [class*="ProductDetailImages"] img, [class*="ProductDetailImages"] source').forEach(element => {
                const htmlElement = element as HTMLImageElement;
                pushUnique(imageUrls, htmlElement.getAttribute('src'));
                pushUnique(imageUrls, firstSrcsetUrl(htmlElement.getAttribute('srcset')));
            });
        }
        extractSchemaImages(productJson).forEach(url => pushUnique(imageUrls, url));

        const filteredImages = Array.from(new Set(imageUrls))
            .filter(url => /^https?:\/\//i.test(url))
            .filter(url => {
                if (site === 'Berluti') return url.includes('/dw/image') || url.includes('berluti');
                if (site === 'Offwhite') return url.includes('/dw/image') || url.includes('off---white');
                return true;
            })
            .slice(0, 9);

        const infoParts: string[] = [];
        if (site === 'Jimmychoo') {
            pushInfo(infoParts, textWithBreaks(document.querySelector('.details_and_care')));
            if (!infoParts.length) pushInfo(infoParts, productJson.description);
        } else if (site === 'Versace') {
            pushInfo(infoParts, textWithBreaks(document.querySelector('.b-drawer-body.m-active-body, .b-drawer-body, .product-long-description, .b-product_details, .pdp-main__description, .product-description, [class*="product-detail"]')));
            pushInfo(infoParts, textWithBreaks(document.querySelector('.description-and-detail, .accordion, .product-details')));
            if (!infoParts.length) pushInfo(infoParts, productJson.description);
        } else if (site === 'Berluti') {
            pushInfo(infoParts, productJson.description);
            pushInfo(infoParts, textWithBreaks(document.querySelector('#panel-product-details, [aria-labelledby="tab-product-details"], .product-details-content')));
        } else if (site === 'Offwhite') {
            pushInfo(infoParts, productJson.description);
            pushInfo(infoParts, productJson.material);
            pushInfo(infoParts, textWithBreaks(document.querySelector('.accordion-content.active, [class*="ProductLongDescription"], .supplier-code')?.closest('.accordion-content') || document.querySelector('.accordion-content.active')));
        } else if (site === 'Etro') {
            pushInfo(infoParts, productJson.description);
            pushInfo(infoParts, productJson.material);
        } else {
            pushInfo(infoParts, productJson.description);
            pushInfo(infoParts, productJson.material);
        }
        const mainInfo = infoParts.join('\n\n');
        const madeIn = site === 'Versace' || site === 'Offwhite' ? '' : extractMadeIn(mainInfo);

        return {
            site,
            designer,
            title,
            price,
            color,
            size: sizeState.size,
            soldOut: sizeState.soldOut,
            mainInfo,
            madeIn,
            styleId,
            brandstyleId,
            imageUrls: filteredImages,
        };
    });
}

export async function extractBrandProductUpdate(page: Page): Promise<BrandProductUpdateDetails> {
    const details = await extractBrandProductDetails(page);
    return {
        price: details.price,
        size: details.size,
        soldOut: details.soldOut,
    };
}
