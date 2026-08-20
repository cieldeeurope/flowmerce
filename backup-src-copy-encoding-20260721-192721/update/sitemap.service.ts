import { Injectable, Logger } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';

// ✅ 브랜드 엔티티 전부 import
import { Product } from 'src/product/product.entity';
import { HostingAccount } from 'src/hosting/hostingaccount.entity';

type SitemapZipResult = {
  fileName: string;
  buffer: Buffer;
};

@Injectable()
export class SitemapService {
  private readonly logger = new Logger(SitemapService.name);
  

  constructor(
    private readonly dataSource: DataSource,
) {}

  private sites = [
    // 🔹 외부 플랫폼
    'Farfetch',
    'Cettire',


    // 🔹 브랜드
    'Ysl',
    'Prada',
    // 'Lv',
    // 'Dior',
    'Burberry',
    'Celine',
    'Balenciaga',
    'Miumiu',
    // 'Fendi',
    'Bottega',
    // 'Loropiana',
    'Maisonmargiela',
    'Loewe',
    'Stone',
    'Lemaire',
    'Dolce',
    'Ferragamo',
    'Therow',
    'Maxmara',
    'Moncler',
    'Alexander',
    'Valentino',
    'Givenchy',
    'Sandro',
    'Tods',
    'Herno',
    'Thombrowne',
    'Tomford',
    // 'Brunello',
    'Acne',
    // 'Hermes',
    'Ami',
    // 'Jacquemus',
    'Jilsander',
    'Polene',
    'Ourlegacy',
    'Rickowens',
    'Apc',
    'Chloe',
    'Isabelmarant',
    'Maisonkitsune',
    'Maje',
    'Gucci',
    'Longchamp',
  ];

  /**
   * ✅ 사이트명과 partnerKey별 sitemap 생성
   */
  async generateSitemap(siteName: string, apiKey: string): Promise<SitemapZipResult> {
    const account = await this.dataSource
      .getRepository(HostingAccount)
      .findOne({
        where: { apiKey },
      });

    if (!account) {
      throw new Error(`❌ apiKey에 해당하는 계정 없음: ${apiKey}`);
    }
  const baseUrl = this.resolveBaseUrl(siteName);
  const safeSiteName = this.sanitizeFilenamePart(siteName || 'cieldeeurope', 'cieldeeurope', 32);
  const safeApiKey = this.sanitizeFilenamePart(apiKey, 'products', 48);

  const repo = this.dataSource.getRepository(Product);

  const sitemapUrls: string[] = [];
  const zipFiles: Array<{ name: string; content: string }> = [];
  const chunkSize = 39000;

  for (const site of this.sites) {
    try {
      const products = await repo.find({
        select: ['goodsno'],
        where: {
          customId: account.customId,
          accountPlatform: account.accountPlatform,
          site,
        },
      });

      if (!products.length) {
        this.logger.warn(`⚠️ ${site}: ${apiKey} 상품 없음`);
        continue;
      }

      const urls = products.map(p => `${baseUrl}${p.goodsno}`);

      const totalParts = Math.ceil(urls.length / chunkSize);
      const partUrls: string[] = [];

      for (let i = 0; i < urls.length; i += chunkSize) {
        const chunk = urls.slice(i, i + chunkSize);
        const xml = this.buildSitemapXml(chunk);

        const part = Math.floor(i / chunkSize) + 1;

        const fileName =
          totalParts > 1
            ? `sitemap-${site.toLowerCase()}-${safeApiKey}-part${part}.xml`
            : `sitemap-${site.toLowerCase()}-${safeApiKey}.xml`;

        zipFiles.push({
          name: fileName,
          content: xml,
        });

        partUrls.push(
          `${baseUrl.replace('/goods/goods_view.php?goodsNo=', '')}/${fileName}`,
        );
      }

      sitemapUrls.push(...partUrls);

      this.logger.log(
        `✅ ${site} sitemap 생성 (${products.length}개 / ${totalParts}개 파일)`
      );

    } catch (err: any) {
      this.logger.error(`🚨 ${site} 실패: ${err.message}`);
    }
  }

  const indexXml = this.buildSitemapIndexXml(sitemapUrls);
  const indexFileName = `sitemap-index-${safeApiKey}.xml`;

  zipFiles.push({
    name: indexFileName,
    content: indexXml,
  });

  this.logger.log(`🎯 sitemap-index-${apiKey}.xml 생성 완료`);

  return {
    fileName: `sitemaps-${safeSiteName}-${safeApiKey}.zip`,
    buffer: this.buildZip(zipFiles),
  };
}

