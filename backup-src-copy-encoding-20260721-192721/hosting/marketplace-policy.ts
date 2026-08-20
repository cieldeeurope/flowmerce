export type MarketplacePolicy = {
  common?: CommonMarketplacePolicy;
  godomall?: GodomallMarketplacePolicy;
  smartstore?: SmartstoreMarketplacePolicy;
  cafe24?: Cafe24MarketplacePolicy;
  makeshop?: MakeshopMarketplacePolicy;
};

export type CommonMarketplacePolicy = {
  shippingDaysMin?: number | null;
  shippingDaysMax?: number | null;
  deliveryNoticeHtml?: string | null;
  refundNoticeHtml?: string | null;
  exchangeNoticeHtml?: string | null;
  asNoticeHtml?: string | null;
  asPhone?: string | null;
  returnFee?: number | null;
  exchangeFee?: number | null;
};

export type GodomallMarketplacePolicy = {
  deliverySno?: string | null;
  detailInfoDeliveryCode?: string | null;
  detailInfoAsCode?: string | null;
  detailInfoRefundCode?: string | null;
  detailInfoExchangeCode?: string | null;
};

export type SmartstoreDeliveryType = 'DELIVERY' | 'DIRECT';
export type SmartstoreDeliveryAttributeType =
  | 'NORMAL'
  | 'TODAY'
  | 'OPTION_TODAY'
  | 'HOPE'
  | 'TODAY_ARRIVAL'
  | 'DAWN_ARRIVAL'
  | 'ARRIVAL_GUARANTEE';
export type SmartstoreDeliveryFeeType =
  | 'FREE'
  | 'CONDITIONAL_FREE'
  | 'PAID'
  | 'UNIT_QUANTITY_PAID'
  | 'RANGE_QUANTITY_PAID';
export type SmartstoreReturnDeliveryCompanyPriorityType = 'PRIMARY';

export type SmartstoreMarketplacePolicy = {
  deliveryType?: SmartstoreDeliveryType | null;
  deliveryAttributeType?: SmartstoreDeliveryAttributeType | null;
  deliveryCompany?: string | null;
  deliveryFeeType?: SmartstoreDeliveryFeeType | null;
  returnDeliveryCompanyPriorityType?: SmartstoreReturnDeliveryCompanyPriorityType | null;
  returnDeliveryFee?: number | null;
  exchangeDeliveryFee?: number | null;
  asGuideContent?: string | null;
  asPhone?: string | null;
};

export type Cafe24MarketplacePolicy = {
  shippingType?: string | null;
  shippingMethod?: string | null;
  shippingPeriodMin?: number | null;
  shippingPeriodMax?: number | null;
  shippingArea?: string | null;
  shippingInfo?: string | null;
  exchangeInfo?: string | null;
  serviceInfo?: string | null;
  shippingFeeType?: string | null;
  shippingFee?: number | null;
  prepaidShippingFee?: string | null;
  productShippingType?: string | null;
  shippingFeeByProduct?: string | null;
  shippingScope?: string | null;
  clearanceCategoryCode?: string | null;
  shippingInfoByProduct?: string | null;
  exchangeInfoByProduct?: string | null;
  serviceInfoByProduct?: string | null;
};

export type MakeshopMarketplacePolicy = {
  deliveryFee?: number | null;
  deliveryType?: string | null;
};

const normalizeString = (value: unknown) => {
  const normalized = String(value ?? '').trim();
  return normalized ? normalized : undefined;
};

const normalizeNullableString = (value: unknown) => {
  const normalized = normalizeString(value);
  return normalized ?? null;
};

const normalizeNullableNumber = (value: unknown) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const normalizeNullableEnum = <T extends string>(
  value: unknown,
  allowedValues: readonly T[],
) => {
  const normalized = normalizeString(value);
  if (!normalized) {
    return null;
  }

  return (allowedValues as readonly string[]).includes(normalized)
    ? (normalized as T)
    : null;
};

