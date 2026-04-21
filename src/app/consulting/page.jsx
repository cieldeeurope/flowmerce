import Container from "@/components/Container";
import Footer from "@/components/Footer";
import Header from "@/components/Header";

const kakaoUrl =
   "https://bizmessage.kakao.com/chat/zsV_ZBgjlxHvdZXDeswofgf8qH_smEtv_c_acLTkgmU/09Go7TlJhhqUwLFv_SaZWm7v9RvH_wUH9OrSPfz_gss";

export const metadata = {
   title: "컨설팅 - Flowmerce",
   description:
      "명품 판매 빅파워 경험을 바탕으로 구매대행 구조, 현지 거래처, 상세페이지, 플랫폼 운영 전략을 안내하는 일대일 컨설팅",
};

export default function ConsultingPage() {
   const topics = [
      {
         title: "플랫폼별 필수 운영 구조",
         description:
            "카페24, 고도몰, 스마트스토어, 메이크샵 등 판매 채널별로 꼭 잡아야 하는 셋팅과 운영 기준을 안내합니다.",
      },
      {
         title: "상세페이지 기획과 상품 전략",
         description:
            "명품 구매대행에서 고객이 신뢰하고 구매할 수 있는 상세페이지 구성과 상품 운영 방향을 함께 잡습니다.",
      },
      {
         title: "Only 현지 거래처 연결",
         description:
            "컨설턴트에게 수익이 떨어지는 구조가 아니라 고객에게 맞춘 현지 거래처 연결 구조를 안내합니다.",
      },
      {
         title: "사업자통관·개인통관 배송 흐름",
         description:
            "거래처에서 사업자통관 또는 개인통관으로 보내주는 배송 시스템과 운영 시 주의할 점을 설명합니다.",
      },
      {
         title: "국내 소싱 타이밍",
         description:
            "국내 백화점이나 국내 소싱이 필요한 시점, 브랜드별 특징과 운영 판단 기준도 함께 다룹니다.",
      },
      {
         title: "구매대행 중심 전략",
         description:
            "병행수입은 재고 부담, MOQ, 높은 초기 비용 리스크가 큽니다. 구매대행은 초기 재고 부담 없이 시작하고 자신 있을 때 선사입으로 확장할 수 있습니다.",
      },
   ];

   return (
      <>
         <Header />
         <main className="bg-white">
            <section className="bg-gradient-to-b from-emerald-50 via-white to-sky-50 py-16 md:py-24">
               <Container>
                  <div className="mx-auto max-w-4xl text-center">
                     <span className="inline-flex rounded-md border border-emerald-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-emerald-600 shadow-sm">
                        Consulting
                     </span>
                     <h1 className="mt-5 text-4xl font-semibold leading-tight sm:text-5xl">
                        실제 명품 판매로 빅파워까지
                        <br />
                        달성한 CEO가 직접 컨설팅합니다
                     </h1>
                     <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-zinc-600">
                        플로우머스 컨설팅은 단순한 사용법 안내가 아닙니다. 명품 구매대행으로
                        수익을 만들기 위한 플랫폼 구조, 현지 거래처, 배송 흐름, 상세페이지,
                        브랜드별 운영 전략까지 한 번에 이해할 수 있도록 진행합니다.
                     </p>
                     <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                        <a
                           href={kakaoUrl}
                           target="_blank"
                           rel="noopener noreferrer"
                           className="inline-flex rounded-lg border border-emerald-700 bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-sm duration-150 hover:bg-emerald-700"
                        >
                           컨설팅 신청하기
                        </a>
                        <p className="text-sm font-medium text-zinc-600">
                           VAT 포함 154만원
                        </p>
                     </div>
                  </div>
               </Container>
            </section>

            <section className="py-16 md:py-24">
               <Container>
                  <div className="grid gap-7 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
                     <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-7 shadow-sm">
                        <h2 className="text-3xl font-semibold">
                           병행수입보다 구매대행을 추천하는 이유
                        </h2>
                        <div className="mt-5 space-y-4 text-sm leading-7 text-zinc-600">
                           <p>
                              병행수입은 재고 부담과 MOQ, 높은 초기 주문금액 때문에 시작부터 리스크가 큽니다.
                           </p>
                           <p>
                              구매대행은 초기 재고 부담 없이 시작할 수 있고, 주문금액 조건도 없으며,
                              현지 거래처를 통한 현지 부가세 혜택까지 활용할 수 있습니다.
                           </p>
                           <p>
                              어느 정도 자신이 생겼을 때 선사입으로 확장하면 됩니다. 처음부터 무리하게 재고를 떠안는 구조보다 훨씬 현실적입니다.
                           </p>
                        </div>
                     </div>

                     <div className="grid gap-4 sm:grid-cols-2">
                        {topics.map((topic) => (
                           <article
                              key={topic.title}
                              className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm"
                           >
                              <h3 className="text-lg font-semibold">
                                 {topic.title}
                              </h3>
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
                  <div className="rounded-lg border border-zinc-200 bg-zinc-950 p-7 text-white shadow-sm md:p-10">
                     <div className="grid gap-8 lg:grid-cols-[1fr_0.8fr] lg:items-center">
                        <div>
                           <span className="text-sm font-semibold text-emerald-300">
                              1:1 Consulting
                           </span>
                           <h2 className="mt-3 text-3xl font-semibold">
                              한 번에 구조를 이해할 수 있도록 깊게 진행합니다
                           </h2>
                           <p className="mt-5 text-base leading-8 text-zinc-300">
                              24시간 상관없이 원하는 장소에서 만나 몇 시간이든, 어떤 질문이든
                              구매대행 구조를 완벽히 이해할 수 있도록 진행합니다. 154만원은
                              10년간의 시행착오를 압축해서 배우는 비용이며, 조금이라도 자리가 잡히면
                              한 달도 안 걸려 다시 회수할 수 있는 손익분기점을 목표로 합니다.
                           </p>
                           <p className="mt-4 text-base leading-8 text-zinc-300">
                              실제로 Pro 플랜 월 49만원은 제품 한두 개만 팔아도 회수할 수 있는 구조입니다.
                              초기 자본금도 크게 필요하지 않도록 현실적인 시작 방식을 안내합니다.
                           </p>
                        </div>
                        <div className="rounded-lg border border-white/10 bg-white/5 p-6">
                           <p className="text-sm text-zinc-300">컨설팅 비용</p>
                           <p className="mt-2 text-4xl font-semibold">154만원</p>
                           <p className="mt-2 text-sm text-zinc-400">VAT 포함</p>
                           <a
                              href={kakaoUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-7 inline-flex w-full justify-center rounded-lg border border-emerald-500 bg-emerald-500 px-5 py-3 text-sm font-semibold text-white shadow-sm duration-150 hover:bg-emerald-600"
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
