export class SmartStoreProductModel {
  originProduct: SmartStoreOriginProduct = new SmartStoreOriginProduct();
  smartstoreChannelProduct: SmartStoreChannelProduct = new SmartStoreChannelProduct();
  windowChannelProduct?: WindowChannelProduct;
}

export class SmartStoreOriginProduct {
  statusType:
    | 'WAIT'
    | 'SALE'
    | 'OUTOFSTOCK'
    | 'UNADMISSION'
    | 'REJECTION'
    | 'SUSPENSION'
    | 'CLOSE'
    | 'PROHIBITION'
    | 'DELETE';
  saleType?: 'NEW' | 'OLD';
  leafCategoryId: string;
  name: string;
  detailContent: string;
  images: {
    representativeImage: {
      url: string;
    };
    optionalImages: {
      url: string;
    }[];
  };
  /*
    ISOString 
  */
  saleStartDate?: string;
  /*
    ISOString 
  */
  saleEndDate?: string;
  salePrice: number;
  /*
    integer <int32> (재고 수량) <= 99999999
    상품 등록 시 필수. 상품 수정 시 재고 수량을 입력하지 않으면 스마트스토어 데이터베이스에 저장된 현재 재고 값이 변하지 않습니다. 수정 시 재고 수량이 0으로 입력되면 StatusType으로 전달된 항목은 무시되며 상품 상태는 OUTOFSTOCK(품절)으로 저장됩니다.
  */
  stockQuantity: number;
  deliveryInfo: SmartStoreDeliveryInfo = new SmartStoreDeliveryInfo();
  productLogistics?: {
    logisticsCompanyId: string;
    logisticsCenterId: string;
  }[];
  detailAttribute: SmartStoreDetailAttribute = new SmartStoreDetailAttribute();
  customerBenefit?: CustomerBenefit;
}

