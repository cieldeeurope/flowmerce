"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import Container from "@/components/Container";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function PaymentSuccessPage() {
   const [status, setStatus] = useState({
      tone: "pending",
      title: "결제 승인 확인 중입니다",
      message: "결제 승인 요청을 처리하고 있습니다.",
   });

   const params = useMemo(() => {
      if (typeof window === "undefined") {
         return {};
      }

      const searchParams = new URLSearchParams(window.location.search);
      return {
         paymentKey: searchParams.get("paymentKey") || "",
         orderId: searchParams.get("orderId") || "",
         amount: searchParams.get("amount") || "",
      };
   }, []);

   useEffect(() => {
      let cancelled = false;

      async function confirmPayment() {
         if (!params.paymentKey || !params.orderId || !params.amount) {
            setStatus({
               tone: "error",
               title: "결제 승인 정보가 부족합니다",
               message: "paymentKey, orderId, amount 값을 확인할 수 없습니다.",
            });
            return;
         }

         try {
            const response = await fetch("/api/payments/toss/confirm", {
               method: "POST",
               headers: {
                  "Content-Type": "application/json",
               },
               body: JSON.stringify({
                  paymentKey: params.paymentKey,
                  orderId: params.orderId,
                  amount: Number(params.amount),
               }),
            });
            const data = await response.json().catch(() => ({}));

            if (cancelled) {
               return;
            }

            if (!response.ok) {
               throw new Error(data.message || "결제 승인에 실패했습니다.");
            }

            setStatus({
               tone: "success",
               title: "결제가 승인되었습니다",
               message:
                  "결제가 정상적으로 완료되었습니다. 플로우머스에서 결제 내역을 확인한 뒤 서비스 이용 절차를 안내해드립니다.",
            });
         } catch (error) {
            if (cancelled) {
               return;
            }

            setStatus({
               tone: "error",
               title: "결제 승인에 실패했습니다",
               message: error.message || "결제 승인 요청에 실패했습니다.",
            });
         }
      }

      void confirmPayment();

      return () => {
         cancelled = true;
      };
   }, [params.amount, params.orderId, params.paymentKey]);

   const toneClass =
      status.tone === "success"
         ? "border-emerald-200 bg-emerald-50 text-emerald-800"
         : status.tone === "error"
           ? "border-red-200 bg-red-50 text-red-800"
           : "border-amber-200 bg-amber-50 text-amber-900";

   return (
      <>
         <Header />
         <main className="bg-[#f7f4ef] py-16 text-zinc-950 md:py-24">
            <Container>
               <div className="mx-auto max-w-2xl rounded-lg border border-zinc-200 bg-white p-7 shadow-sm">
                  <div className={`rounded-lg border px-5 py-4 ${toneClass}`}>
                     <p className="text-sm font-semibold">Payment</p>
                     <h1 className="mt-2 text-2xl font-semibold">{status.title}</h1>
                     <p className="mt-3 text-sm leading-7">{status.message}</p>
                  </div>

                  <dl className="mt-6 grid gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-5 text-sm">
                     <div className="flex justify-between gap-4">
                        <dt className="text-zinc-500">orderId</dt>
                        <dd className="font-medium text-zinc-900">{params.orderId || "-"}</dd>
                     </div>
                     <div className="flex justify-between gap-4">
                        <dt className="text-zinc-500">amount</dt>
                        <dd className="font-medium text-zinc-900">
                           {params.amount ? `${Number(params.amount).toLocaleString()}원` : "-"}
                        </dd>
                     </div>
                  </dl>

                  <div className="mt-7 flex flex-wrap gap-3">
                     <Link
                        href="/pricing"
                        className="inline-flex items-center justify-center rounded-lg border border-zinc-950 bg-zinc-950 px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-[#8c6333]"
                     >
                        요금제로 돌아가기
                     </Link>
                     <Link
                        href="/mypage"
                        className="inline-flex items-center justify-center rounded-lg border border-zinc-300 bg-white px-5 py-3 text-sm font-medium text-zinc-800 shadow-sm transition hover:bg-zinc-50"
                     >
                        마이페이지
                     </Link>
                  </div>
               </div>
            </Container>
         </main>
         <Footer />
      </>
   );
}
