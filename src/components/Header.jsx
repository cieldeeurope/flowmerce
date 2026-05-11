import Image from "next/image";
import Link from "next/link";
import AuthNav from "./AuthNav";
import Container from "./Container";
import MobileNav from "./MobileNav";
import NavLink from "./NavLink";

export default function Header() {
   return (
      <header className="sticky top-0 z-50 border-b border-black/5 bg-white/90 py-4 backdrop-blur">
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
                     <NavLink href="/guide">운영 가이드</NavLink>
                     <NavLink href="/program">운영 화면</NavLink>
                     <NavLink href="/consulting">컨설팅</NavLink>
                     <NavLink href="/pricing">요금</NavLink>
                     <NavLink href="/#faq">FAQ</NavLink>
                     <NavLink href="/inquiry">문의</NavLink>
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