class SmartStoreDetailAttribute {
  naverShoppingSearchInfo?: {
    modelId?: number;
    manufacturerName?: string;
    brandName?: string;
    modelName?: string;
  };
  afterServiceInfo = {
    afterServiceTelephoneNumber: '상세정보 별도표기',
    afterServiceGuideContent: '상세정보 별도표기',
  };
  purchaseQuantityInfo?: {
    minPurchaseQuantity: number;
    maxPurchaseQuantityPerId: number;
    maxPurchaseQuantityPerOrder: number;
  };
  originAreaInfo = {
    /*
        string (원산지 상세 지역 코드)
    */
    originAreaCode: '기타: 직접 입력',
    content: '상세설명에 표시',
  };
  sellerCodeInfo?: {
    sellerManagementCode?: string;
    sellerBarcode?: string;
    sellerCustomCode1?: string;
    sellerCustomCode2?: string;
  };
  optionInfo: {
    /*
            CREATE ABC LOW_PRICE HIGH_PRICE
    미입력 혹은 비허용 타입 입력 시 기본값인 등록순(CREATE)으로 저장됩니다. CREATE, ABC만 입력 가능합니다.
    
    CREATE(등록순), ABC(가나다순)
            */
    simpleOptionSortType?: 'CREATE' | 'ABC' | 'LOW_PRICE' | 'HIGH_PRICE';
    optionSimple?: {
      id: number;
      groupName: string;
      name: string;
      usable: boolean;
    }[];
    optionCustom?: {
      id: number;
      groupName: string;
      name: string;
      usable: boolean;
    }[];
    /*
            string (조합형 옵션 정렬 순서)
            Enum: CREATE ABC LOW_PRICE HIGH_PRICE
            미입력 시 기본값인 등록순(CREATE)으로 저장됩니다.
    
            CREATE(등록순), ABC(가나다순), LOW_PRICE(낮은 가격순), HIGH_PRICE(높은 가격순)
          */
    optionCombinationSortType?: 'CREATE' | 'ABC' | 'LOW_PRICE' | 'HIGH_PRICE';
    optionCombinationGroupNames?: {
      [key: string]: string;
    };
    optionCombinations?: OptionCombination[];
    standardOptionGroups?: {
      groupName: string;
      standardOptionAttributes: {
        attributeId: number;
        attributeValueId: number;
        attributeValueName: string;
        imageUrls: string[];
      }[];
    }[];
    optionStandards?: {
      id: number;
      optionName1: string;
      optionName2: string;
      stockQuantity: number;
      sellerManagerCode: string;
      usable: boolean;
    }[];
    useStockManagement: boolean;
    optionDeliveryAttributes?: string[];
  };
  supplementProductInfo?: {
    sortType: string;
    supplementProducts: {
      id: number;
      groupName: string;
      name: string;
      price: number;
      stockQuantity: number;
      sellerManagementCode: string;
      usable: boolean;
    }[];
  };
  purchaseReviewInfo?: {
    purchaseReviewExposure: boolean;
    reviewUnExposeReason: string;
  };
  isbnInfo?: {
    isbn13: string;
    issn: string;
    independentPublicationYn: boolean;
  };
  bookInfo?: {
    publishDay: string;
    publisher: {
      code: string;
      text: string;
    };
    authors: {
      code: string;
      text: string;
    }[];
    illustrators: {
      code: string;
      text: string;
    }[];
    translators: {
      code: string;
      text: string;
    }[];
  };
  eventPhraseCont?: string;
  manufactureDate?: string;
  releaseDate?: string;
  validDate?: string;
  taxType?: string;
  customsTaxType: 'NOT_APPLICABLE' | 'INCLUDED' | 'EXCLUDED' = 'INCLUDED';
  /*
            '어린이제품 인증 대상' 카테고리 상품인 경우 필수
        */
  productCertificationInfos?: {
    certificationInfoId: number;
    certificationKindType: string;
    name: string;
    certificationNumber: string;
    certificationMark: boolean;
    companyName: string;
    certificationDate: string;
  }[];
  certificationTargetExcludeContent?: {
    childCertifiedProductExclusionYn: boolean;
    kcExemptionType: string;
    kcCertifiedProductExclusionYn: string;
    greenCertifiedProductExclusionYn: boolean;
  };
  sellerCommentContent?: string;
  sellerCommentUsable?: boolean;
  minorPurchasable = true;
  ecoupon?: {
    periodType: string;
    validStartDate: string;
    validEndDate: string;
    periodDays: number;
    publicInformationContents: string;
    contactInformationContents: string;
    usePlaceType: string;
    usePlaceContents: string;
    restrictCart: boolean;
    siteName: string;
  };
  productInfoProvidedNotice: {
    productInfoProvidedNoticeType: 'ETC';
    etc: {
      returnCostReason?: string;
      noRefundReason?: string;
      qualityAssuranceStandard?: string;
      compensationProcedure?: string;
      troubleShootingContents?: string;
      itemName: string;
      modelName: string;
      certificateDetails?: string;
      manufacturer: string;
      afterServiceDirector?: string;
      customerServicePhoneNumber?: string;
    };
  };
  productAttributes?: Attribute[];
  cultureCostIncomeDeductionYn?: boolean;
  customProductYn?: boolean;
  itselfProductionProductYn?: boolean;
  brandCertificationYn?: boolean;
  seoInfo: SeoInfo = {
    sellerTags: [],
  };
}
class SmartStoreDeliveryInfo {
  deliveryType: 'DELIVERY' | 'DIRECT' = 'DELIVERY';
  deliveryAttributeType:
    | 'NORMAL'
    | 'TODAY'
    | 'OPTION_TODAY'
    | 'HOPE'
    | 'TODAY_ARRIVAL'
    | 'DAWN_ARRIVAL'
    | 'ARRIVAL_GUARANTEE' = 'NORMAL';
  /*
      	
string (택배사)
DELIVERY(택배, 소포, 등기)일 때 필수 입력
*/
  deliveryCompany = 'CJGLS';
  /*
    	
boolean (묶음배송 가능 여부)
묶음배송 그룹 코드가 존재하는 경우 자동으로 true로 설정됩니다.
*/
  deliveryBundleGroupUsable?: boolean;
  deliveryBundleGroupId?: number;
  quickServiceAreas?: string[];
  visitAddressId?: number;
  deliveryFee: SmartStoreDeliveryFee = new SmartStoreDeliveryFee();
  claimDeliveryInfo: SmartStoreClaimDeliveryInfo = new SmartStoreClaimDeliveryInfo();
  installationFee?: boolean;
  expectedDeliveryPeriodType?: string;
  expectedDeliveryPeriodDirectInput?: string;
  todayStockQuantity?: number;
  customProductAfterOrderYn?: boolean;
  hopeDeliveryGroupId?: number;
}

