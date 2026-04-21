import Container from "./Container";
import PricingPlanCards from "./PricingPlanCards";

export default function Pricing() {
   return (
      <section className="pt-16 md:pt-28" id="pricing">
         <Container>
            <div className="space-y-4 sm:text-center">
               <span className="inline-flex rounded-md border border-emerald-300 bg-emerald-100 px-2.5 py-1.5 text-xs font-semibold text-emerald-600 shadow-sm">
                  Pricing
               </span>
               <h2 className="mx-auto max-w-2xl text-2xl font-semibold leading-tight sm:text-3xl md:text-4xl">
                  자동화 솔루션 플랜별 요금제
               </h2>
            </div>

            <PricingPlanCards ctaHref="/pricing" compact />
         </Container>
      </section>
   );
}
