import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import axios from 'axios';
import * as crypto from 'crypto';
import * as xml2js from 'xml2js';
import { TextDecoder } from 'util';
import { PlatformCategory } from 'src/category/PlatformCategory.entity';
import { Product } from 'src/product/product.entity';
import { PlatformMapping } from './platform-mapping.entity';
import { PlatformProduct } from './platform-product.entity';

const PLATFORM_TARGETS = [
    { id: 'lotteon', label: '롯데ON', enabled: true },
    { id: 'coupang', label: '쿠팡', enabled: true },
    { id: '11st', label: '11번가', enabled: true },
    { id: 'auction', label: '옥션', enabled: false },
    { id: 'gmarket', label: '지마켓', enabled: false },
    { id: 'kakaoshopping', label: '카카오쇼핑', enabled: false },
    { id: 'ssg', label: 'SSG닷컴', enabled: false },
    { id: 'shinsegaemall', label: '신세계몰', enabled: false },
    { id: 'emartmall', label: '이마트몰', enabled: false },
    { id: 'lfmall', label: 'LFmall', enabled: false },
    { id: 'gsshop', label: 'GSSHOP', enabled: false },
    { id: 'homeandshopping', label: '홈앤쇼핑', enabled: false },
    { id: 'feelway', label: '필웨이', enabled: false },
    { id: 'ably', label: 'ABLY(에이블리)', enabled: false },
    { id: 'musinsa', label: '무신사', enabled: false },
    { id: 'lottedepartment', label: '롯데백화점', enabled: false },
    { id: 'shinsegaev', label: '신세계V', enabled: false },
    { id: 'cjmall', label: 'CJ온스타일', enabled: false },
    { id: 'mustit', label: '머스트잇', enabled: false },
    { id: 'trenbe', label: '트렌비', enabled: false },
];

@Injectable()
export class PlatformService {
    private elevenstCategoryBaseUrl?: string;

    constructor(
        @InjectRepository(Product)
        private readonly productRepository: Repository<Product>,
        @InjectRepository(PlatformCategory)
        private readonly platformCategoryRepository: Repository<PlatformCategory>,
        @InjectRepository(PlatformProduct)
        private readonly platformProductRepository: Repository<PlatformProduct>,
        @InjectRepository(PlatformMapping)
        private readonly platformMappingRepository: Repository<PlatformMapping>,
    ) {}

    getTargets() {
        return { platforms: PLATFORM_TARGETS };
    }

    async getCategories(targetPlatform: string, scope = 'all') {
        const normalizedPlatform = this.normalizePlatform(targetPlatform);
        const allCategories = await this.platformCategoryRepository.find({
            where: { platform: normalizedPlatform },
            order: {
                categoryPath: 'ASC',
                categoryName: 'ASC',
            },
        });
        const categories = scope === 'fashion'
            ? allCategories.filter(category => this.isFashionCategory(category))
            : allCategories;
        return {
            categories,
            totalCount: allCategories.length,
            filteredCount: categories.length,
        };
    }

    async fetchCategories(targetPlatform: string, scope = 'all') {
        const normalizedPlatform = this.normalizePlatform(targetPlatform);

        if (normalizedPlatform === 'coupang') {
            return this.fetchCoupangCategories(scope);
        }

        if (normalizedPlatform === '11st') {
            return this.fetchElevenstCategories(scope);
        }

        throw new BadRequestException(`${normalizedPlatform} 카테고리 API는 아직 준비되지 않았습니다.`);
    }

    async getMappings(query: any) {
        const where: any = this.buildMappingWhere(query);
        const mappings = await this.platformMappingRepository.find({
            where,
            order: {
                site: 'ASC',
                sourceCategoryName: 'ASC',
            },
        });

        return { mappings };
    }

