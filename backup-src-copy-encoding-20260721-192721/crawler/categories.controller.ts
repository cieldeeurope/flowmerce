import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { UserGuard } from 'src/user-auth/user.guard';
import { CrawlerService } from './crawler.service';  // CrawlerService 임포트
import { CategoryService } from '../category/category.service';  // CategoryService 임포트
import { GodoMallService } from 'src/godomall/godomall.service';
import { FarfetchService } from 'src/farfetch/farfetch.service';
import { CettireService } from 'src/cettire/cettire.service';
import { SmartstoreService } from 'src/smartstore/smartstore.service';
import { PradaService } from 'src/prada/prada.service';
import { LvService } from 'src/lv/lv.service';
import { DiorService } from 'src/dior/dior.service';
import { BurberryService } from 'src/burberry/burberry.service';
import { CelineService } from 'src/celine/celine.service';
import { BalenciagaService } from 'src/balenciaga/balenciaga.service';
import { MiumiuService } from 'src/miumiu/miumiu.service';
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
import { MaxmaraService } from 'src/maxmara/maxmara.service';
import { MonclerService } from 'src/moncler/moncler.service';
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

const SOURCE_CATEGORY_SITE_BY_ROUTE: Record<string, string> = {
  ysl: 'YSL',
  farfetch: 'Farfetch',
  cettire: 'Cettire',
  prada: 'Prada',
  lv: 'Lv',
  dior: 'Dior',
  burberry: 'Burberry',
  celine: 'Celine',
  balenciaga: 'Balenciaga',
  miumiu: 'Miumiu',
  bottega: 'Bottega',
  fendi: 'Fendi',
  loropiana: 'Loropiana',
  maisonmargiela: 'Maisonmargiela',
  loewe: 'Loewe',
  stone: 'Stone',
  lemaire: 'Lemaire',
  ferragamo: 'Ferragamo',
  dolce: 'Dolce',
  therow: 'Therow',
  maxmara: 'Maxmara',
  moncler: 'Moncler',
  alexander: 'Alexander',
  givenchy: 'Givenchy',
  sandro: 'Sandro',
  tods: 'Tods',
  valentino: 'Valentino',
  acne: 'Acne',
  brunello: 'Brunello',
  herno: 'Herno',
  thombrowne: 'Thombrowne',
  tomford: 'Tomford',
  hermes: 'Hermes',
  ami: 'Ami',
  jacquemus: 'Jacquemus',
  jilsander: 'Jilsander',
  ourlegacy: 'Ourlegacy',
  polene: 'Polene',
  rickowens: 'Rickowens',
  apc: 'Apc',
  chloe: 'Chloe',
  gucci: 'Gucci',
  isabelmarant: 'Isabelmarant',
  longchamp: 'Longchamp',
  maisonkitsune: 'Maisonkitsune',
  maje: 'Maje',
  cpcompany: 'CPcompany',
  rogervivier: 'Rogervivier',
  alaia: 'Alaia',
  toteme: 'Toteme',
  delvaux: 'Delvaux',
  jimmychoo: 'Jimmychoo',
  versace: 'Versace',
  berluti: 'Berluti',
  offwhite: 'Offwhite',
  etro: 'Etro',
};

@Controller('categories')
export class CategoriesController {
  constructor(
    private readonly crawlerService: CrawlerService,
    private readonly pradaService: PradaService,
    private readonly categoryService: CategoryService,
    private readonly godoMallService: GodoMallService,
    private readonly farfetchService: FarfetchService,
    private readonly cettireService: CettireService,
    private readonly smartstoreService: SmartstoreService,
    private readonly lvService: LvService,
    private readonly diorService: DiorService,
    private readonly burberryService: BurberryService,
    private readonly celineService: CelineService,
    private readonly balenciagaService: BalenciagaService,
    private readonly miumiuService: MiumiuService,
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
    private readonly maxmaraService: MaxmaraService,
    private readonly monclerService: MonclerService,
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
  ){}

  private async getBySite(site: string) {
    const categories = await this.categoryService.findAllCategories(site);

    if (!categories.length) {
      return { message: `${site} 카테고리가 아직 로드되지 않았습니다.` };
    }

    return categories;
  }

  @Get('/ysl')
  getYsl() {
    return this.getBySite('YSL');
  }

  @Get('/prada')
  getPrada() {
    return this.getBySite('Prada');
  }

