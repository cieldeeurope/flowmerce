"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getSession, signOut } from "@/lib/auth";
import NavLink from "./NavLink";

export default function AuthNav() {
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

   if (session) {
      return (
         <>
            {session.role === "admin" && (
               <div className="hidden sm:block">
                  <NavLink href="/admin">관리자</NavLink>
               </div>
            )}
            <button
               type="button"
               onClick={handleLogout}
               className="hidden text-sm font-medium text-zinc-600 transition hover:text-zinc-950 sm:block"
            >
               로그아웃
            </button>
         </>
      );
   }

   return (
      <>
         <div className="hidden sm:block">
            <NavLink href="/login">로그인</NavLink>
         </div>
         <Link
            href="/signup"
            className="inline-flex rounded-md border border-emerald-700 bg-emerald-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm duration-150 hover:bg-emerald-700"
         >
            무료 시작하기
         </Link>
      </>
   );
}