    async saveMapping(body: any) {
        const customId = this.requireText(body.customId, 'customId');
        const sourceAccountPlatform = this.requireText(body.sourceAccountPlatform, 'sourceAccountPlatform');
        const targetPlatform = this.normalizePlatform(body.targetPlatform);
        const targetAccountPlatform = this.requireText(body.targetAccountPlatform, 'targetAccountPlatform');
        const site = this.requireText(body.site, 'site');
        const sourceSiteUrl = this.requireText(body.sourceSiteUrl, 'sourceSiteUrl');
        const sourceCategoryName = this.requireText(body.sourceCategoryName, 'sourceCategoryName');
        const targetCategoryName = this.requireText(body.targetCategoryName, 'targetCategoryName');

        const existing = await this.platformMappingRepository.findOne({
            where: {
                customId,
                sourceAccountPlatform,
                targetPlatform,
                targetAccountPlatform,
                site,
                sourceSiteUrl,
            },
        });

        const mapping = existing || this.platformMappingRepository.create();
        mapping.customId = customId;
        mapping.sourceAccountPlatform = sourceAccountPlatform;
        mapping.targetPlatform = targetPlatform;
        mapping.targetAccountPlatform = targetAccountPlatform;
        mapping.site = site;
        mapping.sourceSiteUrl = sourceSiteUrl;
        mapping.sourceCategoryName = sourceCategoryName;
        mapping.targetCategoryCode = this.optionalText(body.targetCategoryCode);
        mapping.targetCategoryName = targetCategoryName;
        mapping.targetCategoryPath = this.optionalText(body.targetCategoryPath);
        mapping.enabled = body.enabled !== false;

        const saved = await this.platformMappingRepository.save(mapping);
        return { mapping: saved };
    }

    async deleteMapping(id: number, customId: string) {
        if (!id) {
            throw new BadRequestException('mapping id is required');
        }

        const mapping = await this.platformMappingRepository.findOne({ where: { id } });
        if (!mapping) {
            throw new NotFoundException('platform mapping not found');
        }

        if (customId && mapping.customId !== customId) {
            throw new BadRequestException('customId does not match mapping owner');
        }

        await this.platformMappingRepository.delete(id);
        return { success: true };
    }

