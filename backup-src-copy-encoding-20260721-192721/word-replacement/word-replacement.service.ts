import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WordReplacement } from './word-replacement.entity';

@Injectable()
export class WordReplacementService {
  constructor(
    @InjectRepository(WordReplacement)
    private readonly wordReplacementRepository: Repository<WordReplacement>,
  ) {}

  async delete(id: number, customId: string) {
    return this.wordReplacementRepository.delete({
      id,
      customId,
    });
  }

  async saveWordReplacement(dto: WordReplacement) {
    if (dto.id) {
      const existing = await this.wordReplacementRepository.findOne({
        where: {
          id: dto.id,
          customId: dto.customId,
        },
      });

      if (!existing) {
        throw new Error('수정 권한이 없는 치환 규칙입니다.');
      }

      Object.assign(existing, dto);
      return this.wordReplacementRepository.save(existing);
    }

    return this.wordReplacementRepository.save(dto);
  }

  async getAllReplacements(customId: string) {
    return this.wordReplacementRepository.find({ where: { customId } });
  }

  async applyReplacements(productTitle: string, customId: string): Promise<string> {
    const replacements = await this.getAllReplacements(customId);

    replacements.sort((a, b) => b.beforeWord.length - a.beforeWord.length);

    let modifiedTitle = productTitle;

    replacements.forEach((replacement) => {
      const regex = new RegExp(replacement.beforeWord, 'gi');
      modifiedTitle = modifiedTitle.replace(regex, replacement.afterWord);
    });

    return modifiedTitle;
  }
}
