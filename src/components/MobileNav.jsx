"use client";

import { Fragment } from "react";
import { Popover, Transition } from "@headlessui/react";
import clsx from "clsx";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getSession, signOut } from "@/lib/auth";

function MobileNavLink({ href, children }) {
   return (
      <Popover.Button as={Link} href={href} className="block w-full py-1.5">
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

   const handleLogout = () => {
      signOut();

      if (pathname === "/request" || pathname === "/admin") {
         router.push("/");
      }
   };

   return (
      <Popover>
         <Popover.Button className="relative flex h-8 w-8 items-center justify-center focus:outline-none">
            {({ open }) => <MobileNavIcon open={open} />}
         </Popover.Button>
         <Transition.Root>
            <Transition.Child
               as={Fragment}
               enter="duration-150 ease-out"
               enterFrom="opacity-0"
               enterTo="opacity-100"
               leave="duration-150 ease-in"
               leaveFrom="opacity-100"
               leaveTo="opacity-0"
            >
               <Popover.Overlay className="fixed inset-0 bg-zinc-300/30" />
            </Transition.Child>
            <Transition.Child
               as={Fragment}
               enter="duration-150 ease-out"
               enterFrom="opacity-0 scale-95"
               enterTo="opacity-100 scale-100"
               leave="duration-100 ease-in"
               leaveFrom="opacity-100 scale-100"
               leaveTo="opacity-0 scale-95"
            >
               <Popover.Panel
                  as="div"
                  className="absolute inset-x-0 top-full mt-5 flex origin-top flex-col rounded-2xl bg-white p-7 text-lg shadow-xl ring-1 ring-zinc-950/5"
               >
                  <MobileNavLink href="/">홈</MobileNavLink>
                  <MobileNavLink href="/guide">핵심 가이드</MobileNavLink>
                  <MobileNavLink href="/program">프로그램 소개</MobileNavLink>
                  <MobileNavLink href="/consulting">컨설팅</MobileNavLink>
                  <MobileNavLink href="/pricing">가격</MobileNavLink>
                  <MobileNavLink href="/request">요청서</MobileNavLink>
                  <MobileNavLink href="/#faq">자주묻는질문</MobileNavLink>
                  <MobileNavLink href="/#contact-us">연락처</MobileNavLink>
                  <hr className="my-2 border-zinc-200" />
                  {session ? (
                     <>
                        {session.role === "admin" && (
                           <MobileNavLink href="/admin">관리자</MobileNavLink>
                        )}
                        <Popover.Button
                           type="button"
                           onClick={handleLogout}
                           className="block w-full py-1.5 text-left"
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
               </Popover.Panel>
            </Transition.Child>
         </Transition.Root>
      </Popover>
   );
}
