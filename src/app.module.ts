import { Module, OnModuleInit } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CrawlerModule } from './crawler/crawler.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from './product/product.entity';
import { CrawlerService } from './crawler/crawler.service';
import { ProductModule } from './product/product.module';
import { GodoMallModule } from './godomall/godomall.module';
import { R2Service } from './cloudflare/r2.service';
import { GodoMallService } from './godomall/godomall.service';
import { CategoriesController } from './crawler/categories.controller';
import { CategoriesService } from './crawler/categories2.service'; // 새로 생성한 서비스 임포트
import { CategoryModule } from './category/category.module';
import { CategoryService } from './category/category.service';
import { GodoMallCategory } from './category/GodoMallCategory.entity';
import { MappingService } from './mapping/mapping.service';
import { MappingController } from './mapping/mapping.controller';
import { Margin } from './margin/margin.entity';
import { MarginService } from './margin/margin.service';
import { MarginModule } from './margin/margin.module';
import { R2Module } from './cloudflare/r2.module';
import { WordReplacementModule } from './word-replacement/word-replacement.module';
import { WordReplacement } from './word-replacement/word-replacement.entity';
import { WordReplacementController } from './word-replacement/word-replacement.controller';
import { WordReplacementService } from './word-replacement/word-replacement.service';
import { FarfetchModule } from './farfetch/farfetch.module';
import { FarfetchDesigner } from './category/FarfetchDesigner.entity';
import { CettireModule } from './cettire/cettire.module';
import { CettireDesigner } from './category/CettireDesigner.entity';
import { SmartstoreModule } from './smartstore/smartstore.module';
import { SmartStoreCategory } from './category/SmartStoreCategory.entity';
import { SmartstoreController } from './smartstore/smartstore.controller';
import { SmartstoreService } from './smartstore/smartstore.service';
import { GoogleTranslateService } from './smartstore/google-translate.service';
import { PradaModule } from './prada/prada.module';
import { LvModule } from './lv/lv.module';
import { DiorModule } from './dior/dior.module';
import { BurberryModule } from './burberry/burberry.module';
import { CelineModule } from './celine/celine.module';
import { BalenciagaModule } from './balenciaga/balenciaga.module';
import { MiumiuModule } from './miumiu/miumiu.module';
import { FendiModule } from './fendi/fendi.module';
import { BottegaModule } from './bottega/bottega.module';
import { LoropianaModule } from './loropiana/loropiana.module';
import { MaisonmargielaModule } from './maisonmargiela/maisonmargiela.module';
import { LoeweModule } from './loewe/loewe.module';
import { StoneModule } from './stone/stone.module';
import { LemaireModule } from './lemaire/lemaire.module';
import { DolceModule } from './dolce/dolce.module';
import { FerragamoModule } from './ferragamo/ferragamo.module';
import { TherowModule } from './therow/therow.module';
import { MaxmaraModule } from './maxmara/maxmara.module';
import { MonclerModule } from './moncler/moncler.module';
import { UpdateModule } from './update/update.module';
import { AlexanderModule } from './alexander/alexander.module';
import { ValentinoModule } from './valentino/valentino.module';
import { GivenchyModule } from './givenchy/givenchy.module';
import { SandroModule } from './sandro/sandro.module';
import { TodsModule } from './tods/tods.module';
import { HernoModule } from './herno/herno.module';
import { ThombrowneModule } from './thombrowne/thombrowne.module';
import { TomfordModule } from './tomford/tomford.module';
import { BrunelloModule } from './brunello/brunello.module';
import { AcneModule } from './acne/acne.module';
import { HermesModule } from './hermes/hermes.module';
import { AmiModule } from './ami/ami.module';
import { JacquemusModule } from './jacquemus/jacquemus.module';
import { JilsanderModule } from './jilsander/jilsander.module';
import { PoleneModule } from './polene/polene.module';
import { OurlegacyModule } from './ourlegacy/ourlegacy.module';
import { RickowensModule } from './rickowens/rickowens.module';
import { ApcModule } from './apc/apc.module';
import { ChloeModule } from './chloe/chloe.module';
import { IsabelmarantModule } from './isabelmarant/isabelmarant.module';
import { MaisonkitsuneModule } from './maisonkitsune/maisonkitsune.module';
import { MajeModule } from './maje/maje.module';
import { GucciModule } from './gucci/gucci.module';
import { LongchampModule } from './longchamp/longchamp.module';
import { CpcompanyModule } from './cpcompany/cpcompany.module';
import { RogervivierModule } from './rogervivier/rogervivier.module';
import { AlaiaModule } from './alaia/alaia.module';
import { TotemeModule } from './toteme/toteme.module';
import { DelvauxModule } from './delvaux/delvaux.module';
import { Mapping } from './mapping/mapping.entity';
import { SelectedDesigners } from './mapping/SelectedDesigners.entity';
import { Category } from './category/category.entity';
import { HostingModule } from './hosting/hosting.module';
import { HostingAccount } from './hosting/hostingaccount.entity';
import { User } from './user/user.entity';
import { HostingService } from './hosting/hosting.service';
import { ScheduleModule } from './schedule/schedule.module';
import { Schedule } from './schedule/schedule.entity';
import { ScheduleService } from './schedule/schedule.service';
import { Contact } from './user/contact.entity';
import { UserModule } from './user/user.module';
import { KakaotalkModule } from './kakaotalk/kakaotalk.module';
import { AdminAuthModule } from './admin-auth/admin-auth.module';
import { Cafe24Module } from './cafe24/cafe24.module';
import { MakeshopModule } from './makeshop/makeshop.module';
import { Cafe24Category } from './category/Cafe24Category.entity';
import { MakeshopCategory } from './category/MakeshopCategory.entity';
import { UserAuthModule } from './user-auth/user-auth.module';


