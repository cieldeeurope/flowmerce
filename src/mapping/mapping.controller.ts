import { Controller, Get, Post, Body, Query, Param, UseGuards } from '@nestjs/common';
import { UserGuard } from 'src/user-auth/user.guard';
import { MappingService } from './mapping.service';
import { SelectedDesigners } from './SelectedDesigners.entity';  // SelectedDesigners 가져오기


@Controller('mapping')
@UseGuards(UserGuard)
export class MappingController {
  constructor(private readonly mappingService: MappingService) {}

  @Post('/delete')
    async deleteMapping(@Body() body: {
      site: string;
      siteUrl: string;
      customId: string;
      accountPlatform: string;
    }) {
      return this.mappingService.deleteMapping(body);
    }

  private saveBySite(site: string, body: any) {
    return this.mappingService.saveMapping({
      site,
      siteUrl: body.siteUrl,

      categoryName: body.categoryName,
      categoryTitle: body.categoryTitle,

      godoMallCategoryCode: body.godoMallCategoryCode,
      godoMallCategoryName: body.godoMallCategoryName,

      designers: body.designers,
      afterDesigners: body.afterDesigners,

      customId: body.customId,
      accountPlatform: body.accountPlatform,
    });
  }


  @Post('/ysl')
  saveYsl(@Body() body: any) {
    return this.saveBySite('YSL', body);
  }


  @Post('/farfetch')
  saveFarfetch(@Body() body: any) {
    return this.saveBySite('Farfetch', body);
  }


  @Post('/cettire')
  saveCettire(@Body() body: any) {
    return this.saveBySite('Cettire', body);
  }

  @Post('/prada')
  savePrada(@Body() body: any) {
    return this.saveBySite('Prada', body);
  }

  @Post('/lv')
  saveLv(@Body() body: any) {
    return this.saveBySite('Lv', body);
  }

  @Post('/dior')
  saveDior(@Body() body: any) {
    return this.saveBySite('Dior', body);
  }

  @Post('/burberry')
  saveBurberry(@Body() body: any) {
    return this.saveBySite('Burberry', body);
  }

  @Post('/celine')
  saveCeline(@Body() body: any) {
    return this.saveBySite('Celine', body);
  }

  @Post('/balenciaga')
  saveBalenciaga(@Body() body: any) {
    return this.saveBySite('Balenciaga', body);
  }

  @Post('/miumiu')
  saveMiumiu(@Body() body: any) {
    return this.saveBySite('Miumiu', body);
  }

  @Post('/bottega')
  saveBottega(@Body() body: any) {
    return this.saveBySite('Bottega', body);
  }

  @Post('/fendi')
  saveFendi(@Body() body: any) {
    return this.saveBySite('Fendi', body);
  }

  @Post('/loropiana')
  saveLoropiana(@Body() body: any) {
    return this.saveBySite('Loropiana', body);
  }

  @Post('/maisonmargiela')
  saveMaisonmargiela(@Body() body: any) {
    return this.saveBySite('Maisonmargiela', body);
  }

  @Post('/loewe')
  saveLoewe(@Body() body: any) {
    return this.saveBySite('Loewe', body);
  }

  @Post('/stone')
  saveStone(@Body() body: any) {
    return this.saveBySite('Stone', body);
  }

  @Post('/lemaire')
  saveLemaire(@Body() body: any) {
    return this.saveBySite('Lemaire', body);
  }

  @Post('/ferragamo')
  saveFerragamo(@Body() body: any) {
    return this.saveBySite('Ferragamo', body);
  }

  @Post('/dolce')
  saveDolce(@Body() body: any) {
    return this.saveBySite('Dolce', body);
  }

  @Post('/therow')
  saveTherow(@Body() body: any) {
    return this.saveBySite('Therow', body);
  }

  @Post('/maxmara')
  saveMaxmara(@Body() body: any) {
    return this.saveBySite('Maxmara', body);
  }

  @Post('/moncler')
  saveMoncler(@Body() body: any) {
    return this.saveBySite('Moncler', body);
  }

  @Post('/alexander')
  saveAlexander(@Body() body: any) {
    return this.saveBySite('Alexander', body);
  }

  @Post('/givenchy')
  saveGivenchy(@Body() body: any) {
    return this.saveBySite('Givenchy', body);
  }

  @Post('/sandro')
  saveSandro(@Body() body: any) {
    return this.saveBySite('Sandro', body);
  }

  @Post('/tods')
  saveTods(@Body() body: any) {
    return this.saveBySite('Tods', body);
  }

  @Post('/valentino')
  saveValentino(@Body() body: any) {
    return this.saveBySite('Valentino', body);
  }

