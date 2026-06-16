import { Controller, Post, Body, Get, Delete, Param, Query, UseGuards } from '@nestjs/common';
import { MarginService } from './margin.service';
import { MarginDTO } from './margin.dto';
import { UserGuard } from 'src/user-auth/user.guard';

@Controller('margin')
@UseGuards(UserGuard)
export class MarginController {
  constructor(private readonly marginService: MarginService) {}

  @Post('save')
  async saveMargin(@Body() marginDto: MarginDTO) {
    return this.marginService.saveMargin(marginDto);
  }

  @Get('all')
  async getAllMargins(
    @Query('customId') customId: string,
    @Query('accountPlatform') accountPlatform: string,
  ) {
    return this.marginService.getAllMargins(customId, accountPlatform);
  }

  @Delete(':id')
  deleteMargin(
    @Param('id') id: number,
    @Query('customId') customId: string,
  ) {
    return this.marginService.deleteMargin(id, customId);
  }
}
