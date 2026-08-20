"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchAdminContacts } from "@/lib/requests";
import {
   createAdminHostingAccount,
   createAdminUser,
   fetchCafe24AuthorizeUrl,
   fetchAdminHostingAccounts,
   fetchAdminUsers,
   generateAdminSitemap,
   updateAdminHostingAccount,
   updateAdminUser,
} from "@/lib/admin";
import {
   deleteSchedules,
   fetchScheduledAccountPlatforms,
   fetchScheduledCustomIds,
   fetchScheduledSites,
   fetchSchedules,
   runSchedules,
} from "@/lib/schedules";

const tabs = [
   { id: "contacts", label: "문의" },
   { id: "schedules", label: "수집예약" },
   { id: "users", label: "User" },
   { id: "hosting", label: "Hosting" },
   { id: "sitemap", label: "사이트맵" },
];

const scheduleSubtabs = [
   { id: "active", label: "실행 대상" },
   { id: "completed", label: "완료 목록" },
];

const planOptions = ["none", "boutique", "basic", "pro", "enterprise"];
const platformOptions = ["smartstore", "godomall", "cafe24", "makeshop"];
const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;
const CAFE24_OAUTH_STATE_KEY = "flowmerce_cafe24_oauth_state";
const CAFE24_REFRESH_WARNING_MS = 3 * 24 * 60 * 60 * 1000;
const hostingPolicyManuals = {
   godomall: {
      title: "고도몰 정책 메뉴얼",
      description:
         "고도몰은 배송/환불/교환/AS 안내를 직접 문구로 넣는 방식이 아니라, 관리자에 이미 등록된 정책 번호와 안내 코드로 연결합니다.",
      sourceNote:
         "Flowmerce 고도몰 XML 연동 코드 기준입니다. 고도몰 관리자에서 등록된 정책 번호/코드를 그대로 입력합니다.",
      fields: [
         {
            label: "고도몰 배송정책 번호",
            key: "deliverySno",
            valueType: "숫자",
            examples: ["2"],
            help: "고도몰 관리자에 등록된 배송정책 번호입니다. 배송정책 자체를 선택하는 값입니다.",
         },
         {
            label: "고도몰 배송 안내 코드",
            key: "detailInfoDeliveryCode",
            valueType: "코드",
            examples: ["002001"],
            help: "배송 안내 문구 자체가 아니라, 고도몰 관리자에 저장된 배송 안내 코드값을 넣습니다.",
         },
         {
            label: "고도몰 AS 안내 코드",
            key: "detailInfoAsCode",
            valueType: "코드",
            examples: ["003001"],
            help: "AS 안내 문구가 아닌 코드값입니다. 고도몰 XML에서 detailInfoAS로 들어갑니다.",
         },
         {
            label: "고도몰 환불 안내 코드",
            key: "detailInfoRefundCode",
            valueType: "코드",
            examples: ["004001"],
            help: "환불 안내 문구가 아니라 코드값입니다.",
         },
         {
            label: "고도몰 교환 안내 코드",
            key: "detailInfoExchangeCode",
            valueType: "코드",
            examples: ["005001"],
            help: "교환 안내 문구가 아니라 코드값입니다.",
         },
      ],
      links: [],
   },
   smartstore: {
      title: "스마트스토어 정책 메뉴얼",
      description:
         "스마트스토어는 배송 정보, 반품/교환 배송비, AS 안내/연락처를 API payload에 직접 넣습니다.",
      sourceNote:
         "네이버 커머스API 원상품 정보 구조체와 현재 Flowmerce 스마트스토어 등록 로직 기준입니다.",
      fields: [
         {
            label: "스마트스토어 배송 유형",
            key: "deliveryType",
            valueType: "코드",
            examples: ["DELIVERY", "DIRECT"],
            help: "DELIVERY는 택배/소포/등기, DIRECT는 직접배송(화물배달)입니다.",
         },
         {
            label: "스마트스토어 배송 속성",
            key: "deliveryAttributeType",
            valueType: "코드",
            examples: ["NORMAL", "TODAY", "OPTION_TODAY", "HOPE", "ARRIVAL_GUARANTEE"],
            help: "일반 배송은 NORMAL입니다. 오늘출발/TODAY, 희망일배송/HOPE 등 판매자 설정에 따라 허용값이 달라질 수 있습니다.",
         },
         {
            label: "스마트스토어 택배사",
            key: "deliveryCompany",
            valueType: "코드",
            examples: ["EPOST"],
            help: "예시는 우체국(EPOST)입니다. 실제로는 판매자 계정에 연결된 택배사 코드에 맞춰 입력합니다.",
         },
         {
            label: "스마트스토어 배송비 유형",
            key: "deliveryFeeType",
            valueType: "코드",
            examples: ["FREE", "CONDITIONAL_FREE", "PAID", "UNIT_QUANTITY_PAID"],
            help: "FREE는 무료배송, CONDITIONAL_FREE는 조건부 무료, PAID는 유료배송입니다.",
         },
         {
            label: "스마트스토어 반품 택배 우선순위",
            key: "returnDeliveryCompanyPriorityType",
            valueType: "코드",
            examples: ["PRIMARY", "SECONDARY_1"],
            help: "반품/교환 택배사 우선순위입니다. 보통 PRIMARY를 사용합니다.",
         },
         {
            label: "스마트스토어 반품 배송비",
            key: "returnDeliveryFee",
            valueType: "숫자",
            examples: ["50000"],
            help: "원화 숫자만 입력합니다. 쉼표 없이 입력합니다.",
         },
         {
            label: "스마트스토어 교환 배송비",
            key: "exchangeDeliveryFee",
            valueType: "숫자",
            examples: ["100000"],
            help: "원화 숫자만 입력합니다. 왕복 기준 운영값을 넣습니다.",
         },
         {
            label: "스마트스토어 AS 안내",
            key: "asGuideContent",
            valueType: "문구",
            examples: ["상품상세 참조"],
            help: "상품 문의/AS 안내 문구입니다. 짧은 텍스트를 넣으면 됩니다.",
         },
         {
            label: "스마트스토어 AS 연락처",
            key: "asPhone",
            valueType: "전화번호",
            examples: ["070-8098-3779"],
            help: "A/S 전화번호입니다. 현재 Flowmerce 스마트스토어 로직에서 실제로 사용합니다.",
         },
      ],
      links: [
         {
            label: "네이버 원상품 정보 구조체",
            href: "https://apicenter.commerce.naver.com/docs/commerce-api/current/schemas/%EC%9B%90%EC%83%81%ED%92%88-%EC%A0%95%EB%B3%B4-%EA%B5%AC%EC%A1%B0%EC%B2%B4",
         },
         {
            label: "네이버 상품 배송 정보",
            href: "https://apicenter.commerce.naver.com/docs/commerce-api/current/%EC%83%81%ED%92%88-%EB%B0%B0%EC%86%A1-%EC%A0%95%EB%B3%B4",
         },
      ],
   },
   cafe24: {
      title: "카페24 정책 메뉴얼",
      description:
         "카페24는 배송 방법/배송 범위/배송 기간과 배송·교환·서비스 안내 문구를 API로 직접 전송합니다.",
      sourceNote:
         "Cafe24 Admin Product API와 현재 Flowmerce Cafe24 상품 생성 payload 기준입니다.",
      fields: [
         {
            label: "카페24 배송 구분",
            key: "shippingType",
            valueType: "코드",
            examples: ["C"],
            help: "현재 Flowmerce payload에서는 직접 사용하지 않는 보관용 값입니다. 실제 적용 핵심은 배송 범위/배송비/배송기간입니다.",
         },
         {
            label: "카페24 배송 방법",
            key: "shippingMethod",
            valueType: "코드",
            examples: ["01", "04", "08"],
            help: "01=택배, 04=직접배송, 08=매장직접수령 등입니다.",
         },
         {
            label: "카페24 배송 시작일 / 종료일",
            key: "shippingPeriod",
            valueType: "숫자",
            examples: ["7", "14"],
            help: "숫자만 입력합니다. 예: 7~14일.",
         },
         {
            label: "카페24 배송 가능 지역",
            key: "shippingArea",
            valueType: "문구",
            examples: ["해외배송"],
            help: "문구 텍스트입니다. 예: 해외배송, 전세계 배송 가능.",
         },
         {
            label: "카페24 배송비 유형",
            key: "shippingFeeType",
            valueType: "코드",
            examples: ["T", "R", "M", "C"],
            help: "T=무료배송, R=고정 배송비, M=금액별, C=수량별입니다.",
         },
         {
            label: "카페24 배송비",
            key: "shippingFee",
            valueType: "숫자",
            examples: ["0", "3000"],
            help: "원화 숫자입니다. 무료배송이면 보통 0입니다.",
         },
         {
            label: "카페24 선결제 배송비",
            key: "prepaidShippingFee",
            valueType: "코드",
            examples: ["P", "C", "B"],
            help: "P=선결제, C=착불, B=선결제/착불 선택입니다.",
         },
         {
            label: "카페24 상품 배송 타입",
            key: "productShippingType",
            valueType: "코드",
            examples: ["D", "C", "E"],
            help: "D=사입배송, C=직접배송, E=기타(창고/위탁)입니다.",
         },
         {
            label: "카페24 상품별 배송비 사용",
            key: "shippingFeeByProduct",
            valueType: "코드",
            examples: ["T", "F"],
            help: "T=개별배송, F=기본 배송정책 사용입니다.",
         },
         {
            label: "카페24 배송 범위",
            key: "shippingScope",
            valueType: "코드",
            examples: ["A", "B", "C"],
            help: "A=국내배송, B=국내/해외배송, C=해외배송입니다.",
         },
         {
            label: "카페24 상품별 안내 사용 여부",
            key: "shippingInfoByProduct/exchangeInfoByProduct/serviceInfoByProduct",
            valueType: "코드",
            examples: ["T", "F"],
            help: "T=이 상품에 입력한 문구 사용, F=기본 안내 정책 사용입니다.",
         },
         {
            label: "카페24 배송/교환/AS 안내 문구",
            key: "shippingInfo/exchangeInfo/serviceInfo",
            valueType: "문구",
            examples: [
               "해외 배송 상품으로 주문 후 7~14일 이내 발송됩니다.",
               "상품 수령 후 7일 이내 교환 접수 가능합니다.",
            ],
            help: "실제 텍스트를 넣는 칸입니다. 고도몰처럼 코드가 아니라 문구 자체가 저장됩니다.",
         },
         {
            label: "카페24 통관 분류 코드",
            key: "clearanceCategoryCode",
            valueType: "자동 처리",
            examples: ["입력칸 없음"],
            help: "Flowmerce에서는 shipping_calculation을 A(자동계산)로 보내 통관 분류 코드를 직접 입력하지 않도록 처리합니다.",
         },
      ],
      links: [
         {
            label: "Cafe24 상품 생성 API",
            href: "https://developers.cafe24.com/docs/ko/api/admin/?version=2024-12-01",
         },
      ],
   },
   makeshop: {
      title: "메이크샵 정책 메뉴얼",
      description:
         "현재 Flowmerce 메이크샵 연동에서는 배송비와 배송 방식 위주로 사용합니다.",
      sourceNote:
         "Makeshop 상품 등록 API와 공식 Open API 공통 가이드의 deli_type 코드 기준입니다.",
      fields: [
         {
            label: "메이크샵 배송비",
            key: "deliveryFee",
            valueType: "숫자",
            examples: ["0", "3000"],
            help: "원화 숫자만 입력합니다. 무료배송이면 0을 사용합니다.",
         },
         {
            label: "메이크샵 배송 방식",
            key: "deliveryType",
            valueType: "코드",
            examples: ["KOR", "EMS", "HAND"],
            help: "KOR=국내배송, EMS=해외배송, HAND=직접수령입니다.",
         },
      ],
      links: [
         {
            label: "메이크샵 상품 등록 API",
            href: "https://developer.makeshop.co.kr/docs/api/product/post-product-create",
         },
         {
            label: "메이크샵 Open API 코드 가이드",
            href: "https://openapi.makeshop.co.kr/",
         },
      ],
   },
};
const requestLimitByPlan = {
   none: null,
   boutique: 100000,
   basic: 5000,
   pro: 50000,
   enterprise: 200000,
};

function formatDateTime(value) {
   if (!value) {
      return "-";
   }

   const parsed = new Date(value);

   if (Number.isNaN(parsed.getTime())) {
      return "-";
   }

   return new Intl.DateTimeFormat("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
   }).format(parsed);
}

function formatMonthDay(value) {
   if (!value) {
      return "-";
   }

   const parsed = new Date(value);

   if (Number.isNaN(parsed.getTime())) {
      return "-";
   }

   return new Intl.DateTimeFormat("ko-KR", {
      month: "2-digit",
      day: "2-digit",
   }).format(parsed);
}

function toDateTimeLocalValue(value) {
   if (!value) {
      return "";
   }

   const parsed = new Date(value);

   if (Number.isNaN(parsed.getTime())) {
      return "";
   }

   const offset = parsed.getTimezoneOffset();
   const local = new Date(parsed.getTime() - offset * 60 * 1000);
   return local.toISOString().slice(0, 16);
}

