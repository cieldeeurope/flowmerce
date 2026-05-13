import clsx from "clsx";
import Container from "@/components/Container";
import Link from "next/link";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import PricingPlanCards from "@/components/PricingPlanCards";
import {
   comparison,
   coreSourcingSites,
   highEndSites,
} from "@/lib/pricingData";
import { createMetadata } from "@/lib/seo";

export const metadata = createMetadata({
   title: "가격",
   description:
      "명품 쇼핑몰 상품 등록 자동화 요금제, 월 요청 처리량, 지원 사이트, 하이엔드 사이트 기준까지 안내합니다.",
   path: "/pricing",
});

export default function PricingPage() {
   return (
      <>
         <Header />
         <main className="bg-[#f7f4ef] text-zinc-950">
            <section className="py-16 md:py-24">
               <Container>
                  <div className="mx-auto max-w-3xl text-center">
                     <span className="inline-flex rounded-md border border-amber-200 bg-[#fbf7ef] px-2.5 py-1.5 text-xs font-semibold text-amber-900 shadow-sm">
                        Pricing
                     </span>
                     <h1 className="mt-4 text-4xl font-semibold leading-tight sm:text-5xl">
                        플로우머스 플랜별 요금제
                     </h1>
                     <p className="mt-5 text-lg leading-8 text-zinc-600">
                        Pro 이상은 사전 셋팅까지 지원하며, 모든 플랜은 카테고리 매핑 이후에는 원하는 사이트의 원클릭 수집 예약만으로 상품 수집과 재고관리 전체를 운영할 수 있습니다.
                     </p>
                  </div>

                  <PricingPlanCards tone="luxury" />
               </Container>
            </section>

            <section className="pb-12 md:pb-16">
               <Container>
                  <div className="mx-auto mb-10 max-w-5xl rounded-lg border border-amber-200 bg-[#fbf7ef] p-7 shadow-sm">
                     <div className="max-w-3xl">
                        <span className="inline-flex rounded-md border border-amber-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-amber-900 shadow-sm">
                           Subscription
                        </span>
                        <h2 className="mt-4 text-2xl font-semibold md:text-3xl">
                           구독 전 꼭 확인해야 하는 운영 기준
                        </h2>
                        <p className="mt-4 text-base leading-8 text-zinc-600">
                           플로우머스는 단순 결제형 상품이 아니라, 계정 승인과 사이트 확정, 세팅
                           온보딩까지 함께 이어지는 운영형 서비스입니다. 구독 전에는 운영 동의서와
                           환불, 데이터 처리 기준을 함께 확인해주셔야 합니다.
                        </p>
                     </div>

                     <div className="mt-8 grid gap-4 lg:grid-cols-4">
                        <PolicyCard
                           href="/subscription-agreement"
                           title="구독 및 운영 동의서"
                           description="구독 시작, 세팅 진행, 사이트 확정, 종료 후 상품 삭제 원칙까지 한 번에 확인합니다."
                        />
                        <PolicyCard
                           href="/terms"
                           title="이용약관"
                           description="회원 승인, 서비스 이용 범위, 운영 제한과 책임 범위를 확인합니다."
                        />
                        <PolicyCard
                           href="/refund-policy"
                           title="환불 및 해지정책"
                           description="세팅 전후 환불 가능 범위와 구독 종료 절차를 확인합니다."
                        />
                        <PolicyCard
                           href="/data-policy"
                           title="계정정보 및 데이터 기준"
                           description="구독 종료 후 상품과 운영 데이터가 어떻게 처리되는지 확인합니다."
                        />
                     </div>
                  </div>

                  <div className="mx-auto mb-12 max-w-5xl rounded-lg border border-zinc-200 bg-white p-7 shadow-sm">
                     <div className="max-w-3xl">
                        <span className="inline-flex rounded-md border border-amber-200 bg-[#fbf7ef] px-2.5 py-1.5 text-xs font-semibold text-amber-900 shadow-sm">
                           Setup Guide
                        </span>
                        <h2 className="mt-4 text-2xl font-semibold md:text-3xl">
                           결제 후에는 연동할 쇼핑몰 계정 정보가 필요합니다
                        </h2>
                        <p className="mt-4 text-base leading-8 text-zinc-600">
                           플랜 결제와 사이트 선택이 끝나면 연동할 쇼핑몰 관리자 정보를 플로우머스로 전달해주셔야 세팅이 진행됩니다. partnerKey와 apiKey를 직접 찾기 어려운 경우가 많기 때문에, 대부분은 카카오톡 상담으로 관리자 URL과 로그인 정보만 먼저 전달해주시면 됩니다.
                        </p>
                     </div>

                     <div className="mt-8 grid gap-4 lg:grid-cols-3">
                        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-5">
                           <p className="text-sm font-semibold text-zinc-950">
                              1. 사이트 선택 완료
                           </p>
                           <p className="mt-2 text-sm leading-7 text-zinc-600">
                              마이페이지에서 플랜에 맞는 사이트를 확정하면 세팅 준비가 시작됩니다.
                           </p>
                        </div>
                        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-5">
                           <p className="text-sm font-semibold text-zinc-950">
                              2. 쇼핑몰 관리자 정보 전달
                           </p>
                           <p className="mt-2 text-sm leading-7 text-zinc-600">
                              카카오톡으로 쇼핑몰 관리자 URL, 아이디, 비밀번호를 보내주시면 됩니다. 계정이 여러 개면 함께 알려주시면 더 빠르게 세팅할 수 있습니다.
                           </p>
                        </div>
                        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-5">
                           <p className="text-sm font-semibold text-zinc-950">
                              3. 키 확인과 세팅 진행
                           </p>
                           <p className="mt-2 text-sm leading-7 text-zinc-600">
                              필요한 partnerKey, apiKey 확인 방법까지 플로우머스가 안내하고 세팅을 이어갑니다.
                           </p>
                        </div>
                     </div>

                     <div className="mt-6 flex flex-wrap gap-3">
                        <a
                           href="https://pf.kakao.com/_hPdjX/chat"
                           target="_blank"
                           rel="noopener noreferrer"
                           className="inline-flex items-center justify-center rounded-lg border border-zinc-950 bg-zinc-950 px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-[#8c6333]"
                        >
                           카카오톡으로 세팅 문의하기
                        </a>
                        <a
                           href="/inquiry?type=사이트 문의"
                           className="inline-flex items-center justify-center rounded-lg border border-zinc-300 bg-white px-5 py-3 text-sm font-medium text-zinc-800 shadow-sm transition hover:bg-zinc-50"
                        >
                           문의 남기기
                        </a>
                     </div>

                     <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-5 py-4 text-sm leading-7 text-red-800">
                        구독이 종료되면 플로우머스가 관리하던 상품은 쇼핑몰과 데이터 저장소에서 삭제될 수 있습니다. 1개월 결제로 상품만 등록한 뒤 종료하는 방식은 운영 리스크가 크므로, 종료 전에는 반드시 상품 이관이나 정리 방식부터 먼저 상담해주세요.
                     </div>
                  </div>

                  <div className="mx-auto max-w-4xl text-center">
                     <h2 className="text-2xl font-semibold md:text-3xl">
                        월 요청 처리량 이란?
                     </h2>
                     <p className="mt-5 text-base leading-8 text-zinc-600">
                        요청 처리량은 플로우머스가 실제로 처리하는 작업량입니다.
                        상품을 새로 등록하는 것도, 이미 등록된 상품의 가격이나 품절 여부를 다시 확인하는 재고관리도 각각 요청량으로 계산됩니다.
                        그래서 단순히 쇼핑몰에 등록된 상품 수가 아니라 매월 자동화가 처리하는 총 작업량을 기준으로 플랜을 나눕니다.
                     </p>
                     <div className="mx-auto mt-7 max-w-2xl overflow-hidden rounded-lg border border-zinc-200 bg-white text-left shadow-sm">
                        <div className="grid grid-cols-[1fr_auto] border-b border-zinc-200 bg-zinc-50 px-5 py-3 text-sm font-semibold text-zinc-950">
                           <span>작업 예시</span>
                           <span>차감 요청량</span>
                        </div>
                        <div className="divide-y divide-zinc-200 text-sm">
                           <div className="grid grid-cols-[1fr_auto] px-5 py-3 text-zinc-600">
                              <span>상품등록 1,000개</span>
                              <strong className="text-zinc-950">1,000건</strong>
                           </div>
                           <div className="grid grid-cols-[1fr_auto] px-5 py-3 text-zinc-600">
                              <span>재고관리 1,000개</span>
                              <strong className="text-zinc-950">1,000건</strong>
                           </div>
                           <div className="grid grid-cols-[1fr_auto] px-5 py-3 text-zinc-600">
                              <span>재고관리 중 새 상품 300개 추가 등록</span>
                              <strong className="text-zinc-950">300건 추가</strong>
                           </div>
                        </div>
                     </div>
                     <p className="mt-4 text-sm leading-7 text-zinc-500">
                        예를 들어 상품등록 1,000개 후 같은 달에 재고관리 1,000개를 요청하면 총 2,000건이 사용됩니다.
                        재고관리 과정에서 새 상품이 발견되어 등록되면 그 수량도 요청량에 추가됩니다.
                     </p>
                     <p className="mt-5 text-base leading-8 text-zinc-600">
                        하이엔드 그룹은 브랜드 인지도뿐 아니라 접근 안정성, 보안 레벨,
                        수집 난이도까지 함께 기준으로 분류합니다. 공개 페이지에서는 실제
                        사이트명을 비공개로 유지하고, 현재 가능한
                        <a
                           href="#supported-sites"
                           className="mx-1 font-semibold text-zinc-950 underline decoration-zinc-300 underline-offset-4 hover:decoration-zinc-950"
                        >
                           운영 범위 보기
                        </a>
                        에서 비식별 처리된 지원 범위를 확인하실 수 있습니다.
                     </p>
                  </div>
               </Container>
            </section>

            <section className="pb-16 md:pb-24">
               <Container>
                  <div className="rounded-lg border border-zinc-200 bg-white shadow-sm">
                     <div className="border-b border-zinc-200 p-7">
                        <h2 className="text-2xl font-semibold">기능 비교표</h2>
                        <p className="mt-2 text-sm text-zinc-600">
                           사이트 수, 요청 처리량, 보안 난이도, SEO 등록, 운영 지원까지 함께 비교하세요.
                        </p>
                     </div>
                     <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-zinc-200 text-sm">
                           <thead className="bg-zinc-50">
                              <tr>
                                 <th className="px-5 py-4 text-left font-semibold text-zinc-950">
                                    기능
                                 </th>
                                 <th className="px-5 py-4 text-left font-semibold text-zinc-950">
                                    Boutique
                                 </th>
                                 <th className="px-5 py-4 text-left font-semibold text-zinc-950">
                                    Basic
                                 </th>
                                 <th className="px-5 py-4 text-left font-semibold text-zinc-950">
                                    Pro
                                 </th>
                                 <th className="px-5 py-4 text-left font-semibold text-zinc-950">
                                    Enterprise
                                 </th>
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-zinc-200 bg-white">
                              {comparison.map(([feature, boutique, basic, pro, enterprise]) => (
                                 <tr key={feature}>
                                    <td className="whitespace-nowrap px-5 py-4 font-medium text-zinc-950">
                                       {feature}
                                    </td>
                                    <td className="whitespace-nowrap px-5 py-4 text-zinc-600">
                                       {boutique}
                                    </td>
                                    <td className="whitespace-nowrap px-5 py-4 text-zinc-600">
                                       {basic}
                                    </td>
                                    <td className="whitespace-nowrap px-5 py-4 text-zinc-600">
                                       {pro}
                                    </td>
                                    <td className="whitespace-nowrap px-5 py-4 text-zinc-600">
                                       {enterprise}
                                    </td>
                                 </tr>
                              ))}
                           </tbody>
                        </table>
                     </div>
                  </div>
               </Container>
            </section>

            <section className="pb-16 md:pb-24" id="supported-sites">
               <Container>
                  <div className="rounded-lg border border-zinc-200 bg-white p-7 shadow-sm md:p-10">
                     <div className="max-w-3xl">
                        <span className="inline-flex rounded-md border border-amber-200 bg-[#fbf7ef] px-2.5 py-1.5 text-xs font-semibold text-amber-900 shadow-sm">
                           Supported Sites
                        </span>
                        <h2 className="mt-4 text-2xl font-semibold md:text-3xl">
                           현재 운영 가능한 사이트 목록
                        </h2>
                        <p className="mt-3 text-sm leading-7 text-zinc-600">
                           운영 가능한 소싱처는 계속 확장되고 있지만, 공개 페이지에서는
                           세부 사이트명을 비공개로 유지합니다. 상세 목록은 플랜 구독자
                           전용 화면에서 확인하실 수 있으며, 아래에는 현재 운영 범위를
                           비식별 처리한 형태로만 안내합니다.
                        </p>
                     </div>

                     <div className="mt-8 grid gap-7 lg:grid-cols-[0.75fr_1.25fr]">
                        <SiteGroup
                           title="하이엔드 사이트"
                           description="보안 레벨과 수집 난이도가 높은 사이트"
                           siteCount={highEndSites.length}
                           previewPrefix="Premium source"
                           highlighted
                        />
                        <SiteGroup
                           title="핵심 소싱 사이트"
                           description="운영 효율이 높은 주요 명품 소싱 사이트"
                           siteCount={coreSourcingSites.length}
                           previewPrefix="Core source"
                        />
                     </div>
                  </div>
               </Container>
            </section>
         </main>
         <Footer />
      </>
   );
}

