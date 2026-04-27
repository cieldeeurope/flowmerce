import Image from "next/image";
import Link from "next/link";
import Container from "@/components/Container";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { createMetadata } from "@/lib/seo";

export const metadata = createMetadata({
   title: "프로그램 소개",
   description:
      "상품등록 및 재고관리 프로그램, 실시간 방문자 재고 업데이트, 마진 설정, 단어 치환 기능까지 플로우머스 프로그램 사용 흐름을 안내합니다.",
   path: "/program",
});

const subscribedBrands = [
   "brand",
   "brand",
   "brand",
   "brand",
   "brand",
   "brand",
   "brand",
   "brand",
   "brand",
   "brand",
   "brand",
   "brand",
   "brand",
   "brand",
   "brand",
   "brand",
   "brand",
   "brand",
   "brand",
   "brand",
   "brand",
   "brand",
   "brand",
   "brand",
   "brand",
   "brand",
   "brand",
   "brand",
   "brand",
   "brand",
   "brand",
   "brand",
];

const sourceCategories = [
   "celine-shop-men - bags - business-and-travel",
   "celine-shop-men - bags - cross-body-bags",
   "celine-shop-men - bags - luggage",
   "celine-shop-men - bags - new",
   "celine-shop-men - bags - romy",
   "celine-shop-men - bags - tote-bags",
   "celine-shop-men - bags - triomphe-canvas",
   "celine-shop-men - jewelry - bracelets",
];

const mallCategories = [
   "패션잡화 > 남성 가방 > 브리프케이스",
   "패션잡화 > 남성 가방 > 숄더백",
   "패션잡화 > 남성 가방 > 크로스백",
   "패션잡화 > 남성 가방 > 클러치백",
   "패션잡화 > 남성 신발 > 스니커즈",
   "패션잡화 > 남성 신발 > 구두",
   "패션잡화 > 남성 신발 > 캐주얼화",
];

function LoginMockup() {
   return (
      <div className="mx-auto w-full max-w-sm rounded-lg border border-zinc-300 bg-zinc-100 shadow-sm">
         <div className="flex h-8 items-center gap-2 border-b border-zinc-300 bg-white px-3 text-xs text-zinc-600">
            <span className="h-3 w-3 rounded-sm border border-zinc-400 bg-emerald-100" />
            로그인
         </div>
         <div className="px-6 py-8 text-center">
            <label className="block text-sm font-medium text-zinc-800">
               아이디
            </label>
            <div className="mt-2 h-8 rounded border border-zinc-300 bg-white px-3 text-left text-sm leading-8 text-zinc-400">
               아이디
            </div>

            <label className="mt-5 block text-sm font-medium text-zinc-800">
               비밀번호
            </label>
            <div className="mt-2 h-8 rounded border border-zinc-300 bg-white px-3 text-left text-sm leading-8 text-zinc-400">
               비밀번호
            </div>

            <div className="mt-5 flex justify-center gap-2">
               <button className="rounded border border-cyan-700 bg-cyan-100 px-4 py-1.5 text-sm text-zinc-900">
                  로그인
               </button>
               <button className="rounded border border-zinc-300 bg-zinc-200 px-4 py-1.5 text-sm text-zinc-700">
                  취소
               </button>
            </div>
         </div>
      </div>
   );
}

function BrandToolbar() {
   return (
      <div>
         <div className="flex flex-wrap gap-2">
            {subscribedBrands.map((item, index) => (
               <span
                  key={`${item}-${index}`}
                  className="inline-flex h-7 w-20 items-center justify-center rounded border border-zinc-300 bg-zinc-200 text-xs text-zinc-400 blur-[2px]"
               >
                  {item}
               </span>
            ))}
         </div>
         <p className="mt-3 text-xs font-medium text-zinc-500">
            실제 프로그램에서는 구독한 사이트들이 이 영역에 나열됩니다.
         </p>
      </div>
   );
}

function ProgramButton({ children, active, muted }) {
   return (
      <span
         className={`rounded border px-3 py-1.5 text-xs ${
            active
               ? "border-cyan-500 bg-cyan-50 font-semibold text-zinc-950"
               : muted
                 ? "border-zinc-200 bg-zinc-100 text-zinc-300"
                 : "border-zinc-300 bg-zinc-200 text-zinc-700"
         }`}
      >
         {children}
      </span>
   );
}

function CategoryBox({ title, items = [], selectedIndex, muted }) {
   return (
      <div>
         <p className="mb-2 text-xs font-medium text-zinc-600">{title}</p>
         <div
            className={`h-56 overflow-hidden border border-zinc-300 bg-white text-xs ${
               muted ? "opacity-35" : ""
            }`}
         >
            {items.length > 0 ? (
               <ul>
                  {items.map((item, index) => (
                     <li
                        key={item}
                        className={`border-b border-zinc-100 px-2 py-1.5 ${
                           selectedIndex === index
                              ? "bg-cyan-600 text-white"
                              : index % 2 === 0
                                ? "bg-zinc-50"
                                : "bg-white"
                        }`}
                     >
                        {item}
                     </li>
                  ))}
               </ul>
            ) : null}
         </div>
      </div>
   );
}

