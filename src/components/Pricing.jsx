import Container from "./Container";
import PricingPlanCards from "./PricingPlanCards";

const pricingHighlights = [
   "브라우저형 스튜디오 제공",
   "카카오톡 세팅 안내 포함",
   "플랜별 사이트 확장 가능",
];

export default function Pricing() {
   return (
      <section className="pt-16 md:pt-28" id="pricing">
         <Container>
            <div className="space-y-4 sm:text-center">
               <span className="inline-flex rounded-full border border-amber-200 bg-[#fbf7ef] px-3 py-1 text-xs font-semibold text-amber-900">
                  Pricing
               </span>
               <h2 className="mx-auto max-w-3xl text-2xl font-semibold leading-tight sm:text-3xl md:text-4xl">
                  시작은 가볍게,
                  <br />
                  운영은 확장형으로 선택하세요
               </h2>
               <p className="mx-auto max-w-2xl text-zinc-600">
                  Boutique부터 Enterprise까지 요청 처리량, 소싱 사이트 수, 운영 지원
                  범위를 계획에 맞춰 고를 수 있습니다. 결제 이후에는 사이트 확정과
                  세팅 온보딩이 자연스럽게 이어지도록 구성했습니다.
               </p>
            </div>

            <div className="mt-6 flex flex-wrap justify-center gap-2">
               {pricingHighlights.map((item) => (
                  <span
                     key={item}
                     className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 shadow-sm"
                  >
                     {item}
                  </span>
               ))}
            </div>

            <PricingPlanCards ctaHref="/pricing" compact tone="luxury" />
         </Container>
      </section>
   );
}
