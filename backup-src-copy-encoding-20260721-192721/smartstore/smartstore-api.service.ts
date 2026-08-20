import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SmartStoreProductModel } from './dto/smartstore-product.dto';
import { SmartstoreService } from './smartstore.service';
import { MarginService } from 'src/margin/margin.service';
import { WordReplacementService } from 'src/word-replacement/word-replacement.service';
import { Product } from 'src/product/product.entity';
import { OpenApiService } from "./openApi.service";
import { HostingAccount } from 'src/hosting/hostingaccount.entity';
import { getResolvedMarketplacePolicy } from 'src/hosting/marketplace-policy';
import { UserService } from 'src/user/user.service';



@Injectable()
export class SmartstoreApiService {
  private readonly API_URL = 'https://api.commerce.naver.com/external';

  private async saveProduct(product: Product) {
    await this.productRepository.save(product);
  }


  constructor(
    private readonly openApiService: OpenApiService,
    private readonly smartstoreService: SmartstoreService, // API 호출 서비스
    private readonly marginService: MarginService,
    private readonly wordReplacementService: WordReplacementService,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(HostingAccount)
    private readonly hostingAccountRepository: Repository<HostingAccount>, 
    private readonly userService: UserService,
  ) {}


  async createThumbnailImages(
    auth: { smartStoreID: string; smartStoreSecret: string },
    model: SmartStoreProductModel,
    thumbnailUrls: string[],
    originThumbnailUrls: string[],
    imageUrls?: string[],
    referer?: string,
  ): Promise<{ url: string }[]> {
    let attempt = 0;
    let result;
    let lastError: any;
    while (attempt < 3) {
      try {
        result =
          imageUrls && imageUrls.length > 0
            ? await this.smartstoreService.uploadProductImageUrls(
                auth,
                imageUrls,
                referer,
              )
            : await this.smartstoreService.uploadProductImageList(
                auth,
                thumbnailUrls,
                originThumbnailUrls
              );
        // 성공 시 break
        break;
      } catch (e: any) {
        lastError = e;
        if (e.message && e.message.includes("socket hang up")) {
          attempt++;
          console.warn(`Socket hang up detected, retrying... (${attempt}/3)`);
          // 재시도 전 약간의 대기 시간 추가 (예: 1초)
          await new Promise((resolve) => setTimeout(resolve, 1000));
          continue;
        } else {
          console.error('이미지업로드에러\r\n', e.message);
          throw e;
        }
      }
    }
  
    if (!result) {
      const fallbackImages: { url: string }[] = [];

      if (imageUrls && imageUrls.length > 0) {
        for (const imageUrl of imageUrls) {
          try {
            const singleResult = await this.smartstoreService.uploadProductImageUrls(
              auth,
              [imageUrl],
              referer,
            );

            if (singleResult?.images?.[0]?.url) {
              fallbackImages.push(singleResult.images[0]);
            }
          } catch (fallbackError: any) {
            console.warn(
              `스마트스토어 이미지 단건 업로드 실패: ${imageUrl}`,
              fallbackError?.message || fallbackError,
            );
          }
        }
      } else {
        for (let i = 0; i < thumbnailUrls.length; i += 1) {
          try {
            const singleResult = await this.smartstoreService.uploadProductImageList(
              auth,
              [thumbnailUrls[i]],
              [originThumbnailUrls[i]],
            );

            if (singleResult?.images?.[0]?.url) {
              fallbackImages.push(singleResult.images[0]);
            }
          } catch (fallbackError: any) {
            console.warn(
              `스마트스토어 이미지 단건 업로드 실패: ${originThumbnailUrls[i] || i}`,
              fallbackError?.message || fallbackError,
            );
          }
        }
      }

      if (fallbackImages.length > 0) {
        result = { images: fallbackImages };
      }
    }

    if (!result) {
      throw new Error("이미지 업로드 재시도 실패");
    }
  
    if (!result.images?.length) {
      throw new Error(
        `이미지 업로드 결과가 비어 있습니다${lastError?.message ? `: ${lastError.message}` : ''}`,
      );
    }

    model.originProduct.images = {
      representativeImage: {
        url: result.images[0].url,
      },
      optionalImages: result.images.slice(1).map((image) => ({
        url: image.url,
      })),
    };
    return result.images;
  }
  






