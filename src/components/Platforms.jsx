import Image from "next/image";
import Container from "./Container";

export default function Platforms() {
   const activeStatus = {
      status: "운영 중",
      statusTone: "text-emerald-700",
      statusType: "active",
   };
   const pendingStatus = {
      status: "준비 중",
      statusTone: "text-rose-700",
      statusType: "pending",
   };
   const platforms = [
      {
         name: "카페24",
         logo: "/platforms/cafe24.png",
         logoClassName: "max-h-11 w-20",
         ...activeStatus,
         description:
            "자사몰 운영 자동화와 상품 관리 흐름을 안정적으로 연결하기 좋습니다.",
      },
      {
         name: "고도몰",
         logo: "/platforms/godomall.png",
         logoClassName: "max-h-9 w-16",
         ...activeStatus,
         description:
            "독립몰 운영과 구매대행 상품 관리 구조를 함께 가져가기 좋은 플랫폼입니다.",
      },
      {
         name: "스마트스토어",
         logo: "/platforms/smartstore-card.png",
         logoClassName: "max-h-20 w-28",
         ...activeStatus,
         description:
            "검색 노출과 판매 전환을 빠르게 확인해야 하는 채널 운영에 잘 맞습니다.",
      },
      {
         name: "메이크샵",
         logo: "/platforms/makeshop.png",
         logoClassName: "max-h-9 w-16",
         ...activeStatus,
         description:
            "장기 운영에 익숙한 쇼핑몰 구조에서 상품 등록과 품절 관리를 이어가기 좋습니다.",
      },
      {
         name: "롯데ON",
         ...activeStatus,
         description:
            "종합몰 기반의 넓은 고객층까지 상품을 확장하기 위해 우선 준비 중입니다.",
      },
      {
         name: "쿠팡",
         logo: "/platforms/coupang.png",
         logoClassName: "max-h-7 w-16",
         ...activeStatus,
         description:
            "빠른 판매 반응과 재고 관리가 중요한 채널 확장에 활용할 수 있습니다.",
      },
      {
         name: "11번가",
         logo: "/platforms/11st-card.png",
         logoClassName: "max-h-10 w-20",
         ...activeStatus,
         description:
            "오픈마켓 확장과 가격 운영을 함께 관리해야 할 때 쓰기 좋습니다.",
      },
      {
         name: "옥션",
         logo: "/platforms/auction-card.png",
         logoClassName: "max-h-12 w-24",
         ...activeStatus,
         description:
            "대중 판매 채널까지 상품 노출 범위를 넓히는 운영에 잘 맞습니다.",
      },
      {
         name: "G마켓",
         logo: "/platforms/gmarket-card.png",
         logoClassName: "max-h-14 w-24",
         ...activeStatus,
         description:
            "오픈마켓 비중을 키우는 운영자에게 맞춰 상품 연동을 지원합니다.",
      },
      {
         name: "카카오쇼핑",
         ...activeStatus,
         description:
            "톡스토어와 카카오 쇼핑 흐름에 맞춰 판매 채널 확장을 검토합니다.",
      },
      {
         name: "SSG닷컴",
         ...pendingStatus,
         description:
            "프리미엄 소비층과 종합몰 운영을 함께 겨냥해 검토 중인 채널입니다.",
      },
      {
         name: "신세계몰",
         ...pendingStatus,
         description:
            "백화점형 판매 흐름에 맞춰 브랜드 상품 노출을 준비하고 있습니다.",
      },
      {
         name: "LFmall",
         ...pendingStatus,
         description:
            "패션 전문몰 성격에 맞춰 의류와 잡화 연동을 준비하는 채널입니다.",
      },
      {
         name: "CJ온스타일",
         ...pendingStatus,
         description:
            "라이프스타일형 판매처까지 운영 범위를 넓히기 위해 준비 중입니다.",
      },
      {
         name: "트렌비",
         logo: "/platforms/trenbe-card.jpg",
         logoClassName: "max-h-11 w-11 rounded-xl",
         ...pendingStatus,
         description:
            "명품 플랫폼 확장이 필요한 판매 흐름에 맞춰 준비 중인 채널입니다.",
      },
      {
         name: "머스트잇",
         logo: "/platforms/mustit-card.jpg",
         logoClassName: "max-h-[1.2rem] w-[3.65rem]",
         ...pendingStatus,
         description:
            "브랜드 중심 판매 채널 확장에 맞춰 순차적으로 연동할 예정입니다.",
      },
      {
         name: "필웨이",
         ...pendingStatus,
         description:
            "명품 카테고리 특화 판매 흐름에 맞춰 연동을 검토하고 있습니다.",
      },
      {
         name: "홈앤쇼핑",
         ...pendingStatus,
         description:
            "홈쇼핑 기반 판매 채널까지 확장할 수 있도록 준비 중입니다.",
      },
      {
         name: "GSSHOP",
         ...pendingStatus,
         description:
            "방송과 온라인 판매가 결합된 채널 운영을 위한 후보 플랫폼입니다.",
      },
      {
         name: "이마트몰",
         ...pendingStatus,
         description:
            "생활형 종합몰 고객층까지 상품 노출을 넓히기 위해 준비 중입니다.",
      },
      {
         name: "신세계V",
         ...pendingStatus,
         description:
            "신세계 계열 판매처 확장 흐름에 맞춰 검토 중인 채널입니다.",
      },
      {
         name: "ABLY(에이블리)",
         ...pendingStatus,
         description:
            "모바일 패션 소비층을 겨냥한 판매처로 확장 준비 중입니다.",
      },
      {
         name: "무신사",
         ...pendingStatus,
         description:
            "패션 전문 채널 특성에 맞춰 브랜드 상품 연동을 검토 중입니다.",
      },
      {
         name: "롯데백화점",
         ...pendingStatus,
         description:
            "백화점 판매처까지 운영 범위를 넓히기 위한 예정 채널입니다.",
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
                  자사몰과 스마트스토어, 주요 오픈마켓을 함께 운영하며
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
                           {platform.logo ? (
                              <Image
                                 src={platform.logo}
                                 alt={`${platform.name} 로고`}
                                 width={160}
                                 height={96}
                                 className={`${platform.logoClassName} max-w-none object-contain`}
                              />
                           ) : (
                              <span className="px-1 text-center text-[11px] font-semibold leading-tight text-zinc-700">
                                 {platform.name}
                              </span>
                           )}
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
