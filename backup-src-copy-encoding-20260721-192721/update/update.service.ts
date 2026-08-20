import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';


// ✅ 모든 브랜드 엔티티 임포트
import { Product } from 'src/product/product.entity';

// ✅ 각 브랜드별 서비스 임포트
import { CrawlerService } from 'src/crawler/crawler.service';
import { FarfetchService } from 'src/farfetch/farfetch.service';
import { PradaService } from 'src/prada/prada.service';
import { LvService } from 'src/lv/lv.service';
import { DiorService } from 'src/dior/dior.service';
import { BurberryService } from 'src/burberry/burberry.service';
import { CelineService } from 'src/celine/celine.service';
import { MiumiuService } from 'src/miumiu/miumiu.service';
import { BalenciagaService } from 'src/balenciaga/balenciaga.service';
import { BottegaService } from 'src/bottega/bottega.service';
import { FendiService } from 'src/fendi/fendi.service';
import { LoropianaService } from 'src/loropiana/loropiana.service';
import { MaisonmargielaService } from 'src/maisonmargiela/maisonmargiela.service';
import { LoeweService } from 'src/loewe/loewe.service';
import { StoneService } from 'src/stone/stone.service';
import { LemaireService } from 'src/lemaire/lemaire.service';
import { FerragamoService } from 'src/ferragamo/ferragamo.service';
import { DolceService } from 'src/dolce/dolce.service';
import { TherowService } from 'src/therow/therow.service';
import { MonclerService } from 'src/moncler/moncler.service';
import { CettireService } from 'src/cettire/cettire.service';
import { MaxmaraService } from 'src/maxmara/maxmara.service';
import { AlexanderService } from 'src/alexander/alexander.service';
import { GivenchyService } from 'src/givenchy/givenchy.service';
import { SandroService } from 'src/sandro/sandro.service';
import { TodsService } from 'src/tods/tods.service';
import { ValentinoService } from 'src/valentino/valentino.service';
import { AcneService } from 'src/acne/acne.service';
import { BrunelloService } from 'src/brunello/brunello.service';
import { HernoService } from 'src/herno/herno.service';
import { ThombrowneService } from 'src/thombrowne/thombrowne.service';
import { TomfordService } from 'src/tomford/tomford.service';
import { HermesService } from 'src/hermes/hermes.service';
import { AmiService } from 'src/ami/ami.service';
import { JacquemusService } from 'src/jacquemus/jacquemus.service';
import { JilsanderService } from 'src/jilsander/jilsander.service';
import { OurlegacyService } from 'src/ourlegacy/ourlegacy.service';
import { PoleneService } from 'src/polene/polene.service';
import { RickowensService } from 'src/rickowens/rickowens.service';
import { ApcService } from 'src/apc/apc.service';
import { ChloeService } from 'src/chloe/chloe.service';
import { GucciService } from 'src/gucci/gucci.service';
import { IsabelmarantService } from 'src/isabelmarant/isabelmarant.service';
import { LongchampService } from 'src/longchamp/longchamp.service';
import { MaisonkitsuneService } from 'src/maisonkitsune/maisonkitsune.service';
import { MajeService } from 'src/maje/maje.service';
import { AlaiaService } from 'src/alaia/alaia.service';
import { CpcompanyService } from 'src/cpcompany/cpcompany.service';
import { DelvauxService } from 'src/delvaux/delvaux.service';
import { RogervivierService } from 'src/rogervivier/rogervivier.service';
import { TotemeService } from 'src/toteme/toteme.service';
import { JimmychooService } from 'src/jimmychoo/jimmychoo.service';
import { VersaceService } from 'src/versace/versace.service';
import { BerlutiService } from 'src/berluti/berluti.service';
import { OffwhiteService } from 'src/offwhite/offwhite.service';
import { EtroService } from 'src/etro/etro.service';

