"use client";

import Link from "next/link";
import clsx from "clsx";
import { useState } from "react";
import { plans } from "@/lib/pricingData";
import { CheckIcon } from "./icons/CheckIcon";

export default function PricingPlanCards({
   ctaHref = "/signup",
   compact = false,
}) {
   const [billing, setBilling] = useState("monthly");

   const discount =
      billing === "sixMonth" ? "-5%" : billing === "annual" ? "-10%" : "";

   const getPrice = (plan) => {
      if (billing === "sixMonth") {
         return plan.sixMonthPrice;
      }

      if (billing === "annual") {
         return plan.annualPrice;
      }

      return plan.price;
   };

   const billingOptions = [
      { id: "monthly", label: "월 단위" },
      { id: "sixMonth", label: "6개월" },
      { id: "annual", label: "12개월" },
   ];

   return (
      <>
         <div className="mt-7 flex justify-center">
            <div className="inline-flex rounded-lg border border-zinc-200 bg-white p-1 shadow-sm">
               {billingOptions.map((option) => (
                  <button
                     key={option.id}
                     type="button"
                     onClick={() => setBilling(option.id)}
                     className={clsx(
                        billing === option.id
                           ? option.id === "monthly"
                              ? "bg-zinc-950 text-white"
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
            {plans.map((plan) => (
               <div
                  key={plan.name}
                  className={clsx(
                     plan.recommended
                        ? "border-emerald-600 bg-white"
                        : "border-zinc-200 bg-white",
                     compact
                        ? "rounded-2xl border p-7 shadow-sm"
                        : "rounded-lg border p-7 shadow-sm",
                     "relative flex h-full flex-col overflow-hidden",
                  )}
               >
                  {discount && (
                     <div className="absolute -right-10 top-5 w-36 rotate-45 bg-emerald-600 py-1.5 text-center text-xs font-bold text-white shadow-sm">
                        {discount}
                     </div>
                  )}

                  <div className={clsx("space-y-3", compact && "pb-2")}>
                     <h3 className="flex min-h-[36px] items-start gap-2 text-xl font-semibold md:text-2xl">
                        <span>{plan.name}</span>
                        {plan.recommended && (
                           <span className="rounded border border-emerald-700 bg-emerald-600 px-2 py-1 text-xs font-semibold text-white shadow-sm">
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
                           ? "mt-2 flex min-h-[96px] flex-col justify-center border-t border-zinc-200 py-4 text-center"
                           : "mt-2 flex min-h-[96px] flex-col justify-center",
                     )}
                  >
                     <p className="text-3xl font-semibold">{getPrice(plan)}</p>
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
                           <CheckIcon className="h-5 w-5 shrink-0 text-emerald-600" />
                           {feature}
                        </li>
                     ))}
                  </ul>

                  <Link
                     href={ctaHref}
                     className={clsx(
                        "inline-flex w-full justify-center rounded-lg border border-emerald-700 bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm duration-150 hover:bg-emerald-700",
                        compact ? "mt-auto" : "mt-7",
                     )}
                  >
                     플랜 구독하기
                  </Link>

                  {compact && (
                     <div className="mt-4 min-h-[36px]">
                        <div className="flex min-h-[36px] items-center justify-center gap-x-1.5">
                           <CheckIcon className="h-4 w-4 text-zinc-500" />
                           <span className="text-center text-xs font-medium text-zinc-600">
                              {plan.name === "Boutique"
                                 ? "플랫폼 추가 및 요청 처리량 추가 가능 (상담)"
                                 : "상담 후 맞춤 견적 가능"}
                           </span>
                        </div>
                     </div>
                  )}
               </div>
            ))}
         </div>
      </>
   );
}
