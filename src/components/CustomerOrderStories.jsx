import Image from "next/image";

const stories = [
   {
      id: "enterprise-orders",
      badge: "Enterprise 구독 중",
      label: "실제 이용자 주문 성과",
      title: "이번 주에 주문이 꽤 들어와서 운영이 더 재미있어졌어요.",
      description:
         "엔터프라이즈 구독으로 운영 중인 실제 주문 화면입니다. 초기 세팅 이후 1~2개월 차에 접어들면서 주문이 들어오기 시작했고, 짧은 기간에도 체감이 온다는 피드백을 받은 사례입니다.",
      quote:
         "엔터프라이즈 구독으로 쓰고 있는데 이번 주 단기간에 주문이 꽤 들어와줘서 너무 재밌어요. 이제는 상품만 올리는 느낌이 아니라, 진짜 매출이 움직이는 쇼핑몰을 운영하는 기분이에요.",
      image: "/cases/actual-order-proof-1.png",
      imageAlt: "엔터프라이즈 구독 고객의 실제 주문 화면 예시",
      width: 1856,
      height: 700,
   },
   {
      id: "smartstore-orders",
      badge: "Smart Store Pro 구독 중",
      label: "첫 판매 경험",
      title: "상담도 꾸준히 들어오고 첫 주문까지 나오면서 생각보다 훨씬 수월해요.",
      description:
         "스마트스토어 Pro 구독 고객의 실제 주문 화면입니다. 처음 판매가 일어나기 전 가장 막연했던 구간을 넘기고, 상담 유입과 실제 주문이 함께 생기기 시작한 사례입니다.",
      quote:
         "Pro 플랜 결제 후 스마트스토어로 시작했는데 상담도 꽤 들어오고 이번에 주문도 들어와서 처음 팔아봤어요. 생각보다 제가 할 게 많지 않아서 더 놀랐고, 체계가 잡히니까 혼자서도 충분히 운영되네요.",
      image: "/cases/actual-order-proof-2.png",
      imageAlt: "스마트스토어 Pro 구독 고객의 실제 주문 화면 예시",
      width: 1888,
      height: 416,
   },
];

export default function CustomerOrderStories() {
   return (
      <section className="py-18 md:py-24">
         <div className="mx-auto max-w-[1680px] px-4 sm:px-6 xl:px-8">
            <div className="rounded-[28px] border border-black/5 bg-white p-5 shadow-sm sm:p-7 md:p-8 xl:p-10">
               <div className="mx-auto max-w-4xl text-center">
                  <span className="inline-flex rounded-full border border-amber-200 bg-[#fbf7ef] px-3 py-1 text-xs font-semibold text-amber-900">
                     실제 이용자 주문 성과
                  </span>
                  <h2 className="mt-4 text-3xl font-semibold leading-tight text-zinc-950 md:text-4xl md:leading-tight">
                     실제 이용자 분들의 1~2개월만의 주문 성과
                  </h2>
                  <p className="mt-5 text-base leading-8 text-zinc-600">
                     막연하게 느껴질 수 있는 초반 운영 구간도, 세팅 이후 운영 방식이
                     잡히면 상담과 주문이 실제로 들어오기 시작합니다. 아래 이미지는 실제
                     이용자분들이 공유해주신 주문 화면 기준 사례입니다.
                  </p>
               </div>

               <div className="mt-10 space-y-8">
                  {stories.map((story) => (
                     <article
                        key={story.id}
                        className="rounded-[32px] border border-zinc-200 bg-[#faf7f2] p-5 shadow-sm sm:p-6 lg:p-8 xl:p-9"
                     >
                        <div className="grid gap-6 xl:grid-cols-[1.12fr_0.88fr] xl:items-start">
                           <div>
                              <div className="flex flex-wrap items-center gap-2">
                                 <span className="rounded-full border border-amber-200 bg-[#fbf7ef] px-3 py-1 text-xs font-semibold text-amber-900">
                                    {story.badge}
                                 </span>
                                 <span className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-semibold text-zinc-600">
                                    {story.label}
                                 </span>
                              </div>
                              <h3 className="mt-5 text-3xl font-semibold leading-tight text-zinc-950">
                                 {story.title}
                              </h3>
                              <p className="mt-5 max-w-3xl text-base leading-8 text-zinc-600">
                                 {story.description}
                              </p>
                           </div>

                           <div className="rounded-[28px] border border-amber-200 bg-[#fbf7ef] p-5 sm:p-6">
                              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-900">
                                 Voice
                              </p>
                              <p className="mt-4 text-sm leading-8 text-zinc-700 sm:text-[15px]">
                                 &ldquo;{story.quote}&rdquo;
                              </p>
                           </div>
                        </div>

                        <div className="mt-8 overflow-hidden rounded-[26px] border border-zinc-200 bg-white shadow-sm">
                           <Image
                              src={story.image}
                              alt={story.imageAlt}
                              width={story.width}
                              height={story.height}
                              className="h-auto w-full"
                              sizes="(min-width: 1680px) 1520px, (min-width: 1024px) 94vw, 100vw"
                           />
                        </div>

                        <p className="mt-4 text-xs leading-6 text-zinc-500">
                           실제 주문 화면 기준이며, 개인정보 및 민감 정보는 비식별 처리되어
                           있습니다.
                        </p>
                     </article>
                  ))}
               </div>
            </div>
         </div>
      </section>
   );
}
