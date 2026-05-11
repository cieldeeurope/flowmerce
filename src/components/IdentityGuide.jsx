import Link from "next/link";
import Container from "./Container";

const points = [
   {
      title: "현지 사이트 기준 상품 수집",
      description: "국내보다 빠르게 상품 흐름을 확인하고 먼저 운영에 반영할 수 있습니다.",
   },
   {
      title: "품절·미입고 상품 대응",
      description: "국내에 없는 상품이나 이미 빠진 상품 흐름까지 함께 관리할 수 있습니다.",
   },
   {
      title: "마진 구조를 반영한 운영",
      description: "금액 구간별 마진, 환율, 거래처 할인율 기준을 실제 운영 방식에 맞춰 설정합니다.",
   },
   {
      title: "하이엔드 브랜드 확장",
      description: "명품 판매자에게 중요한 브랜드 폭과 운영 속도를 함께 고려합니다.",
   },
   {
      title: "설치형이 아닌 웹 운영",
      description: "운영 PC 환경이나 프로그램 설치 여부에 덜 묶이고, 브라우저에서 바로 이어집니다.",
   },
   {
      title: "셋업과 상담 지원",
      description: "호스팅 연결과 기본 흐름은 함께 안내하고, 필요한 경우 컨설팅까지 이어갈 수 있습니다.",
   },
];

export default function IdentityGuide() {
   return (
      <section className="pt-16 md:pt-28" id="guide">
         <Container>
            <div className="overflow-hidden rounded-md border border-black/5 bg-[#efe8dd] shadow-sm">
               <div className="grid gap-9 p-7 md:p-10 lg:grid-cols-[1fr_1fr] lg:items-center">
                  <div>
                     <span className="inline-flex rounded-full border border-white/80 bg-white/90 px-3 py-1 text-xs font-semibold text-amber-900 shadow-sm">
                        Why Flowmerce
                     </span>
                     <h2 className="mt-4 text-3xl font-semibold leading-tight md:text-4xl md:leading-tight">
                        명품 판매 운영에서
                        <br />
                        자주 놓치기 쉬운 기준까지 함께 봅니다
                     </h2>
                     <div className="mt-5 space-y-4 text-base leading-8 text-zinc-600">
                        <p className="font-semibold text-zinc-950">
                           플로우머스는 상품만 올리는 도구보다는, 실제 운영에서
                           자주 반복되는 관리 업무를 줄이는 쪽에 더 가깝습니다.
                        </p>
                        <p>
                           재고와 품절, 가격 변경, 카테고리 매핑, 마진 설정,
                           상품 문구 정리, 수집 예약처럼 판매자가 계속 손대게 되는
                           작업을 한 흐름으로 이어지게 만드는 것이 핵심입니다.
                        </p>
                        <p>
                           특히 명품 판매는 단순 수집보다 상품 흐름을 빠르게
                           확인하고, 품절과 가격 변동을 놓치지 않는 쪽이 운영
                           리스크를 줄이는 데 더 중요합니다.
                        </p>
                     </div>
                     <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
                        <Link
                           href="/guide"
                           className="inline-flex justify-center rounded-md bg-zinc-950 px-5 py-3 text-center text-sm font-semibold text-white transition hover:bg-zinc-800 sm:min-w-64"
                        >
                           운영 가이드 자세히 보기
                        </Link>
                        <Link
                           href="/consulting"
                           className="inline-flex justify-center rounded-md border border-zinc-300 bg-white px-5 py-3 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-50 sm:min-w-44"
                        >
                           컨설팅 알아보기
                        </Link>
                     </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                     {points.map((point) => (
                        <article
                           key={point.title}
                           className="rounded-md border border-white/80 bg-white/92 p-4 shadow-sm"
                        >
                           <p className="text-sm font-semibold leading-6 text-zinc-950">
                              {point.title}
                           </p>
                           <p className="mt-2 text-sm leading-6 text-zinc-600">
                              {point.description}
                           </p>
                        </article>
                     ))}
                  </div>
               </div>
            </div>
         </Container>
      </section>
   );
}
