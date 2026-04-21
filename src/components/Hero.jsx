import Link from "next/link";
import Container from "./Container";
import ArrowLink from "./ArrowLink";

export default function Hero() {
   const categories = [
      "명품 크롤링 특화",
      "SEO 상품명/상세 최적화",
      "마진/치환 자동화",
      "자동 재고관리 기능",
   ];

   return (
      <section className="relative overflow-hidden bg-gradient-to-b from-emerald-50 via-white to-sky-50 py-20 text-zinc-950 md:py-28">
         <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.18),transparent_30%),radial-gradient(circle_at_top_right,rgba(14,165,233,0.16),transparent_28%)]" />
         <div className="absolute inset-0 bg-[linear-gradient(rgba(15,23,42,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.045)_1px,transparent_1px)] bg-[size:96px_96px]" />
         <Container>
            <div className="relative mx-auto max-w-5xl text-center">
               <div className="flex flex-wrap justify-center gap-2">
                  {categories.map((category) => (
                     <span
                        key={category}
                        className="rounded-full border border-emerald-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-emerald-700 shadow-sm"
                     >
                        {category}
                     </span>
                  ))}
               </div>

               <div className="mt-8 inline-flex rounded-full border border-emerald-200 bg-emerald-100 px-4 py-2 text-sm font-semibold text-emerald-700">
                  쇼핑몰 10년 운영 경험으로 만든 쇼핑몰 완벽 자동화
               </div>

               <h1 className="mx-auto mt-7 max-w-4xl text-4xl font-semibold leading-[1.18] sm:text-5xl sm:leading-[1.16] md:text-6xl md:leading-[1.14]">
                  상품 운영은 플로우머스에 맡기고, 판매에만 집중하세요
               </h1>
               <p className="mx-auto mt-7 max-w-3xl text-base leading-8 text-zinc-600 sm:text-lg sm:leading-9">
                  모든 주요 호스팅사에 맞춘 상품 자동화를 제공하고, 명품 사이트 수집부터 마진 설정, 단어 치환, SEO 최적화까지 원하는 방식으로 적용할 수 있습니다. 반복되는 상품 운영은 플로우머스가 처리하고 고객님은 판매와 성장에 집중하면 됩니다.
               </p>

               <div className="mt-9 flex flex-col items-center justify-center gap-4 sm:flex-row">
                  <Link
                     href="/request"
                     className="inline-flex rounded-lg border border-emerald-700 bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-sm duration-150 hover:bg-emerald-700"
                  >
                     요청서 작성하기
                  </Link>

                  <ArrowLink href="/pricing" text="가격과 지원 사이트 보기" />
               </div>

               <dl className="mx-auto mt-12 grid max-w-4xl grid-cols-1 gap-4 text-left sm:grid-cols-3">
                  <div className="rounded-lg border border-zinc-200 bg-white/80 p-5 shadow-sm backdrop-blur">
                     <dt className="text-sm font-medium text-zinc-500">
                        실사용 매출 성과 확인
                     </dt>
                     <dd className="mt-2 text-lg font-semibold leading-7">
                        실제 이용객 매출 성장 사례로 체계적인 데이터 기반
                     </dd>
                  </div>
                  <div className="rounded-lg border border-zinc-200 bg-white/80 p-5 shadow-sm backdrop-blur">
                     <dt className="text-sm font-medium text-zinc-500">
                        최적화된 AI 기반 상품 콘텐츠
                     </dt>
                     <dd className="mt-2 text-lg font-semibold leading-7">
                        SEO 에 최적화된 상품명과 상세 페이지
                     </dd>
                  </div>
                  <div className="rounded-lg border border-zinc-200 bg-white/80 p-5 shadow-sm backdrop-blur">
                     <dt className="text-sm font-medium text-zinc-500">
                        최적화 운영 지원
                     </dt>
                     <dd className="mt-2 text-lg font-semibold leading-7">
                        24시간 실시간 응대와 쇼핑몰 완벽 연동 사전 셋팅
                     </dd>
                  </div>
               </dl>
            </div>
         </Container>
      </section>
   );
}
