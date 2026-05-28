"use client";

import clsx from "clsx";
import { useState } from "react";
import { getTossPlanPayment } from "@/lib/tossPlans";

const TOSS_SDK_SRC = "https://js.tosspayments.com/v2/standard";

function loadTossPaymentsSdk() {
   if (window.TossPayments) {
      return Promise.resolve(window.TossPayments);
   }

   return new Promise((resolve, reject) => {
      const existingScript = document.querySelector(`script[src="${TOSS_SDK_SRC}"]`);

      if (existingScript) {
         existingScript.addEventListener("load", () => resolve(window.TossPayments));
         existingScript.addEventListener("error", reject);
         return;
      }

      const script = document.createElement("script");
      script.src = TOSS_SDK_SRC;
      script.async = true;
      script.onload = () => resolve(window.TossPayments);
      script.onerror = reject;
      document.head.appendChild(script);
   });
}

function createOrderId() {
   const random = Math.random().toString(36).slice(2, 10).toUpperCase();
   return `FLOWM-BASIC-${Date.now()}-${random}`;
}

function createCustomerKey() {
   return `FLOWM-${crypto.randomUUID()}`;
}

function isValidTossCustomerKey(customerKey) {
   return /^[A-Za-z0-9\-_=.@]{2,50}$/.test(customerKey);
}

export default function TossBasicPaymentButton({
   billing,
   compact = false,
   isLuxuryTone = false,
}) {
   const [status, setStatus] = useState("");
   const [requesting, setRequesting] = useState(false);
   const paymentInfo = getTossPlanPayment("Basic", billing);

   const handleClick = async () => {
      if (!paymentInfo || requesting) {
         return;
      }

      setStatus("");
      setRequesting(true);

      try {
         const configResponse = await fetch("/api/payments/toss/config", {
            cache: "no-store",
         });
         const config = await configResponse.json().catch(() => ({}));

         if (!configResponse.ok || !config.clientKey) {
            throw new Error(
               config.message || "토스페이먼츠 클라이언트 키를 불러오지 못했습니다.",
            );
         }

         const TossPayments = await loadTossPaymentsSdk();
         const tossPayments = TossPayments(config.clientKey);
         let customerKey = window.localStorage.getItem("flowmerce_toss_customer_key");

         if (!isValidTossCustomerKey(customerKey || "")) {
            customerKey = createCustomerKey();
         }

         window.localStorage.setItem("flowmerce_toss_customer_key", customerKey);

         const payment = tossPayments.payment({ customerKey });
         const origin = window.location.origin;

         await payment.requestPayment({
            method: "CARD",
            amount: {
               currency: "KRW",
               value: paymentInfo.amount,
            },
            orderId: createOrderId(),
            orderName: paymentInfo.orderName,
            successUrl: `${origin}/payment/success`,
            failUrl: `${origin}/payment/fail`,
         });
      } catch (error) {
         setStatus(error.message || "결제창을 여는 중 오류가 발생했습니다.");
      } finally {
         setRequesting(false);
      }
   };

   return (
      <div className={clsx(compact ? "mt-auto" : "mt-7")}>
         <button
            type="button"
            onClick={handleClick}
            disabled={requesting}
            className={clsx(
               isLuxuryTone
                  ? "inline-flex w-full justify-center rounded-lg border border-zinc-950 bg-zinc-950 px-5 py-2.5 text-sm font-medium text-white shadow-sm duration-150 hover:bg-[#8c6333]"
                  : "inline-flex w-full justify-center rounded-lg border border-emerald-700 bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm duration-150 hover:bg-emerald-700",
               "disabled:cursor-not-allowed disabled:opacity-70",
            )}
         >
            {requesting ? "결제창 여는 중..." : "Basic 플랜 구독하기"}
         </button>
         {status ? (
            <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs leading-5 text-red-700">
               {status}
            </p>
         ) : null}
      </div>
   );
}
