import Container from "./Container";
import { LoopRightIcon } from "./icons/LoopRightIcon";
import ArrowLink from "./ArrowLink";
import { DonutChartIcon } from "./icons/DonutChartIcon";
import { TeamIcon } from "./icons/TeamIcon";
import { DotsIcon } from "./icons/DotsIcon";

export default function Features() {
   const features = [
      {
         icon: LoopRightIcon,
         name: "구매대행 구조를 잘 아는 수집 자동화",
         description:
            "모든 사람이 쉽게 접하는 상품 구조로는 수익이 생기기 어렵습니다. 플로우머스는 구매대행에 맞는 흐름으로 상품을 수집합니다.",
      },
      {
         icon: DonutChartIcon,
         name: "SEO 상품명과 상세내용 최적화",
         description:
            "같은 상품명과 같은 상세내용을 반복 등록하면 중복 상품처럼 보일 수 있습니다. 플로우머스는 AI를 통해 같은 결과물만 반복하지 않도록 설계했습니다.",
      },
      {
         icon: DotsIcon,
         name: "편리한 마진 적용과 단어 치환 제공",
         description:
            "브랜드별, 금액대별로 원하는 마진식을 적용하고 특정 단어를 원하는 표현으로 치환해 운영 흐름에 맞게 조정할 수 있습니다.",
      },
      {
         icon: TeamIcon,
         name: "원클릭 수집 예약과 재고관리",
         description:
            "최초 카테고리 매핑 이후에는 수집 예약과 재고관리를 원클릭으로 요청할 수 있고, 재고관리 중 새 상품까지 함께 등록할 수 있습니다.",
      },
   ];

   return (
      <section className="pt-16 md:pt-28" id="features">
         <Container>
            <div className="space-y-4 sm:text-center">
               <span className="inline-flex rounded-md border border-emerald-300 bg-emerald-100 px-2.5 py-1.5 text-xs font-semibold text-emerald-600 shadow-sm">
                  Features
               </span>
               <h2 className="mx-auto max-w-3xl text-2xl font-semibold sm:text-3xl md:text-4xl md:leading-tight">
                  다른 구매대행 솔루션처럼 무작정 상품만 올린다고 좋은 결과가
                  나오지는 않습니다.
               </h2>
               <p className="mx-auto max-w-2xl text-zinc-600">
                  플로우머스는 운영 구조까지 함께 설계합니다.
               </p>
            </div>

            <div className="mt-10 grid grid-cols-1 gap-7 md:mt-14 md:grid-cols-2">
               {features.map((feature) => (
                  <div
                     key={feature.name}
                     className="flex flex-col justify-between rounded-lg border border-zinc-200 bg-zinc-50 p-6 shadow-sm md:min-h-80"
                  >
                     <div className="space-y-5">
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-100 shadow-sm ring-1 ring-emerald-300">
                           <feature.icon className="h-6 w-6 text-emerald-600" />
                        </div>
                        <h3 className="text-xl font-semibold">{feature.name}</h3>
                     </div>

                     <div className="mt-5 space-y-5">
                        <p className="text-sm leading-7 text-zinc-600">
                           {feature.description}
                        </p>
                        <ArrowLink href="/pricing" text="플랜 자세히 보기" />
                     </div>
                  </div>
               ))}
            </div>
         </Container>
      </section>
   );
}
