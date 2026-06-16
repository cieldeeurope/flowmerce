import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { SmartstoreService } from './smartstore.service';
import { CettireService } from 'src/cettire/cettire.service';
import { CrawlerService } from 'src/crawler/crawler.service';
import { PradaService } from 'src/prada/prada.service';
import { LvService } from 'src/lv/lv.service';
import { DiorService } from 'src/dior/dior.service';
import { BurberryService } from 'src/burberry/burberry.service';
import { CelineService } from 'src/celine/celine.service';
import { BalenciagaService } from 'src/balenciaga/balenciaga.service';
import { MiumiuService } from 'src/miumiu/miumiu.service';
import { BottegaService } from 'src/bottega/bottega.service';
import { FendiService } from 'src/fendi/fendi.service';
import { MaisonmargielaService } from 'src/maisonmargiela/maisonmargiela.service';
import { LoropianaService } from 'src/loropiana/loropiana.service';
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


@Controller('smartstore')
export class SmartstoreController {
  constructor(private readonly smartstoreService: SmartstoreService,
              private readonly cettireService: CettireService,
              private readonly crawlerService: CrawlerService,
              private readonly pradaService: PradaService,
              private readonly lvService: LvService,
              private readonly diorService: DiorService,
              private readonly burberryService: BurberryService,
              private readonly celineService: CelineService,
              private readonly balenciagaService: BalenciagaService,
              private readonly miumiuService: MiumiuService,
              private readonly bottegaService: BottegaService,
              private readonly fendiService: FendiService,
              private readonly maisonmargielaService: MaisonmargielaService,
              private readonly loropianaService: LoropianaService,
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
              
  ) {}
  
  /**
   * ✅ 스마트스토어 상품 등록 엔드포인트
   * - 여러 개의 `siteUrl`을 받아 순차적으로 크롤링 및 상품 등록
   * - `godoMallCategoryCode`를 사용하여 스마트스토어에 등록
   */
  // @Post('start-cettire')
  // async registerCettireProducts(
  //   @Body('siteUrl') siteUrl: string[], // ✅ 여러 개의 상품 URL 지원
  //   @Body('partnerKey') partnerKey: string,
  //   @Body('apiKey') apiKey: string,
  //   @Body('godoMallCategoryCode') godoMallCategoryCode: string[],
  //   @Body('customId') customId: string,
  //   @Body('accountPlatform') accountPlatform: string, // ✅ 스마트스토어 카테고리 코드만 사용
  // ) {
  //   let currentUrl = '';

  //   try {
  //     console.log(`📦 총 ${siteUrl.length}개의 카테고리를 스마트스토어에 등록합니다.`);
  //     console.log('🌍 수집할 URL 목록:', siteUrl);
  //     console.log('📌 수집할 스마트스토어 카테고리 코드 목록:', godoMallCategoryCode);

  //     // 순차적으로 각 URL을 크롤링하여 스마트스토어에 상품 등록
  //     for (let i = 0; i < siteUrl.length; i++) {
  //       currentUrl = siteUrl[i];
  // const currentCategoryCode = godoMallCategoryCode[i];
  //       
  //       const remainingCategories = siteUrl.length - i - 1;

  //       console.log(`🛍️ [${i + 1}/${siteUrl.length}] 스마트스토어 등록 시작 - URL: ${currentUrl}`);
  //       console.log(`⏳ 남은 카테고리 수: ${remainingCategories}`);

  //       // `getProductsFromCategory` 실행하여 크롤링 및 스마트스토어 등록
  //       await this.cettireService.getProductsFromCategory(
  //         currentUrl,
  //         partnerKey,
  //         apiKey,
  //         currentCategoryCode, // ✅ 고도몰 카테고리 제거
  //       );

  //       console.log(`✅ [${i + 1}/${siteUrl.length}] 스마트스토어 등록 완료 - URL: ${currentUrl}`);
  //     }

  //     console.log('🚀 모든 스마트스토어 상품 등록이 성공적으로 완료되었습니다.');
  //     return { message: `모든 Cettire 상품이 스마트스토어에 성공적으로 등록되었습니다.` };
  //   } catch (error: any) {
  //     console.error(`❌ 스마트스토어 등록 중 오류 발생:`, error);
  //     throw error;
  //   }
  // }

  @Post('start-YSL')
  async startFarfetch(
    @Body('siteUrl') siteUrl: string[], // 여러 URL을 받아오도록 수정
    @Body('partnerKey') partnerKey: string,
    @Body('apiKey') apiKey: string,
    @Body('godoMallCategoryCode') godoMallCategoryCode: string[],
    @Body('customId') customId: string,
    @Body('accountPlatform') accountPlatform: string, // 여러 카테고리 코드 수집
  ) {
    let currentUrl = '';

    try {
      // 초기 로그: 전체 URL과 카테고리 코드 목록 출력
      console.log(`총 ${siteUrl.length}개의 카테고리를 수집합니다.`);
      console.log('수집할 URL 목록:', siteUrl);
      console.log('수집할 카테고리 코드 목록:', godoMallCategoryCode);

      // 순차적으로 각 URL과 카테고리 코드에 대해 크롤링 수행
      for (let i = 0; i < siteUrl.length; i++) {
        currentUrl = siteUrl[i];
const currentCategoryCode = godoMallCategoryCode[i];
        
        const remainingCategories = siteUrl.length - i - 1;

        // 진행 로그: 현재 크롤링할 URL과 남은 카테고리 수 출력
        console.log(`카테고리 ${i + 1}/${siteUrl.length} 수집 시작 - URL: ${currentUrl}`);
        console.log(`남은 카테고리 수: ${remainingCategories}`);

        // FarfetchService 호출 (순차적으로 await 사용)
        await this.crawlerService.getProductsFromCategory(currentUrl, partnerKey, apiKey, customId, accountPlatform, currentCategoryCode);

        // 완료 로그: 현재 크롤링 완료 후 남은 작업 확인
        console.log(`카테고리 ${i + 1}/${siteUrl.length} 수집 완료 - URL: ${currentUrl}`);
      }

      // 모든 카테고리 수집 완료
      console.log('모든 카테고리 수집이 성공적으로 완료되었습니다.');
      return { message: `모든 YSL 카테고리 수집이 성공적으로 완료되었습니다.` };
    } catch (error: any) {
      console.error(`YSL ${currentUrl} 수집 중 오류 발생:`, error);
      throw error;
    }
  }

  @Post('/categories/fetch') 
  async fetchSmartstoreCategories(
    @Query('customId') customId: string,
    @Query('accountPlatform') accountPlatform: string
  ) {
    console.log("🔍 요청:", { customId, accountPlatform });

    return await this.smartstoreService.fetchAndStoreSmartstoreCategories(
      customId,
      accountPlatform
    );
  }


  @Post('/login')
  async login(
    @Query('partnerKey') partnerKey: string,
    @Query('apiKey') apiKey: string
  ) {
    console.log("🔑 스마트스토어 로그인 요청:", { partnerKey, apiKey });

    const auth = { smartStoreID: partnerKey, smartStoreSecret: apiKey };
    
    try {
      const accessToken = await this.smartstoreService.getAccessToken(auth);
      console.log("✅ 로그인 성공, 액세스 토큰 발급 완료:", accessToken);
      return { message: '로그인 성공', accessToken };
    } catch (error: any) {
      console.error("❌ 로그인 실패:", error.message);
      throw error;
    }
  }

  
  @Post('start-Prada')
  async startPrada(
    @Body('siteUrl') siteUrl: string[], // 여러 URL을 받아오도록 수정
    @Body('partnerKey') partnerKey: string,
    @Body('apiKey') apiKey: string,
    @Body('godoMallCategoryCode') godoMallCategoryCode: string[],
    @Body('customId') customId: string,
    @Body('accountPlatform') accountPlatform: string, // 여러 카테고리 코드 수집
  ) {
    let currentUrl = '';

    try {
      // 초기 로그: 전체 URL과 카테고리 코드 목록 출력
      console.log(`총 ${siteUrl.length}개의 카테고리를 수집합니다.`);
      console.log('수집할 URL 목록:', siteUrl);
      console.log('수집할 카테고리 코드 목록:', godoMallCategoryCode);

      // 순차적으로 각 URL과 카테고리 코드에 대해 크롤링 수행
      for (let i = 0; i < siteUrl.length; i++) {
        currentUrl = siteUrl[i];
const currentCategoryCode = godoMallCategoryCode[i];
        
        const remainingCategories = siteUrl.length - i - 1;

        // 진행 로그: 현재 크롤링할 URL과 남은 카테고리 수 출력
        console.log(`카테고리 ${i + 1}/${siteUrl.length} 수집 시작 - URL: ${currentUrl}`);
        console.log(`남은 카테고리 수: ${remainingCategories}`);

        // FarfetchService 호출 (순차적으로 await 사용)
        await this.pradaService.getProductsFromCategory(currentUrl, partnerKey, apiKey, customId, accountPlatform, currentCategoryCode);

        // 완료 로그: 현재 크롤링 완료 후 남은 작업 확인
        console.log(`카테고리 ${i + 1}/${siteUrl.length} 수집 완료 - URL: ${currentUrl}`);
      }

      // 모든 카테고리 수집 완료
      console.log('모든 카테고리 수집이 성공적으로 완료되었습니다.');
      return { message: `모든 Prada 카테고리 수집이 성공적으로 완료되었습니다.` };
    } catch (error: any) {
      console.error(`Prada ${currentUrl} 수집 중 오류 발생:`, error);
      throw error;
    }
  }


  @Post('start-LouisVuttion')
  async startLouisVuttion(
    @Body('siteUrl') siteUrl: string[], // 여러 URL을 받아오도록 수정
    @Body('partnerKey') partnerKey: string,
    @Body('apiKey') apiKey: string,
    @Body('godoMallCategoryCode') godoMallCategoryCode: string[],
    @Body('customId') customId: string,
    @Body('accountPlatform') accountPlatform: string, // 여러 카테고리 코드 수집
  ) {
    let currentUrl = '';

    try {
      // 초기 로그: 전체 URL과 카테고리 코드 목록 출력
      console.log(`총 ${siteUrl.length}개의 카테고리를 수집합니다.`);
      console.log('수집할 URL 목록:', siteUrl);
      console.log('수집할 카테고리 코드 목록:', godoMallCategoryCode);

      // 순차적으로 각 URL과 카테고리 코드에 대해 크롤링 수행
      for (let i = 0; i < siteUrl.length; i++) {
        currentUrl = siteUrl[i];
const currentCategoryCode = godoMallCategoryCode[i];
        
        const remainingCategories = siteUrl.length - i - 1;

        // 진행 로그: 현재 크롤링할 URL과 남은 카테고리 수 출력
        console.log(`카테고리 ${i + 1}/${siteUrl.length} 수집 시작 - URL: ${currentUrl}`);
        console.log(`남은 카테고리 수: ${remainingCategories}`);

        await this.lvService.getProductsFromCategory(currentUrl, partnerKey, apiKey, customId, accountPlatform, currentCategoryCode);

        // 완료 로그: 현재 크롤링 완료 후 남은 작업 확인
        console.log(`카테고리 ${i + 1}/${siteUrl.length} 수집 완료 - URL: ${currentUrl}`);
      }

      // 모든 카테고리 수집 완료
      console.log('모든 카테고리 수집이 성공적으로 완료되었습니다.');
      return { message: `모든 LV 카테고리 수집이 성공적으로 완료되었습니다.` };
    } catch (error: any) {
      console.error(`LV ${currentUrl} 수집 중 오류 발생:`, error);
      throw error;
    }
  }

  @Post('start-Dior')
  async startDior(
    @Body('siteUrl') siteUrl: string[], // 여러 URL을 받아오도록 수정
    @Body('partnerKey') partnerKey: string,
    @Body('apiKey') apiKey: string,
    @Body('godoMallCategoryCode') godoMallCategoryCode: string[],
    @Body('customId') customId: string,
    @Body('accountPlatform') accountPlatform: string, // 여러 카테고리 코드 수집
  ) {
    let currentUrl = '';

    try {
      // 초기 로그: 전체 URL과 카테고리 코드 목록 출력
      console.log(`총 ${siteUrl.length}개의 카테고리를 수집합니다.`);
      console.log('수집할 URL 목록:', siteUrl);
      console.log('수집할 카테고리 코드 목록:', godoMallCategoryCode);

      // 순차적으로 각 URL과 카테고리 코드에 대해 크롤링 수행
      for (let i = 0; i < siteUrl.length; i++) {
        currentUrl = siteUrl[i];
const currentCategoryCode = godoMallCategoryCode[i];
        
        const remainingCategories = siteUrl.length - i - 1;

        // 진행 로그: 현재 크롤링할 URL과 남은 카테고리 수 출력
        console.log(`카테고리 ${i + 1}/${siteUrl.length} 수집 시작 - URL: ${currentUrl}`);
        console.log(`남은 카테고리 수: ${remainingCategories}`);

        // Diorservice 호출 (순차적으로 await 사용)
        await this.diorService.getProductsFromCategory(currentUrl, partnerKey, apiKey, customId, accountPlatform, currentCategoryCode);

        // 완료 로그: 현재 크롤링 완료 후 남은 작업 확인
        console.log(`카테고리 ${i + 1}/${siteUrl.length} 수집 완료 - URL: ${currentUrl}`);
      }

      // 모든 카테고리 수집 완료
      console.log('모든 카테고리 수집이 성공적으로 완료되었습니다.');
      return { message: `모든 Dior 카테고리 수집이 성공적으로 완료되었습니다.` };
    } catch (error: any) {
      console.error(`Dior ${currentUrl} 수집 중 오류 발생:`, error);
      throw error;
    }
  }