  /**
   * ✅ 스마트스토어 상품 등록
   */
  async createSmartStoreProduct(
    product: Product,
    auth: { smartStoreID: string; smartStoreSecret: string },
    imageData: {
      base64ImageList?: string[];
      originThumbnailUrls?: string[];
      imageUrls?: string[];
      referer?: string;
    },
    godoMallCategoryName: string,
  ): Promise<number | null> {
  const objForCreate = new SmartStoreProductModel();
  let productTitle = '';
  try {


    const site = product.site;

    product.designer = await this.wordReplacementService.applyReplacements(product.designer, product.customId);
    product.title = await this.wordReplacementService.applyReplacements(product.title, product.customId);
    product.color = await this.wordReplacementService.applyReplacements(product.color, product.customId);

    // 👉 번역 없이 mainInfo만 정제
    if (['Burberry', 'Dolce', 'Herno'].includes(site)) {
      product.mainInfo = await this.openApiService.refineMainInfo(product.mainInfo);
    } else {
      // 👉 언어 결정
      let lang: 'fr' | 'nl' | 'en' = 'en';

      if (['Dior', 'Sandro', 'Tods'].includes(site)) {
        lang = 'fr';
      } else if (site === 'Longchamp') {
        lang = 'nl';
      }

      const translated = await this.openApiService.translateProductFields(
        {
          title: product.title,
          madeIn: product.madeIn,
          color: product.color,
        },
        lang
      );

      product.title = translated.title;
      product.madeIn = translated.madeIn;
      product.color = translated.color;

      product.mainInfo = await this.openApiService.refineMainInfo(product.mainInfo);
    }

    // 상품명 치환 로직
    const modifiedTitle = await this.wordReplacementService.applyReplacements(product.title,product.customId);
    const modifiedDesigner = await this.wordReplacementService.applyReplacements(product.designer,product.customId);
    const modifiedColor = await this.wordReplacementService.applyReplacements(product.color,product.customId);
  
    product.designer = modifiedDesigner;
    product.title = modifiedTitle;
    product.color = modifiedColor;

    if (product.site === 'Dior') {
      // Dior 로직
      productTitle = `${product.designer} ${product.title} ${product.styleId}`;

      if (product.title.includes(product.designer)) {
        productTitle = `${product.title} ${product.styleId}`;
      }

    } else {
      // 그 외 모든 브랜드
      productTitle = `${product.designer} ${product.title} ${product.color} ${product.styleId}`;

      if (product.title.includes(product.designer)) {
        productTitle = `${product.title} ${product.color} ${product.styleId}`;
      }
    }

    // 공통 문자 치환
    productTitle = productTitle
      .replace(/[\*?"<>]/g, '')               // 특수 문자 제거
      .replace(/&/g, '&amp;')                 // & → &amp;
      .replace(/</g, '&lt;')                  // < → &lt;
      .replace(/>/g, '&gt;')                  // > → &gt;
      .replace(/"/g, '&quot;')                // " → &quot;
      .replace(/'/g, '&apos;')                // ' → &apos;
      .replace(/-/g, ' ');                    // 하이픈(-) → 공백
    

    productTitle = await this.openApiService.refineTitle(product.designer,productTitle,godoMallCategoryName);
    productTitle = await this.wordReplacementService.applyReplacements(productTitle,product.customId);

    // ✅ 상품 정보 변환
    
    objForCreate.originProduct.statusType = 'SALE';
    objForCreate.originProduct.saleType = 'NEW';
    objForCreate.originProduct.leafCategoryId = product.godoMallCategoryCode; 
    objForCreate.originProduct.name = productTitle;
    objForCreate.originProduct.salePrice = product.price;
    objForCreate.originProduct.stockQuantity = 9999;
    // objForCreate.originProduct.customerBenefit = {
    //   purchasePointPolicy: {
    //     value: 4000,
    //     unitType: 'WON',
    //   },
    //   reviewPointPolicy: {
    //     textReviewPoint: 500,
    //     photoVideoReviewPoint: 1500,
    //   }
    // }
    

    // 수정된 부분: 전달받은 imageData를 사용하여 스마트스토어 이미지 업로드
    const images = await this.createThumbnailImages(
      auth,
      objForCreate,
      imageData.base64ImageList || [],
      imageData.originThumbnailUrls || [],
      imageData.imageUrls || [],
      imageData.referer,
    );
    // ✅ 변환된 이미지 URL 리스트 생성
    const uploadedImageUrls = [
      objForCreate.originProduct.images.representativeImage.url,
      ...objForCreate.originProduct.images.optionalImages.map(img => img.url)
    ];

    // ✅ 상품 옵션 설정 (옵션 조합 및 가격 설정)
    await this.setOptionCombination(objForCreate, product);

    product.price = objForCreate.originProduct.salePrice;


    const account = await this.hostingAccountRepository.findOne({
      where: { 
        partnerKey: auth.smartStoreID,
        apiKey: auth.smartStoreSecret
      }
    });

    // ✅ 상세 설명 설정 (string[] 타입 전달)
    objForCreate.originProduct.detailContent = this.createContent(product, uploadedImageUrls,account?.topImages,account?.bottomImages)
        .replace(/re2/gi, '');


    // ✅ 배송 정보 및 상세 정보 설정
    this.setDeliveryInfo(objForCreate, account);
    this.setClaimInfo(objForCreate, account);
    await this.setDetailAttribute(objForCreate, {
      tags: product.title.replace('[빠른배송] ', '').replace('[국내AS가능] ', '').split(' '),
      brandName: product.designer,
      brandStyleId: product.brandstyleId,
      site: product.site,
      code: product.styleId,
    },product, account);

    const result = await this.smartstoreService.createProduct(auth, objForCreate);
    
    // 반환된 결과의 smartstoreChannelProductNo를 바로 사용
    product.smartstoreChannelProductNo = result.smartstoreChannelProductNo;
    product.platform = 'smartstore';

    // DB 반영용 업데이트
    product.title = productTitle; // 최종 상품명
    product.price = objForCreate.originProduct.salePrice; // 최종 가격
    product.mainImageUrl = objForCreate.originProduct.images.representativeImage.url;
    product.additionalImageUrls = objForCreate.originProduct.images.optionalImages.map(img => img.url);
    product.mainInfo = objForCreate.originProduct.detailContent;
    product.godoMallCategoryCode = objForCreate.originProduct.leafCategoryId;
    product.madeIn = product.madeIn;
    product.color = product.color;
    
    // 엔티티 타입에 따라 DB 저장 처리
    if (product instanceof Product) {
      await this.productRepository.save(product);
    } 




    
    console.log(`✅ 스마트스토어 상품 등록 완료: ${product.title}`);
    
    return result.smartstoreChannelProductNo;
  } catch (error: any) {
        const errorData = error?.response?.data;
        const errorMsg = errorData || error?.message;
        const errorString = JSON.stringify(errorMsg ?? '');

        console.error('❌ 스마트스토어 상품 등록 실패:', errorMsg);

        // 400 BAD_REQUEST 상세 출력 (invalidInputs 포함)
        if (errorData?.code === 'BAD_REQUEST') {
          console.error(`❌ 상품등록 실패 (400 Bad Request): ${product.designer} ${product.title} ${product.styleId}`);
          console.error(`- code: ${errorData.code}`);
          console.error(`- message: ${errorData.message}`);
          console.error(`- timestamp: ${errorData.timestamp}`);

          if (Array.isArray(errorData.invalidInputs)) {
            errorData.invalidInputs.forEach((input: any, idx: number) => {
              console.error(`  [${idx + 1}] name=${input.name}, type=${input.type}, message=${input.message}`);
            });
          }
        }

        // 💡 속성 관련 오류일 경우만 재시도
        const isAttributeError =
          errorString.includes('productAttributes') ||
          errorString.includes('attribute') ||
          errorString.includes('attributeRealValue');

        if (isAttributeError) {
          console.warn('⚠️ 속성 관련 오류 감지 - 속성 제거 후 재등록 시도');

          // 속성만 제거 (나머지 상품 정보는 그대로 유지)
          objForCreate.originProduct.detailAttribute.productAttributes = [];

          try {
            const retryResult = await this.smartstoreService.createProduct(auth, objForCreate);

            // ✅ 재등록 성공
            product.smartstoreChannelProductNo = retryResult.smartstoreChannelProductNo;
            product.platform = 'smartstore';
            product.title = productTitle; // 최종 상품명
            product.price = objForCreate.originProduct.salePrice; // 최종 가격
            product.mainImageUrl = objForCreate.originProduct.images.representativeImage.url;
            product.additionalImageUrls = objForCreate.originProduct.images.optionalImages.map(img => img.url);
            product.mainInfo = objForCreate.originProduct.detailContent;
            product.godoMallCategoryCode = objForCreate.originProduct.leafCategoryId;
            product.madeIn = product.madeIn;
            product.color = product.color;
            await this.saveProduct(product);

            console.log(`✅ 재등록 성공 (속성 제거): ${product.designer} ${product.title}`);
            return retryResult.smartstoreChannelProductNo;

          } catch (retryError: any) {
            const retryData = retryError?.response?.data;
            const retryMsg = retryData || retryError?.message;

            console.error('❌ 재등록 실패:', retryMsg);

            // 재시도 실패했지만 채널번호가 응답/기존에 있으면 보존
            const retryChannelNo =
              retryData?.smartstoreChannelProductNo ??
              product.smartstoreChannelProductNo;

            if (retryChannelNo) {
              product.smartstoreChannelProductNo = retryChannelNo;
              product.platform = 'smartstore';
              await this.saveProduct(product);
              console.warn(`⚠️ 재등록 실패했지만 번호(${retryChannelNo}) 확보하여 저장`);
              return retryChannelNo;
            }

            return null;
          }
        }

        // 속성 오류가 아니더라도, 혹시 상품번호가 있으면 저장
        const channelNo =
          errorData?.smartstoreChannelProductNo ??
          product.smartstoreChannelProductNo;

        if (channelNo) {
          product.smartstoreChannelProductNo = channelNo;
          product.platform = 'smartstore';
          await this.saveProduct(product);
          console.warn(`⚠️ 등록 실패 로그지만 번호(${channelNo}) 확보하여 저장`);
          return channelNo;
        }

        // 최종 실패
        throw error;
      }
  }


  /**
   * 📦 배송 정보 설정
   */
  private setDeliveryInfo(
    model: SmartStoreProductModel,
    account?: HostingAccount | null,
  ) {
    const policy = getResolvedMarketplacePolicy(account?.marketplacePolicy);
    model.originProduct.deliveryInfo.deliveryType =
      policy.smartstore.deliveryType;
    model.originProduct.deliveryInfo.deliveryAttributeType =
      policy.smartstore.deliveryAttributeType;
    model.originProduct.deliveryInfo.deliveryCompany =
      policy.smartstore.deliveryCompany;
    model.originProduct.deliveryInfo.deliveryFee.deliveryFeeType =
      policy.smartstore.deliveryFeeType as any;
  }

  /**
   * 🔄 반품 및 교환 정보 설정
   */
  private setClaimInfo(
    model: SmartStoreProductModel,
    account?: HostingAccount | null,
  ) {
    const policy = getResolvedMarketplacePolicy(account?.marketplacePolicy);
    model.originProduct.deliveryInfo.claimDeliveryInfo.returnDeliveryCompanyPriorityType =
      policy.smartstore.returnDeliveryCompanyPriorityType as any;
    model.originProduct.deliveryInfo.claimDeliveryInfo.returnDeliveryFee =
      policy.smartstore.returnDeliveryFee;
    model.originProduct.deliveryInfo.claimDeliveryInfo.exchangeDeliveryFee =
      policy.smartstore.exchangeDeliveryFee;
  }



  private async setOptionCombination(model: SmartStoreProductModel, product: Product
  ) {
    // ✅ 사이즈와 추가 옵션 가격 변환
    const sizesArray = typeof product.size === 'string' && product.size !== '원사이즈'
        ? product.size.split(',').map(s => s.trim()).filter(Boolean)
        : ['원사이즈'];

    const pricesArray = typeof product.addoptionprice === 'string' && product.addoptionprice !== '0' 
        ? product.addoptionprice.split(',').map(p => Number(p.trim()))
        : sizesArray.map(() => 0); // ✅ 사이즈 개수만큼 0원으로 설정

    // ✅ 추가: product.addoptionprice가 null이거나 undefined일 경우 0으로 강제 설정
    if (!product.addoptionprice || product.addoptionprice === null || product.addoptionprice === undefined) {
      product.addoptionprice = '0';  // 문자열 '0'을 할당하여 split할 때 오류 방지
    }

    // ✅ 옵션 리스트 매핑
    let sellingOptionList = sizesArray.map((size, index) => ({
      size: size,
      addoptionprice: pricesArray[index] || 0, // ✅ 가격이 없거나 null이면 0
    }));

    // ✅ 옵션이 없을 경우 기본 "원사이즈" 등록
    if (sellingOptionList.length === 0) {
        sellingOptionList.push({
            size: '원사이즈',
            addoptionprice: 0,
        });
    }


    // 🔥 마진 + 환율 한번만 가져오기
    const allMargins = await this.marginService.getAllMargins(
      product.customId,
      product.accountPlatform
    );

    const normalizeSite = (value?: string | null) =>
      String(value || '').trim().toLowerCase();

    const siteMargins = allMargins.filter(
      (margin) => normalizeSite(margin.site) === normalizeSite(product.site),
    );

    const marginSource = siteMargins[0] || allMargins[0];

    // 🔥 기본값
    let exchangeRate = 1;
    let discountRate = 0;

    // 🔥 하나 기준
    if (marginSource) {
      if (marginSource.exchangeRate && marginSource.exchangeRate > 0) {
        exchangeRate = marginSource.exchangeRate;
      }

      if (marginSource.discountRate && marginSource.discountRate > 0) {
        discountRate = marginSource.discountRate;
      }
    } else {
      console.warn(
        `[MARGIN] no rows customId=${product.customId || ''} accountPlatform=${product.accountPlatform || ''} site=${product.site || ''}`,
      );
    }

    // 🔥 안전 처리
    discountRate = Math.max(0, Math.min(discountRate, 100));

    let priceInWon = product.price * exchangeRate * (1 - discountRate / 100);


    // =========================
    // 2️⃣ 카테고리 로직
    // =========================
    const isBag = /bags|bag|coin|handbags|travel|small leather goods|small-leather-goods|jewelry|jewellery|wallets|가방|지갑/i
      .test(product.categoryName);

    if (isBag && priceInWon >= 2000000) {
      const excessAmount = priceInWon - 2000000;
      const additionalAmount = excessAmount * 0.2 * 1.3;
      priceInWon = (priceInWon + additionalAmount) * 1.1;
    } else {
      priceInWon *= 1.1;
    }


    // =========================
    // 3️⃣ 옵션 최저가 계산
    // =========================
    const lowPrice = Math.min(
      ...sellingOptionList.map(option => priceInWon + option.addoptionprice)
    );


    // =========================
    // 4️⃣ 옵션 필터링 (1.5배 컷)
    // =========================
    sellingOptionList = sellingOptionList.filter(
      option => (priceInWon + option.addoptionprice) < lowPrice * 1.5
    );


    // =========================
    // 5️⃣ 마진 적용
    // =========================
    let finalPrice = lowPrice;

    const applicableMargins = siteMargins;

    for (const margin of applicableMargins) {
      if (finalPrice >= margin.minAmount && finalPrice <= margin.maxAmount) {

        finalPrice += finalPrice * (margin.marginValue / 100);
        finalPrice += margin.minMargin;

        break;
      }
    }


    // =========================
    // 6️⃣ 관세 (EU 체크)
    // =========================
    if (product.madeIn && product.madeIn.trim() !== '') {

      const countryList = [
        '오스트리아','Austria','벨기에','Belgium','프랑스','France','독일','Germany',
        '이탈리아','Italy','Italia','Italie','스페인','Spain',
        '네덜란드','Netherlands','Holland','포르투갈','Portugal',
        '아일랜드','Ireland','룩셈부르크','Luxembourg',
        '덴마크','Denmark','스웨덴','Sweden','핀란드','Finland',
        '체코','Czech Republic','Czechia','헝가리','Hungary',
        '폴란드','Poland','슬로바키아','Slovakia','슬로베니아','Slovenia',
        '루마니아','Romania','불가리아','Bulgaria','크로아티아','Croatia',
        '에스토니아','Estonia','라트비아','Latvia','리투아니아','Lithuania',
        '몰타','Malta','키프로스','Cyprus',
      ];

      const madeInNormalized = product.madeIn.toLowerCase();

      const isEU = countryList.some(country =>
        madeInNormalized.includes(country.toLowerCase())
      );

      if (!isEU) {
        finalPrice += finalPrice * 0.13;
      }
    }


    // =========================
    // 7️⃣ 반올림
    // =========================
    finalPrice = Math.round(finalPrice / 10) * 10;


    // =========================
    // 8️⃣ 적용
    // =========================
    model.originProduct.salePrice = finalPrice;
    product.price = finalPrice;


    // ✅ 사이즈 옵션 자동 구분 (컬러 미사용)
    const optionGroupName =
      sellingOptionList.length === 1 && sellingOptionList[0].size === '원사이즈'
        ? '원사이즈'
        : '사이즈';

    model.originProduct.detailAttribute.
    optionInfo = {
        optionCombinationSortType: 'CREATE',
        optionCombinations: sellingOptionList.map((option, i) => ({
            optionName1: option.size,
            stockQuantity: 999,
            price: option.addoptionprice,
            sellerManagerCode: `OPT-${i}`,
        })),
        optionCombinationGroupNames: {
            optionGroupName1: optionGroupName,
        },
        useStockManagement: true,
    };

}



  

  /**
   * 🔍 상세 속성 정보 설정
   */
  private async setDetailAttribute(
    model: SmartStoreProductModel,
    args: { tags: string[]; brandName?: string; brandStyleId?: any; site: string; code: string },
    product: Product,
    account?: HostingAccount | null
  ):Promise<void> {
    const smartstorePolicy = getResolvedMarketplacePolicy(
      account?.marketplacePolicy,
    );
    model.originProduct.detailAttribute.customsTaxType = 'INCLUDED';
    model.originProduct.detailAttribute.sellerCodeInfo = {
      sellerManagementCode: (() => {
        const value = args.site === 'Maisonmargiela'
          ? `MM_${args.brandStyleId}`
          : args.site === 'Maxmara'
          ? `MX_${args.brandStyleId}`
          : `${args.site}_${args.code}`;
        return value.length > 30 ? value.substring(0, 29) : value;
      })(),
      sellerCustomCode1: (() => {
        const value = args.site === 'Maisonmargiela'
          ? `MM_${args.brandStyleId}`
          : args.site === 'Maxmara'
          ? `MX_${args.brandStyleId}`
          : `${args.site}_${args.code}`;
        return value.length > 30 ? value.substring(0, 29) : value;
      })(),
    };
    model.originProduct.detailAttribute.afterServiceInfo.afterServiceGuideContent = '상품상세 참조';
    model.originProduct.detailAttribute.afterServiceInfo.afterServiceTelephoneNumber = '070-8098-3779';
    model.originProduct.detailAttribute.afterServiceInfo.afterServiceGuideContent =
      smartstorePolicy.smartstore.asGuideContent;
    model.originProduct.detailAttribute.afterServiceInfo.afterServiceTelephoneNumber =
      smartstorePolicy.smartstore.asPhone;
    model.originProduct.detailAttribute.originAreaInfo.originAreaCode = '03';
    model.originProduct.detailAttribute.naverShoppingSearchInfo = {
      brandName: args.brandName,
      manufacturerName: args.brandName,
      modelName: args.brandStyleId,
    };
    model.originProduct.detailAttribute.productInfoProvidedNotice = {
      productInfoProvidedNoticeType: 'ETC',
      etc: {
        // ✅ 필수 5개를 전부 1(상품상세 참조)로 설정
        returnCostReason: '1',
        noRefundReason: '1',
        qualityAssuranceStandard: '1',
        compensationProcedure: '1',
        troubleShootingContents: '1',
        itemName: model.originProduct.name.length >= 50 
        ? (product.title.length >= 50 
            ? product.designer // ✅ 그래도 50자 넘으면 product.designer 사용
            : product.title) // ✅ 50자 안 넘으면 product.title 사용
        : model.originProduct.name.replace('[빠른배송] ', '').replace('[국내AS가능] ', '').replace('[정식매장] ', ''),
        modelName: args.brandStyleId,
        manufacturer: args.brandName,
        afterServiceDirector: '상품상세 참조',
      },
    };
    // ✅ 속성 자동 매핑 추가
    model.originProduct.detailAttribute.productInfoProvidedNotice.etc.afterServiceDirector =
      smartstorePolicy.smartstore.asGuideContent;
    try {
      const categoryCode = product.godoMallCategoryCode;
    
      const attributes = await this.smartstoreService.fetchAttributes(
        categoryCode,
        product.customId,
        product.accountPlatform
      );

      const attributeValues = await this.smartstoreService.fetchAttributeValues(
        categoryCode,
        product.customId,
        product.accountPlatform
      );
    
      const attributeData = attributes.map(attr => ({
        attributeSeq: attr.attributeSeq,
        attributeName: attr.attributeName,
        attributeClassificationType: attr.attributeClassificationType
      }));
    
      const attributeValueData = attributeValues.map(val => ({
        attributeSeq: val.attributeSeq,
        attributeValueSeq: val.attributeValueSeq
      }));
    
      const productTitle = product.title;
      const mainInfo = product.mainInfo;
    
      const attributeResultJson = await this.openApiService.refineAttribute(
        productTitle,
        mainInfo,
        attributeData,
        attributeValueData
      );
    
      // ✅ 코드블럭 제거 및 JSON 파싱
      const cleaned = attributeResultJson
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim();
        
      const parsed = JSON.parse(cleaned);
      model.originProduct.detailAttribute.productAttributes = parsed;
    
    } catch (error: any) {
      console.error('❌ 상품 속성 자동 매핑 실패:', error);
      model.originProduct.detailAttribute.productAttributes = []; // 오류 시 빈 배열 처리
    }
  }
  
  createContent = (
    product: Product,
    uploadedImages: string[],
    topImages?: string[],
    bottomImages?: string[]
  ) => {

    const altText = `${product.designer} ${product.title} ${product.styleId}`.trim();

    let contentHTML = '<div style="text-align:center">';

    const mainImageUrl = uploadedImages.length > 0 ? uploadedImages[0] : product.mainImageUrl;
    const additionalImageUrls = uploadedImages.length > 1 ? uploadedImages.slice(1) : product.additionalImageUrls;

    // 🔥 상단 이미지
    if (topImages?.length) {
      topImages.forEach(img => {
        contentHTML += `<img src="${img}" style="width:100%;max-width:860px;" /><br/>`;
      });
    }

    // 상품 이미지
    contentHTML += `
    <br/>
    <div style="text-align:center;">
      <img src="${mainImageUrl}" data-src="${mainImageUrl}" alt="${altText}" style="width:100%;max-width:750px;"/>
    </div>
    <br/><br/><br/>
    `;

    contentHTML += `
    <div style="font-weight:bold;text-align:center;font-size:1.8rem;">${product.designer}</div>
    <br/><br/>
    <div style="text-align:center;font-size:1.6rem;">${product.title}</div>
    <div style="text-align:center;font-size:1.6rem;">${product.color || ''}</div>
    `;

    let filteredMainInfo = product.mainInfo.replace(/상품\s*번호\s*:\s*[\w\d]+/g, '');

    contentHTML += `
    <div style="line-height:1.8;text-align:center;max-width:750px;margin:auto;font-size:1.4rem;">
      ${filteredMainInfo.split(',').join('<br/>')}
    </div>
    <br/><br/>
    `;

    additionalImageUrls.forEach((image) => {
      contentHTML += `<img src="${image}" data-src="${image}" alt="${altText}" style="width:100%;max-width:1000px;"/><br/>`;
    });

    // 🔥 하단 이미지
    if (bottomImages?.length) {
      bottomImages.forEach(img => {
        contentHTML += `<img src="${img}" style="width:100%;max-width:860px;" /><br/>`;
      });
    }

    contentHTML += `</div>`;

    return contentHTML;
  };


/**
 * ✅ 스마트스토어 상품 수정 (간결한 코드)
 */
async updateSmartStoreProduct(
  product: Product,
  auth: { smartStoreID: string; smartStoreSecret: string },
  partnerKey?: string,
  imageData?: { base64ImageList: string[]; originThumbnailUrls: string[] },
  godoMallCategoryName?: string,
): Promise<number | null> {
  const objForUpdate = new SmartStoreProductModel();
  try {
    const account = await this.hostingAccountRepository.findOne({
      where: {
        partnerKey: auth.smartStoreID,
        apiKey: auth.smartStoreSecret,
      },
    });
   
    // let productTitle = '';

    // if (product.site === 'Dior') {
    //   // 👉 Dior 로직
    //   productTitle = product.title.includes(product.designer)
    //     ? `${product.title} ${product.styleId}`
    //     : `${product.designer} ${product.title} ${product.styleId}`;

    // } else {
    //   // 👉 그 외 브랜드
    //   const color = product.color?.trim() ? product.color : '';

    //   productTitle = [
    //     product.designer,
    //     product.title,
    //     color,
    //     product.styleId,
    //   ]
    //     .filter(Boolean)
    //     .join(' ');

    //   // 👉 designer 중복 제거
    //   if (product.title.includes(product.designer)) {
    //     productTitle = [
    //       product.title,
    //       color,
    //       product.styleId,
    //     ]
    //       .filter(Boolean)
    //       .join(' ');
    //   }
    // }

    // // 👉 최종 정제
    // product.title = await this.openApiService.refineTitle(product.designer,productTitle,product.mainInfo);

    product.title = await this.wordReplacementService.applyReplacements(product.title,product.customId);


    /* ===============================
    * 1️⃣ 디자이너 중복 제거
    * - 제목 맨 앞에서 디자이너가 여러 번 반복되면 1번만 남김
    * =============================== */
    const escapedDesigner = product.designer.replace(
      /[.*+?^${}()|[\]\\]/g,
      '\\$&'
    );

    const designerDupRegex = new RegExp(
      `^(${escapedDesigner})(\\s+\\1)+`
    );

    product.title = product.title.replace(designerDupRegex, '$1');


    /* ===============================
    * 2️⃣ styleId 중복 제거
    * - title 전체에서 styleId가 여러 번 나오면 1번만 남김
    * =============================== */
    const escapedStyleId = product.styleId.replace(
      /[.*+?^${}()|[\]\\]/g,
      '\\$&'
    );

    const styleIdRegex = new RegExp(`\\b${escapedStyleId}\\b`, 'g');

    let first = true;
    product.title = product.title.replace(styleIdRegex, () => {
      if (first) {
        first = false;
        return product.styleId;
      }
      return '';
    });


    /* ===============================
    * 3️⃣ 공백 정리 (중요)
    * =============================== */
    product.title = product.title.replace(/\s{2,}/g, ' ').trim();

    // ✅ 업데이트일 때는 AI 스킵, 치환만 적용
    product.title = await this.wordReplacementService.applyReplacements(product.title,product.customId);
    product.designer = await this.wordReplacementService.applyReplacements(product.designer,product.customId);
    console.log(`🆕 스마트스토어 상품 업데이트 시작: ${product.title}`);

    // ✅ 업데이트할 객체 생성
    
    objForUpdate.originProduct.statusType = 'SALE';
    objForUpdate.originProduct.leafCategoryId = product.godoMallCategoryCode;
    objForUpdate.originProduct.name = product.title;
    objForUpdate.originProduct.salePrice = product.price;
    objForUpdate.originProduct.stockQuantity = 9999;
    // objForUpdate.originProduct.customerBenefit = {
    //   purchasePointPolicy: {
    //     value: 4000,
    //     unitType: 'WON',
    //   },
    //   reviewPointPolicy: {
    //     textReviewPoint: 500,
    //     photoVideoReviewPoint: 1500,
    //   }
    // }

      objForUpdate.originProduct.images = {
      representativeImage: { url: product.mainImageUrl },
      optionalImages: (product.additionalImageUrls || []).map(url => ({ url })),
    };


    // ✅ 상품 옵션 설정 (사이즈 및 추가 가격 적용)
    await this.setOptionCombination(objForUpdate, product);

    // ✅ 상세 설명 업데이트
    // objForUpdate.originProduct.detailContent = this.createContent(partnerKey, product, uploadedImageUrls)
    // .replace(/re2/gi, '');

    // ✅ 배송 및 기타 정보 설정
    this.setDeliveryInfo(objForUpdate, account);
    this.setClaimInfo(objForUpdate, account);
    await this.setDetailAttribute(objForUpdate, {
      tags: product.title.replace('[빠른배송] ', '').replace('[국내AS가능] ', '').split(' '),
      brandName: product.designer,
      brandStyleId: product.brandstyleId,
      site: product.site,
      code: product.styleId,
    }, product, account);

    // ✅ 스마트스토어 API 호출
  
    const response = await this.smartstoreService.updateProduct(
      auth,
      product.smartstoreChannelProductNo, // 기존 상품번호 사용
      objForUpdate
    );

    product.price = objForUpdate.originProduct.salePrice;
    

    // 엔티티 타입에 따라 DB 저장 처리
    if (product instanceof Product) {
      await this.productRepository.save(product);
    } 
    
    console.log(`✅ 스마트스토어 상품 업데이트 완료: ${product.title}`);
    return response;
  } catch (error: any) {
      const errorData = error.response?.data;
      const errorString = JSON.stringify(errorData || error.message);

      console.error('❌ 스마트스토어 상품 업데이트 실패:', errorData || error.message);

      // 400 BAD_REQUEST 상세 출력
      if (errorData?.code === 'BAD_REQUEST') {
        console.error(`❌ 상품수정 실패 (400 Bad Request): ${product.title}`);
        console.error(`- code: ${errorData.code}`);
        console.error(`- message: ${errorData.message}`);
        console.error(`- timestamp: ${errorData.timestamp}`);

        if (Array.isArray(errorData.invalidInputs)) {
          errorData.invalidInputs.forEach((input: any, idx: number) => {
            console.error(
              `  [${idx + 1}] name=${input.name}, type=${input.type}, message=${input.message}`
            );
          });
        }
      }

      // 💡 속성 관련 오류일 경우만 재시도
      const isAttributeError =
        errorString.includes('productAttributes') ||
        errorString.includes('attribute') ||
        errorString.includes('attributeRealValue');

      if (isAttributeError) {
        console.warn('⚠️ 속성 관련 오류 감지 - 속성 제거 후 재등록 시도');

        objForUpdate.originProduct.detailAttribute.productAttributes = [];

        try {
          const retryResult = await this.smartstoreService.updateProduct(
            auth,
            product.smartstoreChannelProductNo,
            objForUpdate
          );
          product.smartstoreChannelProductNo = retryResult.smartstoreChannelProductNo;
          product.platform = 'smartstore';
          console.log(`✅ 재등록 성공 (속성 제거): ${product.designer} ${product.title}`);
          return retryResult.smartstoreChannelProductNo;
        } catch (retryError: any) {
          const retryErrorMsg = retryError.response?.data || retryError.message;
          console.error('❌ 재등록 실패:', retryErrorMsg);
          return null;
        }
      }

      throw error;
    }

}




public async deleteUnsoldSmartstoreProducts(
  siteUrl: string,
  customId: string,
  accountPlatform: string,
) {
  const repository = this.productRepository;

  if (!siteUrl) {
    console.warn(`siteUrl이 없습니다.`);
    return;
  }

  // ✅ 계정 조회
  const account = await this.hostingAccountRepository.findOne({
    where: { customId, accountPlatform },
  });

  if (!account) {
    console.error(`❌ 계정 없음: ${customId} / ${accountPlatform}`);
    return;
  }

  const auth = {
    smartStoreID: account.partnerKey,
    smartStoreSecret: account.apiKey,
  };
// ✅ 조회 조건
  const whereClause = {
    touched: false,
    customId,
    accountPlatform,
    siteUrl,
    platform: "smartstore",
  };

  try {
    const unsoldProducts = await repository.find({ where: whereClause });

    if (unsoldProducts.length === 0) {
      console.log(`삭제할 상품 없음`);
      return;
    }

    console.log(`삭제 시작 (${unsoldProducts.length}개)`);

    for (const product of unsoldProducts) {
      if (!product.smartstoreChannelProductNo) {
        console.warn(`상품번호 없음: ${product.title} ${product.styleId}`);
        continue;
      }

      try {
        await this.userService.assertRequestAvailable(customId, 1);
        await this.smartstoreService.deleteProduct(
          auth,
          product.smartstoreChannelProductNo
        );

        console.log(`삭제 성공: ${product.designer} ${product.title}`);

      } catch (error: any) {
        const errorMessage = error?.message || '알 수 없는 오류';

        if (
          errorMessage.includes('요청 수 소진') ||
          errorMessage.includes('구독 기간이 만료') ||
          errorMessage.includes('플랜 구독 후 이용할 수 있습니다.') ||
          errorMessage.includes('요청 수 설정이 없습니다.')
        ) {
          throw error;
        }

        if (
          error.response?.data?.code === 'NOT_FOUND' ||
          error.message.includes('삭제된 상품')
        ) {
          console.warn(`이미 삭제됨 → DB만 제거`);
        } else {
          console.error(`삭제 실패: ${error.message}`);
          continue;
        }
      }
      await repository.remove(product);
      await this.userService.consumeRequest(customId, 1);
    }

  } catch (error: any) {
    console.error(
      `[${customId}/${accountPlatform}/${siteUrl}] 삭제 실패: ${error.message}`
    );
  } finally {
    await repository.update(
      {
        customId,
        accountPlatform,
        siteUrl,
        platform: 'smartstore',
      },
      { touched: false }
    );

    console.log(`touched 초기화 완료`);
  }
}

}
