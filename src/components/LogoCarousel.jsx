import Image from "next/image";
import Container from "./Container";

export default function LogoCarousel() {
   const channels = [
      { name: "고도몰", logo: "/platforms/godomall.png" },
      { name: "카페24", logo: "/platforms/cafe24.png" },
      { name: "메이크샵", logo: "/platforms/makeshop.png" },
      { name: "스마트스토어", logo: "/platforms/smartstore-slide.png" },
      { name: "11번가", logo: "/platforms/11st-slide.png" },
      { name: "옥션", logo: "/platforms/auction-card.png" },
      { name: "G마켓", logo: "/platforms/gmarket-slide.png" },
      {
         name: "트렌비",
         logo: "/platforms/trenbe-slide.jpg",
         logoClassName: "max-h-12 w-40",
      },
      {
         name: "머스트잇",
         logo: "/platforms/mustit-card.jpg",
         logoClassName: "max-h-10 w-32",
      },
      { name: "쿠팡", logo: "/platforms/coupang.png" },
   ];

   return (
      <section className="relative bg-[#f7f4ef]">
         <Container>
            <div className="py-10 md:py-14">
               <div className="inline-flex w-full flex-nowrap overflow-hidden [mask-image:_linear-gradient(to_right,transparent_0,_black_128px,_black_calc(100%-128px),transparent_100%)]">
                  {Array.from({ length: 5 }).map((_, index) => (
                     <ul
                        key={index}
                        aria-hidden={index === 1}
                        className="flex shrink-0 animate-infinite-scroll items-center justify-start gap-x-4 pr-4"
                     >
                        {channels.map((channel) => (
                           <li key={`${channel.name}-${index}`}>
                              <div className="flex h-16 min-w-52 items-center justify-center rounded-md border border-black/5 bg-white px-5 py-3 shadow-sm">
                                 <Image
                                 src={channel.logo}
                                 alt={`${channel.name} 로고`}
                                 width={190}
                                 height={72}
                                 className={`${channel.logoClassName ?? "max-h-10 w-auto"} object-contain`}
                              />
                              </div>
                           </li>
                        ))}
                     </ul>
                  ))}
               </div>
            </div>
         </Container>

         <div className="relative -mt-4">
            <div
               className="absolute inset-0 flex items-center"
               aria-hidden="true"
            >
               <div className="w-full border-t border-black/5"></div>
            </div>
            <div className="relative flex justify-center">
               <div className="rounded-full border border-black/5 bg-white px-4 py-2 text-xs font-medium text-zinc-600 shadow-sm sm:text-sm">
                  운영 중인 플랫폼과 준비 중인 채널은 계속 확장됩니다
               </div>
            </div>
         </div>
      </section>
   );
}