@Injectable()
export class UpdateService {
  private readonly logger = new Logger(UpdateService.name);
  private readonly activeVisitUpdateKeys = new Set<string>();
  private readonly disabledVisitUpdateSites = new Set([
    'farfetch',
    'lv',
    'dior',
    'fendi',
    'loropiana',
    'brunello',
    'hermes',
    'jacquemus',
  ]);

  private normalizeLookupValue(value?: string | null): string | null {
    const normalized = String(value ?? '').trim();
    return normalized ? normalized : null;
  }

  private normalizeSiteName(value?: string | null): string {
    return String(value ?? '').trim().toLowerCase();
  }

  private isVisitUpdateDisabled(product?: Product | null): boolean {
    return this.disabledVisitUpdateSites.has(
      this.normalizeSiteName(product?.site),
    );
  }

  isVisitUpdateDisabledByGoodsCd(goodsCd?: string | null): boolean {
    const normalizedGoodsCd = this.normalizeGoodsCd(goodsCd);
    if (!normalizedGoodsCd) {
      return false;
    }

    const goodsCdTokens = normalizedGoodsCd
      .split(/[^a-z0-9]+/)
      .filter(Boolean);

    return goodsCdTokens.some((token) =>
      this.disabledVisitUpdateSites.has(token),
    );
  }

  private getVisitUpdateService(product?: Product | null): any {
    if (!product?.site) {
      return null;
    }

    return this.serviceMap[product.site] || null;
  }

  private shouldDisableVisitUpdate(product?: Product | null): boolean {
    return this.isVisitUpdateDisabled(product) || !this.getVisitUpdateService(product);
  }

  private getVisitUpdateLockKey(
    product: Product,
    goodsNo: string,
    goodsCd?: string,
  ): string {
    return [
      product.customId || 'unknown',
      product.accountPlatform || 'unknown',
      product.goodsno || goodsNo,
      this.normalizeGoodsCd(goodsCd) || product.id,
    ].join(':');
  }

  private normalizeGoodsCd(value?: string | null): string | null {
    const normalized = this.normalizeLookupValue(value);
    return normalized ? normalized.toLowerCase() : null;
  }

  private extractSiteTokenFromGoodsCd(goodsCd?: string | null): string | null {
    const normalizedGoodsCd = this.normalizeGoodsCd(goodsCd);
    if (!normalizedGoodsCd) {
      return null;
    }

    const match = normalizedGoodsCd.match(/^official[_-]([a-z0-9]+)(?:[_-]|$)/);
    return match?.[1] || null;
  }

  private matchesGoodsCd(product: Product, goodsCd?: string | null): boolean {
    const normalizedGoodsCd = this.normalizeGoodsCd(goodsCd);
    if (!normalizedGoodsCd) {
      return false;
    }

    const candidates = [
      product.styleId,
      product.brandstyleId,
      product.platformProductCode,
    ]
      .map((value) => this.normalizeLookupValue(value))
      .filter((value): value is string => Boolean(value))
      .map((value) => value.toLowerCase());

    return candidates.some((candidate) => {
      return (
        candidate === normalizedGoodsCd ||
        normalizedGoodsCd.endsWith(`_${candidate}`) ||
        normalizedGoodsCd.endsWith(`-${candidate}`)
      );
    });
  }