function ProgramWindow({ mode = "hosting" }) {
   const isHosting = mode === "hosting";
   const isLoaded = mode === "loaded";
   const isMapped = mode === "mapped";
   const isCollected = mode === "collected";
   const isMargin = mode === "margin";
   const isReplacement = mode === "replacement";
   const hasCategories =
      isLoaded || isMapped || isCollected || isMargin || isReplacement;

   return (
      <div className="rounded-lg border border-zinc-300 bg-zinc-100 shadow-sm">
         <div className="flex h-8 items-center gap-2 border-b border-zinc-300 bg-white px-3 text-xs text-zinc-600">
            <span className="h-3 w-3 rounded-sm border border-zinc-400 bg-emerald-100" />
            Crawler Program
         </div>
         <div className="p-4">
            <BrandToolbar />

            <div className="mt-8 flex flex-wrap items-center gap-2">
               {["저장", "불러오기", "필터링", "수집"].map((item) => (
                  <ProgramButton key={item}>{item}</ProgramButton>
               ))}
               <span className="relative">
                  <ProgramButton active={isHosting}>호스팅</ProgramButton>
                  {isHosting && (
                     <span className="pointer-events-none absolute -inset-3 rounded-full border-4 border-red-500" />
                  )}
               </span>
            </div>

            <div className="mt-7 grid gap-4 md:grid-cols-5">
               <CategoryBox
                  title={hasCategories ? "Celine 브랜드" : "브랜드"}
                  items={[]}
                  muted={!hasCategories}
               />
               <CategoryBox
                  title="브랜드 카테고리"
                  items={hasCategories ? sourceCategories : []}
                  selectedIndex={isMapped || isCollected ? 5 : undefined}
               />
               <CategoryBox
                  title="쇼핑몰 카테고리"
                  items={hasCategories ? mallCategories : []}
                  selectedIndex={isMapped || isCollected ? 3 : undefined}
               />
               <CategoryBox
                  title="매핑한 카테고리"
                  items={
                     isMapped || isCollected
                        ? ["패션잡화 > 남성 가방 > 토트백"]
                        : []
                  }
               />
               <CategoryBox
                  title="수집 카테고리"
                  items={isCollected ? ["패션잡화 > 남성 가방 > 토트백"] : []}
                  selectedIndex={isCollected ? 0 : undefined}
               />
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-4">
               <button className="h-10 rounded border border-zinc-300 bg-zinc-200 text-sm text-zinc-700">
                  카테고리
               </button>
               <span className="relative block">
                  <button
                     className={`h-10 w-full rounded border text-sm ${
                        isMargin
                           ? "border-cyan-500 bg-cyan-50 text-zinc-950"
                           : "border-zinc-300 bg-zinc-200 text-zinc-700"
                     }`}
                  >
                     마진설정
                  </button>
                  {isMargin && (
                     <span className="pointer-events-none absolute -inset-2 rounded-lg border-4 border-red-500" />
                  )}
               </span>
               <span className="relative block">
                  <button
                     className={`h-10 w-full rounded border text-sm ${
                        isMapped
                           ? "border-cyan-500 bg-cyan-50 text-zinc-950"
                           : "border-zinc-300 bg-zinc-200 text-zinc-700"
                     }`}
                  >
                     매핑
                  </button>
                  {isMapped && (
                     <span className="pointer-events-none absolute -inset-2 rounded-lg border-4 border-red-500" />
                  )}
               </span>
               <span className="relative block">
                  <button
                     className={`h-10 w-full rounded border text-sm ${
                        isReplacement
                           ? "border-cyan-500 bg-cyan-50 text-zinc-950"
                           : "border-zinc-300 bg-zinc-200 text-zinc-700"
                     }`}
                  >
                     단어치환
                  </button>
                  {isReplacement && (
                     <span className="pointer-events-none absolute -inset-2 rounded-lg border-4 border-red-500" />
                  )}
               </span>
            </div>

            <div className="mt-6 space-y-3">
               <span className="relative block">
                  <button
                     className={`h-12 w-full rounded border text-sm ${
                        isCollected
                           ? "border-emerald-500 bg-emerald-50 font-semibold text-emerald-800"
                           : "border-zinc-300 bg-zinc-200 text-zinc-700"
                     }`}
                  >
                     수집예약
                  </button>
                  {isCollected && (
                     <span className="pointer-events-none absolute -inset-2 rounded-lg border-4 border-red-500" />
                  )}
               </span>
            </div>
         </div>
      </div>
   );
}

