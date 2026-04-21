import clsx from "clsx";
import Container from "@/components/Container";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import PricingPlanCards from "@/components/PricingPlanCards";
import {
   comparison,
   coreSourcingSites,
   highEndSites,
} from "@/lib/pricingData";

export const metadata = {
   title: "가격 - Flowmerce",
   description: "명품 쇼핑몰 상품 등록 자동화 가격과 지원 사이트 안내",
};

export default function PricingPage() {
   return (
      <>
         <Header />
         <main className="bg-zinc-50">
            <section className="py-16 md:py-24">
               <Container>
                  <div className="mx-auto max-w-3xl text-center">
                     <span className="inline-flex rounded-md border border-emerald-300 bg-emerald-100 px-2.5 py-1.5 text-xs font-semibold text-emerald-600 shadow-sm">
                        Pricing
                     </span>
                     <h1 className="mt-4 text-4xl font-semibold leading-tight sm:text-5xl">
                        플로우머스 플랜별 요금제
                     </h1>
                     <p className="mt-5 text-lg leading-8 text-zinc-600">
                        Pro 이상은 사전 셋팅까지 지원하며, 모든 플랜은 카테고리 매핑 이후에는 원하는 사이트의 원클릭 수집 예약만으로 상품 수집과 재고관리 전체를 운영할 수 있습니다.
                     </p>
                  </div>

                  <PricingPlanCards />
               </Container>
            </section>

            <section className="pb-12 md:pb-16">
               <Container>
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
                        하이엔드 사이트는 두 가지 기준으로 분류합니다. Dior, Lv처럼 브랜드 자체가 하이엔드인 경우도 있고,
                        Fendi, Brunello, Jacquemus처럼 브랜드 가치와 별개로 사이트 보안 레벨과 수집 난이도가 높아
                        하이엔드로 분류되는 경우도 있습니다. 플로우머스는 브랜드 인지도뿐 아니라 접근 안정성,
                        보안 레벨, 수집 난이도까지 함께 기준으로 봅니다. 현재 가능한
                        <a
                           href="#supported-sites"
                           className="mx-1 font-semibold text-emerald-700 underline decoration-emerald-300 underline-offset-4 hover:text-emerald-800"
                        >
                           하이엔드 사이트 목록 보기
                        </a>
                        에서 브랜드별로 분류된 목록을 확인할 수 있습니다.
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
                        <span className="inline-flex rounded-md border border-emerald-300 bg-emerald-100 px-2.5 py-1.5 text-xs font-semibold text-emerald-600 shadow-sm">
                           Supported Sites
                        </span>
                        <h2 className="mt-4 text-2xl font-semibold md:text-3xl">
                           현재 운영 가능한 사이트 목록
                        </h2>
                        <p className="mt-3 text-sm leading-7 text-zinc-600">
                           아래 목록 외에도 사이트 요청과 플랫폼 구축 요청을 받을 수 있습니다.
                           보안 레벨이 높은 사이트는 별도 검토 후 플랜에 맞춰 안내합니다.
                        </p>
                     </div>

                     <div className="mt-8 grid gap-7 lg:grid-cols-[0.75fr_1.25fr]">
                        <SiteGroup
                           title="하이엔드 사이트"
                           description="보안 레벨과 수집 난이도가 높은 사이트"
                           sites={highEndSites}
                           highlighted
                        />
                        <SiteGroup
                           title="핵심 소싱 사이트"
                           description="운영 효율이 높은 주요 명품 소싱 사이트"
                           sites={coreSourcingSites}
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

function SiteGroup({ title, description, sites, highlighted = false }) {
   return (
      <div
         className={clsx(
            highlighted ? "border-emerald-200 bg-emerald-50" : "border-zinc-200 bg-zinc-50",
            "rounded-lg border p-5",
         )}
      >
         <h3 className="text-lg font-semibold">{title}</h3>
         <p className="mt-1 text-sm text-zinc-600">{description}</p>
         <div className="mt-5 flex flex-wrap gap-2">
            {sites.map((site) => (
               <span
                  key={site}
                  className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 shadow-sm"
               >
                  {site}
               </span>
            ))}
         </div>
      </div>
   );
}

