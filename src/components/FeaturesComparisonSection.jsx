"use client";

import { useEffect, useRef, useState } from "react";

function getRevealClass(isVisible) {
   return isVisible
      ? "translate-y-0 opacity-100"
      : "translate-y-6 opacity-0";
}

export default function FeaturesComparisonSection({ rows }) {
   const sectionRef = useRef(null);
   const [isVisible, setIsVisible] = useState(false);

   useEffect(() => {
      const node = sectionRef.current;

      if (!node) {
         return undefined;
      }

      const observer = new IntersectionObserver(
         ([entry]) => {
            if (!entry.isIntersecting) {
               return;
            }

            setIsVisible(true);
            observer.disconnect();
         },
         {
            threshold: 0.18,
            rootMargin: "0px 0px -8% 0px",
         },
      );

      observer.observe(node);

      return () => observer.disconnect();
   }, []);

   return (
      <section
         ref={sectionRef}
         className="rounded-[32px] border border-black/5 bg-[linear-gradient(180deg,#ffffff_0%,#fcf9f4_100%)] p-6 shadow-sm md:p-8"
      >
         <div
            className={`mx-auto max-w-3xl text-center transition-all duration-700 ease-out ${getRevealClass(
               isVisible,
            )}`}
         >
            <p className="text-sm font-semibold text-amber-900">
               왜 플로우머스인가
            </p>
            <h3 className="mt-2 text-2xl font-semibold leading-tight text-zinc-950 md:text-3xl">
               플로우머스를 써야 하는 이유
            </h3>
            <p className="mt-4 text-sm leading-7 text-zinc-600">
               단순히 상품을 긁어오는 프로그램이 아니라, 고객이 직접 매핑하고
               수집 요청을 넣고, 재고·가격·상세페이지까지 운영 흐름을 이어갈 수
               있는 쪽에 초점을 맞췄습니다.
            </p>
         </div>

         <div
            className={`mx-auto mt-8 max-w-[980px] transition-all duration-700 ease-out ${getRevealClass(
               isVisible,
            )}`}
            style={{ transitionDelay: "120ms" }}
         >
            <div className="hidden items-center gap-3 px-3 md:grid md:grid-cols-[0.8fr_1.08fr_0.8fr]">
               <div className="rounded-full border border-black/5 bg-[#f6efe3] px-4 py-3 text-center text-sm font-semibold text-zinc-800 shadow-sm">
                  항목
               </div>
               <div
                  className={`rounded-[24px] bg-[#1c1917] px-4 py-4 text-center text-sm font-semibold text-white shadow-[0_20px_50px_-28px_rgba(28,25,23,0.95)] ring-1 ring-[#8c6333]/30 transition-all duration-700 ease-out hover:scale-[1.07] ${
                     isVisible
                        ? "translate-y-[-0.35rem] scale-[1.05] opacity-100"
                        : "translate-y-3 scale-[0.96] opacity-0"
                  }`}
                  style={{ transitionDelay: "180ms" }}
               >
                  플로우머스
               </div>
               <div className="rounded-full border border-black/5 bg-[#f6efe3] px-4 py-3 text-center text-sm font-semibold text-zinc-800 shadow-sm">
                  타사 프로그램
               </div>
            </div>

            <div className="mt-4 space-y-3">
               {rows.map(([label, flowmerce, legacy], index) => (
                  <article
                     key={label}
                     className={`rounded-[28px] border border-black/5 bg-[#f8f4ed] p-3 shadow-[0_18px_40px_-32px_rgba(28,25,23,0.35)] transition-all duration-700 ease-out ${getRevealClass(
                        isVisible,
                     )}`}
                     style={{
                        transitionDelay: `${220 + index * 70}ms`,
                     }}
                  >
                     <div className="grid gap-3 md:grid-cols-[0.8fr_1.08fr_0.8fr] md:items-stretch">
                        <div className="rounded-[20px] bg-white px-4 py-4 text-center font-semibold text-zinc-950 shadow-sm ring-1 ring-black/5">
                           <span className="mb-2 inline-flex rounded-full border border-black/10 bg-zinc-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-600 md:hidden">
                              항목
                           </span>
                           <p>{label}</p>
                        </div>
                        <div className="rounded-[24px] bg-[#fffaf2] px-5 py-4 text-center font-medium leading-6 text-zinc-900 shadow-[0_20px_45px_-30px_rgba(140,99,51,0.75)] ring-1 ring-[#d4b38b]/70 transition duration-300 hover:scale-[1.055] md:-translate-y-1 md:scale-[1.04]">
                           <span className="mb-2 inline-flex rounded-full border border-[#8c6333]/15 bg-[#8c6333]/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8c6333] md:hidden">
                              플로우머스
                           </span>
                           <p>{flowmerce}</p>
                        </div>
                        <div className="rounded-[20px] bg-white/90 px-4 py-4 text-center leading-6 text-zinc-600 shadow-sm ring-1 ring-black/5">
                           <span className="mb-2 inline-flex rounded-full border border-black/10 bg-zinc-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-600 md:hidden">
                              타사 프로그램
                           </span>
                           <p>{legacy}</p>
                        </div>
                     </div>
                  </article>
               ))}
            </div>
         </div>

         <p
            className={`mx-auto mt-5 max-w-3xl text-center text-sm leading-7 text-zinc-500 transition-all duration-700 ease-out ${getRevealClass(
               isVisible,
            )}`}
            style={{ transitionDelay: `${260 + rows.length * 70}ms` }}
         >
            명품 운영 기준으로 고객이 실제로 체감하는 차이를 중심으로 정리한
            비교입니다.
         </p>
      </section>
   );
}
