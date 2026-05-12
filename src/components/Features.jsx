import Link from "next/link";
import Container from "./Container";
import FeaturesComparisonSection from "./FeaturesComparisonSection";

const workflow = [
   {
      index: "01",
      title: "고급 우회 기술 기반 상품 수집",
      description:
         "브랜드 사이트마다 다른 보안 강도와 구조를 고려해 수집 흐름을 설계합니다. 단순 복사 방식이 아니라 실제 운영에 버틸 수 있는 안정성을 먼저 봅니다.",
   },
   {
      index: "02",
      title: "자동 재고·품절·가격 관리",
      description:
         "재고관리 요청 한 번으로 기존 상품 업데이트, 새 상품 추가, 품절 상품 숨김 처리까지 이어집니다. 품절 취소와 CS 부담을 줄이는 데 가장 체감이 큰 구간입니다.",
   },
   {
      index: "03",
      title: "브라우저에서 바로 쓰는 운영 대시보드",
      description:
         "호스팅 연결, 쇼핑몰 카테고리 조회, 매핑, 마진 설정, 단어 치환, 수집 예약까지 웹에서 처리할 수 있어 설치형 프로그램 의존도를 크게 줄입니다.",
   },
   {
      index: "04",
      title: "실시간 상품 업데이트",
      description:
         "방문자가 상품 페이지에 접속하면 보고 있는 제품 기준으로 가격과 재고를 다시 확인해 최신 상태로 반영합니다. 품절 취소와 가격 문의 CS를 줄이는 데 유리합니다.",
   },
];

const dashboardPanels = [
   {
      title: "상품수집 탭",
      items: [
         "브랜드 선택과 사이트별 카테고리 조회",
         "쇼핑몰 카테고리 연결과 매핑 저장",
         "매핑한 카테고리 확인과 수집 예약",
      ],
   },
   {
      title: "마진 탭",
      items: [
         "금액 구간별 마진 저장",
         "환율과 거래처 할인율 반영",
         "계정별 운영 방식에 맞춘 별도 기준 관리",
      ],
   },
   {
      title: "치환 탭",
      items: [
         "반복 단어 정리",
         "상품명과 문구 스타일 통일",
         "운영 계정별 치환 규칙 저장",
      ],
   },
];

const directUsePoints = [
   "로그인된 계정 기준으로 구독한 사이트만 보여서 처음 들어와도 헤매지 않습니다.",
   "선택한 호스팅 계정 기준으로 매핑, 마진, 치환을 바로 바꿔가며 사용할 수 있습니다.",
   "수집 예약 결과도 성공, 중복, 실패 흐름으로 바로 확인할 수 있습니다.",
   "설치 없이 로그인만 하면 같은 화면에서 이어집니다.",
   "웹 대시보드 하나에서 매핑부터 수집 요청까지 끊기지 않게 이어집니다.",
];

const comparisonRows = [
   ["프로그램 설치", "설치 셋팅 없이 바로 사용", "압축 프로그램 다운 및 셋팅"],
   ["자동 재고관리", "수집 흐름과 함께 자동화", "직접 확인하거나 별도 요청 필요"],
   ["실시간 상품 업데이트", "방문 상품 기준으로 가격·재고 재확인", "지원 안함"],
   ["상품 매핑 방식", "카테고리 클릭 중심으로 바로 매핑", "항목별 수동 확인이 많은 편"],
   ["상세페이지 구성", "AI 기반으로 상품 특성에 맞춰 조정", "모든 고객이 동일한 구성"],
   ["SEO 고려", "상품명·치환·구조까지 함께 고려", "SEO 고려 X"],
   ["호스팅 계정 전환", "계정 선택 후 즉시 전환", "수동 입력 또는 재실행"],
   ["문의 대응", "카카오톡 24시간 접수와 유선 상담 연계", "이메일 또는 제한된 영업 시간"],
];

