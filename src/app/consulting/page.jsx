import Container from "@/components/Container";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { createMetadata } from "@/lib/seo";

const kakaoUrl = "https://pf.kakao.com/_hPdjX/chat";

const topicCards = [
   {
      title: "플랫폼별 실전 운영 구조",
      description:
         "카페24, 고도몰, 스마트스토어, 메이크샵 등 판매 채널마다 실제로 어디를 어떻게 세팅하고 운영해야 하는지 흐름 중심으로 짚어드립니다.",
   },
   {
      title: "상세페이지 기획과 상품 방향",
      description:
         "명품 구매대행 상품에서 고객이 어떤 포인트를 보고 구매하는지, 어떤 구성이 전환에 유리한지까지 실제 운영 기준으로 설명합니다.",
   },
   {
      title: "직접 찾는 거래처 소싱 노하우",
      description:
         "중간 거래처에만 의존하는 구조가 아니라, 더 저렴한 물건을 직접 찾고 비교하는 방법과 소싱 판단 기준까지 함께 풀어드립니다.",
   },
   {
      title: "사업자통관·개인통관 흐름",
      description:
         "사업자통관과 개인통관이 각각 어떤 상황에 맞는지, 배송 흐름과 운영 시 주의할 점이 무엇인지 실무 기준으로 설명해드립니다.",
   },
   {
      title: "국내 판매 운영 전략",
      description:
         "국내 고객 응대, 상품 구성, 브랜드별 운영 감각, 가격 전략까지 실제 판매 관점에서 무엇을 우선해야 하는지 함께 정리합니다.",
   },
   {
      title: "구매대행 중심 확장 전략",
      description:
         "병행수입처럼 큰 초기 재고 부담 없이 시작하면서도, 추후 어떻게 구조를 넓혀갈 수 있는지 현실적인 확장 방향까지 안내합니다.",
   },
];

const benefitCards = [
   {
      title: "전문가의 1:1 케어",
      description:
         "막연한 방향 설명이 아니라, 현재 운영 상태에 맞춰 지금 무엇부터 손봐야 하는지 개인별로 맞춘 흐름을 잡아드립니다.",
   },
   {
      title: "모든 질문에 대한 실전 답변",
      description:
         "운영, 세팅, 소싱, 상품 구성, 가격, 마진, 세금, 통관, 상세페이지, 판매 전략까지 궁금한 내용을 한 번에 정리할 수 있습니다.",
   },
   {
      title: "사이트를 더 키우는 방법",
      description:
         "지금 상태에서 어디를 개선해야 더 커지는지, 상품 구성과 카테고리 운영, 전환 흐름까지 키우는 관점으로 같이 봐드립니다.",
   },
   {
      title: "마진·원가 계산 체계화",
      description:
         "대충 감으로 가격을 잡는 것이 아니라, 원가와 수수료, 배송, 통관 요소를 반영해 더 세밀하게 계산하는 기준을 알려드립니다.",
   },
   {
      title: "거래처 없이도 보는 눈 확장",
      description:
         "중간 거래처만 의지하지 않고 직접 더 저렴한 상품을 찾는 방식과, 무엇을 걸러야 하는지에 대한 판단 기준을 함께 드립니다.",
   },
   {
      title: "시행착오를 크게 줄이는 구조",
      description:
         "혼자 몇 달 걸려도 정리되지 않는 부분을 한 번에 구조화해서, 불필요한 테스트 비용과 시간 낭비를 줄이는 데 집중합니다.",
   },
];

const coachingItems = [
   "쇼핑몰을 더 키워 나가는 운영 방향과 우선순위 정리",
   "마진을 더 세밀하게 계산하는 방법과 가격 책정 기준",
   "원가 계산 방식과 수수료·배송비까지 반영하는 구조",
   "세금, 세무 처리에서 무엇을 챙겨야 하는지에 대한 실무 기준",
   "사업자통관·개인통관을 어떤 상황에서 어떻게 활용하는지",
   "거래처를 이용하지 않고 직접 저렴한 상품을 찾는 소싱 방법",
   "상세페이지, 상품 구성, 카테고리 운영을 더 잘하는 방법",
   "운영 중 생기는 거의 모든 질문에 대한 1:1 답변",
];