    async syncProducts(body: any) {
        const customId = this.requireText(body.customId, 'customId');
        const sourceAccountPlatform = this.requireText(body.sourceAccountPlatform, 'sourceAccountPlatform');
        const targetPlatform = this.normalizePlatform(body.targetPlatform);
        const targetAccountPlatform = this.requireText(body.targetAccountPlatform, 'targetAccountPlatform');
        const site = this.requireText(body.site, 'site');
        const requestedSourceSiteUrls = Array.isArray(body.sourceSiteUrls)
            ? body.sourceSiteUrls.map((value: any) => String(value || '').trim()).filter(Boolean)
            : [];

        let mappings = await this.platformMappingRepository.find({
            where: {
                customId,
                sourceAccountPlatform,
                targetPlatform,
                targetAccountPlatform,
                site,
                enabled: true,
            },
            order: {
                sourceCategoryName: 'ASC',
            },
        });

        if (requestedSourceSiteUrls.length > 0) {
            const urlSet = new Set(requestedSourceSiteUrls);
            mappings = mappings.filter(mapping => urlSet.has(mapping.sourceSiteUrl));
        }

        if (!mappings.length) {
            throw new BadRequestException('연동할 플랫폼 카테고리 매핑이 없습니다.');
        }

        let created = 0;
        let updated = 0;
        let deleted = 0;
        let failed = 0;
        let productCount = 0;
        const failedMessages: string[] = [];

        for (const mapping of mappings) {
            const products = await this.productRepository.find({
                where: {
                    customId,
                    accountPlatform: sourceAccountPlatform,
                    site,
                    siteUrl: mapping.sourceSiteUrl,
                },
            });

            productCount += products.length;
            const currentStyleIds = products.map(product => product.styleId).filter(Boolean);

            for (const product of products) {
                try {
                    const existing = await this.platformProductRepository.findOne({
                        where: {
                            customId,
                            sourceAccountPlatform,
                            targetPlatform,
                            targetAccountPlatform,
                            styleId: product.styleId,
                        },
                    });

                    const platformProduct = existing || this.platformProductRepository.create();
                    platformProduct.sourceProductId = product.id;
                    platformProduct.customId = customId;
                    platformProduct.sourceAccountPlatform = sourceAccountPlatform;
                    platformProduct.targetPlatform = targetPlatform;
                    platformProduct.targetAccountPlatform = targetAccountPlatform;
                    platformProduct.site = product.site || site;
                    platformProduct.designer = product.designer;
                    platformProduct.title = product.title;
                    platformProduct.styleId = product.styleId;
                    platformProduct.brandstyleId = product.brandstyleId;
                    platformProduct.categoryName = product.categoryName;
                    platformProduct.sourceCategoryName = mapping.sourceCategoryName;
                    platformProduct.siteUrl = product.siteUrl;
                    platformProduct.visitUrl = product.visitUrl;
                    platformProduct.targetCategoryCode = mapping.targetCategoryCode;
                    platformProduct.targetCategoryName = mapping.targetCategoryName;
                    platformProduct.targetCategoryPath = mapping.targetCategoryPath;
                    platformProduct.price = product.price;
                    platformProduct.targetPrice = Number(body.targetPrice || 0) || product.price;
                    platformProduct.size = product.size;
                    platformProduct.color = product.color;
                    platformProduct.madeIn = product.madeIn;
                    platformProduct.mainInfo = product.mainInfo;
                    platformProduct.mainImageUrl = product.mainImageUrl;
                    platformProduct.additionalImageUrls = product.additionalImageUrls || [];
                    platformProduct.externalProductNo =
                        platformProduct.externalProductNo ||
                        `${targetPlatform}-${product.id || product.styleId}`;
                    platformProduct.externalSellerProductNo =
                        platformProduct.externalSellerProductNo || product.styleId;
                    platformProduct.rawResponse = {
                        mocked: true,
                        message: '플랫폼 API 연결 전 임시 저장입니다.',
                    };
                    platformProduct.status = 'synced_mock';
                    platformProduct.lastError = undefined;
                    platformProduct.lastSyncedAt = new Date();

                    await this.platformProductRepository.save(platformProduct);
                    if (existing) updated += 1;
                    else created += 1;
                } catch (error: any) {
                    failed += 1;
                    failedMessages.push(`${product.styleId}: ${error.message || error}`);
                }
            }

            const staleProducts = await this.platformProductRepository.find({
                where: {
                    customId,
                    sourceAccountPlatform,
                    targetPlatform,
                    targetAccountPlatform,
                    site,
                    siteUrl: mapping.sourceSiteUrl,
                },
            });

            const currentStyleIdSet = new Set(currentStyleIds);
            const productsToMarkDeleted = staleProducts.filter(product => !currentStyleIdSet.has(product.styleId));

            for (const product of productsToMarkDeleted) {
                product.status = 'deleted';
                product.lastSyncedAt = new Date();
                await this.platformProductRepository.save(product);
                deleted += 1;
            }
        }

        return {
            success: failed === 0,
            created,
            updated,
            deleted,
            failed,
            productCount,
            failedMessages,
        };
    }

    async getProducts(query: any) {
        const where: any = {};
        if (query.customId) where.customId = query.customId;
        if (query.sourceAccountPlatform) where.sourceAccountPlatform = query.sourceAccountPlatform;
        if (query.targetPlatform) where.targetPlatform = this.normalizePlatform(query.targetPlatform);
        if (query.targetAccountPlatform) where.targetAccountPlatform = query.targetAccountPlatform;
        if (query.site) where.site = query.site;
        if (query.status) where.status = query.status;

        const products = await this.platformProductRepository.find({
            where,
            take: Number(query.take || 500),
            order: {
                updatedAt: 'DESC',
            },
        });

        return { products };
    }