  private async findProductForVisit(
    goodsNo: string,
    goodsCd?: string,
    customId?: string,
    accountPlatform?: string,
  ): Promise<Product | null> {
    const normalizedCustomId = this.normalizeLookupValue(customId);
    const normalizedAccountPlatform = this.normalizeLookupValue(accountPlatform);

    if (normalizedCustomId && normalizedAccountPlatform) {
      const candidates = await this.productRepo.find({
        where: {
          goodsno: +goodsNo,
          customId: normalizedCustomId,
          accountPlatform: normalizedAccountPlatform,
        },
      });

      if (candidates.length === 0) {
        return null;
      }

      const siteToken = this.extractSiteTokenFromGoodsCd(goodsCd);

      if (siteToken) {
        const siteMatches = candidates.filter(
          (product) => this.normalizeSiteName(product.site) === siteToken,
        );

        if (siteMatches.length === 1) {
          return siteMatches[0];
        }

        if (siteMatches.length > 1) {
          const goodsCdMatches = siteMatches.filter((product) =>
            this.matchesGoodsCd(product, goodsCd),
          );

          if (goodsCdMatches.length === 1) {
            return goodsCdMatches[0];
          }

          this.logger.warn(
            `visit product resolve failed: goodsNo=${goodsNo}, goodsCd=${goodsCd ?? 'N/A'}, siteToken=${siteToken}, customId=${normalizedCustomId}, accountPlatform=${normalizedAccountPlatform}, candidates=${candidates.length}, siteMatches=${siteMatches.length}, goodsCdMatches=${goodsCdMatches.length}`,
          );
          return null;
        }

        this.logger.warn(
          `visit product resolve failed because goodsCd site did not match: goodsNo=${goodsNo}, goodsCd=${goodsCd ?? 'N/A'}, siteToken=${siteToken}, customId=${normalizedCustomId}, accountPlatform=${normalizedAccountPlatform}, candidates=${candidates.length}`,
        );
        return null;
      }

      const goodsCdMatches = candidates.filter((product) =>
        this.matchesGoodsCd(product, goodsCd),
      );

      if (goodsCdMatches.length === 1) {
        return goodsCdMatches[0];
      }

      if (goodsCdMatches.length > 1) {
        this.logger.warn(
          `visit product resolve failed: goodsNo=${goodsNo}, goodsCd=${goodsCd ?? 'N/A'}, customId=${normalizedCustomId}, accountPlatform=${normalizedAccountPlatform}, candidates=${candidates.length}, goodsCdMatches=${goodsCdMatches.length}`,
        );
        return null;
      }

      if (goodsCd) {
        this.logger.warn(
          `visit product resolve failed because goodsCd did not match: goodsNo=${goodsNo}, goodsCd=${goodsCd}, customId=${normalizedCustomId}, accountPlatform=${normalizedAccountPlatform}, candidates=${candidates.length}`,
        );
        return null;
      }

      if (candidates.length === 1) {
        return candidates[0];
      }

      this.logger.warn(
        `visit product resolve failed: goodsNo=${goodsNo}, goodsCd=${goodsCd ?? 'N/A'}, customId=${normalizedCustomId}, accountPlatform=${normalizedAccountPlatform}, candidates=${candidates.length}, goodsCdMatches=0`,
      );
      return null;
    }

    const candidates = await this.productRepo.find({
      where: {
        goodsno: +goodsNo,
      },
    });

    if (candidates.length === 0) {
      return null;
    }

    if (candidates.length === 1) {
      return candidates[0];
    }

    const goodsCdMatches = candidates.filter((product) =>
      this.matchesGoodsCd(product, goodsCd),
    );

    if (goodsCdMatches.length === 1) {
      return goodsCdMatches[0];
    }

    this.logger.warn(
      `visit product resolve failed: goodsNo=${goodsNo}, goodsCd=${goodsCd ?? 'N/A'}, customId=${normalizedCustomId ?? 'N/A'}, accountPlatform=${normalizedAccountPlatform ?? 'N/A'}, candidates=${candidates.length}, goodsCdMatches=${goodsCdMatches.length}`,
    );
    return null;
  }

  private shouldSkipRecentUpdate(product: Product): boolean {
    if (!product.lastModifiedDate) {
      return false;
    }

    const diffHours =
      (Date.now() - new Date(product.lastModifiedDate).getTime()) /
      (1000 * 60 * 60);

    return diffHours < 6;
  }