const comparisonRows = [
   [
      "상품 소싱",
      "거래처에 의존하거나 검색만 반복",
      "더 저렴한 소싱처를 찾는 기준과 비교 방식까지 정리",
   ],
   [
      "마진 계산",
      "대략적인 감으로 가격 책정",
      "원가, 수수료, 배송, 통관까지 포함한 계산 구조 확보",
   ],
   [
      "운영 우선순위",
      "무엇부터 손봐야 할지 계속 흔들림",
      "현재 단계에 맞는 우선순위와 성장 방향이 명확해짐",
   ],
   [
      "상세페이지·상품 구성",
      "좋아 보이는 기준으로만 작성",
      "실제 구매 흐름에 맞는 구성 포인트를 이해하고 반영",
   ],
   [
      "통관·세무 이해",
      "용어만 알고 실무 감각은 부족",
      "운영 관점에서 어떤 흐름으로 챙겨야 하는지 기준 확보",
   ],
   [
      "질문 해결 속도",
      "혼자 검색하고 시행착오 반복",
      "궁금한 부분을 바로 묻고 방향을 빠르게 정리",
   ],
];

export const metadata = createMetadata({
   title: "컨설팅",
   description:
      "명품 구매대행 구조, 거래처 소싱, 병행수입 대비 운영 전략, 마진 계산, 통관과 판매 흐름까지 1:1로 안내하는 플로우머스 컨설팅입니다.",
   path: "/consulting",
});

function SectionBadge({ children }) {
   return (
      <span className="inline-flex rounded-md border border-amber-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-amber-900 shadow-sm">
         {children}
      </span>
   );
}

