import Image from "next/image";
import Link from "next/link";
import Container from "@/components/Container";
import Footer from "@/components/Footer";
import Header from "@/components/Header";

export const metadata = {
   title: "핵심 가이드 - Flowmerce",
   description:
      "현지 명품 사이트 소싱, 구매대행 마진 구조, SEO 상품 등록 자동화가 왜 중요한지 실제 사례로 설명하는 플로우머스 핵심 가이드",
};

export default function GuidePage() {
   const heroStats = [
      {
         label: "정산금액",
         value: "21,459,909원",
         detail: "3개 제품 요청 주문",
      },
      {
         label: "사례 마진",
         value: "3,116,919원",
         detail: "원가, 부가세, 수수료 반영",
      },
      {
         label: "주문 방식",
         value: "고객 요청",
         detail: "국내 품절 상품을 소싱",
      },
   ];

   const requestImages = [
      {
         src: "/cases/npay-knit.png",
         alt: "니트 L 수입 신고 사례",
         title: "니트 L 요청 주문",
         description: "고객 요청 후 유럽 거래처를 통해 찾은 상품입니다.",
      },
      {
         src: "/cases/npay-cardigan.png",
         alt: "가디건 XL 수입 신고 사례",
         title: "가디건 XL 요청 주문",
         description: "국내 재고가 없어 정식 수입신고로 진행한 사례입니다.",
      },
      {
         src: "/cases/npay-tweed.png",
         alt: "트위드 재킷 인보이스 사례",
         title: "트위드 재킷 요청 주문",
         description: "고가 제품 하나만으로 큰 마진이 발생한 흐름입니다.",
      },
   ];

   const requestRows = [
      {
         item: "니트 L + 가디건 XL",
         order: "6,270,000원",
         cost: "5,655,414원",
         margin: "490,440원",
         detail: "1,400유로 + 1,800유로, 거래처 6% 할인 기준",
      },
      {
         item: "트위드 재킷",
         order: "15,600,000원",
         cost: "12,677,121원",
         margin: "2,626,479원",
         detail: "6,716유로, 환율 1,716원, 부가세 10% 포함",
      },
      {
         item: "합계",
         order: "21,870,000원",
         cost: "18,332,535원",
         margin: "3,116,919원",
         detail: "정산 수수료는 결제수단에 따라 부분적으로 달라질 수 있습니다",
      },
   ];

   const domesticImages = [
      {
         src: "/cases/balenciaga-store.png",
         alt: "국내 매장 구매 영수증 사례",
         title: "국내 매장 소싱",
         wide: true,
      },
      {
         src: "/cases/godomall-order.png",
         alt: "고도몰 주문 상세 사례",
         title: "요청 주문 확인",
      },
      {
         src: "/cases/godomall-settlement.png",
         alt: "고도몰 정산 사례",
         title: "정산 내역 확인",
      },
   ];

   const domesticRows = [
      {
         label: "요청 상품",
         value: "Balen*** 브랜드 제품",
         note: "한국 매장에 재고가 없어 고객이 직접 요청한 사례",
      },
      {
         label: "소싱 흐름",
         value: "국내 매장 예약 후 구매",
         note: "유럽 재고를 확인한 뒤 국내 셀러를 통해 재고 확보 후 더 좋은 조건을 찾았습니다",
      },
      {
         label: "실제 구매가",
         value: "2,773,495원",
         note: "매장 가격에 할인 혜택이 반영된 사례",
      },
      {
         label: "수수료 차감 후 마진",
         value: "1,137,025원",
         note: "단일 요청 주문으로 만든 추가 마진",
      },
   ];

   const guideCards = [
      {
         title: "현지 사이트 버전으로 보는 상품 기회",
         description:
            "한국 공식몰에는 없거나 이미 품절된 상품도 유럽 현지 사이트에는 남아 있는 경우가 많습니다. 플로우머스는 이 차이를 판매 기회로 보고 자동화합니다.",
      },
      {
         title: "SEO를 반영한 상품 등록",
         description:
            "같은 상품명과 같은 상세 내용을 반복 등록하면 경쟁력이 약해집니다. 플로우머스는 상품명과 상세페이지를 SEO 관점으로 다듬어 노출 가능성을 높입니다.",
      },
      {
         title: "하이엔드 사이트까지 소싱 가능",
         description:
            "일부 고보안 공식 사이트는 단순한 수집보다 접근 난이도와 운영 안정성이 중요합니다. 플로우머스는 수집 안정성과 보안 레벨까지 고려해 사이트를 분류합니다.",
      },
      {
         title: "배송대행지 없이 더 단순한 운영",
         description:
            "복잡하고 어려운 배송대행지를 거치지 않고 현지 거래처가 FEDEX, DHL, UPS로 직접 배송하는 흐름을 안내합니다.",
      },
   ];

   return (
      <>
         <Header />
         <main className="bg-white">
            <section className="bg-[linear-gradient(180deg,#ecfdf5_0%,#ffffff_48%,#f0f9ff_100%)] py-14 md:py-20">
               <div className="mx-auto max-w-[1500px] px-4 sm:px-6 xl:px-8">
                  <div className="mx-auto max-w-4xl text-center">
                     <span className="inline-flex rounded-md border border-emerald-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-emerald-700 shadow-sm">
                        핵심 가이드
                     </span>
                     <h1 className="mt-5 text-4xl font-semibold leading-tight text-zinc-950 sm:text-5xl">
                        플로우머스 최적화 구매대행 솔루션은
                        <br />
                        실제 운영 사례로 봐야 합니다
                     </h1>
                     <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-zinc-600">
                        플로우머스는 상품만 많이 올리는 툴이 아니라, 국내에서 구하기
                        어려운 상품을 현지 소싱과 SEO 등록으로 판매 기회까지 연결하는
                        구조입니다. 아래 실제 사례를 먼저 확인해보세요.
                     </p>
                     <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                        <Link
                           href="/pricing"
                           className="inline-flex justify-center rounded-lg border border-emerald-700 bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-sm duration-150 hover:bg-emerald-700"
                        >
                           플랜별 구독하기
                        </Link>
                        <Link
                           href="/consulting"
                           className="inline-flex justify-center rounded-lg border border-zinc-300 bg-white px-5 py-3 text-sm font-semibold text-zinc-800 shadow-sm duration-150 hover:bg-zinc-50"
                        >
                           일대일 컨설팅 신청
                        </Link>
                     </div>
                  </div>

                  <div className="mt-10 rounded-lg border border-zinc-200 bg-white p-2 shadow-sm sm:p-3">
                     <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
                        <Image
                           src="/cases/npay-summary.png"
                           alt="N페이 정산 요약 사례"
                           width={1805}
                           height={414}
                           priority
                           className="h-auto min-w-[1080px] w-full lg:min-w-0"
                           sizes="(min-width: 1536px) 1440px, (min-width: 1024px) 94vw, 1080px"
                        />
                     </div>
                  </div>

                  <div className="mt-5 grid gap-3 md:grid-cols-3">
                     {heroStats.map((stat) => (
                        <div
                           key={stat.label}
                           className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm"
                        >
                           <p className="text-xs font-semibold text-zinc-500">
                              {stat.label}
                           </p>
                           <p className="mt-2 text-2xl font-semibold text-zinc-950">
                              {stat.value}
                           </p>
                           <p className="mt-2 text-sm leading-6 text-zinc-600">
                              {stat.detail}
                           </p>
                        </div>
                     ))}
                  </div>
               </div>
            </section>

            <section className="py-16 md:py-24">
               <Container>
                  <div className="max-w-4xl">
                     <span className="inline-flex rounded-md border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-xs font-semibold text-zinc-700">
                        한 달 월급 하루만에 벌기
                     </span>
                     <h2 className="mt-4 text-3xl font-semibold leading-tight md:text-4xl md:leading-tight">
                        국내에 없는 제품으로 한 번에 큰 매출을 만들어 냅니다.
                     </h2>
                     <div className="mt-5 space-y-4 text-base leading-8 text-zinc-600">
                        <p>
                           아래 주문은 고객님이 국내에서 구하지 못한 상품을 직접 요청한
                           사례입니다. 유럽 거래처에 채팅만으로 재고와 구매 가능 여부를
                           확인했고, 정식 수입신고를 거쳐 상품을 가져왔습니다.
                        </p>
                        <p>
                           주문건 2개의 정산금액은 21,459,909원입니다. 상품을 무작정 많이
                           올리는 것보다, 희소 상품을 구할 수 있는 구조가 만들어지면
                           요청 주문만으로도 핸드폰 하나로 하루에 월급 이상의 마진이 생길 수 있습니다.
                        </p>
                     </div>
                  </div>

                  <div className="mt-10 grid gap-5 lg:grid-cols-3">
                     {requestImages.map((image) => (
                        <article
                           key={image.title}
                           className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 shadow-sm"
                        >
                           <div className="flex h-[520px] items-center justify-center overflow-hidden rounded-lg border border-zinc-200 bg-white">
                              <Image
                                 src={image.src}
                                 alt={image.alt}
                                 width={760}
                                 height={760}
                                 className="h-full w-full object-contain"
                                 sizes="(min-width: 1024px) 31vw, 100vw"
                              />
                           </div>
                           <div className="p-2 pt-4">
                              <p className="text-lg font-semibold text-zinc-950">
                                 {image.title}
                              </p>
                              <p className="mt-2 text-sm leading-6 text-zinc-600">
                                 {image.description}
                              </p>
                           </div>
                        </article>
                     ))}
                  </div>

                  <div className="mt-10 overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
                     <div className="grid gap-4 border-b border-zinc-200 bg-zinc-50 px-5 py-5 md:grid-cols-[0.8fr_1.2fr] md:items-center">
                        <h3 className="text-2xl font-semibold text-zinc-950">
                           요청 주문 마진 구조
                        </h3>
                        <p className="text-sm leading-6 text-zinc-600">
                           실제 원가, 환율, 부가세, 정산 수수료를 함께 보면 명품 구매대행의
                           강점이 더 선명하게 보입니다. 네이버 정산 수수료는 약 1.98%
                           수준이며, 결제수단에 따라 항목별 수수료가 달라질 수 있습니다.
                        </p>
                     </div>
                     <div className="overflow-x-auto">
                        <table className="w-full min-w-[760px] text-left text-sm">
                           <thead className="bg-white text-zinc-500">
                              <tr>
                                 <th className="px-5 py-4 font-semibold">구분</th>
                                 <th className="px-5 py-4 font-semibold">판매금액</th>
                                 <th className="px-5 py-4 font-semibold">매입/세금 기준</th>
                                 <th className="px-5 py-4 font-semibold">마진</th>
                                 <th className="px-5 py-4 font-semibold">메모</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-zinc-100">
                              {requestRows.map((row) => (
                                 <tr key={row.item}>
                                    <td className="px-5 py-4 font-semibold text-zinc-950">
                                       {row.item}
                                    </td>
                                    <td className="px-5 py-4 text-zinc-700">{row.order}</td>
                                    <td className="px-5 py-4 text-zinc-700">{row.cost}</td>
                                    <td className="px-5 py-4 font-semibold text-emerald-700">
                                       {row.margin}
                                    </td>
                                    <td className="px-5 py-4 text-zinc-600">{row.detail}</td>
                                 </tr>
                              ))}
                           </tbody>
                        </table>
                     </div>
                  </div>
               </Container>
            </section>

            <section className="bg-zinc-50 py-16 md:py-24">
               <div className="mx-auto max-w-[1500px] px-4 sm:px-6 xl:px-8">
                  <div className="mx-auto max-w-4xl text-center">
                     <span className="inline-flex rounded-md border border-emerald-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-emerald-700">
                        국내 소싱 사례
                     </span>
                     <h2 className="mt-4 text-3xl font-semibold leading-tight md:text-4xl md:leading-tight">
                        유럽만 보는 것이 아니라
                        <br />
                        더 좋은 조건이면 국내 매장까지 소싱합니다.
                     </h2>
                     <p className="mx-auto mt-5 max-w-3xl text-base leading-8 text-zinc-600">
                        Balen*** 브랜드 제품 요청이 들어왔을 때 한국 온라인 매장에는
                        재고가 없었습니다. 유럽 재고를 확인한 뒤 국내 매장까지 다시
                        확인했고, 우연히 셀러를 통해 한 점을 확보할 수 있었습니다.
                     </p>
                  </div>

                  <div className="mt-10 grid gap-5 lg:grid-cols-[1.25fr_0.75fr]">
                     {domesticImages.map((image) => (
                        <article
                           key={image.title}
                           className={`rounded-lg border border-zinc-200 bg-white p-3 shadow-sm ${
                              image.wide ? "lg:row-span-2" : ""
                           }`}
                        >
                           <div
                              className={`flex items-center justify-center overflow-hidden rounded-lg border border-zinc-200 bg-white ${
                                 image.wide ? "h-[760px]" : "h-[365px]"
                              }`}
                           >
                              <Image
                                 src={image.src}
                                 alt={image.alt}
                                 width={1640}
                                 height={1200}
                                 className="h-full w-full object-contain"
                                 sizes={
                                    image.wide
                                       ? "(min-width: 1024px) 58vw, 100vw"
                                       : "(min-width: 1024px) 34vw, 100vw"
                                 }
                              />
                           </div>
                           <p className="mt-3 px-1 text-sm font-semibold text-zinc-950">
                              {image.title}
                           </p>
                        </article>
                     ))}
                  </div>

                  <div className="mt-8 grid gap-4 md:grid-cols-4">
                     {domesticRows.map((row) => (
                        <article
                           key={row.label}
                           className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm"
                        >
                           <p className="text-xs font-semibold text-zinc-500">
                              {row.label}
                           </p>
                           <p className="mt-3 text-xl font-semibold text-zinc-950">
                              {row.value}
                           </p>
                           <p className="mt-3 text-sm leading-6 text-zinc-600">
                              {row.note}
                           </p>
                        </article>
                     ))}
                  </div>

                  <div className="mt-8 rounded-lg border border-emerald-200 bg-white p-6 shadow-sm md:p-8">
                     <p className="text-base leading-8 text-zinc-600">
                        매장 예약 후 직접 구매했고, 할인 행사까지 적용되어 실제 구매가는
                        2,773,495원이었습니다. 수수료를 제외하고도 1,137,025원의
                        마진이 남은 사례입니다. 이런 국내 매장 구매는 단순한 매입을 넘어
                        럭셔리 서비스와 케어를 경험할 수 있고, 쇼핑몰 실적과 고객 신뢰에도
                        도움이 됩니다.
                     </p>
                  </div>
               </div>
            </section>

            <section className="py-16 md:py-24">
               <Container>
                  <div className="overflow-hidden rounded-lg border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-sky-50 p-7 shadow-sm md:p-10">
                     <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
                        <div>
                           <span className="inline-flex rounded-md border border-emerald-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-emerald-700 shadow-sm">
                              먼저 시작하는 사람이 유리합니다
                           </span>
                           <h2 className="mt-4 text-3xl font-semibold leading-tight text-zinc-950 md:text-4xl md:leading-tight">
                              플로우머스는 더 많은 이용자를 무조건 원하지 않습니다
                           </h2>
                        </div>
                        <div className="space-y-4 text-base leading-8 text-zinc-600">
                           <p>
                              명품 구매대행 자동화는 이용자가 많아질수록 서로의 경쟁이
                              될 수 있습니다. 그래서 플로우머스는 단순히 많은 이용자를
                              받기보다, 좋은 플랜으로 제대로 운영할 소수의 셀러에게 더
                              높은 품질의 셋팅과 응대를 제공하는 방향을 중요하게 봅니다.
                           </p>
                           <p>
                              이용자가 많아지면 컨설팅, 실시간 응대, 사이트별 최적화
                              관리까지 모두 최고 수준으로 유지하기 어렵습니다. 먼저
                              시작한 셀러는 판매 기회를 더 빠르게 잡고, 노출 데이터와
                              시장 흐름을 먼저 경험하며 자리를 잡을 가능성이 커집니다.
                           </p>
                           <p>
                              아직 확정된 정책은 아니지만, 운영 품질과 기존 이용자 보호를
                              위해 명품 솔루션 신규 이용을 제한할 수 있습니다. 고민만
                              길어질수록 좋은 사이트와 좋은 카테고리를 먼저 잡는 기회는
                              줄어듭니다.
                           </p>
                        </div>
                     </div>
                     <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                        <Link
                           href="/pricing"
                           className="inline-flex justify-center rounded-lg border border-emerald-700 bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-sm duration-150 hover:bg-emerald-700"
                        >
                           플랜 먼저 확인하기
                        </Link>
                        <Link
                           href="/consulting"
                           className="inline-flex justify-center rounded-lg border border-zinc-300 bg-white px-5 py-3 text-sm font-semibold text-zinc-800 shadow-sm duration-150 hover:bg-zinc-50"
                        >
                           컨설팅 문의하기
                        </Link>
                     </div>
                  </div>
               </Container>
            </section>

            <section className="py-16 md:py-24">
               <Container>
                  <div className="grid gap-7 md:grid-cols-2">
                     {guideCards.map((card) => (
                        <article
                           key={card.title}
                           className="rounded-lg border border-zinc-200 bg-zinc-50 p-7 shadow-sm"
                        >
                           <h2 className="text-2xl font-semibold">
                              {card.title}
                           </h2>
                           <p className="mt-4 text-sm leading-7 text-zinc-600">
                              {card.description}
                           </p>
                        </article>
                     ))}
                  </div>
               </Container>
            </section>

            <section className="pb-16 md:pb-24">
               <Container>
                  <div className="rounded-lg border border-zinc-200 bg-zinc-950 p-7 text-white shadow-sm md:p-10">
                     <div className="max-w-3xl">
                        <span className="text-sm font-semibold text-emerald-300">
                           앞으로의 플로우머스
                        </span>
                        <h2 className="mt-3 text-3xl font-semibold">
                           자동화 프로그램을 넘어 수익 구조까지 연결합니다
                        </h2>
                        <div className="mt-5 space-y-4 text-base leading-8 text-zinc-300">
                           <p>
                              상품은 플로우머스가 올리고, 이용자는 쇼핑몰 디자인과 기능,
                              CS에 더 집중할 수 있습니다. 나이와 경험에 관계없이 쉽게
                              시작할 수 있도록 셋팅과 운영 흐름을 최대한 단순하게
                              만들어드립니다.
                           </p>
                           <p>
                              중고 시장이나 비정상 유통 구조가 아니라, 정식 소싱처와
                              실제 운영 데이터를 기반으로 명품 구매대행의 강점을
                              안내합니다. 궁금한 부분이 있다면 컨설팅에서 구조를 더
                              깊게 확인할 수 있습니다.
                           </p>
                        </div>
                        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                           <Link
                              href="/pricing"
                              className="inline-flex justify-center rounded-lg border border-emerald-400 bg-emerald-400 px-5 py-3 text-sm font-semibold text-zinc-950 duration-150 hover:bg-emerald-300"
                           >
                              플랜별 구독하기
                           </Link>
                           <Link
                              href="/consulting"
                              className="inline-flex justify-center rounded-lg border border-white/30 px-5 py-3 text-sm font-semibold text-white duration-150 hover:bg-white/10"
                           >
                              컨설팅 문의하기
                           </Link>
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