function HostingMockup() {
   return (
      <div className="relative">
         <ProgramWindow mode="hosting" />
         <div className="absolute left-1/2 top-1/2 w-[min(92%,520px)] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-zinc-300 bg-white p-5 shadow-2xl">
            <div className="mb-4 text-sm font-semibold text-zinc-800">
               호스팅 선택
            </div>
            <div className="rounded-lg border-4 border-red-500 p-3">
               <div className="grid gap-3 sm:grid-cols-[90px_1fr_70px] sm:items-center">
                  <label className="text-xs font-semibold text-zinc-600">
                     Select Account
                  </label>
                  <select className="h-9 rounded border border-cyan-500 bg-cyan-50 px-3 text-sm text-zinc-900">
                     <option>- 선택 -</option>
                     <option>godomall_1</option>
                     <option>smartstore_1</option>
                  </select>
                  <button className="h-9 rounded border border-zinc-300 bg-zinc-100 text-sm text-zinc-800">
                     로그인
                  </button>
               </div>
            </div>
         </div>
      </div>
   );
}

function MarginSettingsMockup() {
   const fields = [
      ["최소 금액", "최소 금액 입력"],
      ["최대 금액", "최대 금액 입력"],
      ["최소 마진", "최소 마진 입력"],
      ["마진 값 (%)", "마진 값 입력"],
      ["환율", "환율 입력"],
   ];

   return (
      <div className="relative">
         <ProgramWindow mode="margin" />
         <div className="absolute left-1/2 top-1/2 w-[min(92%,520px)] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-zinc-300 bg-white p-5 shadow-2xl">
            <div className="mb-5 flex h-7 items-center gap-2 text-sm font-semibold text-zinc-800">
               <span className="h-3 w-3 rounded-sm border border-zinc-400 bg-emerald-100" />
               마진 설정
            </div>
            <p className="mb-3 text-sm text-zinc-700">현재 설정중인 마진</p>
            <div className="h-40 rounded border-2 border-cyan-500 bg-white" />
            <div className="mt-5 grid gap-3 text-sm">
               {fields.map(([label, placeholder]) => (
                  <div
                     key={label}
                     className="grid grid-cols-[90px_1fr] items-center gap-3"
                  >
                     <span className="text-zinc-700">{label}</span>
                     <div className="h-8 rounded border border-zinc-300 bg-zinc-50 px-3 leading-8 text-zinc-400">
                        {placeholder}
                     </div>
                  </div>
               ))}
               <div className="grid grid-cols-[90px_1fr] items-center gap-3">
                  <span className="text-zinc-700">사이트</span>
                  <div className="h-8 rounded border border-zinc-300 bg-zinc-100 px-3 leading-8 text-zinc-700">
                     사이트 선택
                  </div>
               </div>
            </div>
            <div className="mt-5 flex justify-center gap-2">
               <button className="rounded border border-zinc-300 bg-zinc-100 px-4 py-1.5 text-sm text-zinc-800">
                  저장
               </button>
               <button className="rounded border border-zinc-300 bg-zinc-100 px-4 py-1.5 text-sm text-zinc-800">
                  삭제
               </button>
            </div>
         </div>
      </div>
   );
}

function ReplacementSettingsMockup() {
   return (
      <div className="relative">
         <ProgramWindow mode="replacement" />
         <div className="absolute left-1/2 top-1/2 w-[min(92%,500px)] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-zinc-300 bg-white p-5 shadow-2xl">
            <div className="mb-5 flex h-7 items-center gap-2 text-sm font-semibold text-zinc-800">
               <span className="h-3 w-3 rounded-sm border border-zinc-400 bg-emerald-100" />
               단어 치환 설정
            </div>
            <div className="h-52 rounded border-2 border-cyan-500 bg-white" />
            <div className="mt-5 grid gap-3 text-sm">
               <div className="grid grid-cols-[100px_1fr] items-center gap-3">
                  <span className="text-zinc-700">치환할 단어</span>
                  <div className="h-8 rounded border border-zinc-300 bg-zinc-50 px-3 leading-8 text-zinc-400">
                     치환할 단어 입력
                  </div>
               </div>
               <div className="grid grid-cols-[100px_1fr] items-center gap-3">
                  <span className="text-zinc-700">치환된 단어</span>
                  <div className="h-8 rounded border border-zinc-300 bg-zinc-50 px-3 leading-8 text-zinc-400">
                     치환된 단어 입력
                  </div>
               </div>
            </div>
            <div className="mt-5 flex justify-center gap-2">
               <button className="rounded border border-zinc-300 bg-zinc-100 px-4 py-1.5 text-sm text-zinc-800">
                  저장
               </button>
               <button className="rounded border border-zinc-300 bg-zinc-100 px-4 py-1.5 text-sm text-zinc-800">
                  삭제
               </button>
            </div>
         </div>
      </div>
   );
}

