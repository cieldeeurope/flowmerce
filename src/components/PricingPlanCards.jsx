"use client";

import clsx from "clsx";
import { useState } from "react";
import { plans } from "@/lib/pricingData";
import {
   formatKrw,
   getPlanBaseAmount,
   getPlanDisplayPrice,
   planRequiresHostingFee,
   tossBillingOptions,
} from "@/lib/tossPlans";
import { CheckIcon } from "./icons/CheckIcon";
import TossBasicPaymentButton from "./TossBasicPaymentButton";

function renderPlanFeature(feature) {
   if (feature.startsWith("추가 비용")) {
      const [, detail = ""] = feature.split(":");

      return (
         <span>
            <strong className="font-semibold text-zinc-950">추가 비용</strong>
            {detail ? ` : ${detail.trim()}` : ""}
         </span>
      );
   }

   return feature;
}

const firstPaymentFees = {
   Boutique: { setup: 1100000, hosting: 110000 },
   Basic: { setup: 110000, hosting: 110000 },
};

export default function PricingPlanCards({
   compact = false,
   tone = "default",
}) {
   const [billing, setBilling] = useState("monthly");
   const [priceGuidePlan, setPriceGuidePlan] = useState(null);
   const isLuxuryTone = tone === "luxury";
   const priceGuideFees = priceGuidePlan ? firstPaymentFees[priceGuidePlan] : null;
   const priceGuideBaseAmount = priceGuidePlan
      ? getPlanBaseAmount(priceGuidePlan, billing) || 0
      : 0;
   const priceGuideTotal = priceGuideFees
      ? priceGuideBaseAmount + priceGuideFees.setup + priceGuideFees.hosting
      : 0;

   return (
      <>
         <div className="mt-7 flex justify-center">
            <div className="inline-flex rounded-lg border border-zinc-200 bg-white p-1 shadow-sm">
               {tossBillingOptions.map((option) => (
                  <button
                     key={option.id}
                     type="button"
                     onClick={() => setBilling(option.id)}
                     className={clsx(
                        billing === option.id
                           ? option.id === "monthly"
                              ? "bg-zinc-950 text-white"
                              : isLuxuryTone
                                ? "bg-[#8c6333] text-white"
                                : "bg-emerald-600 text-white"
                           : "text-zinc-600 hover:text-zinc-950",
                        "rounded-md px-4 py-2 text-sm font-semibold transition",
                     )}
                  >
                     {option.label}
                  </button>
               ))}
            </div>
         </div>

         <div className="mt-10 grid gap-7 sm:grid-cols-2 xl:grid-cols-4">
            {plans.map((plan) => {
               const displayPrice = getPlanDisplayPrice(plan.name, billing);
               const [billingLabel, ...priceParts] = displayPrice.split(" ");
               const shouldStackPrice = billing !== "monthly" && priceParts.length > 0;
               const shouldCompactEnterpriseMonthly =
                  billing === "monthly" && plan.name === "Enterprise";
               const discount =
                  billing === "sixMonth"
                     ? "-5%"
                     : billing === "annual" && plan.name === "Enterprise"
                       ? "-16.7%"
                       : billing === "annual"
                         ? "-10%"
                         : "";

               return (
                  <div
                     key={plan.name}
                     className={clsx(
                        plan.recommended
                           ? isLuxuryTone
                              ? "border-[#8c6333] bg-white"
                              : "border-emerald-600 bg-white"
                           : "border-zinc-200 bg-white",
                        compact
                           ? "rounded-2xl border p-7 shadow-sm"
                           : "rounded-lg border p-7 shadow-sm",
                        "relative flex h-full flex-col overflow-hidden",
                     )}
                  >
                     {discount && (
                        <div
                           className={clsx(
                              "absolute -right-10 top-5 w-36 rotate-45 py-1.5 text-center text-xs font-bold text-white shadow-sm",
                              isLuxuryTone ? "bg-[#8c6333]" : "bg-emerald-600",
                           )}
                        >
                           {discount}
                        </div>
                     )}

                     <div className={clsx("space-y-3", compact && "pb-2")}>
                        <h3 className="flex min-h-[36px] items-start gap-2 text-xl font-semibold md:text-2xl">
                           <span>{plan.name}</span>
                           {plan.recommended && (
                              <span
                                 className={clsx(
                                    "rounded px-2 py-1 text-xs font-semibold text-white shadow-sm",
                                    isLuxuryTone
                                       ? "border border-[#8c6333] bg-[#8c6333]"
                                       : "border border-emerald-700 bg-emerald-600",
                                 )}
                              >
                                 추천
                              </span>
                           )}
                        </h3>
                        <p className="min-h-[96px] text-sm leading-6 text-zinc-600">
                           {plan.description}
                        </p>
                     </div>

                     <div
                        className={clsx(
                           compact
                              ? "mt-2 flex min-h-[116px] flex-col justify-center border-t border-zinc-200 py-4 text-center"
                              : "mt-2 flex min-h-[116px] flex-col justify-center",
                        )}
                     >
                        <p
                           className={clsx(
                              "font-semibold",
                              shouldCompactEnterpriseMonthly
                                 ? "text-[1.6rem] leading-tight"
                                 : "text-3xl",
                           )}
                        >
                           {shouldStackPrice ? (
                              <>
                                 <span className="block">{billingLabel}</span>
                                 <span className="mt-1 block">{priceParts.join(" ")}</span>
                              </>
                           ) : (
                              displayPrice
                           )}
                        </p>
                        <p className="mt-1 text-sm font-medium text-zinc-500">
                           {plan.priceNote}
                        </p>
                     </div>

                     <ul
                        className={clsx(
                           "flex-1 space-y-3.5",
                           compact ? "border-t border-zinc-200 py-7" : "mt-7",
                        )}
                     >
                        {plan.features.map((feature) => (
                           <li
                              key={feature}
                              className="flex items-center gap-x-2 text-sm text-zinc-600"
                           >
                              <CheckIcon
                                 className={clsx(
                                    "h-5 w-5 shrink-0",
                                    isLuxuryTone ? "text-[#8c6333]" : "text-emerald-600",
                                 )}
                               />
                               {renderPlanFeature(feature)}
                            </li>
                         ))}
                     </ul>

                     {firstPaymentFees[plan.name] && (
                        <button
                           type="button"
                           onClick={() => setPriceGuidePlan(plan.name)}
                           className="mb-3 inline-flex w-full items-center justify-center rounded-lg border border-amber-200 bg-[#fbf7ef] px-4 py-2.5 text-sm font-semibold text-amber-900 transition hover:bg-amber-50"
                        >
                           결제금액·총비용 보기
                        </button>
                     )}

                     <TossBasicPaymentButton
                        billing={billing}
                        planName={plan.name}
                        includeHostingFee={planRequiresHostingFee(plan.name)}
                        compact={compact}
                        isLuxuryTone={isLuxuryTone}
                        label="이용권 결제하기"
                        paymentType="NEW"
                        setupFee={firstPaymentFees[plan.name]?.setup || 0}
                     />

                     {compact && (
                        <div className="mt-4 min-h-[36px]">
                           <div className="flex min-h-[36px] items-center justify-center gap-x-1.5">
                              <CheckIcon className="h-4 w-4 text-zinc-500" />
                              <span className="text-center text-xs font-medium text-zinc-600">
                                 {plan.name === "Boutique"
                                    ? "부티크 추가 및 요청 처리량 추가 가능"
                                    : "상담 후 맞춤 견적 가능"}
                              </span>
                           </div>
                        </div>
                     )}
                  </div>
               );
            })}
         </div>

         {priceGuidePlan && priceGuideFees && (
            <div
               className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
               role="dialog"
               aria-modal="true"
               aria-labelledby="first-payment-guide-title"
               onMouseDown={(event) => {
                  if (event.target === event.currentTarget) {
                     setPriceGuidePlan(null);
                  }
               }}
            >
               <div className="max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl sm:p-7">
                  <div className="flex items-start justify-between gap-4">
                     <div>
                        <p className="text-sm font-semibold text-[#8c6333]">최초 도입 비용 안내</p>
                        <h3 id="first-payment-guide-title" className="mt-1 text-2xl font-semibold text-zinc-950">
                           {priceGuidePlan} {tossBillingOptions.find((item) => item.id === billing)?.label}
                        </h3>
                     </div>
                     <button
                        type="button"
                        onClick={() => setPriceGuidePlan(null)}
                        className="rounded-full border border-zinc-200 px-3 py-1.5 text-sm font-semibold text-zinc-600 hover:bg-zinc-50"
                        aria-label="결제금액 안내 닫기"
                     >
                        닫기
                     </button>
                  </div>

                  <dl className="mt-6 space-y-3 rounded-xl border border-zinc-200 bg-zinc-50 p-5 text-sm">
                     <div className="flex items-center justify-between gap-4">
                        <dt className="text-zinc-600">이용권</dt>
                        <dd className="font-semibold text-zinc-950">{formatKrw(priceGuideBaseAmount)}</dd>
                     </div>
                     <div className="flex items-center justify-between gap-4">
                        <dt className="text-zinc-600">추후 별도 결제 — 초기 세팅비</dt>
                        <dd className="font-semibold text-zinc-950">{formatKrw(priceGuideFees.setup)}</dd>
                     </div>
                     <div className="flex items-center justify-between gap-4">
                        <dt className="text-zinc-600">호스팅 연동비</dt>
                        <dd className="font-semibold text-zinc-950">{formatKrw(priceGuideFees.hosting)}</dd>
                     </div>
                     <div className="flex items-center justify-between gap-4 border-t border-zinc-300 pt-4">
                        <dt className="font-semibold text-zinc-950">지금 결제 (이용권 + 연동비)</dt>
                        <dd className="font-semibold text-zinc-950">{formatKrw(priceGuideBaseAmount + priceGuideFees.hosting)}</dd>
                     </div>
                     <div className="flex items-center justify-between gap-4 border-t border-zinc-300 pt-4">
                        <dt className="font-semibold text-zinc-950">최초 도입 총비용</dt>
                        <dd className="text-xl font-semibold text-zinc-950">{formatKrw(priceGuideTotal)}</dd>
                     </div>
                  </dl>

                  <p className="mt-4 text-sm leading-6 text-zinc-600">
                     모든 금액은 VAT 포함입니다. 최초 도입 총비용은 선택한 이용기간의 이용권, 호스팅 연동비, 초기 세팅비를 합한 금액입니다. 초기 세팅비는 위 결제금액에 포함되지 않으며 상담 후 별도 결제 안내를 드립니다. 이후 동일 플랜 갱신 시에는 최초 1회 비용이 다시 부과되지 않습니다.
                  </p>
               </div>
            </div>
         )}
      </>
   );
}
