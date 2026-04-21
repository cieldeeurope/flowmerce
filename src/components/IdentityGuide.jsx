import Link from "next/link";
import Container from "./Container";


export default function IdentityGuide() {
   const points = [
      {
         title: "현지 사이트 기준 상품 수집",
         description: "국내보다 빠르게, 더 많은 상품을 먼저 선점합니다.",
      },
      {
         title: "국내 미입고·품절 상품까지 소싱",
         description: "경쟁이 적은 상품으로 판매 기회를 넓힙니다.",
      },
      {
         title: "고환율 환경에서도 검증된 마진 구조",
         description: "실제 운영 기준으로 충분한 수익 사례를 확보했습니다.",
      },
      {
         title: "하이엔드 브랜드까지 소싱 가능",
         description: "거래처 연결부터 배송 흐름까지 한 번에 처리합니다.",
      },
      {
         title: "국내 백화점에서 기분 좋은 경험",
         description:
            "원하는 제품이 국내에 있다면 국내 소싱으로도 마진을 확보할 수 있습니다.",
      },
      {
         title: "전업과 부업의 선택 및 전환 가능",
         description:
            "부업으로 시작해 본업을 뛰어넘는 수익 구조까지 기대할 수 있습니다.",
      },
   ];

   return (
      <section className="pt-16 md:pt-28" id="guide">
         <Container>
            <div className="overflow-hidden rounded-lg border border-emerald-200 bg-gradient-to-br from-white via-emerald-50 to-sky-50 shadow-sm">
               <div className="grid gap-9 p-7 md:p-10 lg:grid-cols-[1fr_1fr] lg:items-center">
                  <div>
                     <span className="inline-flex rounded-md border border-emerald-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-emerald-600 shadow-sm">
                        지나치지 마시고 꼭 읽어보세요
                     </span>
                     <h2 className="mt-4 text-3xl font-semibold leading-tight md:text-4xl md:leading-tight">
                        왜 플로우머스를 <br /> 선택해야만 하는가?
                     </h2>
                     <div className="mt-5 space-y-4 text-base leading-8 text-zinc-600">
                        <p>
                           플로우머스는 상품만 올리는 단순 툴을 판매하는게 아닙니다.
                        </p>
                        <p>
                           국내에 없는 상품, 이미 품절된 상품을 현지 사이트 기준으로 먼저 확보하고 가격 차이를 이용해 마진을 만들어내는 구매대행 자동화 시스템입니다.
                        </p>
                        <p>
                           10년간 명품 시장과 쇼핑몰을 운영하며 직접 검증한 수익 구조를 자동화 흐름에 담았습니다.
                        </p>
                        <p>
                           플로우머스는 툴만 제공하지 않습니다. 현지 거래처, 실전 전략, 일대일 컨설팅까지 실제로 돈이 되는 구조를 함께 제공합니다.
                        </p>
                     </div>
                     <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
                        <Link
                           href="/guide"
                           className="inline-flex justify-center rounded-lg border border-emerald-700 bg-emerald-600 px-5 py-3 text-center text-sm font-semibold text-white shadow-sm duration-150 hover:bg-emerald-700 sm:min-w-72"
                        >
                           꼭 읽어야 하는 플로우머스의 핵심 가이드
                        </Link>
                        <Link
                           href="/consulting"
                           className="inline-flex justify-center rounded-lg border border-zinc-300 bg-white px-5 py-3 text-sm font-semibold text-zinc-800 shadow-sm duration-150 hover:bg-zinc-50 sm:min-w-48"
                        >
                           일대일 컨설팅 알아보기
                        </Link>
                     </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                     {points.map((point) => (
                        <div
                           key={point.title}
                           className="rounded-lg border border-white bg-white/90 p-4 shadow-sm"
                        >
                           <p className="text-sm font-semibold leading-6 text-zinc-950">
                              {point.title}
                           </p>
                           <p className="mt-2 text-sm leading-6 text-zinc-600">
                              {point.description}
                           </p>
                        </div>
                     ))}
                  </div>
               </div>
            </div>
         </Container>
      </section>
   );
}