function ProductUpdateMockup({ updated = false }) {
   return (
      <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
         <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="flex min-h-80 items-center justify-center bg-white">
               <Image
                  src="/products/sneaker-white-red.svg"
                  alt="흰색 스니커즈 상품 이미지 예시"
                  width={720}
                  height={420}
                  className="h-auto w-full max-w-xl"
               />
            </div>
            <div className="space-y-4">
               <div>
                  <p className="text-xl font-semibold leading-7 text-zinc-950">
                     스피드 로우 스니커즈
                  </p>
                  <p className="mt-1 text-sm text-zinc-500">04</p>
               </div>
               {[
                  ["상품코드", "100232390"],
                  ["판매가", updated ? "₩327,000" : "최신 업데이트 중..."],
                  ["배송비", "무료 / 해외배송"],
                  ["모델명", "Y036P84"],
                  ["제조사", "명품"],
                  [
                     "사이즈TIP",
                     updated
                        ? "최신 업데이트 완료(새로고침 필요)"
                        : "원하시는 사이즈가 없을 때는 실시간 상담톡을 이용해보세요.",
                  ],
               ].map(([label, value]) => (
                  <div
                     key={label}
                     className="grid grid-cols-[90px_1fr] gap-4 border-b border-zinc-100 pb-3 text-sm"
                  >
                     <span className="text-zinc-500">{label}</span>
                     <span
                        className={
                           label === "판매가" && updated
                              ? "font-semibold text-zinc-950"
                              : label === "판매가"
                                ? "font-semibold text-zinc-500"
                                : "text-zinc-700"
                        }
                     >
                        {value}
                     </span>
                  </div>
               ))}
               <div className="grid grid-cols-[90px_1fr] gap-4 border-b border-zinc-100 pb-3 text-sm">
                  <span className="text-zinc-500">사이즈</span>
                  <div className="rounded border border-zinc-300 px-3 py-2 text-zinc-600">
                     {updated ? "최신 업데이트 완료(새로고침)" : "사이즈 업데이트 중..."}
                  </div>
               </div>
               <div className="grid gap-3 sm:grid-cols-3">
                  <button className="h-12 rounded bg-zinc-900 text-sm font-semibold text-white">
                     바로 구매하기
                  </button>
                  <button className="h-12 rounded border border-zinc-300 text-sm font-semibold text-zinc-700">
                     장바구니
                  </button>
                  <button className="h-12 rounded border border-zinc-300 text-sm font-semibold text-zinc-700">
                     관심상품
                  </button>
               </div>
            </div>
         </div>
      </div>
   );
}

function VisitorStockUpdateSection() {
   const benefits = [
      "방문자가 상품 상세페이지에 접속하는 순간 가격과 사이즈 옵션을 확인합니다.",
      "재고관리를 매번 직접 요청하지 않아도 가격과 재고 변동에 대응할 수 있습니다.",
      "품절/사이즈 문의 CS를 줄이고, 사이트가 관리되고 있다는 신뢰감을 줍니다.",
      "프로그램에서 사용하는 소싱 사이트들은 실시간 업데이트 연동이 가능합니다.",
   ];

   return (
      <section
         id="visitor-stock-update"
         className="scroll-mt-24 bg-zinc-50 py-16 md:py-24"
      >
         <div className="mx-auto max-w-[1500px] px-4 sm:px-6 xl:px-8">
            <div className="mx-auto max-w-4xl text-center">
               <span className="inline-flex rounded-md border border-emerald-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-emerald-700">
                  실시간 방문자 재고 업데이트
               </span>
               <h2 className="mt-4 text-3xl font-semibold leading-tight text-zinc-950 md:text-4xl md:leading-tight">
                  실제 방문자가 사이트에 접속하면
                  <br />
                  가격과 옵션이 실시간으로 반영됩니다
               </h2>
               <p className="mx-auto mt-5 max-w-3xl text-base leading-8 text-zinc-600">
                  방문자가 상품 상세페이지에 들어오면 처음에는 가격과 사이즈가 업데이트
                  진행중으로 표시되고, 업데이트가 완료되는 순간 최신 가격과 옵션이 바로
                  반영됩니다.
               </p>
            </div>

            <div className="mt-10 grid gap-5 xl:grid-cols-[1fr_auto_1fr] xl:items-center">
               <ProductUpdateMockup />
               <div className="hidden h-12 w-12 items-center justify-center rounded-full border border-emerald-200 bg-white text-2xl font-semibold text-emerald-700 shadow-sm xl:flex">
                  →
               </div>
               <ProductUpdateMockup updated />
            </div>

            <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_0.9fr] lg:items-start">
               <div className="grid gap-3 sm:grid-cols-2">
                  {benefits.map((benefit) => (
                     <div
                        key={benefit}
                        className="flex gap-3 rounded-lg border border-zinc-200 bg-white p-5 text-sm leading-7 text-zinc-600 shadow-sm"
                     >
                        <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700">
                           ✓
                        </span>
                        <span>{benefit}</span>
                     </div>
                  ))}
               </div>

               <div className="rounded-lg border border-emerald-200 bg-white p-6 shadow-sm">
                  <h3 className="text-2xl font-semibold text-zinc-950">
                     이용료 안내
                  </h3>
                  <div className="mt-5 space-y-4 text-sm leading-7 text-zinc-600">
                     <p>
                        Pro 플랜 이상은 사이트당 월 33만원으로 이용할 수 있으며,
                        서버 비용과 VAT가 포함된 금액입니다.
                     </p>
                     <p>
                        Basic 플랜과 Boutique 플랜은 적용 방식과 이용료가 다릅니다.
                        트래픽 증가에 따라 추가 비용이 발생할 수 있으므로 적용 전 상담을
                        통해 안내드립니다.
                     </p>
                  </div>
               </div>
            </div>
         </div>
      </section>
   );
}

