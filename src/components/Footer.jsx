import Image from "next/image";
import Link from "next/link";
import Container from "./Container";

export default function Footer() {
   const kakaoUrl =
      "http://pf.kakao.com/_hPdjX/chat";

   const links = [
      { href: "/", label: "홈" },
      { href: "/guide", label: "핵심 가이드" },
      { href: "/program", label: "프로그램 소개" },
      { href: "/consulting", label: "컨설팅" },
      { href: "/pricing", label: "가격" },
      { href: "/request", label: "요청서" },
      { href: "/#faq", label: "자주묻는질문" },
      { href: "/#contact-us", label: "연락처" },
   ];

   return (
      <footer className="border-t border-zinc-200 bg-zinc-50 py-12">
         <Container>
            <div className="grid gap-10 lg:grid-cols-[1fr_1fr] lg:items-start">
               <div>
                  <Link href="/" className="inline-flex" aria-label="플로우머스 홈">
                     <Image
                        src="/brand/flowmerce-logo-text.png"
                        alt="Flowmerce"
                        width={300}
                        height={120}
                        className="h-auto w-[170px] sm:w-[210px] xl:w-[250px]"
                     />
                  </Link>
                  <p className="mt-4 max-w-sm text-sm leading-6 text-zinc-600">
                     명품 구매대행 셀러를 위한 상품 수집, 등록, 재고관리 자동화 솔루션
                  </p>
               </div>

               <div className="lg:text-right">
                  <ul className="flex flex-wrap gap-x-6 gap-y-3 lg:justify-end">
                     {links.map((link) => (
                        <li key={link.href}>
                           <Link
                              href={link.href}
                              className="block text-sm font-medium text-zinc-700 transition hover:text-zinc-950"
                           >
                              {link.label}
                           </Link>
                        </li>
                     ))}
                  </ul>

                  <div className="mt-7 space-y-2 text-sm leading-6 text-zinc-600">
                     <p>
                        플로우머스 | 소재지 : 인천광역시 서구 고산후로95번길 24, 4층 401호
                        (당하동, 그린프라자)
                     </p>
                     <p>사업자등록번호 : 433-27-02243</p>
                     <p>
                        카카오 플러스톡 :{" "}
                        <a
                           href={kakaoUrl}
                           target="_blank"
                           rel="noopener noreferrer"
                           className="font-medium text-emerald-700 transition hover:text-emerald-800"
                        >
                           문의 바로가기
                        </a>
                     </p>
                     <p>
                        전자우편 :{" "}
                        <a
                           href="mailto:contact@flowmerce.co.kr"
                           className="font-medium text-emerald-700 transition hover:text-emerald-800"
                        >
                           contact@flowmerce.co.kr
                        </a>
                     </p>
                  </div>
               </div>
            </div>

            <div className="mt-10 border-t border-zinc-200 pt-6">
               <p className="text-sm text-zinc-500">
                  Copyright &copy; 2026 Flowmerce. All rights reserved.
               </p>
            </div>
         </Container>
      </footer>
   );
}
