import { forwardRef, Module } from '@nestjs/common';
import { CrawlerService } from './crawler.service';
import { CrawlerController } from './crawler.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from 'src/product/product.entity';
import { ProductModule } from 'src/product/product.module';
import { GodoMallModule } from 'src/godomall/godomall.module';
import { R2Service } from 'src/cloudflare/r2.service';
import { GodoMallService } from 'src/godomall/godomall.service';
import { MarginModule } from 'src/margin/margin.module';
import { WordReplacementModule } from 'src/word-replacement/word-replacement.module';
import { FarfetchModule } from 'src/farfetch/farfetch.module';
import { FarfetchDesigner } from 'src/category/FarfetchDesigner.entity';
import { FarfetchService } from 'src/farfetch/farfetch.service';
import { FarfetchController } from 'src/farfetch/farfetch.controller';
import { CettireService } from 'src/cettire/cettire.service';
import { CettireDesigner } from 'src/category/CettireDesigner.entity';
import { CettireModule } from 'src/cettire/cettire.module';
import { CettireController } from 'src/cettire/cettire.controller';
import { SmartstoreModule } from 'src/smartstore/smartstore.module';
import { Cafe24Module } from 'src/cafe24/cafe24.module';
import { MakeshopModule } from 'src/makeshop/makeshop.module';
import { SmartstoreService } from 'src/smartstore/smartstore.service';
import { SmartstoreApiService } from 'src/smartstore/smartstore-api.service';
import { HostingAccount } from 'src/hosting/hostingaccount.entity';
import { SmartStoreCategory } from 'src/category/SmartStoreCategory.entity';
import { MappingController } from 'src/mapping/mapping.controller';
import { MappingService } from 'src/mapping/mapping.service';
import { SelectedDesigners } from 'src/mapping/SelectedDesigners.entity';
import { PradaModule } from 'src/prada/prada.module';
import { PradaController } from 'src/prada/prada.controller';
import { LvModule } from 'src/lv/lv.module';
import { PradaService } from 'src/prada/prada.service';
import { LvService } from 'src/lv/lv.service';
import { LvController } from 'src/lv/lv.controller';
import { BalenciagaService } from 'src/balenciaga/balenciaga.service';
import { MiumiuService } from 'src/miumiu/miumiu.service';
import { BottegaService } from 'src/bottega/bottega.service';
import { FendiService } from 'src/fendi/fendi.service';
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
import { Mapping } from 'src/mapping/mapping.entity';
import { HostingModule } from 'src/hosting/hosting.module';
import { CategoryModule } from 'src/category/category.module';
import { UserModule } from 'src/user/user.module';
import { UserAuthModule } from 'src/user-auth/user-auth.module';


@Module({
  imports: [TypeOrmModule.forFeature([Product,FarfetchDesigner,CettireDesigner,SmartStoreCategory,SelectedDesigners,Mapping,HostingAccount
  ]),
  forwardRef(() => ProductModule),
  forwardRef(() => MarginModule),
  forwardRef(() => GodoMallModule),
  forwardRef(() => WordReplacementModule),
  forwardRef(() => FarfetchModule),
  forwardRef(() => CettireModule),
  forwardRef(() => SmartstoreModule),
  forwardRef(() => PradaModule),
  forwardRef(() => LvModule),
  forwardRef(() => HostingModule),
  forwardRef(() => CategoryModule),
    forwardRef(() => Cafe24Module),
  forwardRef(() => MakeshopModule),
    UserModule,
    UserAuthModule,
],
  controllers: [CrawlerController,FarfetchController,CettireController,MappingController,PradaController,LvController],
  providers: [CrawlerService,GodoMallService, R2Service, FarfetchService, CettireService, SmartstoreService, SmartstoreApiService,MappingService,PradaService,LvService,BalenciagaService,MiumiuService,BottegaService,FendiService,LoeweService,StoneService,LemaireService,FerragamoService,DolceService,TherowService,MaxmaraService,MonclerService,AlexanderService,GivenchyService,SandroService,TodsService,ValentinoService,AcneService,BrunelloService,HernoService,ThombrowneService,TomfordService,HermesService,AmiService,JacquemusService,JilsanderService,OurlegacyService,PoleneService,RickowensService],
  exports: [CrawlerService],
})
export class CrawlerModule {}