  @Get('/lv')
  getLv() {
    return this.getBySite('Lv');
  }

  @Get('/dior')
  getDior() {
    return this.getBySite('Dior');
  }

  @Get('/burberry')
  getBurberry() {
    return this.getBySite('Burberry');
  }

  @Get('/celine')
  getCeline() {
    return this.getBySite('Celine');
  }

  @Get('/balenciaga')
  getBalenciaga() {
    return this.getBySite('Balenciaga');
  }

  @Get('/miumiu')
  getMiumiu() {
    return this.getBySite('Miumiu');
  }

  @Get('/bottega')
  getBottega() {
    return this.getBySite('Bottega');
  }

  @Get('/fendi')
  getFendi() {
    return this.getBySite('Fendi');
  }

  @Get('/loropiana')
  getLoropiana() {
    return this.getBySite('Loropiana');
  }

  @Get('/maisonmargiela')
  getMaisonmargiela() {
    return this.getBySite('Maisonmargiela');
  }

  @Get('/loewe')
  getLoewe() {
    return this.getBySite('Loewe');
  }

  @Get('/stone')
  getStone() {
    return this.getBySite('Stone');
  }

  @Get('/lemaire')
  getLemaire() {
    return this.getBySite('Lemaire');
  }

  @Get('/ferragamo')
  getFerragamo() {
    return this.getBySite('Ferragamo');
  }

  @Get('/dolce')
  getDolce() {
    return this.getBySite('Dolce');
  }

  @Get('/therow')
  getTherow() {
    return this.getBySite('Therow');
  }

  @Get('/maxmara')
  getMaxmara() {
    return this.getBySite('Maxmara');
  }

  @Get('/moncler')
  getMoncler() {
    return this.getBySite('Moncler');
  }

  @Get('/alexander')
  getAlexander() {
    return this.getBySite('Alexander');
  }

  @Get('/givenchy')
  getGivenchy() {
    return this.getBySite('Givenchy');
  }

  @Get('/sandro')
  getSandro() {
    return this.getBySite('Sandro');
  }

  @Get('/tods')
  getTods() {
    return this.getBySite('Tods');
  }

  @Get('/valentino')
  getValentino() {
    return this.getBySite('Valentino');
  }

  @Get('/acne')
  getAcne() {
    return this.getBySite('Acne');
  }

  @Get('/brunello')
  getBrunello() {
    return this.getBySite('Brunello');
  }

  @Get('/herno')
  getHerno() {
    return this.getBySite('Herno');
  }

  @Get('/thombrowne')
  getThombrowne() {
    return this.getBySite('Thombrowne');
  }

  @Get('/tomford')
  getTomford() {
    return this.getBySite('Tomford');
  }

  @Get('/hermes')
  getHermes() {
    return this.getBySite('Hermes');
  }

  @Get('/ami')
  getAmi() {
    return this.getBySite('Ami');
  }

  @Get('/jacquemus')
  getJacquemus() {
    return this.getBySite('Jacquemus');
  }

  @Get('/jilsander')
  getJilsander() {
    return this.getBySite('Jilsander');
  }

  @Get('/ourlegacy')
  getOurlegacy() {
    return this.getBySite('Ourlegacy');
  }

  @Get('/polene')
  getPolene() {
    return this.getBySite('Polene');
  }

  @Get('/rickowens')
  getRickowens() {
    return this.getBySite('Rickowens');
  }

  @Get('/apc')
  getApc() {
    return this.getBySite('Apc');
  }

  @Get('/chloe')
  getChloe() {
    return this.getBySite('Chloe');
  }

  @Get('/gucci')
  getGucci() {
    return this.getBySite('Gucci');
  }

  @Get('/isabelmarant')
  getIsabelmarant() {
    return this.getBySite('Isabelmarant');
  }

  @Get('/longchamp')
  getLongchamp() {
    return this.getBySite('Longchamp');
  }

  @Get('/maisonkitsune')
  getMaisonkitsune() {
    return this.getBySite('Maisonkitsune');
  }

  @Get('/maje')
  getMaje() {
    return this.getBySite('Maje');
  }

  @Get('/farfetch')
  getFarfetch() {
    return this.getBySite('Farfetch');
  }

  @Get('/cettire')
  getCettire() {
    return this.getBySite('Cettire');
  }


