import Image from "next/image";
import Container from "./Container";
import { CheckIcon } from "./icons/CheckIcon";

export default function Platforms() {
   const platforms = [
      {
         name: "카페24",
         logo: "/platforms/cafe24.png",
         logoClassName: "max-h-11 w-20",
         status: "연동 지원",
         statusTone: "text-emerald-600",
         description: "국내 쇼핑몰 구축과 확장성이 좋아 자사몰 운영 자동화에 적합합니다.",
      },
      {
         name: "고도몰",
         logo: "/platforms/godomall.png",
         logoClassName: "max-h-9 w-16",
         status: "연동 지원",
         statusTone: "text-emerald-600",
         description: "독립몰 운영과 상품 관리 기능이 탄탄해 구매대행 셀러에게 잘 맞습니다.",
      },
      {
         name: "스마트스토어",
         logo: "/platforms/smartstore-card.png",
         logoClassName: "max-h-20 w-28",
         status: "연동 지원",
         statusTone: "text-emerald-600",
         description: "네이버 쇼핑 검색과 연동되어 초기 판매 채널로 활용하기 좋습니다.",
      },
      {
         name: "메이크샵",
         logo: "/platforms/makeshop.png",
         logoClassName: "max-h-9 w-16",
         status: "연동 지원",
         statusTone: "text-emerald-600",
         description: "오랜 운영 안정성과 쇼핑몰 관리 기능으로 장기 운영에 강점이 있습니다.",
      },
      {
         name: "11번가",
         logo: "/platforms/11st-card.png",
         logoClassName: "max-h-10 w-20",
         status: "준비중",
         statusTone: "text-red-600",
         description: "오픈마켓 고객층이 넓어 가격 경쟁력 있는 상품 노출에 유리합니다.",
      },
      {
         name: "옥션",
         logo: "/platforms/auction-card.png",
         logoClassName: "max-h-12 w-24",
         status: "준비중",
         statusTone: "text-red-600",
         description: "오랜 거래 기반과 카테고리 운영 경험이 쌓인 오픈마켓 채널입니다.",
      },
      {
         name: "G마켓",
         logo: "/platforms/gmarket-card.png",
         logoClassName: "max-h-14 w-24",
         status: "준비중",
         statusTone: "text-red-600",
         description: "검색과 프로모션 활용도가 높아 대중적인 상품 운영에 적합합니다.",
      },
      {
         name: "쿠팡",
         logo: "/platforms/coupang.png",
         logoClassName: "max-h-7 w-16",
         status: "준비중",
         statusTone: "text-red-600",
         description: "빠른 구매 전환과 높은 트래픽을 기대할 수 있는 대표 커머스 채널입니다.",
      },
   ];

   return (
      <section className="pt-16 md:pt-28" id="platforms">
         <Container>
            <div className="space-y-4 sm:text-center">
               <span className="inline-flex rounded-md border border-emerald-300 bg-emerald-100 px-2.5 py-1.5 text-xs font-semibold text-emerald-600 shadow-sm">
                  Platforms
               </span>
               <h2 className="mx-auto max-w-2xl text-2xl font-semibold sm:text-3xl md:text-4xl md:leading-tight">
                  플로우머스가 제공하는 자동화 셋팅
               </h2>
               <p className="mx-auto max-w-2xl text-zinc-600">
                  카페24, 고도몰, 스마트스토어, 메이크샵을 지원합니다. 별도 사이트나 플랫폼 구축 요청은 상담을 통해 요청해주세요. 앞으로 연동 가능한 플랫폼은 계속 확장됩니다.
               </p>
            </div>

            <div className="mt-10 grid gap-7 md:mt-14 md:grid-cols-2 lg:grid-cols-4">
               {platforms.map((platform) => (
                  <div
                     key={platform.name}
                     className="rounded-lg border border-zinc-200 bg-white p-7 shadow-sm"
                  >
                     <div className="flex items-center gap-x-4">
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-visible rounded-lg border border-zinc-200 bg-white p-1.5 shadow-sm">
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
                           <div className="mt-1 flex items-center gap-x-1.5 text-xs font-medium text-emerald-600">
                              <CheckIcon className={`h-4 w-4 ${platform.statusTone}`} />
                              <span className={platform.statusTone}>
                                 {platform.status}
                              </span>
                           </div>
                        </div>
                     </div>
                     <p className="mt-5 text-sm leading-6 text-zinc-600">
                        {platform.description}
                     </p>
                  </div>
               ))}
            </div>
         </Container>
      </section>
   );
}
