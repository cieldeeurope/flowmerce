"use client";

import { Fragment, useEffect, useState } from "react";
import { Popover, Transition } from "@headlessui/react";
import clsx from "clsx";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { getSession, signOut } from "@/lib/auth";

function MobileNavLink({ href, children }) {
   return (
      <Popover.Button
         as={Link}
         href={href}
         className="block w-full rounded-md px-1 py-2 text-left text-base font-medium text-zinc-800 transition hover:text-zinc-950"
      >
         {children}
      </Popover.Button>
   );
}

function MobileNavIcon({ open }) {
   return (
      <svg
         aria-hidden="true"
         className="h-3.5 w-3.5 overflow-visible stroke-zinc-950"
         fill="none"
         strokeWidth={1.5}
         strokeLinecap="square"
      >
         <path
            d="M0 1H14M0 7H14M0 13H14"
            className={clsx(
               "origin-center transition",
               open && "scale-90 opacity-0",
            )}
         />
         <path
            d="M2 2L12 12M12 2L2 12"
            className={clsx(
               "origin-center transition",
               !open && "scale-90 opacity-0",
            )}
         />
      </svg>
   );
}

export default function MobileNav() {
   const router = useRouter();
   const pathname = usePathname();
   const [session, setSession] = useState(null);

   useEffect(() => {
      const syncSession = () => setSession(getSession());

      syncSession();
      window.addEventListener("flowmerce-auth", syncSession);
      window.addEventListener("storage", syncSession);

      return () => {
         window.removeEventListener("flowmerce-auth", syncSession);
         window.removeEventListener("storage", syncSession);
      };
   }, []);

   const handleLogout = (closeMenu) => {
      signOut();
      closeMenu();

      if (pathname === "/admin" || pathname === "/admin-flowmerce") {
         router.push("/");
      }
   };

   return (
      <Popover className="relative">
         {({ open, close }) => (
            <>
               <Popover.Button className="relative flex h-9 w-9 items-center justify-center rounded-md border border-zinc-200 bg-white shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">
                  <span className="sr-only">메뉴 열기</span>
                  <MobileNavIcon open={open} />
               </Popover.Button>

               <Transition
                  as={Fragment}
                  enter="transition duration-150 ease-out"
                  enterFrom="opacity-0 scale-95"
                  enterTo="opacity-100 scale-100"
                  leave="transition duration-100 ease-in"
                  leaveFrom="opacity-100 scale-100"
                  leaveTo="opacity-0 scale-95"
               >
                  <>
                     <Popover.Overlay className="fixed inset-0 z-40 bg-zinc-950/20 backdrop-blur-[1px]" />
                     <Popover.Panel className="absolute right-0 top-full z-50 mt-4 w-[min(21rem,calc(100vw-2rem))] origin-top-right rounded-lg border border-zinc-200 bg-white p-5 shadow-xl">
                        <div>
                           <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
                              Menu
                           </p>
                           <div className="mt-3 space-y-1">
                              <MobileNavLink href="/">홈</MobileNavLink>
                              <MobileNavLink href="/guide">소싱 가이드</MobileNavLink>
                              <MobileNavLink href="/program">프로그램 소개</MobileNavLink>
                              <MobileNavLink href="/consulting">컨설팅</MobileNavLink>
                              <MobileNavLink href="/pricing">가격</MobileNavLink>
                              <MobileNavLink href="/inquiry">문의</MobileNavLink>
                              <MobileNavLink href="/#faq">자주 묻는 질문</MobileNavLink>
                              <MobileNavLink href="/#contact-us">연락처</MobileNavLink>
                           </div>
                        </div>

                        <div className="mt-4 border-t border-zinc-200 pt-4">
                           <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
                              Account
                           </p>
                           <div className="mt-3 space-y-1">
                              {session ? (
                                 <>
                                    <MobileNavLink href="/mypage">
                                       마이페이지
                                    </MobileNavLink>
                                    <Popover.Button
                                       type="button"
                                       onClick={() => handleLogout(close)}
                                       className="block w-full rounded-md px-1 py-2 text-left text-base font-medium text-zinc-800 transition hover:text-zinc-950"
                                    >
                                       로그아웃
                                    </Popover.Button>
                                 </>
                              ) : (
                                 <>
                                    <MobileNavLink href="/login">로그인</MobileNavLink>
                                    <MobileNavLink href="/signup">회원가입</MobileNavLink>
                                 </>
                              )}
                           </div>
                        </div>
                     </Popover.Panel>
                  </>
               </Transition>
            </>
         )}
      </Popover>
   );
}
