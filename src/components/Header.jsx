import Image from "next/image";
import logo from "@/images/logo.svg";
import Container from "./Container";
import Link from "next/link";
import NavLink from "./NavLink";
import MobileNav from "./MobileNav";
import AuthNav from "./AuthNav";

export default function Header() {
   return (
      <header className="z-50 border-b border-zinc-200 bg-zinc-50 py-5">
         <Container>
            <div className="grid grid-cols-[150px_minmax(0,1fr)_150px] items-center xl:grid-cols-[190px_minmax(0,1fr)_190px]">
               <div className="flex items-center">
                  <Link href="/">
                     <Image src={logo} alt="Amiso" width={110} />
                  </Link>
               </div>

               <nav className="hidden min-w-0 items-center justify-center gap-x-4 lg:flex xl:gap-x-6">
                  <NavLink href="/">홈</NavLink>
                  <NavLink href="/guide">핵심 가이드</NavLink>
                  <NavLink href="/program">프로그램 소개</NavLink>
                  <NavLink href="/consulting">컨설팅</NavLink>
                  <NavLink href="/pricing">가격</NavLink>
                  <NavLink href="/request">요청서</NavLink>
                  <NavLink href="/#faq">자주묻는질문</NavLink>
                  <NavLink href="/#contact-us">연락처</NavLink>
               </nav>

               <div className="flex items-center justify-end gap-x-4 sm:gap-x-7">
                  <AuthNav />
                  <div className="lg:hidden">
                     <MobileNav />
                  </div>
               </div>
            </div>
         </Container>
      </header>
   );
}