  @Post('/acne')
  saveAcne(@Body() body: any) {
    return this.saveBySite('Acne', body);
  }

  @Post('/brunello')
  saveBrunello(@Body() body: any) {
    return this.saveBySite('Brunello', body);
  }

  @Post('/herno')
  saveHerno(@Body() body: any) {
    return this.saveBySite('Herno', body);
  }

  @Post('/thombrowne')
  saveThombrowne(@Body() body: any) {
    return this.saveBySite('Thombrowne', body);
  }

  @Post('/tomford')
  saveTomford(@Body() body: any) {
    return this.saveBySite('Tomford', body);
  }

  @Post('/hermes')
  saveHermes(@Body() body: any) {
    return this.saveBySite('Hermes', body);
  }

  @Post('/ami')
  saveAmi(@Body() body: any) {
    return this.saveBySite('Ami', body);
  }

  @Post('/jacquemus')
  saveJacquemus(@Body() body: any) {
    return this.saveBySite('Jacquemus', body);
  }

  @Post('/jilsander')
  saveJilsander(@Body() body: any) {
    return this.saveBySite('Jilsander', body);
  }

  @Post('/ourlegacy')
  saveOurlegacy(@Body() body: any) {
    return this.saveBySite('Ourlegacy', body);
  }

  @Post('/polene')
  savePolene(@Body() body: any) {
    return this.saveBySite('Polene', body);
  }

  @Post('/rickowens')
  saveRickowens(@Body() body: any) {
    return this.saveBySite('Rickowens', body);
  }

  @Post('/apc')
  saveApc(@Body() body: any) {
    return this.saveBySite('Apc', body);
  }

  @Post('/chloe')
  saveChloe(@Body() body: any) {
    return this.saveBySite('Chloe', body);
  }

  @Post('/gucci')
  saveGucci(@Body() body: any) {
    return this.saveBySite('Gucci', body);
  }

  @Post('/isabelmarant')
  saveIsabelmarant(@Body() body: any) {
    return this.saveBySite('Isabelmarant', body);
  }

  @Post('/longchamp')
  saveLongchamp(@Body() body: any) {
    return this.saveBySite('Longchamp', body);
  }

  @Post('/maisonkitsune')
  saveMaisonkitsune(@Body() body: any) {
    return this.saveBySite('Maisonkitsune', body);
  }

  @Post('/maje')
  saveMaje(@Body() body: any) {
    return this.saveBySite('Maje', body);
  }

  @Post('/save')
  async saveSelectedDesigners(
    @Body() data: {
      designerNames: string[],
      site: string,
      customId: string,
      accountPlatform: string,
    },
  ) {
    return this.mappingService.saveSelectedDesigners(
      data.designerNames,
      data.site,
      data.customId,
      data.accountPlatform,
    );
  }

  @Get('/load')
  async loadSelectedDesigners(
    @Query('site') site: string,
    @Query('customId') customId: string,
    @Query('accountPlatform') accountPlatform: string,
  ) {
    return this.mappingService.loadSelectedDesigners(
      site,
      customId,
      accountPlatform,
    );
  }

  // POST 요청을 통해 afterMytheresaUrl 처리를 시작하는 엔드포인트
  @Post('process-after-cettire-url')
  async processAfterCettireUrl(
    @Body('customId') customId: string,
    @Body('accountPlatform') accountPlatform: string,
  ) {
    return await this.mappingService.processAfterCettireUrls(customId, accountPlatform);
  }


  private getCollectionBySite(site: string, customId: string, accountPlatform: string) {
    return this.mappingService.getCollectionCategories(site, customId, accountPlatform);
  }

  // 이게 아래 Get :stie 보다 위에 있어야 함.
  @Get(':site-collection')
  getCollection(
    @Param('site') site: string,
    @Query('customId') customId: string,
    @Query('accountPlatform') accountPlatform: string,
  ) {
    if (!customId || !accountPlatform) {
      return { message: 'customId와 accountPlatform은 필수입니다.' };
    }

    // 🔥 아무 변환 없음 (핵심)
    return this.getCollectionBySite(site, customId, accountPlatform);
  }

  @Get(':site')
  getMappedCategories(
    @Param('site') site: string,
    @Query('customId') customId: string,
    @Query('accountPlatform') accountPlatform: string,
  ) {
    if (!customId || !accountPlatform) {
      return { message: 'customId와 accountPlatform은 필수입니다.' };
    }

    // 🔥 그대로 사용 (collection이랑 동일 철학)
    return this.mappingService.getMappedCategories(
      site,
      customId,
      accountPlatform,
    );
  }
}
