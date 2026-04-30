import Container from "./Container";

const reactions = [
   {
      id: 1,
      text: "생각보다 손이 많이 안 가서 놀랐습니다. 상품만 쌓이는 느낌이 아니라 운영 흐름이 정리되니까 본업처럼 계속 해볼 수 있겠다는 확신이 생겼어요.",
      author: {
         label: "스마트스토어 운영",
         detail: "부업 셀러",
         avatar: {
            type: "initial",
            text: "김",
            className: "bg-emerald-100 text-emerald-700 ring-emerald-200",
         },
      },
   },
   {
      id: 2,
      text: "연간 구독으로 넘어간 이유가 분명했습니다. 사이트 하나하나 직접 붙잡고 있을 때보다 훨씬 체계적이고, 문의했을 때 답이 빠른 점도 만족스러웠어요.",
      author: {
         label: "카페24 운영",
         detail: "연간 구독 전환",
         avatar: {
            type: "cover",
            text: "SEO",
            className:
               "bg-gradient-to-br from-sky-500 via-cyan-400 to-emerald-300 text-white ring-sky-200",
         },
      },
   },
   {
      id: 3,
      text: "컨설팅이 막연한 설명이 아니라 실제로 어디서 매출이 나는지부터 짚어줘서 좋았습니다. 명품 좋아하는 입장에서 팔아보는 재미까지 생겼어요.",
      author: {
         label: "구매대행 입문",
         detail: "컨설팅 진행",
         avatar: {
            type: "initial",
            text: "이",
            className: "bg-violet-100 text-violet-700 ring-violet-200",
         },
      },
   },
   {
      id: 4,
      text: "예전에는 상품만 많이 올리면 될 줄 알았는데, 여기서는 어떤 구조로 운영해야 하는지가 먼저 잡혀요. 그게 생각보다 차이가 큽니다.",
      author: {
         label: "고도몰 운영",
         detail: "초기 셋팅 완료",
         avatar: {
            type: "cover",
            text: "서울",
            className:
               "bg-gradient-to-br from-slate-700 via-slate-600 to-slate-500 text-white ring-slate-300",
         },
      },
   },
   {
      id: 5,
      text: "단어 치환이랑 마진 설정을 같이 쓰니까 운영이 훨씬 편해졌습니다. 비슷한 상품이 반복돼도 사이트가 덜 밋밋해 보이는 점이 좋았어요.",
      author: {
         label: "상품등록 자동화 이용",
         detail: "마진 설정 활용",
         avatar: {
            type: "initial",
            text: "박",
            className: "bg-amber-100 text-amber-700 ring-amber-200",
         },
      },
   },
   {
      id: 6,
      text: "전업까지 바로 생각한 건 아니었는데, 흐름을 보니까 충분히 키울 수 있겠다는 느낌이 들었습니다. 희망이 생긴다는 말이 딱 맞아요.",
      author: {
         label: "부업 셀러",
         detail: "프로 플랜 상담",
         avatar: {
            type: "cover",
            text: "PRO",
            className:
               "bg-gradient-to-br from-indigo-600 via-blue-500 to-sky-400 text-white ring-indigo-200",
         },
      },
   },
   {
      id: 7,
      text: "하이엔드 쪽은 어렵게만 느꼈는데 접근 방식부터 달라서 좋았습니다. 단순히 제품을 올리는 툴이 아니라 운영 감각까지 같이 가져가는 느낌이에요.",
      author: {
         label: "명품 카테고리 운영",
         detail: "확장 준비 중",
         avatar: {
            type: "initial",
            text: "최",
            className: "bg-rose-100 text-rose-700 ring-rose-200",
         },
      },
   },
   {
      id: 8,
      text: "실시간으로 응대가 되니까 막히는 부분을 오래 끌지 않게 됩니다. 혼자 하면 불안한 구간들이 있는데 그게 많이 줄었어요.",
      author: {
         label: "메이크샵 운영",
         detail: "실시간 응대 만족",
         avatar: {
            type: "cover",
            text: "SHOP",
            className:
               "bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-600 text-white ring-zinc-300",
         },
      },
   },
   {
      id: 9,
      text: "명품을 좋아해서 시작했는데 실제 판매 구조로 연결되는 설명을 들으니 훨씬 매력적으로 느껴졌습니다. 취향이 수익 구조로 이어질 수 있다는 게 좋았어요.",
      author: {
         label: "명품 관심 고객",
         detail: "입문 상담 후 구독 검토",
         avatar: {
            type: "initial",
            text: "정",
            className: "bg-cyan-100 text-cyan-700 ring-cyan-200",
         },
      },
   },
];

function StarRating() {
   return (
      <div className="flex items-center gap-1 text-amber-400" aria-label="별점 5점">
         {Array.from({ length: 5 }).map((_, index) => (
            <span key={index} className="text-sm leading-none">
               ★
            </span>
         ))}
      </div>
   );
}

function AvatarBadge({ avatar }) {
   const sharedClassName =
      "flex h-13 w-13 shrink-0 items-center justify-center rounded-full text-sm font-semibold shadow-sm ring-1";

   if (avatar.type === "cover") {
      return (
         <div
            className={`flex h-13 w-13 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold tracking-[0.08em] shadow-sm ring-1 ${avatar.className}`}
         >
            {avatar.text}
         </div>
      );
   }

   return <div className={`${sharedClassName} ${avatar.className}`}>{avatar.text}</div>;
}

export default function Testimonials() {
   return (
      <section className="py-16 md:py-24" id="testimonials">
         <Container>
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-5 shadow-sm sm:p-7 md:p-8">
               <div className="mx-auto max-w-3xl text-center">
                  <span className="inline-flex rounded-md border border-emerald-300 bg-emerald-100 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 shadow-sm">
                     현장에서 많이 나오는 반응
                  </span>
                  <h2 className="mt-4 text-3xl font-semibold leading-tight text-zinc-950 md:text-4xl md:leading-tight">
                     상담부터 실제 운영까지,
                     <br />
                     이런 이야기를 가장 많이 듣습니다
                  </h2>
                  <p className="mt-5 text-base leading-8 text-zinc-600">
                     플로우머스를 경험해본 사람들의 반응은 생각보다 더 만족도가 높습니다.
                     <br />
                     운영 부담, 컨설팅 만족도, 전업 가능성, 명품 판매의 재미까지 가장 자주 나오는 반응들입니다.
                  </p>
               </div>

               <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {reactions.map((reaction) => (
                     <article
                        key={reaction.id}
                        className="flex h-full flex-col justify-between rounded-lg border border-zinc-200 bg-white p-5 shadow-sm transition-transform duration-150 hover:-translate-y-0.5"
                     >
                        <div>
                           <StarRating />
                           <p className="mt-4 text-sm leading-7 text-zinc-700 sm:text-[15px]">
                              {reaction.text}
                           </p>
                        </div>

                        <div className="mt-6 flex items-center gap-3 border-t border-zinc-100 pt-4">
                           <AvatarBadge avatar={reaction.author.avatar} />
                           <div className="min-w-0">
                              <p className="text-sm font-semibold text-zinc-950">
                                 {reaction.author.label}
                              </p>
                              <p className="text-xs leading-6 text-zinc-500">
                                 {reaction.author.detail}
                              </p>
                           </div>
                        </div>
                     </article>
                  ))}
               </div>
            </div>
         </Container>
      </section>
   );
}
