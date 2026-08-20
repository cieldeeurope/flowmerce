import { Controller, Post, Body, Req, Get, Param, Res } from '@nestjs/common';
import { Response } from 'express';
import { UpdateService } from './update.service';
import { SitemapService } from './sitemap.service';



@Controller('update')
export class UpdateController {
  constructor(
    private readonly updateService: UpdateService,
    private readonly sitemapService: SitemapService,
  ) {}

  @Post('generate-sitemap')
  async generateSitemap(
    @Body() body: { siteName: string; apiKey: string },
    @Res() res: Response,
  ) {
    const { siteName, apiKey } = body;
    const result = await this.sitemapService.generateSitemap(
      siteName || 'cieldeeurope',
      apiKey,
    );
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition, Content-Type, Content-Length');
    res.setHeader('Content-Length', result.buffer.length);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(result.fileName)}"; filename*=UTF-8''${encodeURIComponent(result.fileName)}`,
    );
    return res.send(result.buffer);
  }

  // 실패 로그 저장용
  // @Post('log-failure')
  // async logFailure(@Req() req, @Body() body: any) {

  //   const ua = req.headers['user-agent'] || 'unknown';
  //   const referer = req.headers['referer'] || req.headers['referrer'] || 'none';


  //   // 🔥 봇이면 무시하고 로그도 출력하지 않음
  //   if (this.isBot(ua)) {
  //     return { success: true, botIgnored: true };
  //   }

  //   console.log(
  //     `⚠️ [FAIL LOG] ${body.reason} | goodsNo=${body.goodsNo || 'N/A'} | goodsCd=${body.goodsCd || 'N/A'}`
  //   );
  //   console.log(`URL: ${body.url}`);
  //   console.log(`UA: ${ua}`);
  //   console.log(`REF: ${referer}`);


  //   return { success: true };
  // }



  // ✅ 봇 필터 함수
  private isBot(ua: string): boolean {
    return /(googlebot|yeti|bingbot|slurp|baiduspider|facebookexternalhit|Twitterbot|Mediapartners-Google|MJ12bot|AhrefsBot|SemrushBot|spider|crawler|bot)/i.test(ua);
  }

  // ✅ 공통 로직 (씨엘드유럽)
  @Post('cieldeeurope-visit')
  async cieldeeuropeVisit(
    @Req() req,
    @Body() body: { goodsNo: string; goodsCd?: string; customId: string; accountPlatform: string }
  ) {
    const ua = req.headers['user-agent'] || 'unknown';
    const { goodsNo, goodsCd = 'unknown', customId, accountPlatform } = body;

    // 봇이면 바로 무시 (로그조차 없음)
    if (this.isBot(ua)) return;

    if (this.updateService.isVisitUpdateDisabledByGoodsCd(goodsCd)) {
      return { success: true, skipped: true, received: { goodsNo, goodsCd } };
    }

    // 정상 요청만 처리
    console.log(`씨엘드유럽 방문 → goodsNo=${goodsNo}, goodsCd=${goodsCd}`);

    await this.updateService.getProductUpdate(
      goodsNo,
      goodsCd,
      customId,
      accountPlatform
    );
    return { success: true, received: { goodsNo, goodsCd } };
  }

  // ✅ 공통 로직 (이레닛)
  @Post('irenit-visit')
  async irenitVisit(
    @Req() req,
    @Body() body: { goodsNo: string; goodsCd?: string; customId: string; accountPlatform: string }
  ) {
    const ua = req.headers['user-agent'] || 'unknown';
    const { goodsNo, goodsCd = 'unknown', customId, accountPlatform } = body;

    if (this.isBot(ua)) return;

    if (this.updateService.isVisitUpdateDisabledByGoodsCd(goodsCd)) {
      return { success: true, skipped: true, received: { goodsNo, goodsCd } };
    }

    console.log(`이레닛 방문 → goodsNo=${goodsNo}, goodsCd=${goodsCd}`);

    await this.updateService.getProductUpdate(
      goodsNo,
      goodsCd,
      customId,
      accountPlatform
    );
    return { success: true, received: { goodsNo, goodsCd } };
  }

  // ✅ 공통 로직 (씨엘드앙팡)
  @Post('cieldeenfant-visit')
  async cieldeenfantVisit(
    @Req() req,
    @Body() body: { goodsNo: string; goodsCd?: string; customId: string; accountPlatform: string }
  ) {
    const ua = req.headers['user-agent'] || 'unknown';
    const { goodsNo, goodsCd = 'unknown', customId, accountPlatform } = body;

    // 봇이면 바로 무시 (로그조차 없음)
    if (this.isBot(ua)) return;

    if (this.updateService.isVisitUpdateDisabledByGoodsCd(goodsCd)) {
      return { success: true, skipped: true, received: { goodsNo, goodsCd } };
    }

    // 정상 요청만 처리
    console.log(`씨엘드앙팡 방문 → goodsNo=${goodsNo}, goodsCd=${goodsCd}`);

    await this.updateService.getProductUpdate(
      goodsNo,
      goodsCd,
      customId,
      accountPlatform
    );
    return { success: true, received: { goodsNo, goodsCd } };
  }

  // ✅ 최근 수정 시간 조회 (6시간 내 스킵용)
  @Post('check-lastmodified')
  async checkLastModified(
    @Req() req,
    @Body() body: { 
    goodsNo: string; 
    goodsCd: string;
    customId: string;
    accountPlatform: string;
}) {
    const ua = req.headers['user-agent'] || 'unknown';
    

    // 🔥봇이면 바로 종료
    if (this.isBot(ua)) {
      return { lastModifiedDate: null };
    }

    const { goodsNo, goodsCd, customId, accountPlatform } = body;

    if (this.updateService.isVisitUpdateDisabledByGoodsCd(goodsCd)) {
      return { lastModifiedDate: null, skipped: true };
    }

    const lastModifiedDate = await this.updateService.getLastModifiedDate(goodsNo, goodsCd, customId, accountPlatform);

    return {
    lastModifiedDate: lastModifiedDate
      ? new Date(lastModifiedDate).toISOString() // 🔥 핵심
      : null,
  };
  }
}
