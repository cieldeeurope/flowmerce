import {
  BadRequestException,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import axios, { AxiosError, Method } from 'axios';
import { Buffer } from 'buffer';
import { Repository } from 'typeorm';
import { MarginService } from 'src/margin/margin.service';
import { Product } from 'src/product/product.entity';
import { OpenApiService } from 'src/smartstore/openApi.service';
import { WordReplacementService } from 'src/word-replacement/word-replacement.service';
import { HostingAccount } from 'src/hosting/hostingaccount.entity';
import { getResolvedMarketplacePolicy } from 'src/hosting/marketplace-policy';
import { CategoryService } from 'src/category/category.service';
import {
  Cafe24CreateProductDto,
  Cafe24UpdateProductDto,
} from './dto/cafe24-product.dto';
const sharp = require('sharp');

type Cafe24TokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_at?: string;
  refresh_token_expires_at?: string;
  mall_id?: string;
  shop_no?: string;
  token_type?: string;
};

type Cafe24AuthConfig = {
  mallId: string;
  accessToken: string;
  shopNo?: number;
};

@Injectable()
export class Cafe24Service implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(Cafe24Service.name);
  private readonly proactiveRefreshLeadMs = 10 * 60 * 1000;
  private readonly backgroundRefreshIntervalMs = 5 * 60 * 1000;
  private readonly marketplaceImageUserAgent =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36';
  private backgroundRefreshTimer: NodeJS.Timeout | null = null;
  private readonly refreshInFlight = new Map<string, Promise<HostingAccount>>();

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

  async onModuleInit() {
    await this.refreshCafe24TokensInBackground('startup');

    this.backgroundRefreshTimer = setInterval(() => {
      void this.refreshCafe24TokensInBackground('interval');
    }, this.backgroundRefreshIntervalMs);

    this.backgroundRefreshTimer.unref?.();
  }

  onModuleDestroy() {
    if (this.backgroundRefreshTimer) {
      clearInterval(this.backgroundRefreshTimer);
      this.backgroundRefreshTimer = null;
    }
  }

  private get clientId() {
    return (process.env.CAFE24_CLIENT_ID || process.env.Client_ID || '').trim();
  }

  private get clientSecretKey() {
    return (
      process.env.CAFE24_CLIENT_SECRET_KEY ||
      process.env.Client_Secret_Key ||
      ''
    ).trim();
  }

  private get defaultRedirectUri() {
    return (
      process.env.CAFE24_REDIRECT_URI ||
      process.env.Redirect_URI ||
      ''
    ).trim();
  }

  private get apiVersion() {
    return (process.env.CAFE24_API_VERSION || '2026-03-01').trim();
  }

  private get defaultScope() {
    return (
      process.env.CAFE24_SCOPE ||
      'mall.read_product,mall.write_product'
    ).trim();
  }

  private normalizeMallId(mallId: string) {
    return String(mallId || '').trim();
  }

  private normalizeShopNo(shopNo?: number | string | null) {
    const parsed = Number.parseInt(String(shopNo ?? '1'), 10);
    return Number.isNaN(parsed) || parsed <= 0 ? 1 : parsed;
  }

  private withShopNoBody<T>(body: T, shopNo?: number | string | null) {
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return body;
    }

    return {
      shop_no: this.normalizeShopNo(shopNo),
      ...(body as Record<string, unknown>),
    };
  }

  private getAccountRefreshKey(account: Pick<HostingAccount, 'id' | 'customId' | 'accountPlatform'>) {
    const customId = String(account.customId || '').trim();
    const accountPlatform = String(account.accountPlatform || '').trim();

    if (customId && accountPlatform) {
      return `${customId}:${accountPlatform}`;
    }

    return `hosting-account:${account.id}`;
  }

  private getExpiryTimestamp(value?: Date | string | null) {
    if (!value) {
      return null;
    }

    const timestamp = new Date(value).getTime();
    return Number.isFinite(timestamp) ? timestamp : null;
  }

  private shouldAttemptProactiveRefresh(account: HostingAccount) {
    const now = Date.now();
    const accessExpiresAt = this.getExpiryTimestamp(account.tokenExpiresAt);
    const refreshExpiresAt = this.getExpiryTimestamp(account.refreshTokenExpiresAt);
    const accessToken = String(account.apiKey || '').trim();
    const refreshToken = String(account.refreshToken || '').trim();

    if (!refreshToken) {
      return false;
    }

    if (!accessToken) {
      return true;
    }

    if (!accessExpiresAt) {
      return true;
    }

    if (accessExpiresAt && accessExpiresAt <= now + this.proactiveRefreshLeadMs) {
      return true;
    }

    if (refreshExpiresAt && refreshExpiresAt <= now + this.proactiveRefreshLeadMs) {
      return true;
    }

    return false;
  }

  private async refreshHostingAccountTokens(
    account: HostingAccount,
    reason: 'startup' | 'interval' | 'runtime',
  ) {
    const refreshKey = this.getAccountRefreshKey(account);
    const existingRefresh = this.refreshInFlight.get(refreshKey);
    if (existingRefresh) {
      return existingRefresh;
    }

    const refreshPromise = (async () => {
      const latestAccount = await this.hostingAccountRepository.findOne({
        where: {
          id: account.id,
        },
      });

      if (!latestAccount) {
        throw new BadRequestException('Cafe24 hosting account not found.');
      }

      const refreshToken = String(latestAccount.refreshToken || '').trim();
      if (!refreshToken) {
        throw new BadRequestException('Cafe24 refresh token is missing.');
      }

      const refreshExpiresAt = this.getExpiryTimestamp(latestAccount.refreshTokenExpiresAt);
      if (refreshExpiresAt && refreshExpiresAt <= Date.now()) {
        throw new BadRequestException(
          'Cafe24 refresh token has expired. Please reconnect Cafe24.',
        );
      }

      const refreshed = await this.refreshAccessToken({
        mallId: this.normalizeMallId(latestAccount.partnerKey),
        refreshToken,
      });

      latestAccount.apiKey = refreshed.access_token;
      latestAccount.refreshToken =
        refreshed.refresh_token || latestAccount.refreshToken || null;
      latestAccount.tokenExpiresAt = refreshed.expires_at
        ? new Date(refreshed.expires_at)
        : latestAccount.tokenExpiresAt || null;
      latestAccount.refreshTokenExpiresAt = refreshed.refresh_token_expires_at
        ? new Date(refreshed.refresh_token_expires_at)
        : latestAccount.refreshTokenExpiresAt || null;

      const savedAccount = await this.hostingAccountRepository.save(latestAccount);

      this.logger.log(
        `Cafe24 token refreshed (${reason}) for ${savedAccount.customId || 'unknown'} / ${savedAccount.accountPlatform || savedAccount.id}`,
      );

      return savedAccount;
    })().finally(() => {
      this.refreshInFlight.delete(refreshKey);
    });

    this.refreshInFlight.set(refreshKey, refreshPromise);
    return refreshPromise;
  }

  private async ensureFreshHostingAccount(
    account: HostingAccount,
    reason: 'startup' | 'interval' | 'runtime',
  ) {
    if (!this.shouldAttemptProactiveRefresh(account)) {
      return account;
    }

    return this.refreshHostingAccountTokens(account, reason);
  }

  private async refreshCafe24TokensInBackground(reason: 'startup' | 'interval') {
    try {
      const accounts = await this.hostingAccountRepository.find({
        where: {
          platform: 'cafe24',
        },
      });

      for (const account of accounts) {
        const refreshExpiresAt = this.getExpiryTimestamp(account.refreshTokenExpiresAt);

        if (refreshExpiresAt && refreshExpiresAt <= Date.now()) {
          this.logger.warn(
            `Cafe24 refresh token expired for ${account.customId || 'unknown'} / ${account.accountPlatform}. Manual reconnect required.`,
          );
          continue;
        }

        if (!this.shouldAttemptProactiveRefresh(account)) {
          continue;
        }

        try {
          await this.refreshHostingAccountTokens(account, reason);
        } catch (error) {
          this.logger.warn(
            `Cafe24 background token refresh failed for ${account.customId || 'unknown'} / ${account.accountPlatform}: ${this.describeError(error)}`,
          );
        }
      }
    } catch (error) {
      this.logger.warn(
        `Cafe24 background token sweep failed (${reason}): ${this.describeError(error)}`,
      );
    }
  }

  private async resolveRuntimeAuthFromProduct(params: {
    product: Product;
    mallId: string;
    accessToken: string;
    shopNo?: number;
  }): Promise<Cafe24AuthConfig> {
    const customId = String(params.product.customId || '').trim();
    const accountPlatform = String(params.product.accountPlatform || '').trim();

    if (customId && accountPlatform) {
      return this.getAuthConfigFromHostingAccount({
        customId,
        accountPlatform,
      });
    }

    return {
      mallId: this.normalizeMallId(params.mallId),
      accessToken: String(params.accessToken || '').trim(),
      shopNo: this.normalizeShopNo(params.shopNo),
    };
  }

  private buildApiBaseUrl(mallId: string) {
    return `https://${this.normalizeMallId(mallId)}.cafe24api.com`;
  }

  private buildAuthorizationHeader(accessToken: string) {
    return {
      Authorization: `Bearer ${String(accessToken || '').trim()}`,
      'X-Cafe24-Api-Version': this.apiVersion,
    };
  }

  private buildBasicAuthHeader() {
    const credentials = Buffer.from(
      `${this.clientId}:${this.clientSecretKey}`,
      'utf8',
    ).toString('base64');

    return `Basic ${credentials}`;
  }

  private sanitizeForLog(value: unknown, depth = 0): unknown {
    if (value === null || value === undefined) {
      return value;
    }

    if (depth >= 4) {
      return '[MaxDepth]';
    }

    if (typeof value === 'string') {
      if (value.length <= 180) {
        return value;
      }

      return `${value.slice(0, 180)}... [truncated ${value.length} chars]`;
    }

    if (Array.isArray(value)) {
      const items = value.slice(0, 8).map((item) => this.sanitizeForLog(item, depth + 1));
      if (value.length > 8) {
        items.push(`[${value.length - 8} more items]`);
      }
      return items;
    }

    if (typeof value === 'object') {
      const result: Record<string, unknown> = {};

      for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
        if (
          typeof item === 'string' &&
          (key.toLowerCase().includes('image') ||
            key.toLowerCase().includes('base64') ||
            key.toLowerCase().includes('content'))
        ) {
          result[key] =
            item.length <= 96
              ? item
              : `${item.slice(0, 96)}... [truncated ${item.length} chars]`;
          continue;
        }

        result[key] = this.sanitizeForLog(item, depth + 1);
      }

      return result;
    }

    return value;
  }

  private serializeForLog(value: unknown) {
    try {
      return JSON.stringify(this.sanitizeForLog(value));
    } catch (error) {
      return `[unserializable: ${this.describeError(error)}]`;
    }
  }

  private logRequestFailure(context: {
    method: Method;
    path: string;
    mallId: string;
    params?: Record<string, unknown>;
    data?: unknown;
    error: unknown;
  }) {
    const axiosError = context.error as AxiosError;
    const status = axiosError?.response?.status ?? 'unknown';
    const responseBody = axiosError?.response?.data;

    this.logger.error(
      `Cafe24 request failed: ${context.method} ${context.path} mallId=${context.mallId} status=${status} message=${this.describeError(context.error)}`,
    );

    if (context.params && Object.keys(context.params).length > 0) {
      this.logger.error(
        `Cafe24 request params: ${this.serializeForLog(context.params)}`,
      );
    }

    if (context.data !== undefined) {
      this.logger.error(
        `Cafe24 request body: ${this.serializeForLog(context.data)}`,
      );
    }

    if (responseBody !== undefined) {
      this.logger.error(
        `Cafe24 response body: ${this.serializeForLog(responseBody)}`,
      );
    }
  }

  private async request<T>({
    mallId,
    accessToken,
    method,
    path,
    params,
    data,
  }: {
    mallId: string;
    accessToken: string;
    method: Method;
    path: string;
    params?: Record<string, unknown>;
    data?: unknown;
  }) {
    try {
      const response = await axios.request<T>({
        baseURL: this.buildApiBaseUrl(mallId),
        url: path,
        method,
        params,
        data,
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json',
          ...this.buildAuthorizationHeader(accessToken),
        },
      });

      return response.data;
    } catch (error) {
      this.logRequestFailure({
        mallId,
        method,
        path,
        params,
        data,
        error,
      });
      throw error;
    }
  }

  private async requestWithBodyFallback<T>({
    mallId,
    accessToken,
    method,
    path,
    params,
    bodies,
  }: {
    mallId: string;
    accessToken: string;
    method: Method;
    path: string;
    params?: Record<string, unknown>;
    bodies: unknown[];
  }) {
    let lastError: unknown;

    for (const body of bodies) {
      try {
        return await this.request<T>({
          mallId,
          accessToken,
          method,
          path,
          params,
          data: body,
        });
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError;
  }

  private getMarketplaceImageReferers(imageUrl: string, referer?: string) {
    const candidates: string[] = [];

    const pushCandidate = (value?: string) => {
      const normalized = String(value || '').trim();
      if (!normalized || candidates.includes(normalized)) {
        return;
      }
      candidates.push(normalized);
    };

    const toOriginReferer = (value?: string) => {
      try {
        return `${new URL(String(value || '').trim()).origin}/`;
      } catch {
        return '';
      }
    };

    pushCandidate(referer);
    pushCandidate(toOriginReferer(referer));
    pushCandidate(toOriginReferer(imageUrl));

    return candidates;
  }

  private buildMarketplaceImageHeaders(referer?: string) {
    return {
      'User-Agent': this.marketplaceImageUserAgent,
      Accept:
        'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9,ko-KR;q=0.8,ko;q=0.7',
      ...(referer ? { Referer: referer } : {}),
    };
  }

  private async downloadMarketplaceImage(
    imageUrl: string,
    referer?: string,
  ): Promise<Buffer> {
    const attempted: string[] = [];
    const refererCandidates = this.getMarketplaceImageReferers(imageUrl, referer);
    const headerCandidates = refererCandidates.length
      ? [...refererCandidates, '']
      : [''];

    let lastError: any;

    for (const candidate of headerCandidates) {
      try {
        const response = await axios.get<ArrayBuffer>(imageUrl, {
          responseType: 'arraybuffer',
          timeout: 30000,
          headers: this.buildMarketplaceImageHeaders(candidate || undefined),
        });

        return Buffer.from(response.data);
      } catch (error: any) {
        lastError = error;
        attempted.push(
          `${candidate || 'no-referer'}:${error?.response?.status || error?.message || 'unknown'}`,
        );
      }
    }

    const attemptedText = attempted.length ? ` [${attempted.join(', ')}]` : '';
    throw new Error(
      `이미지 다운로드 실패: ${lastError?.message || 'unknown error'}${attemptedText}`,
    );
  }

  private async fetchImageAsBase64Payload(imageUrl: string, referer?: string) {
    const normalizedBuffer = await this.normalizeMarketplaceImageBuffer(
      await this.downloadMarketplaceImage(imageUrl, referer),
      imageUrl,
    );

    let mimeType = 'image/jpeg';

    try {
      const metadata = await sharp(normalizedBuffer).metadata();
      const format = String(metadata.format || '').toLowerCase();

      if (format === 'png') {
        mimeType = 'image/png';
      }
    } catch {
      mimeType = 'image/jpeg';
    }

    const base64 = normalizedBuffer.toString('base64');

    return {
      base64,
      dataUri: `data:${mimeType};base64,${base64}`,
    };
  }

  private async normalizeMarketplaceImageBuffer(
    buffer: Buffer,
    sourceUrl?: string,
  ) {
    try {
      const metadata = await sharp(buffer).metadata();
      const format = String(metadata.format || '').toLowerCase();

      if (format === 'png' || format === 'jpeg' || format === 'jpg') {
        return buffer;
      }

      return await sharp(buffer)
        .jpeg({ quality: 90 })
        .toBuffer();
    } catch {
      if (String(sourceUrl || '').toLowerCase().includes('.png')) {
        return buffer;
      }

      return buffer;
    }
  }

  private extractProductNo(response: any) {
    return (
      response?.product?.product_no ??
      response?.product_no ??
      response?.products?.[0]?.product_no ??
      response?.products?.[0]?.no ??
      null
    );
  }

  private extractImagePath(response: any) {
    return (
      response?.path ??
      response?.image?.path ??
      response?.images?.[0]?.path ??
      response?.images?.[0]?.url ??
      null
    );
  }

  private extractCategoryCode(category: any) {
    return String(
      category?.category_no ??
        category?.categoryCode ??
        category?.category_code ??
        category?.no ??
        category?.id ??
        '',
    ).trim();
  }

  private extractCategoryDisplayName(category: any) {
    const candidates = [
      category?.category_name,
      category?.categoryName,
      category?.name,
    ];

    const value = candidates.find(
      (item) => typeof item === 'string' && item.trim(),
    );

    return value ? value.trim() : '';
  }

  private extractCategoryFullName(category: any) {
    const candidates = [
      category?.full_category_name,
      category?.fullCategoryName,
      category?.category_name_path,
      category?.categoryNamePath,
    ];

    const value = candidates.find(
      (item) => typeof item === 'string' && item.trim(),
    );

    return value ? value.trim() : '';
  }

  private extractCategoryName(category: any) {
    return (
      this.extractCategoryFullName(category) ||
      this.extractCategoryDisplayName(category)
    );
  }

  private extractCategoryPath(category: any, categoryName: string) {
    const explicitPath = String(
      category?.parent_path ?? category?.parentPath ?? '',
    ).trim();

    if (explicitPath) {
      return explicitPath;
    }

    const segments = categoryName
      .split(' > ')
      .map((item: string) => item.trim())
      .filter(Boolean);

    return segments.length > 1 ? segments.slice(0, -1).join(' > ') : '';
  }

  private extractCategoryStringField(category: any, ...keys: string[]) {
    for (const key of keys) {
      const value = String(category?.[key] ?? '').trim();
      if (value) {
        return value;
      }
    }

    return '';
  }

  private extractCategoryIntegerField(category: any, ...keys: string[]) {
    for (const key of keys) {
      const value = Number.parseInt(String(category?.[key] ?? ''), 10);
      if (!Number.isNaN(value)) {
        return value;
      }
    }

    return null;
  }

  private extractCafe24CategoryRecord(category: any) {
    const categoryCode = this.extractCategoryCode(category);
    const displayName = this.extractCategoryDisplayName(category);
    const fullCategoryName = this.extractCategoryFullName(category);
    const categoryName = fullCategoryName || displayName;

    if (!categoryCode || !categoryName) {
      return null;
    }

    return {
      categoryCode,
      categoryName,
      displayName,
      fullCategoryName,
      parentPath: this.extractCategoryPath(category, categoryName),
      parentCategoryCode: this.extractCategoryStringField(
        category,
        'parent_category_no',
        'parentCategoryNo',
      ),
      fullCategoryCode: this.extractCategoryStringField(
        category,
        'full_category_no',
        'fullCategoryNo',
      ),
      categoryDepth: this.extractCategoryIntegerField(
        category,
        'category_depth',
        'categoryDepth',
      ),
      rootCategoryCode: this.extractCategoryStringField(
        category,
        'root_category_no',
        'rootCategoryNo',
      ),
      displayType: this.extractCategoryStringField(
        category,
        'display_type',
        'displayType',
      ),
      useDisplay: this.extractCategoryStringField(
        category,
        'use_display',
        'useDisplay',
      ),
      useMain: this.extractCategoryStringField(
        category,
        'use_main',
        'useMain',
      ),
    };
  }

  private extractCategoryItemsFromResponse(response: any) {
    if (Array.isArray(response)) {
      return response;
    }

    const candidates = [
      response?.categories,
      response?.category,
      response?.data?.categories,
      response?.data?.category,
      response?.response?.categories,
      response?.response?.category,
    ];

    const items = candidates.find((value) => Array.isArray(value));
    return Array.isArray(items) ? items : [];
  }

  private flattenRemoteCategories(categories: any[]) {
    const results: Array<{
      categoryCode: string;
      categoryName: string;
      displayName?: string;
      parentPath?: string;
      parentCategoryCode?: string;
      fullCategoryCode?: string;
      categoryDepth?: number | null;
      rootCategoryCode?: string;
      displayType?: string;
      useDisplay?: string;
      useMain?: string;
    }> = [];
    const recordMap = new Map<
      string,
      {
        categoryCode: string;
        categoryName: string;
        displayName?: string;
        fullCategoryName?: string;
        parentPath?: string;
        parentCategoryCode?: string;
        fullCategoryCode?: string;
        categoryDepth?: number | null;
        rootCategoryCode?: string;
        displayType?: string;
        useDisplay?: string;
        useMain?: string;
      }
    >();

    const walk = (items: any[]) => {
      for (const item of items) {
        if (!item || typeof item !== 'object') {
          continue;
        }

        const record = this.extractCafe24CategoryRecord(item);
        if (record) {
          const existing = recordMap.get(record.categoryCode);
          recordMap.set(record.categoryCode, {
            ...existing,
            ...record,
            displayName:
              record.displayName || existing?.displayName || record.categoryName,
            fullCategoryName:
              record.fullCategoryName || existing?.fullCategoryName || '',
            parentPath: record.parentPath || existing?.parentPath || '',
            parentCategoryCode:
              record.parentCategoryCode || existing?.parentCategoryCode || '',
            fullCategoryCode:
              record.fullCategoryCode || existing?.fullCategoryCode || '',
            categoryDepth:
              typeof record.categoryDepth === 'number'
                ? record.categoryDepth
                : existing?.categoryDepth ?? null,
            rootCategoryCode:
              record.rootCategoryCode || existing?.rootCategoryCode || '',
            displayType: record.displayType || existing?.displayType || '',
            useDisplay: record.useDisplay || existing?.useDisplay || '',
            useMain: record.useMain || existing?.useMain || '',
          });
        }

        const childSources = [
          item?.children,
          item?.child_categories,
          item?.childCategories,
          item?.sub_categories,
          item?.subCategories,
        ];

        const childItems = childSources.find((value) => Array.isArray(value));
        if (Array.isArray(childItems) && childItems.length > 0) {
          walk(childItems);
        }
      }
    };

    walk(Array.isArray(categories) ? categories : []);

    const segmentCache = new Map<string, string[]>();

    const resolveSegments = (categoryCode: string, stack = new Set<string>()): string[] => {
      const normalizedCode = String(categoryCode || '').trim();
      if (!normalizedCode) {
        return [];
      }

      const cached = segmentCache.get(normalizedCode);
      if (cached) {
        return cached;
      }

      const record = recordMap.get(normalizedCode);
      if (!record) {
        return [];
      }

      const ownLabel = String(record.displayName || record.categoryName || '').trim();
      const explicitSegments = String(
        record.fullCategoryName || record.categoryName || '',
      )
        .split(' > ')
        .map((item) => item.trim())
        .filter(Boolean);

      if (!ownLabel && explicitSegments.length === 0) {
        segmentCache.set(normalizedCode, []);
        return [];
      }

      if (stack.has(normalizedCode)) {
        const fallback = explicitSegments.length > 0 ? explicitSegments : ownLabel ? [ownLabel] : [];
        segmentCache.set(normalizedCode, fallback);
        return fallback;
      }

      const parentCode = String(record.parentCategoryCode || '').trim();
      const hasParentRecord =
        parentCode &&
        parentCode !== normalizedCode &&
        record.categoryDepth !== 1 &&
        recordMap.has(parentCode);

      if (!hasParentRecord) {
        const fallback = explicitSegments.length > 0 ? explicitSegments : ownLabel ? [ownLabel] : [];
        segmentCache.set(normalizedCode, fallback);
        return fallback;
      }

      stack.add(normalizedCode);
      const parentSegments = resolveSegments(parentCode, stack);
      stack.delete(normalizedCode);

      const resolved = [...parentSegments];
      if (ownLabel && resolved[resolved.length - 1] !== ownLabel) {
        resolved.push(ownLabel);
      }

      const finalSegments = resolved.length > 0 ? resolved : explicitSegments;
      segmentCache.set(normalizedCode, finalSegments);
      return finalSegments;
    };

    for (const record of recordMap.values()) {
      const segments = resolveSegments(record.categoryCode);
      const categoryName =
        segments.length > 0
          ? segments.join(' > ')
          : String(record.fullCategoryName || record.categoryName || '').trim();

      if (!categoryName) {
        continue;
      }

      results.push({
        categoryCode: record.categoryCode,
        categoryName,
        displayName: String(record.displayName || '').trim(),
        parentPath:
          segments.length > 1
            ? segments.slice(0, -1).join(' > ')
            : String(record.parentPath || '').trim(),
        parentCategoryCode: String(record.parentCategoryCode || '').trim(),
        fullCategoryCode: String(record.fullCategoryCode || '').trim(),
        categoryDepth:
          typeof record.categoryDepth === 'number' ? record.categoryDepth : null,
        rootCategoryCode: String(record.rootCategoryCode || '').trim(),
        displayType: String(record.displayType || '').trim(),
        useDisplay: String(record.useDisplay || '').trim(),
        useMain: String(record.useMain || '').trim(),
      });
    }

    return results.sort((a, b) => a.categoryName.localeCompare(b.categoryName));
  }

  private async requestFirstSuccessful<T>(
    auth: Cafe24AuthConfig,
    variants: Array<{
      path: string;
      params?: Record<string, unknown>;
    }>,
  ) {
    let lastError: unknown;

    for (const variant of variants) {
      try {
        return await this.request<T>({
          mallId: auth.mallId,
          accessToken: auth.accessToken,
          method: 'GET',
          path: variant.path,
          params: variant.params,
        });
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError;
  }

  private async fetchCafe24CategoryPage(
    auth: Cafe24AuthConfig,
    offset: number,
    limit: number,
  ) {
    const response = await this.request<any>({
      mallId: auth.mallId,
      accessToken: auth.accessToken,
      method: 'GET',
      path: '/api/v2/admin/categories',
      params: {
        shop_no: auth.shopNo,
        offset,
        limit,
      },
    });

    return this.extractCategoryItemsFromResponse(response);
  }

  private buildCategoryPayload(categoryCode?: string | null) {
    const numericCategoryNo = Number.parseInt(String(categoryCode || ''), 10);

    if (Number.isNaN(numericCategoryNo)) {
      return undefined;
    }

    return [{ category_no: numericCategoryNo }];
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

    return sizeOptions.length > 0 ? sizeOptions : ['\uC6D0\uC0AC\uC774\uC988'];
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

  private buildCafe24SizeGuide(categoryName: string) {
    const gender = this.resolvePrimaryGender(categoryName);

    if (gender === 'm') {
      return {
        use: 'T' as const,
        type: 'default' as const,
        default: 'Male' as const,
      };
    }

    if (gender === 'w') {
      return {
        use: 'T' as const,
        type: 'default' as const,
        default: 'Female' as const,
      };
    }

    return undefined;
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
    const applicableMargins = allMargins.filter((margin) => margin.site === product.site);

    for (const margin of applicableMargins) {
      if (finalPrice >= margin.minAmount && finalPrice <= margin.maxAmount) {
        const marginAmount = finalPrice * (margin.marginValue / 100);
        finalPrice += marginAmount;
        finalPrice += margin.minMargin;
        break;
      }
    }

    if (product.madeIn && product.madeIn.trim() !== '' && !this.isEuOrigin(product.madeIn)) {
      finalPrice += finalPrice * 0.13;
    }

    finalPrice = Math.round(finalPrice / 10) * 10;
    product.price = finalPrice;
    product.fixedPrice = finalPrice;
  }

  private async prepareProductForMarketplace(product: Product) {
    const site = String(product.site || '').trim();
    product.mainInfo = this.normalizeMainInfoSource(product.mainInfo);

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

  private buildCafe24ShippingFields(account?: HostingAccount | null) {
    const policy = getResolvedMarketplacePolicy(account?.marketplacePolicy);

    return {
      shipping_calculation: 'A' as 'A' | 'M',
      shipping_fee_type: policy.cafe24.shippingFeeType as
        | 'T'
        | 'R'
        | 'M'
        | 'D'
        | 'W'
        | 'C'
        | 'N',
      shipping_fee: Number(policy.cafe24.shippingFee || 0),
      shipping_fee_by_product: policy.cafe24.shippingFeeByProduct as 'T' | 'F',
      shipping_scope: policy.cafe24.shippingScope as 'A' | 'B' | 'C',
      shipping_method: policy.cafe24.shippingMethod,
      shipping_area: policy.cafe24.shippingArea,
      shipping_period: {
        minimum: Number(policy.cafe24.shippingPeriodMin || 7),
        maximum: Number(policy.cafe24.shippingPeriodMax || 14),
      },
      prepaid_shipping_fee: policy.cafe24.prepaidShippingFee as
        | 'P'
        | 'C'
        | 'B',
      product_shipping_type: policy.cafe24.productShippingType as
        | 'D'
        | 'C'
        | 'E',
      shipping_info: policy.cafe24.shippingInfo || undefined,
      exchange_info: policy.cafe24.exchangeInfo || undefined,
      service_info: policy.cafe24.serviceInfo || undefined,
      shipping_info_by_product: policy.cafe24.shippingInfoByProduct as
        | 'T'
        | 'F',
      exchange_info_by_product: policy.cafe24.exchangeInfoByProduct as
        | 'T'
        | 'F',
      service_info_by_product: policy.cafe24.serviceInfoByProduct as
        | 'T'
        | 'F',
    };
  }

  private buildCreateDtoFromProduct(
    product: Product,
    account?: HostingAccount | null,
  ): Cafe24CreateProductDto {
    const sizeOptions = this.getNormalizedSizeOptions(product);
    const productTitle = this.normalizeMarketplaceTitle(product);
    const sizeGuide = this.buildCafe24SizeGuide(product.categoryName);

    return {
      product_name: productTitle,
      price: Number(product.price || 0),
      supply_price: Number(product.fixedPrice || product.price || 0),
      display: 'T',
      selling: 'T',
      product_condition: 'N',
      model_name: product.styleId,
      summary_description: product.categoryName,
      simple_description: `${product.designer} ${product.styleId}`.trim(),
      description: product.mainInfo,
      add_category_no: this.buildCategoryPayload(product.godoMallCategoryCode),
      has_option: 'T',
      ...this.buildCafe24ShippingFields(account),
      options: [
        {
          name: '사이즈',
          value: sizeOptions,
        },
      ],
      size_guide: sizeGuide,
      product_tag: String(productTitle || '')
        .split(/\s+/)
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 10),
    };
  }

  private buildUpdateDtoFromProduct(
    product: Product,
    account?: HostingAccount | null,
    overrides?: Partial<
      Pick<Cafe24UpdateProductDto, 'display' | 'selling'> & {
        includeDescription: boolean;
      }
    >,
  ): Cafe24UpdateProductDto {
    const productTitle = this.normalizeMarketplaceTitle(product);

    return {
      product_no: Number(product.goodsno || 0),
      product_name: productTitle,
      price: Number(product.price || 0),
      supply_price: Number(product.fixedPrice || product.price || 0),
      display: overrides?.display ?? 'T',
      selling: overrides?.selling ?? 'T',
      description: overrides?.includeDescription ? product.mainInfo : undefined,
      add_category_no: this.buildCategoryPayload(product.godoMallCategoryCode),
      ...this.buildCafe24ShippingFields(account),
    };
  }

  private buildCafe24OptionPayload(product: Product) {
    return {
      has_option: 'T' as const,
      option_type: 'T' as const,
      option_list_type: 'S' as const,
      options: [
        {
          option_name: this.getSizeOptionName(),
          option_value: this.getNormalizedSizeOptions(product).map((value) => ({
            option_text: value,
          })),
        },
      ],
    };
  }

  private extractCafe24OptionTexts(response: any) {
    const optionGroups = [
      response?.options,
      response?.option,
      response?.product?.options,
      response?.product?.option,
      response?.request?.options,
    ].find((value) => Array.isArray(value));

    if (!Array.isArray(optionGroups) || optionGroups.length === 0) {
      return [];
    }

    const firstOptionGroup = optionGroups[0];
    const optionValues = Array.isArray(firstOptionGroup?.option_value)
      ? firstOptionGroup.option_value
      : Array.isArray(firstOptionGroup?.value)
      ? firstOptionGroup.value
      : [];

    return optionValues
      .map((item) =>
        String(item?.option_text ?? item?.value ?? item ?? '').trim(),
      )
      .filter(Boolean);
  }

  buildAuthorizeUrl(params: {
    mallId: string;
    state: string;
    redirectUri?: string;
    scope?: string;
  }) {
    const mallId = this.normalizeMallId(params.mallId);

    if (!mallId) {
      throw new BadRequestException('mallId is required.');
    }

    if (!this.clientId) {
      throw new BadRequestException('CAFE24_CLIENT_ID is missing.');
    }

    const redirectUri = (params.redirectUri || this.defaultRedirectUri).trim();
    if (!redirectUri) {
      throw new BadRequestException('CAFE24_REDIRECT_URI is missing.');
    }

    const scope = (params.scope || this.defaultScope).trim();
    const query = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      state: params.state,
      redirect_uri: redirectUri,
      scope,
    });

    return `${this.buildApiBaseUrl(mallId)}/api/v2/oauth/authorize?${query.toString()}`;
  }

  async exchangeAccessToken(params: {
    mallId: string;
    code: string;
    redirectUri?: string;
  }) {
    const mallId = this.normalizeMallId(params.mallId);
    const redirectUri = (params.redirectUri || this.defaultRedirectUri).trim();

    if (!mallId || !params.code?.trim() || !redirectUri) {
      throw new BadRequestException('mallId, code, redirectUri are required.');
    }

    const form = new URLSearchParams({
      grant_type: 'authorization_code',
      code: params.code.trim(),
      redirect_uri: redirectUri,
    });

    const response = await axios.post<Cafe24TokenResponse>(
      `${this.buildApiBaseUrl(mallId)}/api/v2/oauth/token`,
      form.toString(),
      {
        timeout: 30000,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: this.buildBasicAuthHeader(),
        },
      },
    );

    return response.data;
  }

  async refreshAccessToken(params: {
    mallId: string;
    refreshToken: string;
  }) {
    const mallId = this.normalizeMallId(params.mallId);
    const refreshToken = String(params.refreshToken || '').trim();

    if (!mallId || !refreshToken) {
      throw new BadRequestException('mallId and refreshToken are required.');
    }

    const form = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    });

    const response = await axios.post<Cafe24TokenResponse>(
      `${this.buildApiBaseUrl(mallId)}/api/v2/oauth/token`,
      form.toString(),
      {
        timeout: 30000,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: this.buildBasicAuthHeader(),
        },
      },
    );

    return response.data;
  }

  async syncAccessTokenToHostingAccount(params: {
    customId: string;
    accountPlatform: string;
    mallId: string;
    code: string;
    redirectUri?: string;
  }) {
    const token = await this.exchangeAccessToken({
      mallId: params.mallId,
      code: params.code,
      redirectUri: params.redirectUri,
    });

    let account = await this.hostingAccountRepository.findOne({
      where: {
        customId: params.customId,
        accountPlatform: params.accountPlatform,
      },
    });

    if (!account) {
      account = this.hostingAccountRepository.create({
        customId: params.customId,
        accountPlatform: params.accountPlatform,
        platform: 'cafe24',
        partnerKey: params.mallId,
        apiKey: token.access_token,
        redirectUri: params.redirectUri || this.defaultRedirectUri,
        refreshToken: token.refresh_token || null,
        tokenExpiresAt: token.expires_at ? new Date(token.expires_at) : null,
        refreshTokenExpiresAt: token.refresh_token_expires_at
          ? new Date(token.refresh_token_expires_at)
          : null,
      });
    } else {
      account.platform = 'cafe24';
      account.partnerKey = params.mallId;
      account.apiKey = token.access_token;
      account.redirectUri = params.redirectUri || this.defaultRedirectUri;
      account.refreshToken = token.refresh_token || account.refreshToken || null;
      account.tokenExpiresAt = token.expires_at
        ? new Date(token.expires_at)
        : account.tokenExpiresAt || null;
      account.refreshTokenExpiresAt = token.refresh_token_expires_at
        ? new Date(token.refresh_token_expires_at)
        : account.refreshTokenExpiresAt || null;
    }

    await this.hostingAccountRepository.save(account);

    return {
      account,
      token,
    };
  }

  async getAuthConfigFromHostingAccount(params: {
    customId: string;
    accountPlatform: string;
  }): Promise<Cafe24AuthConfig> {
    let account = await this.hostingAccountRepository.findOne({
      where: {
        customId: params.customId,
        accountPlatform: params.accountPlatform,
      },
    });

    if (!account) {
      throw new BadRequestException('Cafe24 hosting account not found.');
    }

    if (account.platform !== 'cafe24') {
      throw new BadRequestException('Selected hosting account is not Cafe24.');
    }

    const mallId = this.normalizeMallId(account.partnerKey);
    if (!mallId) {
      throw new BadRequestException('Cafe24 mallId is missing.');
    }

    account = await this.ensureFreshHostingAccount(account, 'runtime');

    const accessToken = String(account.apiKey || '').trim();
    if (!accessToken) {
      throw new BadRequestException('Cafe24 access token is missing.');
    }

    return {
      mallId,
      accessToken,
      shopNo: 1,
    };
  }

  async fetchAndSaveCafe24Categories(
    customId: string,
    accountPlatform: string,
  ) {
    const auth = await this.getAuthConfigFromHostingAccount({
      customId,
      accountPlatform,
    });

    const pageSize = 100;
    const allCategoryItems: any[] = [];

    for (let offset = 0; offset <= 8000; offset += pageSize) {
      const pageItems = await this.fetchCafe24CategoryPage(
        auth,
        offset,
        pageSize,
      );

      if (!pageItems.length) {
        break;
      }

      allCategoryItems.push(...pageItems);

      if (pageItems.length < pageSize) {
        break;
      }
    }

    const categories = this.flattenRemoteCategories(allCategoryItems);

    await this.categoryService.saveCafe24Categories(
      categories,
      customId,
      accountPlatform,
    );

    return {
      message: 'Cafe24 categories fetched successfully.',
      count: categories.length,
    };
  }

  async createProduct(params: {
    mallId: string;
    accessToken: string;
    payload: Cafe24CreateProductDto;
    shopNo?: number;
  }) {
    return this.request<any>({
      mallId: params.mallId,
      accessToken: params.accessToken,
      method: 'POST',
      path: '/api/v2/admin/products',
      data: this.withShopNoBody({ request: params.payload }, params.shopNo),
    });
  }

  async updateProduct(params: {
    mallId: string;
    accessToken: string;
    productNo: number;
    payload: Cafe24UpdateProductDto;
    shopNo?: number;
  }) {
    return this.request<any>({
      mallId: params.mallId,
      accessToken: params.accessToken,
      method: 'PUT',
      path: `/api/v2/admin/products/${params.productNo}`,
      data: this.withShopNoBody({ request: params.payload }, params.shopNo),
    });
  }

  async getProductOptions(params: {
    mallId: string;
    accessToken: string;
    productNo: number;
    shopNo?: number;
  }) {
    return this.request<any>({
      mallId: params.mallId,
      accessToken: params.accessToken,
      method: 'GET',
      path: `/api/v2/admin/products/${params.productNo}/options`,
      params: {
        shop_no: this.normalizeShopNo(params.shopNo),
      },
    });
  }

  async createProductOptions(params: {
    mallId: string;
    accessToken: string;
    productNo: number;
    product: Product;
    shopNo?: number;
  }) {
    return this.request<any>({
      mallId: params.mallId,
      accessToken: params.accessToken,
      method: 'POST',
      path: `/api/v2/admin/products/${params.productNo}/options`,
      data: this.withShopNoBody(
        { request: this.buildCafe24OptionPayload(params.product) },
        params.shopNo,
      ),
    });
  }

  async updateProductOptions(params: {
    mallId: string;
    accessToken: string;
    productNo: number;
    product: Product;
    shopNo?: number;
  }) {
    return this.request<any>({
      mallId: params.mallId,
      accessToken: params.accessToken,
      method: 'PUT',
      path: `/api/v2/admin/products/${params.productNo}/options`,
      data: this.withShopNoBody(
        { request: this.buildCafe24OptionPayload(params.product) },
        params.shopNo,
      ),
    });
  }

  async deleteProductOptions(params: {
    mallId: string;
    accessToken: string;
    productNo: number;
    shopNo?: number;
  }) {
    return this.request<any>({
      mallId: params.mallId,
      accessToken: params.accessToken,
      method: 'DELETE',
      path: `/api/v2/admin/products/${params.productNo}/options`,
      params: {
        shop_no: this.normalizeShopNo(params.shopNo),
      },
    });
  }

  private async syncProductOptions(params: {
    mallId: string;
    accessToken: string;
    productNo: number;
    product: Product;
    shopNo?: number;
  }) {
    const nextOptionTexts = this.getNormalizedSizeOptions(params.product);
    let currentOptionTexts: string[] | null = null;

    try {
      const currentOptions = await this.getProductOptions(params);
      currentOptionTexts = this.extractCafe24OptionTexts(currentOptions);
    } catch (error) {
      this.logger.warn(
        `Cafe24 option lookup skipped for product ${params.productNo}: ${this.describeError(
          error,
        )}`,
      );
    }

    const canUpdateInPlace =
      Array.isArray(currentOptionTexts) &&
      currentOptionTexts.length > 0 &&
      currentOptionTexts.length === nextOptionTexts.length;

    if (canUpdateInPlace) {
      try {
        await this.updateProductOptions(params);
        return;
      } catch (error) {
        this.logger.warn(
          `Cafe24 option PUT failed for product ${params.productNo}, trying recreate flow: ${this.describeError(
            error,
          )}`,
        );
      }
    }

    try {
      await this.deleteProductOptions(params);
    } catch (error) {
      this.logger.warn(
        `Cafe24 option delete skipped for product ${params.productNo}: ${this.describeError(
          error,
        )}`,
      );
    }

    await this.createProductOptions(params);
  }

  async uploadImageFromUrl(params: {
    mallId: string;
    accessToken: string;
    imageUrl: string;
    referer?: string;
    shopNo?: number;
  }) {
    const imagePayload = await this.fetchImageAsBase64Payload(
      params.imageUrl,
      params.referer,
    );

    const response = await this.requestWithBodyFallback<any>({
      mallId: params.mallId,
      accessToken: params.accessToken,
      method: 'POST',
      path: '/api/v2/admin/products/images',
      bodies: [
        this.withShopNoBody(
          { requests: [{ image: imagePayload.dataUri }] },
          params.shopNo,
        ),
        this.withShopNoBody(
          { request: { image: imagePayload.dataUri } },
          params.shopNo,
        ),
        this.withShopNoBody(
          { request: { image: imagePayload.base64 } },
          params.shopNo,
        ),
      ],
    });

    const path = this.extractImagePath(response);
    if (!path) {
      throw new BadRequestException('Cafe24 image upload succeeded but path was not returned.');
    }

    return path;
  }

  async setProductImages(params: {
    mallId: string;
    accessToken: string;
    productNo: number;
    detailImage?: string | null;
    listImage?: string | null;
    tinyImage?: string | null;
    smallImage?: string | null;
    shopNo?: number;
  }) {
    const payload = {
      detail_image: params.detailImage || undefined,
      list_image: params.listImage || undefined,
      tiny_image: params.tinyImage || undefined,
      small_image: params.smallImage || undefined,
      image_upload_type: 'B',
    };

    return this.requestWithBodyFallback<any>({
      mallId: params.mallId,
      accessToken: params.accessToken,
      method: 'POST',
      path: `/api/v2/admin/products/${params.productNo}/images`,
      bodies: [
        this.withShopNoBody({ request: payload }, params.shopNo),
        this.withShopNoBody(payload, params.shopNo),
        this.withShopNoBody({ images: payload }, params.shopNo),
      ],
    });
  }

  async createAdditionalProductImage(params: {
    mallId: string;
    accessToken: string;
    productNo: number;
    imageDataList: string[];
    base64List?: string[];
    shopNo?: number;
  }) {
    const imageDataList = (params.imageDataList || []).filter(Boolean);
    const base64List = (params.base64List || []).filter(Boolean);

    if (imageDataList.length === 0 && base64List.length === 0) {
      return null;
    }

    const payload = {
      additional_image: imageDataList,
    };

    return this.requestWithBodyFallback<any>({
      mallId: params.mallId,
      accessToken: params.accessToken,
      method: 'POST',
      path: `/api/v2/admin/products/${params.productNo}/additionalimages`,
      bodies: [
        this.withShopNoBody({ request: payload }, params.shopNo),
        ...(base64List.length > 0
          ? [
              this.withShopNoBody(
                {
                  request: {
                    additional_image: base64List,
                  },
                },
                params.shopNo,
              ),
            ]
          : []),
      ],
    });
  }

  async deleteProductImages(params: {
    mallId: string;
    accessToken: string;
    productNo: number;
    shopNo?: number;
  }) {
    try {
      await this.request<any>({
        mallId: params.mallId,
        accessToken: params.accessToken,
        method: 'DELETE',
        path: `/api/v2/admin/products/${params.productNo}/images`,
        params: {
          shop_no: this.normalizeShopNo(params.shopNo),
        },
      });
    } catch (error) {
      this.logger.warn(`Cafe24 main image delete skipped: ${this.describeError(error)}`);
    }

    try {
      await this.request<any>({
        mallId: params.mallId,
        accessToken: params.accessToken,
        method: 'DELETE',
        path: `/api/v2/admin/products/${params.productNo}/additionalimages`,
        params: {
          shop_no: this.normalizeShopNo(params.shopNo),
        },
      });
    } catch (error) {
      this.logger.warn(`Cafe24 additional image delete skipped: ${this.describeError(error)}`);
    }
  }

  async deleteProduct(params: {
    mallId: string;
    accessToken: string;
    productNo: number;
    shopNo?: number;
    deleteImagesFirst?: boolean;
  }) {
    if (params.deleteImagesFirst !== false) {
      await this.deleteProductImages(params);
    }

    return this.request<any>({
      mallId: params.mallId,
      accessToken: params.accessToken,
      method: 'DELETE',
      path: `/api/v2/admin/products/${params.productNo}`,
      params: {
        shop_no: this.normalizeShopNo(params.shopNo),
      },
    });
  }

  async createProductFromEntity(params: {
    product: Product;
    mallId: string;
    accessToken: string;
    shopNo?: number;
  }) {
    const runtimeAuth = await this.resolveRuntimeAuthFromProduct({
      product: params.product,
      mallId: params.mallId,
      accessToken: params.accessToken,
      shopNo: params.shopNo,
    });

    await this.prepareProductForMarketplace(params.product);
    const account = await this.resolveHostingAccountForProduct(params.product, {
      partnerKey: runtimeAuth.mallId,
      apiKey: runtimeAuth.accessToken,
    });

    const createDto = this.buildCreateDtoFromProduct(params.product, account);
    const createResponse = await this.createProduct({
      mallId: runtimeAuth.mallId,
      accessToken: runtimeAuth.accessToken,
      payload: createDto,
      shopNo: runtimeAuth.shopNo ?? params.shopNo,
    });

    const productNo = this.extractProductNo(createResponse);
    if (!productNo) {
      throw new BadRequestException('Cafe24 product number was not returned.');
    }

    params.product.goodsno = Number(productNo);
    params.product.platform = 'cafe24';

    const mainImagePayload = params.product.mainImageUrl
      ? await this.fetchImageAsBase64Payload(
          params.product.mainImageUrl,
          params.product.visitUrl,
        )
      : null;

    const additionalImagePayloads: string[] = [];
    const additionalImageBase64Payloads: string[] = [];
    for (const imageUrl of params.product.additionalImageUrls || []) {
      const payload = await this.fetchImageAsBase64Payload(
        imageUrl,
        params.product.visitUrl,
      );
      additionalImagePayloads.push(payload.dataUri);
      additionalImageBase64Payloads.push(payload.base64);
    }

    let mainImageResponse: any = null;
    if (mainImagePayload) {
      mainImageResponse = await this.setProductImages({
        mallId: runtimeAuth.mallId,
        accessToken: runtimeAuth.accessToken,
        productNo: Number(productNo),
        detailImage: mainImagePayload.dataUri,
        listImage: mainImagePayload.dataUri,
        tinyImage: mainImagePayload.dataUri,
        smallImage: mainImagePayload.dataUri,
        shopNo: runtimeAuth.shopNo ?? params.shopNo,
      });
    }

    if (additionalImagePayloads.length > 0) {
      await this.createAdditionalProductImage({
        mallId: runtimeAuth.mallId,
        accessToken: runtimeAuth.accessToken,
        productNo: Number(productNo),
        imageDataList: additionalImagePayloads,
        base64List: additionalImageBase64Payloads,
        shopNo: runtimeAuth.shopNo ?? params.shopNo,
      });
    }

    const uploadedMainImage =
      mainImageResponse?.image?.detail_image ??
      mainImageResponse?.detail_image ??
      params.product.mainImageUrl;

    if (uploadedMainImage) {
      params.product.mainImageUrl = uploadedMainImage;
    }

    params.product.mainInfo = this.createContent(
      params.product,
      uploadedMainImage || params.product.mainImageUrl,
      params.product.additionalImageUrls || [],
      account?.topImages,
      account?.bottomImages,
    );

    await this.updateProduct({
      mallId: runtimeAuth.mallId,
      accessToken: runtimeAuth.accessToken,
      productNo: Number(productNo),
      payload: this.buildUpdateDtoFromProduct(params.product, account, {
        includeDescription: true,
      }),
      shopNo: runtimeAuth.shopNo ?? params.shopNo,
    });

    await this.productRepository.save(params.product);

    return {
      productNo: Number(productNo),
      uploadedMainImage,
      uploadedAdditionalImages: params.product.additionalImageUrls || [],
      response: createResponse,
    };
  }

  async updateProductFromEntity(params: {
    product: Product;
    mallId: string;
    accessToken: string;
    shopNo?: number;
  }) {
    if (!params.product.goodsno) {
      throw new BadRequestException('Cafe24 product_no is missing on Product entity.');
    }

    const runtimeAuth = await this.resolveRuntimeAuthFromProduct({
      product: params.product,
      mallId: params.mallId,
      accessToken: params.accessToken,
      shopNo: params.shopNo,
    });
    const account = await this.resolveHostingAccountForProduct(params.product, {
      partnerKey: runtimeAuth.mallId,
      apiKey: runtimeAuth.accessToken,
    });

    await this.prepareProductForMarketplaceUpdate(params.product);
    const updateDto = this.buildUpdateDtoFromProduct(params.product, account);

    await this.updateProduct({
      mallId: runtimeAuth.mallId,
      accessToken: runtimeAuth.accessToken,
      productNo: Number(params.product.goodsno),
      payload: updateDto,
      shopNo: runtimeAuth.shopNo ?? params.shopNo,
    });

    await this.syncProductOptions({
      mallId: runtimeAuth.mallId,
      accessToken: runtimeAuth.accessToken,
      productNo: Number(params.product.goodsno),
      product: params.product,
      shopNo: runtimeAuth.shopNo ?? params.shopNo,
    });

    await this.productRepository.save(params.product);
  }

  async deleteProductFromEntity(params: {
    product: Product;
    mallId: string;
    accessToken: string;
    shopNo?: number;
  }) {
    if (!params.product.goodsno) {
      return;
    }

    const runtimeAuth = await this.resolveRuntimeAuthFromProduct({
      product: params.product,
      mallId: params.mallId,
      accessToken: params.accessToken,
      shopNo: params.shopNo,
    });
    const account = await this.resolveHostingAccountForProduct(params.product, {
      partnerKey: runtimeAuth.mallId,
      apiKey: runtimeAuth.accessToken,
    });
    const payload = this.buildUpdateDtoFromProduct(params.product, account, {
      display: 'F',
      selling: 'F',
    });

    await this.updateProduct({
      mallId: runtimeAuth.mallId,
      accessToken: runtimeAuth.accessToken,
      productNo: Number(params.product.goodsno),
      payload,
      shopNo: runtimeAuth.shopNo ?? params.shopNo,
    });
  }

  private describeError(error: unknown) {
    const axiosError = error as AxiosError<{ message?: string }>;
    return (
      axiosError?.response?.data?.message ||
      axiosError?.message ||
      String(error)
    );
  }
}
