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
      { name: "쿠팡", logo: "/platforms/coupang.png" },
   ];

   return (
      <section className="relative">
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
                              <div className="flex h-16 min-w-52 items-center justify-center rounded-lg border border-zinc-200 bg-white px-5 py-3 shadow-sm">
                                 <Image
                                    src={channel.logo}
                                    alt={`${channel.name} 로고`}
                                    width={190}
                                    height={72}
                                    className="max-h-10 w-auto object-contain"
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
               <div className="w-full border-t border-zinc-200"></div>
            </div>
            <div className="relative flex justify-center">
               <div className="items-center rounded-full border border-zinc-200 bg-white px-3.5 py-1.5 text-xs font-medium text-zinc-600 shadow-sm sm:px-5 sm:py-2 sm:text-sm">
                  지원 플랫폼은 계속 확장됩니다
               </div>
            </div>
         </div>
      </section>
   );
}