  async getProductUpdate(
    goodsNo: string,
    goodsCd?: string,
    customId?: string,
    accountPlatform?: string,
  ) {
    if (this.isVisitUpdateDisabledByGoodsCd(goodsCd)) {
      this.logger.debug(
        `skip visit update because goodsCd is disabled: goodsNo=${goodsNo}, goodsCd=${goodsCd ?? 'N/A'}`,
      );
      return;
    }

    const product = await this.findProductForVisit(
      goodsNo,
      goodsCd,
      customId,
      accountPlatform,
    );

    if (!product || !product.visitUrl) {
      return;
    }

    if (!product.customId || !product.accountPlatform) {
      this.logger.warn(
        `skip visit update because account info is missing: goodsNo=${goodsNo}, productId=${product.id}`,
      );
      return;
    }

    if (this.shouldDisableVisitUpdate(product)) {
      this.logger.debug(
        `skip visit update because site is disabled or not mapped: site=${product.site}, goodsNo=${goodsNo}, goodsCd=${goodsCd ?? 'N/A'}, productId=${product.id}`,
      );
      return;
    }

    if (this.shouldSkipRecentUpdate(product)) {
      return;
    }

    const service = this.getVisitUpdateService(product);
    if (!service) {
      this.logger.debug(
        `skip visit update because service is not mapped: site=${product.site}, goodsNo=${goodsNo}, goodsCd=${goodsCd ?? 'N/A'}, productId=${product.id}`,
      );
      return;
    }

    const lockKey = this.getVisitUpdateLockKey(product, goodsNo, goodsCd);
    if (this.activeVisitUpdateKeys.has(lockKey)) {
      this.logger.debug(
        `skip visit update because same product is already updating: site=${product.site}, goodsNo=${goodsNo}, goodsCd=${goodsCd ?? 'N/A'}, productId=${product.id}`,
      );
      return;
    }

    this.activeVisitUpdateKeys.add(lockKey);
    try {
      await service.getProductUpdate(
        product.visitUrl,
        goodsNo,
        product.customId,
        product.accountPlatform,
      );
    } catch (err: any) {
      this.logger.warn(
        `visit update failed: site=${product.site}, goodsNo=${goodsNo}, goodsCd=${goodsCd ?? 'N/A'}, productId=${product.id}, message=${err?.message || err}`,
      );
    } finally {
      this.activeVisitUpdateKeys.delete(lockKey);
    }
  }

  constructor(
    @InjectRepository(Product) private readonly productRepo: Repository<Product>,


    // ✅ 각 브랜드 서비스
    private readonly farfetchService: FarfetchService,
    private readonly cettireService: CettireService,
    private readonly crawlerService: CrawlerService,
    private readonly pradaService: PradaService,
    private readonly lvService: LvService,
    private readonly diorService: DiorService,
    private readonly burberryService: BurberryService,
    private readonly celineService: CelineService,
    private readonly miumiuService: MiumiuService,
    private readonly balenciagaService: BalenciagaService,
    private readonly bottegaService: BottegaService,
    private readonly fendiService: FendiService,
    private readonly loropianaService: LoropianaService,
    private readonly maisonmargielaService: MaisonmargielaService,
    private readonly loeweService: LoeweService,
    private readonly stoneService: StoneService,
    private readonly lemaireService: LemaireService,
    private readonly ferragamoService: FerragamoService,
    private readonly dolceService: DolceService,
    private readonly therowService: TherowService,
    private readonly monclerService: MonclerService,
    private readonly maxmaraService: MaxmaraService,
    private readonly alexanderService: AlexanderService,
    private readonly givenchyService: GivenchyService,
    private readonly sandroService: SandroService,
    private readonly todsService: TodsService,
    private readonly valentinoService: ValentinoService,
    private readonly acneService: AcneService,
    private readonly brunelloService: BrunelloService,
    private readonly hernoService: HernoService,
    private readonly thombrowneService: ThombrowneService,
    private readonly tomfordService: TomfordService,
    private readonly hermesService: HermesService,
    private readonly amiService: AmiService,
    private readonly jacquemusService: JacquemusService,
    private readonly jilsanderService: JilsanderService,
    private readonly ourlegacyService: OurlegacyService,
    private readonly poleneService: PoleneService,
    private readonly rickowensService: RickowensService,
    private readonly apcService: ApcService,
    private readonly chloeService: ChloeService,
    private readonly gucciService: GucciService,
    private readonly isabelmarantService: IsabelmarantService,
    private readonly longchampService: LongchampService,
    private readonly maisonkitsuneService: MaisonkitsuneService,
    private readonly majeService: MajeService,
    private readonly alaiaService: AlaiaService,
    private readonly cpcompanyService: CpcompanyService,
    private readonly delvauxService: DelvauxService,
    private readonly rogervivierService: RogervivierService,
    private readonly totemeService: TotemeService,
    private readonly jimmychooService: JimmychooService,
    private readonly versaceService: VersaceService,
    private readonly berlutiService: BerlutiService,
    private readonly offwhiteService: OffwhiteService,
    private readonly etroService: EtroService,
  ) {}