class SmartStoreDeliveryFee {
  deliveryFeeType: 'FREE' | 'CONDITIONAL_FREE' | 'PAID' | 'UNIT_QUANTITY_PAID' | 'RANGE_QUANTITY_PAID';
  /*
      integer <int32> (기본 배송비) <= 100000
      */
  baseFee: number;
  /*
      integer <int32> (무료 조건 금액) <= 999999990
배송비 유형이 '조건부 무료'일 경우 입력합니다.*/
  freeConditionalAmount?: number;
  repeatQuantity?: number;
  secondBaseQuantity?: number;
  secondExtraFee?: number;
  thirdBaseQuantity?: number;
  thirdExtraFee?: number;
  /*
      네이버 상품 API에서 배송비 결제 방식을 나타내기 위해 사용하는 코드입니다.

COLLECT(착불), PREPAID(선결제), COLLECT_OR_PREPAID(착불 또는 선결제)
*/
  deliveryFeePayType: 'COLLECT' | 'PREPAID' | 'COLLECT_OR_PREPAID';
  deliveryFeeByArea?: {
    deliveryAreaType: string;
    area2extraFee: number;
    area3extraFee: number;
  };
  differentialFeeByArea?: string;
}

class SmartStoreClaimDeliveryInfo {
  returnDeliveryCompanyPriorityType?: 'PRIMARY';
  /*
          integer <int32> (반품 배송비) <= 1000000
          */
  returnDeliveryFee: number;
  /*
            integer <int32> (교환 배송비) <= 1000000
          */
  exchangeDeliveryFee: number;
  /*
          (출고지 주소록 번호)
          */
  shippingAddressId?: number;
  /*
            integer <int64> (반품/교환지 주소록 번호)
          */
  returnAddressId?: number;
  /*
            boolean (반품안심케어 설정)
          */
  freeReturnInsuranceYn?: boolean;
}
interface Attribute {
  attributeSeq?: number;
  attributeValueSeq: number;
  attributeRealValue?: string;
  attributeRealValueUnitCode?: string;
}

interface SellerTag {
  code?: number;
  text: string;
}

interface SeoInfo {
  pageTitle?: string;
  metaDescription?: string;
  sellerTags: SellerTag[];
}

interface ImmediateDiscountMethod {
  value: number;
  unitType: string;
  startDate: string;
  endDate: string;
}

interface MobileDiscountMethod {
  value: number;
  unitType: string;
  startDate: string;
  endDate: string;
}

interface ImmediateDiscountPolicy {
  discountMethod: ImmediateDiscountMethod;
  mobileDiscountMethod: MobileDiscountMethod;
}

interface PurchasePointPolicy {
  value: number;
  unitType: 'PERCENT' | 'WON';
  startDate?: string;
  endDate?: string;
}

interface ReviewPointPolicy {
  textReviewPoint: number;
  photoVideoReviewPoint: number;
  afterUseTextReviewPoint?: number;
  afterUsePhotoVideoReviewPoint?: number;
  storeMemberReviewPoint?: number;
  startDate?: string;
  endDate?: string;
}

interface FreeInterestPolicy {
  value: number;
  startDate: string;
  endDate: string;
}

interface GiftPolicy {
  presentContent: string;
}

interface MultiPurchaseDiscountMethod {
  value: number;
  unitType: string;
  startDate: string;
  endDate: string;
}

interface MultiPurchaseDiscountPolicy {
  discountMethod: MultiPurchaseDiscountMethod;
  orderValue: number;
  orderValueUnitType: string;
}

interface CustomerBenefit {
  immediateDiscountPolicy?: ImmediateDiscountPolicy;
  purchasePointPolicy?: PurchasePointPolicy;
  reviewPointPolicy?: ReviewPointPolicy;
  freeInterestPolicy?: FreeInterestPolicy;
  giftPolicy?: GiftPolicy;
  multiPurchaseDiscountPolicy?: MultiPurchaseDiscountPolicy;
}

export class SmartStoreChannelProduct {
  channelProductName?: string;
  bbsSeq?: number;
  storeKeepExclusiveProduct?: boolean;
  naverShoppingRegistration = true;
  channelProductDisplayStatusType: 'WAIT' | 'ON' | 'SUSPENSION' = 'ON';
}

class WindowChannelProduct {
  channelProductName?: string;
  bbsSeq?: number;
  storeKeepExclusiveProduct?: boolean;
  naverShoppingRegistration: boolean;
  channelNo: number;
  best?: boolean;
  channelProductDisplayStatusType: 'WAIT' | 'ON' | 'SUSPENSION';
}

export interface OptionCombination {
  id?: number;
  optionName1: string;
  optionName2?: string;
  optionName3?: string;
  optionName4?: string;
  stockQuantity?: number;
  price?: number;
  sellerManagerCode?: string;
  usable?: boolean;
}
