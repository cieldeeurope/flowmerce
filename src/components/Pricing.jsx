import Container from "./Container";
import PricingPlanCards from "./PricingPlanCards";

export default function Pricing() {
   return (
      <section className="pt-16 md:pt-28" id="pricing">
         <Container>
            <div className="space-y-4 sm:text-center">
               <span className="inline-flex rounded-full border border-amber-200 bg-[#fbf7ef] px-3 py-1 text-xs font-semibold text-amber-900">
                  Pricing
               </span>
               <h2 className="mx-auto max-w-3xl text-2xl font-semibold leading-tight sm:text-3xl md:text-4xl">
                  자동화 솔루션 플랜별 요금제
               </h2>
               <p className="mx-auto max-w-2xl text-zinc-600">
                  처음 시작하는 운영부터 다중 사이트 확장까지, 지금 필요한 범위에
                  맞춰 플랜을 고를 수 있습니다.
               </p>
            </div>

            <PricingPlanCards ctaHref="/pricing" compact tone="luxury" />
         </Container>
      </section>
   );
}