  @Post('start-Burberry')
  async startBurberry(
    @Body('siteUrl') siteUrl: string[], // 여러 URL을 받아오도록 수정
    @Body('partnerKey') partnerKey: string,
    @Body('apiKey') apiKey: string,
    @Body('godoMallCategoryCode') godoMallCategoryCode: string[],
    @Body('customId') customId: string,
    @Body('accountPlatform') accountPlatform: string, // 여러 카테고리 코드 수집
  ) {
    let currentUrl = '';
    
    try {
      // 초기 로그: 전체 URL과 카테고리 코드 목록 출력
      console.log(`총 ${siteUrl.length}개의 카테고리를 수집합니다.`);
      console.log('수집할 URL 목록:', siteUrl);
      console.log('수집할 카테고리 코드 목록:', godoMallCategoryCode);

      // 순차적으로 각 URL과 카테고리 코드에 대해 크롤링 수행
      for (let i = 0; i < siteUrl.length; i++) {
        currentUrl = siteUrl[i];
const currentCategoryCode = godoMallCategoryCode[i];
        
        const remainingCategories = siteUrl.length - i - 1;

        // 진행 로그: 현재 크롤링할 URL과 남은 카테고리 수 출력
        console.log(`카테고리 ${i + 1}/${siteUrl.length} 수집 시작 - URL: ${currentUrl}`);
        console.log(`남은 카테고리 수: ${remainingCategories}`);

        // BurberryService 호출 (순차적으로 await 사용)
        await this.burberryService.getProductsFromCategory(currentUrl, partnerKey, apiKey, customId, accountPlatform, currentCategoryCode);

        // 완료 로그: 현재 크롤링 완료 후 남은 작업 확인
        console.log(`카테고리 ${i + 1}/${siteUrl.length} 수집 완료 - URL: ${currentUrl}`);
      }

      // 모든 카테고리 수집 완료
      console.log('모든 카테고리 수집이 성공적으로 완료되었습니다.');
      return { message: `모든 Burberry 카테고리 수집이 성공적으로 완료되었습니다.` };
    } catch (error: any) {
      console.error(`Burberry ${currentUrl} 수집 중 오류 발생:`, error);
      throw error;
    }
  }

  @Post('start-Celine')
  async startCeline(
    @Body('siteUrl') siteUrl: string[], // 여러 URL을 받아오도록 수정
    @Body('partnerKey') partnerKey: string,
    @Body('apiKey') apiKey: string,
    @Body('godoMallCategoryCode') godoMallCategoryCode: string[],
    @Body('customId') customId: string,
    @Body('accountPlatform') accountPlatform: string, // 여러 카테고리 코드 수집
  ) {
    let currentUrl = '';

    try {
      // 초기 로그: 전체 URL과 카테고리 코드 목록 출력
      console.log(`총 ${siteUrl.length}개의 카테고리를 수집합니다.`);
      console.log('수집할 URL 목록:', siteUrl);
      console.log('수집할 카테고리 코드 목록:', godoMallCategoryCode);

      // 순차적으로 각 URL과 카테고리 코드에 대해 크롤링 수행
      for (let i = 0; i < siteUrl.length; i++) {
        currentUrl = siteUrl[i];
const currentCategoryCode = godoMallCategoryCode[i];
        
        const remainingCategories = siteUrl.length - i - 1;

        // 진행 로그: 현재 크롤링할 URL과 남은 카테고리 수 출력
        console.log(`카테고리 ${i + 1}/${siteUrl.length} 수집 시작 - URL: ${currentUrl}`);
        console.log(`남은 카테고리 수: ${remainingCategories}`);

        // CelineService 호출 (순차적으로 await 사용)
        await this.celineService.getProductsFromCategory(currentUrl, partnerKey, apiKey, customId, accountPlatform, currentCategoryCode);

        // 완료 로그: 현재 크롤링 완료 후 남은 작업 확인
        console.log(`카테고리 ${i + 1}/${siteUrl.length} 수집 완료 - URL: ${currentUrl}`);
      }

      // 모든 카테고리 수집 완료
      console.log('모든 카테고리 수집이 성공적으로 완료되었습니다.');
      return { message: `모든 Celine 카테고리 수집이 성공적으로 완료되었습니다.` };
    } catch (error: any) {
      console.error(`Celine ${currentUrl} 수집 중 오류 발생:`, error);
      throw error;
    }
  }

  @Post('start-Balenciaga')
  async startBalenciaga(
    @Body('siteUrl') siteUrl: string[], // 여러 URL을 받아오도록 수정
    @Body('partnerKey') partnerKey: string,
    @Body('apiKey') apiKey: string,
    @Body('godoMallCategoryCode') godoMallCategoryCode: string[],
    @Body('customId') customId: string,
    @Body('accountPlatform') accountPlatform: string, // 여러 카테고리 코드 수집
  ) {
    let currentUrl = '';

    try {
      // 초기 로그: 전체 URL과 카테고리 코드 목록 출력
      console.log(`총 ${siteUrl.length}개의 카테고리를 수집합니다.`);
      console.log('수집할 URL 목록:', siteUrl);
      console.log('수집할 카테고리 코드 목록:', godoMallCategoryCode);

      // 순차적으로 각 URL과 카테고리 코드에 대해 크롤링 수행
      for (let i = 0; i < siteUrl.length; i++) {
        currentUrl = siteUrl[i];
const currentCategoryCode = godoMallCategoryCode[i];
        
        const remainingCategories = siteUrl.length - i - 1;

        // 진행 로그: 현재 크롤링할 URL과 남은 카테고리 수 출력
        console.log(`카테고리 ${i + 1}/${siteUrl.length} 수집 시작 - URL: ${currentUrl}`);
        console.log(`남은 카테고리 수: ${remainingCategories}`);

        // balenciagaService 호출 (순차적으로 await 사용)
        await this.balenciagaService.getProductsFromCategory(currentUrl, partnerKey, apiKey, customId, accountPlatform, currentCategoryCode);

        // 완료 로그: 현재 크롤링 완료 후 남은 작업 확인
        console.log(`카테고리 ${i + 1}/${siteUrl.length} 수집 완료 - URL: ${currentUrl}`);
      }

      // 모든 카테고리 수집 완료
      console.log('모든 카테고리 수집이 성공적으로 완료되었습니다.');
      return { message: `모든 balenciaga 카테고리 수집이 성공적으로 완료되었습니다.` };
    } catch (error: any) {
      console.error(`balenciaga ${currentUrl} 수집 중 오류 발생:`, error);
      throw error;
    }
  }

  @Post('start-Miumiu')
  async startMiumiu(
    @Body('siteUrl') siteUrl: string[], // 여러 URL을 받아오도록 수정
    @Body('partnerKey') partnerKey: string,
    @Body('apiKey') apiKey: string,
    @Body('godoMallCategoryCode') godoMallCategoryCode: string[],
    @Body('customId') customId: string,
    @Body('accountPlatform') accountPlatform: string, // 여러 카테고리 코드 수집
  ) {
    let currentUrl = '';

    try {
      // 초기 로그: 전체 URL과 카테고리 코드 목록 출력
      console.log(`총 ${siteUrl.length}개의 카테고리를 수집합니다.`);
      console.log('수집할 URL 목록:', siteUrl);
      console.log('수집할 카테고리 코드 목록:', godoMallCategoryCode);

      // 순차적으로 각 URL과 카테고리 코드에 대해 크롤링 수행
      for (let i = 0; i < siteUrl.length; i++) {
        currentUrl = siteUrl[i];
const currentCategoryCode = godoMallCategoryCode[i];
        
        const remainingCategories = siteUrl.length - i - 1;

        // 진행 로그: 현재 크롤링할 URL과 남은 카테고리 수 출력
        console.log(`카테고리 ${i + 1}/${siteUrl.length} 수집 시작 - URL: ${currentUrl}`);
        console.log(`남은 카테고리 수: ${remainingCategories}`);

        // CelineService 호출 (순차적으로 await 사용)
        await this.miumiuService.getProductsFromCategory(currentUrl, partnerKey, apiKey, customId, accountPlatform, currentCategoryCode);

        // 완료 로그: 현재 크롤링 완료 후 남은 작업 확인
        console.log(`카테고리 ${i + 1}/${siteUrl.length} 수집 완료 - URL: ${currentUrl}`);
      }

      // 모든 카테고리 수집 완료
      console.log('모든 카테고리 수집이 성공적으로 완료되었습니다.');
      return { message: `모든 Miumiu 카테고리 수집이 성공적으로 완료되었습니다.` };
    } catch (error: any) {
      console.error(`Miumiu ${currentUrl} 수집 중 오류 발생:`, error);
      throw error;
    }
  }

  @Post('start-Bottega')
  async startBottega(
    @Body('siteUrl') siteUrl: string[], // 여러 URL을 받아오도록 수정
    @Body('partnerKey') partnerKey: string,
    @Body('apiKey') apiKey: string,
    @Body('godoMallCategoryCode') godoMallCategoryCode: string[],
    @Body('customId') customId: string,
    @Body('accountPlatform') accountPlatform: string, // 여러 카테고리 코드 수집
  ) {
    let currentUrl = '';

    try {
      // 초기 로그: 전체 URL과 카테고리 코드 목록 출력
      console.log(`총 ${siteUrl.length}개의 카테고리를 수집합니다.`);
      console.log('수집할 URL 목록:', siteUrl);
      console.log('수집할 카테고리 코드 목록:', godoMallCategoryCode);

      // 순차적으로 각 URL과 카테고리 코드에 대해 크롤링 수행
      for (let i = 0; i < siteUrl.length; i++) {
        currentUrl = siteUrl[i];
const currentCategoryCode = godoMallCategoryCode[i];
        
        const remainingCategories = siteUrl.length - i - 1;

        // 진행 로그: 현재 크롤링할 URL과 남은 카테고리 수 출력
        console.log(`카테고리 ${i + 1}/${siteUrl.length} 수집 시작 - URL: ${currentUrl}`);
        console.log(`남은 카테고리 수: ${remainingCategories}`);

        // BottegaService 호출 (순차적으로 await 사용)
        await this.bottegaService.getProductsFromCategory(currentUrl, partnerKey, apiKey, customId, accountPlatform, currentCategoryCode);

        // 완료 로그: 현재 크롤링 완료 후 남은 작업 확인
        console.log(`카테고리 ${i + 1}/${siteUrl.length} 수집 완료 - URL: ${currentUrl}`);
      }

      // 모든 카테고리 수집 완료
      console.log('모든 카테고리 수집이 성공적으로 완료되었습니다.');
      return { message: `모든 Bottega 카테고리 수집이 성공적으로 완료되었습니다.` };
    } catch (error: any) {
      console.error(`Bottega ${currentUrl} 수집 중 오류 발생:`, error);
      throw error;
    }
  }