  // ✅ 씨엘드유럽 방문 처리
  async cieldeeuropehandleVisit(goodsNo: string, goodsCd?: string, customId?: string, accountPlatform?: string) {
  try {
    await this.getProductUpdate(goodsNo, goodsCd, customId, accountPlatform);
    return;
    const product = await this.productRepo.findOne({
      where: {
        goodsno: +goodsNo,
        customId,
        accountPlatform,
      },
    });

    if (!product || !product.visitUrl) return;

    // ⏱ 6시간 체크
    if (product.lastModifiedDate) {
      const diffHours =
        (Date.now() - new Date(product.lastModifiedDate).getTime()) /
        (1000 * 60 * 60);

      if (diffHours < 6) return;
    }

    const service = this.serviceMap[product.site];
    if (!service) return;

    await service.getProductUpdate(product.visitUrl, goodsNo, customId, accountPlatform);

  } catch (err: any) {
    this.logger.error(`🚨 방문 처리 오류: ${err.message}`, err.stack);
  }
}

  // ✅ 이레닛 방문 처리
  async irenithandleVisit(goodsNo: string, goodsCd?: string, customId?: string, accountPlatform?: string) {
    try {
      await this.getProductUpdate(goodsNo, goodsCd, customId, accountPlatform);
      return;
      const product = await this.productRepo.findOne({
        where: {
          goodsno: +goodsNo,
          customId,
          accountPlatform,
        },
      });

      if (!product || !product.visitUrl) return;

      // ⏱ 6시간 체크
      if (product.lastModifiedDate) {
        const diffHours =
          (Date.now() - new Date(product.lastModifiedDate).getTime()) /
          (1000 * 60 * 60);

        if (diffHours < 6) return;
      }

      const service = this.serviceMap[product.site];
      if (!service) return;

      await service.getProductUpdate(product.visitUrl, goodsNo, customId, accountPlatform);

    } catch (err: any) {
      this.logger.error(`🚨 방문 처리 오류: ${err.message}`, err.stack);
    }
  }

  // ✅ 씨엘드앙팡 방문 처리
  async cieldeenfanthandleVisit(goodsNo: string, goodsCd?: string, customId?: string, accountPlatform?: string) {
    try {
      await this.getProductUpdate(goodsNo, goodsCd, customId, accountPlatform);
      return;
      const product = await this.productRepo.findOne({
        where: {
          goodsno: +goodsNo,
          customId,
          accountPlatform,
        },
      });

      if (!product || !product.visitUrl) return;

      // ⏱ 6시간 체크
      if (product.lastModifiedDate) {
        const diffHours =
          (Date.now() - new Date(product.lastModifiedDate).getTime()) /
          (1000 * 60 * 60);

        if (diffHours < 6) return;
      }

      const service = this.serviceMap[product.site];
      if (!service) return;

      await service.getProductUpdate(product.visitUrl, goodsNo, customId, accountPlatform);

    } catch (err: any) {
      this.logger.error(`🚨 방문 처리 오류: ${err.message}`, err.stack);
    }
  }