    private async fetchCoupangCategories(scope = 'all') {
        const accessKey = this.requireEnv('COUPANG_ACCESS_KEY');
        const secretKey = this.requireEnv('COUPANG_SECRET_KEY');
        const path = '/v2/providers/seller_api/apis/api/v1/marketplace/meta/display-categories';
        const response = await this.requestCoupang('GET', path, '', accessKey, secretKey);
        const responseCode = String(this.getLooseValue(response, ['code', 'resultCode']) || '').trim();
        const responseMessage = String(this.getLooseValue(response, ['message', 'resultMessage']) || '').trim();
        if (responseCode && !/^(success|200)$/i.test(responseCode)) {
            throw new BadRequestException(
                `쿠팡 카테고리 API 오류: ${responseCode}${responseMessage ? ` - ${responseMessage}` : ''}`,
            );
        }
        const categories = this.flattenCoupangCategories(response?.data ?? response);

        if (!categories.length) {
            throw new BadRequestException(
                `쿠팡 카테고리를 찾지 못했습니다. 응답 구조: ${this.describePayload(response)}`,
            );
        }

        await this.savePlatformCategories('coupang', categories);
        return {
            success: true,
            platform: 'coupang',
            count: categories.length,
            ...(await this.getCategories('coupang', scope)),
        };
    }

    private async fetchElevenstCategories(scope = 'all') {
        const apiKey = String(
            process.env.ELEVENST_API_KEY || process.env['11ST_API_KEY'] || '',
        ).trim();
        const rootPayload = await this.requestElevenstCategory(undefined, apiKey);
        const rootNodes = this.extractElevenstCategoryNodes(rootPayload);

        if (!rootNodes.length) {
            const resultCode = String(
                this.getLooseValue(rootPayload, ['resultCode', 'code', 'status']) || '',
            ).trim();
            const resultMessage = String(
                this.getLooseValue(rootPayload, ['resultMessage', 'message', 'errorMessage']) || '',
            ).trim();
            throw new BadRequestException(
                `11번가 카테고리를 찾지 못했습니다.` +
                `${resultCode ? ` 코드=${resultCode}` : ''}` +
                `${resultMessage ? ` 메시지=${resultMessage}` : ''}` +
                ` 응답 구조: ${this.describePayload(rootPayload)}`,
            );
        }

        // The current 11st root response contains the complete category tree.
        // Build it locally instead of issuing thousands of child requests.
        if (rootNodes.length >= 100) {
            const categoryValues = this.buildElevenstCategoryTree(rootNodes);
            await this.savePlatformCategories('11st', categoryValues);
            return {
                success: true,
                platform: '11st',
                count: categoryValues.length,
                requestCount: 1,
                truncated: false,
                ...(await this.getCategories('11st', scope)),
            };
        }

        const categories = new Map<string, Partial<PlatformCategory>>();
        const queue: Array<{ categoryCode: string; categoryPath: string; depth: number }> = [];

        rootNodes.forEach(node => {
            categories.set(node.categoryCode, {
                platform: '11st',
                categoryCode: node.categoryCode,
                categoryName: node.categoryName,
                parentCategoryCode: node.parentCategoryCode,
                categoryPath: node.categoryName,
                depth: node.depth || 1,
                leaf: typeof node.leaf === 'boolean' ? node.leaf : true,
                usable: node.usable,
                status: node.status,
                elevenstCategoryCode: node.categoryCode,
                elevenstParentCategoryCode: node.parentCategoryCode,
                elevenstDepth: node.depth || 1,
                rawData: node.rawData,
            });
            queue.push({
                categoryCode: node.categoryCode,
                categoryPath: node.categoryName,
                depth: node.depth || 1,
            });
        });

        const maxRequests = Number(process.env.ELEVENST_CATEGORY_MAX_REQUESTS || 5000);
        let requestCount = 0;

        while (queue.length && requestCount < maxRequests) {
            const batch = queue.splice(0, 6);
            requestCount += batch.length;
            const results = await Promise.allSettled(
                batch.map(parent => this.requestElevenstCategory(parent.categoryCode, apiKey)),
            );

            results.forEach((result, index) => {
                const parent = batch[index];
                if (result.status !== 'fulfilled') return;

                const childNodes = this.extractElevenstCategoryNodes(result.value)
                    .filter(node => node.categoryCode && node.categoryCode !== parent.categoryCode);
                if (!childNodes.length) return;

                const parentEntity = categories.get(parent.categoryCode);
                if (parentEntity) parentEntity.leaf = false;

                childNodes.forEach(node => {
                    if (categories.has(node.categoryCode)) return;

                    const depth = node.depth || parent.depth + 1;
                    const categoryPath = `${parent.categoryPath} > ${node.categoryName}`;
                    categories.set(node.categoryCode, {
                        platform: '11st',
                        categoryCode: node.categoryCode,
                        categoryName: node.categoryName,
                        parentCategoryCode: node.parentCategoryCode || parent.categoryCode,
                        categoryPath,
                        depth,
                        leaf: typeof node.leaf === 'boolean' ? node.leaf : true,
                        usable: node.usable,
                        status: node.status,
                        elevenstCategoryCode: node.categoryCode,
                        elevenstParentCategoryCode: node.parentCategoryCode || parent.categoryCode,
                        elevenstDepth: depth,
                        rawData: node.rawData,
                    });
                    queue.push({
                        categoryCode: node.categoryCode,
                        categoryPath,
                        depth,
                    });
                });
            });
        }

        const categoryValues = Array.from(categories.values());
        await this.savePlatformCategories('11st', categoryValues);
        return {
            success: true,
            platform: '11st',
            count: categoryValues.length,
            requestCount,
            truncated: queue.length > 0,
            ...(await this.getCategories('11st', scope)),
        };
    }

