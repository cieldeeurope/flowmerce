"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import Container from "./Container";

const quickActions = [
   "상품 수집",
   "카테고리 매핑",
   "마진 설정",
   "수집 예약",
   "재고·품절 관리",
];

const heroPoints = [
   {
      title: "설치 없는 브라우저형 구조",
      description:
         "별도 프로그램 설치 없이 바로 접속해 필요한 운영 메뉴를 한 화면에서 이어서 사용할 수 있습니다.",
   },
   {
      title: "쇼핑몰 운영 메뉴 집중",
      description:
         "카테고리 매핑, 마진 설정, 단어 치환, 수집 예약, 재고관리 흐름을 운영 기준으로 묶어두었습니다.",
   },
   {
      title: "실사용 중심 온보딩",
      description:
         "결제 후에는 카카오톡 온보딩과 실제 세팅 안내가 이어져 시작 단계에서 막히지 않도록 설계했습니다.",
   },
];

function getRevealClass(isVisible) {
   return isVisible
      ? "translate-y-0 opacity-100 blur-0"
      : "translate-y-6 opacity-0 blur-[6px]";
}

export default function Hero() {
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
            threshold: 0.2,
            rootMargin: "0px 0px -8% 0px",
         },
      );

      observer.observe(node);

      return () => observer.disconnect();
   }, []);

   return (
      <section
         ref={sectionRef}
         className="relative overflow-hidden bg-[#120f0b] text-white"
      >
         <div className="absolute inset-0">
            <Image
               src="/home/main-hero-luxury.png"
               alt="럭셔리 브랜드와 명품 쇼핑몰 운영 분위기를 보여주는 배경"
               fill
               priority
               className="object-cover object-center"
               sizes="100vw"
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,8,8,0.34)_0%,rgba(8,8,8,0.52)_35%,rgba(8,8,8,0.78)_100%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(218,180,106,0.22),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.10),transparent_30%)]" />
         </div>

         <Container>
            <div className="relative flex min-h-[62vh] items-end py-16 md:min-h-[68vh] md:py-20">
               <div className="max-w-4xl">
                  <span
                     className={`inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold tracking-[0.12em] text-[#f1deba] backdrop-blur transition-all duration-700 ease-out ${getRevealClass(
                        isVisible,
                     )}`}
                  >
                     LUXURY COMMERCE AUTOMATION
                  </span>

                  <h1
                     className={`mt-5 max-w-4xl text-4xl font-semibold leading-[1.12] transition-all duration-700 ease-out sm:text-5xl md:text-6xl ${getRevealClass(
                        isVisible,
                     )}`}
                     style={{ transitionDelay: "100ms" }}
                  >
                     명품 쇼핑몰 운영,
                     <br />
                     상품등록 &amp; 재고관리 자동화 서비스
                  </h1>

                  <p
                     className={`mt-6 max-w-3xl text-base leading-8 text-white/82 transition-all duration-700 ease-out sm:text-lg sm:leading-9 ${getRevealClass(
                        isVisible,
                     )}`}
                     style={{ transitionDelay: "190ms" }}
                  >
                     플로우머스는 카페24, 고도몰, 스마트스토어, 메이크샵 운영에 필요한 상품
                     수집, 쇼핑몰 카테고리 매핑, 마진 설정, 단어 치환, 수집 예약,
                     재고·품절 관리를 별도 프로그램 없이 바로 처리할 수 있도록 설계했습니다.
                  </p>

                  <div
                     className={`mt-8 flex flex-col gap-3 transition-all duration-700 ease-out sm:flex-row ${getRevealClass(
                        isVisible,
                     )}`}
                     style={{ transitionDelay: "280ms" }}
                  >
                     <Link
                        href="/pricing"
                        className="inline-flex h-12 items-center justify-center rounded-md bg-zinc-950 px-6 text-sm font-semibold text-white transition hover:bg-zinc-800"
                     >
                        요금제와 운영 기준 보기
                     </Link>
                     <Link
                        href="/program"
                        className="inline-flex h-12 items-center justify-center rounded-md border border-white/20 bg-white/8 px-6 text-sm font-semibold text-white transition hover:bg-white/14"
                     >
                        플로우머스 스튜디오 보기
                     </Link>
                  </div>

                  <div
                     className={`mt-7 flex flex-wrap gap-2 transition-all duration-700 ease-out ${getRevealClass(
                        isVisible,
                     )}`}
                     style={{ transitionDelay: "360ms" }}
                  >
                     {quickActions.map((item) => (
                        <span
                           key={item}
                           className="rounded-full border border-white/12 bg-black/20 px-3 py-1.5 text-xs font-medium text-white/78 backdrop-blur"
                        >
                           {item}
                        </span>
                     ))}
                  </div>
               </div>
            </div>
         </Container>

         <div className="relative border-t border-white/10 bg-[#15120f]/92 backdrop-blur">
            <Container>
               <div className="grid gap-4 py-5 md:grid-cols-3">
                  {heroPoints.map((point, index) => (
                     <div
                        key={point.title}
                        className={`rounded-md border border-white/10 bg-white/[0.04] p-5 transition-all duration-700 ease-out hover:-translate-y-0.5 hover:bg-white/[0.07] ${getRevealClass(
                           isVisible,
                        )}`}
                        style={{
                           transitionDelay: `${460 + index * 90}ms`,
                        }}
                     >
                        <p className="text-sm font-semibold text-[#f1deba]">
                           {point.title}
                        </p>
                        <p className="mt-2 text-sm leading-7 text-white/72">
                           {point.description}
                        </p>
                     </div>
                  ))}
               </div>
            </Container>
         </div>
      </section>
   );
}