  private serviceMap: Record<string, any> = {
    // 🔹 외부 플랫폼
    // Farfetch: this.farfetchService,
    Cettire: this.cettireService,

    // 🔹 crawler (YSL)
    YSL: this.crawlerService,

    // 🔹 브랜드
    Prada: this.pradaService,
    // Lv: this.lvService,
    // Dior: this.diorService,
    Burberry: this.burberryService,
    Celine: this.celineService,
    Balenciaga: this.balenciagaService,
    Miumiu: this.miumiuService,
    // Fendi: this.fendiService,
    Bottega: this.bottegaService,
    // Loropiana: this.loropianaService,
    Maisonmargiela: this.maisonmargielaService,
    Loewe: this.loeweService,
    Stone: this.stoneService,
    Lemaire: this.lemaireService,
    Dolce: this.dolceService,
    Ferragamo: this.ferragamoService,
    Therow: this.therowService,
    Maxmara: this.maxmaraService,
    Moncler: this.monclerService,
    Alexander: this.alexanderService,
    Valentino: this.valentinoService,
    Givenchy: this.givenchyService,
    Sandro: this.sandroService,
    Tods: this.todsService,
    Herno: this.hernoService,
    Thombrowne: this.thombrowneService,
    Tomford: this.tomfordService,
    // Brunello: this.brunelloService,
    Acne: this.acneService,
    // Hermes: this.hermesService,
    Ami: this.amiService,
    // Jacquemus: this.jacquemusService,
    Jilsander: this.jilsanderService,
    Polene: this.poleneService,
    Ourlegacy: this.ourlegacyService,
    Rickowens: this.rickowensService,
    Apc: this.apcService,
    Chloe: this.chloeService,
    Isabelmarant: this.isabelmarantService,
    Maisonkitsune: this.maisonkitsuneService,
    Maje: this.majeService,
    Gucci: this.gucciService,
    Longchamp: this.longchampService,
    Alaia: this.alaiaService,
    CPcompany: this.cpcompanyService,
    Delvaux: this.delvauxService,
    Rogervivier: this.rogervivierService,
    Toteme: this.totemeService,
    Jimmychoo: this.jimmychooService,
    Versace: this.versaceService,
    Berluti: this.berlutiService,
    Offwhite: this.offwhiteService,
    Etro: this.etroService,
  };

  // ✅ 최근 수정 시간 조회 함수 (visitUrl=null이면 자동 스킵)
  async getLastModifiedDate(
    goodsNo: string,
    goodsCd?: string,
    customId?: string,
    accountPlatform?: string
  ): Promise<Date | null> {
    let product: Product | null = null;

    try {
      if (this.isVisitUpdateDisabledByGoodsCd(goodsCd)) {
        this.logger.debug(
          `skip lastModified check because goodsCd is disabled: goodsNo=${goodsNo}, goodsCd=${goodsCd ?? 'N/A'}`,
        );
        return null;
      }

      product = await this.findProductForVisit(
        goodsNo,
        goodsCd,
        customId,
        accountPlatform,
      );

      if (!product) return null;

      if (this.shouldDisableVisitUpdate(product)) {
        this.logger.debug(
          `skip lastModified check because site is disabled or not mapped: site=${product.site}, goodsNo=${goodsNo}, goodsCd=${goodsCd ?? 'N/A'}, productId=${product.id}`,
        );
        return product.lastModifiedDate || new Date();
      }

      if (!product.visitUrl || product.visitUrl.trim() === '') {
        this.logger.debug(`🚫 visitUrl 없음 (${product.site} / ${goodsNo}) → 스킵`);
        return null;
      }

      return product.lastModifiedDate || null;

    } catch (err: any) {
      this.logger.error(
        `🚨 getLastModifiedDate 오류 (${product?.site ?? 'unknown'} - ${goodsNo}): ${err.message}`
      );
      return null;
    }
  }

}