function parseDateTimeLocalValue(value) {
   if (!value) {
      return null;
   }

   const parsed = new Date(value);
   return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function stringifyList(value) {
   if (!Array.isArray(value) || value.length === 0) {
      return "";
   }

   return value.join("\n");
}

function parseListText(value) {
   if (!value.trim()) {
      return [];
   }

   return value
      .split(/\r?\n|,/)
      .map((item) => item.trim())
      .filter(Boolean);
}

function parseNullableInteger(value) {
   if (value === "" || value === null || value === undefined) {
      return null;
   }

   const parsed = Number.parseInt(String(value), 10);
   return Number.isNaN(parsed) ? null : parsed;
}

function createEmptyMarketplacePolicyForm() {
   return {
      commonShippingDaysMin: "",
      commonShippingDaysMax: "",
      commonDeliveryNoticeHtml: "",
      commonRefundNoticeHtml: "",
      commonExchangeNoticeHtml: "",
      commonAsNoticeHtml: "",
      commonAsPhone: "",
      commonReturnFee: "",
      commonExchangeFee: "",
      godomallDeliverySno: "",
      godomallDetailInfoDeliveryCode: "",
      godomallDetailInfoAsCode: "",
      godomallDetailInfoRefundCode: "",
      godomallDetailInfoExchangeCode: "",
      smartstoreDeliveryType: "",
      smartstoreDeliveryAttributeType: "",
      smartstoreDeliveryCompany: "",
      smartstoreDeliveryFeeType: "",
      smartstoreReturnDeliveryCompanyPriorityType: "",
      smartstoreReturnDeliveryFee: "",
      smartstoreExchangeDeliveryFee: "",
      smartstoreAsGuideContent: "",
      smartstoreAsPhone: "",
      cafe24ShippingType: "",
      cafe24ShippingMethod: "",
      cafe24ShippingPeriodMin: "",
      cafe24ShippingPeriodMax: "",
      cafe24ShippingArea: "",
      cafe24ShippingInfo: "",
      cafe24ExchangeInfo: "",
      cafe24ServiceInfo: "",
      cafe24ShippingFeeType: "",
      cafe24ShippingFee: "",
      cafe24PrepaidShippingFee: "",
      cafe24ProductShippingType: "",
      cafe24ShippingFeeByProduct: "",
      cafe24ShippingScope: "",
      cafe24ClearanceCategoryCode: "",
      cafe24ShippingInfoByProduct: "",
      cafe24ExchangeInfoByProduct: "",
      cafe24ServiceInfoByProduct: "",
      makeshopDeliveryFee: "",
      makeshopDeliveryType: "",
   };
}

function buildHostingPolicyForm(policy) {
   return {
      ...createEmptyMarketplacePolicyForm(),
      commonShippingDaysMin: String(policy?.common?.shippingDaysMin ?? ""),
      commonShippingDaysMax: String(policy?.common?.shippingDaysMax ?? ""),
      commonDeliveryNoticeHtml: policy?.common?.deliveryNoticeHtml || "",
      commonRefundNoticeHtml: policy?.common?.refundNoticeHtml || "",
      commonExchangeNoticeHtml: policy?.common?.exchangeNoticeHtml || "",
      commonAsNoticeHtml: policy?.common?.asNoticeHtml || "",
      commonAsPhone: policy?.common?.asPhone || "",
      commonReturnFee: String(policy?.common?.returnFee ?? ""),
      commonExchangeFee: String(policy?.common?.exchangeFee ?? ""),
      godomallDeliverySno: policy?.godomall?.deliverySno || "",
      godomallDetailInfoDeliveryCode:
         policy?.godomall?.detailInfoDeliveryCode || "",
      godomallDetailInfoAsCode: policy?.godomall?.detailInfoAsCode || "",
      godomallDetailInfoRefundCode:
         policy?.godomall?.detailInfoRefundCode || "",
      godomallDetailInfoExchangeCode:
         policy?.godomall?.detailInfoExchangeCode || "",
      smartstoreDeliveryType: policy?.smartstore?.deliveryType || "",
      smartstoreDeliveryAttributeType:
         policy?.smartstore?.deliveryAttributeType || "",
      smartstoreDeliveryCompany: policy?.smartstore?.deliveryCompany || "",
      smartstoreDeliveryFeeType: policy?.smartstore?.deliveryFeeType || "",
      smartstoreReturnDeliveryCompanyPriorityType:
         policy?.smartstore?.returnDeliveryCompanyPriorityType || "",
      smartstoreReturnDeliveryFee: String(
         policy?.smartstore?.returnDeliveryFee ?? policy?.common?.returnFee ?? "",
      ),
      smartstoreExchangeDeliveryFee: String(
         policy?.smartstore?.exchangeDeliveryFee ??
            policy?.common?.exchangeFee ??
            "",
      ),
      smartstoreAsGuideContent: policy?.smartstore?.asGuideContent || "",
      smartstoreAsPhone:
         policy?.smartstore?.asPhone || policy?.common?.asPhone || "",
      cafe24ShippingType: policy?.cafe24?.shippingType || "",
      cafe24ShippingMethod: policy?.cafe24?.shippingMethod || "",
      cafe24ShippingPeriodMin: String(
         policy?.cafe24?.shippingPeriodMin ??
            policy?.common?.shippingDaysMin ??
            "",
      ),
      cafe24ShippingPeriodMax: String(
         policy?.cafe24?.shippingPeriodMax ??
            policy?.common?.shippingDaysMax ??
            "",
      ),
      cafe24ShippingArea: policy?.cafe24?.shippingArea || "",
      cafe24ShippingInfo:
         policy?.cafe24?.shippingInfo || policy?.common?.deliveryNoticeHtml || "",
      cafe24ExchangeInfo:
         policy?.cafe24?.exchangeInfo || policy?.common?.exchangeNoticeHtml || "",
      cafe24ServiceInfo:
         policy?.cafe24?.serviceInfo || policy?.common?.asNoticeHtml || "",
      cafe24ShippingFeeType: policy?.cafe24?.shippingFeeType || "",
      cafe24ShippingFee: String(policy?.cafe24?.shippingFee ?? ""),
      cafe24PrepaidShippingFee: policy?.cafe24?.prepaidShippingFee || "",
      cafe24ProductShippingType: policy?.cafe24?.productShippingType || "",
      cafe24ShippingFeeByProduct: policy?.cafe24?.shippingFeeByProduct || "",
      cafe24ShippingScope: policy?.cafe24?.shippingScope || "",
      cafe24ClearanceCategoryCode:
         policy?.cafe24?.clearanceCategoryCode || "",
      cafe24ShippingInfoByProduct:
         policy?.cafe24?.shippingInfoByProduct || "",
      cafe24ExchangeInfoByProduct:
         policy?.cafe24?.exchangeInfoByProduct || "",
      cafe24ServiceInfoByProduct:
         policy?.cafe24?.serviceInfoByProduct || "",
      makeshopDeliveryFee: String(policy?.makeshop?.deliveryFee ?? ""),
      makeshopDeliveryType: policy?.makeshop?.deliveryType || "",
   };
}

function buildMarketplacePolicyPayload(form) {
   const smartstoreReturnDeliveryFee = parseNullableInteger(
      form.smartstoreReturnDeliveryFee,
   );
   const smartstoreExchangeDeliveryFee = parseNullableInteger(
      form.smartstoreExchangeDeliveryFee,
   );
   const cafe24ShippingPeriodMin = parseNullableInteger(
      form.cafe24ShippingPeriodMin,
   );
   const cafe24ShippingPeriodMax = parseNullableInteger(
      form.cafe24ShippingPeriodMax,
   );

   const commonByPlatform =
      form.platform === "smartstore"
         ? {
              shippingDaysMin: null,
              shippingDaysMax: null,
              deliveryNoticeHtml: null,
              refundNoticeHtml: null,
              exchangeNoticeHtml: null,
              asNoticeHtml: null,
              asPhone: form.smartstoreAsPhone.trim() || null,
              returnFee: smartstoreReturnDeliveryFee,
              exchangeFee: smartstoreExchangeDeliveryFee,
           }
         : form.platform === "cafe24"
           ? {
                shippingDaysMin: cafe24ShippingPeriodMin,
                shippingDaysMax: cafe24ShippingPeriodMax,
                deliveryNoticeHtml: form.cafe24ShippingInfo.trim() || null,
                refundNoticeHtml: null,
                exchangeNoticeHtml: form.cafe24ExchangeInfo.trim() || null,
                asNoticeHtml: form.cafe24ServiceInfo.trim() || null,
                asPhone: null,
                returnFee: null,
                exchangeFee: null,
             }
           : {
                shippingDaysMin: null,
                shippingDaysMax: null,
                deliveryNoticeHtml: null,
                refundNoticeHtml: null,
                exchangeNoticeHtml: null,
                asNoticeHtml: null,
                asPhone: null,
                returnFee: null,
                exchangeFee: null,
             };

   return {
      common: commonByPlatform,
      godomall: {
         deliverySno: form.godomallDeliverySno.trim() || null,
         detailInfoDeliveryCode:
            form.godomallDetailInfoDeliveryCode.trim() || null,
         detailInfoAsCode: form.godomallDetailInfoAsCode.trim() || null,
         detailInfoRefundCode:
            form.godomallDetailInfoRefundCode.trim() || null,
         detailInfoExchangeCode:
            form.godomallDetailInfoExchangeCode.trim() || null,
      },
      smartstore: {
         deliveryType: form.smartstoreDeliveryType.trim() || null,
         deliveryAttributeType:
            form.smartstoreDeliveryAttributeType.trim() || null,
         deliveryCompany: form.smartstoreDeliveryCompany.trim() || null,
         deliveryFeeType: form.smartstoreDeliveryFeeType.trim() || null,
         returnDeliveryCompanyPriorityType:
            form.smartstoreReturnDeliveryCompanyPriorityType.trim() || null,
         returnDeliveryFee: smartstoreReturnDeliveryFee,
         exchangeDeliveryFee: smartstoreExchangeDeliveryFee,
         asGuideContent: form.smartstoreAsGuideContent.trim() || null,
         asPhone: form.smartstoreAsPhone.trim() || null,
      },
      cafe24: {
         shippingType: form.cafe24ShippingType.trim() || null,
         shippingMethod: form.cafe24ShippingMethod.trim() || null,
         shippingPeriodMin: cafe24ShippingPeriodMin,
         shippingPeriodMax: cafe24ShippingPeriodMax,
         shippingArea: form.cafe24ShippingArea.trim() || null,
         shippingInfo: form.cafe24ShippingInfo.trim() || null,
         exchangeInfo: form.cafe24ExchangeInfo.trim() || null,
         serviceInfo: form.cafe24ServiceInfo.trim() || null,
         shippingFeeType: form.cafe24ShippingFeeType.trim() || null,
         shippingFee: parseNullableInteger(form.cafe24ShippingFee),
         prepaidShippingFee: form.cafe24PrepaidShippingFee.trim() || null,
         productShippingType:
            form.cafe24ProductShippingType.trim() || null,
         shippingFeeByProduct:
            form.cafe24ShippingFeeByProduct.trim() || null,
         shippingScope: form.cafe24ShippingScope.trim() || null,
         clearanceCategoryCode:
            form.cafe24ClearanceCategoryCode.trim() || null,
         shippingInfoByProduct:
            form.cafe24ShippingInfoByProduct.trim() || null,
         exchangeInfoByProduct:
            form.cafe24ExchangeInfoByProduct.trim() || null,
         serviceInfoByProduct:
            form.cafe24ServiceInfoByProduct.trim() || null,
      },
      makeshop: {
         deliveryFee: parseNullableInteger(form.makeshopDeliveryFee),
         deliveryType: form.makeshopDeliveryType.trim() || null,
      },
   };
}

function encodeCafe24State(payload) {
   const serialized = JSON.stringify(payload);
   return btoa(serialized).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function formatPhoneInput(value) {
   const digits = String(value || "")
      .replace(/\D/g, "")
      .slice(0, 11);

   if (digits.length <= 3) {
      return digits;
   }

   if (digits.length <= 7) {
      return `${digits.slice(0, 3)}-${digits.slice(3)}`;
   }

   return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

function formatNumber(value) {
   if (value === null || value === undefined || value === "") {
      return "-";
   }

   const parsed = Number(value);
   if (!Number.isFinite(parsed)) {
      return "-";
   }

   return new Intl.NumberFormat("ko-KR").format(parsed);
}

function getEffectiveRequestLimit(plan, overrideValue) {
   const override = parseNullableInteger(overrideValue);

   if (override !== null) {
      return override;
   }

   return requestLimitByPlan[plan] ?? null;
}

function getUsagePercent(used, limit) {
   if (!Number.isFinite(used) || !Number.isFinite(limit) || limit <= 0) {
      return null;
   }

   return Math.max(0, Math.min(100, Math.round((used / limit) * 100)));
}

function getScheduleDisplayName(schedule) {
   return (
      schedule.godoMallCategoryName ||
      schedule.smartStoreCategoryName ||
      schedule.categoryName ||
      schedule.name ||
      "-"
   );
}

function getCafe24RefreshStatus(account) {
   if (!account || account.platform !== "cafe24") {
      return null;
   }

   if (!account.refreshTokenExpiresAt) {
      return {
         level: "unknown",
         badge: "\uBBF8\uD655\uC778",
         summary: "\uBBF8\uD655\uC778",
         expiresAt: null,
      };
   }

   const expiresAt = new Date(account.refreshTokenExpiresAt);
   if (Number.isNaN(expiresAt.getTime())) {
      return {
         level: "unknown",
         badge: "\uBBF8\uD655\uC778",
         summary: "\uBBF8\uD655\uC778",
         expiresAt: null,
      };
   }

   const diffMs = expiresAt.getTime() - Date.now();
   if (diffMs <= 0) {
      return {
         level: "expired",
         badge: "\uB9CC\uB8CC",
         summary: "\uAC31\uC2E0 \uD544\uC694",
         expiresAt,
      };
   }

   if (diffMs <= CAFE24_REFRESH_WARNING_MS) {
      const remainingDays = Math.max(
         1,
         Math.ceil(diffMs / (24 * 60 * 60 * 1000)),
      );

      return {
         level: "warning",
         badge: `D-${remainingDays}`,
         summary: "\uAC31\uC2E0 \uD544\uC694",
         expiresAt,
      };
   }

   return {
      level: "ok",
      badge: "\uC815\uC0C1",
      summary: "\uC815\uC0C1",
      expiresAt,
   };
}

function Cafe24RefreshBadge({ status }) {
   if (!status) {
      return <span className="text-zinc-400">-</span>;
   }

   const toneClass =
      status.level === "expired"
         ? "border-red-200 bg-red-50 text-red-700"
         : status.level === "warning"
           ? "border-amber-200 bg-amber-50 text-amber-700"
           : status.level === "ok"
             ? "border-emerald-200 bg-emerald-50 text-emerald-700"
             : "border-zinc-200 bg-zinc-50 text-zinc-700";

   return (
      <span
         className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${toneClass}`}
      >
         {status.badge}
      </span>
   );
}

function isHostingAccountReady(account) {
   if (!account) {
      return false;
   }

   if (account.platform === "cafe24") {
      return Boolean(account.partnerKey && account.apiKey && account.refreshToken);
   }

   return Boolean(account.partnerKey && account.apiKey);
}

function createEmptyUserForm() {
   return {
      id: "",
      name: "",
      loginId: "",
      password: "",
      customId: "",
      phone: "",
      isApproved: false,
      plan: "none",
      subscriptionStartAt: "",
      subscriptionEndAt: "",
      requestUsedCount: "",
      requestLimitOverride: "",
      requestCycleStartAt: "",
      requestCycleEndAt: "",
      sites: "",
      createdAt: "",
      updatedAt: "",
      email: "",
      memo: "",
   };
}

function createEmptyHostingForm() {
   return {
      id: "",
      customId: "",
      platform: "smartstore",
      accountPlatform: "",
      partnerKey: "",
      apiKey: "",
      refreshToken: "",
      tokenExpiresAt: "",
      refreshTokenExpiresAt: "",
      createdAt: "",
      updatedAt: "",
      topImages: "",
      bottomImages: "",
      memo: "",
      ...createEmptyMarketplacePolicyForm(),
   };
}

function createEmptySitemapForm() {
   return {
      site: "",
      apiKey: "",
   };
}

function StatusMessage({ message }) {
   if (!message?.text) {
      return null;
   }

   const toneClass =
      message.tone === "error"
         ? "border-red-200 bg-red-50 text-red-700"
         : message.tone === "success"
           ? "border-emerald-200 bg-emerald-50 text-emerald-700"
           : "border-zinc-200 bg-zinc-50 text-zinc-700";

   return (
      <p className={`rounded-lg border px-4 py-3 text-sm font-medium ${toneClass}`}>
         {message.text}
      </p>
   );
}

function MemoIndicator({ memo }) {
   const text = String(memo || "").trim();
   const [tooltipPosition, setTooltipPosition] = useState(null);

   if (!text) {
      return null;
   }

   const showTooltip = (event) => {
      const rect = event.currentTarget.getBoundingClientRect();
      setTooltipPosition({
         top: rect.bottom + 8,
         left: rect.left + rect.width / 2,
      });
   };

   const hideTooltip = () => {
      setTooltipPosition(null);
   };

   return (
      <>
         <span
            title={text}
            aria-label="메모 있음"
            tabIndex={0}
            onMouseEnter={showTooltip}
            onMouseLeave={hideTooltip}
            onFocus={showTooltip}
            onBlur={hideTooltip}
            className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-amber-200 bg-amber-50 text-amber-800 outline-none ring-amber-300 transition focus:ring-2"
         >
            <svg
               viewBox="0 0 24 24"
               aria-hidden="true"
               className="h-3.5 w-3.5"
               fill="none"
               stroke="currentColor"
               strokeWidth="1.8"
               strokeLinecap="round"
               strokeLinejoin="round"
            >
               <path d="M7 3.5h7.5L19 8v12.5H7z" />
               <path d="M14.5 3.5V8H19" />
               <path d="M10 12h6" />
               <path d="M10 15.5h4" />
               <path d="M5 6.5v14" />
            </svg>
         </span>
         {tooltipPosition ? (
            <span
               role="tooltip"
               className="pointer-events-none fixed z-50 max-w-xs -translate-x-1/2 whitespace-pre-wrap rounded-lg border border-zinc-200 bg-zinc-950 px-3 py-2 text-left text-xs font-medium leading-5 text-white shadow-xl"
               style={{
                  top: tooltipPosition.top,
                  left: tooltipPosition.left,
               }}
            >
               {text}
            </span>
         ) : null}
      </>
   );
}

function TabButton({ label, active, onClick }) {
   return (
      <button
         type="button"
         onClick={onClick}
         className={`rounded-lg px-4 py-2.5 text-sm font-medium transition ${
            active
               ? "border border-emerald-700 bg-emerald-600 text-white shadow-sm"
               : "border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50"
         }`}
      >
         {label}
      </button>
   );
}

function SectionHeader({ title, description, action }) {
   return (
      <div className="flex flex-wrap items-center justify-between gap-4">
         <div className="max-w-3xl">
            <h2 className="text-2xl font-semibold text-zinc-950">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-600">{description}</p>
         </div>
         {action}
      </div>
   );
}

function SitemapForm({ form, onChange, onGenerate, onReset, generating }) {
   return (
      <div className="mt-7 max-w-2xl rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
         <div className="grid gap-5">
            <label className="block">
               <span className="text-sm font-medium text-zinc-600">site</span>
               <input
                  value={form.site}
                  onChange={(event) => onChange("site", event.target.value)}
                  className="mt-1.5 block w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 shadow-sm focus:border-emerald-600 focus:outline-none"
                  placeholder="cieldeeurope"
               />
            </label>

            <label className="block">
               <span className="text-sm font-medium text-zinc-600">apiKey</span>
               <input
                  value={form.apiKey}
                  onChange={(event) => onChange("apiKey", event.target.value)}
                  className="mt-1.5 block w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 shadow-sm focus:border-emerald-600 focus:outline-none"
                  placeholder="apiKey를 입력하세요"
               />
            </label>
         </div>

         <div className="mt-6 flex flex-wrap gap-3">
            <button
               type="button"
               onClick={onGenerate}
               disabled={generating}
               className="inline-flex items-center justify-center rounded-lg border border-emerald-700 bg-emerald-600 px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
               {generating ? "생성 중..." : "사이트맵 생성"}
            </button>
            <button
               type="button"
               onClick={onReset}
               disabled={generating}
               className="inline-flex items-center justify-center rounded-lg border border-zinc-300 bg-white px-5 py-3 text-sm font-medium text-zinc-800 shadow-sm transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-70"
            >
               초기화
            </button>
         </div>
      </div>
   );
}

function ReadOnlyField({ label, value }) {
   return (
      <label className="block">
         <span className="text-sm font-medium text-zinc-600">{label}</span>
         <input
            value={value}
            readOnly
            className="mt-1.5 block w-full rounded-lg border border-zinc-200 bg-zinc-100 px-4 py-3 text-sm text-zinc-600"
         />
      </label>
   );
}

function ContactDetailModal({ contact, onClose }) {
   if (!contact) {
      return null;
   }

   return (
      <div className="fixed inset-0 z-[70] flex items-center justify-center bg-zinc-950/45 px-5 py-8">
         <button
            type="button"
            aria-label="닫기"
            onClick={onClose}
            className="absolute inset-0"
         />
         <div className="relative z-10 w-full max-w-3xl rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl sm:p-7">
            <div className="flex items-start justify-between gap-4">
               <div>
                  <p className="text-sm font-semibold text-emerald-600">
                     {contact.type}
                  </p>
                  <h3 className="mt-2 text-2xl font-semibold text-zinc-950">
                     {contact.title || contact.type}
                  </h3>
               </div>
               <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 shadow-sm transition hover:bg-zinc-50"
               >
                  닫기
               </button>
            </div>

            <dl className="mt-6 grid gap-4 rounded-lg border border-zinc-200 bg-zinc-50 p-5 sm:grid-cols-2">
               <div>
                  <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
                     이름
                  </dt>
                  <dd className="mt-2 text-sm font-medium text-zinc-950">
                     {contact.name}
                  </dd>
               </div>
               <div>
                  <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
                     연락처
                  </dt>
                  <dd className="mt-2 text-sm font-medium text-zinc-950">
                     {contact.phone}
                  </dd>
               </div>
               <div>
                  <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
                     이메일
                  </dt>
                  <dd className="mt-2 text-sm font-medium text-zinc-950">
                     {contact.email || "-"}
                  </dd>
               </div>
               <div>
                  <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
                     접수일시
                  </dt>
                  <dd className="mt-2 text-sm font-medium text-zinc-950">
                     {formatDateTime(contact.createdAt)}
                  </dd>
               </div>
            </dl>

            <div className="mt-6">
               <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
                  문의 내용
               </p>
               <div className="mt-3 rounded-lg border border-zinc-200 bg-white p-5">
                  <p className="whitespace-pre-line text-sm leading-7 text-zinc-700">
                     {contact.content}
                  </p>
               </div>
            </div>
         </div>
      </div>
   );
}

function UserForm({ form, onChange, onSave, onReset, saving }) {
   const effectiveRequestLimit = getEffectiveRequestLimit(
      form.plan,
      form.requestLimitOverride,
   );
   const requestUsedCount = parseNullableInteger(form.requestUsedCount);
   const requestRemainingCount =
      Number.isFinite(effectiveRequestLimit) && Number.isFinite(requestUsedCount)
         ? Math.max(0, effectiveRequestLimit - requestUsedCount)
         : null;
   const requestPercent = getUsagePercent(
      requestUsedCount,
      effectiveRequestLimit,
   );

   return (
      <div className="space-y-4 rounded-lg border border-zinc-200 bg-zinc-50 p-5">
         <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-lg font-semibold text-zinc-950">
               {form.id ? `User 수정 #${form.id}` : "User 추가"}
            </h3>
            <button
               type="button"
               onClick={onReset}
               className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 shadow-sm transition hover:bg-zinc-50"
            >
               새로 작성
            </button>
         </div>

         <div className="grid gap-4 md:grid-cols-2">
            <ReadOnlyField label="id (자동)" value={form.id || "-"} />
            <ReadOnlyField label="updatedAt (자동)" value={form.updatedAt || "-"} />
            <label className="block">
               <span className="text-sm font-medium text-zinc-600">
                  name (필수)
               </span>
               <input
                  value={form.name}
                  onChange={(event) => onChange("name", event.target.value)}
                  className="mt-1.5 block w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm"
               />
            </label>
            <label className="block">
               <span className="text-sm font-medium text-zinc-600">
                  loginId (필수)
               </span>
               <input
                  value={form.loginId}
                  onChange={(event) => onChange("loginId", event.target.value)}
                  className="mt-1.5 block w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm"
               />
            </label>
            <label className="block">
               <span className="text-sm font-medium text-zinc-600">
                  password {form.id ? "(선택, 변경할 때만 입력)" : "(필수)"}
               </span>
               <input
                  type="password"
                  value={form.password}
                  onChange={(event) => onChange("password", event.target.value)}
                  placeholder={form.id ? "비워두면 기존 비밀번호 유지" : ""}
                  className="mt-1.5 block w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm"
               />
            </label>
            <label className="block">
               <span className="text-sm font-medium text-zinc-600">
                  customId (필수)
               </span>
               <input
                  value={form.customId}
                  onChange={(event) => onChange("customId", event.target.value)}
                  className="mt-1.5 block w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm"
               />
            </label>
            <label className="block">
               <span className="text-sm font-medium text-zinc-600">
                  phone (필수)
               </span>
               <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={13}
                  value={form.phone}
                  onChange={(event) => onChange("phone", event.target.value)}
                  placeholder="010-0000-0000"
                  className="mt-1.5 block w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm"
               />
            </label>
            <label className="block">
               <span className="text-sm font-medium text-zinc-600">
                  isApproved (필수)
               </span>
               <label className="mt-1.5 flex items-center gap-3 rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm font-medium text-zinc-700">
                  <input
                     type="checkbox"
                     checked={form.isApproved}
                     onChange={(event) =>
                        onChange("isApproved", event.target.checked)
                     }
                     className="h-4 w-4 rounded border-zinc-300 text-emerald-600"
                  />
                  관리자 승인 완료
               </label>
            </label>
            <label className="block">
               <span className="text-sm font-medium text-zinc-600">
                  plan (필수)
               </span>
               <select
                  value={form.plan}
                  onChange={(event) => onChange("plan", event.target.value)}
                  className="mt-1.5 block w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm"
               >
                  {planOptions.map((plan) => (
                     <option key={plan} value={plan}>
                        {plan}
                     </option>
                  ))}
               </select>
            </label>
            <label className="block">
               <span className="text-sm font-medium text-zinc-600">
                  subscriptionStartAt (선택)
               </span>
               <input
                  type="datetime-local"
                  value={form.subscriptionStartAt}
                  onChange={(event) =>
                     onChange("subscriptionStartAt", event.target.value)
                  }
                  className="mt-1.5 block w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm"
               />
            </label>
            <label className="block">
               <span className="text-sm font-medium text-zinc-600">
                  subscriptionEndAt (선택)
               </span>
               <input
                  type="datetime-local"
                  value={form.subscriptionEndAt}
                  onChange={(event) =>
                     onChange("subscriptionEndAt", event.target.value)
                  }
                  className="mt-1.5 block w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm"
               />
            </label>
            <ReadOnlyField label="createdAt (자동)" value={form.createdAt || "-"} />
            <label className="block">
               <span className="text-sm font-medium text-zinc-600">
                  email (선택)
               </span>
               <input
                  value={form.email}
                  onChange={(event) => onChange("email", event.target.value)}
                  className="mt-1.5 block w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm"
               />
            </label>
         </div>

         <label className="block">
            <span className="text-sm font-medium text-zinc-600">
               memo (선택)
            </span>
            <textarea
               value={form.memo}
               onChange={(event) => onChange("memo", event.target.value)}
               placeholder="관리자용 메모를 입력하세요."
               rows={4}
               className="mt-1.5 block w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm"
            />
         </label>

         <label className="block">
            <span className="text-sm font-medium text-zinc-600">
               sites (선택)
            </span>
            <textarea
               value={form.sites}
               onChange={(event) => onChange("sites", event.target.value)}
               placeholder="한 줄에 하나씩 입력하거나 쉼표로 구분하세요."
               rows={5}
               className="mt-1.5 block w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm"
            />
         </label>

         <div className="rounded-lg border border-zinc-200 bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
               <div>
                  <h4 className="text-base font-semibold text-zinc-950">
                     요청수 관리
                  </h4>
                  <p className="mt-1 text-sm leading-6 text-zinc-600">
                     플랜 기본 요청수와 현재 사용량, 집계 주기를 함께 관리합니다.
                  </p>
               </div>
               <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-right text-sm">
                  <p className="font-medium text-zinc-500">
                     {"현재 사용률"}
                  </p>
                  <p className="mt-1 text-lg font-semibold text-zinc-950">
                     {requestPercent === null ? "-" : `${requestPercent}%`}
                  </p>
               </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
               <ReadOnlyField
                  label="플랜 요청수(자동)"
                  value={formatNumber(requestLimitByPlan[form.plan] ?? null)}
               />
               <ReadOnlyField
                  label="가능 요청수(자동)"
                  value={formatNumber(requestRemainingCount)}
               />
               <label className="block">
                  <span className="text-sm font-medium text-zinc-600">
                     현재 요청수(선택)
                  </span>
                  <input
                     type="number"
                     min="0"
                     value={form.requestUsedCount}
                     onChange={(event) =>
                        onChange("requestUsedCount", event.target.value)
                     }
                     className="mt-1.5 block w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm"
                  />
               </label>
               <label className="block">
                  <span className="text-sm font-medium text-zinc-600">
                     요청수 오버라이드(선택)
                  </span>
                  <input
                     type="number"
                     min="0"
                     value={form.requestLimitOverride}
                     onChange={(event) =>
                        onChange("requestLimitOverride", event.target.value)
                     }
                     className="mt-1.5 block w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm"
                  />
               </label>
               <label className="block">
                  <span className="text-sm font-medium text-zinc-600">
                     요청수 집계 시작일(선택)
                  </span>
                  <input
                     type="datetime-local"
                     value={form.requestCycleStartAt}
                     onChange={(event) =>
                        onChange("requestCycleStartAt", event.target.value)
                     }
                     className="mt-1.5 block w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm"
                  />
               </label>
               <label className="block">
                  <span className="text-sm font-medium text-zinc-600">
                     요청수 집계 종료일(선택)
                  </span>
                  <input
                     type="datetime-local"
                     value={form.requestCycleEndAt}
                     onChange={(event) =>
                        onChange("requestCycleEndAt", event.target.value)
                     }
                     className="mt-1.5 block w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm"
                  />
               </label>
            </div>
         </div>

         <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="inline-flex items-center justify-center rounded-lg border border-emerald-700 bg-emerald-600 px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
         >
            {saving ? "저장 중..." : "저장"}
         </button>
      </div>
   );
}

function HostingPolicyManualModal({ manual, onClose }) {
   if (!manual) {
      return null;
   }

   return (
      <div className="fixed inset-0 z-[80] flex items-center justify-center bg-zinc-950/45 px-5 py-8">
         <button
            type="button"
            aria-label="닫기"
            onClick={onClose}
            className="absolute inset-0"
         />
         <div className="relative z-10 flex max-h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-zinc-200 px-6 py-5">
               <div className="max-w-3xl">
                  <h3 className="text-xl font-semibold text-zinc-950">
                     {manual.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-zinc-600">
                     {manual.description}
                  </p>
                  <p className="mt-2 text-xs leading-5 text-zinc-500">
                     {manual.sourceNote}
                  </p>
               </div>
               <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 shadow-sm transition hover:bg-zinc-50"
               >
                  닫기
               </button>
            </div>

            <div className="overflow-y-auto px-6 py-5">
               {manual.links?.length ? (
                  <div className="mb-6 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                     <p className="text-sm font-semibold text-zinc-900">참고 문서</p>
                     <ul className="mt-3 space-y-2 text-sm text-zinc-700">
                        {manual.links.map((link) => (
                           <li key={link.href}>
                              <a
                                 href={link.href}
                                 target="_blank"
                                 rel="noreferrer"
                                 className="text-emerald-700 underline underline-offset-2 hover:text-emerald-800"
                              >
                                 {link.label}
                              </a>
                           </li>
                        ))}
                     </ul>
                  </div>
               ) : null}

               <div className="space-y-4">
                  {manual.fields.map((field) => (
                     <div
                        key={field.key}
                        className="rounded-xl border border-zinc-200 bg-white p-4"
                     >
                        <div className="flex flex-wrap items-center gap-2">
                           <h4 className="text-sm font-semibold text-zinc-950">
                              {field.label}
                           </h4>
                           <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-semibold text-zinc-600">
                              {field.valueType}
                           </span>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-zinc-700">
                           {field.help}
                        </p>
                        {field.examples?.length ? (
                           <div className="mt-3">
                              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
                                 예시 값
                              </p>
                              <div className="mt-2 flex flex-wrap gap-2">
                                 {field.examples.map((example) => (
                                    <code
                                       key={example}
                                       className="rounded-md bg-zinc-100 px-2 py-1 text-xs text-zinc-800"
                                    >
                                       {example}
                                    </code>
                                 ))}
                              </div>
                           </div>
                        ) : null}
                     </div>
                  ))}
               </div>
            </div>
         </div>
      </div>
   );
}

function HostingForm({
   form,
   onChange,
   onSave,
   onReset,
   onConnectCafe24,
   saving,
   connectingCafe24,
}) {
   const [openedPolicyManualPlatform, setOpenedPolicyManualPlatform] = useState(null);
   const isCafe24 = form.platform === "cafe24";
   const partnerKeyLabel = isCafe24
      ? "mallId (필수)"
      : "partnerKey (필수)";
   const apiKeyLabel = isCafe24
      ? "accessToken (자동)"
      : "apiKey (필수)";
   const availabilityText = isCafe24
      ? "mallId, accessToken, refreshToken이 채워지면 사용 가능으로 표시됩니다."
      : "partnerKey와 apiKey가 모두 채워지면 사용 가능으로 표시됩니다.";
   const platformPolicyLabel =
      {
         godomall: "고도몰",
         smartstore: "스마트스토어",
         cafe24: "카페24",
         makeshop: "메이크샵",
      }[form.platform] || form.platform;
   const renderPolicyFieldLabel = (label, required = false) => (
      <span className="flex flex-wrap items-center gap-2 text-sm font-medium text-zinc-600">
         <span>{label}</span>
         <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${
               required
                  ? "bg-rose-100 text-rose-700"
                  : "bg-zinc-100 text-zinc-600"
            }`}
         >
            {required ? "필수" : "선택"}
         </span>
      </span>
   );
   const policyFieldPlaceholders = {
      godomallDeliverySno: "예: 2",
      godomallDetailInfoDeliveryCode: "예: 002001",
      godomallDetailInfoAsCode: "예: 003001",
      godomallDetailInfoRefundCode: "예: 004001",
      godomallDetailInfoExchangeCode: "예: 005001",
      smartstoreDeliveryType: "예: DELIVERY",
      smartstoreDeliveryAttributeType: "예: NORMAL",
      smartstoreDeliveryCompany: "예: EPOST",
      smartstoreDeliveryFeeType: "예: FREE",
      smartstoreReturnDeliveryCompanyPriorityType: "예: PRIMARY",
      smartstoreReturnDeliveryFee: "예: 50000",
      smartstoreExchangeDeliveryFee: "예: 100000",
      smartstoreAsGuideContent: "예: 상품상세 참조",
      smartstoreAsPhone: "예: 070-8098-3779",
      cafe24ShippingType: "예: C",
      cafe24ShippingMethod: "예: 01",
      cafe24ShippingPeriodMin: "예: 7",
      cafe24ShippingPeriodMax: "예: 14",
      cafe24ShippingArea: "예: 해외배송",
      cafe24ShippingFeeType: "예: T",
      cafe24ShippingFee: "예: 0",
      cafe24PrepaidShippingFee: "예: P",
      cafe24ProductShippingType: "예: D",
      cafe24ShippingFeeByProduct: "예: T",
      cafe24ShippingScope: "예: C",
      cafe24ClearanceCategoryCode: "예: ACAB0000",
      cafe24ShippingInfoByProduct: "예: T",
      cafe24ExchangeInfoByProduct: "예: T",
      cafe24ServiceInfoByProduct: "예: T",
      makeshopDeliveryFee: "예: 0",
      makeshopDeliveryType: "예: EMS",
   };
   const activePolicyManual =
      hostingPolicyManuals[openedPolicyManualPlatform] || null;

   return (
      <div className="space-y-4 rounded-lg border border-zinc-200 bg-zinc-50 p-5">
         <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-lg font-semibold text-zinc-950">
               {form.id ? `Hosting 수정 #${form.id}` : "Hosting 추가"}
            </h3>
            <button
               type="button"
               onClick={onReset}
               className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 shadow-sm transition hover:bg-zinc-50"
            >
               새로 작성
            </button>
         </div>

         <div className="grid gap-4 md:grid-cols-2">
            <ReadOnlyField label="id (자동)" value={form.id || "-"} />
            <ReadOnlyField label="updatedAt (자동)" value={form.updatedAt || "-"} />
            <label className="block">
               <span className="text-sm font-medium text-zinc-600">
                  customId (필수)
               </span>
               <input
                  value={form.customId}
                  onChange={(event) => onChange("customId", event.target.value)}
                  className="mt-1.5 block w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm"
               />
            </label>
            <label className="block">
               <span className="text-sm font-medium text-zinc-600">
                  platform (필수)
               </span>
               <select
                  value={form.platform}
                  onChange={(event) => onChange("platform", event.target.value)}
                  className="mt-1.5 block w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm"
               >
                  {platformOptions.map((platform) => (
                     <option key={platform} value={platform}>
                        {platform}
                     </option>
                  ))}
               </select>
            </label>
            <label className="block">
               <span className="text-sm font-medium text-zinc-600">
                  accountPlatform (필수)
               </span>
               <input
                  value={form.accountPlatform}
                  onChange={(event) => onChange("accountPlatform", event.target.value)}
                  className="mt-1.5 block w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm"
               />
            </label>
            <label className="block">
               <span className="text-sm font-medium text-zinc-600">
                  {partnerKeyLabel}
               </span>
               <input
                  value={form.partnerKey}
                  onChange={(event) => onChange("partnerKey", event.target.value)}
                  className="mt-1.5 block w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm"
               />
            </label>
            <label className="block md:col-span-2">
               <span className="text-sm font-medium text-zinc-600">
                  {apiKeyLabel}
               </span>
               <input
                  value={form.apiKey}
                  onChange={(event) => onChange("apiKey", event.target.value)}
                  className="mt-1.5 block w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm"
               />
            </label>
            {isCafe24 ? (
               <>
                  <label className="block md:col-span-2">
                     <span className="text-sm font-medium text-zinc-600">
                        {"refreshToken (자동)"}
                     </span>
                     <input
                        value={form.refreshToken}
                        onChange={(event) => onChange("refreshToken", event.target.value)}
                        className="mt-1.5 block w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm"
                     />
                  </label>
                  <label className="block">
                     <span className="text-sm font-medium text-zinc-600">
                        {"accessToken 만료일 (자동)"}
                     </span>
                     <input
                        type="datetime-local"
                        value={form.tokenExpiresAt}
                        onChange={(event) => onChange("tokenExpiresAt", event.target.value)}
                        className="mt-1.5 block w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm"
                     />
                  </label>
                  <label className="block">
                     <span className="text-sm font-medium text-zinc-600">
                        {"refreshToken 만료일 (자동)"}
                     </span>
                     <input
                        type="datetime-local"
                        value={form.refreshTokenExpiresAt}
                        onChange={(event) => onChange("refreshTokenExpiresAt", event.target.value)}
                        className="mt-1.5 block w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm"
                     />
                  </label>
               </>
            ) : null}
            <ReadOnlyField label="createdAt (자동)" value={form.createdAt || "-"} />
            <div className="rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-600">
               <span className="font-medium text-zinc-700">사용 가능 상태</span>
               <p className="mt-2 leading-6">{availabilityText}</p>
            </div>
         </div>

         <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
               <span className="text-sm font-medium text-zinc-600">
                  상단 이미지 목록 (선택)
               </span>
               <textarea
                  value={form.topImages}
                  onChange={(event) => onChange("topImages", event.target.value)}
                  placeholder="한 줄에 하나씩 입력하거나 쉼표로 구분하세요."
                  rows={5}
                  className="mt-1.5 block w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm"
               />
            </label>
            <label className="block">
               <span className="text-sm font-medium text-zinc-600">
                  bottomImages (선택)
               </span>
               <textarea
                  value={form.bottomImages}
                  onChange={(event) => onChange("bottomImages", event.target.value)}
                  placeholder="한 줄에 하나씩 입력하거나 쉼표로 구분하세요."
                  rows={5}
                  className="mt-1.5 block w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm"
               />
            </label>
         </div>

         <label className="block">
            <span className="text-sm font-medium text-zinc-600">
               memo (선택)
            </span>
            <textarea
               value={form.memo}
               onChange={(event) => onChange("memo", event.target.value)}
               placeholder="관리자용 메모를 입력하세요."
               rows={4}
               className="mt-1.5 block w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm"
            />
         </label>

         <div className="space-y-4 rounded-lg border border-zinc-200 bg-white p-5">
            <div>
               <h4 className="text-base font-semibold text-zinc-950">
                  마켓 정책 설정
               </h4>
               <p className="mt-1 text-sm leading-6 text-zinc-600">
                  현재 선택한 {platformPolicyLabel} 계정에 필요한 항목만 표시합니다. 연락처는 API에서 실제로 사용하는 플랫폼에만 보이며, 비워두면 내부 기본값이 적용됩니다.
               </p>
               <p className="mt-2 text-xs leading-5 text-zinc-500">
                  필수/선택 표시는 안내용이며, 입력값이 비어 있어도 저장 버튼을 막지 않습니다.
               </p>
            </div>

            {form.platform === "godomall" ? (
               <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                  <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                     <div>
                        <h5 className="text-sm font-semibold text-zinc-950">
                           고도몰 전용 코드 설정
                        </h5>
                        <p className="mt-1 text-xs leading-5 text-zinc-500">
                           고도몰은 배송/환불/교환/AS 문구를 텍스트가 아니라 안내 코드로 연결합니다. 별도 AS 연락처 입력 칸은 사용하지 않습니다.
                        </p>
                     </div>
                     <button
                        type="button"
                        onClick={() => setOpenedPolicyManualPlatform("godomall")}
                        className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-medium text-zinc-800 shadow-sm transition hover:bg-zinc-50"
                     >
                        메뉴얼 보기
                     </button>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                     {[
                        ["godomallDeliverySno", "고도몰 배송정책 번호", true],
                        [
                           "godomallDetailInfoDeliveryCode",
                           "고도몰 배송 안내 코드",
                           true,
                        ],
                        ["godomallDetailInfoAsCode", "고도몰 AS 안내 코드", true],
                        [
                           "godomallDetailInfoRefundCode",
                           "고도몰 환불 안내 코드",
                           true,
                        ],
                        [
                           "godomallDetailInfoExchangeCode",
                           "고도몰 교환 안내 코드",
                           true,
                        ],
                     ].map(([field, label, required]) => (
                        <label key={field} className="block">
                           {renderPolicyFieldLabel(label, required)}
                           <input
                              value={form[field]}
                              onChange={(event) => onChange(field, event.target.value)}
                              placeholder={policyFieldPlaceholders[field] || ""}
                              className="mt-1.5 block w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm"
                           />
                        </label>
                     ))}
                  </div>
               </div>
            ) : null}

            {form.platform === "smartstore" ? (
               <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                  <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                     <div>
                        <h5 className="text-sm font-semibold text-zinc-950">
                           스마트스토어 전용 설정
                        </h5>
                        <p className="mt-1 text-xs leading-5 text-zinc-500">
                           스마트스토어는 배송 유형, 반품/교환 배송비, A/S 안내와 A/S 전화번호를 직접 저장합니다.
                        </p>
                     </div>
                     <button
                        type="button"
                        onClick={() => setOpenedPolicyManualPlatform("smartstore")}
                        className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-medium text-zinc-800 shadow-sm transition hover:bg-zinc-50"
                     >
                        메뉴얼 보기
                     </button>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                     {[
                        ["smartstoreDeliveryType", "스마트스토어 배송 유형", true],
                        [
                           "smartstoreDeliveryAttributeType",
                           "스마트스토어 배송 속성",
                           true,
                        ],
                        ["smartstoreDeliveryCompany", "스마트스토어 택배사", true],
                        ["smartstoreDeliveryFeeType", "스마트스토어 배송비 유형", true],
                        [
                           "smartstoreReturnDeliveryCompanyPriorityType",
                           "스마트스토어 반품 택배 우선순위",
                           true,
                        ],
                        [
                           "smartstoreReturnDeliveryFee",
                           "스마트스토어 반품 배송비",
                           true,
                        ],
                        [
                           "smartstoreExchangeDeliveryFee",
                           "스마트스토어 교환 배송비",
                           true,
                        ],
                        ["smartstoreAsGuideContent", "스마트스토어 AS 안내", true],
                        ["smartstoreAsPhone", "스마트스토어 AS 연락처", true],
                     ].map(([field, label, required]) => (
                        <label
                           key={field}
                           className={`block ${
                              field === "smartstoreAsGuideContent" ||
                              field === "smartstoreAsPhone"
                                 ? "md:col-span-2"
                                 : ""
                           }`}
                        >
                           {renderPolicyFieldLabel(label, required)}
                           <input
                              value={form[field]}
                              onChange={(event) => onChange(field, event.target.value)}
                              placeholder={policyFieldPlaceholders[field] || ""}
                              className="mt-1.5 block w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm"
                           />
                        </label>
                     ))}
                  </div>
               </div>
            ) : null}

            {form.platform === "cafe24" ? (
               <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                  <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                     <div>
                        <h5 className="text-sm font-semibold text-zinc-950">
                           카페24 전용 설정
                        </h5>
                        <p className="mt-1 text-xs leading-5 text-zinc-500">
                           카페24는 배송 기간, 배송 범위, 배송비와 배송/교환/AS 안내 문구를 직접 텍스트로 저장합니다. 별도 AS 연락처 입력 칸은 사용하지 않습니다.
                        </p>
                     </div>
                     <button
                        type="button"
                        onClick={() => setOpenedPolicyManualPlatform("cafe24")}
                        className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-medium text-zinc-800 shadow-sm transition hover:bg-zinc-50"
                     >
                        메뉴얼 보기
                     </button>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                     {[
                        ["cafe24ShippingType", "카페24 배송 구분", false],
                        ["cafe24ShippingMethod", "카페24 배송 방법", true],
                        ["cafe24ShippingPeriodMin", "카페24 배송 시작일", true],
                        ["cafe24ShippingPeriodMax", "카페24 배송 종료일", true],
                        ["cafe24ShippingArea", "카페24 배송 가능 지역", true],
                        ["cafe24ShippingFeeType", "카페24 배송비 유형", true],
                        ["cafe24ShippingFee", "카페24 배송비", false],
                        ["cafe24PrepaidShippingFee", "카페24 선결제 배송비", true],
                        [
                           "cafe24ProductShippingType",
                           "카페24 상품 배송 타입",
                           true,
                        ],
                        ["cafe24ShippingFeeByProduct", "카페24 상품별 배송비 사용", true],
                        ["cafe24ShippingScope", "카페24 배송 범위", true],
                        [
                           "cafe24ShippingInfoByProduct",
                           "카페24 상품별 배송 안내 사용",
                           false,
                        ],
                        [
                           "cafe24ExchangeInfoByProduct",
                           "카페24 상품별 교환 안내 사용",
                           false,
                        ],
                        [
                           "cafe24ServiceInfoByProduct",
                           "카페24 상품별 AS 안내 사용",
                           false,
                        ],
                     ].map(([field, label, required]) => (
                        <label key={field} className="block">
                           {renderPolicyFieldLabel(label, required)}
                           <input
                              value={form[field]}
                              onChange={(event) => onChange(field, event.target.value)}
                              placeholder={policyFieldPlaceholders[field] || ""}
                              className="mt-1.5 block w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm"
                           />
                        </label>
                     ))}
                     <label className="block md:col-span-2">
                        {renderPolicyFieldLabel("카페24 배송 안내 문구", false)}
                        <textarea
                           value={form.cafe24ShippingInfo}
                           onChange={(event) =>
                              onChange("cafe24ShippingInfo", event.target.value)
                           }
                           placeholder="예: 해외 배송 상품으로 주문 후 7~14일 이내 발송됩니다."
                           rows={3}
                           className="mt-1.5 block w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm"
                        />
                     </label>
                     <label className="block md:col-span-2">
                        {renderPolicyFieldLabel("카페24 교환 안내 문구", false)}
                        <textarea
                           value={form.cafe24ExchangeInfo}
                           onChange={(event) =>
                              onChange("cafe24ExchangeInfo", event.target.value)
                           }
                           placeholder="예: 상품 수령 후 7일 이내 교환 접수 가능하며 왕복 배송비는 고객 부담입니다."
                           rows={3}
                           className="mt-1.5 block w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm"
                        />
                     </label>
                     <label className="block md:col-span-2">
                        {renderPolicyFieldLabel("카페24 AS 안내 문구", false)}
                        <textarea
                           value={form.cafe24ServiceInfo}
                           onChange={(event) =>
                              onChange("cafe24ServiceInfo", event.target.value)
                           }
                           placeholder="예: AS 및 상품 문의는 고객센터로 문의해 주세요."
                           rows={3}
                           className="mt-1.5 block w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm"
                        />
                     </label>
                  </div>
               </div>
            ) : null}

            {form.platform === "makeshop" ? (
               <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                  <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                     <h5 className="text-sm font-semibold text-zinc-950">
                        메이크샵 전용 설정
                     </h5>
                     <p className="mt-1 text-xs leading-5 text-zinc-500">
                        메이크샵 상품 등록 API 기준으로 현재는 배송비와 배송 방식 위주로 저장합니다. 별도 AS 연락처 입력 칸은 사용하지 않습니다.
                     </p>
                     <button
                        type="button"
                        onClick={() => setOpenedPolicyManualPlatform("makeshop")}
                        className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-medium text-zinc-800 shadow-sm transition hover:bg-zinc-50"
                     >
                        메뉴얼 보기
                     </button>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                     <label className="block">
                        {renderPolicyFieldLabel("메이크샵 배송비", true)}
                        <input
                           type="number"
                           value={form.makeshopDeliveryFee}
                           onChange={(event) =>
                              onChange("makeshopDeliveryFee", event.target.value)
                           }
                           placeholder={policyFieldPlaceholders.makeshopDeliveryFee}
                           className="mt-1.5 block w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm"
                        />
                     </label>
                     <label className="block">
                        {renderPolicyFieldLabel("메이크샵 배송 방식", true)}
                        <input
                           value={form.makeshopDeliveryType}
                           onChange={(event) =>
                              onChange("makeshopDeliveryType", event.target.value)
                           }
                           placeholder={policyFieldPlaceholders.makeshopDeliveryType}
                           className="mt-1.5 block w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm"
                        />
                     </label>
                  </div>
               </div>
            ) : null}
         </div>

         <div className="flex flex-wrap items-center gap-3">
            <button
               type="button"
               onMouseDown={(event) => event.preventDefault()}
               onClick={onSave}
               disabled={saving}
               className="inline-flex items-center justify-center rounded-lg border border-emerald-700 bg-emerald-600 px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
               {saving ? "저장 중..." : "저장"}
            </button>
            {isCafe24 ? (
               <button
                  type="button"
                  onClick={onConnectCafe24}
                  disabled={saving || connectingCafe24}
                  className="inline-flex items-center justify-center rounded-lg border border-zinc-300 bg-white px-5 py-3 text-sm font-medium text-zinc-800 shadow-sm transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-70"
               >
                  {connectingCafe24
                     ? "Cafe24 연동 중..."
                     : "Cafe24 연동"}
               </button>
            ) : null}
         </div>
         <HostingPolicyManualModal
            manual={activePolicyManual}
            onClose={() => setOpenedPolicyManualPlatform(null)}
         />
      </div>
   );
}
export default function AdminDashboard() {
   const [activeTab, setActiveTab] = useState("contacts");
   const [activeScheduleSubtab, setActiveScheduleSubtab] = useState("active");

   const [contacts, setContacts] = useState([]);
   const [selectedContact, setSelectedContact] = useState(null);
   const [loadingContacts, setLoadingContacts] = useState(true);
   const [contactError, setContactError] = useState("");

   const [availableCustomIds, setAvailableCustomIds] = useState([]);
   const [selectedCustomId, setSelectedCustomId] = useState("");
   const [availableAccountPlatforms, setAvailableAccountPlatforms] = useState([]);
   const [selectedAccountPlatform, setSelectedAccountPlatform] = useState("");
   const [availableScheduleSites, setAvailableScheduleSites] = useState([]);
   const [selectedScheduleSite, setSelectedScheduleSite] = useState("");
   const [schedules, setSchedules] = useState([]);
   const [selectedScheduleIds, setSelectedScheduleIds] = useState([]);
   const [loadingCustomIds, setLoadingCustomIds] = useState(true);
   const [loadingAccountPlatforms, setLoadingAccountPlatforms] = useState(false);
   const [loadingScheduleSites, setLoadingScheduleSites] = useState(false);
   const [loadingSchedules, setLoadingSchedules] = useState(false);
   const [activeRunRequestCount, setActiveRunRequestCount] = useState(0);
   const [deletingSchedules, setDeletingSchedules] = useState(false);
   const [scheduleMessage, setScheduleMessage] = useState({
      tone: "neutral",
      text: "",
   });

   const [usersLoaded, setUsersLoaded] = useState(false);
   const [users, setUsers] = useState([]);
   const [loadingUsers, setLoadingUsers] = useState(false);
   const [savingUser, setSavingUser] = useState(false);
   const [userMessage, setUserMessage] = useState({ tone: "neutral", text: "" });
   const [userForm, setUserForm] = useState(createEmptyUserForm());

   const [hostingLoaded, setHostingLoaded] = useState(false);
   const [hostingAccounts, setHostingAccounts] = useState([]);
   const [loadingHostingAccounts, setLoadingHostingAccounts] = useState(false);
   const [savingHostingAccount, setSavingHostingAccount] = useState(false);
   const [hostingMessage, setHostingMessage] = useState({
      tone: "neutral",
      text: "",
   });
   const [hostingForm, setHostingForm] = useState(createEmptyHostingForm());
   const [connectingCafe24, setConnectingCafe24] = useState(false);
   const [sitemapForm, setSitemapForm] = useState(createEmptySitemapForm());
   const [generatingSitemap, setGeneratingSitemap] = useState(false);
   const [sitemapMessage, setSitemapMessage] = useState({
      tone: "neutral",
      text: "",
   });

   const scheduleStatus = activeScheduleSubtab === "completed" ? "done" : "active";
   const cafe24RefreshWatchAccounts = useMemo(() => {
      return hostingAccounts
         .map((account) => ({
            account,
            status: getCafe24RefreshStatus(account),
         }))
         .filter(
            ({ status }) =>
               status &&
               (status.level === "expired" || status.level === "warning"),
         )
         .sort((left, right) => {
            const leftTime = left.status?.expiresAt?.getTime?.() ?? Number.POSITIVE_INFINITY;
            const rightTime =
               right.status?.expiresAt?.getTime?.() ?? Number.POSITIVE_INFINITY;
            return leftTime - rightTime;
         });
   }, [hostingAccounts]);

   useEffect(() => {
      let cancelled = false;

      async function loadContacts() {
         try {
            const items = await fetchAdminContacts();

            if (!cancelled) {
               setContacts(items);
            }
         } catch (loadError) {
            if (!cancelled) {
               setContactError(
                  loadError.message ||
                     "문의 목록을 불러오지 못했습니다. 서버 연결을 확인해주세요.",
               );
            }
         } finally {
            if (!cancelled) {
               setLoadingContacts(false);
            }
         }
      }

      void loadContacts();

      return () => {
         cancelled = true;
      };
   }, []);

   useEffect(() => {
      let cancelled = false;

      async function loadScheduleCustomIds() {
         setLoadingCustomIds(true);
         setScheduleMessage({ tone: "neutral", text: "" });

         try {
            const items = await fetchScheduledCustomIds(scheduleStatus);

            if (!cancelled) {
               setAvailableCustomIds(items);
            }
         } catch (loadError) {
            if (!cancelled) {
               setScheduleMessage({
                  tone: "error",
                  text:
                     loadError.message ||
                     "수집 예약 customId 목록을 불러오지 못했습니다.",
               });
            }
         } finally {
            if (!cancelled) {
               setLoadingCustomIds(false);
            }
         }
      }

      setSelectedCustomId("");
      setAvailableAccountPlatforms([]);
      setSelectedAccountPlatform("");
      setAvailableScheduleSites([]);
      setSelectedScheduleSite("");
      setSchedules([]);
      setSelectedScheduleIds([]);

      void loadScheduleCustomIds();

      return () => {
         cancelled = true;
      };
   }, [scheduleStatus]);

  useEffect(() => {
     if (activeTab === "users" && !usersLoaded && !loadingUsers) {
        void loadUsers();
     }

      if (activeTab === "hosting" && !hostingLoaded && !loadingHostingAccounts) {
         void loadHostingAccounts();
      }
   }, [
      activeTab,
      hostingLoaded,
      loadingHostingAccounts,
      loadingUsers,
      usersLoaded,
   ]);

   useEffect(() => {
      function handleCafe24Connected(event) {
         if (event.origin !== window.location.origin) {
            return;
         }

         if (event.data?.type !== "flowmerce-cafe24-connected") {
            return;
         }

         setConnectingCafe24(false);
         setHostingLoaded(false);
         setHostingMessage({
            tone: "success",
            text: "Cafe24 연동이 완료되었습니다.",
         });

         if (event.data?.account) {
            handleSelectHostingAccount(event.data.account);
         }

         void loadHostingAccounts();
      }

      window.addEventListener("message", handleCafe24Connected);
      return () => {
         window.removeEventListener("message", handleCafe24Connected);
      };
   }, []);

   useEffect(() => {
      if (activeTab !== "hosting") {
         return undefined;
      }

      const intervalId = window.setInterval(() => {
         if (document.visibilityState === "hidden") {
            return;
         }

         void fetchAdminHostingAccounts()
            .then((items) => {
               setHostingAccounts(items);
               setHostingLoaded(true);
            })
            .catch(() => {});
      }, 60 * 1000);

      return () => {
         window.clearInterval(intervalId);
      };
   }, [activeTab]);

   useEffect(() => {
      if (!selectedCustomId) {
         setAvailableAccountPlatforms([]);
         setSelectedAccountPlatform("");
         setAvailableScheduleSites([]);
         setSelectedScheduleSite("");
         setSchedules([]);
         setSelectedScheduleIds([]);
         return;
      }

      let cancelled = false;

      async function loadAccountPlatforms() {
         setLoadingAccountPlatforms(true);
         setScheduleMessage({ tone: "neutral", text: "" });
         setAvailableAccountPlatforms([]);
         setSelectedAccountPlatform("");
         setAvailableScheduleSites([]);
         setSelectedScheduleSite("");
         setSchedules([]);
         setSelectedScheduleIds([]);

         try {
            const items = await fetchScheduledAccountPlatforms(
               selectedCustomId,
               scheduleStatus,
            );

            if (!cancelled) {
               setAvailableAccountPlatforms(items);
               if (items.length === 1) {
                  setSelectedAccountPlatform(items[0]);
               }
            }
         } catch (loadError) {
            if (!cancelled) {
               setScheduleMessage({
                  tone: "error",
                  text:
                     loadError.message ||
                     "예약이 걸린 accountPlatform 목록을 불러오지 못했습니다.",
               });
            }
         } finally {
            if (!cancelled) {
               setLoadingAccountPlatforms(false);
            }
         }
      }

      void loadAccountPlatforms();

      return () => {
         cancelled = true;
      };
   }, [selectedCustomId, scheduleStatus]);

   useEffect(() => {
      if (!selectedCustomId || !selectedAccountPlatform) {
         setAvailableScheduleSites([]);
         setSelectedScheduleSite("");
         setSchedules([]);
         setSelectedScheduleIds([]);
         return;
      }

      let cancelled = false;

      async function loadScheduleSites() {
         setLoadingScheduleSites(true);
         setScheduleMessage({ tone: "neutral", text: "" });
         setAvailableScheduleSites([]);
         setSelectedScheduleSite("");
         setSchedules([]);
         setSelectedScheduleIds([]);

         try {
            const items = await fetchScheduledSites(
               selectedCustomId,
               selectedAccountPlatform,
               scheduleStatus,
            );

            if (!cancelled) {
               setAvailableScheduleSites(items);
            }
         } catch (loadError) {
            if (!cancelled) {
               setScheduleMessage({
                  tone: "error",
                  text:
                     loadError.message ||
                     "예약이 걸린 사이트 목록을 불러오지 못했습니다.",
               });
            }
         } finally {
            if (!cancelled) {
               setLoadingScheduleSites(false);
            }
         }
      }

      void loadScheduleSites();

      return () => {
         cancelled = true;
      };
   }, [selectedAccountPlatform, selectedCustomId, scheduleStatus]);

   useEffect(() => {
      if (!selectedCustomId || !selectedAccountPlatform) {
         return undefined;
      }

      let cancelled = false;

      async function loadSchedulesForFilter() {
         setScheduleMessage({ tone: "neutral", text: "" });
         setLoadingSchedules(true);
         setSelectedScheduleIds([]);
         setSchedules([]);

         try {
            const items = await fetchSchedules(
               selectedCustomId,
               selectedAccountPlatform,
               scheduleStatus,
               selectedScheduleSite,
            );

            if (!cancelled) {
               setSchedules(items);

               if (items.length === 0) {
                  setScheduleMessage({
                     tone: "success",
                     text:
                        scheduleStatus === "done"
                           ? "현재 완료된 예약이 없습니다."
                           : "현재 실행 대상 예약이 없습니다.",
                  });
               }
            }
         } catch (error) {
            if (!cancelled) {
               setSchedules([]);
               setScheduleMessage({
                  tone: "error",
                  text:
                     error.message ||
                     "예약 목록을 불러오지 못했습니다. customId, accountPlatform, site를 확인해주세요.",
               });
            }
         } finally {
            if (!cancelled) {
               setLoadingSchedules(false);
            }
         }
      }

      void loadSchedulesForFilter();

      return () => {
         cancelled = true;
      };
   }, [
      scheduleStatus,
      selectedAccountPlatform,
      selectedCustomId,
      selectedScheduleSite,
   ]);

   async function loadUsers() {
      setLoadingUsers(true);
      setUserMessage({ tone: "neutral", text: "" });

      try {
         const items = await fetchAdminUsers();
         setUsers(items);
      } catch (error) {
         setUserMessage({
            tone: "error",
            text:
               error.message ||
               "User 목록을 불러오지 못했습니다. 관리자 API를 확인해주세요.",
         });
      } finally {
         setLoadingUsers(false);
         setUsersLoaded(true);
      }
   }

   async function loadHostingAccounts() {
      setLoadingHostingAccounts(true);
      setHostingMessage({ tone: "neutral", text: "" });

      try {
         const items = await fetchAdminHostingAccounts();
         setHostingAccounts(items);
      } catch (error) {
         setHostingMessage({
            tone: "error",
            text:
               error.message ||
               "Hosting 목록을 불러오지 못했습니다. 관리자 API를 확인해주세요.",
         });
      } finally {
         setLoadingHostingAccounts(false);
         setHostingLoaded(true);
      }
   }

   const allSchedulesChecked =
      schedules.length > 0 && selectedScheduleIds.length === schedules.length;

   const selectedSchedules = useMemo(
      () => schedules.filter((item) => selectedScheduleIds.includes(item.id)),
      [schedules, selectedScheduleIds],
   );

   const toggleScheduleSelection = (id) => {
      setSelectedScheduleIds((current) =>
         current.includes(id)
            ? current.filter((item) => item !== id)
            : [...current, id],
      );
   };

   const toggleAllSchedules = () => {
      setSelectedScheduleIds((current) =>
         current.length === schedules.length ? [] : schedules.map((item) => item.id),
      );
   };

   const handleRunSchedules = () => {
      const scheduleIds = [...selectedScheduleIds];
      const accountPlatformLabel = selectedAccountPlatform;

      setScheduleMessage({ tone: "neutral", text: "" });

      setActiveRunRequestCount((current) => current + scheduleIds.length);
      setScheduleMessage({
         tone: "success",
         text: `${accountPlatformLabel} 예약 ${scheduleIds.length}개 실행 요청을 보냈습니다. 실제 수집은 서버에서 순차적으로 진행됩니다.`,
      });
      setSelectedScheduleIds([]);

      void runSchedules(scheduleIds)
         .then(() => {
            setScheduleMessage({
               tone: "success",
               text: `${accountPlatformLabel} 예약 ${scheduleIds.length}개 실행 요청이 정상 접수되었습니다.`,
            });
         })
         .catch((error) => {
            setActiveRunRequestCount((current) =>
               Math.max(0, current - scheduleIds.length),
            );
            setScheduleMessage({
               tone: "error",
               text:
                  error.message ||
                  "예약 실행 요청에 실패했습니다. 서버 상태를 확인해주세요.",
            });
         });
   };

   const handleRunVisibleSchedules = () => {
      const scheduleIds = schedules.map((item) => item.id);
      if (scheduleIds.length === 0) {
         return;
      }

      const accountPlatformLabel = selectedAccountPlatform;

      setScheduleMessage({ tone: "neutral", text: "" });
      setActiveRunRequestCount((current) => current + scheduleIds.length);
      setScheduleMessage({
         tone: "success",
         text: `${accountPlatformLabel} 전체 예약 ${scheduleIds.length}개 실행 요청을 보냈습니다. 실제 수집은 서버에서 순차적으로 진행됩니다.`,
      });
      setSelectedScheduleIds([]);

      void runSchedules(scheduleIds)
         .then(() => {
            setScheduleMessage({
               tone: "success",
               text: `${accountPlatformLabel} 전체 예약 ${scheduleIds.length}개 실행 요청이 정상 접수되었습니다.`,
            });
         })
         .catch((error) => {
            setActiveRunRequestCount((current) =>
               Math.max(0, current - scheduleIds.length),
            );
            setScheduleMessage({
               tone: "error",
               text:
                  error.message ||
                  "전체 예약 실행 요청에 실패했습니다. 서버 상태를 확인해주세요.",
            });
         });
   };

   const handleDeleteSchedules = async () => {
      setScheduleMessage({ tone: "neutral", text: "" });
      setDeletingSchedules(true);

      try {
         await deleteSchedules(selectedScheduleIds);
         setScheduleMessage({
            tone: "success",
            text: "선택한 완료 예약을 삭제했습니다.",
         });
         setSelectedScheduleIds([]);
         const items = await fetchSchedules(
            selectedCustomId,
            selectedAccountPlatform,
            scheduleStatus,
            selectedScheduleSite,
         );
         setSchedules(items);
         const nextSites = await fetchScheduledSites(
            selectedCustomId,
            selectedAccountPlatform,
            scheduleStatus,
         );
         setAvailableScheduleSites(nextSites);
         if (selectedScheduleSite && !nextSites.includes(selectedScheduleSite)) {
            setSelectedScheduleSite("");
         }
         const customIds = await fetchScheduledCustomIds(scheduleStatus);
         setAvailableCustomIds(customIds);
      } catch (error) {
         setScheduleMessage({
            tone: "error",
            text:
               error.message ||
               "완료 예약 삭제에 실패했습니다. 서버 상태를 확인해주세요.",
         });
      } finally {
         setDeletingSchedules(false);
      }
   };

   const handleUserFieldChange = (field, value) => {
      const nextValue =
         field === "phone"
            ? formatPhoneInput(value)
            : value;

      setUserForm((current) => ({
         ...current,
         [field]: nextValue,
      }));
   };

   const handleHostingFieldChange = (field, value) => {
      setHostingForm((current) => ({
         ...current,
         [field]: value,
      }));
   };

   const handleSitemapFieldChange = (field, value) => {
      setSitemapForm((current) => ({
         ...current,
         [field]: value,
      }));
   };

   const handleSelectUser = (user) => {
      const requestUsage = user.requestUsage || {};

      setUserForm({
         id: String(user.id ?? ""),
         name: user.name || "",
         loginId: user.loginId || "",
         password: "",
         customId: user.customId || "",
         phone: user.phone || "",
         isApproved: Boolean(user.isApproved),
         plan: user.plan || "none",
         subscriptionStartAt: toDateTimeLocalValue(user.subscriptionStartAt),
         subscriptionEndAt: toDateTimeLocalValue(user.subscriptionEndAt),
         requestUsedCount: String(
            requestUsage.used ??
               user.requestUsedCount ??
               user.currentRequestCount ??
               "",
         ),
         requestLimitOverride: String(
            requestUsage.limitOverride ?? user.requestLimitOverride ?? "",
         ),
         requestCycleStartAt: toDateTimeLocalValue(
            requestUsage.cycleStartAt ?? user.requestCycleStartAt,
         ),
         requestCycleEndAt: toDateTimeLocalValue(
            requestUsage.cycleEndAt ?? user.requestCycleEndAt,
         ),
         sites: stringifyList(user.sites),
         createdAt: formatDateTime(user.createdAt),
         updatedAt: formatDateTime(user.updatedAt),
         email: user.email || "",
         memo: user.memo || "",
      });
   };

   const handleSelectHostingAccount = (account) => {
      setHostingForm({
         id: String(account.id ?? ""),
         customId: account.customId || "",
         platform: account.platform || "smartstore",
         accountPlatform: account.accountPlatform || "",
         partnerKey: account.partnerKey || "",
         apiKey: account.apiKey || "",
         refreshToken: account.refreshToken || "",
         tokenExpiresAt: toDateTimeLocalValue(account.tokenExpiresAt),
         refreshTokenExpiresAt: toDateTimeLocalValue(
            account.refreshTokenExpiresAt,
         ),
         createdAt: formatDateTime(account.createdAt),
         updatedAt: formatDateTime(account.updatedAt),
         topImages: stringifyList(account.topImages),
         bottomImages: stringifyList(account.bottomImages),
         memo: account.memo || "",
         ...buildHostingPolicyForm(account.marketplacePolicy),
      });
   };

   const handleSaveUser = async () => {
      setSavingUser(true);
      setUserMessage({ tone: "neutral", text: "" });

      try {
         const normalizedPhone = formatPhoneInput(userForm.phone || "");
         const normalizedName = userForm.name.trim();
         const normalizedLoginId = userForm.loginId.trim();
         const normalizedCustomId = userForm.customId.trim();
         const normalizedPassword = userForm.password || "";

         if (!normalizedName || !normalizedLoginId || !normalizedCustomId) {
            throw new Error("name, loginId, customId는 필수입니다.");
         }

         if (!userForm.id && !normalizedPassword) {
            throw new Error("새 User 생성 시 password는 필수입니다.");
         }

         if (normalizedPassword && !PASSWORD_REGEX.test(normalizedPassword)) {
            throw new Error(
               "password는 영문, 숫자, 특수문자를 포함한 8자리 이상이어야 합니다.",
            );
         }

         if (!/^\d{3}-\d{4}-\d{4}$/.test(normalizedPhone)) {
            throw new Error("연락처 형식이 올바르지 않습니다.");
         }

         const payload = {
            name: normalizedName,
            loginId: normalizedLoginId,
            password: normalizedPassword || undefined,
            customId: normalizedCustomId,
            phone: normalizedPhone,
            isApproved: userForm.isApproved,
            plan: userForm.plan,
            subscriptionStartAt: parseDateTimeLocalValue(
               userForm.subscriptionStartAt,
            ),
            subscriptionEndAt: parseDateTimeLocalValue(userForm.subscriptionEndAt),
            requestUsedCount: parseNullableInteger(userForm.requestUsedCount),
            requestLimitOverride: parseNullableInteger(
               userForm.requestLimitOverride,
            ),
            requestCycleStartAt: parseDateTimeLocalValue(
               userForm.requestCycleStartAt,
            ),
            requestCycleEndAt: parseDateTimeLocalValue(
               userForm.requestCycleEndAt,
            ),
            sites: parseListText(userForm.sites),
            email: userForm.email.trim() || null,
            memo: userForm.memo.trim() || null,
         };

         if (userForm.id) {
            await updateAdminUser(userForm.id, payload);
            setUserMessage({
               tone: "success",
               text: "User 정보가 수정되었습니다.",
            });
         } else {
            await createAdminUser(payload);
            setUserMessage({
               tone: "success",
               text: "새 User가 추가되었습니다.",
            });
         }

         setUserForm(createEmptyUserForm());
         setUsersLoaded(false);
         await loadUsers();
      } catch (error) {
         setUserMessage({
            tone: "error",
            text:
               error.message ||
               "User 저장에 실패했습니다. 관리자 API를 확인해주세요.",
         });
      } finally {
         setSavingUser(false);
      }
   };

   const buildHostingPayload = () => ({
      customId: hostingForm.customId.trim(),
      platform: hostingForm.platform,
      accountPlatform: hostingForm.accountPlatform.trim(),
      partnerKey: hostingForm.partnerKey.trim(),
      apiKey: hostingForm.apiKey.trim(),
      refreshToken: hostingForm.refreshToken.trim() || null,
      tokenExpiresAt: parseDateTimeLocalValue(hostingForm.tokenExpiresAt),
      refreshTokenExpiresAt: parseDateTimeLocalValue(
         hostingForm.refreshTokenExpiresAt,
      ),
      topImages: parseListText(hostingForm.topImages),
      bottomImages: parseListText(hostingForm.bottomImages),
      memo: hostingForm.memo.trim() || null,
      marketplacePolicy: buildMarketplacePolicyPayload(hostingForm),
   });

   const handleSaveHostingAccount = async () => {
      setSavingHostingAccount(true);
      setHostingMessage({ tone: "neutral", text: "" });

      try {
         if (!hostingForm.customId.trim()) {
            throw new Error("customId는 필수입니다.");
         }

         const payload = buildHostingPayload();

         if (hostingForm.id) {
            const result = await updateAdminHostingAccount(hostingForm.id, payload);
            if (result?.success === false) {
               throw new Error(
                  result.message ||
                     "Hosting 정보를 저장하지 못했습니다.",
               );
            }
            setHostingMessage({
               tone: "success",
               text:
                  "Hosting 정보가 수정되었습니다.",
            });
         } else {
            const result = await createAdminHostingAccount(payload);
            if (result?.success === false) {
               throw new Error(
                  result.message ||
                     "Hosting 계정을 추가하지 못했습니다.",
               );
            }
            setHostingMessage({
               tone: "success",
               text:
                  "새 Hosting 계정이 추가되었습니다.",
            });
         }

         setHostingForm(createEmptyHostingForm());
         setHostingLoaded(false);
         await loadHostingAccounts();
      } catch (error) {
         setHostingMessage({
            tone: "error",
            text:
               error.message ||
               "Hosting 저장에 실패했습니다. 관리자 API를 확인해주세요.",
         });
      } finally {
         setSavingHostingAccount(false);
      }
   };

   const handleConnectCafe24 = async () => {
      setConnectingCafe24(true);
      setHostingMessage({ tone: "neutral", text: "" });

      try {
         if (hostingForm.platform !== "cafe24") {
            throw new Error(
               "Cafe24 계정에서만 연동할 수 있습니다.",
            );
         }

         if (!hostingForm.customId.trim()) {
            throw new Error("customId는 필수입니다.");
         }

         if (!hostingForm.accountPlatform.trim()) {
            throw new Error("accountPlatform은 필수입니다.");
         }

         if (!hostingForm.partnerKey.trim()) {
            throw new Error("mallId는 필수입니다.");
         }

         const payload = buildHostingPayload();
         let savedAccount = null;

         if (hostingForm.id) {
            const result = await updateAdminHostingAccount(hostingForm.id, payload);
            if (result?.success === false) {
               throw new Error(
                  result.message ||
                     "Cafe24 계정을 저장하지 못했습니다.",
               );
            }
            savedAccount = result?.account || null;
         } else {
            const result = await createAdminHostingAccount(payload);
            if (result?.success === false) {
               throw new Error(
                  result.message ||
                     "Cafe24 계정을 추가하지 못했습니다.",
               );
            }
            savedAccount = result?.account || null;
         }

         if (savedAccount) {
            handleSelectHostingAccount(savedAccount);
         }

         const state = encodeCafe24State({
            customId: payload.customId,
            accountPlatform: payload.accountPlatform,
            mallId: payload.partnerKey,
            appOrigin: window.location.origin,
            ts: Date.now(),
         });

         window.sessionStorage.setItem(CAFE24_OAUTH_STATE_KEY, state);

         const result = await fetchCafe24AuthorizeUrl({
            mallId: payload.partnerKey,
            state,
         });

         const popup = window.open(
            result.url,
            "flowmerce-cafe24-connect",
            "width=760,height=860,menubar=no,toolbar=no,location=yes,resizable=yes,scrollbars=yes,status=no",
         );

         if (!popup) {
            throw new Error(
               "브라우저 팝업이 차단되었습니다.",
            );
         }

         popup.focus();
         const popupWatcher = window.setInterval(() => {
            if (!popup.closed) {
               return;
            }

            window.clearInterval(popupWatcher);
            setConnectingCafe24(false);
         }, 700);
         setHostingMessage({
            tone: "neutral",
            text: "Cafe24 승인 화면이 열렸습니다.",
         });
      } catch (error) {
         setConnectingCafe24(false);
         setHostingMessage({
            tone: "error",
            text:
               error.message ||
               "Cafe24 연동을 시작하지 못했습니다.",
         });
      }
   };

   const handleGenerateSitemap = async () => {
      setGeneratingSitemap(true);
      setSitemapMessage({ tone: "neutral", text: "" });

      try {
         if (!sitemapForm.site.trim()) {
            throw new Error("site를 입력해주세요.");
         }

         if (!sitemapForm.apiKey.trim()) {
            throw new Error("apiKey를 입력해주세요.");
         }

         const result = await generateAdminSitemap({
            site: sitemapForm.site,
            apiKey: sitemapForm.apiKey,
         });

         if (result.blob) {
            const downloadUrl = window.URL.createObjectURL(result.blob);
            const link = document.createElement("a");

            link.href = downloadUrl;
            link.download = result.filename || "flowmerce-sitemap.xml";
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(downloadUrl);
         }

         setSitemapMessage({
            tone: "success",
            text: result.blob
               ? "사이트맵 다운로드를 시작했습니다."
               : result.message || "사이트맵 생성 요청이 완료되었습니다.",
         });
      } catch (error) {
         setSitemapMessage({
            tone: "error",
            text:
               error.message ||
               "사이트맵 생성에 실패했습니다. 관리자 API를 확인해주세요.",
         });
      } finally {
         setGeneratingSitemap(false);
      }
   };

   return (
      <>
         <div className="space-y-8">
            <div className="rounded-lg border border-zinc-200 bg-white p-3 shadow-sm">
               <div className="flex flex-wrap gap-2">
                  {tabs.map((tab) => (
                     <TabButton
                        key={tab.id}
                        label={tab.label}
                        active={activeTab === tab.id}
                        onClick={() => setActiveTab(tab.id)}
                     />
                  ))}
               </div>
            </div>

            {activeTab === "contacts" && (
               <section className="rounded-lg border border-zinc-200 bg-white p-7 shadow-sm">
                  <SectionHeader
                     title="전체 문의 관리"
                     description="서버 DB에 저장된 문의를 관리자 전용 화면에서 확인합니다. 각 문의는 상세보기에서 전체 내용을 바로 읽을 수 있습니다."
                  />

                  <div className="mt-7">
                     {loadingContacts ? (
                        <p className="rounded-lg border border-zinc-200 bg-zinc-50 p-5 text-sm text-zinc-600">
                           문의 목록을 불러오는 중입니다...
                        </p>
                     ) : contactError ? (
                        <p className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-700">
                           {contactError}
                        </p>
                     ) : contacts.length === 0 ? (
                        <p className="rounded-lg border border-zinc-200 bg-zinc-50 p-5 text-sm text-zinc-600">
                           아직 접수된 문의가 없습니다.
                        </p>
                     ) : (
                        <div className="overflow-x-auto">
                           <table className="min-w-full divide-y divide-zinc-200 text-sm">
                              <thead className="bg-zinc-50">
                                 <tr>
                                    <th className="px-5 py-4 text-left font-semibold text-zinc-950">
                                       문의 유형
                                    </th>
                                    <th className="px-5 py-4 text-left font-semibold text-zinc-950">
                                       이름
                                    </th>
                                    <th className="px-5 py-4 text-left font-semibold text-zinc-950">
                                       연락처
                                    </th>
                                    <th className="px-5 py-4 text-left font-semibold text-zinc-950">
                                       문의 요약
                                    </th>
                                    <th className="px-5 py-4 text-left font-semibold text-zinc-950">
                                       접수일시
                                    </th>
                                    <th className="px-5 py-4 text-left font-semibold text-zinc-950">
                                       보기
                                    </th>
                                 </tr>
                              </thead>
                              <tbody className="divide-y divide-zinc-200">
                                 {contacts.map((contact) => (
                                    <tr key={contact.id}>
                                       <td className="whitespace-nowrap px-5 py-4 text-zinc-600">
                                          {contact.type}
                                       </td>
                                       <td className="whitespace-nowrap px-5 py-4 text-zinc-600">
                                          {contact.name}
                                       </td>
                                       <td className="whitespace-nowrap px-5 py-4 text-zinc-600">
                                          {contact.phone}
                                       </td>
                                       <td className="min-w-72 px-5 py-4 text-zinc-600">
                                          <p className="line-clamp-2 leading-6">
                                             {contact.content}
                                          </p>
                                       </td>
                                       <td className="whitespace-nowrap px-5 py-4 text-zinc-600">
                                          {formatDateTime(contact.createdAt)}
                                       </td>
                                       <td className="whitespace-nowrap px-5 py-4 text-zinc-600">
                                          <button
                                             type="button"
                                             onClick={() => setSelectedContact(contact)}
                                             className="inline-flex items-center justify-center rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-800 shadow-sm transition hover:bg-zinc-50"
                                          >
                                             상세보기
                                          </button>
                                       </td>
                                    </tr>
                                 ))}
                              </tbody>
                           </table>
                        </div>
                     )}
                  </div>
               </section>
            )}

            {activeTab === "schedules" && (
               <section className="rounded-lg border border-zinc-200 bg-white p-7 pb-32 shadow-sm">
                  <SectionHeader
                     title="수집 예약 실행"
                     description="실행 대상 예약과 완료된 예약을 분리해서 보고, 완료 목록에서는 선택 삭제까지 할 수 있습니다."
                  />

                  <div className="mt-6 flex flex-wrap gap-2">
                     {scheduleSubtabs.map((tab) => (
                        <TabButton
                           key={tab.id}
                           label={tab.label}
                           active={activeScheduleSubtab === tab.id}
                           onClick={() => setActiveScheduleSubtab(tab.id)}
                        />
                     ))}
                  </div>

                  <div className="mt-6 grid gap-4 lg:grid-cols-3">
                     <label className="block">
                        <span className="text-sm font-medium text-zinc-600">
                           예약 customId
                        </span>
                        <select
                           value={selectedCustomId}
                           onChange={(event) => setSelectedCustomId(event.target.value)}
                           className="mt-1.5 block w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 shadow-sm focus:border-emerald-600 focus:outline-none"
                           disabled={loadingCustomIds}
                        >
                           <option value="">
                              {loadingCustomIds
                                 ? "customId 목록을 불러오는 중입니다"
                                 : "customId를 선택해주세요"}
                           </option>
                           {availableCustomIds.map((customId) => (
                              <option key={customId} value={customId}>
                                 {customId}
                              </option>
                           ))}
                        </select>
                     </label>

                     <label className="block">
                        <span className="text-sm font-medium text-zinc-600">
                           accountPlatform
                        </span>
                        <select
                           value={selectedAccountPlatform}
                           onChange={(event) =>
                              setSelectedAccountPlatform(event.target.value)
                           }
                           className="mt-1.5 block w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 shadow-sm focus:border-emerald-600 focus:outline-none"
                           disabled={
                              loadingAccountPlatforms ||
                              availableAccountPlatforms.length === 0
                           }
                        >
                           <option value="">
                              {loadingAccountPlatforms
                                 ? "accountPlatform 목록을 불러오는 중입니다"
                                 : "accountPlatform을 선택해주세요"}
                           </option>
                           {availableAccountPlatforms.map((accountPlatform) => (
                              <option key={accountPlatform} value={accountPlatform}>
                                 {accountPlatform}
                              </option>
                           ))}
                        </select>
                     </label>

                     <label className="block">
                        <span className="text-sm font-medium text-zinc-600">
                           사이트
                        </span>
                        <select
                           value={selectedScheduleSite}
                           onChange={(event) => setSelectedScheduleSite(event.target.value)}
                           className="mt-1.5 block w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 shadow-sm focus:border-emerald-600 focus:outline-none"
                           disabled={
                              loadingScheduleSites || availableScheduleSites.length === 0
                           }
                        >
                           <option value="">
                              {loadingScheduleSites
                                 ? "사이트 목록을 불러오는 중입니다"
                                 : "전체 사이트 (기본값)"}
                           </option>
                           {availableScheduleSites.map((site) => (
                              <option key={site} value={site}>
                                 {site}
                              </option>
                           ))}
                        </select>
                     </label>

                  </div>

                  <div className="mt-4">
                     <StatusMessage message={scheduleMessage} />
                  </div>

                  <div className="mt-6 overflow-x-auto rounded-lg border border-zinc-200">
                     <table className="min-w-full divide-y divide-zinc-200 text-sm">
                        <thead className="bg-zinc-50">
                           <tr>
                              <th className="w-14 px-4 py-4 text-left font-semibold text-zinc-950">
                                 <input
                                    type="checkbox"
                                    checked={allSchedulesChecked}
                                    onChange={toggleAllSchedules}
                                    disabled={schedules.length === 0}
                                    className="h-4 w-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
                                 />
                              </th>
                              <th className="px-5 py-4 text-left font-semibold text-zinc-950">
                                 사이트
                              </th>
                              <th className="px-5 py-4 text-left font-semibold text-zinc-950">
                                 예약 카테고리
                              </th>
                              <th className="px-5 py-4 text-left font-semibold text-zinc-950">
                                 예약 ID
                              </th>
                              <th className="px-5 py-4 text-left font-semibold text-zinc-950">
                                 상태
                              </th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-200 bg-white">
                           {loadingSchedules ? (
                              <tr>
                                 <td
                                    colSpan={5}
                                    className="px-5 py-8 text-center text-sm text-zinc-500"
                                 >
                                    예약 목록을 불러오는 중입니다...
                                 </td>
                              </tr>
                           ) : schedules.length === 0 ? (
                              <tr>
                                 <td
                                    colSpan={5}
                                    className="px-5 py-8 text-center text-sm text-zinc-500"
                                 >
                                    조회된 수집 예약이 없습니다.
                                 </td>
                              </tr>
                           ) : (
                              schedules.map((schedule) => {
                                 const isSelected = selectedScheduleIds.includes(
                                    schedule.id,
                                 );

                                 return (
                                 <tr
                                    key={schedule.id}
                                    onClick={() => toggleScheduleSelection(schedule.id)}
                                    className={`cursor-pointer transition ${
                                       isSelected
                                          ? "bg-emerald-50"
                                          : "hover:bg-zinc-50"
                                    }`}
                                 >
                                    <td className="px-4 py-4">
                                       <input
                                          type="checkbox"
                                          checked={isSelected}
                                          onClick={(event) => event.stopPropagation()}
                                          onChange={() => toggleScheduleSelection(schedule.id)}
                                          className="h-4 w-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
                                       />
                                    </td>
                                    <td className="px-5 py-4 text-zinc-600">
                                       {schedule.site || "-"}
                                    </td>
                                    <td className="px-5 py-4 text-zinc-600">
                                       {getScheduleDisplayName(schedule)}
                                    </td>
                                    <td className="px-5 py-4 text-zinc-600">
                                       {schedule.id}
                                    </td>
                                    <td className="px-5 py-4 text-zinc-600">
                                       {schedule.status || "-"}
                                    </td>
                                 </tr>
                                 );
                              })
                           )}
                        </tbody>
                     </table>
                  </div>

                  <div className="pointer-events-none fixed bottom-4 left-1/2 z-40 w-[calc(100%-1.5rem)] max-w-5xl -translate-x-1/2 px-1">
                     <div className="pointer-events-auto flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-zinc-200 bg-white/95 px-4 py-4 shadow-xl backdrop-blur">
                        <p className="text-sm text-zinc-600">
                           현재 선택된 예약:{" "}
                           <span className="font-semibold text-zinc-950">
                              {selectedSchedules.length}개
                           </span>
                        </p>

                        <div className="flex flex-wrap items-center gap-3">
                           {activeScheduleSubtab === "active" && (
                              <button
                                 type="button"
                                 onClick={handleRunVisibleSchedules}
                                 disabled={schedules.length === 0}
                                 className="inline-flex items-center justify-center rounded-lg border border-zinc-300 bg-white px-5 py-3 text-sm font-medium text-zinc-800 shadow-sm transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-70"
                              >
                                 전체실행
                              </button>
                           )}
                           {activeScheduleSubtab === "active" ? (
                              <button
                                 type="button"
                                 onClick={handleRunSchedules}
                                 disabled={selectedScheduleIds.length === 0}
                                 className="inline-flex items-center justify-center rounded-lg border border-emerald-700 bg-emerald-600 px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
                              >
                                 {activeRunRequestCount > 0
                                    ? `선택한 예약 실행 (실행 요청 ${activeRunRequestCount}개)`
                                    : "선택한 예약 실행"}
                              </button>
                           ) : (
                              <button
                                 type="button"
                                 onClick={handleDeleteSchedules}
                                 disabled={
                                    deletingSchedules || selectedScheduleIds.length === 0
                                 }
                                 className="inline-flex items-center justify-center rounded-lg border border-red-700 bg-red-600 px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-70"
                              >
                                 {deletingSchedules
                                    ? "삭제 요청 중..."
                                    : "선택한 완료 예약 삭제"}
                              </button>
                           )}
                        </div>
                     </div>
                  </div>
               </section>
            )}

            {activeTab === "users" && (
               <section className="rounded-lg border border-zinc-200 bg-white p-7 shadow-sm">
                  <SectionHeader
                     title="User 관리"
                     description="customId 기준으로 목록을 확인하고, 선택한 User 정보를 오른쪽 폼에서 수정하거나 새 User를 추가합니다."
                     action={
                        <button
                           type="button"
                           onClick={() => {
                              setUsersLoaded(false);
                              setUserForm(createEmptyUserForm());
                              void loadUsers();
                           }}
                           className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 shadow-sm transition hover:bg-zinc-50"
                        >
                           목록 새로고침
                        </button>
                     }
                  />

                  <div className="mt-6 grid gap-6 xl:grid-cols-[1.15fr_1fr]">
                     <div className="overflow-x-auto rounded-lg border border-zinc-200">
                        {loadingUsers ? (
                           <p className="p-5 text-sm text-zinc-600">
                              User 목록을 불러오는 중입니다...
                           </p>
                        ) : users.length === 0 ? (
                           <p className="p-5 text-sm text-zinc-600">
                              조회된 User가 없습니다.
                           </p>
                        ) : (
                           <table className="min-w-full divide-y divide-zinc-200 text-sm">
                              <thead className="bg-zinc-50">
                                 <tr>
                                    <th className="px-5 py-4 text-left font-semibold text-zinc-950">
                                       customId
                                    </th>
                                    <th className="px-5 py-4 text-left font-semibold text-zinc-950">
                                       이름
                                    </th>
                                    <th className="px-5 py-4 text-left font-semibold text-zinc-950">
                                       loginId
                                    </th>
                                    <th className="px-5 py-4 text-left font-semibold text-zinc-950">
                                       phone
                                    </th>
                                    <th className="px-5 py-4 text-left font-semibold text-zinc-950">
                                       플랜
                                    </th>
                                    <th className="px-5 py-4 text-left font-semibold text-zinc-950">
                                       승인
                                    </th>
                                 </tr>
                              </thead>
                              <tbody className="divide-y divide-zinc-200">
                                 {users.map((user) => (
                                    <tr
                                       key={user.id}
                                       onClick={() => handleSelectUser(user)}
                                       className="cursor-pointer transition hover:bg-zinc-50"
                                    >
                                       <td className="whitespace-nowrap px-5 py-4 text-zinc-600">
                                          {user.customId || "-"}
                                       </td>
                                       <td className="whitespace-nowrap px-5 py-4 text-zinc-600">
                                          {user.name || "-"}
                                       </td>
                                       <td className="whitespace-nowrap px-5 py-4 text-zinc-600">
                                          {user.loginId || "-"}
                                       </td>
                                       <td className="whitespace-nowrap px-5 py-4 text-zinc-600">
                                          {user.phone || "-"}
                                       </td>
                                       <td className="whitespace-nowrap px-5 py-4 text-zinc-600">
                                          {user.plan || "none"}
                                       </td>
                                       <td className="whitespace-nowrap px-5 py-4 text-zinc-600">
                                          <span className="inline-flex items-center gap-2">
                                             <span>{user.isApproved ? "확인" : "대기"}</span>
                                             <MemoIndicator memo={user.memo} />
                                          </span>
                                       </td>
                                    </tr>
                                 ))}
                              </tbody>
                           </table>
                        )}
                     </div>

                     <div className="space-y-4">
                        <StatusMessage message={userMessage} />
                        <UserForm
                           form={userForm}
                           onChange={handleUserFieldChange}
                           onSave={handleSaveUser}
                           onReset={() => setUserForm(createEmptyUserForm())}
                           saving={savingUser}
                        />
                        <StatusMessage message={userMessage} />
                     </div>
                  </div>
               </section>
            )}

            {activeTab === "hosting" && (
               <section className="rounded-lg border border-zinc-200 bg-white p-7 shadow-sm">
                  <SectionHeader
                     title="HostingAccount 관리"
                     description="customId 기준으로 Hosting 계정을 확인하고, 선택한 계정 정보를 오른쪽 폼에서 수정하거나 새 HostingAccount를 추가합니다."
                     action={
                        <button
                           type="button"
                           onClick={() => {
                              setHostingLoaded(false);
                              setHostingForm(createEmptyHostingForm());
                              void loadHostingAccounts();
                           }}
                           className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 shadow-sm transition hover:bg-zinc-50"
                        >
                           목록 새로고침
                        </button>
                     }
                  />

                  <div className="mt-6 grid gap-6 xl:grid-cols-[1.15fr_1fr]">
                     <div className="overflow-x-auto rounded-lg border border-zinc-200">
                        {loadingHostingAccounts ? (
                           <p className="p-5 text-sm text-zinc-600">
                              Hosting 목록을 불러오는 중입니다...
                           </p>
                        ) : hostingAccounts.length === 0 ? (
                           <p className="p-5 text-sm text-zinc-600">
                              조회된 Hosting 계정이 없습니다.
                           </p>
                        ) : (
                           <table className="min-w-full divide-y divide-zinc-200 text-sm">
                              <thead className="bg-zinc-50">
                                 <tr>
                                    <th className="px-5 py-4 text-left font-semibold text-zinc-950">
                                       customId
                                    </th>
                                    <th className="px-5 py-4 text-left font-semibold text-zinc-950">
                                       platform
                                    </th>
                                    <th className="px-5 py-4 text-left font-semibold text-zinc-950">
                                       accountPlatform
                                    </th>
                                    <th className="px-5 py-4 text-left font-semibold text-zinc-950">
                                       {"CAFE24 \uD1A0\uD070"}
                                    </th>
                                    <th className="px-5 py-4 text-left font-semibold text-zinc-950">
                                       사용 가능
                                    </th>
                                 </tr>
                              </thead>
                              <tbody className="divide-y divide-zinc-200">
                                 {hostingAccounts.map((account) => (
                                    <tr
                                       key={account.id}
                                       onClick={() => handleSelectHostingAccount(account)}
                                       className="cursor-pointer transition hover:bg-zinc-50"
                                    >
                                       <td className="whitespace-nowrap px-5 py-4 text-zinc-600">
                                          {account.customId || "-"}
                                       </td>
                                       <td className="whitespace-nowrap px-5 py-4 text-zinc-600">
                                          {account.platform || "-"}
                                       </td>
                                       <td className="whitespace-nowrap px-5 py-4 text-zinc-600">
                                          {account.accountPlatform || "-"}
                                       </td>
                                       <td className="px-5 py-4 text-zinc-600">
                                          {account.platform === "cafe24" ? (
                                             <div className="flex items-center gap-2 whitespace-nowrap">
                                                <Cafe24RefreshBadge
                                                   status={getCafe24RefreshStatus(account)}
                                                />
                                                <span className="text-xs text-zinc-500">
                                                   {formatMonthDay(account.refreshTokenExpiresAt)}
                                                </span>
                                             </div>
                                          ) : (
                                             "-"
                                          )}
                                       </td>
                                       <td className="whitespace-nowrap px-5 py-4 text-zinc-600">
                                          <span className="inline-flex items-center gap-2">
                                             <span>
                                                {isHostingAccountReady(account)
                                                   ? "가능"
                                                   : "미완료"}
                                             </span>
                                             <MemoIndicator memo={account.memo} />
                                          </span>
                                       </td>
                                    </tr>
                                 ))}
                              </tbody>
                           </table>
                        )}
                     </div>

                     <div className="space-y-4">
                        <div className="min-h-[46px]">
                           <StatusMessage message={hostingMessage} />
                        </div>
                        <HostingForm
                           form={hostingForm}
                           onChange={handleHostingFieldChange}
                           onSave={handleSaveHostingAccount}
                           onReset={() => setHostingForm(createEmptyHostingForm())}
                           onConnectCafe24={handleConnectCafe24}
                           saving={savingHostingAccount}
                           connectingCafe24={connectingCafe24}
                        />
                     </div>
                  </div>
               </section>
            )}

            {activeTab === "sitemap" && (
               <section className="rounded-lg border border-zinc-200 bg-white p-7 shadow-sm">
                  <SectionHeader
                     title="사이트맵 생성"
                     description="site와 apiKey로 고도몰 상품 사이트맵 ZIP 생성을 요청합니다."
                  />

                  <div className="mt-5">
                     <StatusMessage message={sitemapMessage} />
                  </div>

                  <SitemapForm
                     form={sitemapForm}
                     onChange={handleSitemapFieldChange}
                     onGenerate={handleGenerateSitemap}
                     onReset={() => {
                        setSitemapForm(createEmptySitemapForm());
                        setSitemapMessage({ tone: "neutral", text: "" });
                     }}
                     generating={generatingSitemap}
                  />
               </section>
            )}
         </div>

         <ContactDetailModal
            contact={selectedContact}
            onClose={() => setSelectedContact(null)}
         />
      </>
   );
}

