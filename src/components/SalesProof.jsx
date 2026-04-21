import Image from "next/image";
import Link from "next/link";

export default function SalesProof() {
   const stats = [
      {
         label: "3개월 주문금액",
         value: "31,427,350원",
      },
      {
         label: "3개월 정산금액",
         value: "25,356,503원",
      },
      {
         label: "10% 마진 가정",
         value: "약 310만원",
      },
   ];

   return (
      <section className="py-16 md:py-24">
         <div className="mx-auto max-w-[1500px] px-4 sm:px-6 xl:px-8">
            <div className="rounded-lg border border-emerald-200 bg-white p-4 shadow-sm sm:p-6 md:p-8">
               <div className="mx-auto max-w-4xl text-center">
                  <span className="inline-flex rounded-md border border-emerald-300 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700">
                     실제 운영 성과
                  </span>
                  <h2 className="mt-4 text-3xl font-semibold leading-tight text-zinc-950 md:text-4xl md:leading-tight">
                     스마트스토어 하나만으로도 숫자는 증명됩니다
                  </h2>
                  <p className="mt-5 text-base leading-8 text-zinc-600">
                     말보다 결과가 먼저 보이도록, 솔루션을 이용하여 매출을 낸 운영 화면을 크게 보여드립니다.
                     <br />
                     3개월 동안 마케팅 없이 상품만 올려둔 스마트스토어 한 곳의
                     사례입니다.
                  </p>
               </div>

               <div className="mt-8 rounded-lg border border-zinc-200 bg-zinc-50 p-2 shadow-sm sm:p-3">
                  <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
                     <Image
                        src="/cases/sales-performance.png"
                        alt="스마트스토어 3개월 매출 성과"
                        width={1522}
                        height={768}
                        className="h-auto min-w-[1120px] w-full lg:min-w-0"
                        sizes="(min-width: 1536px) 1440px, (min-width: 1024px) 94vw, 1120px"
                     />
                  </div>
                  <p className="mt-4 px-1 text-xs leading-6 text-zinc-500">
                     실제 운영 화면 기준 사례이며, 매출과 마진은 상품 구성, 환율,
                     소싱처, 판매 채널에 따라 달라질 수 있습니다.
                  </p>
               </div>

               <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_0.9fr] lg:items-start">
                  <div className="space-y-4 text-base leading-8 text-zinc-600">
                     <p>
                        3개월 동안 마케팅 없이 스마트스토어 한 곳에 상품을 올려둔
                        실제 사례입니다. 주문금액은 31,427,350원, 정산금액은
                        25,356,503원까지 확인되었습니다.
                     </p>
                     <p>
                        주문금액의 10%만 마진으로 잡아도 약 310만원입니다. 한 달
                        기준으로 보면 최소 100만원 이상의 흐름이 만들어진 셈이고,
                        여기에 스토어와 노출 채널이 늘어나면 가능성은 더 커집니다.
                     </p>
                     <p>
                        명품은 구조가 단단할수록 유리합니다. 플로우머스는 한국
                        버전 사이트가 아니라 유럽 현지 사이트 기준으로 상품을
                        확보하고, 한국에 없거나 품절된 재고까지 판매 기회로
                        연결합니다.
                     </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                     {stats.map((stat) => (
                        <div
                           key={stat.label}
                           className="rounded-lg border border-zinc-200 bg-zinc-50 p-4"
                        >
                           <p className="text-xs font-semibold text-zinc-500">
                              {stat.label}
                           </p>
                           <p className="mt-2 text-xl font-semibold text-zinc-950">
                              {stat.value}
                           </p>
                        </div>
                     ))}
                  </div>
               </div>

               <div className="mt-8 rounded-lg border border-emerald-200 bg-emerald-50 p-5 text-sm leading-7 text-emerald-950">
                  <p>
                     간혹 고객이 귀한 제품을 요청하거나, 국내에서 구하지 못하는
                     상품을 웃돈을 주고서라도 구매하는 경우가 있습니다. 이런 요청
                     주문은 마진이 15%에서 30%까지 올라가는 사례도 있고, 하이엔드
                     제품 하나로 약 300만원의 마진이 남은 사례도 있습니다. 자세한
                     TIP 은{" "}
                     <Link
                        href="/guide"
                        className="font-semibold text-emerald-700 underline underline-offset-4"
                     >
                        핵심 가이드
                     </Link>
                     에서 확인할 수 있습니다.
                  </p>
               </div>

               <p className="mt-5 text-sm leading-7 text-zinc-500">
                  플로우머스가 제공하는 유럽 거래처 연결은 무료입니다.
                  <br />
                  제대로 된 구조 설계와 소싱 전략이 궁금하다면{" "}
                  <Link
                     href="/consulting"
                     className="font-semibold text-zinc-900 underline underline-offset-4"
                  >
                     컨설팅
                  </Link>
                  에서 더 깊게 안내받을 수 있습니다.
                  <br />
                  중고시장이나 가품 시장이 아니라 정식 소싱 구조로 성과를 만드는 것이 핵심입니다.
               </p>
            </div>
         </div>
      </section>
   );
}