  @Post('start-Fendi')
  async startFendi(
    @Body('siteUrl') siteUrl: string[], // 여러 URL을 받아오도록 수정
    @Body('partnerKey') partnerKey: string,
    @Body('apiKey') apiKey: string,
    @Body('godoMallCategoryCode') godoMallCategoryCode: string[],
    @Body('customId') customId: string,
    @Body('accountPlatform') accountPlatform: string, // 여러 카테고리 코드 수집
  ) {
    let currentUrl = '';

    try {
      // 초기 로그: 전체 URL과 카테고리 코드 목록 출력
      console.log(`총 ${siteUrl.length}개의 카테고리를 수집합니다.`);
      console.log('수집할 URL 목록:', siteUrl);
      console.log('수집할 카테고리 코드 목록:', godoMallCategoryCode);

      // 순차적으로 각 URL과 카테고리 코드에 대해 크롤링 수행
      for (let i = 0; i < siteUrl.length; i++) {
        currentUrl = siteUrl[i];
const currentCategoryCode = godoMallCategoryCode[i];
        
        const remainingCategories = siteUrl.length - i - 1;

        // 진행 로그: 현재 크롤링할 URL과 남은 카테고리 수 출력
        console.log(`카테고리 ${i + 1}/${siteUrl.length} 수집 시작 - URL: ${currentUrl}`);
        console.log(`남은 카테고리 수: ${remainingCategories}`);

        // FendiService 호출 (순차적으로 await 사용)
        await this.fendiService.getProductsFromCategory(currentUrl, partnerKey, apiKey, customId, accountPlatform, currentCategoryCode);

        // 완료 로그: 현재 크롤링 완료 후 남은 작업 확인
        console.log(`카테고리 ${i + 1}/${siteUrl.length} 수집 완료 - URL: ${currentUrl}`);
      }

      // 모든 카테고리 수집 완료
      console.log('모든 카테고리 수집이 성공적으로 완료되었습니다.');
      return { message: `모든 Fendi 카테고리 수집이 성공적으로 완료되었습니다.` };
    } catch (error: any) {
      console.error(`Fendi ${currentUrl} 수집 중 오류 발생:`, error);
      throw error;
    }
  }

  @Post('start-Maisonmargiela')
  async startMaisonmargiela(
    @Body('siteUrl') siteUrl: string[], // 여러 URL을 받아오도록 수정
    @Body('partnerKey') partnerKey: string,
    @Body('apiKey') apiKey: string,
    @Body('godoMallCategoryCode') godoMallCategoryCode: string[],
    @Body('customId') customId: string,
    @Body('accountPlatform') accountPlatform: string, // 여러 카테고리 코드 수집
  ) {
    let currentUrl = '';

    try {
      // 초기 로그: 전체 URL과 카테고리 코드 목록 출력
      console.log(`총 ${siteUrl.length}개의 카테고리를 수집합니다.`);
      console.log('수집할 URL 목록:', siteUrl);
      console.log('수집할 카테고리 코드 목록:', godoMallCategoryCode);

      // 순차적으로 각 URL과 카테고리 코드에 대해 크롤링 수행
      for (let i = 0; i < siteUrl.length; i++) {
        currentUrl = siteUrl[i];
const currentCategoryCode = godoMallCategoryCode[i];
        
        const remainingCategories = siteUrl.length - i - 1;

        // 진행 로그: 현재 크롤링할 URL과 남은 카테고리 수 출력
        console.log(`카테고리 ${i + 1}/${siteUrl.length} 수집 시작 - URL: ${currentUrl}`);
        console.log(`남은 카테고리 수: ${remainingCategories}`);

        // MaisonmargielaService 호출 (순차적으로 await 사용)
        await this.maisonmargielaService.getProductsFromCategory(currentUrl, partnerKey, apiKey, customId, accountPlatform, currentCategoryCode);

        // 완료 로그: 현재 크롤링 완료 후 남은 작업 확인
        console.log(`카테고리 ${i + 1}/${siteUrl.length} 수집 완료 - URL: ${currentUrl}`);
      }

      // 모든 카테고리 수집 완료
      console.log('모든 카테고리 수집이 성공적으로 완료되었습니다.');
      return { message: `모든 Maisonmargiela 카테고리 수집이 성공적으로 완료되었습니다.` };
    } catch (error: any) {
      console.error(`Maisonmargiela ${currentUrl} 수집 중 오류 발생:`, error);
      throw error;
    }
  }

  @Post('start-Loropiana')
  async startLoropiana(
    @Body('siteUrl') siteUrl: string[], // 여러 URL을 받아오도록 수정
    @Body('partnerKey') partnerKey: string,
    @Body('apiKey') apiKey: string,
    @Body('godoMallCategoryCode') godoMallCategoryCode: string[],
    @Body('customId') customId: string,
    @Body('accountPlatform') accountPlatform: string, // 여러 카테고리 코드 수집
  ) {
    let currentUrl = '';

    try {
      // 초기 로그: 전체 URL과 카테고리 코드 목록 출력
      console.log(`총 ${siteUrl.length}개의 카테고리를 수집합니다.`);
      console.log('수집할 URL 목록:', siteUrl);
      console.log('수집할 카테고리 코드 목록:', godoMallCategoryCode);

      // 순차적으로 각 URL과 카테고리 코드에 대해 크롤링 수행
      for (let i = 0; i < siteUrl.length; i++) {
        currentUrl = siteUrl[i];
const currentCategoryCode = godoMallCategoryCode[i];
        
        const remainingCategories = siteUrl.length - i - 1;

        // 진행 로그: 현재 크롤링할 URL과 남은 카테고리 수 출력
        console.log(`카테고리 ${i + 1}/${siteUrl.length} 수집 시작 - URL: ${currentUrl}`);
        console.log(`남은 카테고리 수: ${remainingCategories}`);

        // LoropianaService 호출 (순차적으로 await 사용)
        await this.loropianaService.getProductsFromCategory(currentUrl, partnerKey, apiKey, customId, accountPlatform, currentCategoryCode);

        // 완료 로그: 현재 크롤링 완료 후 남은 작업 확인
        console.log(`카테고리 ${i + 1}/${siteUrl.length} 수집 완료 - URL: ${currentUrl}`);
      }

      // 모든 카테고리 수집 완료
      console.log('모든 카테고리 수집이 성공적으로 완료되었습니다.');
      return { message: `모든 Loropiana 카테고리 수집이 성공적으로 완료되었습니다.` };
    } catch (error: any) {
      console.error(`Loropiana ${currentUrl} 수집 중 오류 발생:`, error);
      throw error;
    }
  }

  @Post('start-Loewe')
  async startLoewe(
    @Body('siteUrl') siteUrl: string[], // 여러 URL을 받아오도록 수정
    @Body('partnerKey') partnerKey: string,
    @Body('apiKey') apiKey: string,
    @Body('godoMallCategoryCode') godoMallCategoryCode: string[],
    @Body('customId') customId: string,
    @Body('accountPlatform') accountPlatform: string, // 여러 카테고리 코드 수집
  ) {
    let currentUrl = '';

    try {
      // 초기 로그: 전체 URL과 카테고리 코드 목록 출력
      console.log(`총 ${siteUrl.length}개의 카테고리를 수집합니다.`);
      console.log('수집할 URL 목록:', siteUrl);
      console.log('수집할 카테고리 코드 목록:', godoMallCategoryCode);

      // 순차적으로 각 URL과 카테고리 코드에 대해 크롤링 수행
      for (let i = 0; i < siteUrl.length; i++) {
        currentUrl = siteUrl[i];
const currentCategoryCode = godoMallCategoryCode[i];
        
        const remainingCategories = siteUrl.length - i - 1;

        // 진행 로그: 현재 크롤링할 URL과 남은 카테고리 수 출력
        console.log(`카테고리 ${i + 1}/${siteUrl.length} 수집 시작 - URL: ${currentUrl}`);
        console.log(`남은 카테고리 수: ${remainingCategories}`);

        // loeweService 호출 (순차적으로 await 사용)
        await this.loeweService.getProductsFromCategory(currentUrl, partnerKey, apiKey, customId, accountPlatform, currentCategoryCode);

        // 완료 로그: 현재 크롤링 완료 후 남은 작업 확인
        console.log(`카테고리 ${i + 1}/${siteUrl.length} 수집 완료 - URL: ${currentUrl}`);
      }

      // 모든 카테고리 수집 완료
      console.log('모든 카테고리 수집이 성공적으로 완료되었습니다.');
      return { message: `모든 loewe 카테고리 수집이 성공적으로 완료되었습니다.` };
    } catch (error: any) {
      console.error(`loewe ${currentUrl} 수집 중 오류 발생:`, error);
      throw error;
    }
  }

  @Post('start-Stone')
  async startStone(
    @Body('siteUrl') siteUrl: string[], // 여러 URL을 받아오도록 수정
    @Body('partnerKey') partnerKey: string,
    @Body('apiKey') apiKey: string,
    @Body('godoMallCategoryCode') godoMallCategoryCode: string[],
    @Body('customId') customId: string,
    @Body('accountPlatform') accountPlatform: string, // 여러 카테고리 코드 수집
  ) {
    let currentUrl = '';

    try {
      // 초기 로그: 전체 URL과 카테고리 코드 목록 출력
      console.log(`총 ${siteUrl.length}개의 카테고리를 수집합니다.`);
      console.log('수집할 URL 목록:', siteUrl);
      console.log('수집할 카테고리 코드 목록:', godoMallCategoryCode);

      // 순차적으로 각 URL과 카테고리 코드에 대해 크롤링 수행
      for (let i = 0; i < siteUrl.length; i++) {
        currentUrl = siteUrl[i];
const currentCategoryCode = godoMallCategoryCode[i];
        
        const remainingCategories = siteUrl.length - i - 1;

        // 진행 로그: 현재 크롤링할 URL과 남은 카테고리 수 출력
        console.log(`카테고리 ${i + 1}/${siteUrl.length} 수집 시작 - URL: ${currentUrl}`);
        console.log(`남은 카테고리 수: ${remainingCategories}`);

        // StoneService 호출 (순차적으로 await 사용)
        await this.stoneService.getProductsFromCategory(currentUrl, partnerKey, apiKey, customId, accountPlatform, currentCategoryCode);

        // 완료 로그: 현재 크롤링 완료 후 남은 작업 확인
        console.log(`카테고리 ${i + 1}/${siteUrl.length} 수집 완료 - URL: ${currentUrl}`);
      }

      // 모든 카테고리 수집 완료
      console.log('모든 카테고리 수집이 성공적으로 완료되었습니다.');
      return { message: `모든 Stone 카테고리 수집이 성공적으로 완료되었습니다.` };
    } catch (error: any) {
      console.error(`Stone ${currentUrl} 수집 중 오류 발생:`, error);
      throw error;
    }
  }

  @Post('start-Lemaire')
  async startLemaire(
    @Body('siteUrl') siteUrl: string[], // 여러 URL을 받아오도록 수정
    @Body('partnerKey') partnerKey: string,
    @Body('apiKey') apiKey: string,
    @Body('godoMallCategoryCode') godoMallCategoryCode: string[],
    @Body('customId') customId: string,
    @Body('accountPlatform') accountPlatform: string, // 여러 카테고리 코드 수집
  ) {
    let currentUrl = '';

    try {
      // 초기 로그: 전체 URL과 카테고리 코드 목록 출력
      console.log(`총 ${siteUrl.length}개의 카테고리를 수집합니다.`);
      console.log('수집할 URL 목록:', siteUrl);
      console.log('수집할 카테고리 코드 목록:', godoMallCategoryCode);

      // 순차적으로 각 URL과 카테고리 코드에 대해 크롤링 수행
      for (let i = 0; i < siteUrl.length; i++) {
        currentUrl = siteUrl[i];
const currentCategoryCode = godoMallCategoryCode[i];
        
        const remainingCategories = siteUrl.length - i - 1;

        // 진행 로그: 현재 크롤링할 URL과 남은 카테고리 수 출력
        console.log(`카테고리 ${i + 1}/${siteUrl.length} 수집 시작 - URL: ${currentUrl}`);
        console.log(`남은 카테고리 수: ${remainingCategories}`);

        // LemaireService 호출 (순차적으로 await 사용)
        await this.lemaireService.getProductsFromCategory(currentUrl, partnerKey, apiKey, customId, accountPlatform, currentCategoryCode);

        // 완료 로그: 현재 크롤링 완료 후 남은 작업 확인
        console.log(`카테고리 ${i + 1}/${siteUrl.length} 수집 완료 - URL: ${currentUrl}`);
      }

      // 모든 카테고리 수집 완료
      console.log('모든 카테고리 수집이 성공적으로 완료되었습니다.');
      return { message: `모든 Lemaire 카테고리 수집이 성공적으로 완료되었습니다.` };
    } catch (error: any) {
      console.error(`Lemaire ${currentUrl} 수집 중 오류 발생:`, error);
      throw error;
    }
  }