function MarginFeatureSection() {
   const definitions = [
      {
         label: "최소금액",
         description: "이 마진식을 적용할 상품 가격의 시작 금액입니다.",
      },
      {
         label: "최대금액",
         description: "이 마진식을 적용할 상품 가격의 마지막 금액입니다.",
      },
      {
         label: "최소 마진",
         description:
            "마진값을 붙인 최종가격에 추가로 더하거나 빼는 고정 금액입니다.",
      },
      {
         label: "마진값(%)",
         description: "해당 금액 범위에 있는 상품에 적용할 퍼센트 마진입니다.",
      },
      {
         label: "환율",
         description:
            "기준 환율을 직접 입력해 사용할 수 있습니다. 예를 들어 1700처럼 현재 운영 기준에 맞는 값을 넣어 설정합니다.",
      },
      {
         label: "사이트",
         description:
            "마진식을 적용할 사이트를 선택하는 항목입니다. 구독한 사이트들이 나열되며, 하나의 사이트에도 여러 마진식을 설정할 수 있습니다.",
      },
   ];

   return (
      <section id="margin-feature" className="scroll-mt-24 py-16 md:py-24">
         <div className="mx-auto max-w-[1500px] px-4 sm:px-6 xl:px-8">
            <div className="mx-auto max-w-4xl text-center">
               <span className="inline-flex rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700">
                  마진 기능 사용법
               </span>
               <h2 className="mt-4 text-3xl font-semibold leading-tight md:text-4xl md:leading-tight">
                  금액대별로 원하는 마진식을 직접 설정합니다
               </h2>
               <p className="mx-auto mt-5 max-w-3xl text-base leading-8 text-zinc-600">
                  프로그램에서 마진설정 버튼을 클릭하면 현재 사용 중인 마진 설정창이 열립니다.
                  금액대별 마진식은 물론 환율과 사이트를 함께 선택해 운영할 수 있어
                  실제 사용 환경에 맞춘 판매가 설정이 가능합니다.
               </p>
            </div>

            <div className="mt-10">
               <MarginSettingsMockup />
            </div>

            <div className="mt-10 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
               <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
                  <h3 className="text-2xl font-semibold text-zinc-950">
                     마진 설정창 정의
                  </h3>
                  <div className="mt-4 space-y-2.5">
                     {definitions.map((item) => (
                        <div
                           key={item.label}
                           className="grid gap-1.5 rounded-lg border border-zinc-100 bg-zinc-50 p-3 sm:grid-cols-[104px_1fr]"
                        >
                           <p className="font-semibold text-zinc-950">{item.label}</p>
                           <p className="text-sm leading-6 text-zinc-600">
                              {item.description}
                           </p>
                        </div>
                     ))}
                  </div>
               </div>

               <div className="space-y-6">
                  <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
                     <h3 className="text-2xl font-semibold text-zinc-950">
                        설정 흐름 안내
                     </h3>
                     <div className="mt-5 space-y-4 text-sm leading-7 text-zinc-600">
                        <p>
                           먼저 최소 금액, 최대 금액, 최소 마진, 마진 값(%)을 입력한 뒤
                           환율 항목에 기준 값을 넣어 사용합니다.
                        </p>
                        <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-950">
                           환율은 예를 들어 <span className="font-semibold">1700</span>처럼
                           현재 운영 기준 값을 넣으면 됩니다.
                        </p>
                        <p>
                           그 다음 마진식을 적용할 사이트를 선택하면 해당 환경에 맞는 마진 설정을 저장할 수 있습니다.
                        </p>
                     </div>
                  </div>

                  <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-6 shadow-sm">
                     <h3 className="text-2xl font-semibold text-zinc-950">
                        저장과 삭제
                     </h3>
                     <div className="mt-5 space-y-4 text-sm leading-7 text-zinc-600">
                        <p>
                           입력이 끝나면 저장 버튼을 눌러 마진식을 추가하면 되고, 같은 방식으로
                           여러 마진식을 계속 쌓아둘 수 있습니다.
                        </p>
                        <p>
                           삭제가 필요할 때는 현재 설정중인 마진 목록에서 원하는 마진식을
                           선택한 뒤 삭제 버튼을 누르면 됩니다.
                        </p>
                     </div>
                  </div>
               </div>
            </div>
         </div>
      </section>
   );
}

