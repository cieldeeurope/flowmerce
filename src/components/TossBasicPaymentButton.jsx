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

const paymentConsentItems = [
   {
      id: "terms",
      title: "이용약관 및 이용권 결제 조건",
      href: "/terms",
      summary: "플로우머스 이용권은 정해진 기간에 대한 선불 결제 방식입니다.",
      detail:
         "1개월, 6개월, 12개월 이용권은 자동 정기결제가 아니며, 이용기간 만료 후 연장을 원하실 경우 직접 재결제 또는 별도 상담을 통해 진행됩니다. 플랜 제공 범위와 사이트 선택 기준은 이용약관과 요금 안내를 따릅니다.",
   },
   {
      id: "refund",
      title: "환불 및 해지정책",
      href: "/refund-policy",
      summary: "세팅 진행 여부에 따라 환불 가능 범위가 달라질 수 있습니다.",
      detail:
         "결제 후 사전 셋팅이 시작되기 전까지는 취소 또는 환불 요청을 검토할 수 있습니다. 계정 연동, 카테고리 매핑, 자동화 설정 등 세팅이 시작된 이후에는 이미 제공된 용역 범위에 따라 환불이 제한될 수 있습니다.",
   },
   {
      id: "operation",
      title: "구독 및 운영 동의서",
      href: "/subscription-agreement",
      summary: "결제 후 계정 승인, 사이트 확정, 온보딩 절차가 이어집니다.",
      detail:
         "플랜 결제와 사이트 선택 이후 쇼핑몰 관리자 정보 확인, 계정 승인, 세팅 온보딩이 순차적으로 진행됩니다. 실제 운영 시작일은 결제 완료 시점, 관리자 승인, 세팅 개시 시점에 따라 조정될 수 있습니다.",
   },
   {
      id: "data",
      title: "개인정보처리방침 및 계정정보 기준",
      href: "/privacy",
      summary: "서비스 제공을 위해 필요한 개인정보와 계정정보 처리 기준을 확인합니다.",
      detail:
         "플로우머스는 회원 식별, 결제 확인, 쇼핑몰 연동, 세팅 지원 및 운영 관리를 위해 필요한 정보를 처리합니다. 쇼핑몰 계정정보와 운영 데이터의 보관 및 삭제 기준은 개인정보처리방침과 계정정보 및 데이터 삭제 기준을 함께 따릅니다.",
      secondaryHref: "/data-policy",
      secondaryLabel: "계정정보 및 데이터 삭제 기준",
   },
];

const initialPaymentConsents = paymentConsentItems.reduce(
   (acc, item) => ({ ...acc, [item.id]: false }),
   {},
);

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
   const [consents, setConsents] = useState(initialPaymentConsents);
   const [expandedPolicies, setExpandedPolicies] = useState({});
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
   const allConsentsChecked = paymentConsentItems.every(
      (item) => consents[item.id],
   );

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

      if (!allConsentsChecked) {
         setStatus("필수 정책을 모두 확인하고 동의해주세요.");
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

   const toggleConsent = (id) => {
      setConsents((current) => ({
         ...current,
         [id]: !current[id],
      }));
   };

   const toggleAllConsents = () => {
      const nextValue = !allConsentsChecked;
      setConsents(
         paymentConsentItems.reduce(
            (acc, item) => ({ ...acc, [item.id]: nextValue }),
            {},
         ),
      );
   };

   const togglePolicy = (id) => {
      setExpandedPolicies((current) => ({
         ...current,
         [id]: !current[id],
      }));
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
               <div className="relative max-h-[calc(100vh-4rem)] w-full max-w-lg overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl">
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

                  <div className="mt-5 rounded-xl border border-zinc-200 bg-white p-4">
                     <label className="flex cursor-pointer items-start gap-3">
                        <input
                           type="checkbox"
                           checked={allConsentsChecked}
                           onChange={toggleAllConsents}
                           className="mt-1 h-4 w-4 rounded border-zinc-300 text-zinc-950 focus:ring-zinc-950"
                        />
                        <span>
                           <span className="block text-sm font-semibold text-zinc-950">
                              필수 정책 전체 동의
                           </span>
                           <span className="mt-1 block text-xs leading-5 text-zinc-500">
                              결제 전 이용권 조건, 환불 기준, 운영 절차, 개인정보 및 계정정보 처리 기준을 확인해주세요.
                           </span>
                        </span>
                     </label>

                     <div className="mt-4 space-y-3">
                        {paymentConsentItems.map((item) => {
                           const isExpanded = Boolean(expandedPolicies[item.id]);

                           return (
                              <div
                                 key={item.id}
                                 className="rounded-lg border border-zinc-200 bg-zinc-50 p-3"
                              >
                                 <div className="flex items-start gap-3">
                                    <input
                                       id={`payment-consent-${item.id}`}
                                       type="checkbox"
                                       checked={Boolean(consents[item.id])}
                                       onChange={() => toggleConsent(item.id)}
                                       className="mt-1 h-4 w-4 rounded border-zinc-300 text-zinc-950 focus:ring-zinc-950"
                                    />
                                    <div className="min-w-0 flex-1">
                                       <label
                                          htmlFor={`payment-consent-${item.id}`}
                                          className="cursor-pointer text-sm font-semibold text-zinc-950"
                                       >
                                          {item.title}
                                       </label>
                                       <p className="mt-1 text-xs leading-5 text-zinc-500">
                                          {item.summary}
                                       </p>
                                    </div>
                                    <button
                                       type="button"
                                       onClick={() => togglePolicy(item.id)}
                                       aria-expanded={isExpanded}
                                       className="shrink-0 rounded-md px-2 py-1 text-xs font-semibold text-zinc-600 transition hover:bg-white hover:text-zinc-950"
                                    >
                                       {isExpanded ? "접기 ▲" : "보기 ▼"}
                                    </button>
                                 </div>

                                 {isExpanded ? (
                                    <div className="mt-3 rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs leading-6 text-zinc-600">
                                       <p>{item.detail}</p>
                                       <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                                          <a
                                             href={item.href}
                                             target="_blank"
                                             rel="noopener noreferrer"
                                             className="font-semibold text-zinc-950 underline decoration-zinc-300 underline-offset-4 transition hover:decoration-zinc-950"
                                          >
                                             전문 보기
                                          </a>
                                          {item.secondaryHref ? (
                                             <a
                                                href={item.secondaryHref}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="font-semibold text-zinc-950 underline decoration-zinc-300 underline-offset-4 transition hover:decoration-zinc-950"
                                             >
                                                {item.secondaryLabel}
                                             </a>
                                          ) : null}
                                       </div>
                                    </div>
                                 ) : null}
                              </div>
                           );
                        })}
                     </div>

                     {!allConsentsChecked ? (
                        <p className="mt-3 text-xs font-medium text-amber-700">
                           필수 항목에 모두 동의하면 결제 버튼이 활성화됩니다.
                        </p>
                     ) : null}
                  </div>

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
                        disabled={requesting || !allConsentsChecked}
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
