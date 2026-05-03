"use client";

import clsx from "clsx";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getSession, signOut } from "@/lib/auth";

function MobileNavLink({ href, children, onNavigate }) {
   return (
      <Link
         href={href}
         onClick={onNavigate}
         className="block w-full rounded-md px-1 py-2 text-left text-base font-medium text-zinc-800 transition hover:text-zinc-950"
      >
         {children}
      </Link>
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
   const [open, setOpen] = useState(false);

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

   useEffect(() => {
      setOpen(false);
   }, [pathname]);

   useEffect(() => {
      if (!open) {
         return undefined;
      }

      const handleEscape = (event) => {
         if (event.key === "Escape") {
            setOpen(false);
         }
      };

      window.addEventListener("keydown", handleEscape);

      return () => {
         window.removeEventListener("keydown", handleEscape);
      };
   }, [open]);

   const closeMenu = () => setOpen(false);

   const handleLogout = () => {
      signOut();
      closeMenu();

      if (pathname === "/admin" || pathname === "/admin-flowmerce") {
         router.push("/");
      }
   };

   return (
      <div className="relative">
         <button
            type="button"
            aria-expanded={open}
            aria-label="메뉴 열기"
            onClick={() => setOpen((current) => !current)}
            className="relative flex h-9 w-9 items-center justify-center rounded-md border border-zinc-200 bg-white shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
         >
            <MobileNavIcon open={open} />
         </button>

         {open && (
            <>
               <button
                  type="button"
                  aria-label="메뉴 닫기"
                  onClick={closeMenu}
                  className="fixed inset-0 z-40 bg-zinc-950/20 backdrop-blur-[1px]"
               />

               <div className="absolute right-0 top-full z-50 mt-4 w-[min(21rem,calc(100vw-2rem))] origin-top-right rounded-lg border border-zinc-200 bg-white p-5 shadow-xl">
                  <div>
                     <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
                        Menu
                     </p>
                     <div className="mt-3 space-y-1">
                        <MobileNavLink href="/" onNavigate={closeMenu}>
                           홈
                        </MobileNavLink>
                        <MobileNavLink href="/guide" onNavigate={closeMenu}>
                           소싱 가이드
                        </MobileNavLink>
                        <MobileNavLink href="/program" onNavigate={closeMenu}>
                           프로그램 소개
                        </MobileNavLink>
                        <MobileNavLink href="/consulting" onNavigate={closeMenu}>
                           컨설팅
                        </MobileNavLink>
                        <MobileNavLink href="/pricing" onNavigate={closeMenu}>
                           가격
                        </MobileNavLink>
                        <MobileNavLink href="/inquiry" onNavigate={closeMenu}>
                           문의
                        </MobileNavLink>
                        <MobileNavLink href="/#faq" onNavigate={closeMenu}>
                           자주 묻는 질문
                        </MobileNavLink>
                        <MobileNavLink href="/#contact-us" onNavigate={closeMenu}>
                           연락처
                        </MobileNavLink>
                     </div>
                  </div>

                  <div className="mt-4 border-t border-zinc-200 pt-4">
                     <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
                        Account
                     </p>
                     <div className="mt-3 space-y-1">
                        {session ? (
                           <>
                              <MobileNavLink href="/mypage" onNavigate={closeMenu}>
                                 마이페이지
                              </MobileNavLink>
                              <button
                                 type="button"
                                 onClick={handleLogout}
                                 className="block w-full rounded-md px-1 py-2 text-left text-base font-medium text-zinc-800 transition hover:text-zinc-950"
                              >
                                 로그아웃
                              </button>
                           </>
                        ) : (
                           <>
                              <MobileNavLink href="/login" onNavigate={closeMenu}>
                                 로그인
                              </MobileNavLink>
                              <MobileNavLink href="/signup" onNavigate={closeMenu}>
                                 회원가입
                              </MobileNavLink>
                           </>
                        )}
                     </div>
                  </div>
               </div>
            </>
         )}
      </div>
   );
}