    private async requestCoupang(
        method: string,
        path: string,
        query: string,
        accessKey: string,
        secretKey: string,
    ) {
        const datetime = new Date()
            .toISOString()
            .replace(/[-:]/g, '')
            .replace(/\.\d{3}Z$/, 'Z')
            .slice(2);
        const message = `${datetime}${method.toUpperCase()}${path}${query}`;
        const signature = crypto
            .createHmac('sha256', secretKey)
            .update(message)
            .digest('hex');
        const authorization =
            `CEA algorithm=HmacSHA256, access-key=${accessKey}, ` +
            `signed-date=${datetime}, signature=${signature}`;
        const baseUrl = process.env.COUPANG_API_BASE_URL || 'https://api-gateway.coupang.com';

        const response = await axios.request({
            method,
            url: `${baseUrl}${path}${query ? `?${query}` : ''}`,
            timeout: 60000,
            headers: {
                Authorization: authorization,
                'Content-Type': 'application/json;charset=UTF-8',
            },
        });

        return response.data;
    }

    private async requestElevenstCategory(categoryCode?: string, apiKey?: string) {
        const configuredBaseUrl = String(process.env.ELEVENST_API_BASE_URL || '').trim();
        const baseUrls = this.elevenstCategoryBaseUrl
            ? [this.elevenstCategoryBaseUrl]
            : configuredBaseUrl
                ? [configuredBaseUrl]
                : [
                    'https://api.11st.co.kr/rest/cateservice/category',
                    'http://api.11st.co.kr/rest/cateservice/category',
                ];
        let response: any;
        let lastError: any;

        for (const rawBaseUrl of baseUrls) {
            const baseUrl = rawBaseUrl.replace(/\/$/, '');
            const url = categoryCode
                ? `${baseUrl}/${encodeURIComponent(categoryCode)}`
                : baseUrl;
            try {
                response = await axios.get(url, {
                    timeout: 30000,
                    responseType: 'arraybuffer',
                    headers: {
                        Accept: 'application/xml',
                        ...(apiKey ? { openapikey: apiKey } : {}),
                    },
                });
                this.elevenstCategoryBaseUrl = baseUrl;
                break;
            } catch (error) {
                lastError = error;
            }
        }

        if (!response) throw lastError;

        const buffer = Buffer.from(response.data || []);
        const contentType = String(response.headers?.['content-type'] || '').toLowerCase();
        const firstBytes = buffer.subarray(0, 160).toString('ascii').toLowerCase();
        const charset = /euc-kr|ks_c_5601-1987|cp949/.test(`${contentType} ${firstBytes}`)
            ? 'euc-kr'
            : 'utf-8';
        const xml = new TextDecoder(charset).decode(buffer);
        const parser = new xml2js.Parser({ explicitArray: false, trim: true });
        return parser.parseStringPromise(xml);
    }

