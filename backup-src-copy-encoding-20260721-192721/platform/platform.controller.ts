import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { PlatformService } from './platform.service';

@Controller('platform')
export class PlatformController {
    constructor(private readonly platformService: PlatformService) {}

    @Get('targets')
    getTargets() {
        return this.platformService.getTargets();
    }

    @Get('categories')
    getCategories(
        @Query('targetPlatform') targetPlatform: string,
        @Query('scope') scope = 'all',
    ) {
        return this.platformService.getCategories(targetPlatform, scope);
    }

    @Post('categories/fetch')
    fetchCategories(
        @Query('targetPlatform') targetPlatform: string,
        @Query('scope') scope = 'all',
    ) {
        return this.platformService.fetchCategories(targetPlatform, scope);
    }

    @Get('mappings')
    getMappings(@Query() query: any) {
        return this.platformService.getMappings(query);
    }

    @Post('mappings')
    saveMapping(@Body() body: any) {
        return this.platformService.saveMapping(body);
    }

    @Delete('mappings/:id')
    deleteMapping(@Param('id') id: string, @Query('customId') customId: string) {
        return this.platformService.deleteMapping(Number(id), customId);
    }

    @Post('sync')
    syncProducts(@Body() body: any) {
        return this.platformService.syncProducts(body);
    }

    @Get('products')
    getProducts(@Query() query: any) {
        return this.platformService.getProducts(query);
    }
}
