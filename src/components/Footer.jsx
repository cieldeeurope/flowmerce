import Image from "next/image";
import Link from "next/link";
import Container from "./Container";

export default function Footer() {
   const kakaoUrl = "https://pf.kakao.com/_hPdjX/chat";
   const addressMapUrl =
      "https://map.naver.com/p/search/%EA%B3%A0%EC%82%B0%ED%9B%84%EB%A1%9C95%EB%B2%88%EA%B8%B8%2024/address/3z5QA9,2AN975,%EC%9D%B8%EC%B2%9C%EA%B4%91%EC%97%AD%EC%8B%9C%20%EC%84%9C%EA%B5%AC%20%EA%B3%A0%EC%82%B0%ED%9B%84%EB%A1%9C95%EB%B2%88%EA%B8%B8%2024?c=15.00,0,0,0,dh&isCorrectAnswer=true";

   const primaryLinks = [
      { href: "/", label: "\ud648" },
      { href: "/guide", label: "\ud575\uc2ec \uac00\uc774\ub4dc" },
      { href: "/program", label: "\uc0ac\uc6a9 \uba54\ub274\uc5bc" },
      { href: "/consulting", label: "\ucee8\uc124\ud305" },
      { href: "/pricing", label: "\uc694\uae08" },
      { href: "/#faq", label: "FAQ" },
      { href: "/inquiry", label: "\ubb38\uc758" },
      { href: "/#contact-us", label: "\uc5f0\ub77d\ucc98" },
   ];

   const policyLinks = [
      { href: "/terms", label: "\uc774\uc6a9\uc57d\uad00" },
      { href: "/privacy", label: "\uac1c\uc778\uc815\ubcf4\ucc98\ub9ac\ubc29\uce68" },
      {
         href: "/subscription-agreement",
         label: "\uad6c\ub3c5 \ubc0f \uc6b4\uc601 \ub3d9\uc758\uc11c",
      },
      { href: "/refund-policy", label: "\ud658\ubd88 \ubc0f \ud574\uc9c0\uc815\ucc45" },
      {
         href: "/data-policy",
         label: "\uacc4\uc815\uc815\ubcf4 \ubc0f \ub370\uc774\ud130 \uae30\uc900",
      },
   ];

   return (
      <footer className="border-t border-black/5 bg-[#f0ece5] py-12">
         <Container>
            <div className="grid gap-10 lg:grid-cols-[1fr_1fr] lg:items-start">
               <div>
                  <Link
                     href="/"
                     className="inline-flex"
                     aria-label="Flowmerce"
                  >
                     <Image
                        src="/brand/flowmerce-logo-text.png"
                        alt="Flowmerce"
                        width={300}
                        height={120}
                        className="h-auto w-[170px] sm:w-[210px] xl:w-[250px]"
                     />
                  </Link>
                  <p className="mt-4 max-w-sm text-sm leading-6 text-zinc-600">
                     {
                        "\uba85\ud488 \uc1fc\ud551\ubab0 \uc6b4\uc601\uc5d0 \ud544\uc694\ud55c \uc0c1\ud488 \uc218\uc9d1, \ub4f1\ub85d, \uc7ac\uace0\u00b7\ud488\uc808 \ubc18\uc601, \ub9c8\uc9c4 \uc124\uc815\uacfc \uc218\uc9d1 \uc608\uc57d\uc744 \uc6f9\uc5d0\uc11c \uad00\ub9ac\ud558\ub294 \uc790\ub3d9\ud654 \uc11c\ube44\uc2a4\uc785\ub2c8\ub2e4."
                     }
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
                     <p>{"\uc0ac\uc5c5\uc790\ub4f1\ub85d\ubc88\ud638 : 433-27-02243"}</p>
                     <p>
                        {"\uce74\uce74\uc624\ud1a1 \ucc44\ub110 : "}
                        <a
                           href={kakaoUrl}
                           target="_blank"
                           rel="noopener noreferrer"
                           className="font-medium text-zinc-950 underline decoration-zinc-300 underline-offset-4 transition hover:decoration-zinc-950"
                        >
                           {"\ubc14\ub85c \ubb38\uc758\ud558\uae30"}
                        </a>
                     </p>
                     <p>
                        {"\uc774\uba54\uc77c : "}
                        <a
                           href="mailto:contact@flowmerce.co.kr"
                           className="font-medium text-zinc-950 underline decoration-zinc-300 underline-offset-4 transition hover:decoration-zinc-950"
                        >
                           contact@flowmerce.co.kr
                        </a>
                     </p>
                     <p>{"\uc804\ud654 : +82 070-8098-3779"}</p>
                     <p>
                        {"\ud50c\ub85c\uc6b0\uba38\uc2a4 \uc18c\uc7ac\uc9c0 | "}
                        <a
                           href={addressMapUrl}
                           target="_blank"
                           rel="noopener noreferrer"
                           className="underline decoration-zinc-300 underline-offset-4 transition hover:decoration-zinc-950"
                        >
                           {
                              "\uc778\ucc9c\uad11\uc5ed\uc2dc \uc11c\uad6c \uace0\uc0b0\ud6c4\ub85c95\ubc88\uae38 24, 4\uce35 401\ud638 (\ub2f9\ud558\ub3d9, \uadf8\ub9b0\ud504\ub77c\uc790)"
                           }
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