    private flattenCoupangCategories(payload: any): Array<Partial<PlatformCategory>> {
        const categories = new Map<string, Partial<PlatformCategory>>();

        const walk = (
            value: any,
            parentCategoryCode?: string,
            parentPath = '',
            depth = 1,
        ) => {
            if (Array.isArray(value)) {
                value.forEach(item => walk(item, parentCategoryCode, parentPath, depth));
                return;
            }
            if (!value || typeof value !== 'object') return;

            const categoryCode = String(this.getLooseValue(value, [
                'displayItemCategoryCode',
                'displayCategoryCode',
                'categoryCode',
                'categoryId',
            ]) || '').trim();
            const categoryName = String(this.getLooseValue(value, [
                'name',
                'displayItemCategoryName',
                'displayCategoryName',
                'categoryName',
            ]) || '').trim();
            let nextParentCode = parentCategoryCode;
            let nextPath = parentPath;
            let nextDepth = depth;

            if (categoryCode && categoryName) {
                const categoryPath = parentPath
                    ? `${parentPath} > ${categoryName}`
                    : categoryName;
                const status = String(this.getLooseValue(value, [
                    'status',
                    'displayItemCategoryStatus',
                    'displayCategoryStatus',
                ]) || '').trim();
                const existing = categories.get(categoryCode);
                categories.set(categoryCode, {
                    ...existing,
                    platform: 'coupang',
                    categoryCode,
                    categoryName,
                    parentCategoryCode,
                    categoryPath,
                    depth,
                    leaf: true,
                    usable: status ? !/disabled|invalid|inactive/i.test(status) : undefined,
                    status: status || undefined,
                    coupangDisplayCategoryCode: categoryCode,
                    coupangStatus: status || undefined,
                    rawData: this.onlyPrimitiveValues(value),
                });
                if (parentCategoryCode) {
                    const parent = categories.get(parentCategoryCode);
                    if (parent) parent.leaf = false;
                }
                nextParentCode = categoryCode;
                nextPath = categoryPath;
                nextDepth = depth + 1;
            }

            Object.values(value).forEach(child => {
                if (child && typeof child === 'object') {
                    walk(child, nextParentCode, nextPath, nextDepth);
                }
            });
        };

        walk(payload);
        return Array.from(categories.values());
    }

    private buildElevenstCategoryTree(nodes: any[]): Array<Partial<PlatformCategory>> {
        const normalizedNodes = nodes.map(node => ({ ...node }));
        const depthStack: string[] = [];

        normalizedNodes.forEach(node => {
            const depth = Number(node.depth || 0);
            if (!node.parentCategoryCode && depth > 1) {
                node.parentCategoryCode = depthStack[depth - 2];
            }
            if (depth > 0) {
                depthStack[depth - 1] = node.categoryCode;
                depthStack.length = depth;
            }
        });

        const nodesByCode = new Map(
            normalizedNodes.map(node => [String(node.categoryCode), node]),
        );
        const parentCodes = new Set(
            normalizedNodes
                .map(node => String(node.parentCategoryCode || ''))
                .filter(parentCode => parentCode && nodesByCode.has(parentCode)),
        );

        const resolveDepth = (node: any, visited = new Set<string>()): number => {
            const explicitDepth = Number(node.depth || 0);
            if (explicitDepth > 0) return explicitDepth;
            const code = String(node.categoryCode);
            if (visited.has(code)) return 1;
            visited.add(code);
            const parent = nodesByCode.get(String(node.parentCategoryCode || ''));
            return parent ? resolveDepth(parent, visited) + 1 : 1;
        };

        const resolvePath = (node: any, visited = new Set<string>()): string => {
            const code = String(node.categoryCode);
            if (visited.has(code)) return node.categoryName;
            visited.add(code);
            const parent = nodesByCode.get(String(node.parentCategoryCode || ''));
            return parent
                ? `${resolvePath(parent, visited)} > ${node.categoryName}`
                : node.categoryName;
        };

        return normalizedNodes.map(node => {
            const depth = resolveDepth(node);
            return {
                platform: '11st',
                categoryCode: node.categoryCode,
                categoryName: node.categoryName,
                parentCategoryCode: node.parentCategoryCode,
                categoryPath: resolvePath(node),
                depth,
                leaf: typeof node.leaf === 'boolean'
                    ? node.leaf
                    : !parentCodes.has(String(node.categoryCode)),
                usable: node.usable,
                status: node.status,
                elevenstCategoryCode: node.categoryCode,
                elevenstParentCategoryCode: node.parentCategoryCode,
                elevenstDepth: depth,
                rawData: node.rawData,
            };
        });
    }

