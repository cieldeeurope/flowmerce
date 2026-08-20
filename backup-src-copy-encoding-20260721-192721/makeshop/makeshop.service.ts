import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import axios, { Method } from 'axios';
import { Repository } from 'typeorm';
import { CategoryService } from 'src/category/category.service';
import { HostingAccount } from 'src/hosting/hostingaccount.entity';
import { MarginService } from 'src/margin/margin.service';
import { Product } from 'src/product/product.entity';
import { OpenApiService } from 'src/smartstore/openApi.service';
import { WordReplacementService } from 'src/word-replacement/word-replacement.service';
import { getResolvedMarketplacePolicy } from 'src/hosting/marketplace-policy';
import {
  MakeShopCreateProductDto,
  MakeShopUpdateProductDto,
} from './dto/makeshop-product.dto';

@Injectable()
export class MakeshopService {
  private readonly logger = new Logger(MakeshopService.name);

  constructor(
    @InjectRepository(HostingAccount)
    private readonly hostingAccountRepository: Repository<HostingAccount>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    private readonly categoryService: CategoryService,
    private readonly marginService: MarginService,
    private readonly wordReplacementService: WordReplacementService,
    private readonly openApiService: OpenApiService,
  ) {}

  private get apiBaseUrl() {
    return (
      process.env.MAKESHOP_API_BASE_URL ||
      'https://openapi.makeshop.co.kr'
    ).replace(/\/$/, '');
  }

  private normalizeShopId(shopId: string) {
    return String(shopId || '').trim();
  }

