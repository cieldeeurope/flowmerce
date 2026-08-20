import { Global, Module } from '@nestjs/common';
import { UpdateService } from './update.service';
import { UpdateController } from './update.controller';

// ✅ 각 브랜드별 모듈 import
import { FarfetchModule } from 'src/farfetch/farfetch.module';
import { CettireModule } from 'src/cettire/cettire.module';
import { PradaModule } from 'src/prada/prada.module';
import { LvModule } from 'src/lv/lv.module';
import { DiorModule } from 'src/dior/dior.module';
import { BurberryModule } from 'src/burberry/burberry.module';
import { CelineModule } from 'src/celine/celine.module';
import { MiumiuModule } from 'src/miumiu/miumiu.module';
import { BalenciagaModule } from 'src/balenciaga/balenciaga.module';
import { BottegaModule } from 'src/bottega/bottega.module';
import { FendiModule } from 'src/fendi/fendi.module';
import { LoropianaModule } from 'src/loropiana/loropiana.module';
import { MaisonmargielaModule } from 'src/maisonmargiela/maisonmargiela.module';
import { LoeweModule } from 'src/loewe/loewe.module';
import { StoneModule } from 'src/stone/stone.module';
import { LemaireModule } from 'src/lemaire/lemaire.module';
import { FerragamoModule } from 'src/ferragamo/ferragamo.module';
import { DolceModule } from 'src/dolce/dolce.module';
import { TherowModule } from 'src/therow/therow.module';
import { MonclerModule } from 'src/moncler/moncler.module';
import { CrawlerModule } from 'src/crawler/crawler.module';
import { MaxmaraModule } from 'src/maxmara/maxmara.module';
import { AlexanderModule } from 'src/alexander/alexander.module';
import { ValentinoModule } from 'src/valentino/valentino.module';
import { GivenchyModule } from 'src/givenchy/givenchy.module';
import { SandroModule } from 'src/sandro/sandro.module';
import { TodsModule } from 'src/tods/tods.module';
import { AcneModule } from 'src/acne/acne.module';
import { BrunelloModule } from 'src/brunello/brunello.module';
import { HernoModule } from 'src/herno/herno.module';
import { ThombrowneModule } from 'src/thombrowne/thombrowne.module';
import { TomfordModule } from 'src/tomford/tomford.module';
import { HermesModule } from 'src/hermes/hermes.module';
import { AmiModule } from 'src/ami/ami.module';
import { JacquemusModule } from 'src/jacquemus/jacquemus.module';
import { JilsanderModule } from 'src/jilsander/jilsander.module';
import { PoleneModule } from 'src/polene/polene.module';
import { OurlegacyModule } from 'src/ourlegacy/ourlegacy.module';
import { RickowensModule } from 'src/rickowens/rickowens.module';
import { ApcModule } from 'src/apc/apc.module';
import { ChloeModule } from 'src/chloe/chloe.module';
import { IsabelmarantModule } from 'src/isabelmarant/isabelmarant.module';
import { MaisonkitsuneModule } from 'src/maisonkitsune/maisonkitsune.module';
import { MajeModule } from 'src/maje/maje.module';
import { GucciModule } from 'src/gucci/gucci.module';
import { LongchampModule } from 'src/longchamp/longchamp.module';
import { Product } from 'src/product/product.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UpdateGateway } from './update.gateway';
import { SitemapService } from './sitemap.service';
import { AlaiaModule } from 'src/alaia/alaia.module';
import { CpcompanyModule } from 'src/cpcompany/cpcompany.module';
import { DelvauxModule } from 'src/delvaux/delvaux.module';
import { RogervivierModule } from 'src/rogervivier/rogervivier.module';
import { TotemeModule } from 'src/toteme/toteme.module';
import { JimmychooModule } from 'src/jimmychoo/jimmychoo.module';
import { VersaceModule } from 'src/versace/versace.module';
import { BerlutiModule } from 'src/berluti/berluti.module';
import { OffwhiteModule } from 'src/offwhite/offwhite.module';
import { EtroModule } from 'src/etro/etro.module';



@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Product,
    ]),
    
    // ✅ 브랜드별 모듈 전부 등록
    FarfetchModule,
    CettireModule,
    CrawlerModule,
    PradaModule,
    LvModule,
    DiorModule,
    BurberryModule,
    CelineModule,
    MiumiuModule,
    BalenciagaModule,
    BottegaModule,
    FendiModule,
    LoropianaModule,
    MaisonmargielaModule,
    LoeweModule,
    StoneModule,
    LemaireModule,
    FerragamoModule,
    DolceModule,
    TherowModule,
    MonclerModule,
    MaxmaraModule,
    AlexanderModule,
    ValentinoModule,
    GivenchyModule,
    SandroModule,
    TodsModule,
    AcneModule,
    BrunelloModule,
    HernoModule,
    ThombrowneModule,
    TomfordModule,
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
    AlaiaModule,
    CpcompanyModule,
    DelvauxModule,
    RogervivierModule,
    TotemeModule,
    JimmychooModule,
    VersaceModule,
    BerlutiModule,
    OffwhiteModule,
    EtroModule,
  ],
  controllers: [UpdateController],
  providers: [UpdateService,UpdateGateway,SitemapService],
  exports: [UpdateGateway],
})
export class UpdateModule {}
