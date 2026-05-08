import Image from "next/image";
import Container from "./Container";
import { InstagramIcon } from "./icons/SocialLinkIcons";

export default function Contacts() {
   const kakaoUrl = "https://pf.kakao.com/_hPdjX/chat";
   const instagramUrl = "https://www.instagram.com/flowmerce.official/";
   const socialLinks = [
      { name: "Kakao chat", href: kakaoUrl, image: "/icons/kakaotalk.jpg" },
      { name: "Instagram", href: instagramUrl, icon: InstagramIcon },
   ];

   return (
      <section className="pt-16 md:pt-28" id="contact-us">
         <Container>
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-7 md:p-10">
               <h2 className="text-2xl font-semibold sm:text-3xl">
                  문의하기
               </h2>
               <p className="mt-3 max-w-xl text-sm leading-6 text-zinc-600">
                  플로우머스 도입, 플랜 선택, 사이트 요청, 1:1 컨설팅이 필요하면 편하게 연락주세요.
               </p>

               <div className="mt-8 grid grid-cols-1 gap-7 md:grid-cols-2">
                  <div className="space-y-6">
                     <div>
                        <p className="text-sm text-zinc-600">연락처</p>
                        <a
                           href="tel:+827080983779"
                           className="mt-2 block font-medium"
                        >
                           +82 070-8098-3779
                        </a>
                     </div>

                     <div>
                        <p className="text-sm text-zinc-600">이메일</p>
                        <a
                           href="mailto:contact@flowmerce.co.kr"
                           className="mt-2 block font-medium"
                        >
                           contact@flowmerce.co.kr
                        </a>
                     </div>
                  </div>

                  <div className="space-y-4">
                     <div>
                        <p className="text-sm text-zinc-600">24시 실시간 채팅</p>
                        <p className="mt-2 text-sm leading-6 text-zinc-600">
                           상품 자동화 상담과 컨설팅 문의는 카카오톡 채팅과 인스타그램 DM으로 빠르게 확인합니다.
                        </p>
                        <div className="mt-4 flex items-center gap-x-2.5">
                           {socialLinks.map((link) => (
                              <a
                                 key={link.name}
                                 href={link.href}
                                 target="_blank"
                                 rel="noopener noreferrer"
                                 className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 shadow-sm ring-1 ring-emerald-300 duration-150 hover:bg-emerald-50"
                              >
                                 {link.image ? (
                                    <Image
                                       src={link.image}
                                       alt={link.name}
                                       width={20}
                                       height={20}
                                       className="h-5 w-5 rounded object-cover"
                                    />
                                 ) : (
                                    <link.icon className="h-5 w-5 text-emerald-600" />
                                 )}
                              </a>
                           ))}
                        </div>
                     </div>
                  </div>
               </div>
            </div>
         </Container>
      </section>
   );
}
