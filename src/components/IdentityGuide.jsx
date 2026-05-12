import Link from "next/link";
import Container from "./Container";

const points = [
   {
      title: "요청 주문 대응",
      description:
         "국내에 없는 상품이나 빠르게 확인해야 하는 요청 주문 흐름까지 운영 기준으로 이어갈 수 있습니다.",
   },
   {
      title: "품절 · 가격 변동 관리",
      description:
         "등록 이후에 더 중요한 품절과 가격 변경을 놓치지 않도록 재고관리 흐름까지 함께 설계했습니다.",
   },
   {
      title: "마진 구조 반영",
      description:
         "금액 구간별 마진, 수수료, 거래처 할인 기준까지 실제 운영 방식에 맞춰 세밀하게 설정할 수 있습니다.",
   },
   {
      title: "하이엔드 사이트 확장",
      description:
         "보안 레벨이 높은 브랜드 사이트와 확장 채널까지 고려해 명품 셀러 관점으로 흐름을 설계했습니다.",
   },
   {
      title: "설치 없는 운영 경험",
      description:
         "별도 프로그램 설치 대신 브라우저에서 바로 이어져, 운영 PC 환경 부담을 크게 줄여줍니다.",
   },
   {
      title: "운영 지원 포함",
      description:
         "정책 확인, 세팅 진행, 사이트 확정, 문의 동선까지 한 흐름으로 이어지는 운영형 서비스입니다.",
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
                        명품 셀러가 실제로 막히는 지점까지
                        <br />
                        운영 기준으로 설계했습니다
                     </h2>
                     <div className="mt-5 space-y-4 text-base leading-8 text-zinc-600">
                        <p className="font-semibold text-zinc-950">
                           플로우머스는 상품을 많이 긁어오는 도구보다, 운영자가 반복적으로
                           막히는 구간을 줄이는 쪽에 더 가깝습니다.
                        </p>
                        <p>
                           요청 주문 대응, 품절과 가격 변동 확인, 카테고리 매핑, 마진 설정,
                           문구 정리와 수집 예약처럼 명품 셀러가 계속 손대야 하는 작업을
                           하나의 운영 흐름으로 이어주는 것이 핵심입니다.
                        </p>
                        <p>
                           브랜드와 채널이 늘어날수록 중요한 것은 등록 속도보다 운영 누수
                           관리입니다. 그래서 플로우머스는 설치형 툴보다 브라우저 기반
                           스튜디오와 실제 운영 지원 경험에 집중합니다.
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
                           상담 문의하기
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