export default function Features() {
   return (
      <section className="pt-16 md:pt-28" id="features">
         <Container>
            <div className="space-y-4 sm:text-center">
               <span className="inline-flex rounded-full border border-amber-200 bg-[#fbf7ef] px-3 py-1 text-xs font-semibold text-amber-900">
                  Core Workflow
               </span>
               <h2 className="mx-auto max-w-3xl text-2xl font-semibold sm:text-3xl md:text-4xl md:leading-tight">
                  상품만 올리는 자동화보다,
                  <br />
                  운영 흐름이 끊기지 않는 쪽이 더 중요합니다
               </h2>
               <p className="mx-auto max-w-3xl text-zinc-600">
                  플로우머스는 신상품 등록, 재고·품절·가격 반영, 마진 설정,
                  단어 치환, 카테고리 매핑, 수집 예약을 한 흐름으로 묶어 실제
                  운영에서 자주 손이 가는 부분을 줄이는 데 초점을 둡니다.
               </p>
            </div>

            <div className="mt-10 grid gap-5 md:mt-14 md:grid-cols-2 xl:grid-cols-4">
               {workflow.map((feature) => (
                  <article
                     key={feature.title}
                     className="rounded-md border border-black/5 bg-white p-6 shadow-sm transition duration-200 hover:-translate-y-0.5"
                  >
                     <p className="text-sm font-semibold text-amber-800">
                        {feature.index}
                     </p>
                     <h3 className="mt-4 text-xl font-semibold text-zinc-950">
                        {feature.title}
                     </h3>
                     <p className="mt-3 text-sm leading-7 text-zinc-600">
                        {feature.description}
                     </p>
                  </article>
               ))}
            </div>

            <div className="mt-10 space-y-8 md:mt-14">
               <section className="rounded-md border border-black/5 bg-[#efe8dd] p-6 shadow-sm md:p-8">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                     <div className="max-w-2xl">
                        <p className="text-sm font-semibold text-amber-900">
                           Flowmerce Dashboard
                        </p>
                        <h3 className="mt-2 text-2xl font-semibold leading-tight text-zinc-950 md:text-3xl">
                           고객이 직접 써도
                           <br />
                           한눈에 알기 쉽게 설계했습니다.
                        </h3>
                        <p className="mt-4 text-sm leading-7 text-zinc-600">
                           관리자만 쓰는 백오피스가 아니라, 실제 고객이 로그인해서
                           호스팅 계정을 고르고 카테고리를 매핑하고 수집 요청까지
                           넣을 수 있도록 설계했습니다. 한 화면에서 지금 뭘
                           해야 하는지 읽히는 구조가 핵심입니다.
                        </p>
                     </div>
                     <Link
                        href="/program"
                        className="inline-flex h-11 items-center justify-center rounded-md border border-zinc-300 bg-white px-5 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-50"
                     >
                        사용 메뉴얼 보기
                     </Link>
                  </div>

                  <div className="mt-6 flex flex-wrap gap-2">
                     <span className="rounded-full border border-black/10 bg-white/75 px-3 py-1.5 text-xs font-semibold text-zinc-700">
                        로그인 기반 계정 분기
                     </span>
                     <span className="rounded-full border border-black/10 bg-white/75 px-3 py-1.5 text-xs font-semibold text-zinc-700">
                        호스팅 계정별 전환
                     </span>
                     <span className="rounded-full border border-black/10 bg-white/75 px-3 py-1.5 text-xs font-semibold text-zinc-700">
                        탭형 상품수집 · 마진 · 치환
                     </span>
                     <span className="rounded-full border border-black/10 bg-white/75 px-3 py-1.5 text-xs font-semibold text-zinc-700">
                        웹에서 바로 수집 예약
                     </span>
                  </div>

                  <div className="mt-6 grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
                     <div className="rounded-md border border-white/80 bg-white/85 p-5">
                        <h4 className="text-base font-semibold text-zinc-950">
                           직접 사용할 때 체감되는 포인트
                        </h4>
                        <ul className="mt-4 space-y-3 text-sm leading-6 text-zinc-600">
                           {directUsePoints.map((item) => (
                              <li key={item} className="flex gap-3">
                                 <span className="mt-1.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#8c6333] text-[11px] font-bold text-white">
                                    ✓
                                 </span>
                                 <span>{item}</span>
                              </li>
                           ))}
                        </ul>
                     </div>

                     <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-1">
                        {dashboardPanels.map((panel) => (
                           <article
                              key={panel.title}
                              className="rounded-md border border-white/80 bg-white/95 p-5 shadow-sm"
                           >
                              <h4 className="text-base font-semibold text-zinc-950">
                                 {panel.title}
                              </h4>
                              <ul className="mt-3 space-y-2.5 text-sm leading-6 text-zinc-600">
                                 {panel.items.map((item) => (
                                    <li key={item} className="flex gap-2">
                                       <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[#8c6333]" />
                                       <span>{item}</span>
                                    </li>
                                 ))}
                              </ul>
                           </article>
                        ))}
                     </div>
                  </div>
               </section>

               <FeaturesComparisonSection rows={comparisonRows} />
            </div>
         </Container>
      </section>
   );
}