  @Post('start-Ferragamo')
  async startFerragamo(
    @Body('siteUrl') siteUrl: string[], // 여러 URL을 받아오도록 수정
    @Body('partnerKey') partnerKey: string,
    @Body('apiKey') apiKey: string,
    @Body('godoMallCategoryCode') godoMallCategoryCode: string[],
    @Body('customId') customId: string,
    @Body('accountPlatform') accountPlatform: string, // 여러 카테고리 코드 수집
  ) {
    let currentUrl = '';

    try {
      // 초기 로그: 전체 URL과 카테고리 코드 목록 출력
      console.log(`총 ${siteUrl.length}개의 카테고리를 수집합니다.`);
      console.log('수집할 URL 목록:', siteUrl);
      console.log('수집할 카테고리 코드 목록:', godoMallCategoryCode);

      // 순차적으로 각 URL과 카테고리 코드에 대해 크롤링 수행
      for (let i = 0; i < siteUrl.length; i++) {
        currentUrl = siteUrl[i];
const currentCategoryCode = godoMallCategoryCode[i];
        
        const remainingCategories = siteUrl.length - i - 1;

        // 진행 로그: 현재 크롤링할 URL과 남은 카테고리 수 출력
        console.log(`카테고리 ${i + 1}/${siteUrl.length} 수집 시작 - URL: ${currentUrl}`);
        console.log(`남은 카테고리 수: ${remainingCategories}`);

        // FerragamoService 호출 (순차적으로 await 사용)
        await this.ferragamoService.getProductsFromCategory(currentUrl, partnerKey, apiKey, customId, accountPlatform, currentCategoryCode);

        // 완료 로그: 현재 크롤링 완료 후 남은 작업 확인
        console.log(`카테고리 ${i + 1}/${siteUrl.length} 수집 완료 - URL: ${currentUrl}`);
      }

      // 모든 카테고리 수집 완료
      console.log('모든 카테고리 수집이 성공적으로 완료되었습니다.');
      return { message: `모든 Ferragamo 카테고리 수집이 성공적으로 완료되었습니다.` };
    } catch (error: any) {
      console.error(`Ferragamo ${currentUrl} 수집 중 오류 발생:`, error);
      throw error;
    }
  }

  @Post('start-Dolce')
  async startDolce(
    @Body('siteUrl') siteUrl: string[], // 여러 URL을 받아오도록 수정
    @Body('partnerKey') partnerKey: string,
    @Body('apiKey') apiKey: string,
    @Body('godoMallCategoryCode') godoMallCategoryCode: string[],
    @Body('customId') customId: string,
    @Body('accountPlatform') accountPlatform: string, // 여러 카테고리 코드 수집
  ) {
    let currentUrl = '';

    try {
      // 초기 로그: 전체 URL과 카테고리 코드 목록 출력
      console.log(`총 ${siteUrl.length}개의 카테고리를 수집합니다.`);
      console.log('수집할 URL 목록:', siteUrl);
      console.log('수집할 카테고리 코드 목록:', godoMallCategoryCode);

      // 순차적으로 각 URL과 카테고리 코드에 대해 크롤링 수행
      for (let i = 0; i < siteUrl.length; i++) {
        currentUrl = siteUrl[i];
const currentCategoryCode = godoMallCategoryCode[i];
        
        const remainingCategories = siteUrl.length - i - 1;

        // 진행 로그: 현재 크롤링할 URL과 남은 카테고리 수 출력
        console.log(`카테고리 ${i + 1}/${siteUrl.length} 수집 시작 - URL: ${currentUrl}`);
        console.log(`남은 카테고리 수: ${remainingCategories}`);

        // DolceService 호출 (순차적으로 await 사용)
        await this.dolceService.getProductsFromCategory(currentUrl, partnerKey, apiKey, customId, accountPlatform, currentCategoryCode);

        // 완료 로그: 현재 크롤링 완료 후 남은 작업 확인
        console.log(`카테고리 ${i + 1}/${siteUrl.length} 수집 완료 - URL: ${currentUrl}`);
      }

      // 모든 카테고리 수집 완료
      console.log('모든 카테고리 수집이 성공적으로 완료되었습니다.');
      return { message: `모든 Dolce 카테고리 수집이 성공적으로 완료되었습니다.` };
    } catch (error: any) {
      console.error(`Dolce ${currentUrl} 수집 중 오류 발생:`, error);
      throw error;
    }
  }

  @Post('start-Therow')
  async startTherow(
    @Body('siteUrl') siteUrl: string[], // 여러 URL을 받아오도록 수정
    @Body('partnerKey') partnerKey: string,
    @Body('apiKey') apiKey: string,
    @Body('godoMallCategoryCode') godoMallCategoryCode: string[],
    @Body('customId') customId: string,
    @Body('accountPlatform') accountPlatform: string, // 여러 카테고리 코드 수집
  ) {
    let currentUrl = '';

    try {
      // 초기 로그: 전체 URL과 카테고리 코드 목록 출력
      console.log(`총 ${siteUrl.length}개의 카테고리를 수집합니다.`);
      console.log('수집할 URL 목록:', siteUrl);
      console.log('수집할 카테고리 코드 목록:', godoMallCategoryCode);

      // 순차적으로 각 URL과 카테고리 코드에 대해 크롤링 수행
      for (let i = 0; i < siteUrl.length; i++) {
        currentUrl = siteUrl[i];
const currentCategoryCode = godoMallCategoryCode[i];
        
        const remainingCategories = siteUrl.length - i - 1;

        // 진행 로그: 현재 크롤링할 URL과 남은 카테고리 수 출력
        console.log(`카테고리 ${i + 1}/${siteUrl.length} 수집 시작 - URL: ${currentUrl}`);
        console.log(`남은 카테고리 수: ${remainingCategories}`);

        // therowService 호출 (순차적으로 await 사용)
        await this.therowService.getProductsFromCategory(currentUrl, partnerKey, apiKey, customId, accountPlatform, currentCategoryCode);

        // 완료 로그: 현재 크롤링 완료 후 남은 작업 확인
        console.log(`카테고리 ${i + 1}/${siteUrl.length} 수집 완료 - URL: ${currentUrl}`);
      }

      // 모든 카테고리 수집 완료
      console.log('모든 카테고리 수집이 성공적으로 완료되었습니다.');
      return { message: `모든 Therow 카테고리 수집이 성공적으로 완료되었습니다.` };
    } catch (error: any) {
      console.error(`Therow ${currentUrl} 수집 중 오류 발생:`, error);
      throw error;
    }
  }

  @Post('start-Maxmara')
  async startMaxmara(
    @Body('siteUrl') siteUrl: string[], // 여러 URL을 받아오도록 수정
    @Body('partnerKey') partnerKey: string,
    @Body('apiKey') apiKey: string,
    @Body('godoMallCategoryCode') godoMallCategoryCode: string[],
    @Body('customId') customId: string,
    @Body('accountPlatform') accountPlatform: string, // 여러 카테고리 코드 수집
  ) {
    let currentUrl = '';

    try {
      // 초기 로그: 전체 URL과 카테고리 코드 목록 출력
      console.log(`총 ${siteUrl.length}개의 카테고리를 수집합니다.`);
      console.log('수집할 URL 목록:', siteUrl);
      console.log('수집할 카테고리 코드 목록:', godoMallCategoryCode);

      // 순차적으로 각 URL과 카테고리 코드에 대해 크롤링 수행
      for (let i = 0; i < siteUrl.length; i++) {
        currentUrl = siteUrl[i];
const currentCategoryCode = godoMallCategoryCode[i];
        
        const remainingCategories = siteUrl.length - i - 1;

        // 진행 로그: 현재 크롤링할 URL과 남은 카테고리 수 출력
        console.log(`카테고리 ${i + 1}/${siteUrl.length} 수집 시작 - URL: ${currentUrl}`);
        console.log(`남은 카테고리 수: ${remainingCategories}`);

        // maxmaraService 호출 (순차적으로 await 사용)
        await this.maxmaraService.getProductsFromCategory(currentUrl, partnerKey, apiKey, customId, accountPlatform, currentCategoryCode);

        // 완료 로그: 현재 크롤링 완료 후 남은 작업 확인
        console.log(`카테고리 ${i + 1}/${siteUrl.length} 수집 완료 - URL: ${currentUrl}`);
      }

      // 모든 카테고리 수집 완료
      console.log('모든 카테고리 수집이 성공적으로 완료되었습니다.');
      return { message: `모든 Maxmara 카테고리 수집이 성공적으로 완료되었습니다.` };
    } catch (error: any) {
      console.error(`Maxmara ${currentUrl} 수집 중 오류 발생:`, error);
      throw error;
    }
  }

  @Post('start-Moncler')
  async startMoncler(
    @Body('siteUrl') siteUrl: string[], // 여러 URL을 받아오도록 수정
    @Body('partnerKey') partnerKey: string,
    @Body('apiKey') apiKey: string,
    @Body('godoMallCategoryCode') godoMallCategoryCode: string[],
    @Body('customId') customId: string,
    @Body('accountPlatform') accountPlatform: string, // 여러 카테고리 코드 수집
  ) {
    let currentUrl = '';

    try {
      // 초기 로그: 전체 URL과 카테고리 코드 목록 출력
      console.log(`총 ${siteUrl.length}개의 카테고리를 수집합니다.`);
      console.log('수집할 URL 목록:', siteUrl);
      console.log('수집할 카테고리 코드 목록:', godoMallCategoryCode);

      // 순차적으로 각 URL과 카테고리 코드에 대해 크롤링 수행
      for (let i = 0; i < siteUrl.length; i++) {
        currentUrl = siteUrl[i];
const currentCategoryCode = godoMallCategoryCode[i];
        
        const remainingCategories = siteUrl.length - i - 1;

        // 진행 로그: 현재 크롤링할 URL과 남은 카테고리 수 출력
        console.log(`카테고리 ${i + 1}/${siteUrl.length} 수집 시작 - URL: ${currentUrl}`);
        console.log(`남은 카테고리 수: ${remainingCategories}`);

        // monclerService 호출 (순차적으로 await 사용)
        await this.monclerService.getProductsFromCategory(currentUrl, partnerKey, apiKey, customId, accountPlatform, currentCategoryCode);

        // 완료 로그: 현재 크롤링 완료 후 남은 작업 확인
        console.log(`카테고리 ${i + 1}/${siteUrl.length} 수집 완료 - URL: ${currentUrl}`);
      }

      // 모든 카테고리 수집 완료
      console.log('모든 카테고리 수집이 성공적으로 완료되었습니다.');
      return { message: `모든 Moncler 카테고리 수집이 성공적으로 완료되었습니다.` };
    } catch (error: any) {
      console.error(`Moncler ${currentUrl} 수집 중 오류 발생:`, error);
      throw error;
    }
  }

  @Post('start-Alexander')
  async startAlexander(
    @Body('siteUrl') siteUrl: string[], // 여러 URL을 받아오도록 수정
    @Body('partnerKey') partnerKey: string,
    @Body('apiKey') apiKey: string,
    @Body('godoMallCategoryCode') godoMallCategoryCode: string[],
    @Body('customId') customId: string,
    @Body('accountPlatform') accountPlatform: string, // 여러 카테고리 코드 수집
  ) {
    let currentUrl = ''; // 🔹 try 바깥에서 선언 (초기값 설정)

    try {
      // 초기 로그: 전체 URL과 카테고리 코드 목록 출력
      console.log(`총 ${siteUrl.length}개의 카테고리를 수집합니다.`);
      console.log('수집할 URL 목록:', siteUrl);
      console.log('수집할 카테고리 코드 목록:', godoMallCategoryCode);

      // 순차적으로 각 URL과 카테고리 코드에 대해 크롤링 수행
      for (let i = 0; i < siteUrl.length; i++) {
        currentUrl = siteUrl[i];
const currentCategoryCode = godoMallCategoryCode[i];
        
        const remainingCategories = siteUrl.length - i - 1;

        // 진행 로그: 현재 크롤링할 URL과 남은 카테고리 수 출력
        console.log(`카테고리 ${i + 1}/${siteUrl.length} 수집 시작 - URL: ${currentUrl}`);
        console.log(`남은 카테고리 수: ${remainingCategories}`);

        // Alexander 호출 (순차적으로 await 사용)
        await this.alexanderService.getProductsFromCategory(currentUrl, partnerKey, apiKey, customId, accountPlatform, currentCategoryCode);

        // 완료 로그: 현재 크롤링 완료 후 남은 작업 확인
        console.log(`카테고리 ${i + 1}/${siteUrl.length} 수집 완료 - URL: ${currentUrl}`);
      }

      // 모든 카테고리 수집 완료
      console.log('모든 카테고리 수집이 성공적으로 완료되었습니다.');
      return { message: `모든 Alexander 카테고리 수집이 성공적으로 완료되었습니다.` };
    } catch (error: any) {
      console.error(`Alexander ${currentUrl} 수집 중 오류 발생:`, error);
      throw error;
    }
  }
  