  private sanitizeFilenamePart(value: string, fallback: string, maxLength = 80): string {
    const sanitized = String(value || fallback)
      .trim()
      .replace(/^https?:\/\//i, '')
      .replace(/[\\/:*?"<>|%#&=+\s]+/g, '-')
      .replace(/[^a-zA-Z0-9._-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');

    return (sanitized || fallback).slice(0, maxLength);
  }

  // ✅ 사이트명으로 baseUrl 결정
  private resolveBaseUrl(siteName: string): string {
    const normalizedSiteName = String(siteName || 'cieldeeurope')
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/\/.*$/, '')
      .replace(/\.com$/, '');

    return `https://${normalizedSiteName || 'cieldeeurope'}.com/goods/goods_view.php?goodsNo=`;
  }

  // ✅ 개별 sitemap 템플릿
  private buildSitemapXml(urls: string[]): string {
    const items = urls
      .map(
        url => `
  <url>
    <loc>${url}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`,
      )
      .join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${items}
</urlset>`;
  }

  // ✅ index 템플릿
  private buildSitemapIndexXml(sitemaps: string[]): string {
    const items = sitemaps
      .map(
        url => `
  <sitemap>
    <loc>${url}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
  </sitemap>`,
      )
      .join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${items}
</sitemapindex>`;
  }

  private buildZip(files: Array<{ name: string; content: string }>): Buffer {
    const localFileParts: Buffer[] = [];
    const centralDirectoryParts: Buffer[] = [];
    let offset = 0;

    for (const file of files) {
      const nameBuffer = Buffer.from(file.name, 'utf8');
      const contentBuffer = Buffer.from(file.content, 'utf8');
      const crc = this.crc32(contentBuffer);
      const { time, date } = this.getDosDateTime();

      const localHeader = Buffer.alloc(30);
      localHeader.writeUInt32LE(0x04034b50, 0);
      localHeader.writeUInt16LE(20, 4);
      localHeader.writeUInt16LE(0x0800, 6);
      localHeader.writeUInt16LE(0, 8);
      localHeader.writeUInt16LE(time, 10);
      localHeader.writeUInt16LE(date, 12);
      localHeader.writeUInt32LE(crc, 14);
      localHeader.writeUInt32LE(contentBuffer.length, 18);
      localHeader.writeUInt32LE(contentBuffer.length, 22);
      localHeader.writeUInt16LE(nameBuffer.length, 26);
      localHeader.writeUInt16LE(0, 28);

      localFileParts.push(localHeader, nameBuffer, contentBuffer);

      const centralHeader = Buffer.alloc(46);
      centralHeader.writeUInt32LE(0x02014b50, 0);
      centralHeader.writeUInt16LE(20, 4);
      centralHeader.writeUInt16LE(20, 6);
      centralHeader.writeUInt16LE(0x0800, 8);
      centralHeader.writeUInt16LE(0, 10);
      centralHeader.writeUInt16LE(time, 12);
      centralHeader.writeUInt16LE(date, 14);
      centralHeader.writeUInt32LE(crc, 16);
      centralHeader.writeUInt32LE(contentBuffer.length, 20);
      centralHeader.writeUInt32LE(contentBuffer.length, 24);
      centralHeader.writeUInt16LE(nameBuffer.length, 28);
      centralHeader.writeUInt16LE(0, 30);
      centralHeader.writeUInt16LE(0, 32);
      centralHeader.writeUInt16LE(0, 34);
      centralHeader.writeUInt16LE(0, 36);
      centralHeader.writeUInt32LE(0, 38);
      centralHeader.writeUInt32LE(offset, 42);

      centralDirectoryParts.push(centralHeader, nameBuffer);
      offset += localHeader.length + nameBuffer.length + contentBuffer.length;
    }

    const centralDirectory = this.concatBuffers(centralDirectoryParts);
    const endRecord = Buffer.alloc(22);
    endRecord.writeUInt32LE(0x06054b50, 0);
    endRecord.writeUInt16LE(0, 4);
    endRecord.writeUInt16LE(0, 6);
    endRecord.writeUInt16LE(files.length, 8);
    endRecord.writeUInt16LE(files.length, 10);
    endRecord.writeUInt32LE(centralDirectory.length, 12);
    endRecord.writeUInt32LE(offset, 16);
    endRecord.writeUInt16LE(0, 20);

    return this.concatBuffers([...localFileParts, centralDirectory, endRecord]);
  }

  private getDosDateTime() {
    const now = new Date();
    const year = Math.max(now.getFullYear(), 1980);
    const date =
      ((year - 1980) << 9) |
      ((now.getMonth() + 1) << 5) |
      now.getDate();
    const time =
      (now.getHours() << 11) |
      (now.getMinutes() << 5) |
      Math.floor(now.getSeconds() / 2);

    return { date, time };
  }

  private concatBuffers(chunks: Buffer[]): Buffer {
    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;

    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }

    return Buffer.from(result);
  }

  private crc32(buffer: Buffer): number {
    let crc = 0xffffffff;

    for (const byte of buffer) {
      crc ^= byte;

      for (let bit = 0; bit < 8; bit += 1) {
        crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
      }
    }

    return (crc ^ 0xffffffff) >>> 0;
  }
}
