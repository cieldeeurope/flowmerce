import { forwardRef, Module } from '@nestjs/common';
import { SmartstoreService } from './smartstore.service';
import { SmartstoreController } from './smartstore.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from 'src/product/product.entity';
import { ProductModule } from 'src/product/product.module';
import { CategoryModule } from 'src/category/category.module';
import { MarginModule } from 'src/margin/margin.module';
import { WordReplacementModule } from 'src/word-replacement/word-replacement.module';
import { R2Service } from 'src/cloudflare/r2.service';
import { SmartStoreCategory } from 'src/category/SmartStoreCategory.entity';
import { SmartstoreApiService } from './smartstore-api.service';
import { CettireService } from 'src/cettire/cettire.service';
import { GodoMallModule } from 'src/godomall/godomall.module';
import { CrawlerModule } from 'src/crawler/crawler.module';
import { CrawlerService } from 'src/crawler/crawler.service';
import { GoogleTranslateService } from './google-translate.service';
import { PradaService } from 'src/prada/prada.service';
import { LvService } from 'src/lv/lv.service';
import { DiorService } from 'src/dior/dior.service';
import { OpenApiService } from './openApi.service';
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
import { Category } from 'src/category/category.entity';
import { Mapping } from 'src/mapping/mapping.entity';
import { HostingAccount } from 'src/hosting/hostingaccount.entity';
import { UserModule } from 'src/user/user.module';
import { Cafe24Module } from 'src/cafe24/cafe24.module';
import { MakeshopModule } from 'src/makeshop/makeshop.module';

@Module({
  imports: [
      TypeOrmModule.forFeature([SmartStoreCategory,Product,Category,Mapping,HostingAccount
      ]),
      forwardRef(() => ProductModule),
      forwardRef(() => MarginModule),
      forwardRef(() => CategoryModule),
      forwardRef(() => WordReplacementModule),
      forwardRef(() => GodoMallModule),
      forwardRef(() => CrawlerModule),
      forwardRef(() => Cafe24Module),
      forwardRef(() => MakeshopModule),
      UserModule,
    ],
  controllers: [SmartstoreController],
  providers: [SmartstoreService,R2Service,SmartstoreApiService,CettireService,CrawlerService,GoogleTranslateService,PradaService,LvService,DiorService,OpenApiService,BurberryService,CelineService,BalenciagaService,MiumiuService,BottegaService,FendiService,LoropianaService,MaisonmargielaService,LoeweService,StoneService,LemaireService,FerragamoService,DolceService,TherowService,MaxmaraService,MonclerService,AlexanderService,GivenchyService,SandroService,TodsService,ValentinoService,AcneService,BrunelloService,HernoService,ThombrowneService,TomfordService,HermesService,AmiService,JacquemusService,JilsanderService,OurlegacyService,PoleneService,RickowensService,ApcService,ChloeService,GucciService,IsabelmarantService,LongchampService,MaisonkitsuneService,MajeService],
  exports: [SmartstoreService,SmartstoreApiService,GoogleTranslateService,OpenApiService],
  
})
export class SmartstoreModule {}