  @Post('start-Givenchy')
  async startGivenchy(
    @Body('siteUrl') siteUrl: string[], // 여러 URL을 받아오도록 수정
    @Body('partnerKey') partnerKey: string,
    @Body('apiKey') apiKey: string,
    @Body('godoMallCategoryCode') godoMallCategoryCode: string[],
    @Body('customId') customId: string,
    @Body('accountPlatform') accountPlatform: string, // 여러 카테고리 코드 수집
  ) {
    let currentUrl = ''; // 🔹 try 바깥에서 선언 (초기값 설정)

    try {
      // 초기 로그: 전체 URL과 카테고리 코드 목록 출력
      console.log(`총 ${siteUrl.length}개의 카테고리를 수집합니다.`);
      console.log('수집할 URL 목록:', siteUrl);
      console.log('수집할 카테고리 코드 목록:', godoMallCategoryCode);

      // 순차적으로 각 URL과 카테고리 코드에 대해 크롤링 수행
      for (let i = 0; i < siteUrl.length; i++) {
        currentUrl = siteUrl[i];
const currentCategoryCode = godoMallCategoryCode[i];
        
        const remainingCategories = siteUrl.length - i - 1;

        // 진행 로그: 현재 크롤링할 URL과 남은 카테고리 수 출력
        console.log(`카테고리 ${i + 1}/${siteUrl.length} 수집 시작 - URL: ${currentUrl}`);
        console.log(`남은 카테고리 수: ${remainingCategories}`);

        // Givenchy 호출 (순차적으로 await 사용)
        await this.givenchyService.getProductsFromCategory(currentUrl, partnerKey, apiKey, customId, accountPlatform, currentCategoryCode);

        // 완료 로그: 현재 크롤링 완료 후 남은 작업 확인
        console.log(`카테고리 ${i + 1}/${siteUrl.length} 수집 완료 - URL: ${currentUrl}`);
      }

      // 모든 카테고리 수집 완료
      console.log('모든 카테고리 수집이 성공적으로 완료되었습니다.');
      return { message: `모든 Givenchy 카테고리 수집이 성공적으로 완료되었습니다.` };
    } catch (error: any) {
      console.error(`Givenchy ${currentUrl} 수집 중 오류 발생:`, error);
      throw error;
    }
  }

  @Post('start-Sandro')
  async startSandro(
    @Body('siteUrl') siteUrl: string[], // 여러 URL을 받아오도록 수정
    @Body('partnerKey') partnerKey: string,
    @Body('apiKey') apiKey: string,
    @Body('godoMallCategoryCode') godoMallCategoryCode: string[],
    @Body('customId') customId: string,
    @Body('accountPlatform') accountPlatform: string, // 여러 카테고리 코드 수집
  ) {
    let currentUrl = ''; // 🔹 try 바깥에서 선언 (초기값 설정)

    try {
      // 초기 로그: 전체 URL과 카테고리 코드 목록 출력
      console.log(`총 ${siteUrl.length}개의 카테고리를 수집합니다.`);
      console.log('수집할 URL 목록:', siteUrl);
      console.log('수집할 카테고리 코드 목록:', godoMallCategoryCode);

      // 순차적으로 각 URL과 카테고리 코드에 대해 크롤링 수행
      for (let i = 0; i < siteUrl.length; i++) {
        currentUrl = siteUrl[i];
const currentCategoryCode = godoMallCategoryCode[i];
        
        const remainingCategories = siteUrl.length - i - 1;

        // 진행 로그: 현재 크롤링할 URL과 남은 카테고리 수 출력
        console.log(`카테고리 ${i + 1}/${siteUrl.length} 수집 시작 - URL: ${currentUrl}`);
        console.log(`남은 카테고리 수: ${remainingCategories}`);

        // Sandro 호출 (순차적으로 await 사용)
        await this.sandroService.getProductsFromCategory(currentUrl, partnerKey, apiKey, customId, accountPlatform, currentCategoryCode);

        // 완료 로그: 현재 크롤링 완료 후 남은 작업 확인
        console.log(`카테고리 ${i + 1}/${siteUrl.length} 수집 완료 - URL: ${currentUrl}`);
      }

      // 모든 카테고리 수집 완료
      console.log('모든 카테고리 수집이 성공적으로 완료되었습니다.');
      return { message: `모든 Sandro 카테고리 수집이 성공적으로 완료되었습니다.` };
    } catch (error: any) {
      console.error(`Sandro ${currentUrl} 수집 중 오류 발생:`, error);
      throw error;
    }
  }

  @Post('start-Tods')
  async startTods(
    @Body('siteUrl') siteUrl: string[], // 여러 URL을 받아오도록 수정
    @Body('partnerKey') partnerKey: string,
    @Body('apiKey') apiKey: string,
    @Body('godoMallCategoryCode') godoMallCategoryCode: string[],
    @Body('customId') customId: string,
    @Body('accountPlatform') accountPlatform: string, // 여러 카테고리 코드 수집
  ) {
    let currentUrl = ''; // 🔹 try 바깥에서 선언 (초기값 설정)

    try {
      // 초기 로그: 전체 URL과 카테고리 코드 목록 출력
      console.log(`총 ${siteUrl.length}개의 카테고리를 수집합니다.`);
      console.log('수집할 URL 목록:', siteUrl);
      console.log('수집할 카테고리 코드 목록:', godoMallCategoryCode);

      // 순차적으로 각 URL과 카테고리 코드에 대해 크롤링 수행
      for (let i = 0; i < siteUrl.length; i++) {
        currentUrl = siteUrl[i];
const currentCategoryCode = godoMallCategoryCode[i];
        
        const remainingCategories = siteUrl.length - i - 1;

        // 진행 로그: 현재 크롤링할 URL과 남은 카테고리 수 출력
        console.log(`카테고리 ${i + 1}/${siteUrl.length} 수집 시작 - URL: ${currentUrl}`);
        console.log(`남은 카테고리 수: ${remainingCategories}`);

        // Tods 호출 (순차적으로 await 사용)
        await this.todsService.getProductsFromCategory(currentUrl, partnerKey, apiKey, customId, accountPlatform, currentCategoryCode);

        // 완료 로그: 현재 크롤링 완료 후 남은 작업 확인
        console.log(`카테고리 ${i + 1}/${siteUrl.length} 수집 완료 - URL: ${currentUrl}`);
      }

      // 모든 카테고리 수집 완료
      console.log('모든 카테고리 수집이 성공적으로 완료되었습니다.');
      return { message: `모든 Tods 카테고리 수집이 성공적으로 완료되었습니다.` };
    } catch (error: any) {
      console.error(`Tods ${currentUrl} 수집 중 오류 발생:`, error);
      throw error;
    }
  }

  @Post('start-Valentino')
  async startValentino(
    @Body('siteUrl') siteUrl: string[], // 여러 URL을 받아오도록 수정
    @Body('partnerKey') partnerKey: string,
    @Body('apiKey') apiKey: string,
    @Body('godoMallCategoryCode') godoMallCategoryCode: string[],
    @Body('customId') customId: string,
    @Body('accountPlatform') accountPlatform: string, // 여러 카테고리 코드 수집
  ) {
    let currentUrl = ''; // 🔹 try 바깥에서 선언 (초기값 설정)

    try {
      // 초기 로그: 전체 URL과 카테고리 코드 목록 출력
      console.log(`총 ${siteUrl.length}개의 카테고리를 수집합니다.`);
      console.log('수집할 URL 목록:', siteUrl);
      console.log('수집할 카테고리 코드 목록:', godoMallCategoryCode);

      // 순차적으로 각 URL과 카테고리 코드에 대해 크롤링 수행
      for (let i = 0; i < siteUrl.length; i++) {
        currentUrl = siteUrl[i];
const currentCategoryCode = godoMallCategoryCode[i];
        
        const remainingCategories = siteUrl.length - i - 1;

        // 진행 로그: 현재 크롤링할 URL과 남은 카테고리 수 출력
        console.log(`카테고리 ${i + 1}/${siteUrl.length} 수집 시작 - URL: ${currentUrl}`);
        console.log(`남은 카테고리 수: ${remainingCategories}`);

        // Valentino 호출 (순차적으로 await 사용)
        await this.valentinoService.getProductsFromCategory(currentUrl, partnerKey, apiKey, customId, accountPlatform, currentCategoryCode);

        // 완료 로그: 현재 크롤링 완료 후 남은 작업 확인
        console.log(`카테고리 ${i + 1}/${siteUrl.length} 수집 완료 - URL: ${currentUrl}`);
      }

      // 모든 카테고리 수집 완료
      console.log('모든 카테고리 수집이 성공적으로 완료되었습니다.');
      return { message: `모든 Valentino 카테고리 수집이 성공적으로 완료되었습니다.` };
    } catch (error: any) {
      console.error(`Valentino ${currentUrl} 수집 중 오류 발생:`, error);
      throw error;
    }
  }

  @Post('start-Acne')
  async startAcne(
    @Body('siteUrl') siteUrl: string[], // 여러 URL을 받아오도록 수정
    @Body('partnerKey') partnerKey: string,
    @Body('apiKey') apiKey: string,
    @Body('godoMallCategoryCode') godoMallCategoryCode: string[],
    @Body('customId') customId: string,
    @Body('accountPlatform') accountPlatform: string, // 여러 카테고리 코드 수집
  ) {
    let currentUrl = ''; // 🔹 try 바깥에서 선언 (초기값 설정)

    try {
      // 초기 로그: 전체 URL과 카테고리 코드 목록 출력
      console.log(`총 ${siteUrl.length}개의 카테고리를 수집합니다.`);
      console.log('수집할 URL 목록:', siteUrl);
      console.log('수집할 카테고리 코드 목록:', godoMallCategoryCode);

      // 순차적으로 각 URL과 카테고리 코드에 대해 크롤링 수행
      for (let i = 0; i < siteUrl.length; i++) {
        currentUrl = siteUrl[i];
const currentCategoryCode = godoMallCategoryCode[i];
        
        const remainingCategories = siteUrl.length - i - 1;

        // 진행 로그: 현재 크롤링할 URL과 남은 카테고리 수 출력
        console.log(`카테고리 ${i + 1}/${siteUrl.length} 수집 시작 - URL: ${currentUrl}`);
        console.log(`남은 카테고리 수: ${remainingCategories}`);

        // Acne 호출 (순차적으로 await 사용)
        await this.acneService.getProductsFromCategory(currentUrl, partnerKey, apiKey, customId, accountPlatform, currentCategoryCode);

        // 완료 로그: 현재 크롤링 완료 후 남은 작업 확인
        console.log(`카테고리 ${i + 1}/${siteUrl.length} 수집 완료 - URL: ${currentUrl}`);
      }

      // 모든 카테고리 수집 완료
      console.log('모든 카테고리 수집이 성공적으로 완료되었습니다.');
      return { message: `모든 Acne 카테고리 수집이 성공적으로 완료되었습니다.` };
    } catch (error: any) {
      console.error(`Acne ${currentUrl} 수집 중 오류 발생:`, error);
      throw error;
    }
  }

  @Post('start-Brunello')
  async startBrunello(
    @Body('siteUrl') siteUrl: string[], // 여러 URL을 받아오도록 수정
    @Body('partnerKey') partnerKey: string,
    @Body('apiKey') apiKey: string,
    @Body('godoMallCategoryCode') godoMallCategoryCode: string[],
    @Body('customId') customId: string,
    @Body('accountPlatform') accountPlatform: string, // 여러 카테고리 코드 수집
  ) {
    let currentUrl = ''; // 🔹 try 바깥에서 선언 (초기값 설정)

    try {
      // 초기 로그: 전체 URL과 카테고리 코드 목록 출력
      console.log(`총 ${siteUrl.length}개의 카테고리를 수집합니다.`);
      console.log('수집할 URL 목록:', siteUrl);
      console.log('수집할 카테고리 코드 목록:', godoMallCategoryCode);

      // 순차적으로 각 URL과 카테고리 코드에 대해 크롤링 수행
      for (let i = 0; i < siteUrl.length; i++) {
        currentUrl = siteUrl[i];
const currentCategoryCode = godoMallCategoryCode[i];
        
        const remainingCategories = siteUrl.length - i - 1;

        // 진행 로그: 현재 크롤링할 URL과 남은 카테고리 수 출력
        console.log(`카테고리 ${i + 1}/${siteUrl.length} 수집 시작 - URL: ${currentUrl}`);
        console.log(`남은 카테고리 수: ${remainingCategories}`);

        // Brunello 호출 (순차적으로 await 사용)
        await this.brunelloService.getProductsFromCategory(currentUrl, partnerKey, apiKey, customId, accountPlatform, currentCategoryCode);

        // 완료 로그: 현재 크롤링 완료 후 남은 작업 확인
        console.log(`카테고리 ${i + 1}/${siteUrl.length} 수집 완료 - URL: ${currentUrl}`);
      }

      // 모든 카테고리 수집 완료
      console.log('모든 카테고리 수집이 성공적으로 완료되었습니다.');
      return { message: `모든 Brunello 카테고리 수집이 성공적으로 완료되었습니다.` };
    } catch (error: any) {
      console.error(`Brunello ${currentUrl} 수집 중 오류 발생:`, error);
      throw error;
    }
  }