@Module({
  imports: [
    TypeOrmModule.forFeature([SelectedDesigners,Mapping,Product,GodoMallCategory,Category,Margin,WordReplacement,FarfetchDesigner,CettireDesigner,SmartStoreCategory,HostingAccount,User,Schedule,Contact,Cafe24Category,MakeshopCategory
    ]),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: '192.168.55.149',
      port: 5432,
      username: 'postgres',
      password: '523164',
      database: 'postgres',
      autoLoadEntities: true, // 엔티티 연결
      synchronize: true,   // 개발 중에만 true (테이블 자동 생성)
    }),
    CrawlerModule,
    ProductModule,
    GodoMallModule,
    CategoryModule,
    MarginModule,
    R2Module,
    WordReplacementModule,
    FarfetchModule,
    CettireModule,
    SmartstoreModule,
    PradaModule,
    LvModule,
    DiorModule,
    BurberryModule,
    CelineModule,
    BalenciagaModule,
    MiumiuModule,
    FendiModule,
    BottegaModule,
    LoropianaModule,
    MaisonmargielaModule,
    LoeweModule,
    StoneModule,
    LemaireModule,
    DolceModule,
    FerragamoModule,
    TherowModule,
    MaxmaraModule,
    MonclerModule,
    UpdateModule,
    AlexanderModule,
    ValentinoModule,
    GivenchyModule,
    SandroModule,
    TodsModule,
    HernoModule,
    ThombrowneModule,
    TomfordModule,
    BrunelloModule,
    AcneModule,
    HermesModule,
    AmiModule,
    JacquemusModule,
    JilsanderModule,
    PoleneModule,
    OurlegacyModule,
    RickowensModule,
    ApcModule,
    ChloeModule,
    IsabelmarantModule,
    MaisonkitsuneModule,
    MajeModule,
    GucciModule,
    LongchampModule,
    CpcompanyModule,
    RogervivierModule,
    AlaiaModule,
    TotemeModule,
    DelvauxModule,
    HostingModule,
    UserModule,
    ScheduleModule,
    KakaotalkModule,
    AdminAuthModule,
    UserAuthModule,
    Cafe24Module,
    MakeshopModule,
  ],
  controllers: [AppController,CategoriesController,MappingController,WordReplacementController,SmartstoreController],
  providers: [WordReplacementService,MarginService, AppService, CrawlerService, R2Service, GodoMallService, CategoriesService,CategoryService,MappingService,SmartstoreService,GoogleTranslateService,HostingService,ScheduleService],
})

export class AppModule implements OnModuleInit {
  constructor(
  ) {}

  async onModuleInit() {
    console.log('서버 실행 중');
  }
}
