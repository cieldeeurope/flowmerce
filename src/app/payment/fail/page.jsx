"use client";

import Link from "next/link";
import { useMemo } from "react";
import Container from "@/components/Container";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function PaymentFailPage() {
   const error = useMemo(() => {
      if (typeof window === "undefined") {
         return { code: "", message: "" };
      }

      const searchParams = new URLSearchParams(window.location.search);
      return {
         code: searchParams.get("code") || "",
         message: searchParams.get("message") || "",
      };
   }, []);

   return (
      <>
         <Header />
         <main className="bg-[#f7f4ef] py-16 text-zinc-950 md:py-24">
            <Container>
               <div className="mx-auto max-w-2xl rounded-lg border border-zinc-200 bg-white p-7 shadow-sm">
                  <div className="rounded-lg border border-red-200 bg-red-50 px-5 py-4 text-red-800">
                     <p className="text-sm font-semibold">Payment</p>
                     <h1 className="mt-2 text-2xl font-semibold">
                        결제가 완료되지 않았습니다
                     </h1>
                     <p className="mt-3 text-sm leading-7">
                        결제창에서 결제가 취소되었거나 인증에 실패했습니다.
                     </p>
                  </div>

                  <dl className="mt-6 grid gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-5 text-sm">
                     <div className="flex justify-between gap-4">
                        <dt className="text-zinc-500">code</dt>
                        <dd className="font-medium text-zinc-900">{error.code || "-"}</dd>
                     </div>
                     <div className="flex justify-between gap-4">
                        <dt className="text-zinc-500">message</dt>
                        <dd className="font-medium text-zinc-900">
                           {error.message || "-"}
                        </dd>
                     </div>
                  </dl>

                  <div className="mt-7 flex flex-wrap gap-3">
                     <Link
                        href="/pricing"
                        className="inline-flex items-center justify-center rounded-lg border border-zinc-950 bg-zinc-950 px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-[#8c6333]"
                     >
                        다시 결제하기
                     </Link>
                     <Link
                        href="/inquiry?type=결제 문의"
                        className="inline-flex items-center justify-center rounded-lg border border-zinc-300 bg-white px-5 py-3 text-sm font-medium text-zinc-800 shadow-sm transition hover:bg-zinc-50"
                     >
                        결제 문의하기
                     </Link>
                  </div>
               </div>
            </Container>
         </main>
         <Footer />
      </>
   );
}
