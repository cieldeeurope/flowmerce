"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getSession, signOut } from "@/lib/auth";

function AuthLink({ href, children }) {
   return (
      <Link
         href={href}
         className="text-[13px] font-semibold text-zinc-500 transition hover:text-zinc-900"
      >
         {children}
      </Link>
   );
}

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
         <div className="flex items-center gap-4">
            {session.role === "admin" && <AuthLink href="/admin">관리자</AuthLink>}
            <button
               type="button"
               onClick={handleLogout}
               className="text-[13px] font-semibold text-zinc-500 transition hover:text-zinc-900"
            >
               로그아웃
            </button>
         </div>
      );
   }

   return (
      <div className="flex items-center gap-4">
         <AuthLink href="/login">로그인</AuthLink>
         <AuthLink href="/signup">회원가입</AuthLink>
      </div>
   );
}