    private extractElevenstCategoryNodes(payload: any) {
        const nodes = new Map<string, any>();

        const walk = (value: any) => {
            if (Array.isArray(value)) {
                value.forEach(walk);
                return;
            }
            if (!value || typeof value !== 'object') return;

            const categoryCode = String(this.getLooseValue(value, [
                'categoryCode',
                'categoryCd',
                'categoryNo',
                'categoryId',
                'dispNo',
                'dispCtgrNo',
            ]) || this.findLooseValue(value, key =>
                /(?:category|ctgr)/.test(key) &&
                /(?:code|cd|no|id)$/.test(key) &&
                !/(?:parent|upper)/.test(key),
            ) || '').trim();
            const categoryName = String(this.getLooseValue(value, [
                'categoryName',
                'categoryNm',
                'dispNm',
                'dispCtgrNm',
                'name',
            ]) || this.findLooseValue(value, key =>
                /(?:category|ctgr)/.test(key) && /(?:name|nm)$/.test(key) &&
                !/(?:parent|upper)/.test(key),
            ) || '').trim();

            if (categoryCode && categoryName) {
                const parentCategoryCode = String(this.getLooseValue(value, [
                    'parentCategoryCode',
                    'parentCategoryCd',
                    'parentCategoryNo',
                    'parentCtgrNo',
                    'categoryParentCode',
                    'categoryParentCd',
                    'categoryParentNo',
                    'parentDispNo',
                    'upperCategoryCode',
                    'upperCategoryNo',
                ]) || this.findLooseValue(value, key =>
                    /(?:parent|upper)/.test(key) &&
                    /(?:category|ctgr)/.test(key) &&
                    /(?:code|cd|no|id)$/.test(key),
                ) || '').trim() || undefined;
                const depthValue = Number(this.getLooseValue(value, [
                    'categoryDepth',
                    'categoryLevel',
                    'depth',
                    'dispCtgrLevel',
                ]) || this.findLooseValue(value, key =>
                    /(?:category|ctgr)/.test(key) && /(?:depth|level)$/.test(key),
                ) || 0);
                const status = String(this.getLooseValue(value, [
                    'status',
                    'useYn',
                    'displayYn',
                ]) || '').trim();
                const leafValue = String(this.getLooseValue(value, [
                    'leafYn',
                    'isLeaf',
                    'leaf',
                ]) || '').trim();
                nodes.set(categoryCode, {
                    categoryCode,
                    categoryName,
                    parentCategoryCode,
                    depth: Number.isFinite(depthValue) && depthValue > 0 ? depthValue : undefined,
                    leaf: leafValue ? /^(Y|true|1)$/i.test(leafValue) : undefined,
                    usable: status ? !/^(N|false|disabled|inactive)$/i.test(status) : undefined,
                    status: status || undefined,
                    rawData: this.onlyPrimitiveValues(value),
                });
            }

            Object.values(value).forEach(walk);
        };

        walk(payload);
        return Array.from(nodes.values());
    }

    private isFashionCategory(category: PlatformCategory): boolean {
        const categoryPath = String(category.categoryPath || '');
        const keywords = [
            '패션',
            '브랜드',
            '여성',
            '남성',
            '의류',
            '가방',
            '신발',
            '슈즈',
            '주얼리',
            '명품',
        ];
        return keywords.some(keyword => categoryPath.includes(keyword));
    }

    private async savePlatformCategories(
        platform: string,
        categories: Array<Partial<PlatformCategory>>,
    ) {
        const existing = await this.platformCategoryRepository.find({ where: { platform } });
        const existingByCode = new Map(existing.map(item => [item.categoryCode, item]));
        const syncedAt = new Date();
        const entities = categories
            .filter(item => item.categoryCode && item.categoryName)
            .map(item => {
                const entity = existingByCode.get(String(item.categoryCode)) ||
                    this.platformCategoryRepository.create();
                Object.assign(entity, item, { platform, lastSyncedAt: syncedAt });
                return entity;
            });

        await this.platformCategoryRepository.save(entities, { chunk: 200 });
    }