const SMARTSTORE_DELIVERY_TYPES = ['DELIVERY', 'DIRECT'] as const;
const SMARTSTORE_DELIVERY_ATTRIBUTE_TYPES = [
  'NORMAL',
  'TODAY',
  'OPTION_TODAY',
  'HOPE',
  'TODAY_ARRIVAL',
  'DAWN_ARRIVAL',
  'ARRIVAL_GUARANTEE',
] as const;
const SMARTSTORE_DELIVERY_FEE_TYPES = [
  'FREE',
  'CONDITIONAL_FREE',
  'PAID',
  'UNIT_QUANTITY_PAID',
  'RANGE_QUANTITY_PAID',
] as const;
const SMARTSTORE_RETURN_DELIVERY_COMPANY_PRIORITY_TYPES = [
  'PRIMARY',
] as const;

const compactObject = <T extends Record<string, unknown>>(value: T) => {
  const entries = Object.entries(value).filter(([, item]) => {
    if (item === undefined) {
      return false;
    }

    if (item === null) {
      return false;
    }

    if (typeof item === 'string' && item.trim() === '') {
      return false;
    }

    return true;
  });

  return entries.length > 0 ? (Object.fromEntries(entries) as T) : undefined;
};

export function normalizeMarketplacePolicy(
  value?: MarketplacePolicy | Record<string, unknown> | null,
): MarketplacePolicy | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const source = value as MarketplacePolicy;

  const common = compactObject<CommonMarketplacePolicy>({
    shippingDaysMin: normalizeNullableNumber(source.common?.shippingDaysMin),
    shippingDaysMax: normalizeNullableNumber(source.common?.shippingDaysMax),
    deliveryNoticeHtml: normalizeNullableString(source.common?.deliveryNoticeHtml),
    refundNoticeHtml: normalizeNullableString(source.common?.refundNoticeHtml),
    exchangeNoticeHtml: normalizeNullableString(source.common?.exchangeNoticeHtml),
    asNoticeHtml: normalizeNullableString(source.common?.asNoticeHtml),
    asPhone: normalizeNullableString(source.common?.asPhone),
    returnFee: normalizeNullableNumber(source.common?.returnFee),
    exchangeFee: normalizeNullableNumber(source.common?.exchangeFee),
  });

  const godomall = compactObject<GodomallMarketplacePolicy>({
    deliverySno: normalizeNullableString(source.godomall?.deliverySno),
    detailInfoDeliveryCode: normalizeNullableString(
      source.godomall?.detailInfoDeliveryCode,
    ),
    detailInfoAsCode: normalizeNullableString(source.godomall?.detailInfoAsCode),
    detailInfoRefundCode: normalizeNullableString(
      source.godomall?.detailInfoRefundCode,
    ),
    detailInfoExchangeCode: normalizeNullableString(
      source.godomall?.detailInfoExchangeCode,
    ),
  });

  const smartstore = compactObject<SmartstoreMarketplacePolicy>({
    deliveryType: normalizeNullableEnum(
      source.smartstore?.deliveryType,
      SMARTSTORE_DELIVERY_TYPES,
    ),
    deliveryAttributeType: normalizeNullableEnum(
      source.smartstore?.deliveryAttributeType,
      SMARTSTORE_DELIVERY_ATTRIBUTE_TYPES,
    ),
    deliveryCompany: normalizeNullableString(source.smartstore?.deliveryCompany),
    deliveryFeeType: normalizeNullableEnum(
      source.smartstore?.deliveryFeeType,
      SMARTSTORE_DELIVERY_FEE_TYPES,
    ),
    returnDeliveryCompanyPriorityType: normalizeNullableEnum(
      source.smartstore?.returnDeliveryCompanyPriorityType,
      SMARTSTORE_RETURN_DELIVERY_COMPANY_PRIORITY_TYPES,
    ),
    returnDeliveryFee: normalizeNullableNumber(
      source.smartstore?.returnDeliveryFee,
    ),
    exchangeDeliveryFee: normalizeNullableNumber(
      source.smartstore?.exchangeDeliveryFee,
    ),
    asGuideContent: normalizeNullableString(source.smartstore?.asGuideContent),
    asPhone: normalizeNullableString(source.smartstore?.asPhone),
  });

  const cafe24 = compactObject<Cafe24MarketplacePolicy>({
    shippingType: normalizeNullableString(source.cafe24?.shippingType),
    shippingMethod: normalizeNullableString(source.cafe24?.shippingMethod),
    shippingPeriodMin: normalizeNullableNumber(source.cafe24?.shippingPeriodMin),
    shippingPeriodMax: normalizeNullableNumber(source.cafe24?.shippingPeriodMax),
    shippingArea: normalizeNullableString(source.cafe24?.shippingArea),
    shippingInfo: normalizeNullableString(source.cafe24?.shippingInfo),
    exchangeInfo: normalizeNullableString(source.cafe24?.exchangeInfo),
    serviceInfo: normalizeNullableString(source.cafe24?.serviceInfo),
    shippingFeeType: normalizeNullableString(source.cafe24?.shippingFeeType),
    shippingFee: normalizeNullableNumber(source.cafe24?.shippingFee),
    prepaidShippingFee: normalizeNullableString(
      source.cafe24?.prepaidShippingFee,
    ),
    productShippingType: normalizeNullableString(
      source.cafe24?.productShippingType,
    ),
    shippingFeeByProduct: normalizeNullableString(
      source.cafe24?.shippingFeeByProduct,
    ),
    shippingScope: normalizeNullableString(source.cafe24?.shippingScope),
    clearanceCategoryCode: normalizeNullableString(
      source.cafe24?.clearanceCategoryCode,
    ),
    shippingInfoByProduct: normalizeNullableString(
      source.cafe24?.shippingInfoByProduct,
    ),
    exchangeInfoByProduct: normalizeNullableString(
      source.cafe24?.exchangeInfoByProduct,
    ),
    serviceInfoByProduct: normalizeNullableString(
      source.cafe24?.serviceInfoByProduct,
    ),
  });

  const makeshop = compactObject<MakeshopMarketplacePolicy>({
    deliveryFee: normalizeNullableNumber(source.makeshop?.deliveryFee),
    deliveryType: normalizeNullableString(source.makeshop?.deliveryType),
  });

  const normalized = compactObject<MarketplacePolicy>({
    common,
    godomall,
    smartstore,
    cafe24,
    makeshop,
  });

  return normalized ?? null;
}