  @Post('start-Herno')
  async startHerno(
    @Body('siteUrl') siteUrl: string[], // 여러 URL을 받아오도록 수정
    @Body('partnerKey') partnerKey: string,
    @Body('apiKey') apiKey: string,
    @Body('godoMallCategoryCode') godoMallCategoryCode: string[],
    @Body('customId') customId: string,
    @Body('accountPlatform') accountPlatform: string, // 여러 카테고리 코드 수집
  ) {
    let currentUrl = ''; // 🔹 try 바깥에서 선언 (초기값 설정)

    try {
      // 초기 로그: 전체 URL과 카테고리 코드 목록 출력
      console.log(`총 ${siteUrl.length}개의 카테고리를 수집합니다.`);
      console.log('수집할 URL 목록:', siteUrl);
      console.log('수집할 카테고리 코드 목록:', godoMallCategoryCode);

      // 순차적으로 각 URL과 카테고리 코드에 대해 크롤링 수행
      for (let i = 0; i < siteUrl.length; i++) {
        currentUrl = siteUrl[i];
const currentCategoryCode = godoMallCategoryCode[i];
        
        const remainingCategories = siteUrl.length - i - 1;

        // 진행 로그: 현재 크롤링할 URL과 남은 카테고리 수 출력
        console.log(`카테고리 ${i + 1}/${siteUrl.length} 수집 시작 - URL: ${currentUrl}`);
        console.log(`남은 카테고리 수: ${remainingCategories}`);

        // Herno 호출 (순차적으로 await 사용)
        await this.hernoService.getProductsFromCategory(currentUrl, partnerKey, apiKey, customId, accountPlatform, currentCategoryCode);

        // 완료 로그: 현재 크롤링 완료 후 남은 작업 확인
        console.log(`카테고리 ${i + 1}/${siteUrl.length} 수집 완료 - URL: ${currentUrl}`);
      }

      // 모든 카테고리 수집 완료
      console.log('모든 카테고리 수집이 성공적으로 완료되었습니다.');
      return { message: `모든 Herno 카테고리 수집이 성공적으로 완료되었습니다.` };
    } catch (error: any) {
      console.error(`Herno ${currentUrl} 수집 중 오류 발생:`, error);
      throw error;
    }
  }

  @Post('start-Thombrowne')
  async startThombrowne(
    @Body('siteUrl') siteUrl: string[], // 여러 URL을 받아오도록 수정
    @Body('partnerKey') partnerKey: string,
    @Body('apiKey') apiKey: string,
    @Body('godoMallCategoryCode') godoMallCategoryCode: string[],
    @Body('customId') customId: string,
    @Body('accountPlatform') accountPlatform: string, // 여러 카테고리 코드 수집
  ) {
    let currentUrl = ''; // 🔹 try 바깥에서 선언 (초기값 설정)

    try {
      // 초기 로그: 전체 URL과 카테고리 코드 목록 출력
      console.log(`총 ${siteUrl.length}개의 카테고리를 수집합니다.`);
      console.log('수집할 URL 목록:', siteUrl);
      console.log('수집할 카테고리 코드 목록:', godoMallCategoryCode);

      // 순차적으로 각 URL과 카테고리 코드에 대해 크롤링 수행
      for (let i = 0; i < siteUrl.length; i++) {
        currentUrl = siteUrl[i];
const currentCategoryCode = godoMallCategoryCode[i];
        
        const remainingCategories = siteUrl.length - i - 1;

        // 진행 로그: 현재 크롤링할 URL과 남은 카테고리 수 출력
        console.log(`카테고리 ${i + 1}/${siteUrl.length} 수집 시작 - URL: ${currentUrl}`);
        console.log(`남은 카테고리 수: ${remainingCategories}`);

        // Thombrowne 호출 (순차적으로 await 사용)
        await this.thombrowneService.getProductsFromCategory(currentUrl, partnerKey, apiKey, customId, accountPlatform, currentCategoryCode);

        // 완료 로그: 현재 크롤링 완료 후 남은 작업 확인
        console.log(`카테고리 ${i + 1}/${siteUrl.length} 수집 완료 - URL: ${currentUrl}`);
      }

      // 모든 카테고리 수집 완료
      console.log('모든 카테고리 수집이 성공적으로 완료되었습니다.');
      return { message: `모든 Thombrowne 카테고리 수집이 성공적으로 완료되었습니다.` };
    } catch (error: any) {
      console.error(`Thombrowne ${currentUrl} 수집 중 오류 발생:`, error);
      throw error;
    }
  }

  @Post('start-Tomford')
  async startTomford(
    @Body('siteUrl') siteUrl: string[], // 여러 URL을 받아오도록 수정
    @Body('partnerKey') partnerKey: string,
    @Body('apiKey') apiKey: string,
    @Body('godoMallCategoryCode') godoMallCategoryCode: string[],
    @Body('customId') customId: string,
    @Body('accountPlatform') accountPlatform: string, // 여러 카테고리 코드 수집
  ) {
    let currentUrl = ''; // 🔹 try 바깥에서 선언 (초기값 설정)

    try {
      // 초기 로그: 전체 URL과 카테고리 코드 목록 출력
      console.log(`총 ${siteUrl.length}개의 카테고리를 수집합니다.`);
      console.log('수집할 URL 목록:', siteUrl);
      console.log('수집할 카테고리 코드 목록:', godoMallCategoryCode);

      // 순차적으로 각 URL과 카테고리 코드에 대해 크롤링 수행
      for (let i = 0; i < siteUrl.length; i++) {
        currentUrl = siteUrl[i];
const currentCategoryCode = godoMallCategoryCode[i];
        
        const remainingCategories = siteUrl.length - i - 1;

        // 진행 로그: 현재 크롤링할 URL과 남은 카테고리 수 출력
        console.log(`카테고리 ${i + 1}/${siteUrl.length} 수집 시작 - URL: ${currentUrl}`);
        console.log(`남은 카테고리 수: ${remainingCategories}`);

        // Tomford 호출 (순차적으로 await 사용)
        await this.tomfordService.getProductsFromCategory(currentUrl, partnerKey, apiKey, customId, accountPlatform, currentCategoryCode);

        // 완료 로그: 현재 크롤링 완료 후 남은 작업 확인
        console.log(`카테고리 ${i + 1}/${siteUrl.length} 수집 완료 - URL: ${currentUrl}`);
      }

      // 모든 카테고리 수집 완료
      console.log('모든 카테고리 수집이 성공적으로 완료되었습니다.');
      return { message: `모든 Tomford 카테고리 수집이 성공적으로 완료되었습니다.` };
    } catch (error: any) {
      console.error(`Tomford ${currentUrl} 수집 중 오류 발생:`, error);
      throw error;
    }
  }

  @Post('start-Hermes')
  async startHermes(
    @Body('siteUrl') siteUrl: string[], // 여러 URL을 받아오도록 수정
    @Body('partnerKey') partnerKey: string,
    @Body('apiKey') apiKey: string,
    @Body('godoMallCategoryCode') godoMallCategoryCode: string[],
    @Body('customId') customId: string,
    @Body('accountPlatform') accountPlatform: string, // 여러 카테고리 코드 수집
  ) {
    let currentUrl = ''; // 🔹 try 바깥에서 선언 (초기값 설정)

    try {
      // 초기 로그: 전체 URL과 카테고리 코드 목록 출력
      console.log(`총 ${siteUrl.length}개의 카테고리를 수집합니다.`);
      console.log('수집할 URL 목록:', siteUrl);
      console.log('수집할 카테고리 코드 목록:', godoMallCategoryCode);

      // 순차적으로 각 URL과 카테고리 코드에 대해 크롤링 수행
      for (let i = 0; i < siteUrl.length; i++) {
        currentUrl = siteUrl[i];
const currentCategoryCode = godoMallCategoryCode[i];
        
        const remainingCategories = siteUrl.length - i - 1;

        // 진행 로그: 현재 크롤링할 URL과 남은 카테고리 수 출력
        console.log(`카테고리 ${i + 1}/${siteUrl.length} 수집 시작 - URL: ${currentUrl}`);
        console.log(`남은 카테고리 수: ${remainingCategories}`);

        // Hermes 호출 (순차적으로 await 사용)
        await this.hermesService.getProductsFromCategory(currentUrl, partnerKey, apiKey, customId, accountPlatform, currentCategoryCode);

        // 완료 로그: 현재 크롤링 완료 후 남은 작업 확인
        console.log(`카테고리 ${i + 1}/${siteUrl.length} 수집 완료 - URL: ${currentUrl}`);
      }

      // 모든 카테고리 수집 완료
      console.log('모든 카테고리 수집이 성공적으로 완료되었습니다.');
      return { message: `모든 Hermes 카테고리 수집이 성공적으로 완료되었습니다.` };
    } catch (error: any) {
      console.error(`Hermes ${currentUrl} 수집 중 오류 발생:`, error);
      throw error;
    }
  }

  @Post('start-Ami')
  async startAmi(
    @Body('siteUrl') siteUrl: string[], // 여러 URL을 받아오도록 수정
    @Body('partnerKey') partnerKey: string,
    @Body('apiKey') apiKey: string,
    @Body('godoMallCategoryCode') godoMallCategoryCode: string[],
    @Body('customId') customId: string,
    @Body('accountPlatform') accountPlatform: string, // 여러 카테고리 코드 수집
  ) {
    let currentUrl = ''; // 🔹 try 바깥에서 선언 (초기값 설정)

    try {
      // 초기 로그: 전체 URL과 카테고리 코드 목록 출력
      console.log(`총 ${siteUrl.length}개의 카테고리를 수집합니다.`);
      console.log('수집할 URL 목록:', siteUrl);
      console.log('수집할 카테고리 코드 목록:', godoMallCategoryCode);

      // 순차적으로 각 URL과 카테고리 코드에 대해 크롤링 수행
      for (let i = 0; i < siteUrl.length; i++) {
        currentUrl = siteUrl[i];
const currentCategoryCode = godoMallCategoryCode[i];
        
        const remainingCategories = siteUrl.length - i - 1;

        // 진행 로그: 현재 크롤링할 URL과 남은 카테고리 수 출력
        console.log(`카테고리 ${i + 1}/${siteUrl.length} 수집 시작 - URL: ${currentUrl}`);
        console.log(`남은 카테고리 수: ${remainingCategories}`);

        // Ami 호출 (순차적으로 await 사용)
        await this.amiService.getProductsFromCategory(currentUrl, partnerKey, apiKey, customId, accountPlatform, currentCategoryCode);

        // 완료 로그: 현재 크롤링 완료 후 남은 작업 확인
        console.log(`카테고리 ${i + 1}/${siteUrl.length} 수집 완료 - URL: ${currentUrl}`);
      }

      // 모든 카테고리 수집 완료
      console.log('모든 카테고리 수집이 성공적으로 완료되었습니다.');
      return { message: `모든 Ami 카테고리 수집이 성공적으로 완료되었습니다.` };
    } catch (error: any) {
      console.error(`Ami ${currentUrl} 수집 중 오류 발생:`, error);
      throw error;
    }
  }

  @Post('start-Jacquemus')
  async startJacquemus(
    @Body('siteUrl') siteUrl: string[], // 여러 URL을 받아오도록 수정
    @Body('partnerKey') partnerKey: string,
    @Body('apiKey') apiKey: string,
    @Body('godoMallCategoryCode') godoMallCategoryCode: string[],
    @Body('customId') customId: string,
    @Body('accountPlatform') accountPlatform: string, // 여러 카테고리 코드 수집
  ) {
    let currentUrl = ''; // 🔹 try 바깥에서 선언 (초기값 설정)

    try {
      // 초기 로그: 전체 URL과 카테고리 코드 목록 출력
      console.log(`총 ${siteUrl.length}개의 카테고리를 수집합니다.`);
      console.log('수집할 URL 목록:', siteUrl);
      console.log('수집할 카테고리 코드 목록:', godoMallCategoryCode);

      // 순차적으로 각 URL과 카테고리 코드에 대해 크롤링 수행
      for (let i = 0; i < siteUrl.length; i++) {
        currentUrl = siteUrl[i];
const currentCategoryCode = godoMallCategoryCode[i];
        
        const remainingCategories = siteUrl.length - i - 1;

        // 진행 로그: 현재 크롤링할 URL과 남은 카테고리 수 출력
        console.log(`카테고리 ${i + 1}/${siteUrl.length} 수집 시작 - URL: ${currentUrl}`);
        console.log(`남은 카테고리 수: ${remainingCategories}`);

        // Jacquemus 호출 (순차적으로 await 사용)
        await this.jacquemusService.getProductsFromCategory(currentUrl, partnerKey, apiKey, customId, accountPlatform, currentCategoryCode);

        // 완료 로그: 현재 크롤링 완료 후 남은 작업 확인
        console.log(`카테고리 ${i + 1}/${siteUrl.length} 수집 완료 - URL: ${currentUrl}`);
      }

      // 모든 카테고리 수집 완료
      console.log('모든 카테고리 수집이 성공적으로 완료되었습니다.');
      return { message: `모든 Jacquemus 카테고리 수집이 성공적으로 완료되었습니다.` };
    } catch (error: any) {
      console.error(`Jacquemus ${currentUrl} 수집 중 오류 발생:`, error);
      throw error;
    }
  }

