import fs from "node:fs";
import path from "node:path";
import Image from "next/image";
import Link from "next/link";
import Container from "@/components/Container";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import ProgramFlowVideo from "@/components/ProgramFlowVideo";
import { createMetadata } from "@/lib/seo";

export const metadata = createMetadata({
   title: "사용 메뉴얼",
   description:
      "상품수집, 재고·품절·가격 반영, 실시간 상품 업데이트, 마진 설정, 단어 치환까지 플로우머스 대시보드 사용 흐름을 안내하는 사용 메뉴얼입니다.",
   path: "/program",
});

const subscribedBrands = [
   "구찌",
   "끌로에",
   "더로우",
   "돌체앤가바나",
   "디올",
   "로로피아나",
   "로에베",
   "루이비통",
   "르메르",
   "릭오웬스",
   "마쥬",
   "막스마라",
   "메종마르지엘라",
   "메종키츠네",
   "몽클레어",
   "미우미우",
   "발렌시아가",
   "버버리",
   "보테가",
   "브루넬로",
   "산드로",
   "세타이어",
   "셀린느",
   "아미",
   "아워레가시",
   "아크네",
   "아페쎄",
   "알렉산더맥퀸",
   "에르노",
   "에르메스",
   "이자벨마랑",
   "자크뮈스",
   "지방시",
   "질샌더",
   "토즈",
   "톰브라운",
   "파페치",
   "프라다",
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

const mappedCategoryItems = [
   "패션잡화 > 남성 가방 > 클러치백",
   "패션잡화 > 남성 신발 > 스니커즈",
];

const previewMargins = [
   ["디올", "1 ~ 500000 / 마진 10%"],
   ["디올", "500001 ~ 2000000 / 마진 9%"],
   ["디올", "2000001 ~ 10000000 / 마진 8%"],
   ["루이비통", "1 ~ 500000 / 마진 10%"],
];

const previewReplacements = [
   ["Gucci", "구찌"],
   ["스니커즈", "운동화"],
   ["재킷", "자켓"],
];

const maskedProgramBrands = Array.from({ length: 38 }, (_, index) => {
   return `Brand ${String(index + 1).padStart(2, "0")}`;
});

const maskedSourceCategories = [
   "source-catalog > category-a > sample-01",
   "source-catalog > category-a > sample-02",
   "source-catalog > category-a > sample-03",
   "source-catalog > category-b > sample-01",
   "source-catalog > category-b > sample-02",
   "source-catalog > category-c > sample-01",
   "source-catalog > category-c > sample-02",
   "source-catalog > category-d > sample-01",
];

const maskedMallCategories = [
   "Fashion > Bags > Sample Line 01",
   "Fashion > Bags > Sample Line 02",
   "Fashion > Bags > Sample Line 03",
   "Fashion > Shoes > Sample Line 01",
   "Fashion > Shoes > Sample Line 02",
   "Fashion > Ready-to-wear > Sample Line 01",
   "Fashion > Ready-to-wear > Sample Line 02",
];

const maskedMappedCategoryItems = [
   "Mapped category sample A",
   "Mapped category sample B",
];

const maskedMarginPreview = [
   ["Boutique 01", "1 ~ 500000 / Margin 10%"],
   ["Boutique 01", "500001 ~ 2000000 / Margin 9%"],
   ["Boutique 02", "2000001 ~ 10000000 / Margin 8%"],
   ["Boutique 03", "1 ~ 500000 / Margin 10%"],
];

const maskedReplacementPreview = [
   ["BRAND_A", "브랜드 A"],
   ["Sample word", "치환어 예시"],
   ["Original term", "변환어 예시"],
];

function MaskedText({ children, className = "" }) {
   return (
      <span className={`inline-block select-none blur-[5px] ${className}`}>
         {children}
      </span>
   );
}

function MaskedPreviewFrame({ children, className = "", label = "Masked" }) {
   return (
      <div className={`relative overflow-hidden rounded-lg ${className}`}>
         <div className="scale-[1.02] select-none blur-xl saturate-50">
            {children}
         </div>
         <div className="pointer-events-none absolute inset-0 bg-white/10" />
         <span className="pointer-events-none absolute right-3 top-3 rounded-full border border-white/70 bg-white/90 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-700 shadow-sm">
            {label}
         </span>
      </div>
   );
}

function LoginMockup() {
   return (
      <div className="mx-auto w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
         <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-900">
               Account
            </p>
            <h3 className="mt-2 text-2xl font-semibold text-zinc-950">로그인</h3>
            <p className="mt-2 text-sm leading-6 text-zinc-600">
               플로우머스 계정으로 로그인한 뒤 대시보드 사용 흐름을 바로 이어서 진행할 수 있습니다.
            </p>
         </div>
         <div className="mt-6 space-y-4">
            <label className="block text-sm font-medium text-zinc-700">
               로그인 아이디
            </label>
            <div className="h-11 rounded-lg border border-zinc-300 bg-white px-4 text-left text-sm leading-[44px] text-zinc-400 shadow-sm">
               아이디
            </div>

            <label className="block text-sm font-medium text-zinc-700">
               비밀번호
            </label>
            <div className="h-11 rounded-lg border border-zinc-300 bg-white px-4 text-left text-sm leading-[44px] text-zinc-400 shadow-sm">
               비밀번호
            </div>

            <div className="pt-2">
               <button className="flex h-11 w-full items-center justify-center rounded-lg border border-zinc-950 bg-zinc-950 px-4 text-sm font-semibold text-white">
                  로그인
               </button>
            </div>
            <p className="text-center text-xs text-zinc-500">
               로그인 후 마이페이지와 대시보드에서 진행 상태를 확인할 수 있습니다.
            </p>
         </div>
      </div>
   );
}

function StudioPanelShell({ activeTab = "collection", highlightHostingSelect, children }) {
   const tabs = [
      ["collection", "상품수집"],
      ["margin", "마진"],
      ["replacement", "치환"],
   ];

   return (
      <div className="overflow-hidden rounded-[28px] border border-zinc-200 bg-white shadow-sm">
         <div className="border-b border-zinc-200 px-5 py-5 sm:px-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
               <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-900">
                     Flowmerce Studio
                  </p>
                  <h3 className="mt-2 text-2xl font-semibold text-zinc-950">
                     수집 작업 공간
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-zinc-600">
                     이용자의 특별한 공간, 상품 수집부터 마진 치환까지 한 화면에서 이어집니다.
                  </p>
               </div>

               <div className="min-w-[280px] space-y-2">
                  <p className="text-sm font-medium text-zinc-800">
                     로그인 된 계정 :{" "}
                     <span className="font-semibold text-zinc-950">Guest</span>
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                     <label className="text-sm font-medium text-zinc-800">
                        선택 된 호스팅 :
                     </label>
                     <div
                        className={`rounded-xl ${
                           highlightHostingSelect ? "ring-4 ring-red-500 ring-offset-2" : ""
                        }`}
                     >
                        <select className="min-w-[220px] rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900">
                           <option>smartstore_2</option>
                           <option>godomall_1</option>
                           <option>cafe24_1</option>
                        </select>
                     </div>
                     <span className="inline-flex items-center justify-center rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-800 shadow-sm">
                        마이페이지
                     </span>
                  </div>
                  {highlightHostingSelect ? (
                     <p className="text-xs leading-6 text-amber-900">
                        이 드롭다운을 눌러 이미 연결된 호스팅 계정 중 원하는 계정을 바로
                        선택하면 됩니다.
                     </p>
                  ) : null}
               </div>
            </div>
         </div>

         <div className="border-b border-zinc-200 px-5 py-4 sm:px-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
               <div className="flex flex-wrap gap-2">
                  {tabs.map(([id, label]) => (
                     <span
                        key={id}
                        className={`inline-flex items-center justify-center rounded-md border px-4 py-2.5 text-sm font-medium ${
                           activeTab === id
                              ? "border-zinc-950 bg-zinc-950 text-white"
                              : "border-zinc-300 bg-white text-zinc-800"
                        }`}
                     >
                        {label}
                     </span>
                  ))}
               </div>
               <span className="inline-flex items-center gap-2 rounded-md border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-800 shadow-sm">
                  <svg
                     aria-hidden="true"
                     viewBox="0 0 20 20"
                     className="h-4 w-4"
                     fill="none"
                     stroke="currentColor"
                     strokeWidth="1.6"
                  >
                     <path d="M4.5 3.5h8a3 3 0 0 1 3 3v9h-8a3 3 0 0 0-3 3v-15Z" />
                     <path d="M15.5 15.5h-8a3 3 0 0 0-3 3" />
                  </svg>
                  <span>사용 메뉴얼</span>
               </span>
            </div>
         </div>

         <div className="bg-zinc-50 p-4 sm:p-5">{children}</div>
      </div>
   );
}

function BrandToolbar({ highlightSelection }) {
   return (
      <div>
         <div className="flex flex-wrap gap-2">
            {maskedProgramBrands.map((item, index) => (
               <span
                  key={`${item}-${index}`}
                  className={`inline-flex items-center justify-center rounded-md border px-3 py-2 text-xs font-medium ${
                     index === 0
                        ? "border-zinc-950 bg-zinc-950 text-white"
                        : "border-zinc-300 bg-white text-zinc-700"
                  } ${
                     highlightSelection && index === 0
                        ? "ring-4 ring-red-500 ring-offset-2"
                        : ""
                  }`}
               >
                  <MaskedText>{item}</MaskedText>
               </span>
            ))}
         </div>
         <p className="mt-3 text-xs font-medium text-zinc-500">
            사이트 버튼을 누르면 해당 사이트 카테고리와 쇼핑몰 카테고리 목록이 함께
            준비됩니다.
         </p>
      </div>
   );
}

function GuideShortcut({ href, title, description, highlighted, paid }) {
   return (
      <a
         href={href}
         className={`group rounded-xl border p-4 text-left shadow-sm transition duration-150 ${
            highlighted
               ? "border-zinc-950 bg-zinc-950 text-white hover:bg-[#8c6333]"
               : "border-amber-200 bg-white text-zinc-900 hover:bg-[#fbf7ef]"
         }`}
      >
         <div className="flex items-start justify-between gap-3">
            <div>
               <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold">{title}</span>
                  {paid ? (
                     <span
                        className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                           highlighted
                              ? "border-white/30 bg-white/10 text-white"
                              : "border-amber-300 bg-amber-50 text-amber-900"
                        }`}
                     >
                        유료 기능
                     </span>
                  ) : null}
               </div>
               <p
                  className={`mt-2 text-sm leading-6 ${
                     highlighted ? "text-white/80" : "text-zinc-600"
                  }`}
               >
                  {description}
               </p>
               <span
                  className={`mt-3 inline-flex items-center gap-1 text-xs font-semibold ${
                     highlighted ? "text-white" : "text-[#8c6333]"
                  }`}
               >
                  알아보기
                  <span className="transition-transform group-hover:translate-x-1">→</span>
               </span>
            </div>
         </div>
      </a>
   );
}

function ProgramButton({ children, active, muted, primary }) {
   return (
      <span
         className={`inline-flex items-center justify-center rounded-md border px-3 py-2 text-xs font-medium ${
            primary
               ? "border-zinc-950 bg-zinc-950 text-white"
               : active
                 ? "border-[#8c6333] bg-[#fbf7ef] font-semibold text-zinc-950"
                 : muted
                   ? "border-zinc-200 bg-zinc-100 text-zinc-300"
                   : "border-zinc-300 bg-white text-zinc-700"
         }`}
      >
         {children}
      </span>
   );
}

function CategoryBox({
   title,
   items = [],
   selectedIndexes = [],
   checkedIndexes = [],
   muted,
   note,
   blurred,
   showCheckboxes,
   emptyText = "항목이 없습니다.",
}) {
   return (
      <div>
         <p className="mb-2 text-xs font-medium text-zinc-600">{title}</p>
         <div
            className={`h-64 overflow-hidden rounded-md border border-zinc-300 bg-white text-xs ${
               muted ? "opacity-35" : ""
            }`}
         >
            {note ? (
               <div className="flex h-full items-center px-3 py-4 text-sm leading-6 text-zinc-500">
                  {note}
               </div>
            ) : items.length > 0 ? (
               <ul>
                  {items.map((item, index) => (
                     <li
                        key={item}
                        className={`border-b border-zinc-100 px-2 py-1.5 ${
                           selectedIndexes.includes(index) || checkedIndexes.includes(index)
                              ? "bg-[#fbf7ef] text-zinc-950"
                              : index % 2 === 0
                                ? "bg-zinc-50"
                                : "bg-white"
                        }`}
                     >
                        <div
                           className={`flex items-start gap-2 ${
                              blurred ? "blur-[2px]" : ""
                           }`}
                        >
                           {showCheckboxes ? (
                              <span
                                 className={`mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border text-[10px] ${
                                    checkedIndexes.includes(index)
                                       ? "border-zinc-950 bg-zinc-950 text-white"
                                       : "border-zinc-300 bg-white text-transparent"
                                 }`}
                              >
                                 ✓
                              </span>
                           ) : null}
                           <span>{item}</span>
                        </div>
                     </li>
                  ))}
               </ul>
            ) : (
               <div className="flex h-full items-center px-3 py-4 text-sm leading-6 text-zinc-500">
                  {emptyText}
               </div>
            )}
         </div>
      </div>
   );
}

function ProgramWindow({ mode = "hosting" }) {
   const isHosting = mode === "hosting";
   const isLoaded = mode === "loaded";
   const isMapped = mode === "mapped";
   const isCollected = mode === "collected";
   const showCategoryLists = isLoaded || isMapped || isCollected;
   const showMappedCategories = isMapped || isCollected;
   const selectedCollectionIndexes = isCollected ? [0] : [];

   return (
      <StudioPanelShell activeTab="collection" highlightHostingSelect={isHosting}>
         <section className="border border-zinc-200 bg-white px-4 py-4 sm:px-5">
            <div className="space-y-5">
               <BrandToolbar highlightSelection={isLoaded} />

               <div className="flex flex-wrap items-center gap-2 pt-1">
                  <ProgramButton>수집</ProgramButton>
                  <ProgramButton>호스팅 카테고리</ProgramButton>
                  <ProgramButton>호스팅 로그인</ProgramButton>
                  <ProgramButton muted>저장</ProgramButton>
                  <ProgramButton muted>불러오기</ProgramButton>
                  <ProgramButton muted>필터링</ProgramButton>
               </div>
               <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">
                  <span>쇼핑몰 카테고리와 사이트 카테고리는 플로우머스가 직접 세팅합니다.</span>
               </div>

               <div className="grid gap-4 xl:grid-cols-5">
                  <CategoryBox
                     title="구찌 브랜드"
                     note="이 영역은 플로우머스가 세팅한 브랜드 전용 안내 영역입니다."
                  />
                  <CategoryBox
                     title="사이트 카테고리"
                     items={showCategoryLists ? maskedSourceCategories : []}
                     selectedIndexes={showMappedCategories ? [5] : []}
                     blurred
                     emptyText="사이트 버튼을 누르면 카테고리가 준비됩니다."
                  />
                  <CategoryBox
                     title="쇼핑몰 카테고리"
                     items={showCategoryLists ? maskedMallCategories : []}
                     selectedIndexes={showMappedCategories ? [3] : []}
                     blurred
                     emptyText="플로우머스가 세팅한 쇼핑몰 카테고리가 노출됩니다."
                  />
                  <CategoryBox
                     title="매핑한 카테고리"
                     items={showMappedCategories ? maskedMappedCategoryItems : []}
                     showCheckboxes={showMappedCategories}
                     emptyText="매핑 후 이 영역에 저장된 카테고리가 표시됩니다."
                  />
                  <CategoryBox
                     title="수집 카테고리"
                     items={showMappedCategories ? maskedMappedCategoryItems : []}
                     showCheckboxes={showMappedCategories}
                     checkedIndexes={selectedCollectionIndexes}
                     emptyText="매핑이 끝나면 수집할 카테고리를 여기에서 체크합니다."
                  />
               </div>

               <div className="flex flex-wrap justify-center gap-3">
                  <ProgramButton>쇼핑몰 카테고리</ProgramButton>
                  <span
                     className={`rounded-xl ${
                        isMapped ? "ring-4 ring-red-500 ring-offset-2" : ""
                     }`}
                  >
                     <ProgramButton active={isMapped}>매핑</ProgramButton>
                  </span>
                  <ProgramButton>매핑 삭제</ProgramButton>
                  <ProgramButton>마진설정</ProgramButton>
                  <ProgramButton>단어치환</ProgramButton>
               </div>

               <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                     <div>
                        <p className="text-sm font-medium text-zinc-900">
                           수집 현황: 대기 중
                        </p>
                        <p className="mt-1 text-xs text-zinc-500">0 / 0 완료</p>
                     </div>
                     <ProgramButton>새로고침</ProgramButton>
                  </div>
                  <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-zinc-200">
                     <div className="h-full w-[18%] rounded-full bg-[#8c6333]" />
                  </div>
               </div>

               <span
                  className={`block rounded-2xl ${
                     isCollected ? "ring-4 ring-red-500 ring-offset-2" : ""
                  }`}
               >
                  <span className="flex items-center justify-center rounded-xl border border-zinc-950 bg-zinc-950 px-4 py-4 text-sm font-semibold text-white">
                     수집예약 요청
                  </span>
               </span>
            </div>
         </section>
      </StudioPanelShell>
   );
}

function MarginSettingsMockup() {
   const fields = [
      ["최소 금액", "최소 금액 입력"],
      ["최대 금액", "최대 금액 입력"],
      ["최소 마진", "최소 마진 입력"],
      ["마진 값 (%)", "마진 값 입력"],
      ["환율", "환율 입력"],
      ["거래처 할인율 (%)", "거래처 할인율 입력"],
   ];

   return (
      <StudioPanelShell activeTab="margin">
         <section className="border border-zinc-200 bg-white px-4 py-4 sm:px-5">
            <div className="space-y-4">
               <div className="border border-zinc-300 bg-white">
                  <div className="border-b border-zinc-300 px-3 py-2">
                     <p className="text-sm font-medium text-zinc-900">현재 설정중인 마진</p>
                  </div>
                  <ul className="max-h-[220px] divide-y divide-zinc-200 overflow-auto">
                     {maskedMarginPreview.map(([site, detail], index) => (
                        <li key={`${site}-${detail}`}>
                           <div
                              className={`px-3 py-2 text-sm ${
                                 index === 0 ? "bg-[#fbf7ef]" : "bg-white"
                              }`}
                           >
                              <p className="font-medium text-zinc-950">
                                 <MaskedText>{site}</MaskedText>
                              </p>
                              <p className="text-xs text-zinc-500">
                                 <MaskedText className="blur-[4px]">{detail}</MaskedText>
                              </p>
                           </div>
                        </li>
                     ))}
                  </ul>
               </div>

               <div className="grid gap-4 md:grid-cols-[110px_1fr] md:items-center">
                  {fields.map(([label, placeholder]) => (
                     <div key={label} className="contents">
                        <label className="text-sm text-zinc-700">{label}:</label>
                        <div className="rounded-md border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-400">
                           {placeholder}
                        </div>
                     </div>
                  ))}
                  <label className="text-sm text-zinc-700">사이트:</label>
                   <div className="rounded-md border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-700 blur-[5px]">
                     구찌
                  </div>
               </div>

               <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center justify-center rounded-md border border-zinc-950 bg-zinc-950 px-4 py-2.5 text-sm font-semibold text-white">
                     저장
                  </span>
                  <span className="inline-flex items-center justify-center rounded-md border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-800">
                     삭제
                  </span>
               </div>
            </div>
         </section>
      </StudioPanelShell>
   );
}

function ReplacementSettingsMockup() {
   return (
      <StudioPanelShell activeTab="replacement">
         <section className="border border-zinc-200 bg-white px-4 py-4 sm:px-5">
            <div className="space-y-4">
               <div className="border border-zinc-300 bg-white">
                  <div className="border-b border-zinc-300 px-3 py-2">
                     <p className="text-sm font-medium text-zinc-900">현재 설정중인 단어 치환</p>
                  </div>
                  <ul className="max-h-[220px] divide-y divide-zinc-200 overflow-auto">
                     {maskedReplacementPreview.map(([before, after], index) => (
                        <li key={`${before}-${after}`}>
                           <div
                              className={`px-3 py-2 text-sm ${
                                 index === 0 ? "bg-[#fbf7ef]" : "bg-white"
                              }`}
                           >
                               <p className="font-medium text-zinc-950">
                                  <MaskedText>{before}</MaskedText>
                               </p>
                               <p className="text-xs text-zinc-500">
                                  <MaskedText className="blur-[4px]">{after}</MaskedText>
                               </p>
                           </div>
                        </li>
                     ))}
                  </ul>
               </div>

               <div className="grid gap-4 md:grid-cols-[120px_1fr] md:items-center">
                  <label className="text-sm text-zinc-700">치환할 단어:</label>
                  <div className="rounded-md border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-400">
                     치환할 단어 입력
                  </div>

                  <label className="text-sm text-zinc-700">치환된 단어:</label>
                  <div className="rounded-md border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-400">
                     치환된 단어 입력
                  </div>
               </div>

               <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center justify-center rounded-md border border-zinc-950 bg-zinc-950 px-4 py-2.5 text-sm font-semibold text-white">
                     저장
                  </span>
                  <span className="inline-flex items-center justify-center rounded-md border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-800">
                     삭제
                  </span>
               </div>
            </div>
         </section>
      </StudioPanelShell>
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
      "플로우머스에서 사용하는 소싱 사이트들은 실시간 업데이트 연동이 가능합니다.",
   ];

   return (
      <section
         id="visitor-stock-update"
         className="scroll-mt-24 bg-[#f1ebe1] py-16 md:py-24"
      >
         <div className="mx-auto max-w-[1500px] px-4 sm:px-6 xl:px-8">
            <div className="mx-auto max-w-4xl text-center">
               <div className="flex flex-wrap items-center justify-center gap-2">
                  <span className="inline-flex rounded-md border border-amber-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-amber-900">
                     실시간 방문자 재고 업데이트
                  </span>
                  <span className="inline-flex rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-900">
                     유료 기능
                  </span>
               </div>
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
               <p className="mx-auto mt-3 max-w-3xl text-sm font-medium leading-7 text-amber-900">
                  이 기능은 별도 유료 기능으로 제공되며, 사이트 환경과 트래픽 규모에 따라 적용 범위와 이용료가 달라질 수 있습니다.
               </p>
            </div>

            <div className="mt-10 grid gap-5 xl:grid-cols-[1fr_auto_1fr] xl:items-center">
               <ProductUpdateMockup />
               <div className="hidden h-12 w-12 items-center justify-center rounded-full border border-amber-200 bg-white text-2xl font-semibold text-amber-900 shadow-sm xl:flex">
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
                        <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#8c6333] text-sm font-bold text-white">
                           ✓
                        </span>
                        <span>{benefit}</span>
                     </div>
                  ))}
               </div>

               <div className="rounded-lg border border-amber-200 bg-white p-6 shadow-sm">
                  <h3 className="text-2xl font-semibold text-zinc-950">
                     이용료 안내
                  </h3>
                  <div className="mt-5 space-y-4 text-sm leading-7 text-zinc-600">
                     <p>
                        Pro 플랜 이상은 사이트당 월 15만원으로 이용할 수 있으며,
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
         label: "최소 금액",
         description: "이 마진식을 적용할 상품 가격의 시작 금액입니다.",
      },
      {
         label: "최대 금액",
         description: "이 마진식을 적용할 상품 가격의 마지막 금액입니다.",
      },
      {
         label: "최소 마진",
         description:
            "마진값을 적용한 최종 가격에 추가하거나 빼는 고정 금액입니다.",
      },
      {
         label: "마진 값 (%)",
         description: "해당 금액 구간에 적용할 기본 마진율입니다.",
      },
      {
         label: "환율 (유로)",
         description:
            "기준 환율을 직접 입력해 사용합니다. 예를 들어 1700처럼 현재 운영 기준에 맞는 값을 넣어 설정합니다.",
      },
      {
         label: "거래처 할인율",
         description:
            "거래처가 브랜드별로 제공하는 공급가 할인율입니다. 예를 들어 3% 또는 5%처럼 입력하면 실제 매입 원가가 더 낮아져, 같은 마진율을 유지하면서도 판매가 경쟁력을 높이는 데 도움이 됩니다.",
      },
      {
         label: "사이트",
         description:
            "마진식을 적용할 사이트를 선택하는 항목입니다. 구독한 사이트별로 각각 다른 마진식을 설정할 수 있습니다.",
      },
   ];

   return (
      <section id="margin-feature" className="scroll-mt-24 py-16 md:py-24">
         <div className="mx-auto max-w-[1500px] px-4 sm:px-6 xl:px-8">
            <div className="mx-auto max-w-4xl text-center">
               <span className="inline-flex rounded-md border border-amber-200 bg-[#fbf7ef] px-2.5 py-1.5 text-xs font-semibold text-amber-900">
                  마진 기능 사용법
               </span>
               <h2 className="mt-4 text-3xl font-semibold leading-tight md:text-4xl md:leading-tight">
                  금액대별로 원하는 마진식을 직접 설정합니다
               </h2>
               <p className="mx-auto mt-5 max-w-3xl text-base leading-8 text-zinc-600">
                  현재 웹 대시보드에서는 상단 마진 탭으로 이동하면 사용 중인 마진 목록과
                  입력 폼을 한 화면에서 바로 볼 수 있습니다. 금액대별 마진율은 물론 환율과
                  거래처 할인율까지 함께 반영해 실제 운영 환경에 맞는 판매가를 세밀하게
                  설정할 수 있습니다.
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
                           먼저 현재 설정중인 마진 목록에서 기준을 확인하고, 아래 입력창에
                           최소 금액, 최대 금액, 최소 마진, 마진 값(%)을 입력해 사용합니다.
                        </p>
                        <p className="rounded-lg border border-amber-200 bg-[#fbf7ef] p-4 text-zinc-900">
                           환율은 예를 들어 <span className="font-semibold">1700</span>처럼 현재 운영 기준에 맞는 값을 입력하면 됩니다.
                           거래처 할인율은 브랜드별 공급가 할인율을 넣는 항목으로, 예를 들어 <span className="font-semibold">3</span> 또는 <span className="font-semibold">5</span>처럼 입력해 실제 매입 원가를 더 정확하게 반영할 수 있습니다.
                        </p>
                        <p>
                           거래처 할인율이 반영되면 같은 마진율을 유지하더라도 판매가를 더 경쟁력 있게 설정할 수 있어, 가격 메리트와 노출 경쟁력 확보에 도움이 됩니다.
                        </p>
                        <p>
                           그 다음 마진식을 적용할 사이트를 선택하면 해당 사이트 운영 기준에
                           맞는 마진 설정을 저장할 수 있습니다.
                        </p>
                     </div>
                  </div>

                  <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-6 shadow-sm">
                     <h3 className="text-2xl font-semibold text-zinc-950">
                        저장과 삭제
                     </h3>
                     <div className="mt-5 space-y-4 text-sm leading-7 text-zinc-600">
                        <p>
                           입력이 끝나면 저장 버튼을 눌러 마진식을 추가하고, 같은 방식으로 여러 마진식을 이어서 설정할 수 있습니다.
                        </p>
                        <p>
                           삭제가 필요할 때는 현재 설정중인 마진 목록에서 원하는 마진식을 선택한 뒤 삭제 버튼을 누르면 됩니다.
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
               <span className="inline-flex rounded-md border border-amber-200 bg-[#fbf7ef] px-2.5 py-1.5 text-xs font-semibold text-amber-900">
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

const programFlowVideoCues = [
   {
      start: 0,
      end: 3,
      lines: ["마이페이지에서 플로우머스 대시보드를 클릭합니다."],
   },
   {
      start: 3,
      end: 9,
      lines: ["구독한 사이트를 클릭합니다."],
   },
   {
      start: 9,
      end: 12,
      lines: ["구독한 사이트의 카테고리와", "내 쇼핑몰 카테고리가 노출됩니다."],
   },
   {
      start: 12,
      end: 16,
      lines: ["두 사이트의 카테고리를 선택하고", "매핑 버튼을 클릭합니다."],
   },
   {
      start: 16,
      end: 18,
      lines: ["매핑한 카테고리와 수집 카테고리에 자동 등록됩니다."],
   },
   {
      start: 18,
      end: 21,
      lines: ["수집 카테고리에서 원하는 항목을 체크한 뒤", "수집 예약을 클릭합니다."],
   },
   {
      start: 21,
      end: 26,
      lines: ["예약 성공이 나오면 완료입니다.", "(수집 시작 시 카카오톡 알림이 전송됩니다.)"],
   },
   {
      start: 26,
      end: 33,
      lines: ["내 쇼핑몰에서 등록된 상품을 확인할 수 있습니다."],
   },
   {
      start: 33,
      end: 39,
      lines: ["등록되고 있는 상품입니다.", "상품 하나를 확인해보겠습니다."],
   },
   {
      start: 39,
      end: 47,
      lines: ["상품이 잘 등록되었습니다.", "(쇼핑몰에 따라 노출되는 디자인은 다를 수 있습니다.)"],
   },
   {
      start: 47,
      end: 53,
      lines: [
         "상세페이지를 확인하시면 됩니다.",
         "(세팅 시 원하시는 홍보 이미지를 상세페이지 상하단에 넣어드릴 수 있습니다.)",
      ],
   },
   {
      start: 53,
      end: 60,
      lines: ["이후 작업부터는 매핑할 필요 없이", "수집 예약 버튼만 클릭하면 됩니다."],
   },
];

function ProgramDemoSection() {
   const demoVideoSrc = "/program/flowmerce-demo.mp4";
   const hasDemoVideo = fs.existsSync(
      path.join(process.cwd(), "public", "program", "flowmerce-demo.mp4"),
   );

   return (
      <section className="bg-[#f1ebe1] py-16 md:py-24">
         <div className="mx-auto max-w-[1500px] px-4 sm:px-6 xl:px-8">
            <div className="mx-auto max-w-4xl text-center">
               <span className="inline-flex rounded-md border border-amber-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-amber-900">
                  실제 사용 영상
               </span>
               <h2 className="mt-4 text-3xl font-semibold leading-tight text-zinc-950 md:text-4xl md:leading-tight">
                  실제 상품 수집부터 쇼핑몰 등록 확인까지
                  <br />
                  단 1분이면 마스터 합니다.
               </h2>
               <p className="mx-auto mt-5 max-w-3xl text-base leading-8 text-zinc-600">
                  플로우머스 대시보드에서 사이트 선택, 카테고리 매핑, 수집 예약,
                  실제 쇼핑몰 등록 결과 확인까지 한 번에 확인하실 수 있습니다. 실제
                  상품 수집부터 상품 확인까지 단 1분이면 전체 사용 방법을 바로
                  따라가실 수 있습니다.
               </p>
            </div>

            <div className="mx-auto mt-10 max-w-6xl overflow-hidden rounded-[28px] border border-zinc-200 bg-white p-3 shadow-sm sm:p-4">
               {hasDemoVideo ? (
                  <ProgramFlowVideo
                     src={demoVideoSrc}
                     poster="/program/product-upload-smartstore.png"
                     cues={programFlowVideoCues}
                  />
               ) : (
                  <div className="rounded-[24px] border border-dashed border-zinc-300 bg-[#f7f4ef] px-6 py-10 text-center">
                     <p className="text-base font-semibold text-zinc-950">
                        실제 사용 영상이 곧 업데이트됩니다
                     </p>
                     <p className="mt-3 text-sm leading-7 text-zinc-600">
                        현재는 아래 기능 소개와 등록 예시 화면을 통해 전체 운영 방법을
                        먼저 확인하실 수 있습니다.
                     </p>
                  </div>
               )}
            </div>
         </div>
      </section>
   );
}
function WordReplacementFeatureSection() {
   const examples = [
      ["스니커즈", "운동화"],
      ["Gucci", "구찌"],
      ["재킷", "자켓"],
   ];

   return (
      <section
         id="word-replacement-feature"
         className="scroll-mt-24 bg-[#f1ebe1] py-16 md:py-24"
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
                  현재 웹 대시보드에서는 상단 치환 탭에서 치환할 단어와 치환된 단어를
                  바로 저장할 수 있습니다. 등록 개수 제한 없이 원하는 표현을 계속 추가할 수
                  있어 상품명과 상세 문구를 쇼핑몰 톤에 맞게 다듬을 수 있습니다. 삭제가
                  필요할 때는 현재 저장된 데이터 목록에서 원하는 항목을 누른 뒤 삭제 버튼을
                  누르면 됩니다.
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
                        <p className="my-2 text-sm font-semibold text-amber-900">
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
         <main className="bg-[#f7f4ef] text-zinc-950">
            <section className="bg-[linear-gradient(180deg,#f6efe4_0%,#ffffff_48%,#f7f4ef_100%)] py-16 md:py-24">
               <Container>
                  <div className="mx-auto max-w-4xl text-center">
                     <span className="inline-flex rounded-md border border-amber-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-amber-900 shadow-sm">
                        사용 메뉴얼
                     </span>
                     <h1 className="mt-5 text-4xl font-semibold leading-tight text-zinc-950 sm:text-5xl">
                        플로우머스 자동화 솔루션
                     </h1>
                     <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-zinc-600">
                        플로우머스는 상품수집, 재고·품절 관리, 실시간 상품 업데이트,
                        마진 설정, 단어 치환까지 한 흐름으로 이어지는 대시보드 사용 방법을
                        제공합니다.
                     </p>
                     <div className="mt-8 grid gap-3 md:grid-cols-2">
                        <GuideShortcut
                           href="#inventory-program"
                           title="상품수집·재고관리 흐름"
                           description="선택 된 호스팅 드롭다운부터 카테고리 매핑, 수집예약까지 현재 웹 화면 기준으로 볼 수 있습니다."
                        />
                        <GuideShortcut
                           href="#visitor-stock-update"
                           title="실시간 방문자 재고 업데이트"
                           description="방문자가 상품 상세페이지를 볼 때 가격과 옵션을 다시 확인하는 별도 유료 기능입니다."
                           paid
                        />
                        <GuideShortcut
                           href="#margin-feature"
                           title="마진 기능 사용법"
                           description="금액 구간별 마진과 환율, 할인율을 어떤 기준으로 설정하는지 확인할 수 있습니다."
                        />
                        <GuideShortcut
                           href="#word-replacement-feature"
                           title="단어치환 기능 사용법"
                           description="브랜드명, 소재명, 표현 방식을 운영 정책에 맞게 바꾸는 흐름을 안내합니다."
                        />
                     </div>
                     <div className="mt-4 rounded-lg border border-amber-200 bg-white/80 px-4 py-3 text-sm text-zinc-600 shadow-sm">
                        <span className="font-semibold text-amber-900">안내</span>{" "}
                        실시간 방문자 재고 업데이트는 별도 유료 기능이며, 적용 범위와 이용료는 상담 후 안내드립니다.
                     </div>
                  </div>
               </Container>
            </section>

            <VisitorStockUpdateSection />

            <section id="inventory-program" className="scroll-mt-24 py-16 md:py-24">
               <Container>
                  <div className="mx-auto mb-10 max-w-4xl rounded-lg border border-amber-200 bg-amber-50 p-5 text-center text-sm leading-7 text-amber-950 shadow-sm">
                     안내를 위해 사용된 화면 예시는 무단 도용 방지를 위해 실제
                     대시보드 UI를 그대로 노출하지 않고, 이용 흐름을 이해하기 쉽게
                     재구성한 예시입니다. 실제 기능 흐름과 사용 방식은 같은 기준으로
                     안내됩니다.
                  </div>

                  <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
                     <div>
                        <span className="inline-flex rounded-md border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-xs font-semibold text-zinc-700">
                           01. 사이트 로그인
                        </span>
                        <h2 className="mt-4 text-3xl font-semibold leading-tight md:text-4xl md:leading-tight">
                           플로우머스 계정으로 로그인합니다
                        </h2>
                        <div className="mt-5 space-y-4 text-base leading-8 text-zinc-600">
                           <p>
                              로그인 화면이 나타나며, 로그인 ID와 비밀번호는
                              플로우머스 사이트 계정과 동일합니다.
                           </p>
                           <p>
                              비밀번호가 기억나지 않는 경우에는 플로우머스에 문의해주세요.
                              계정 확인 후 안내해드립니다.
                           </p>
                           <p className="rounded-lg border border-amber-200 bg-[#fbf7ef] p-4 text-sm leading-7 text-zinc-800">
                              중요한 점은, 관리자 승인이 완료된 계정부터 로그인이
                              가능하다는 것입니다. 승인 완료 시 별도로 안내를 드립니다.
                           </p>
                        </div>
                     </div>
                     <LoginMockup />
                  </div>
               </Container>
            </section>

            <section className="bg-[#f1ebe1] py-16 md:py-24">
               <div className="mx-auto max-w-[1500px] px-4 sm:px-6 xl:px-8">
                  <div className="mx-auto max-w-4xl text-center">
                     <span className="inline-flex rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-zinc-700">
                        02. 선택 된 호스팅 선택
                     </span>
                     <h2 className="mt-4 text-3xl font-semibold leading-tight md:text-4xl md:leading-tight">
                        이 화면에서 드롭다운으로
                        <br />
                        원하는 호스팅을 바로 선택합니다
                     </h2>
                     <p className="mx-auto mt-5 max-w-3xl text-base leading-8 text-zinc-600">
                        현재 웹 대시보드에서는 우측 상단의 선택 된 호스팅 드롭다운을 눌러
                        플로우머스가 연결해둔 계정 중 원하는 호스팅을 바로 고르면 됩니다.
                        예전처럼 별도 로그인 단계를 다시 거치지 않고, 이 화면에서 바로 다음
                        작업으로 이어집니다.
                     </p>
                  </div>

                  <div className="mt-10">
                     <ProgramWindow mode="hosting" />
                  </div>
               </div>
            </section>

            <section className="bg-[#f1ebe1] py-16 md:py-24">
               <div className="mx-auto max-w-[1500px] px-4 sm:px-6 xl:px-8">
                  <div className="mx-auto max-w-4xl text-center">
                     <span className="inline-flex rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-zinc-700">
                        03. 카테고리 목록 확인
                     </span>
                     <h2 className="mt-4 text-3xl font-semibold leading-tight md:text-4xl md:leading-tight">
                        사이트 버튼을 누르면
                        <br />
                        카테고리가 자동으로 준비됩니다
                     </h2>
                     <p className="mx-auto mt-5 max-w-3xl text-base leading-8 text-zinc-600">
                        이용할 사이트 버튼을 누르면 사이트 카테고리와 쇼핑몰 카테고리
                        목록이 이 화면에 표시됩니다. 두 영역은 플로우머스가 미리 세팅해드리기
                        때문에, 고객님은 목록을 확인하고 필요한 카테고리만 매핑해주시면 됩니다.
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
                     <span className="inline-flex rounded-md border border-amber-200 bg-[#fbf7ef] px-2.5 py-1.5 text-xs font-semibold text-amber-900">
                        04. 카테고리 매핑
                     </span>
                     <h2 className="mt-4 text-3xl font-semibold leading-tight md:text-4xl md:leading-tight">
                        사이트 카테고리와 쇼핑몰 카테고리를 선택한 뒤 매핑합니다
                     </h2>
                     <p className="mx-auto mt-5 max-w-3xl text-base leading-8 text-zinc-600">
                        사이트 카테고리와 쇼핑몰 카테고리를 선택한 뒤 매핑 버튼을 누르면
                        매핑한 카테고리와 수집 카테고리 양쪽에 연결된 카테고리가 함께
                        잡히게 됩니다. 이 작업은 최초 1회만 직접 진행하면 됩니다.
                     </p>
                  </div>

                  <div className="mt-10">
                     <ProgramWindow mode="mapped" />
                  </div>
               </div>
            </section>

            <section className="bg-[#f1ebe1] py-16 md:py-24">
               <div className="mx-auto max-w-[1500px] px-4 sm:px-6 xl:px-8">
                  <div className="mx-auto max-w-4xl text-center">
                     <span className="inline-flex rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-zinc-700">
                        05. 수집예약 요청
                     </span>
                     <h2 className="mt-4 text-3xl font-semibold leading-tight md:text-4xl md:leading-tight">
                        원하는 수집 카테고리에 체크하고
                        <br />
                        수집예약 요청만 누르면 끝입니다
                     </h2>
                     <p className="mx-auto mt-5 max-w-3xl text-base leading-8 text-zinc-600">
                        수집 카테고리 영역에서 원하는 카테고리에 체크한 뒤 가장 아래의
                        수집예약 요청 버튼을 누르면 됩니다. 한 번 매핑해둔 뒤에는 필요한
                        카테고리만 골라 요청하는 흐름으로 훨씬 간단하게 운영할 수 있습니다.
                     </p>
                  </div>

                  <div className="mt-10">
                     <ProgramWindow mode="collected" />
                  </div>

                  <div className="mx-auto mt-8 max-w-4xl rounded-lg border border-amber-200 bg-white p-6 text-center shadow-sm">
                     <h3 className="text-2xl font-semibold text-zinc-950">
                        카테고리 매핑은 최초 1회만, 이후에는 수집예약만 누르면 됩니다
                     </h3>
                     <p className="mx-auto mt-4 max-w-3xl text-base leading-8 text-zinc-600">
                        최초 매핑 이후부터는 수집 카테고리에서 원하는 항목만 체크하고
                        수집예약 요청을 누르면 됩니다. 상품등록과 재고관리 요청이 같은
                        화면에서 자연스럽게 이어지도록 정리한 흐름입니다.
                     </p>
                     <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
                        <Link
                           href="/inquiry"
                           className="inline-flex justify-center rounded-lg border border-zinc-950 bg-zinc-950 px-5 py-3 text-sm font-semibold text-white shadow-sm duration-150 hover:bg-[#8c6333]"
                        >
                           문의 남기기
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

            <ProgramDemoSection />

            <UploadedProductShowcaseSection />

            <MarginFeatureSection />

            <WordReplacementFeatureSection />
         </main>
         <Footer />
      </>
   );
}