export function getResolvedMarketplacePolicy(policy?: MarketplacePolicy | null) {
  const normalized = normalizeMarketplacePolicy(policy) || {};

  return {
    common: {
      shippingDaysMin: normalized.common?.shippingDaysMin ?? 7,
      shippingDaysMax: normalized.common?.shippingDaysMax ?? 14,
      deliveryNoticeHtml: normalized.common?.deliveryNoticeHtml ?? '',
      refundNoticeHtml: normalized.common?.refundNoticeHtml ?? '',
      exchangeNoticeHtml: normalized.common?.exchangeNoticeHtml ?? '',
      asNoticeHtml: normalized.common?.asNoticeHtml ?? '',
      asPhone: normalized.common?.asPhone ?? '070-8098-3779',
      returnFee: normalized.common?.returnFee ?? 50000,
      exchangeFee: normalized.common?.exchangeFee ?? 100000,
    },
    godomall: {
      deliverySno: normalizeString(normalized.godomall?.deliverySno) ?? '2',
      detailInfoDeliveryCode:
        normalizeString(normalized.godomall?.detailInfoDeliveryCode) ?? '002001',
      detailInfoAsCode:
        normalizeString(normalized.godomall?.detailInfoAsCode) ?? '003001',
      detailInfoRefundCode:
        normalizeString(normalized.godomall?.detailInfoRefundCode) ?? '004001',
      detailInfoExchangeCode:
        normalizeString(normalized.godomall?.detailInfoExchangeCode) ?? '005001',
    },
    smartstore: {
      deliveryType:
        (normalizeString(normalized.smartstore?.deliveryType) ??
          'DELIVERY') as SmartstoreDeliveryType,
      deliveryAttributeType:
        (normalizeString(normalized.smartstore?.deliveryAttributeType) ??
          'NORMAL') as SmartstoreDeliveryAttributeType,
      deliveryCompany:
        normalizeString(normalized.smartstore?.deliveryCompany) ?? 'EPOST',
      deliveryFeeType:
        (normalizeString(normalized.smartstore?.deliveryFeeType) ??
          'FREE') as SmartstoreDeliveryFeeType,
      returnDeliveryCompanyPriorityType:
        (normalizeString(
          normalized.smartstore?.returnDeliveryCompanyPriorityType,
        ) ?? 'PRIMARY') as SmartstoreReturnDeliveryCompanyPriorityType,
      returnDeliveryFee:
        normalized.smartstore?.returnDeliveryFee ??
        normalized.common?.returnFee ??
        50000,
      exchangeDeliveryFee:
        normalized.smartstore?.exchangeDeliveryFee ??
        normalized.common?.exchangeFee ??
        100000,
      asGuideContent:
        normalizeString(normalized.smartstore?.asGuideContent) ?? '상품상세 참조',
      asPhone:
        normalizeString(normalized.smartstore?.asPhone) ??
        normalizeString(normalized.common?.asPhone) ??
        '070-8098-3779',
    },
    cafe24: {
      shippingType: normalizeString(normalized.cafe24?.shippingType) ?? 'C',
      shippingMethod: normalizeString(normalized.cafe24?.shippingMethod) ?? '01',
      shippingPeriodMin:
        normalized.cafe24?.shippingPeriodMin ??
        normalized.common?.shippingDaysMin ??
        7,
      shippingPeriodMax:
        normalized.cafe24?.shippingPeriodMax ??
        normalized.common?.shippingDaysMax ??
        14,
      shippingArea:
        normalizeString(normalized.cafe24?.shippingArea) ?? '해외배송',
      shippingInfo:
        normalizeString(normalized.cafe24?.shippingInfo) ??
        normalizeString(normalized.common?.deliveryNoticeHtml) ??
        '',
      exchangeInfo:
        normalizeString(normalized.cafe24?.exchangeInfo) ??
        normalizeString(normalized.common?.exchangeNoticeHtml) ??
        '',
      serviceInfo:
        normalizeString(normalized.cafe24?.serviceInfo) ??
        normalizeString(normalized.common?.asNoticeHtml) ??
        '',
      shippingFeeType:
        normalizeString(normalized.cafe24?.shippingFeeType) ?? 'T',
      shippingFee: normalized.cafe24?.shippingFee ?? 0,
      prepaidShippingFee:
        normalizeString(normalized.cafe24?.prepaidShippingFee) ?? 'P',
      productShippingType:
        normalizeString(normalized.cafe24?.productShippingType) ?? 'D',
      shippingFeeByProduct:
        normalizeString(normalized.cafe24?.shippingFeeByProduct) ?? 'T',
      shippingScope:
        normalizeString(normalized.cafe24?.shippingScope) ?? 'C',
      clearanceCategoryCode:
        normalizeString(normalized.cafe24?.clearanceCategoryCode) ?? '',
      shippingInfoByProduct:
        normalizeString(normalized.cafe24?.shippingInfoByProduct) ?? 'T',
      exchangeInfoByProduct:
        normalizeString(normalized.cafe24?.exchangeInfoByProduct) ?? 'T',
      serviceInfoByProduct:
        normalizeString(normalized.cafe24?.serviceInfoByProduct) ?? 'T',
    },
    makeshop: {
      deliveryFee: normalized.makeshop?.deliveryFee ?? 0,
      deliveryType:
        normalizeString(normalized.makeshop?.deliveryType) ?? 'EMS',
    },
  };
}