    private onlyPrimitiveValues(value: any) {
        return Object.fromEntries(
            Object.entries(value || {}).filter(([, item]) =>
                item === null || ['string', 'number', 'boolean'].includes(typeof item),
            ),
        );
    }

    private getLooseValue(value: any, candidateKeys: string[]) {
        if (!value || typeof value !== 'object') return undefined;
        const normalizeKey = (key: string) =>
            String(key || '')
                .split(':')
                .pop()
                ?.replace(/[^a-z0-9]/gi, '')
                .toLowerCase() || '';
        const normalizedCandidates = new Set(candidateKeys.map(normalizeKey));
        const sources = [value, value.$].filter(item => item && typeof item === 'object');

        for (const source of sources) {
            for (const [key, rawValue] of Object.entries(source)) {
                if (!normalizedCandidates.has(normalizeKey(key))) continue;
                const unwrapped = Array.isArray(rawValue) ? rawValue[0] : rawValue;
                if (unwrapped && typeof unwrapped === 'object' && '_' in unwrapped) {
                    return (unwrapped as any)._; 
                }
                return unwrapped;
            }
        }

        return undefined;
    }

    private findLooseValue(value: any, predicate: (normalizedKey: string) => boolean) {
        if (!value || typeof value !== 'object') return undefined;
        const normalizeKey = (key: string) =>
            String(key || '')
                .split(':')
                .pop()
                ?.replace(/[^a-z0-9]/gi, '')
                .toLowerCase() || '';
        const sources = [value, value.$].filter(item => item && typeof item === 'object');

        for (const source of sources) {
            for (const [key, rawValue] of Object.entries(source)) {
                if (!predicate(normalizeKey(key))) continue;
                const unwrapped = Array.isArray(rawValue) ? rawValue[0] : rawValue;
                if (unwrapped && typeof unwrapped === 'object' && '_' in unwrapped) {
                    return (unwrapped as any)._; 
                }
                if (['string', 'number', 'boolean'].includes(typeof unwrapped)) {
                    return unwrapped;
                }
            }
        }

        return undefined;
    }

    private describePayload(value: any, depth = 0): string {
        if (depth > 4) return '...';
        if (Array.isArray(value)) {
            return `Array(${value.length})${value.length ? `[${this.describePayload(value[0], depth + 1)}]` : ''}`;
        }
        if (!value || typeof value !== 'object') {
            return String(value ?? '').slice(0, 80);
        }

        return `{${Object.entries(value)
            .slice(0, 12)
            .map(([key, item]) => `${key}:${this.describePayload(item, depth + 1)}`)
            .join(', ')}}`;
    }

    private requireEnv(name: string) {
        const value = String(process.env[name] || '').trim();
        if (!value) {
            throw new BadRequestException(`${name} 환경변수가 없습니다.`);
        }
        return value;
    }

    private buildMappingWhere(query: any) {
        const where: any = {};
        if (query.customId) where.customId = query.customId;
        if (query.sourceAccountPlatform) where.sourceAccountPlatform = query.sourceAccountPlatform;
        if (query.targetPlatform) where.targetPlatform = this.normalizePlatform(query.targetPlatform);
        if (query.targetAccountPlatform) where.targetAccountPlatform = query.targetAccountPlatform;
        if (query.site) where.site = query.site;
        if (Array.isArray(query.sourceSiteUrls) && query.sourceSiteUrls.length) {
            where.sourceSiteUrl = In(query.sourceSiteUrls);
        }
        return where;
    }

    private normalizePlatform(value: any) {
        const text = String(value || '').trim().toLowerCase();
        if (!text) {
            throw new BadRequestException('targetPlatform is required');
        }
        return text;
    }

    private requireText(value: any, fieldName: string) {
        const text = String(value || '').trim();
        if (!text) {
            throw new BadRequestException(`${fieldName} is required`);
        }
        return text;
    }

    private optionalText(value: any) {
        const text = String(value || '').trim();
        return text || undefined;
    }
}
