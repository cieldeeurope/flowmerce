import Image from "next/image";
import Link from "next/link";
import Container from "./Container";

export default function Footer() {
   const kakaoUrl = "https://pf.kakao.com/_hPdjX/chat";
   const addressMapUrl =
      "https://map.naver.com/p/search/%EA%B3%A0%EC%82%B0%ED%9B%84%EB%A1%9C95%EB%B2%88%EA%B8%B8%2024/address/3z5QA9,2AN975,%EC%9D%B8%EC%B2%9C%EA%B4%91%EC%97%AD%EC%8B%9C%20%EC%84%9C%EA%B5%AC%20%EA%B3%A0%EC%82%B0%ED%9B%84%EB%A1%9C95%EB%B2%88%EA%B8%B8%2024?c=15.00,0,0,0,dh&isCorrectAnswer=true";

   const primaryLinks = [
      { href: "/", label: "홈" },
      { href: "/guide", label: "운영 가이드" },
      { href: "/program", label: "운영 화면" },
      { href: "/consulting", label: "컨설팅" },
      { href: "/pricing", label: "요금" },
      { href: "/#faq", label: "FAQ" },
      { href: "/inquiry", label: "문의" },
      { href: "/#contact-us", label: "연락처" },
   ];

   const policyLinks = [
      { href: "/terms", label: "이용약관" },
      { href: "/privacy", label: "개인정보처리방침" },
      { href: "/refund-policy", label: "환불 및 해지정책" },
      { href: "/data-policy", label: "계정정보 및 데이터 기준" },
   ];

   return (
      <footer className="border-t border-black/5 bg-[#f0ece5] py-12">
         <Container>
            <div className="grid gap-10 lg:grid-cols-[1fr_1fr] lg:items-start">
               <div>
                  <Link href="/" className="inline-flex" aria-label="플로우머스">
                     <Image
                        src="/brand/flowmerce-logo-text.png"
                        alt="Flowmerce"
                        width={300}
                        height={120}
                        className="h-auto w-[170px] sm:w-[210px] xl:w-[250px]"
                     />
                  </Link>
                  <p className="mt-4 max-w-sm text-sm leading-6 text-zinc-600">
                     명품 쇼핑몰 운영에 필요한 상품 수집, 등록, 재고·품절 반영,
                     마진 설정과 수집 예약을 웹에서 관리하는 자동화 서비스입니다.
                  </p>
               </div>

               <div className="lg:text-right">
                  <ul className="flex flex-wrap gap-x-6 gap-y-3 lg:justify-end">
                     {primaryLinks.map((link) => (
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

                  <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 lg:justify-end">
                     {policyLinks.map((link) => (
                        <li key={link.href}>
                           <Link
                              href={link.href}
                              className="block text-xs font-medium text-zinc-500 transition hover:text-zinc-900"
                           >
                              {link.label}
                           </Link>
                        </li>
                     ))}
                  </ul>

                  <div className="mt-7 space-y-2 text-sm leading-6 text-zinc-600">
                     <p>사업자등록번호 : 433-27-02243</p>
                     <p>
                        카카오톡 채널 :{" "}
                        <a
                           href={kakaoUrl}
                           target="_blank"
                           rel="noopener noreferrer"
                           className="font-medium text-zinc-950 underline decoration-zinc-300 underline-offset-4 transition hover:decoration-zinc-950"
                        >
                           바로 문의하기
                        </a>
                     </p>
                     <p>
                        이메일 :{" "}
                        <a
                           href="mailto:contact@flowmerce.co.kr"
                           className="font-medium text-zinc-950 underline decoration-zinc-300 underline-offset-4 transition hover:decoration-zinc-950"
                        >
                           contact@flowmerce.co.kr
                        </a>
                     </p>
                     <p>전화 : +82 070-8098-3779</p>
                     <p>
                        플로우머스 소재지 |{" "}
                        <a
                           href={addressMapUrl}
                           target="_blank"
                           rel="noopener noreferrer"
                           className="underline decoration-zinc-300 underline-offset-4 transition hover:decoration-zinc-950"
                        >
                           인천광역시 서구 고산후로95번길 24, 4층 401호
                           (당하동, 그린프라자)
                        </a>
                     </p>
                  </div>
               </div>
            </div>

            <div className="mt-10 border-t border-black/5 pt-6">
               <p className="text-sm text-zinc-500">
                  Copyright &copy; 2026 Flowmerce. All rights reserved.
               </p>
            </div>
         </Container>
      </footer>
   );
}
