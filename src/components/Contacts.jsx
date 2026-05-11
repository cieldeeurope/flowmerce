import Image from "next/image";
import Link from "next/link";
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
            <div className="rounded-md border border-black/5 bg-white p-7 shadow-sm md:p-10">
               <div className="grid grid-cols-1 gap-8 md:grid-cols-[0.9fr_1.1fr] md:items-start">
                  <div>
                     <span className="inline-flex rounded-full border border-amber-200 bg-[#fbf7ef] px-3 py-1 text-xs font-semibold text-amber-900">
                        Inquiry
                     </span>
                     <h2 className="mt-4 text-2xl font-semibold sm:text-3xl">
                        도입 전 궁금한 점부터
                        <br />
                        운영 상담까지 편하게 문의해 주세요
                     </h2>
                     <p className="mt-3 max-w-xl text-sm leading-7 text-zinc-600">
                        플랜 선택, 쇼핑몰 연동, 사이트 요청, 운영 흐름, 컨설팅
                        문의까지 카카오톡과 인스타그램으로 빠르게 확인합니다.
                     </p>
                     <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                        <Link
                           href="/inquiry"
                           className="inline-flex h-11 items-center justify-center rounded-md bg-zinc-950 px-5 text-sm font-semibold text-white transition hover:bg-zinc-800"
                        >
                           문의 페이지로 이동
                        </Link>
                        <a
                           href={kakaoUrl}
                           target="_blank"
                           rel="noopener noreferrer"
                           className="inline-flex h-11 items-center justify-center rounded-md border border-zinc-300 bg-white px-5 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-50"
                        >
                           카카오톡 바로 문의
                        </a>
                     </div>
                  </div>

                  <div className="grid grid-cols-1 gap-7 sm:grid-cols-2">
                     <div className="space-y-6">
                        <div>
                           <p className="text-sm text-zinc-500">연락처</p>
                           <a
                              href="tel:+827080983779"
                              className="mt-2 block text-base font-semibold text-zinc-950"
                           >
                              +82 070-8098-3779
                           </a>
                        </div>

                        <div>
                           <p className="text-sm text-zinc-500">이메일</p>
                           <a
                              href="mailto:contact@flowmerce.co.kr"
                              className="mt-2 block text-base font-semibold text-zinc-950"
                           >
                              contact@flowmerce.co.kr
                           </a>
                        </div>
                     </div>

                     <div className="space-y-4">
                        <div>
                           <p className="text-sm text-zinc-500">실시간 채널</p>
                           <p className="mt-2 text-sm leading-7 text-zinc-600">
                              셋업 문의나 운영 상담은 채팅이 가장 빠릅니다. 필요한
                              내용을 남겨주시면 확인 후 순서대로 안내드립니다.
                           </p>
                           <div className="mt-4 flex items-center gap-x-2.5">
                              {socialLinks.map((link) => (
                                 <a
                                    key={link.name}
                                    href={link.href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-black/5 bg-[#fbf7ef] shadow-sm transition hover:bg-[#f3ecdf]"
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
                                       <link.icon className="h-5 w-5 text-zinc-800" />
                                    )}
                                 </a>
                              ))}
                           </div>
                        </div>
                     </div>
                  </div>
               </div>
            </div>
         </Container>
      </section>
   );
}
