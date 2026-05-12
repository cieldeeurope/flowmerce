import Image from "next/image";
import Container from "./Container";

export default function Platforms() {
   const platforms = [
      {
         name: "카페24",
         logo: "/platforms/cafe24.png",
         logoClassName: "max-h-11 w-20",
         status: "운영 중",
         statusTone: "text-emerald-700",
         statusType: "active",
         description:
            "자사몰 운영 자동화와 상품 관리 흐름을 안정적으로 연결하기 좋습니다.",
      },
      {
         name: "고도몰",
         logo: "/platforms/godomall.png",
         logoClassName: "max-h-9 w-16",
         status: "운영 중",
         statusTone: "text-emerald-700",
         statusType: "active",
         description:
            "독립몰 운영과 구매대행 상품 관리 구조를 함께 가져가기 좋은 플랫폼입니다.",
      },
      {
         name: "스마트스토어",
         logo: "/platforms/smartstore-card.png",
         logoClassName: "max-h-20 w-28",
         status: "운영 중",
         statusTone: "text-emerald-700",
         statusType: "active",
         description:
            "검색 노출과 판매 전환을 빠르게 확인해야 하는 채널 운영에 잘 맞습니다.",
      },
      {
         name: "메이크샵",
         logo: "/platforms/makeshop.png",
         logoClassName: "max-h-9 w-16",
         status: "운영 중",
         statusTone: "text-emerald-700",
         statusType: "active",
         description:
            "장기 운영에 익숙한 쇼핑몰 구조에서 상품 등록과 품절 관리를 이어가기 좋습니다.",
      },
      {
         name: "11번가",
         logo: "/platforms/11st-card.png",
         logoClassName: "max-h-10 w-20",
         status: "준비 중",
         statusTone: "text-rose-700",
         statusType: "pending",
         description:
            "오픈마켓 확장이 필요할 때 추가 운영 채널로 검토할 수 있습니다.",
      },
      {
         name: "옥션",
         logo: "/platforms/auction-card.png",
         logoClassName: "max-h-12 w-24",
         status: "준비 중",
         statusTone: "text-rose-700",
         statusType: "pending",
         description:
            "대중적인 판매 채널 확장 흐름이 필요한 경우 순차적으로 대응합니다.",
      },
      {
         name: "G마켓",
         logo: "/platforms/gmarket-card.png",
         logoClassName: "max-h-14 w-24",
         status: "준비 중",
         statusTone: "text-rose-700",
         statusType: "pending",
         description:
            "오픈마켓 비중이 커지는 운영자에게 맞춰 연동 범위를 확대해갈 예정입니다.",
      },
      {
         name: "트렌비",
         logo: "/platforms/trenbe-card.jpg",
         logoClassName: "max-h-11 w-11 rounded-xl",
         status: "준비 중",
         statusTone: "text-rose-700",
         statusType: "pending",
         description:
            "명품 플랫폼 확장이 필요한 흐름에 맞춰 준비 중인 채널입니다.",
      },
      {
         name: "머스트잇",
         logo: "/platforms/mustit-card.jpg",
         logoClassName: "max-h-[1.2rem] w-[3.65rem]",
         status: "준비 중",
         statusTone: "text-rose-700",
         statusType: "pending",
         description:
            "브랜드 중심 판매 채널 확장에 맞춰 순차적으로 연동할 예정입니다.",
      },
      {
         name: "쿠팡",
         logo: "/platforms/coupang.png",
         logoClassName: "max-h-7 w-16",
         status: "준비 중",
         statusTone: "text-rose-700",
         statusType: "pending",
         description:
            "필요한 운영 시점에 맞춰 추가 상담과 연동 요청을 받을 수 있습니다.",
      },
   ];

   return (
      <section className="pt-16 md:pt-28" id="platforms">
         <Container>
            <div className="space-y-4 sm:text-center">
               <span className="inline-flex rounded-full border border-amber-200 bg-[#fbf7ef] px-3 py-1 text-xs font-semibold text-amber-900">
                  Supported Platforms
               </span>
               <h2 className="mx-auto max-w-3xl text-2xl font-semibold sm:text-3xl md:text-4xl md:leading-tight">
                  현재 운영 중인 쇼핑몰과
                  <br />
                  확장 예정인 판매 채널
               </h2>
               <p className="mx-auto max-w-2xl text-zinc-600">
                  카페24, 고도몰, 스마트스토어, 메이크샵 중심으로 운영 중이며
                  추가 판매 채널은 요청과 운영 범위에 맞춰 계속 확장하고
                  있습니다.
               </p>
            </div>

            <div className="mt-10 grid gap-5 md:mt-14 md:grid-cols-2 lg:grid-cols-4">
               {platforms.map((platform) => (
                  <article
                     key={platform.name}
                     className="rounded-md border border-black/5 bg-white p-6 shadow-sm transition duration-200 hover:-translate-y-0.5"
                  >
                     <div className="flex items-center gap-x-4">
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-visible rounded-md border border-black/5 bg-[#faf7f2] p-1.5">
                           <Image
                              src={platform.logo}
                              alt={`${platform.name} 로고`}
                              width={160}
                              height={96}
                              className={`${platform.logoClassName} max-w-none object-contain`}
                           />
                        </div>
                        <div>
                           <h3 className="text-xl font-semibold">
                              {platform.name}
                           </h3>
                           <div
                              className={`mt-1 inline-flex items-center gap-1.5 text-xs font-semibold ${platform.statusTone}`}
                           >
                              <span
                                 className={`inline-flex h-4 w-4 items-center justify-center rounded-full text-[11px] ${
                                    platform.statusType === "active"
                                       ? "bg-emerald-100 text-emerald-700"
                                       : "bg-rose-100 text-rose-700"
                                 }`}
                              >
                                 {platform.statusType === "active" ? "✓" : "!"}
                              </span>
                              <span>{platform.status}</span>
                           </div>
                        </div>
                     </div>
                     <p className="mt-5 text-sm leading-6 text-zinc-600">
                        {platform.description}
                     </p>
                  </article>
               ))}
            </div>
         </Container>
      </section>
   );
}