  @Post('start-Jilsander')
  async startJilsander(
    @Body('siteUrl') siteUrl: string[], // 여러 URL을 받아오도록 수정
    @Body('partnerKey') partnerKey: string,
    @Body('apiKey') apiKey: string,
    @Body('godoMallCategoryCode') godoMallCategoryCode: string[],
    @Body('customId') customId: string,
    @Body('accountPlatform') accountPlatform: string, // 여러 카테고리 코드 수집
  ) {
    let currentUrl = ''; // 🔹 try 바깥에서 선언 (초기값 설정)

    try {
      // 초기 로그: 전체 URL과 카테고리 코드 목록 출력
      console.log(`총 ${siteUrl.length}개의 카테고리를 수집합니다.`);
      console.log('수집할 URL 목록:', siteUrl);
      console.log('수집할 카테고리 코드 목록:', godoMallCategoryCode);

      // 순차적으로 각 URL과 카테고리 코드에 대해 크롤링 수행
      for (let i = 0; i < siteUrl.length; i++) {
        currentUrl = siteUrl[i];
const currentCategoryCode = godoMallCategoryCode[i];
        
        const remainingCategories = siteUrl.length - i - 1;

        // 진행 로그: 현재 크롤링할 URL과 남은 카테고리 수 출력
        console.log(`카테고리 ${i + 1}/${siteUrl.length} 수집 시작 - URL: ${currentUrl}`);
        console.log(`남은 카테고리 수: ${remainingCategories}`);

        // Jilsander 호출 (순차적으로 await 사용)
        await this.jilsanderService.getProductsFromCategory(currentUrl, partnerKey, apiKey, customId, accountPlatform, currentCategoryCode);

        // 완료 로그: 현재 크롤링 완료 후 남은 작업 확인
        console.log(`카테고리 ${i + 1}/${siteUrl.length} 수집 완료 - URL: ${currentUrl}`);
      }

      // 모든 카테고리 수집 완료
      console.log('모든 카테고리 수집이 성공적으로 완료되었습니다.');
      return { message: `모든 Jilsander 카테고리 수집이 성공적으로 완료되었습니다.` };
    } catch (error: any) {
      console.error(`Jilsander ${currentUrl} 수집 중 오류 발생:`, error);
      throw error;
    }
  }

  @Post('start-Ourlegacy')
  async startOurlegacy(
    @Body('siteUrl') siteUrl: string[], // 여러 URL을 받아오도록 수정
    @Body('partnerKey') partnerKey: string,
    @Body('apiKey') apiKey: string,
    @Body('godoMallCategoryCode') godoMallCategoryCode: string[],
    @Body('customId') customId: string,
    @Body('accountPlatform') accountPlatform: string, // 여러 카테고리 코드 수집
  ) {
    let currentUrl = ''; // 🔹 try 바깥에서 선언 (초기값 설정)

    try {
      // 초기 로그: 전체 URL과 카테고리 코드 목록 출력
      console.log(`총 ${siteUrl.length}개의 카테고리를 수집합니다.`);
      console.log('수집할 URL 목록:', siteUrl);
      console.log('수집할 카테고리 코드 목록:', godoMallCategoryCode);

      // 순차적으로 각 URL과 카테고리 코드에 대해 크롤링 수행
      for (let i = 0; i < siteUrl.length; i++) {
        currentUrl = siteUrl[i];
const currentCategoryCode = godoMallCategoryCode[i];
        
        const remainingCategories = siteUrl.length - i - 1;

        // 진행 로그: 현재 크롤링할 URL과 남은 카테고리 수 출력
        console.log(`카테고리 ${i + 1}/${siteUrl.length} 수집 시작 - URL: ${currentUrl}`);
        console.log(`남은 카테고리 수: ${remainingCategories}`);

        // Ourlegacy 호출 (순차적으로 await 사용)
        await this.ourlegacyService.getProductsFromCategory(currentUrl, partnerKey, apiKey, customId, accountPlatform, currentCategoryCode);

        // 완료 로그: 현재 크롤링 완료 후 남은 작업 확인
        console.log(`카테고리 ${i + 1}/${siteUrl.length} 수집 완료 - URL: ${currentUrl}`);
      }

      // 모든 카테고리 수집 완료
      console.log('모든 카테고리 수집이 성공적으로 완료되었습니다.');
      return { message: `모든 Ourlegacy 카테고리 수집이 성공적으로 완료되었습니다.` };
    } catch (error: any) {
      console.error(`Ourlegacy ${currentUrl} 수집 중 오류 발생:`, error);
      throw error;
    }
  }

  @Post('start-Polene')
  async startPolene(
    @Body('siteUrl') siteUrl: string[], // 여러 URL을 받아오도록 수정
    @Body('partnerKey') partnerKey: string,
    @Body('apiKey') apiKey: string,
    @Body('godoMallCategoryCode') godoMallCategoryCode: string[],
    @Body('customId') customId: string,
    @Body('accountPlatform') accountPlatform: string, // 여러 카테고리 코드 수집
  ) {
    let currentUrl = ''; // 🔹 try 바깥에서 선언 (초기값 설정)

    try {
      // 초기 로그: 전체 URL과 카테고리 코드 목록 출력
      console.log(`총 ${siteUrl.length}개의 카테고리를 수집합니다.`);
      console.log('수집할 URL 목록:', siteUrl);
      console.log('수집할 카테고리 코드 목록:', godoMallCategoryCode);

      // 순차적으로 각 URL과 카테고리 코드에 대해 크롤링 수행
      for (let i = 0; i < siteUrl.length; i++) {
        currentUrl = siteUrl[i];
const currentCategoryCode = godoMallCategoryCode[i];
        
        const remainingCategories = siteUrl.length - i - 1;

        // 진행 로그: 현재 크롤링할 URL과 남은 카테고리 수 출력
        console.log(`카테고리 ${i + 1}/${siteUrl.length} 수집 시작 - URL: ${currentUrl}`);
        console.log(`남은 카테고리 수: ${remainingCategories}`);

        // Polene 호출 (순차적으로 await 사용)
        await this.poleneService.getProductsFromCategory(currentUrl, partnerKey, apiKey, customId, accountPlatform, currentCategoryCode);

        // 완료 로그: 현재 크롤링 완료 후 남은 작업 확인
        console.log(`카테고리 ${i + 1}/${siteUrl.length} 수집 완료 - URL: ${currentUrl}`);
      }

      // 모든 카테고리 수집 완료
      console.log('모든 카테고리 수집이 성공적으로 완료되었습니다.');
      return { message: `모든 Polene 카테고리 수집이 성공적으로 완료되었습니다.` };
    } catch (error: any) {
      console.error(`Polene ${currentUrl} 수집 중 오류 발생:`, error);
      throw error;
    }
  }

  @Post('start-Rickowens')
  async startRickowens(
    @Body('siteUrl') siteUrl: string[], // 여러 URL을 받아오도록 수정
    @Body('partnerKey') partnerKey: string,
    @Body('apiKey') apiKey: string,
    @Body('godoMallCategoryCode') godoMallCategoryCode: string[],
    @Body('customId') customId: string,
    @Body('accountPlatform') accountPlatform: string, // 여러 카테고리 코드 수집
  ) {
    let currentUrl = ''; // 🔹 try 바깥에서 선언 (초기값 설정)

    try {
      // 초기 로그: 전체 URL과 카테고리 코드 목록 출력
      console.log(`총 ${siteUrl.length}개의 카테고리를 수집합니다.`);
      console.log('수집할 URL 목록:', siteUrl);
      console.log('수집할 카테고리 코드 목록:', godoMallCategoryCode);

      // 순차적으로 각 URL과 카테고리 코드에 대해 크롤링 수행
      for (let i = 0; i < siteUrl.length; i++) {
        currentUrl = siteUrl[i];
const currentCategoryCode = godoMallCategoryCode[i];
        
        const remainingCategories = siteUrl.length - i - 1;

        // 진행 로그: 현재 크롤링할 URL과 남은 카테고리 수 출력
        console.log(`카테고리 ${i + 1}/${siteUrl.length} 수집 시작 - URL: ${currentUrl}`);
        console.log(`남은 카테고리 수: ${remainingCategories}`);

        // Rickowens 호출 (순차적으로 await 사용)
        await this.rickowensService.getProductsFromCategory(currentUrl, partnerKey, apiKey, customId, accountPlatform, currentCategoryCode);

        // 완료 로그: 현재 크롤링 완료 후 남은 작업 확인
        console.log(`카테고리 ${i + 1}/${siteUrl.length} 수집 완료 - URL: ${currentUrl}`);
      }

      // 모든 카테고리 수집 완료
      console.log('모든 카테고리 수집이 성공적으로 완료되었습니다.');
      return { message: `모든 Rickowens 카테고리 수집이 성공적으로 완료되었습니다.` };
    } catch (error: any) {
      console.error(`Rickowens ${currentUrl} 수집 중 오류 발생:`, error);
      throw error;
    }
  }

  @Post('start-Apc')
  async startApc(
    @Body('siteUrl') siteUrl: string[], // 여러 URL을 받아오도록 수정
    @Body('partnerKey') partnerKey: string,
    @Body('apiKey') apiKey: string,
    @Body('godoMallCategoryCode') godoMallCategoryCode: string[],
    @Body('customId') customId: string,
    @Body('accountPlatform') accountPlatform: string, // 여러 카테고리 코드 수집
  ) {
    let currentUrl = ''; // 🔹 try 바깥에서 선언 (초기값 설정)

    try {
      // 초기 로그: 전체 URL과 카테고리 코드 목록 출력
      console.log(`총 ${siteUrl.length}개의 카테고리를 수집합니다.`);
      console.log('수집할 URL 목록:', siteUrl);
      console.log('수집할 카테고리 코드 목록:', godoMallCategoryCode);

      // 순차적으로 각 URL과 카테고리 코드에 대해 크롤링 수행
      for (let i = 0; i < siteUrl.length; i++) {
        currentUrl = siteUrl[i];
const currentCategoryCode = godoMallCategoryCode[i];
        
        const remainingCategories = siteUrl.length - i - 1;

        // 진행 로그: 현재 크롤링할 URL과 남은 카테고리 수 출력
        console.log(`카테고리 ${i + 1}/${siteUrl.length} 수집 시작 - URL: ${currentUrl}`);
        console.log(`남은 카테고리 수: ${remainingCategories}`);

        // Apc 호출 (순차적으로 await 사용)
        await this.apcService.getProductsFromCategory(currentUrl, partnerKey, apiKey, customId, accountPlatform, currentCategoryCode);

        // 완료 로그: 현재 크롤링 완료 후 남은 작업 확인
        console.log(`카테고리 ${i + 1}/${siteUrl.length} 수집 완료 - URL: ${currentUrl}`);
      }

      // 모든 카테고리 수집 완료
      console.log('모든 카테고리 수집이 성공적으로 완료되었습니다.');
      return { message: `모든 Apc 카테고리 수집이 성공적으로 완료되었습니다.` };
    } catch (error: any) {
      console.error(`Apc ${currentUrl} 수집 중 오류 발생:`, error);
      throw error;
    }
  }

