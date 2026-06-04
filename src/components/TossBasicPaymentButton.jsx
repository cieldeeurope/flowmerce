"use client";

import clsx from "clsx";
import { useMemo, useState } from "react";
import { getSession } from "@/lib/auth";
import { formatKrw, getTossPlanPayment } from "@/lib/tossPlans";

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

function createOrderId(prefix = "PLAN") {
   const safePrefix =
      String(prefix)
         .trim()
         .toUpperCase()
         .replace(/[^A-Z0-9]+/g, "-")
         .replace(/^-|-$/g, "")
         .slice(0, 24) || "PLAN";
   const random = Math.random().toString(36).slice(2, 10).toUpperCase();
   return `FLOWM-${safePrefix}-${Date.now()}-${random}`;
}

function createCustomerKey() {
   return `FLOWM-${crypto.randomUUID()}`;
}

function isValidTossCustomerKey(customerKey) {
   return /^[A-Za-z0-9\-_=.@]{2,50}$/.test(customerKey);
}

export default function TossBasicPaymentButton({
   billing = "monthly",
   planName = "Basic",
   paymentInfo,
   amount,
   orderName,
   orderIdPrefix,
   includeHostingFee = false,
   extraAmount = 0,
   orderNameSuffix = "",
   label = "플랜 구독하기",
   loadingLabel = "결제창 여는 중...",
   compact = false,
   isLuxuryTone = false,
   containerClassName,
   className,
}) {
   const [status, setStatus] = useState("");
   const [requesting, setRequesting] = useState(false);
   const [confirmOpen, setConfirmOpen] = useState(false);
   const resolvedPaymentInfo = useMemo(() => {
      if (paymentInfo) {
         return paymentInfo;
      }

      if (amount) {
         return {
            amount,
            orderName: orderName || "플로우머스 결제",
         };
      }

      return getTossPlanPayment(planName, billing, {
         includeHostingFee,
         extraAmount,
         orderName,
         orderNameSuffix,
      });
   }, [
      amount,
      billing,
      extraAmount,
      includeHostingFee,
      orderName,
      orderNameSuffix,
      paymentInfo,
      planName,
   ]);

   const redirectToLogin = () => {
      const nextPath =
         typeof window === "undefined"
            ? "/"
            : `${window.location.pathname}${window.location.search || ""}`;

      setStatus("로그인 후 결제할 수 있습니다. 로그인 페이지로 이동합니다.");
      window.location.assign(`/login?next=${encodeURIComponent(nextPath)}`);
   };

   const ensureLoggedIn = () => {
      if (getSession()) {
         return true;
      }

      redirectToLogin();
      return false;
   };

   const openConfirm = () => {
      if (!resolvedPaymentInfo || requesting) {
         return;
      }

      setStatus("");

      if (!ensureLoggedIn()) {
         return;
      }

      setConfirmOpen(true);
   };

   const handlePayment = async () => {
      if (!resolvedPaymentInfo || requesting) {
         return;
      }

      if (!ensureLoggedIn()) {
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
               config.message || "결제 설정을 불러오지 못했습니다.",
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
               value: resolvedPaymentInfo.amount,
            },
            orderId: createOrderId(
               orderIdPrefix || resolvedPaymentInfo.planName || planName || "PAY",
            ),
            orderName: resolvedPaymentInfo.orderName,
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
      <div className={containerClassName || clsx(compact ? "mt-auto" : "mt-7")}>
         <button
            type="button"
            onClick={openConfirm}
            disabled={requesting || !resolvedPaymentInfo}
            className={clsx(
               isLuxuryTone
                  ? "inline-flex w-full justify-center rounded-lg border border-zinc-950 bg-zinc-950 px-5 py-2.5 text-sm font-medium text-white shadow-sm duration-150 hover:bg-[#8c6333]"
                  : "inline-flex w-full justify-center rounded-lg border border-emerald-700 bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm duration-150 hover:bg-emerald-700",
               "disabled:cursor-not-allowed disabled:opacity-70",
               className,
            )}
         >
            {requesting ? loadingLabel : label}
         </button>
         {confirmOpen && resolvedPaymentInfo ? (
            <div className="fixed inset-0 z-[80] flex items-center justify-center bg-zinc-950/45 px-5 py-8">
               <button
                  type="button"
                  aria-label="결제 안내 닫기"
                  className="absolute inset-0 cursor-default"
                  onClick={() => {
                     if (!requesting) {
                        setConfirmOpen(false);
                     }
                  }}
               />
               <div className="relative w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl">
                  <div>
                     <p className="text-sm font-semibold text-[#8c6333]">결제 안내</p>
                     <h3 className="mt-2 text-2xl font-semibold text-zinc-950">
                        결제를 진행할까요?
                     </h3>
                     <p className="mt-3 text-sm leading-6 text-zinc-600">
                        금액을 확인한 뒤 결제창을 열어주세요.
                     </p>
                  </div>

                  <div className="mt-5 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                     <p className="text-sm font-medium text-zinc-500">상품명</p>
                     <p className="mt-1 text-base font-semibold text-zinc-950">
                        {resolvedPaymentInfo.orderName}
                     </p>
                     <div className="mt-4 flex items-end justify-between gap-4">
                        <span className="text-sm font-medium text-zinc-500">결제 금액</span>
                        <span className="text-2xl font-semibold text-zinc-950">
                           {formatKrw(resolvedPaymentInfo.amount)}
                        </span>
                     </div>
                  </div>

                  {resolvedPaymentInfo.hostingAmount > 0 ? (
                     <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
                        호스팅 연동 비용 {formatKrw(resolvedPaymentInfo.hostingAmount)}이
                        최초 1회 포함됩니다.
                     </p>
                  ) : null}

                  <div className="mt-6 grid grid-cols-2 gap-3">
                     <button
                        type="button"
                        onClick={() => setConfirmOpen(false)}
                        disabled={requesting}
                        className="rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
                     >
                        취소
                     </button>
                     <button
                        type="button"
                        onClick={handlePayment}
                        disabled={requesting}
                        className={clsx(
                           isLuxuryTone
                              ? "bg-zinc-950 hover:bg-[#8c6333]"
                              : "bg-emerald-600 hover:bg-emerald-700",
                           "rounded-lg px-4 py-3 text-sm font-semibold text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-70",
                        )}
                     >
                        {requesting ? loadingLabel : "결제하기"}
                     </button>
                  </div>
               </div>
            </div>
         ) : null}
         {status ? (
            <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs leading-5 text-red-700">
               {status}
            </p>
         ) : null}
      </div>
   );
}