function SiteGroup({
   title,
   description,
   siteCount,
   previewPrefix,
   highlighted = false,
}) {
   const previewCount = Math.min(siteCount, highlighted ? 9 : 15);

   return (
      <div
         className={clsx(
            highlighted ? "border-amber-200 bg-[#fbf7ef]" : "border-zinc-200 bg-zinc-50",
            "rounded-lg border p-5",
         )}
      >
         <h3 className="text-lg font-semibold">{title}</h3>
         <p className="mt-1 text-sm text-zinc-600">{description}</p>

         <div className="mt-5 rounded-2xl border border-white/70 bg-white/80 p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
               현재 운영 범위
            </p>
            <p className="mt-2 text-3xl font-semibold text-zinc-950">{siteCount}+</p>
            <p className="mt-2 text-sm leading-7 text-zinc-600">
               상세 사이트명은 플랜 구독자 전용 화면에서만 확인하실 수 있습니다.
            </p>
         </div>

         <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: previewCount }, (_, index) => (
               <div
                  key={`${title}-${index + 1}`}
                  className="relative overflow-hidden rounded-full border border-white/70 bg-white px-4 py-2.5 shadow-sm"
               >
                  <span className="block select-none text-center text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500 blur-[3.6px]">
                     {previewPrefix} {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="pointer-events-none absolute inset-0 bg-gradient-to-r from-white/10 via-white/55 to-white/10" />
               </div>
            ))}
         </div>
      </div>
   );
}

function PolicyCard({ href, title, description }) {
   return (
      <Link
         href={href}
         className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-zinc-950"
      >
         <p className="text-sm font-semibold text-zinc-950">{title}</p>
         <p className="mt-2 text-sm leading-7 text-zinc-600">{description}</p>
      </Link>
   );
}

