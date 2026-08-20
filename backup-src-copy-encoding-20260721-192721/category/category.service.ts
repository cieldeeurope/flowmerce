import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GodoMallCategory } from './GodoMallCategory.entity';
import { FarfetchDesigner } from './FarfetchDesigner.entity';
import { CettireDesigner } from './CettireDesigner.entity';
import { SmartStoreCategory } from './SmartStoreCategory.entity';
import { Cafe24Category } from './Cafe24Category.entity';
import { MakeshopCategory } from './MakeshopCategory.entity';
import { Category } from './category.entity';

@Injectable()
export class CategoryService {
  categoryService: any;
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,

    @InjectRepository(GodoMallCategory)
    private readonly godoMallRepository: Repository<GodoMallCategory>,

    @InjectRepository(SmartStoreCategory)
    private readonly smartStoreRepository: Repository<SmartStoreCategory>,

    @InjectRepository(Cafe24Category)
    private readonly cafe24Repository: Repository<Cafe24Category>,

    @InjectRepository(MakeshopCategory)
    private readonly makeshopRepository: Repository<MakeshopCategory>,

    @InjectRepository(FarfetchDesigner)
    private readonly farfetchDesignerRepository: Repository<FarfetchDesigner>,

    @InjectRepository(CettireDesigner)
    private readonly cettireDesignerRepository: Repository<CettireDesigner>,
    
  ) {}

  private normalizeFlatPlatformCategories(
    categories: Array<{
      categoryCode: string;
      categoryName: string;
      parentPath?: string | null;
    }>,
  ) {
    const unique = new Map<
      string,
      { categoryCode: string; categoryName: string; parentPath: string }
    >();

    for (const category of categories) {
      const categoryCode = String(category.categoryCode || '').trim();
      const categoryName = String(category.categoryName || '').trim();
      const parentPath = String(category.parentPath || '').trim();

      if (!categoryCode || !categoryName || unique.has(categoryCode)) {
        continue;
      }

      unique.set(categoryCode, {
        categoryCode,
        categoryName,
        parentPath,
      });
    }

    return [...unique.values()];
  }

  private async replaceFlatPlatformCategories<T extends {
    categoryCode: string;
    categoryName: string;
    parentPath?: string;
    customId?: string;
    accountPlatform: string;
  }>(
    repository: Repository<T>,
    categories: Array<{
      categoryCode: string;
      categoryName: string;
      parentPath?: string | null;
    }>,
    customId: string,
    accountPlatform: string,
  ) {
    const normalizedCategories = this.normalizeFlatPlatformCategories(categories);

    await repository.delete({ customId, accountPlatform } as any);

    if (normalizedCategories.length === 0) {
      return [];
    }

    const entities = normalizedCategories.map((category) =>
      repository.create({
        categoryCode: category.categoryCode,
        categoryName: category.categoryName,
        parentPath: category.parentPath || '',
        customId,
        accountPlatform,
      } as any),
    );

    return repository.save(entities as any);
  }
  async saveCategories(
    site: string,
    categories: any[],
  ): Promise<void> {
    const uniqueCategories = new Map<string, {
      categoryName: string;
      categoryTitle?: string | null;
      url: string;
      categoryNumbers?: string | null;
    }>();

    for (const category of categories) {
      const { categoryName, categoryTitle, url, categoryNumbers } = category;

      if (typeof categoryName !== 'string') {
        console.error('Invalid categoryName:', category);
        continue;
      }

      const normalizedName = categoryName
        .replace(/<[^>]*>/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      const normalizedUrl = String(url || '').trim();

      if (!normalizedName || !normalizedUrl) {
        continue;
      }

      uniqueCategories.set(normalizedUrl, {
        categoryName: normalizedName,
        categoryTitle: categoryTitle?.trim?.() ?? null,
        url: normalizedUrl,
        categoryNumbers: categoryNumbers?.trim?.() ?? categoryNumbers ?? null,
      });
    }

    if (uniqueCategories.size > 0) {
      const existingCategories = await this.categoryRepository.find({
        where: { site },
      });
      const existingUrlSet = new Set(
        existingCategories
          .map(category => String(category.url || '').trim())
          .filter(Boolean),
      );
      const sortedCategoryValues = Array.from(uniqueCategories.values()).sort((a, b) => {
        const nameCompare = a.categoryName.localeCompare(b.categoryName, 'ko-KR', {
          numeric: true,
          sensitivity: 'base',
        });

        if (nameCompare !== 0) {
          return nameCompare;
        }

        return a.url.localeCompare(b.url, 'ko-KR', {
          numeric: true,
          sensitivity: 'base',
        });
      });
      const newCategoryValues = sortedCategoryValues.filter(
        category => !existingUrlSet.has(category.url),
      );

      await this.categoryRepository.delete({ site });

      const entities = sortedCategoryValues.map(category =>
        this.categoryRepository.create({
          site,
          categoryName: category.categoryName,
          categoryTitle: category.categoryTitle,
          url: category.url,
          categoryNumbers: category.categoryNumbers,
        }),
      );

      await this.categoryRepository.save(entities);
      console.log('[' + site + '] source categories replaced: ' + entities.length);

      if (newCategoryValues.length > 0) {
        console.log('[' + site + '] new source category URLs: ' + newCategoryValues.length);
        for (const category of newCategoryValues) {
          console.log('[' + site + '] + ' + category.categoryName + ' => ' + category.url);
        }
      } else {
        console.log('[' + site + '] new source category URLs: 0');
      }
    } else {
      console.log('[' + site + '] source categories not replaced because no valid categories were received.');
    }
  }

 

  async saveGodoMallCategories(
    categories: string[],
    customId: string,
    accountPlatform: string
  ): Promise<void> {

    /* =========================
        1️⃣ 기존 데이터 삭제
    ========================= */
    await this.godoMallRepository.delete({ customId , accountPlatform });

    /* =========================
        2️⃣ 새 데이터 생성
    ========================= */
    const categoryEntities = categories.map(categoryPath => {
      const [categoryName, categoryCode] = categoryPath.split(' [');

      return {
        customId,
        accountPlatform,
        categoryName: categoryName.trim(),
        categoryCode: categoryCode?.replace(']', '').trim(),
        parentPath: categoryName.split(' > ').slice(0, -1).join(' > ').trim(),
        isDisplayed: true,
      };
    });

    /* =========================
        3️⃣ 한번에 저장
    ========================= */
    await this.godoMallRepository
      .createQueryBuilder()
      .insert()
      .values(categoryEntities)
      .execute();
  }

  async saveCafe24Categories(
    categories: Array<{
      categoryCode: string;
      categoryName: string;
      displayName?: string | null;
      parentPath?: string | null;
      parentCategoryCode?: string | null;
      fullCategoryCode?: string | null;
      categoryDepth?: number | null;
      rootCategoryCode?: string | null;
      displayType?: string | null;
      useDisplay?: string | null;
      useMain?: string | null;
    }>,
    customId: string,
    accountPlatform: string,
  ) {
    const normalizedCategories = this.normalizeFlatPlatformCategories(
      categories.map((category) => ({
        categoryCode: category.categoryCode,
        categoryName: category.categoryName,
        parentPath: category.parentPath,
      })),
    );

    const metadataByCode = new Map(
      categories.map((category) => [
        String(category.categoryCode || '').trim(),
        category,
      ]),
    );

    await this.cafe24Repository.delete({ customId, accountPlatform });

    if (normalizedCategories.length === 0) {
      return [];
    }

    const entities = normalizedCategories.map((category) => {
      const metadata = metadataByCode.get(category.categoryCode);

      return this.cafe24Repository.create({
        categoryCode: category.categoryCode,
        categoryName: category.categoryName,
        displayName: String(metadata?.displayName || '').trim(),
        parentPath: category.parentPath || '',
        parentCategoryCode: String(metadata?.parentCategoryCode || '').trim(),
        fullCategoryCode: String(metadata?.fullCategoryCode || '').trim(),
        categoryDepth:
          typeof metadata?.categoryDepth === 'number' &&
          Number.isFinite(metadata.categoryDepth)
            ? metadata.categoryDepth
            : null,
        rootCategoryCode: String(metadata?.rootCategoryCode || '').trim(),
        displayType: String(metadata?.displayType || '').trim(),
        useDisplay: String(metadata?.useDisplay || '').trim(),
        useMain: String(metadata?.useMain || '').trim(),
        customId,
        accountPlatform,
      });
    });

    return this.cafe24Repository.save(entities);
  }

  async saveMakeshopCategories(
    categories: Array<{
      categoryCode: string;
      categoryName: string;
      parentPath?: string | null;
    }>,
    customId: string,
    accountPlatform: string,
  ) {
    return this.replaceFlatPlatformCategories(
      this.makeshopRepository,
      categories,
      customId,
      accountPlatform,
    );
  }

  async saveFarfetchDesigners(designers: { name: string; code: string }[]): Promise<void> {
    const uniqueDesignersMap = new Map<string, { name: string; code: string }>();

    // 중복 제거: 같은 designerName을 가진 디자이너는 하나만 남기도록 합니다.
    for (const designer of designers) {
      const designerName = designer.name ? designer.name.trim() : '';
      const designerCode = designer.code ? designer.code.trim() : '';

      if (!uniqueDesignersMap.has(designerName)) {
        uniqueDesignersMap.set(designerName, { name: designerName, code: designerCode });
      }
    }

    const uniqueDesigners = Array.from(uniqueDesignersMap.values());
    const designerEntities = [];

    for (const designer of uniqueDesigners) {
      const existingDesigner = await this.farfetchDesignerRepository.findOne({
        where: { designerName: designer.name }
      });

      if (existingDesigner) {
        designerEntities.push(existingDesigner); // 이미 존재하는 디자이너는 업데이트 없이 추가
      } else {
        const newDesigner = this.farfetchDesignerRepository.create({
          designerName: designer.name,
          designerCode: designer.code
        });
        designerEntities.push(newDesigner);
      }
    }

    // 파페치 디자이너 저장 또는 업데이트
    await this.farfetchDesignerRepository.save(designerEntities);
    }

  async saveCettireDesigners(designers: { name: string; afterDesigner: string }[]): Promise<void> {
    const uniqueDesignersMap = new Map<string, { name: string; afterDesigner: string }>();

    // 중복 제거: 같은 designerName을 가진 디자이너는 하나만 남기도록 합니다.
    for (const designer of designers) {
      const designerName = designer.name ? designer.name.trim() : '';
      const afterDesigner = designer.afterDesigner ? designer.afterDesigner.trim() : '';

      if (!uniqueDesignersMap.has(designerName)) {
        uniqueDesignersMap.set(designerName, { name: designerName, afterDesigner: afterDesigner });
      }
    }

    const uniqueDesigners = Array.from(uniqueDesignersMap.values());
    const designerEntities = [];

    for (const designer of uniqueDesigners) {
      const existingDesigner = await this.cettireDesignerRepository.findOne({
        where: { designerName: designer.name }
      });

      if (existingDesigner) {
        designerEntities.push(existingDesigner); // 이미 존재하는 디자이너는 업데이트 없이 추가
      } else {
        const newDesigner = this.cettireDesignerRepository.create({
          designerName: designer.name,
          afterDesigner: designer.afterDesigner
        });
        designerEntities.push(newDesigner);
      }
    }

    // 파페치 디자이너 저장 또는 업데이트
    await this.cettireDesignerRepository.save(designerEntities);
  }


  async findAllCategories(site: string): Promise<Category[]> {
    return await this.categoryRepository.find({
      where: { site },
      order: {
        categoryName: 'ASC',
        url: 'ASC',
      },
    });
  }


  // 고도몰 카테고리 조회
  async findAllGodoMallCategories(customId: string, accountPlatform: string): Promise<GodoMallCategory[]> {
    // 데이터베이스에서 partnerKey와 apiKey가 일치하는 고도몰 카테고리만 조회
    return await this.godoMallRepository.find({
      where: {
        customId,
        accountPlatform,
      },
      order: {
        parentPath: 'ASC',  // 상위 경로 순
        categoryName: 'ASC' // 같은 경로 내에서는 이름순
      }
    });
  }

  
  // 스마트스토어 카테고리 조회
  async findAllSmartstoreCategories(customId: string, accountPlatform: string): Promise<SmartStoreCategory[]> {
    return await this.smartStoreRepository
      .createQueryBuilder("c")
      .where('c.customId = :customId', { customId })
      .andWhere('c.accountPlatform = :accountPlatform', { accountPlatform })
      .orderBy(`
        CASE 
          WHEN c.categoryName LIKE '패%' THEN 0
          ELSE 1
        END
      `)
      .addOrderBy("c.categoryName", "ASC") // 나머지 정상 오름차순
      .getMany();
  }

  async findAllCafe24Categories(
    customId: string,
    accountPlatform: string,
  ): Promise<Cafe24Category[]> {
    return await this.cafe24Repository.find({
      where: {
        customId,
        accountPlatform,
      },
      order: {
        categoryName: 'ASC',
      },
    });
  }

  async findAllMakeshopCategories(
    customId: string,
    accountPlatform: string,
  ): Promise<MakeshopCategory[]> {
    return await this.makeshopRepository.find({
      where: {
        customId,
        accountPlatform,
      },
      order: {
        categoryName: 'ASC',
      },
    });
  }


  // 파페치 디자이너 조회
  async findAllFarfetchDesigners(): Promise<FarfetchDesigner[]> {
    return await this.farfetchDesignerRepository.find({
        order: {
          designerName: 'ASC',  // 카테고리 이름을 오름차순으로 정렬
        },
    });
  }

  // 세타이어 디자이너 조회
  async findAllCettireDesigners(): Promise<CettireDesigner[]> {
    return await this.cettireDesignerRepository.find({
        order: {
          designerName: 'ASC',  // 카테고리 이름을 오름차순으로 정렬
        },
    });
  }
  
}
