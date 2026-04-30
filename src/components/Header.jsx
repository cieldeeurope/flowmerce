import Image from "next/image";
import Link from "next/link";
import Container from "./Container";
import NavLink from "./NavLink";
import MobileNav from "./MobileNav";
import AuthNav from "./AuthNav";

export default function Header() {
   return (
      <header className="z-50 border-b border-zinc-200 bg-zinc-50 py-4">
         <Container>
            <div className="flex items-center justify-between gap-6 lg:items-start">
               <div className="flex shrink-0 items-center">
                  <Link href="/" aria-label="플로우머스">
                     <Image
                        src="/brand/flowmerce-logo-text.png"
                        alt="Flowmerce"
                        width={220}
                        height={88}
                        priority
                        className="h-auto w-[145px] sm:w-[165px] xl:w-[190px]"
                     />
                  </Link>
               </div>

               <div className="hidden min-w-0 flex-1 lg:flex lg:flex-col lg:items-end lg:gap-4">
                  <div className="flex items-center justify-end">
                     <AuthNav />
                  </div>

                  <nav className="flex min-w-0 flex-wrap items-center justify-end gap-x-4 gap-y-2 text-right xl:gap-x-6">
                     <NavLink href="/">홈</NavLink>
                     <NavLink href="/guide">핵심 가이드</NavLink>
                     <NavLink href="/program">프로그램 소개</NavLink>
                     <NavLink href="/consulting">컨설팅</NavLink>
                     <NavLink href="/pricing">가격</NavLink>
                     <NavLink href="/inquiry">문의</NavLink>
                     <NavLink href="/#faq">자주묻는질문</NavLink>
                     <NavLink href="/#contact-us">연락처</NavLink>
                  </nav>
               </div>

               <div className="flex items-center justify-end lg:hidden">
                  <MobileNav />
               </div>
            </div>
         </Container>
      </header>
   );
}
