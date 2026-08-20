import { Controller, Post, Body, Get, Query, Delete, Param, UseGuards } from '@nestjs/common';
import { WordReplacementService } from './word-replacement.service';
import { WordReplacement } from './word-replacement.entity';
import { UserGuard } from 'src/user-auth/user.guard';

@Controller('word-replacement')
@UseGuards(UserGuard)
export class WordReplacementController {
  constructor(private readonly wordReplacementService: WordReplacementService) {}

  @Get('all')
  getAll(@Query('customId') customId: string) {
    return this.wordReplacementService.getAllReplacements(customId);
  }

  @Post('save')
  save(@Body() dto: WordReplacement) {
    return this.wordReplacementService.saveWordReplacement(dto);
  }

  @Delete(':id')
  delete(
    @Param('id') id: number,
    @Query('customId') customId: string,
  ) {
    return this.wordReplacementService.delete(id, customId);
  }
}