  private buildHeaders(apiKey: string) {
    const normalizedApiKey = String(apiKey || '').trim();

    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${normalizedApiKey}`,
      'X-API-KEY': normalizedApiKey,
      apiKey: normalizedApiKey,
    };
  }

  private async request<T>({
    shopId,
    apiKey,
    method,
    path,
    data,
  }: {
    shopId: string;
    apiKey: string;
    method: Method;
    path: string;
    data?: unknown;
  }) {
    const normalizedShopId = this.normalizeShopId(shopId);
    if (!normalizedShopId) {
      throw new BadRequestException('shopId is required.');
    }

    if (!String(apiKey || '').trim()) {
      throw new BadRequestException('apiKey is required.');
    }

    const response = await axios.request<T>({
      baseURL: this.apiBaseUrl,
      url: `/api/v1/${normalizedShopId}${path}`,
      method,
      data,
      timeout: 30000,
      headers: this.buildHeaders(apiKey),
    });

    return response.data;
  }

  private getNormalizedSizeOptions(product: Product) {
    const sizeOptions = Array.from(
      new Set(
        String(product.size || '')
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
      ),
    );

    return sizeOptions.length > 0 ? sizeOptions : ['원사이즈'];
  }

  private getSizeOptionName() {
    return '\uC0AC\uC774\uC988';
  }

  private getSizeOptions(product: Product) {
    const sizeOptions = Array.from(
      new Set(
        String(product.size || '')
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
      ),
    );

    return sizeOptions.length > 0 ? sizeOptions : ['원사이즈'];
  }

  private getAdditionalOptionPrices(product: Product, optionCount: number) {
    const rawPrices = String(product.addoptionprice || '0')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);

    if (rawPrices.length === 0) {
      return Array.from({ length: optionCount }, () => 0);
    }

    return Array.from({ length: optionCount }, (_, index) => {
      const parsed = Number.parseInt(rawPrices[index] || '0', 10);
      return Number.isNaN(parsed) ? 0 : parsed;
    });
  }

  private buildMakeshopDeliveryFields(account?: HostingAccount | null) {
    const policy = getResolvedMarketplacePolicy(account?.marketplacePolicy);

    return {
      delivery_fee: Number(policy.makeshop.deliveryFee || 0),
      delivery_type: policy.makeshop.deliveryType || undefined,
    };
  }

  private getOptionSignature(product: Pick<Product, 'size' | 'addoptionprice'>) {
    const sizes = this.getNormalizedSizeOptions(product as Product);
    const prices = this.getAdditionalOptionPrices(product as Product, sizes.length);

    return JSON.stringify({
      sizes,
      prices,
    });
  }

  private dedupeDesignerInTitle(product: Product) {
    const title = String(product.title || '').replace(/\s+/g, ' ').trim();
    const designer = String(product.designer || '').replace(/\s+/g, ' ').trim();

    if (!title || !designer) {
      return title;
    }

    const escapedDesigner = designer.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const designerRegex = new RegExp(`(^|\\s)(${escapedDesigner})(?=\\s|$)`, 'gi');

    let seen = false;
    const deduped = title.replace(designerRegex, (match, leadingSpace) => {
      if (seen) {
        return '';
      }

      seen = true;
      return leadingSpace ? `${leadingSpace}${designer}` : designer;
    });

    return deduped.replace(/\s{2,}/g, ' ').trim();
  }

  private dedupeStyleIdInTitle(title: string, styleId: string) {
    const normalizedStyleId = String(styleId || '').trim();
    if (!title || !normalizedStyleId) {
      return title;
    }

    const escapedStyleId = normalizedStyleId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const styleIdRegex = new RegExp(`\\b${escapedStyleId}\\b`, 'g');

    let first = true;
    return title.replace(styleIdRegex, () => {
      if (first) {
        first = false;
        return normalizedStyleId;
      }

      return '';
    });
  }

  private normalizeMarketplaceTitle(product: Product) {
    const withSingleDesigner = this.dedupeDesignerInTitle(product);
    const withSingleStyleId = this.dedupeStyleIdInTitle(
      withSingleDesigner,
      product.styleId,
    );

    return withSingleStyleId.replace(/\s{2,}/g, ' ').trim();
  }

  private normalizeMainInfoSource(mainInfo?: string | null) {
    const normalized = String(mainInfo || '')
      .replace(/<br\s*\/?>/gi, ', ')
      .replace(/<\/(div|p|li|tr|h[1-6])>/gi, ', ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/\s+/g, ' ')
      .replace(/\s*,\s*/g, ', ')
      .replace(/(,\s*){2,}/g, ', ')
      .trim();

    return normalized.replace(/^,\s*|\s*,$/g, '').trim();
  }

  private shouldRefineMainInfoWithoutTranslation(site: string) {
    return ['Burberry', 'Dolce', 'Herno'].includes(String(site || '').trim());
  }

  private resolveSourceLanguage(site: string): 'fr' | 'nl' | 'en' {
    if (['Dior', 'Sandro', 'Tods'].includes(String(site || '').trim())) {
      return 'fr';
    }

    if (String(site || '').trim() === 'Longchamp') {
      return 'nl';
    }

    return 'en';
  }

  private buildMarketplaceProductTitle(product: Product) {
    if (product.site === 'Dior') {
      return product.title.includes(product.designer)
        ? `${product.title} ${product.styleId}`.trim()
        : `${product.designer} ${product.title} ${product.styleId}`.trim();
    }

    const color = String(product.color || '').trim();

    return product.title.includes(product.designer)
      ? [product.title, color, product.styleId].filter(Boolean).join(' ')
      : [product.designer, product.title, color, product.styleId]
          .filter(Boolean)
          .join(' ');
  }

  private isLuxuryTaxCategory(categoryName: string) {
    const normalized = String(categoryName || '').toLowerCase();

    return (
      normalized.includes('bags') ||
      normalized.includes('bag') ||
      normalized.includes('coin') ||
      normalized.includes('handbags') ||
      normalized.includes('travel') ||
      normalized.includes('small leather goods') ||
      normalized.includes('small-leather-goods') ||
      normalized.includes('jewelry') ||
      normalized.includes('jewellery') ||
      normalized.includes('wallets') ||
      String(categoryName || '').includes('가방') ||
      String(categoryName || '').includes('지갑')
    );
  }

  private isEuOrigin(madeIn?: string | null) {
    const countryList = [
      '오스트리아', 'Austria', '벨기에', 'Belgium', '프랑스', 'France', '독일', 'Germany',
      '이탈리아', 'Italy', 'Italia', 'Italie', '스페인', 'Spain',
      '네덜란드', 'Netherlands', 'Holland', '포르투갈', 'Portugal',
      '아일랜드', 'Ireland', '룩셈부르크', 'Luxembourg',
      '덴마크', 'Denmark', '스웨덴', 'Sweden', '핀란드', 'Finland',
      '체코', 'Czech Republic', 'Czechia', '헝가리', 'Hungary',
      '폴란드', 'Poland', '슬로바키아', 'Slovakia', '슬로베니아', 'Slovenia',
      '루마니아', 'Romania', '불가리아', 'Bulgaria', '크로아티아', 'Croatia',
      '에스토니아', 'Estonia', '라트비아', 'Latvia', '리투아니아', 'Lithuania',
      '몰타', 'Malta', '키프로스', 'Cyprus',
    ];

    const normalizedMadeIn = String(madeIn || '').toLowerCase().trim();
    if (!normalizedMadeIn) {
      return false;
    }

    return countryList.some((country) =>
      normalizedMadeIn.includes(country.toLowerCase()),
    );
  }

  private resolvePrimaryGender(categoryName: string) {
    const normalized = String(categoryName || '').toLowerCase();

    if (
      normalized.includes('women') ||
      normalized.includes('shop-women') ||
      normalized.includes('woman')
    ) {
      return 'w' as const;
    }

    if (/^(men|man|shop-men)('s)?\b/.test(normalized)) {
      return 'm' as const;
    }

    return 'c' as const;
  }

  private createContent(
    product: Product,
    mainImageUrl: string,
    additionalImageUrls: string[],
    topImages?: string[],
    bottomImages?: string[],
  ) {
    const altText = `${product.designer} ${product.title} ${product.styleId}`.trim();
    const safeMainInfo = this.normalizeMainInfoSource(product.mainInfo).replace(
      /상품\s*번호\s*:\s*[\w\d-]+/gi,
      '',
    );

    let contentHTML = '<div style="text-align:center">';

    if (topImages?.length) {
      topImages.forEach((imageUrl) => {
        contentHTML += `<img src="${imageUrl}" style="width:100%;max-width:860px;" /><br/>`;
      });
    }

    contentHTML += `
    <br/>
    <div style="text-align:center;">
      <img src="${mainImageUrl}" data-src="${mainImageUrl}" alt="${altText}" style="width:100%;max-width:750px;"/>
    </div>
    <br/><br/><br/>
    <div style="font-weight:bold;text-align:center;font-size:1.8rem;">${product.designer}</div>
    <br/><br/>
    <div style="text-align:center;font-size:1.6rem;">${product.title}</div>
    <div style="text-align:center;font-size:1.6rem;">${product.color || ''}</div>
    <div style="line-height:1.8;text-align:center;max-width:750px;margin:auto;font-size:1.4rem;">
      ${safeMainInfo.split(',').join('<br/>')}
    </div>
    <br/><br/>
    `;

    additionalImageUrls.forEach((imageUrl) => {
      contentHTML += `<img src="${imageUrl}" data-src="${imageUrl}" alt="${altText}" style="width:100%;max-width:1000px;"/><br/>`;
    });

    if (bottomImages?.length) {
      bottomImages.forEach((imageUrl) => {
        contentHTML += `<img src="${imageUrl}" style="width:100%;max-width:860px;" /><br/>`;
      });
    }

    contentHTML += '</div>';

    return contentHTML;
  }

  private async resolveHostingAccountForProduct(
    product: Product,
    fallback?: { partnerKey?: string; apiKey?: string },
  ) {
    if (product.customId && product.accountPlatform) {
      const account = await this.hostingAccountRepository.findOne({
        where: {
          customId: product.customId,
          accountPlatform: product.accountPlatform,
        },
      });

      if (account) {
        return account;
      }
    }

    if (fallback?.partnerKey && fallback?.apiKey) {
      return this.hostingAccountRepository.findOne({
        where: {
          partnerKey: fallback.partnerKey,
          apiKey: fallback.apiKey,
        },
      });
    }

    return null;
  }

  private async applyMarketplacePricing(product: Product) {
    const site = String(product.site || '').trim();
    let priceInWon = Number(product.price || 0);
    const allMargins = await this.marginService.getAllMargins(
      product.customId,
      product.accountPlatform,
    );

    let discountRate = 0;
    let exchangeRate = 1;

    if (allMargins.length > 0) {
      const firstMargin = allMargins[0];

      if (
        firstMargin.discountRate !== undefined &&
        firstMargin.discountRate > 0
      ) {
        discountRate = firstMargin.discountRate;
      }

      if (
        firstMargin.exchangeRate !== undefined &&
        firstMargin.exchangeRate > 0
      ) {
        exchangeRate = firstMargin.exchangeRate;
      }
    }

    discountRate = Math.max(0, Math.min(discountRate, 100));
    priceInWon = priceInWon * exchangeRate * (1 - discountRate / 100);

    const shouldApplyLuxuryTax =
      !['Farfetch', 'Cettire'].includes(site) &&
      this.isLuxuryTaxCategory(product.categoryName);

    if (shouldApplyLuxuryTax) {
      if (priceInWon >= 2000000) {
        const excessAmount = priceInWon - 2000000;
        const additionalAmount = excessAmount * 0.2 * 1.3;
        priceInWon = (priceInWon + additionalAmount) * 1.1;
      } else {
        priceInWon *= 1.1;
      }
    } else {
      priceInWon *= 1.1;
    }

    let finalPrice = priceInWon;
    const applicableMargins = allMargins.filter(
      (margin) => margin.site === product.site,
    );

    for (const margin of applicableMargins) {
      if (finalPrice >= margin.minAmount && finalPrice <= margin.maxAmount) {
        finalPrice += finalPrice * (margin.marginValue / 100);
        finalPrice += margin.minMargin;
        break;
      }
    }

    if (
      product.madeIn &&
      product.madeIn.trim() !== '' &&
      !this.isEuOrigin(product.madeIn)
    ) {
      finalPrice += finalPrice * 0.13;
    }

    finalPrice = Math.round(finalPrice / 10) * 10;
    product.price = finalPrice;
    product.fixedPrice = finalPrice;
  }

  private async prepareProductForMarketplace(product: Product) {
    const site = String(product.site || '').trim();
    product.mainInfo = this.normalizeMainInfoSource(product.mainInfo);

    product.designer = await this.wordReplacementService.applyReplacements(
      product.designer,
      product.customId,
    );
    product.title = await this.wordReplacementService.applyReplacements(
      product.title,
      product.customId,
    );
    product.color = await this.wordReplacementService.applyReplacements(
      product.color,
      product.customId,
    );

    if (this.shouldRefineMainInfoWithoutTranslation(site)) {
      product.mainInfo = await this.openApiService.refineMainInfo(product.mainInfo);
    } else {
      const translated = await this.openApiService.translateProductFields(
        {
          title: product.title,
          madeIn: product.madeIn,
          color: product.color,
        },
        this.resolveSourceLanguage(site),
      );

      product.title = translated.title;
      product.madeIn = translated.madeIn;
      product.color = translated.color;
      product.mainInfo = await this.openApiService.refineMainInfo(product.mainInfo);
    }

    product.designer = await this.wordReplacementService.applyReplacements(
      product.designer,
      product.customId,
    );
    product.title = await this.wordReplacementService.applyReplacements(
      product.title,
      product.customId,
    );
    product.color = await this.wordReplacementService.applyReplacements(
      product.color,
      product.customId,
    );

    const productTitle = this.buildMarketplaceProductTitle(product);
    product.title = await this.openApiService.refineTitle2(
      product.designer,
      productTitle,
      product.mainInfo,
      product.styleId,
    );
    product.title = await this.wordReplacementService.applyReplacements(
      product.title,
      product.customId,
    );
    product.title = this.normalizeMarketplaceTitle(product);
    product.designer = await this.wordReplacementService.applyReplacements(
      product.designer,
      product.customId,
    );
    product.mainInfo = await this.wordReplacementService.applyReplacements(
      product.mainInfo,
      product.customId,
    );

    await this.applyMarketplacePricing(product);

    return {
      primaryGender: this.resolvePrimaryGender(product.categoryName),
    };
  }

  private async prepareProductForMarketplaceUpdate(product: Product) {
    await this.applyMarketplacePricing(product);

    return {
      primaryGender: this.resolvePrimaryGender(product.categoryName),
    };
  }

  private buildCreateDtoFromProduct(
    product: Product,
    account?: HostingAccount | null,
  ): MakeShopCreateProductDto {
    const sizes = this.getNormalizedSizeOptions(product);
    const addPrices = this.getAdditionalOptionPrices(product, sizes.length);
    const categoryCode = String(product.godoMallCategoryCode || '').trim();
    const productTitle = this.normalizeMarketplaceTitle(product);

    return {
      product_name: productTitle,
      sellprice: String(Number(product.price || 0)),
      category_code: categoryCode || undefined,
      display: 'Y',
      sell_use: 'Y',
      content: product.mainInfo,
      mobile_content: product.mainInfo,
      summary: product.categoryName,
      brand: product.designer,
      manufacturer: product.designer,
      origin: product.madeIn || undefined,
      model_name: product.styleId,
      main_image: product.mainImageUrl,
      list_image: product.mainImageUrl,
      add_images:
        Array.isArray(product.additionalImageUrls) &&
        product.additionalImageUrls.length > 0
          ? product.additionalImageUrls
          : undefined,
      option_use: 'Y',
      options: [
        {
          option_name: '사이즈',
        },
      ],
      opt_values: [sizes.join('|')],
      opt_price: addPrices,
      stocks: sizes.map((size, index) => ({
        option_values: [size],
        stock: 9999,
        price: addPrices[index] || 0,
      })),
      ...this.buildMakeshopDeliveryFields(account),
      adult_use: 'N',
    };
  }

  private buildUpdateDtoFromProduct(product: Product): MakeShopUpdateProductDto {
    const productCode = String(product.platformProductCode || '').trim();
    if (!productCode) {
      throw new BadRequestException('platformProductCode is required for Makeshop update.');
    }

    const productTitle = this.normalizeMarketplaceTitle(product);

    return {
      product_code: productCode,
      product_name: productTitle,
      sellprice: String(Number(product.price || 0)),
      category_code: String(product.godoMallCategoryCode || '').trim() || undefined,
      display: 'Y',
      sell_use: 'Y',
    };
  }

  private extractProductCode(response: any) {
    return (
      response?.product_code ??
      response?.product?.product_code ??
      response?.data?.product_code ??
      response?.data?.product?.product_code ??
      null
    );
  }

  private extractCategoryCode(category: any) {
    return String(
      category?.category_code ??
        category?.categoryCode ??
        category?.category_no ??
        category?.categoryNo ??
        category?.id ??
        category?.no ??
        '',
    ).trim();
  }

  private extractCategoryName(category: any) {
    const candidates = [
      category?.full_category_name,
      category?.fullCategoryName,
      category?.category_name_path,
      category?.categoryNamePath,
      category?.category_name,
      category?.categoryName,
      category?.name,
    ];

    const value = candidates.find(
      (item) => typeof item === 'string' && item.trim(),
    );

    return value ? value.trim() : '';
  }

  private flattenRemoteCategories(categories: any[]) {
    const results: Array<{
      categoryCode: string;
      categoryName: string;
      parentPath?: string;
    }> = [];
    const visited = new Set<string>();

    const walk = (items: any[], parentPath = '') => {
      for (const item of items) {
        if (!item || typeof item !== 'object') {
          continue;
        }

        const categoryCode = this.extractCategoryCode(item);
        const resolvedName =
          this.extractCategoryName(item) ||
          [parentPath, String(item?.category_name || item?.name || '').trim()]
            .filter(Boolean)
            .join(' > ');
        const recordKey = `${categoryCode}:${resolvedName}`;

        if (categoryCode && resolvedName && !visited.has(recordKey)) {
          visited.add(recordKey);
          results.push({
            categoryCode,
            categoryName: resolvedName,
            parentPath,
          });
        }

        const childSources = [
          item?.children,
          item?.child_categories,
          item?.childCategories,
          item?.sub_categories,
          item?.subCategories,
          item?.category_list,
          item?.categoryList,
        ];

        const childItems = childSources.find((value) => Array.isArray(value));
        if (Array.isArray(childItems) && childItems.length > 0) {
          walk(childItems, resolvedName || parentPath);
        }
      }
    };

    walk(Array.isArray(categories) ? categories : []);
    return results;
  }

  async fetchAndSaveMakeshopCategories(
    customId: string,
    accountPlatform: string,
  ) {
    const account = await this.hostingAccountRepository.findOne({
      where: {
        customId,
        accountPlatform,
      },
    });

    if (!account) {
      throw new BadRequestException(
        `Makeshop hosting account not found: ${customId} / ${accountPlatform}`,
      );
    }

    const requestCandidates = [
      '/categories',
      '/category',
      '/product/categories',
      '/product/category/list',
    ];

    let response: any = null;
    let lastError: unknown = null;

    for (const path of requestCandidates) {
      try {
        response = await this.request<any>({
          shopId: account.partnerKey,
          apiKey: account.apiKey,
          method: 'GET',
          path,
        });
        break;
      } catch (error) {
        lastError = error;
      }
    }

    if (!response && lastError) {
      throw lastError;
    }

    const categories = this.flattenRemoteCategories(
      Array.isArray(response)
        ? response
        : Array.isArray(response?.categories)
        ? response.categories
        : Array.isArray(response?.category)
        ? response.category
        : Array.isArray(response?.data?.categories)
        ? response.data.categories
        : Array.isArray(response?.data?.category)
        ? response.data.category
        : Array.isArray(response?.list)
        ? response.list
        : Array.isArray(response?.data?.list)
        ? response.data.list
        : [],
    );

    await this.categoryService.saveMakeshopCategories(
      categories,
      customId,
      accountPlatform,
    );

    return {
      message: 'Makeshop categories fetched successfully.',
      count: categories.length,
    };
  }

  async createProduct(params: {
    shopId: string;
    apiKey: string;
    payload: MakeShopCreateProductDto;
  }) {
    return this.request<any>({
      shopId: params.shopId,
      apiKey: params.apiKey,
      method: 'POST',
      path: '/product/create',
      data: params.payload,
    });
  }

  async updateProduct(params: {
    shopId: string;
    apiKey: string;
    payload: MakeShopUpdateProductDto;
  }) {
    return this.request<any>({
      shopId: params.shopId,
      apiKey: params.apiKey,
      method: 'POST',
      path: '/product/update',
      data: params.payload,
    });
  }

  async deleteProductTemp(params: {
    shopId: string;
    apiKey: string;
    productCode: string;
  }) {
    return this.request<any>({
      shopId: params.shopId,
      apiKey: params.apiKey,
      method: 'POST',
      path: '/product/delete_temp',
      data: {
        product_code: params.productCode,
      },
    });
  }

  async deleteProduct(params: {
    shopId: string;
    apiKey: string;
    productCode: string;
  }) {
    return this.request<any>({
      shopId: params.shopId,
      apiKey: params.apiKey,
      method: 'POST',
      path: '/product/delete',
      data: {
        product_code: params.productCode,
      },
    });
  }

  async deleteProductFully(params: {
    shopId: string;
    apiKey: string;
    productCode: string;
  }) {
    await this.deleteProductTemp(params);
    return this.deleteProduct(params);
  }

  async createProductFromEntity(params: {
    product: Product;
    shopId: string;
    apiKey: string;
  }) {
    await this.prepareProductForMarketplace(params.product);
    const account = await this.resolveHostingAccountForProduct(params.product, {
      partnerKey: params.shopId,
      apiKey: params.apiKey,
    });

    params.product.mainInfo = this.createContent(
      params.product,
      params.product.mainImageUrl,
      params.product.additionalImageUrls || [],
      account?.topImages,
      account?.bottomImages,
    );

    const payload = this.buildCreateDtoFromProduct(params.product, account);
    const response = await this.createProduct({
      shopId: params.shopId,
      apiKey: params.apiKey,
      payload,
    });

    const productCode = this.extractProductCode(response);
    if (!productCode) {
      this.logger.warn('Makeshop create response did not include product_code.');
    } else {
      params.product.platform = 'makeshop';
      params.product.platformProductCode = String(productCode);
    }

    await this.productRepository.save(params.product);

    return {
      productCode,
      response,
    };
  }

  private async recreateProductForOptionChange(params: {
    product: Product;
    shopId: string;
    apiKey: string;
  }) {
    const previousProductCode = String(
      params.product.platformProductCode || '',
    ).trim();
    const account = await this.resolveHostingAccountForProduct(params.product, {
      partnerKey: params.shopId,
      apiKey: params.apiKey,
    });

    await this.prepareProductForMarketplaceUpdate(params.product);
    params.product.mainInfo = this.createContent(
      params.product,
      params.product.mainImageUrl,
      params.product.additionalImageUrls || [],
      account?.topImages,
      account?.bottomImages,
    );

    const response = await this.createProduct({
      shopId: params.shopId,
      apiKey: params.apiKey,
      payload: this.buildCreateDtoFromProduct(params.product, account),
    });

    const nextProductCode = this.extractProductCode(response);
    if (!nextProductCode) {
      throw new BadRequestException(
        'Makeshop recreate response did not include product_code.',
      );
    }

    params.product.platform = 'makeshop';
    params.product.platformProductCode = String(nextProductCode);
    await this.productRepository.save(params.product);

    if (
      previousProductCode &&
      previousProductCode !== String(nextProductCode)
    ) {
      try {
        await this.deleteProductFully({
          shopId: params.shopId,
          apiKey: params.apiKey,
          productCode: previousProductCode,
        });
      } catch (error: any) {
        this.logger.warn(
          `Makeshop old product cleanup failed (${previousProductCode}): ${
            error?.message || error
          }`,
        );
      }
    }

    return response;
  }

  async updateProductFromEntity(params: {
    product: Product;
    shopId: string;
    apiKey: string;
  }) {
    const storedProduct =
      params.product.id != null
        ? await this.productRepository.findOne({
            where: { id: params.product.id },
          })
        : null;

    if (
      storedProduct &&
      this.getOptionSignature(storedProduct) !==
        this.getOptionSignature(params.product)
    ) {
      this.logger.log(
        `Makeshop option set changed for product ${params.product.id}; recreating product instead of update.`,
      );
      return this.recreateProductForOptionChange(params);
    }

    await this.prepareProductForMarketplaceUpdate(params.product);
    const payload = this.buildUpdateDtoFromProduct(params.product);
    const response = await this.updateProduct({
      shopId: params.shopId,
      apiKey: params.apiKey,
      payload,
    });

    await this.productRepository.save(params.product);
    return response;
  }

  async deleteProductFromEntity(params: {
    product: Product;
    shopId: string;
    apiKey: string;
  }) {
    const productCode = String(params.product.platformProductCode || '').trim();
    if (!productCode) {
      return;
    }

    return this.updateProduct({
      shopId: params.shopId,
      apiKey: params.apiKey,
      payload: {
        product_code: productCode,
        display: 'N',
        sell_use: 'N',
      },
    });
  }
}