  @Post('start-Chloe')
  async startChloe(
    @Body('siteUrl') siteUrl: string[], // 여러 URL을 받아오도록 수정
    @Body('partnerKey') partnerKey: string,
    @Body('apiKey') apiKey: string,
    @Body('godoMallCategoryCode') godoMallCategoryCode: string[],
    @Body('customId') customId: string,
    @Body('accountPlatform') accountPlatform: string, // 여러 카테고리 코드 수집
  ) {
    let currentUrl = ''; // 🔹 try 바깥에서 선언 (초기값 설정)

    try {
      // 초기 로그: 전체 URL과 카테고리 코드 목록 출력
      console.log(`총 ${siteUrl.length}개의 카테고리를 수집합니다.`);
      console.log('수집할 URL 목록:', siteUrl);
      console.log('수집할 카테고리 코드 목록:', godoMallCategoryCode);

      // 순차적으로 각 URL과 카테고리 코드에 대해 크롤링 수행
      for (let i = 0; i < siteUrl.length; i++) {
        currentUrl = siteUrl[i];
const currentCategoryCode = godoMallCategoryCode[i];
        
        const remainingCategories = siteUrl.length - i - 1;

        // 진행 로그: 현재 크롤링할 URL과 남은 카테고리 수 출력
        console.log(`카테고리 ${i + 1}/${siteUrl.length} 수집 시작 - URL: ${currentUrl}`);
        console.log(`남은 카테고리 수: ${remainingCategories}`);

        // Chloe 호출 (순차적으로 await 사용)
        await this.chloeService.getProductsFromCategory(currentUrl, partnerKey, apiKey, customId, accountPlatform, currentCategoryCode);

        // 완료 로그: 현재 크롤링 완료 후 남은 작업 확인
        console.log(`카테고리 ${i + 1}/${siteUrl.length} 수집 완료 - URL: ${currentUrl}`);
      }

      // 모든 카테고리 수집 완료
      console.log('모든 카테고리 수집이 성공적으로 완료되었습니다.');
      return { message: `모든 Chloe 카테고리 수집이 성공적으로 완료되었습니다.` };
    } catch (error: any) {
      console.error(`Chloe ${currentUrl} 수집 중 오류 발생:`, error);
      throw error;
    }
  }

  @Post('start-Gucci')
  async startGucci(
    @Body('siteUrl') siteUrl: string[], // 여러 URL을 받아오도록 수정
    @Body('partnerKey') partnerKey: string,
    @Body('apiKey') apiKey: string,
    @Body('godoMallCategoryCode') godoMallCategoryCode: string[],
    @Body('customId') customId: string,
    @Body('accountPlatform') accountPlatform: string, // 여러 카테고리 코드 수집
  ) {
    let currentUrl = ''; // 🔹 try 바깥에서 선언 (초기값 설정)

    try {
      // 초기 로그: 전체 URL과 카테고리 코드 목록 출력
      console.log(`총 ${siteUrl.length}개의 카테고리를 수집합니다.`);
      console.log('수집할 URL 목록:', siteUrl);
      console.log('수집할 카테고리 코드 목록:', godoMallCategoryCode);

      // 순차적으로 각 URL과 카테고리 코드에 대해 크롤링 수행
      for (let i = 0; i < siteUrl.length; i++) {
        currentUrl = siteUrl[i];
const currentCategoryCode = godoMallCategoryCode[i];
        
        const remainingCategories = siteUrl.length - i - 1;

        // 진행 로그: 현재 크롤링할 URL과 남은 카테고리 수 출력
        console.log(`카테고리 ${i + 1}/${siteUrl.length} 수집 시작 - URL: ${currentUrl}`);
        console.log(`남은 카테고리 수: ${remainingCategories}`);

        // Gucci 호출 (순차적으로 await 사용)
        await this.gucciService.getProductsFromCategory(currentUrl, partnerKey, apiKey, customId, accountPlatform, currentCategoryCode);

        // 완료 로그: 현재 크롤링 완료 후 남은 작업 확인
        console.log(`카테고리 ${i + 1}/${siteUrl.length} 수집 완료 - URL: ${currentUrl}`);
      }

      // 모든 카테고리 수집 완료
      console.log('모든 카테고리 수집이 성공적으로 완료되었습니다.');
      return { message: `모든 Gucci 카테고리 수집이 성공적으로 완료되었습니다.` };
    } catch (error: any) {
      console.error(`Gucci ${currentUrl} 수집 중 오류 발생:`, error);
      throw error;
    }
  }

  @Post('start-Isabelmarant')
  async startIsabelmarant(
    @Body('siteUrl') siteUrl: string[], // 여러 URL을 받아오도록 수정
    @Body('partnerKey') partnerKey: string,
    @Body('apiKey') apiKey: string,
    @Body('godoMallCategoryCode') godoMallCategoryCode: string[],
    @Body('customId') customId: string,
    @Body('accountPlatform') accountPlatform: string, // 여러 카테고리 코드 수집
  ) {
    let currentUrl = ''; // 🔹 try 바깥에서 선언 (초기값 설정)

    try {
      // 초기 로그: 전체 URL과 카테고리 코드 목록 출력
      console.log(`총 ${siteUrl.length}개의 카테고리를 수집합니다.`);
      console.log('수집할 URL 목록:', siteUrl);
      console.log('수집할 카테고리 코드 목록:', godoMallCategoryCode);

      // 순차적으로 각 URL과 카테고리 코드에 대해 크롤링 수행
      for (let i = 0; i < siteUrl.length; i++) {
        currentUrl = siteUrl[i];
const currentCategoryCode = godoMallCategoryCode[i];
        
        const remainingCategories = siteUrl.length - i - 1;

        // 진행 로그: 현재 크롤링할 URL과 남은 카테고리 수 출력
        console.log(`카테고리 ${i + 1}/${siteUrl.length} 수집 시작 - URL: ${currentUrl}`);
        console.log(`남은 카테고리 수: ${remainingCategories}`);

        // Isabelmarant 호출 (순차적으로 await 사용)
        await this.isabelmarantService.getProductsFromCategory(currentUrl, partnerKey, apiKey, customId, accountPlatform, currentCategoryCode);

        // 완료 로그: 현재 크롤링 완료 후 남은 작업 확인
        console.log(`카테고리 ${i + 1}/${siteUrl.length} 수집 완료 - URL: ${currentUrl}`);
      }

      // 모든 카테고리 수집 완료
      console.log('모든 카테고리 수집이 성공적으로 완료되었습니다.');
      return { message: `모든 Isabelmarant 카테고리 수집이 성공적으로 완료되었습니다.` };
    } catch (error: any) {
      console.error(`Isabelmarant ${currentUrl} 수집 중 오류 발생:`, error);
      throw error;
    }
  }

  @Post('start-Longchamp')
  async startLongchamp(
    @Body('siteUrl') siteUrl: string[], // 여러 URL을 받아오도록 수정
    @Body('partnerKey') partnerKey: string,
    @Body('apiKey') apiKey: string,
    @Body('godoMallCategoryCode') godoMallCategoryCode: string[],
    @Body('customId') customId: string,
    @Body('accountPlatform') accountPlatform: string, // 여러 카테고리 코드 수집
  ) {
    let currentUrl = ''; // 🔹 try 바깥에서 선언 (초기값 설정)

    try {
      // 초기 로그: 전체 URL과 카테고리 코드 목록 출력
      console.log(`총 ${siteUrl.length}개의 카테고리를 수집합니다.`);
      console.log('수집할 URL 목록:', siteUrl);
      console.log('수집할 카테고리 코드 목록:', godoMallCategoryCode);

      // 순차적으로 각 URL과 카테고리 코드에 대해 크롤링 수행
      for (let i = 0; i < siteUrl.length; i++) {
        currentUrl = siteUrl[i];
const currentCategoryCode = godoMallCategoryCode[i];
        
        const remainingCategories = siteUrl.length - i - 1;

        // 진행 로그: 현재 크롤링할 URL과 남은 카테고리 수 출력
        console.log(`카테고리 ${i + 1}/${siteUrl.length} 수집 시작 - URL: ${currentUrl}`);
        console.log(`남은 카테고리 수: ${remainingCategories}`);

        // Longchamp 호출 (순차적으로 await 사용)
        await this.longchampService.getProductsFromCategory(currentUrl, partnerKey, apiKey, customId, accountPlatform, currentCategoryCode);

        // 완료 로그: 현재 크롤링 완료 후 남은 작업 확인
        console.log(`카테고리 ${i + 1}/${siteUrl.length} 수집 완료 - URL: ${currentUrl}`);
      }

      // 모든 카테고리 수집 완료
      console.log('모든 카테고리 수집이 성공적으로 완료되었습니다.');
      return { message: `모든 Longchamp 카테고리 수집이 성공적으로 완료되었습니다.` };
    } catch (error: any) {
      console.error(`Longchamp ${currentUrl} 수집 중 오류 발생:`, error);
      throw error;
    }
  }

  @Post('start-Maisonkitsune')
  async startMaisonkitsune(
    @Body('siteUrl') siteUrl: string[], // 여러 URL을 받아오도록 수정
    @Body('partnerKey') partnerKey: string,
    @Body('apiKey') apiKey: string,
    @Body('godoMallCategoryCode') godoMallCategoryCode: string[],
    @Body('customId') customId: string,
    @Body('accountPlatform') accountPlatform: string, // 여러 카테고리 코드 수집
  ) {
    let currentUrl = ''; // 🔹 try 바깥에서 선언 (초기값 설정)

    try {
      // 초기 로그: 전체 URL과 카테고리 코드 목록 출력
      console.log(`총 ${siteUrl.length}개의 카테고리를 수집합니다.`);
      console.log('수집할 URL 목록:', siteUrl);
      console.log('수집할 카테고리 코드 목록:', godoMallCategoryCode);

      // 순차적으로 각 URL과 카테고리 코드에 대해 크롤링 수행
      for (let i = 0; i < siteUrl.length; i++) {
        currentUrl = siteUrl[i];
const currentCategoryCode = godoMallCategoryCode[i];
        
        const remainingCategories = siteUrl.length - i - 1;

        // 진행 로그: 현재 크롤링할 URL과 남은 카테고리 수 출력
        console.log(`카테고리 ${i + 1}/${siteUrl.length} 수집 시작 - URL: ${currentUrl}`);
        console.log(`남은 카테고리 수: ${remainingCategories}`);

        // Maisonkitsune 호출 (순차적으로 await 사용)
        await this.maisonkitsuneService.getProductsFromCategory(currentUrl, partnerKey, apiKey, customId, accountPlatform, currentCategoryCode);

        // 완료 로그: 현재 크롤링 완료 후 남은 작업 확인
        console.log(`카테고리 ${i + 1}/${siteUrl.length} 수집 완료 - URL: ${currentUrl}`);
      }

      // 모든 카테고리 수집 완료
      console.log('모든 카테고리 수집이 성공적으로 완료되었습니다.');
      return { message: `모든 Maisonkitsune 카테고리 수집이 성공적으로 완료되었습니다.` };
    } catch (error: any) {
      console.error(`Maisonkitsune ${currentUrl} 수집 중 오류 발생:`, error);
      throw error;
    }
  }

  @Post('start-Maje')
  async startMaje(
    @Body('siteUrl') siteUrl: string[], // 여러 URL을 받아오도록 수정
    @Body('partnerKey') partnerKey: string,
    @Body('apiKey') apiKey: string,
    @Body('godoMallCategoryCode') godoMallCategoryCode: string[],
    @Body('customId') customId: string,
    @Body('accountPlatform') accountPlatform: string, // 여러 카테고리 코드 수집
  ) {
    let currentUrl = ''; // 🔹 try 바깥에서 선언 (초기값 설정)

    try {
      // 초기 로그: 전체 URL과 카테고리 코드 목록 출력
      console.log(`총 ${siteUrl.length}개의 카테고리를 수집합니다.`);
      console.log('수집할 URL 목록:', siteUrl);
      console.log('수집할 카테고리 코드 목록:', godoMallCategoryCode);

      // 순차적으로 각 URL과 카테고리 코드에 대해 크롤링 수행
      for (let i = 0; i < siteUrl.length; i++) {
        currentUrl = siteUrl[i];
const currentCategoryCode = godoMallCategoryCode[i];
        
        const remainingCategories = siteUrl.length - i - 1;

        // 진행 로그: 현재 크롤링할 URL과 남은 카테고리 수 출력
        console.log(`카테고리 ${i + 1}/${siteUrl.length} 수집 시작 - URL: ${currentUrl}`);
        console.log(`남은 카테고리 수: ${remainingCategories}`);

        // Maje 호출 (순차적으로 await 사용)
        await this.majeService.getProductsFromCategory(currentUrl, partnerKey, apiKey, customId, accountPlatform, currentCategoryCode);

        // 완료 로그: 현재 크롤링 완료 후 남은 작업 확인
        console.log(`카테고리 ${i + 1}/${siteUrl.length} 수집 완료 - URL: ${currentUrl}`);
      }

      // 모든 카테고리 수집 완료
      console.log('모든 카테고리 수집이 성공적으로 완료되었습니다.');
      return { message: `모든 Maje 카테고리 수집이 성공적으로 완료되었습니다.` };
    } catch (error: any) {
      console.error(`Maje ${currentUrl} 수집 중 오류 발생:`, error);
      throw error;
    }
  }


}