function UploadedProductShowcaseSection() {
   const examples = [
      {
         title: "실제 고도몰 등록 결과",
         description:
            "수집예약 요청 이후 실제 고도몰 관리자 화면에서 상품이 등록된 모습입니다. 상품명, 이미지, 가격, 노출 상태까지 한 번에 확인할 수 있습니다.",
         image: "/program/product-upload-godomall.png",
         alt: "실제 고도몰에 상품이 등록된 관리자 화면",
      },
      {
         title: "실제 스마트스토어 등록 결과",
         description:
            "같은 흐름으로 스마트스토어에도 상품이 정상 등록된 모습입니다. 판매 상태와 재고 수량, 전시 상태까지 함께 운영할 수 있습니다.",
         image: "/program/product-upload-smartstore.png",
         alt: "실제 스마트스토어에 상품이 등록된 관리자 화면",
      },
   ];

   return (
      <section className="py-16 md:py-24">
         <div className="mx-auto max-w-[1500px] px-4 sm:px-6 xl:px-8">
            <div className="mx-auto max-w-4xl text-center">
               <span className="inline-flex rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700">
                  실제 등록 결과
               </span>
               <h2 className="mt-4 text-3xl font-semibold leading-tight md:text-4xl md:leading-tight">
                  수집예약 이후에는 실제 쇼핑몰 관리자에 상품이 등록됩니다
               </h2>
               <p className="mx-auto mt-5 max-w-3xl text-base leading-8 text-zinc-600">
                  카테고리 매핑 이후 수집예약만 요청하면 실제 호스팅 관리자 화면에서 상품이 등록된 결과를 확인할 수 있습니다. 아래 이미지는 고도몰과 스마트스토어에 실제로 상품이 등록된 예시입니다.
               </p>
            </div>

            <div className="mx-auto mt-10 max-w-7xl space-y-8">
               {examples.map((example) => (
                  <article
                     key={example.title}
                     className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm"
                  >
                     <div className="border-b border-zinc-200 bg-zinc-50 px-6 py-5">
                        <h3 className="text-2xl font-semibold text-zinc-950">
                           {example.title}
                        </h3>
                        <p className="mt-2 text-sm leading-7 text-zinc-600">
                           {example.description}
                        </p>
                     </div>
                     <div className="bg-white p-2 sm:p-3">
                        <Image
                           src={example.image}
                           alt={example.alt}
                           width={1600}
                           height={900}
                           sizes="(min-width: 1536px) 1320px, (min-width: 1280px) 1180px, (min-width: 1024px) 92vw, 100vw"
                           className="h-auto w-full rounded-lg border border-zinc-200"
                        />
                     </div>
                  </article>
               ))}
            </div>
         </div>
      </section>
   );
}

function WordReplacementFeatureSection() {
   const examples = [
      ["스니커즈", "운동화"],
      ["토트백", "토트 백"],
      ["재킷", "자켓"],
   ];

   return (
      <section
         id="word-replacement-feature"
         className="scroll-mt-24 bg-zinc-50 py-16 md:py-24"
      >
         <div className="mx-auto max-w-[1500px] px-4 sm:px-6 xl:px-8">
            <div className="mx-auto max-w-4xl text-center">
               <span className="inline-flex rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-zinc-700">
                  단어치환 기능 사용법
               </span>
               <h2 className="mt-4 text-3xl font-semibold leading-tight md:text-4xl md:leading-tight">
                  원하는 단어를 원하는 표현으로 자동 변경합니다
               </h2>
               <p className="mx-auto mt-5 max-w-3xl text-base leading-8 text-zinc-600">
                  단어치환 버튼을 누르면 치환할 단어와 치환된 단어를 저장할 수 있습니다.
                  등록 개수 제한 없이 원하는 표현을 계속 추가할 수 있어 상품명과 상세
                  문구를 쇼핑몰 톤에 맞게 다듬을 수 있습니다. 삭제가 필요할 때는 현재
                  저장된 데이터 목록에서 원하는 항목을 누른 뒤 삭제 버튼을 누르면 됩니다.
               </p>
            </div>

            <div className="mt-10">
               <ReplacementSettingsMockup />
            </div>

            <div className="mx-auto mt-10 max-w-4xl rounded-lg border border-zinc-200 bg-white p-6 shadow-sm md:p-8">
               <h3 className="text-2xl font-semibold text-zinc-950">
                  단어치환 예시
               </h3>
               <p className="mt-3 text-sm leading-7 text-zinc-600">
                  예를 들어 상품명이나 상세내용에 들어오는 단어를 아래처럼 자동으로
                  바꿀 수 있습니다.
               </p>
               <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  {examples.map(([from, to]) => (
                     <div
                        key={`${from}-${to}`}
                        className="rounded-lg border border-zinc-200 bg-zinc-50 p-5 text-center"
                     >
                        <p className="text-lg font-semibold text-zinc-950">
                           {from}
                        </p>
                        <p className="my-2 text-sm font-semibold text-emerald-700">
                           ↓
                        </p>
                        <p className="text-lg font-semibold text-zinc-950">{to}</p>
                     </div>
                  ))}
               </div>
            </div>
         </div>
      </section>
   );
}

