import Image from "next/image";
import Link from "next/link";
import Container from "./Container";

const quickActions = [
   "카테고리 매핑",
   "수집 예약",
   "마진 설정",
   "단어 치환",
   "재고·품절 반영",
];

const heroPoints = [
   {
      title: "자동 재고·품절 관리",
      description:
         "신상품 등록만이 아니라 품절, 가격 변경, 노출 상태까지 이어서 관리할 수 있습니다.",
   },
   {
      title: "설치 없는 웹 대시보드",
      description:
         "프로그램 설치나 Java 설정 없이 브라우저에서 바로 매핑하고 수집 요청할 수 있습니다.",
   },
   {
      title: "명품 판매 운영 기준",
      description:
         "현지 사이트 기준 수집과 마진 구조, 운영 흐름을 명품 판매 방식에 맞춰 설계했습니다.",
   },
];

export default function Hero() {
   return (
      <section className="relative overflow-hidden bg-[#120f0b] text-white">
         <div className="absolute inset-0">
            <Image
               src="/home/main-hero-luxury.png"
               alt="럭셔리 브랜드 매장이 이어진 쇼핑몰 전경"
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
                  <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold tracking-[0.12em] text-[#f1deba] backdrop-blur">
                     LUXURY COMMERCE AUTOMATION
                  </span>

                  <h1 className="mt-5 max-w-4xl text-4xl font-semibold leading-[1.12] sm:text-5xl md:text-6xl">
                     명품 쇼핑몰 운영,
                     <br />
                     상품등록 & 재고관리 자동화 서비스
                  </h1>

                  <p className="mt-6 max-w-3xl text-base leading-8 text-white/82 sm:text-lg sm:leading-9">
                     플로우머스는 카페24, 고도몰, 스마트스토어, 메이크샵 운영에
                     필요한 상품 수집, 쇼핑몰 카테고리 매핑, 마진 설정, 단어
                     치환, 수집 예약, 재고·품절 관리를 별도 프로그램 없이 바로 처리할 수 있도록 설계했습니다.
                  </p>

                  <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                     <Link
                        href="/pricing"
                        className="inline-flex h-12 items-center justify-center rounded-md bg-zinc-950 px-6 text-sm font-semibold text-white transition hover:bg-zinc-800"
                     >
                        요금과 플랜 보기
                     </Link>
                     <Link
                        href="/program"
                        className="inline-flex h-12 items-center justify-center rounded-md border border-white/20 bg-white/8 px-6 text-sm font-semibold text-white transition hover:bg-white/14"
                     >
                        운영 화면 보기
                     </Link>
                  </div>

                  <div className="mt-7 flex flex-wrap gap-2">
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
                  {heroPoints.map((point) => (
                     <div
                        key={point.title}
                        className="rounded-md border border-white/10 bg-white/[0.04] p-5 transition duration-200 hover:-translate-y-0.5 hover:bg-white/[0.07]"
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
