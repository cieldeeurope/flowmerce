import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SelectedDesigners } from './SelectedDesigners.entity';
import { CettireService } from 'src/cettire/cettire.service';
import { Mapping } from './mapping.entity';

function cleanMappingListToken(value: string): string {
  let token = String(value ?? '').trim();
  token = token.replace(/^[{\[]+|[}\]]+$/g, '').trim();

  if (
    (token.startsWith('"') && token.endsWith('"')) ||
    (token.startsWith("'") && token.endsWith("'"))
  ) {
    token = token.slice(1, -1).trim();
  }

  return token.replace(/\s+/g, ' ').trim();
}

function parseMappingTextList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return Array.from(
      new Set(
        value
          .flatMap((item) => parseMappingTextList(item))
          .map((item) => cleanMappingListToken(item))
          .filter(Boolean),
      ),
    );
  }

  if (value === null || value === undefined) {
    return [];
  }

  const raw = String(value).trim();
  if (!raw) {
    return [];
  }

  if (raw.startsWith('[') && raw.endsWith(']')) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parseMappingTextList(parsed);
      }
    } catch {
      // JSON 파싱 실패 시 아래 일반 파서로 계속 처리
    }
  }

  const looksStructured =
    (raw.startsWith('{') && raw.endsWith('}')) ||
    (raw.startsWith('[') && raw.endsWith(']'));

  if (looksStructured) {
    const quotedValues = Array.from(raw.matchAll(/"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'/g))
      .map((match) => cleanMappingListToken(match[1] ?? match[2] ?? ''))
      .filter(Boolean);

    if (quotedValues.length > 0) {
      return Array.from(new Set(quotedValues));
    }

    return Array.from(
      new Set(
        raw
          .slice(1, -1)
          .split(',')
          .map((item) => cleanMappingListToken(item))
          .filter(Boolean),
      ),
    );
  }

  return Array.from(
    new Set(
      raw
        .split(',')
        .map((item) => cleanMappingListToken(item))
        .filter(Boolean),
    ),
  );
}

function serializeMappingTextList(value: unknown): string | null {
  const values = parseMappingTextList(value);
  return values.length > 0 ? values.join(',') : null;
}

@Injectable()
export class MappingService {
  constructor(
    private readonly cettireService: CettireService,
    @InjectRepository(Mapping)
    private mappingRepository: Repository<Mapping>,
    @InjectRepository(SelectedDesigners)
    private selectedDesignersRepository: Repository<SelectedDesigners>,
  ) {}

  async deleteMapping(body: {
    site: string;
    siteUrl: string;
    customId: string;
    accountPlatform: string;
  }) {
    const { site, siteUrl, customId, accountPlatform } = body;

    return await this.mappingRepository.delete({
      site,
      siteUrl,
      customId,
      accountPlatform,
    });
  }

  async saveMapping(data: {
    site: string;
    siteUrl: string;
    categoryName: string;

    godoMallCategoryName?: string;
    godoMallCategoryCode: string;
    categoryTitle?: string;

    designers?: string | string[];
    afterDesigners?: string | string[];

    customId: string;
    accountPlatform: string;
  }): Promise<Mapping> {
    const normalizedData = {
      ...data,
      designers: serializeMappingTextList(data.designers),
      afterDesigners: serializeMappingTextList(data.afterDesigners),
    };

    const existing = await this.mappingRepository.findOne({
      where: {
        site: normalizedData.site,
        siteUrl: normalizedData.siteUrl,
        godoMallCategoryCode: normalizedData.godoMallCategoryCode ?? null,
        customId: normalizedData.customId,
        accountPlatform: normalizedData.accountPlatform,
      },
    });

    if (existing) {
      Object.assign(existing, normalizedData);
      return this.mappingRepository.save(existing);
    }

    const entity = this.mappingRepository.create({
      site: normalizedData.site,
      siteUrl: normalizedData.siteUrl,
      categoryName: normalizedData.categoryName,

      godoMallCategoryName: normalizedData.godoMallCategoryName ?? null,
      godoMallCategoryCode: normalizedData.godoMallCategoryCode ?? null,

      designers: normalizedData.designers,
      afterDesigners: normalizedData.afterDesigners,

      customId: normalizedData.customId,
      accountPlatform: normalizedData.accountPlatform,
    });

    return this.mappingRepository.save(entity);
  }


  async getMappedCategories(
    site: string,
    customId: string,
    accountPlatform: string,
  ): Promise<Mapping[]> {
    return await this.mappingRepository.find({
      where: {
        site,
        customId,
        accountPlatform,
      },
      order: {
        godoMallCategoryName: 'ASC',
      },
    });
  }

  // 디자이너 저장
  async saveSelectedDesigners(
    designerNames: string[],
    site: string,
    customId: string,
    accountPlatform: string,
  ): Promise<SelectedDesigners> {

    const existing = await this.selectedDesignersRepository.findOne({
      where: { site, customId, accountPlatform },
    });

    if (existing) {
      existing.designerNames = designerNames;
      return this.selectedDesignersRepository.save(existing);
    }

    return this.selectedDesignersRepository.save(
      this.selectedDesignersRepository.create({
        designerNames,
        site,
        customId,
        accountPlatform,
      })
    );
  }

  // 디자이너 불러오기
  async loadSelectedDesigners(
    site: string,
    customId: string,
    accountPlatform: string,
  ): Promise<string[]> {

    const entry = await this.selectedDesignersRepository.findOne({
      where: {
        site,
        customId,
        accountPlatform,
      },
      order: { id: 'DESC' },
    });

    return entry ? entry.designerNames : [];
  }

  // afterMytheresaUrl 처리 함수 실행
  async processAfterCettireUrls(customId:string ,accountPlatform:string) {
    return await this.cettireService.processAfterCettireUrl(customId,accountPlatform);
  }


  async getCollectionCategories(
    site: string,
    customId: string,
    accountPlatform: string,
  ): Promise<Mapping[]> {

    return await this.mappingRepository.find({
      where: {
        site,
        customId,
        accountPlatform,
      },
      select: [
        'godoMallCategoryName',
        'siteUrl',
        'godoMallCategoryCode',
        'categoryName',
      ],
      order: {
        godoMallCategoryName: 'ASC',
      }, // 👉 스마트스토어는 이게 더 자연스러움
    });
  }

}