  @Get('/categories')
  @UseGuards(UserGuard)
  async getCategories(
    @Query('customId') customId: string,
    @Query('accountPlatform') accountPlatform: string
  ) {
    if (!customId || !accountPlatform) {
      return { message: 'customId와 accountPlatform은 필수입니다.' };
    }

    let categories;

    if (accountPlatform.startsWith('godomall')) {
      console.log('📦 고도몰 카테고리 조회 중...');
      categories = await this.categoryService.findAllGodoMallCategories(customId, accountPlatform);
    } else if (accountPlatform.startsWith('smartstore')) {
      console.log('🛒 스마트스토어 카테고리 조회 중...');
      categories = await this.categoryService.findAllSmartstoreCategories(customId, accountPlatform);
    } else if (accountPlatform.startsWith('cafe24')) {
      console.log('☕ Cafe24 카테고리 조회 중...');
      categories = await this.categoryService.findAllCafe24Categories(customId, accountPlatform);
    } else if (accountPlatform.startsWith('makeshop')) {
      console.log('🧾 메이크샵 카테고리 조회 중...');
      categories = await this.categoryService.findAllMakeshopCategories(customId, accountPlatform);
    } else {
      return { message: '유효한 accountPlatform을 입력해주세요.' };
    }

    if (!categories || categories.length === 0) {
      return { message: `카테고리가 아직 로드되지 않았습니다.` };
    }

    return categories;
  }

  @Get('/farfetchdesigner')
  async getFarfetchDesigners() {
    const categories = await this.categoryService.findAllFarfetchDesigners(); // 데이터베이스에서 고도몰 카테고리 조회
    if (categories.length === 0) {
      return { message: '파페치 디자이너가 아직 로드되지 않았습니다.' };
    }
    return categories;
  }
  

  @Get('/cettiredesigner')
  async getCettireDesigners() {
    const categories = await this.categoryService.findAllCettireDesigners(); // 데이터베이스에서 고도몰 카테고리 조회
    if (categories.length === 0) {
      return { message: '세타이어 디자이너가 아직 로드되지 않았습니다.' };
    }
    return categories;
  }