export default function ProgramPage() {
   return (
      <>
         <Header />
         <main className="bg-white">
            <section className="bg-gradient-to-b from-emerald-50 via-white to-sky-50 py-16 md:py-24">
               <Container>
                  <div className="mx-auto max-w-4xl text-center">
                     <span className="inline-flex rounded-md border border-emerald-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-emerald-700 shadow-sm">
                        프로그램 소개
                     </span>
                     <h1 className="mt-5 text-4xl font-semibold leading-tight text-zinc-950 sm:text-5xl">
                        플로우머스 자동화 솔루션
                     </h1>
                     <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-zinc-600">
                        플로우머스는 대표적으로 최적화 운영을 위한 두 가지 프로그램
                        기능이 있습니다. 상품등록 및 재고관리 프로그램과 실시간 방문자
                        재고 업데이트 기능을 아래에서 확인할 수 있습니다.
                     </p>
                     <div className="mt-8 grid gap-3 sm:grid-cols-2">
                        <a
                           href="#inventory-program"
                           className="inline-flex justify-center rounded-lg border border-emerald-700 bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-sm duration-150 hover:bg-emerald-700"
                        >
                           상품등록 및 재고관리 프로그램
                        </a>
                        <a
                           href="#visitor-stock-update"
                           className="inline-flex justify-center rounded-lg border border-zinc-300 bg-white px-5 py-3 text-sm font-semibold text-zinc-800 shadow-sm duration-150 hover:bg-zinc-50"
                        >
                           실시간 방문자 재고 업데이트
                        </a>
                     </div>
                     <div className="mx-auto mt-3 grid max-w-2xl gap-3 sm:grid-cols-2">
                        <a
                           href="#margin-feature"
                           className="inline-flex justify-center rounded-lg border border-emerald-200 bg-white/80 px-5 py-3 text-sm font-semibold text-emerald-700 shadow-sm duration-150 hover:bg-emerald-50"
                        >
                           마진 기능 사용법
                        </a>
                        <a
                           href="#word-replacement-feature"
                           className="inline-flex justify-center rounded-lg border border-emerald-200 bg-white/80 px-5 py-3 text-sm font-semibold text-emerald-700 shadow-sm duration-150 hover:bg-emerald-50"
                        >
                           단어치환 기능 사용법
                        </a>
                     </div>
                  </div>
               </Container>
            </section>

            <VisitorStockUpdateSection />

            <section id="inventory-program" className="scroll-mt-24 py-16 md:py-24">
               <Container>
                  <div className="mx-auto mb-10 max-w-4xl rounded-lg border border-amber-200 bg-amber-50 p-5 text-center text-sm leading-7 text-amber-950 shadow-sm">
                     안내를 위해 사용된 프로그램 화면은 무단 도용 방지를 위해 실제
                     프로그램 UI를 그대로 노출하지 않고, 이용 흐름을 이해하기 쉽게
                     재구성한 예시 화면입니다. 실제 기능 흐름과 사용 방식은 동일한
                     기준으로 안내됩니다.
                  </div>

                  <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
                     <div>
                        <span className="inline-flex rounded-md border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-xs font-semibold text-zinc-700">
                           01. 프로그램 로그인
                        </span>
                        <h2 className="mt-4 text-3xl font-semibold leading-tight md:text-4xl md:leading-tight">
                           사이트 계정과 동일한 ID/PASSWORD로 로그인합니다
                        </h2>
                        <div className="mt-5 space-y-4 text-base leading-8 text-zinc-600">
                           <p>
                              프로그램 실행 시 로그인 화면이 나타납니다. 로그인 ID와
                              PASSWORD는 플로우머스 사이트 계정과 동일합니다.
                           </p>
                           <p>
                              비밀번호가 기억나지 않는 경우에는 플로우머스에 문의해주세요.
                              계정 확인 후 안내해드립니다.
                           </p>
                           <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm leading-7 text-emerald-950">
                              중요한 점은, 플로우머스에서 프로그램 셋팅이 완료되어야
                              로그인이 가능하다는 것입니다. 셋팅 완료 시 별도로 연락을
                              드립니다.
                           </p>
                        </div>
                     </div>
                     <LoginMockup />
                  </div>
               </Container>
            </section>

            <section className="bg-zinc-50 py-16 md:py-24">
               <div className="mx-auto max-w-[1500px] px-4 sm:px-6 xl:px-8">
                  <div className="mx-auto max-w-4xl text-center">
                     <span className="inline-flex rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-zinc-700">
                        02. 호스팅 버튼 선택
                     </span>
                     <h2 className="mt-4 text-3xl font-semibold leading-tight md:text-4xl md:leading-tight">
                        프로그램 메인 화면에서 호스팅 버튼을 클릭합니다
                     </h2>
                     <p className="mx-auto mt-5 max-w-3xl text-base leading-8 text-zinc-600">
                        실제 프로그램에서는 상단에 구독한 소싱 사이트들이 나열됩니다.
                        호스팅 버튼을 클릭하면 플로우머스에서 셋팅한 쇼핑몰 계정을
                        선택할 수 있습니다.
                     </p>
                  </div>

                  <div className="mt-10">
                     <ProgramWindow mode="hosting" />
                  </div>
               </div>
            </section>

            <section className="py-16 md:py-24">
               <div className="mx-auto max-w-[1500px] px-4 sm:px-6 xl:px-8">
                  <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
                     <div>
                        <span className="inline-flex rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700">
                           03. 셋팅된 호스팅 계정 선택
                        </span>
                        <h2 className="mt-4 text-3xl font-semibold leading-tight md:text-4xl md:leading-tight">
                           원하는 호스팅을 고르고 로그인합니다
                        </h2>
                        <div className="mt-5 space-y-4 text-base leading-8 text-zinc-600">
                           <p>
                              호스팅 버튼을 누르면 셋팅된 계정 목록이 나타납니다. 선택
                              버튼을 눌러 원하는 호스팅을 고른 뒤 로그인하면 됩니다.
                           </p>
                           <p>
                              목록에는 플로우머스에서 연결을 완료한 계정만 표시됩니다.
                              새로운 호스팅 계정 추가가 필요하다면 요청서를 통해 문의해주세요.
                           </p>
                        </div>
                     </div>
                     <HostingMockup />
                  </div>
               </div>
            </section>

            <section className="bg-zinc-50 py-16 md:py-24">
               <div className="mx-auto max-w-[1500px] px-4 sm:px-6 xl:px-8">
                  <div className="mx-auto max-w-4xl text-center">
                     <span className="inline-flex rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-zinc-700">
                        04. 카테고리 목록 확인
                     </span>
                     <h2 className="mt-4 text-3xl font-semibold leading-tight md:text-4xl md:leading-tight">
                        이용할 사이트를 선택하면
                        <br />
                        카테고리가 자동으로 나열됩니다
                     </h2>
                     <p className="mx-auto mt-5 max-w-3xl text-base leading-8 text-zinc-600">
                        이용할 사이트를 선택하면 브랜드 카테고리와 쇼핑몰 카테고리에
                        카테고리 목록이 표시됩니다. 이후 연결할 카테고리를 선택해
                        매핑하면 됩니다.
                     </p>
                  </div>

                  <div className="mt-10">
                     <ProgramWindow mode="loaded" />
                  </div>
               </div>
            </section>

            <section className="py-16 md:py-24">
               <div className="mx-auto max-w-[1500px] px-4 sm:px-6 xl:px-8">
                  <div className="mx-auto max-w-4xl text-center">
                     <span className="inline-flex rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700">
                        05. 카테고리 매핑
                     </span>
                     <h2 className="mt-4 text-3xl font-semibold leading-tight md:text-4xl md:leading-tight">
                        브랜드 카테고리와 쇼핑몰 카테고리를 선택한 뒤 매핑합니다
                     </h2>
                     <p className="mx-auto mt-5 max-w-3xl text-base leading-8 text-zinc-600">
                        브랜드 카테고리와 쇼핑몰 카테고리를 선택 후 매핑 버튼을 누르면
                        매핑한 카테고리 영역에 정상적으로 출력됩니다. 이 작업은 최초
                        1회만 직접 진행하면 됩니다.
                     </p>
                  </div>

                  <div className="mt-10">
                     <ProgramWindow mode="mapped" />
                  </div>
               </div>
            </section>

            <section className="bg-zinc-50 py-16 md:py-24">
               <div className="mx-auto max-w-[1500px] px-4 sm:px-6 xl:px-8">
                  <div className="mx-auto max-w-4xl text-center">
                     <span className="inline-flex rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-zinc-700">
                        06. 수집예약 요청
                     </span>
                     <h2 className="mt-4 text-3xl font-semibold leading-tight md:text-4xl md:leading-tight">
                        원하는 카테고리를 선택하고 수집예약만 누르면 끝입니다
                     </h2>
                     <p className="mx-auto mt-5 max-w-3xl text-base leading-8 text-zinc-600">
                        수집 버튼을 누르면 수집 카테고리에 목록이 나오고, 원하는
                        카테고리 또는 전체 카테고리를 선택해 가장 크게 보이는 수집예약
                        버튼을 누르면 요청이 완료됩니다.
                     </p>
                  </div>

                  <div className="mt-10">
                     <ProgramWindow mode="collected" />
                  </div>

                  <div className="mx-auto mt-8 max-w-4xl rounded-lg border border-emerald-200 bg-white p-6 text-center shadow-sm">
                     <h3 className="text-2xl font-semibold text-zinc-950">
                        카테고리 매핑은 최초 1회만, 이후에는 수집예약만 누르면 됩니다
                     </h3>
                     <p className="mx-auto mt-4 max-w-3xl text-base leading-8 text-zinc-600">
                        최초 매핑 이후부터는 수집 카테고리에서 원하는 카테고리만 선택하고
                        수집예약을 누르면 됩니다. 상품등록과 재고관리 요청이 정말 쉽게
                        이어지도록 만든 흐름입니다.
                     </p>
                     <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
                        <Link
                           href="/request"
                           className="inline-flex justify-center rounded-lg border border-emerald-700 bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-sm duration-150 hover:bg-emerald-700"
                        >
                           요청서 작성하기
                        </Link>
                        <Link
                           href="/consulting"
                           className="inline-flex justify-center rounded-lg border border-zinc-300 bg-white px-5 py-3 text-sm font-semibold text-zinc-800 shadow-sm duration-150 hover:bg-zinc-50"
                        >
                           컨설팅 문의하기
                        </Link>
                     </div>
                  </div>
               </div>
            </section>

            <UploadedProductShowcaseSection />

            <MarginFeatureSection />

            <WordReplacementFeatureSection />
         </main>
         <Footer />
      </>
   );
}