export default function ConsultingPage() {
   return (
      <>
         <Header />
         <main className="bg-[#f7f4ef] text-zinc-950">
            <section className="bg-[linear-gradient(180deg,#f6efe4_0%,#fbf8f3_48%,#f7f4ef_100%)] py-16 md:py-24">
               <Container>
                  <div className="mx-auto max-w-5xl text-center">
                     <SectionBadge>Consulting</SectionBadge>
                     <h1 className="mt-5 text-4xl font-semibold leading-tight sm:text-5xl">
                        실제 명품 판매와 운영 경험을 가진
                        <br />
                        전문가가 1:1로 직접 케어합니다
                     </h1>
                     <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-zinc-600">
                        플로우머스 컨설팅은 단순한 프로그램 사용법 안내가 아닙니다. 명품
                        구매대행 구조, 거래처 소싱, 병행수입 대비 운영 전략, 상세페이지,
                        판매 방향, 마진 계산, 통관 흐름까지 한 번에 정리해드리는 실전형
                        컨설팅입니다.
                     </p>

                     <div className="mt-8 grid gap-4 md:grid-cols-3">
                        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
                           <p className="text-sm font-semibold text-zinc-500">컨설팅 비용</p>
                           <p className="mt-2 text-3xl font-semibold">154만원</p>
                           <p className="mt-2 text-sm text-zinc-500">VAT 포함</p>
                        </div>
                        <div className="rounded-2xl border border-amber-200 bg-[#fff8ec] p-5 shadow-sm">
                           <p className="text-sm font-semibold text-amber-900">컨설팅 혜택</p>
                           <p className="mt-2 text-3xl font-semibold text-zinc-950">플랜 6개월 15% 할인</p>
                           <p className="mt-2 text-sm text-zinc-600">
                              기본 5% 할인 대신, 컨설팅 진행 시 6개월 플랜 구독 할인 혜택을
                              15%까지 적용합니다.
                           </p>
                        </div>
                        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
                           <p className="text-sm font-semibold text-zinc-500">진행 방식</p>
                           <p className="mt-2 text-3xl font-semibold">1:1 케어</p>
                           <p className="mt-2 text-sm text-zinc-500">
                              현재 운영 단계에 맞춰 질문을 받고, 필요한 구조를 바로 정리해드립니다.
                           </p>
                        </div>
                     </div>

                     <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                        <a
                           href={kakaoUrl}
                           target="_blank"
                           rel="noopener noreferrer"
                           className="inline-flex rounded-lg border border-zinc-950 bg-zinc-950 px-6 py-3 text-sm font-semibold text-white shadow-sm duration-150 hover:bg-[#8c6333]"
                        >
                           컨설팅 신청하기
                        </a>
                        <p className="text-sm font-medium text-zinc-600">
                           운영 방향, 소싱, 마진, 통관, 세무 흐름까지 한 번에 정리
                        </p>
                     </div>
                  </div>
               </Container>
            </section>

            <section className="py-16 md:py-24">
               <Container>
                  <div className="grid gap-7 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
                     <div className="rounded-3xl border border-zinc-200 bg-zinc-50 p-7 shadow-sm">
                        <h2 className="text-3xl font-semibold">
                           병행수입보다 구매대행을 추천하는 이유
                        </h2>
                        <div className="mt-5 space-y-4 text-sm leading-7 text-zinc-600">
                           <p>
                              병행수입은 재고 부담과 MOQ, 초기 주문금액부터 시작 단계의 리스크가
                              크게 따라옵니다.
                           </p>
                           <p>
                              구매대행은 큰 초기 재고 없이 시작할 수 있고, 주문 구조가 안정되면
                              더 좋은 소싱처와 운영 방식으로 넓혀갈 수 있다는 점이 강점입니다.
                           </p>
                           <p>
                              처음부터 무리하게 재고를 안고 가는 구조보다, 작게 시작해 운영 감각과
                              판매 구조를 먼저 만드는 편이 훨씬 현실적입니다.
                           </p>
                        </div>
                     </div>

                     <div className="grid gap-4 sm:grid-cols-2">
                        {topicCards.map((topic) => (
                           <article
                              key={topic.title}
                              className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm"
                           >
                              <h3 className="text-lg font-semibold">{topic.title}</h3>
                              <p className="mt-3 text-sm leading-6 text-zinc-600">
                                 {topic.description}
                              </p>
                           </article>
                        ))}
                     </div>
                  </div>
               </Container>
            </section>

            <section className="pb-16 md:pb-24">
               <Container>
                  <div className="rounded-3xl border border-zinc-200 bg-white p-7 shadow-sm md:p-10">
                     <div className="max-w-3xl">
                        <SectionBadge>Benefit</SectionBadge>
                        <h2 className="mt-4 text-3xl font-semibold leading-tight md:text-4xl">
                           컨설팅을 통해 고객이 실제로 누리게 되는 혜택
                        </h2>
                        <p className="mt-4 text-base leading-8 text-zinc-600">
                           컨설팅은 설명을 듣는 시간이 아니라, 앞으로 몇 달을 더 빠르고 안정적으로
                           운영하기 위한 기준을 한 번에 잡는 시간입니다.
                        </p>
                     </div>

                     <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {benefitCards.map((item) => (
                           <article
                              key={item.title}
                              className="rounded-2xl border border-zinc-200 bg-[#faf7f2] p-5"
                           >
                              <h3 className="text-lg font-semibold text-zinc-950">{item.title}</h3>
                              <p className="mt-3 text-sm leading-7 text-zinc-600">
                                 {item.description}
                              </p>
                           </article>
                        ))}
                     </div>
                  </div>
               </Container>
            </section>

            <section className="pb-16 md:pb-24">
               <Container>
                  <div className="rounded-3xl border border-zinc-200 bg-[#efe8dd] p-7 shadow-sm md:p-10">
                     <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
                        <div>
                           <SectionBadge>1:1 Care</SectionBadge>
                           <h2 className="mt-4 text-3xl font-semibold leading-tight">
                              정말 궁금한 비법과 실무 포인트를
                              <br />
                              한 번에 풀어드립니다
                           </h2>
                           <p className="mt-4 text-base leading-8 text-zinc-600">
                              사이트를 더 키워 나가는 방법, 마진을 더 자세히 계산하는 방식,
                              원가 계산 구조, 세금과 세무 처리 흐름, 사업자통관과 개인통관,
                              거래처를 이용하지 않고 직접 저렴한 상품을 찾는 방법까지 실제
                              운영자가 궁금해하는 포인트를 하나씩 정리해드립니다.
                           </p>
                           <p className="mt-4 text-base leading-8 text-zinc-600">
                              혼자 운영하면 검색해도 애매했던 질문들, 누구에게 물어야 할지 몰랐던
                              부분들까지 이번 컨설팅에서 한 번에 방향을 잡을 수 있도록 돕는 것이
                              핵심입니다.
                           </p>
                        </div>

                        <div className="rounded-3xl border border-white/70 bg-white/85 p-6">
                           <p className="text-sm font-semibold text-amber-900">
                              컨설팅에서 다루는 핵심 질문
                           </p>
                           <ul className="mt-4 space-y-3 text-sm leading-7 text-zinc-700">
                              {coachingItems.map((item) => (
                                 <li key={item} className="flex gap-3">
                                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#8c6333]" />
                                    <span>{item}</span>
                                 </li>
                              ))}
                           </ul>
                        </div>
                     </div>
                  </div>
               </Container>
            </section>

            <section className="pb-16 md:pb-24">
               <Container>
                  <div className="rounded-3xl border border-zinc-200 bg-white p-7 shadow-sm md:p-10">
                     <div className="max-w-3xl text-center md:mx-auto">
                        <SectionBadge>Comparison</SectionBadge>
                        <h2 className="mt-4 text-3xl font-semibold leading-tight md:text-4xl">
                           혼자 운영하는 사람과
                           <br />
                           컨설팅 후 체계적으로 운영하는 사람의 차이
                        </h2>
                        <p className="mt-4 text-base leading-8 text-zinc-600">
                           같은 시간을 써도 방향이 다르면 결과가 달라집니다. 컨설팅은 이 차이를
                           줄이는 것이 아니라, 처음부터 크게 벌리는 데 목적이 있습니다.
                        </p>
                     </div>

                     <div className="mx-auto mt-8 max-w-[980px]">
                        <div className="hidden items-center gap-3 px-3 md:grid md:grid-cols-[0.82fr_0.9fr_1.05fr]">
                           <div className="rounded-full border border-black/5 bg-[#f6efe3] px-4 py-3 text-center text-sm font-semibold text-zinc-800 shadow-sm">
                              항목
                           </div>
                           <div className="rounded-full border border-black/5 bg-[#f6efe3] px-4 py-3 text-center text-sm font-semibold text-zinc-800 shadow-sm">
                              혼자 운영
                           </div>
                           <div className="rounded-[24px] bg-[#1c1917] px-4 py-4 text-center text-sm font-semibold text-white shadow-[0_20px_50px_-28px_rgba(28,25,23,0.95)] ring-1 ring-[#8c6333]/30">
                              컨설팅 후 체계적 운영
                           </div>
                        </div>

                        <div className="mt-4 space-y-3">
                           {comparisonRows.map(([label, solo, coached]) => (
                              <article
                                 key={label}
                                 className="rounded-[28px] border border-black/5 bg-[#f8f4ed] p-3 shadow-[0_18px_40px_-32px_rgba(28,25,23,0.35)]"
                              >
                                 <div className="grid gap-3 md:grid-cols-[0.82fr_0.9fr_1.05fr] md:items-stretch">
                                    <div className="rounded-[20px] bg-white px-4 py-4 text-center font-semibold text-zinc-950 shadow-sm ring-1 ring-black/5">
                                       <span className="mb-2 inline-flex rounded-full border border-black/10 bg-zinc-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-600 md:hidden">
                                          항목
                                       </span>
                                       <p>{label}</p>
                                    </div>
                                    <div className="rounded-[20px] bg-white/90 px-4 py-4 text-center leading-6 text-zinc-600 shadow-sm ring-1 ring-black/5">
                                       <span className="mb-2 inline-flex rounded-full border border-black/10 bg-zinc-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-600 md:hidden">
                                          혼자 운영
                                       </span>
                                       <p>{solo}</p>
                                    </div>
                                    <div className="rounded-[24px] bg-[#fffaf2] px-5 py-4 text-center font-medium leading-6 text-zinc-900 shadow-[0_20px_45px_-30px_rgba(140,99,51,0.75)] ring-1 ring-[#d4b38b]/70">
                                       <span className="mb-2 inline-flex rounded-full border border-[#8c6333]/15 bg-[#8c6333]/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8c6333] md:hidden">
                                          컨설팅 후
                                       </span>
                                       <p>{coached}</p>
                                    </div>
                                 </div>
                              </article>
                           ))}
                        </div>
                     </div>
                  </div>
               </Container>
            </section>

            <section className="pb-16 md:pb-24">
               <Container>
                  <div className="rounded-3xl border border-zinc-200 bg-zinc-950 p-7 text-white shadow-sm md:p-10">
                     <div className="grid gap-8 lg:grid-cols-[1fr_0.8fr] lg:items-center">
                        <div>
                           <span className="text-sm font-semibold text-[#f1deba]">
                              1:1 Consulting
                           </span>
                           <h2 className="mt-3 text-3xl font-semibold leading-tight">
                              한 번에 구조를 이해하고,
                              <br />
                              운영 방향을 더 빠르게 정리하세요
                           </h2>
                           <p className="mt-5 text-base leading-8 text-zinc-300">
                              몇 달 동안 시행착오하며 배우는 과정을 한 번에 압축해서 정리하는 것이
                              플로우머스 컨설팅의 핵심입니다. 내가 지금 무엇을 잘못 보고 있는지,
                              어디서 돈이 새고 있는지, 어떤 구조로 키워야 하는지까지 1:1로
                              케어합니다.
                           </p>
                           <p className="mt-4 text-base leading-8 text-zinc-300">
                              단순히 설명만 듣고 끝나는 자리가 아니라, 이후 실제 운영에 바로 적용할
                              수 있는 기준과 감각을 가져가실 수 있도록 진행합니다.
                           </p>
                        </div>

                        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
                           <p className="text-sm text-zinc-300">컨설팅 비용</p>
                           <p className="mt-2 text-4xl font-semibold">154만원</p>
                           <p className="mt-2 text-sm text-zinc-400">VAT 포함</p>
                           <div className="mt-5 rounded-2xl border border-[#8c6333]/40 bg-[#8c6333]/10 p-4">
                              <p className="text-sm font-semibold text-[#f1deba]">
                                 컨설팅 진행 고객 전용 혜택
                              </p>
                              <p className="mt-2 text-xl font-semibold">6개월 구독 15% 할인</p>
                              <p className="mt-2 text-sm leading-6 text-zinc-300">
                                 일반 6개월 구독 할인 5%보다 더 크게 적용되는 컨설팅 전용 혜택입니다.
                              </p>
                           </div>
                           <a
                              href={kakaoUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-7 inline-flex w-full justify-center rounded-lg border border-[#8c6333] bg-[#8c6333] px-5 py-3 text-sm font-semibold text-white shadow-sm duration-150 hover:bg-[#6b5736]"
                           >
                              컨설팅 신청하기
                           </a>
                        </div>
                     </div>
                  </div>
               </Container>
            </section>
         </main>
         <Footer />
      </>
   );
}