  @Get('/update-categories')
  async updateCategories(
    @Query('site') site: string,
  ) {
    if (!site) {
      return { message: 'site는 필수입니다.' };
    }


    switch (site) {

      case 'YSL': {
        const siteUrls = [
          'https://www.ysl.com/en-de',
        ];

        const data = await this.crawlerService.getCategories(siteUrls);
        await this.categoryService.saveCategories('YSL', data);
        break;
      }

      case 'Farfetch': {
        const urls = {
          categories: [
            'https://www.farfetch.com/kr/shopping/women/clothing-1/items.aspx',
            'https://www.farfetch.com/kr/shopping/women/shoes-1/items.aspx',
            'https://www.farfetch.com/kr/shopping/women/bags-purses-1/items.aspx',
            'https://www.farfetch.com/kr/shopping/women/accessories-all-1/items.aspx',
            'https://www.farfetch.com/kr/shopping/women/jewellery-1/items.aspx',
            'https://www.farfetch.com/kr/shopping/women/fine-jewellery-6/items.aspx',
            'https://www.farfetch.com/kr/shopping/men/clothing-2/items.aspx',
            'https://www.farfetch.com/kr/shopping/men/shoes-2/items.aspx',
            'https://www.farfetch.com/kr/shopping/men/bags-purses-2/items.aspx',
            'https://www.farfetch.com/kr/shopping/men/accessories-all-2/items.aspx',
            'https://www.farfetch.com/kr/shopping/men/watches-4/items.aspx',
            'https://www.farfetch.com/kr/shopping/kids/girls-clothing-4/items.aspx',
            'https://www.farfetch.com/kr/shopping/kids/boys-clothing-3/items.aspx',
            'https://www.farfetch.com/kr/shopping/kids/teen-girl-clothing-7/items.aspx',
            'https://www.farfetch.com/kr/shopping/kids/teen-boy-clothing-8/items.aspx',
          ],
          designers: [
            'https://www.farfetch.com/kr/designers/women',
            'https://www.farfetch.com/kr/designers/men',
            'https://www.farfetch.com/kr/designers/kids'
          ]
        };

        const data = await this.farfetchService.farfetchCategorys(urls);
        await this.categoryService.saveCategories('Farfetch', data.categories);
        await this.categoryService.saveFarfetchDesigners(data.designers);
        break;
      }

      case 'Cettire': {
        const urls = {
          categories: [
            'https://www.cettire.com/es/collections/womens-clothing',
            'https://www.cettire.com/es/collections/womens-shoes',
            'https://www.cettire.com/es/collections/womens-bags',
            'https://www.cettire.com/es/collections/womens-accessories',
            'https://www.cettire.com/es/collections/mens-clothing',
            'https://www.cettire.com/es/collections/mens-shoes',
            'https://www.cettire.com/es/collections/mens-bags',
            'https://www.cettire.com/es/collections/mens-accessories',
          ],
          designers: [
            'https://www.cettire.com/kr/pages/designers',
          ]
        };

        const data = await this.cettireService.cettireCategorys(urls);
        await this.categoryService.saveCategories('Cettire', data.categories);
        await this.categoryService.saveCettireDesigners(data.designers);
        break;
      }

      case 'Prada': {
        const siteUrls = ['https://www.prada.com/de/en.html'];
        const data = await this.pradaService.getCategories(siteUrls);
        await this.categoryService.saveCategories('Prada', data);
        break;
      }

      case 'Lv': {
        const siteUrls = [
          'https://en.louisvuitton.com/eng-nl/women/handbags/_/N-t1rrahxp',
          'https://en.louisvuitton.com/eng-nl/men/bags/all-bags/_/N-t1uezqf4',
          'https://en.louisvuitton.com/eng-nl/women/wallets-and-small-leather-goods/all-wallets-and-small-leather-goods/_/N-t164iz3b',
          'https://en.louisvuitton.com/eng-nl/men/wallets-and-small-leather-goods/all-wallets-and-small-leather-goods/_/N-t1iazbp7',
          'https://en.louisvuitton.com/eng-nl/women/shoes/all-shoes/_/N-t1mcbujj',
          'https://en.louisvuitton.com/eng-nl/women/ready-to-wear/all-ready-to-wear/_/N-to8aw9x',
          'https://en.louisvuitton.com/eng-nl/women/fashion-jewellery/all-fashion-jewellery/_/N-tqnlr03',
          'https://en.louisvuitton.com/eng-nl/women/accessories/all-accessories/_/N-t1i01v9x',
          'https://en.louisvuitton.com/eng-nl/men/shoes/all-shoes/_/N-t118ht95',
          'https://en.louisvuitton.com/eng-nl/men/ready-to-wear/all-ready-to-wear/_/N-tmfgzj3',
          'https://en.louisvuitton.com/eng-nl/men/fashion-jewelry/all-fashion-jewelry/_/N-t30c8o8',
          'https://en.louisvuitton.com/eng-nl/men/accessories/all-accessories/_/N-t1an9prf',
        ];

        const data = await this.lvService.getCategories(siteUrls);
        await this.categoryService.saveCategories('Lv', data);
        break;
      }

      case 'Dior': {
        const siteUrls = ['https://www.dior.com/fr_fr/fashion'];
        const data = await this.diorService.getCategories(siteUrls);
        await this.categoryService.saveCategories('Dior', data);
        break;
      }

      case 'Burberry': {
        const siteUrls = {
          categories1: [
            'https://de.burberry.com/l/damen-maentel-jacken/?language=ko',
            'https://de.burberry.com/l/damenbekleidung/?language=ko',
            'https://de.burberry.com/l/damentaschen/?language=ko',
            'https://de.burberry.com/l/damenschuhe/?language=ko',
            'https://de.burberry.com/l/damenaccessoires/?language=ko',
            'https://de.burberry.com/l/geschenke-fuer-damen/?language=ko',
          ],
          categories2: [
            'https://de.burberry.com/l/herren-maentel-jacken/?language=ko',
            'https://de.burberry.com/l/herrenbekleidung/?language=ko',
            'https://de.burberry.com/l/herrentaschen/?language=ko',
            'https://de.burberry.com/l/herrenschuhe/?language=ko',
            'https://de.burberry.com/l/accessoires-fuer-herren/?language=ko',
            'https://de.burberry.com/l/geschenke-fuer-herren/?language=ko',
          ],
          categories3: [
            'https://de.burberry.com/l/bekleidung-fuer-neugeborene/?language=ko',
            'https://de.burberry.com/l/babybekleidung/?language=ko',
            'https://de.burberry.com/l/bekleidung-fuer-maedchen/?language=ko',
            'https://de.burberry.com/l/bekleidung-fuer-jungen/?language=ko',
          ]
        };

        const data = await this.burberryService.getCategories(siteUrls);
        await this.categoryService.saveCategories('Burberry', data);
        break;
      }

      case 'Celine': {
        console.log('Celine 카테고리 업데이트 요청');

        const siteUrls = ['https://www.celine.com/en-de/home'];

        const data = await this.celineService.getCategories(siteUrls);
        await this.categoryService.saveCategories('Celine', data);
        break;
      }

      case 'Balenciaga': {
        console.log('Balenciaga 카테고리 업데이트 요청');

        const siteUrls = ['https://www.balenciaga.com/en-de/discover/wardrobe-staples'];

        const data = await this.balenciagaService.getCategories(siteUrls);
        await this.categoryService.saveCategories('Balenciaga', data);
        break;
      }

      case 'Miumiu': {
        console.log('MiuMiu 카테고리 업데이트 요청');

        const siteUrls = ['https://www.miumiu.com/de/en.html'];

        const data = await this.miumiuService.getCategories(siteUrls);
        await this.categoryService.saveCategories('Miumiu', data);
        break;
      }

      case 'Bottega': {
        console.log('Bottega 카테고리 업데이트 요청');

        const siteUrls = ['https://www.bottegaveneta.com/en-de'];

        const data = await this.bottegaService.getCategories(siteUrls);
        await this.categoryService.saveCategories('Bottega', data);
        break;
      }

      case 'Fendi': {
        console.log('Fendi 카테고리 업데이트 요청');

        const siteUrls = ['https://www.fendi.com/de-en/'];

        const data = await this.fendiService.getCategories(siteUrls);
        await this.categoryService.saveCategories('Fendi', data);
        break;
      }

      case 'Loropiana': {
        console.log('Loropiana 카테고리 업데이트 요청');

        const siteUrls = ['https://de.loropiana.com/en/'];

        const data = await this.loropianaService.getCategories(siteUrls);
        await this.categoryService.saveCategories('Loropiana', data);
        break;
      }

      case 'Maisonmargiela': {
        console.log('Maisonmargiela 카테고리 업데이트 요청');

        const siteUrls = [
          'https://www.maisonmargiela.com/en-nl/'
        ];

        const data = await this.maisonmargielaService.getCategories(siteUrls);
        await this.categoryService.saveCategories('Maisonmargiela', data);
        break;
      }

      case 'Loewe': {
        console.log('Loewe 카테고리 업데이트 요청');

        const siteUrls = ['https://www.loewe.com/eur/en/home'];

        const data = await this.loeweService.getCategories(siteUrls);
        await this.categoryService.saveCategories('Loewe', data);
        break;
      }

      case 'Stone': {
        console.log('Stone 카테고리 업데이트 요청');

        const siteUrls = ['https://www.stoneisland.com/en-fr/'];

        const data = await this.stoneService.getCategories(siteUrls);
        await this.categoryService.saveCategories('Stone', data);
        break;
      }

      case 'Lemaire': {
        console.log('Lemaire 카테고리 업데이트 요청');

        const siteUrls = ['https://www.lemaire.fr/?country=NL'];

        const data = await this.lemaireService.getCategories(siteUrls);
        await this.categoryService.saveCategories('Lemaire', data);
        break;
      }

      case 'Ferragamo': {
        console.log('Ferragamo 카테고리 업데이트 요청');

        const siteUrls = ['https://www.ferragamo.com/shop/eu/en'];

        const data = await this.ferragamoService.getCategories(siteUrls);
        await this.categoryService.saveCategories('Ferragamo', data);
        break;
      }

      case 'Dolce': {
        console.log('Dolce 카테고리 업데이트 요청');

        const siteUrls = ['https://www.dolcegabbana.com/ko-nl/'];

        const data = await this.dolceService.getCategories(siteUrls);
        await this.categoryService.saveCategories('Dolce', data);
        break;
      }

      case 'Therow': {
        console.log('Therow 카테고리 업데이트 요청');

        const siteUrls = ['https://www.therow.com/ko-nl'];

        const data = await this.therowService.getCategories(siteUrls);
        await this.categoryService.saveCategories('Therow', data);
        break;
      }

      case 'Maxmara': {
        console.log('Maxmara 카테고리 업데이트 요청');

        const siteUrls = ['https://nl.maxmara.com/'];

        const data = await this.maxmaraService.getCategories(siteUrls);
        await this.categoryService.saveCategories('Maxmara', data);
        break;
      }

      case 'Moncler': {
        console.log('Moncler 카테고리 업데이트 요청');

        const siteUrls = ['https://www.moncler.com/en-de/'];

        const data = await this.monclerService.getCategories(siteUrls);
        await this.categoryService.saveCategories('Moncler', data);
        break;
      }

      case 'Alexander': {
        console.log('Alexander 카테고리 업데이트 요청');

        const siteUrls = ['https://www.alexandermcqueen.com/en-nl'];

        const data = await this.alexanderService.getCategories(siteUrls);
        await this.categoryService.saveCategories('Alexander', data);
        break;
      }

      case 'Givenchy': {
        console.log('Givenchy 카테고리 업데이트 요청');

        const siteUrls = ['https://www.givenchy.com/nl/en/homepage'];

        const data = await this.givenchyService.getCategories(siteUrls);
        await this.categoryService.saveCategories('Givenchy', data);
        break;
      }

      case 'Sandro': {
        console.log('Sandro 카테고리 업데이트 요청');

        const siteUrls = ['https://fr.sandro-paris.com'];

        const data = await this.sandroService.getCategories(siteUrls);
        await this.categoryService.saveCategories('Sandro', data);
        break;
      }

      case 'Tods': {
        console.log('Tods 카테고리 업데이트 요청');

        const siteUrls = ['https://www.tods.com/fr-fr/home'];

        const data = await this.todsService.getCategories(siteUrls);
        await this.categoryService.saveCategories('Tods', data);
        break;
      }

      case 'Valentino': {
        console.log('Valentino 카테고리 업데이트 요청');

        const siteUrls = ['https://www.valentino.com/en-fr'];

        const data = await this.valentinoService.getCategories(siteUrls);
        await this.categoryService.saveCategories('Valentino', data);
        break;
      }

      case 'Acne': {
        console.log('Acne 카테고리 업데이트 요청');

        const siteUrls = ['https://www.acnestudios.com/nl/en/home'];
        const siteUrls2 = [
          'https://www.acnestudios.com/nl/en/woman/shoes/',
          'https://www.acnestudios.com/nl/en/man/shoes/',
        ];

        const data = await this.acneService.getCategories(siteUrls, siteUrls2);
        await this.categoryService.saveCategories('Acne', data);
        break;
      }

      case 'Brunello': {
        console.log('Brunello 카테고리 업데이트 요청');

        const siteUrls = ['https://shop.brunellocucinelli.com/en-fr/?cgid=homepage'];

        const data = await this.brunelloService.getCategories(siteUrls);
        await this.categoryService.saveCategories('Brunello', data);
        break;
      }

      case 'Herno': {
        console.log('Herno 카테고리 업데이트 요청');

        const siteUrls = ['https://www.herno.com/ko/'];

        const data = await this.hernoService.getCategories(siteUrls);
        await this.categoryService.saveCategories('Herno', data);
        break;
      }

      case 'Thombrowne': {
        console.log('Thombrowne 카테고리 업데이트 요청');

        const siteUrls = ['https://www.thombrowne.com/en-eu'];

        const data = await this.thombrowneService.getCategories(siteUrls);
        await this.categoryService.saveCategories('Thombrowne', data);
        break;
      }

      case 'Tomford': {
        console.log('Tomford 카테고리 업데이트 요청');

        const siteUrls = ['https://www.tomfordfashion.fr/en-fr/home'];

        const data = await this.tomfordService.getCategories(siteUrls);
        await this.categoryService.saveCategories('Tomford', data);
        break;
      }

      case 'Hermes': {
        console.log('Hermes 카테고리 업데이트 요청');

        const siteUrls = ['https://www.hermes.com/fr/fr/'];

        const data = await this.hermesService.getCategories(siteUrls);
        await this.categoryService.saveCategories('Hermes', data);
        break;
      }

      case 'Ami': {
        console.log('Ami 카테고리 업데이트 요청');

        const siteUrls = ['https://www.amiparis.com/en-nl'];

        const data = await this.amiService.getCategories(siteUrls);
        await this.categoryService.saveCategories('Ami', data);
        break;
      }

      case 'Jacquemus': {
        console.log('Jacquemus 카테고리 업데이트 요청');

        const siteUrls = ['https://www.jacquemus.com/en_nl'];

        const data = await this.jacquemusService.getCategories(siteUrls);
        await this.categoryService.saveCategories('Jacquemus', data);
        break;
      }

      case 'Jilsander': {
        console.log('Jilsander 카테고리 업데이트 요청');

        const siteUrls = ['https://www.jilsander.com/en-nl/'];
        const siteUrls2 = [
          'https://www.jilsander.com/en-nl/women/accessories/bags',
          'https://www.jilsander.com/en-nl/women/accessories/shoes',
          'https://www.jilsander.com/en-nl/women/accessories/small-leather-goods',
          'https://www.jilsander.com/en-nl/women/accessories/jewellery',
          'https://www.jilsander.com/en-nl/women/accessories/accessories',

          'https://www.jilsander.com/en-nl/men/accessories/bags',
          'https://www.jilsander.com/en-nl/men/accessories/shoes',
          'https://www.jilsander.com/en-nl/men/accessories/small-leather-goods',
          'https://www.jilsander.com/en-nl/men/accessories/accessories',
          'https://www.jilsander.com/en-nl/men/accessories/jewellery'
        ];

        const data = await this.jilsanderService.getCategories(siteUrls, siteUrls2);
        await this.categoryService.saveCategories('Jilsander', data);
        break;
      }

      case 'Ourlegacy': {
        console.log('Ourlegacy 카테고리 업데이트 요청');

        const siteUrls = [
          'https://www.ourlegacy.com/mens/new-arrivals',
          'https://www.ourlegacy.com/womens/new-arrivals',
          'https://www.ourlegacy.com/footwear/mens-footwear',
          'https://www.ourlegacy.com/footwear/womens-footwear',
          'https://www.ourlegacy.com/accessories/new-arrivals',
        ];

        const data = await this.ourlegacyService.getCategories(siteUrls);
        await this.categoryService.saveCategories('Ourlegacy', data);
        break;
      }

      case 'Polene': {
        console.log('Polene 카테고리 업데이트 요청');

        const siteUrls = ['https://nl.polene-paris.com/'];

        const data = await this.poleneService.getCategories(siteUrls);
        await this.categoryService.saveCategories('Polene', data);
        break;
      }

      case 'Rickowens': {
        console.log('Rickowens 카테고리 업데이트 요청');

        const siteUrls = [
          'https://www.rickowens.eu/en-lux/collections/womens-all',
          'https://www.rickowens.eu/en-lux/collections/mens-all',
          'https://www.rickowens.eu/en-lux/collections/jewelery',
          'https://www.rickowens.eu/en-lux/collections/main-category-cm-bags',
          'https://www.rickowens.eu/en-lux/collections/kids-all',
        ];

        const data = await this.rickowensService.getCategories(siteUrls);
        await this.categoryService.saveCategories('Rickowens', data);
        break;
      }

      case 'Apc': {
        console.log('Apc 카테고리 업데이트 요청');

        const siteUrls = ['https://www.apcstore.com/'];

        const data = await this.apcService.getCategories(siteUrls);
        await this.categoryService.saveCategories('Apc', data);
        break;
      }

      case 'Chloe': {
        console.log('Chloe 카테고리 업데이트 요청');

        const siteUrls = ['https://www.chloe.com/en-nl'];

        const data = await this.chloeService.getCategories(siteUrls);
        await this.categoryService.saveCategories('Chloe', data);
        break;
      }

      case 'Gucci': {
        console.log('Gucci 카테고리 업데이트 요청');

        const siteUrls = ['https://www.gucci.com/nl/en_gb/'];

        const data = await this.gucciService.getCategories(siteUrls);
        await this.categoryService.saveCategories('Gucci', data);
        break;
      }

      case 'Isabelmarant': {
        console.log('Isabelmarant 카테고리 업데이트 요청');

        const siteUrls = ['https://isabelmarant.com/en-nl'];

        const data = await this.isabelmarantService.getCategories(siteUrls);
        await this.categoryService.saveCategories('Isabelmarant', data);
        break;
      }

      case 'Longchamp': {
        console.log('Longchamp 카테고리 업데이트 요청');

        const siteUrls = ['https://www.longchamp.com/nl/nl/'];

        const data = await this.longchampService.getCategories(siteUrls);
        await this.categoryService.saveCategories('Longchamp', data);
        break;
      }

      case 'Maisonkitsune': {
        console.log('Maisonkitsune 카테고리 업데이트 요청');

        const siteUrls = ['https://maisonkitsune.com/ww/'];

        const data = await this.maisonkitsuneService.getCategories(siteUrls);
        await this.categoryService.saveCategories('Maisonkitsune', data);
        break;
      }

      case 'Maje': {
        console.log('Maje 카테고리 업데이트 요청');

        const siteUrls = ['https://eu.maje.com/'];

        const data = await this.majeService.getCategories(siteUrls);
        await this.categoryService.saveCategories('Maje', data);
        break;
      }

      case 'Alaia': {
        console.log('Alaia 카테고리 업데이트 요청');

        const siteUrls = ['https://www.maison-alaia.com/en-nl/'];

        const data = await this.alaiaService.getCategories(siteUrls);
        await this.categoryService.saveCategories('Alaia', data);
        break;
      }

      case 'CPcompany': {
        console.log('CPcompany 카테고리 업데이트 요청');

        const siteUrls = ['https://www.cpcompany.com/en-nl/'];

        const data = await this.cpcompanyService.getCategories(siteUrls);
        await this.categoryService.saveCategories('CPcompany', data);
        break;
      }

      case 'Delvaux': {
        console.log('Delvaux 카테고리 업데이트 요청');

        const siteUrls = ['https://eu.delvaux.com/nl'];

        const data = await this.delvauxService.getCategories(siteUrls);
        await this.categoryService.saveCategories('Delvaux', data);
        break;
      }

      case 'Rogervivier': {
        console.log('Rogervivier 카테고리 업데이트 요청');

        const siteUrls = ['https://www.rogervivier.com/fr-fr/home/'];

        const data = await this.rogervivierService.getCategories(siteUrls);
        await this.categoryService.saveCategories('Rogervivier', data);
        break;
      }

      case 'Toteme': {
        console.log('Toteme 카테고리 업데이트 요청');

        const siteUrls = ['https://toteme.com/en-int'];

        const data = await this.totemeService.getCategories(siteUrls);
        await this.categoryService.saveCategories('Toteme', data);
        break;
      }

      case 'Jimmychoo': {
        console.log('Jimmychoo 카테고리 업데이트 요청');

        const siteUrls = ['https://row.jimmychoo.com/en/home'];

        const data = await this.jimmychooService.getCategories(siteUrls);
        await this.categoryService.saveCategories('Jimmychoo', data);
        break;
      }

      case 'Versace': {
        console.log('Versace 카테고리 업데이트 요청');

        const siteUrls = ['https://www.versace.com/nl/en/'];

        const data = await this.versaceService.getCategories(siteUrls);
        await this.categoryService.saveCategories('Versace', data);
        break;
      }

      case 'Berluti': {
        console.log('Berluti 카테고리 업데이트 요청');

        const siteUrls = ['https://www.berluti.com/en-nl/homepage/'];

        const data = await this.berlutiService.getCategories(siteUrls);
        await this.categoryService.saveCategories('Berluti', data);
        break;
      }

      case 'Offwhite': {
        console.log('Offwhite 카테고리 업데이트 요청');

        const siteUrls = ['https://www.off---white.com/en-nl/'];

        const data = await this.offwhiteService.getCategories(siteUrls);
        await this.categoryService.saveCategories('Offwhite', data);
        break;
      }

      case 'Etro': {
        console.log('Etro 카테고리 업데이트 요청');

        const siteUrls = ['https://www.etro.com/nl-en/'];

        const data = await this.etroService.getCategories(siteUrls);
        await this.categoryService.saveCategories('Etro', data);
        break;
      }

      default:
        return { message: `지원하지 않는 site: ${site}` };
    }

    return { message: `${site} 카테고리 업데이트 완료` };
  }

  @Get('/:site')
  getSourceCategoriesByRoute(@Param('site') site: string) {
    const canonicalSite = SOURCE_CATEGORY_SITE_BY_ROUTE[String(site || '').toLowerCase()];

    if (!canonicalSite) {
      return { message: `지원하지 않는 site: ${site}` };
    }

    return this.getBySite(canonicalSite);
  }

}
