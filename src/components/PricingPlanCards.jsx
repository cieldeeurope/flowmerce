"use client";

import clsx from "clsx";
import { useState } from "react";
import { plans } from "@/lib/pricingData";
import {
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

export default function PricingPlanCards({
   compact = false,
   tone = "default",
}) {
   const [billing, setBilling] = useState("monthly");
   const isLuxuryTone = tone === "luxury";

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

                     <TossBasicPaymentButton
                        billing={billing}
                        planName={plan.name}
                        includeHostingFee={planRequiresHostingFee(plan.name)}
                        compact={compact}
                        isLuxuryTone={isLuxuryTone}
                        label="이용권 결제하기"
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
      </>
   );
}
