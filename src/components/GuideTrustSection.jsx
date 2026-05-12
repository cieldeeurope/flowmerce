const guideTrustCards = [
   {
      title: "실제 주문과 정산 구조",
      description:
         "단순 홍보 문구가 아니라, 실제 요청 주문과 정산 예시를 통해 어떤 방식으로 수익이 연결되는지 확인할 수 있습니다.",
   },
   {
      title: "국내 · 해외 소싱 흐름",
      description:
         "유럽 거래처, 국내 매장, 하이엔드 사이트까지 상황에 따라 어떤 소싱 경로를 타는지 운영 관점에서 정리해두었습니다.",
   },
   {
      title: "운영 기준과 지원 동선",
      description:
         "세팅 방식, 사이트 확정, 카카오톡 온보딩, 구독 종료 후 데이터 기준까지 한 흐름으로 이해할 수 있습니다.",
   },
];

export default function GuideTrustSection() {
   return (
      <section className="py-12 md:py-16">
         <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm md:p-8">
            <div className="max-w-3xl">
               <span className="inline-flex rounded-md border border-amber-200 bg-[#fbf7ef] px-2.5 py-1.5 text-xs font-semibold text-amber-900 shadow-sm">
                  Guide Focus
               </span>
               <h2 className="mt-4 text-2xl font-semibold leading-tight text-zinc-950 md:text-3xl">
                  이 가이드는 단순 소개보다
                  <br />
                  실제 운영 판단에 도움이 되도록 구성했습니다
               </h2>
               <p className="mt-4 text-base leading-8 text-zinc-600">
                  플로우머스는 예쁜 랜딩만 보여주기보다, 실제 명품 셀러가 도입 전에
                  궁금해하는 주문 구조, 정산 흐름, 소싱 방식, 운영 기준까지 같이
                  확인할 수 있어야 한다고 봤습니다.
               </p>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
               {guideTrustCards.map((card) => (
                  <article
                     key={card.title}
                     className="rounded-lg border border-zinc-200 bg-zinc-50 p-5"
                  >
                     <p className="text-lg font-semibold text-zinc-950">{card.title}</p>
                     <p className="mt-3 text-sm leading-7 text-zinc-600">
                        {card.description}
                     </p>
                  </article>
               ))}
            </div>
         </div>
      </section>
   );
}
