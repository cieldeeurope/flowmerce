"use client";

import { useEffect, useState } from "react";
import { getAdminSession, signInAdmin, signOutAdmin } from "@/lib/auth";
import AdminDashboard from "@/components/AdminDashboard";

const inputClass =
   "block w-full rounded-lg border-0 bg-white px-4 py-3 text-sm shadow-sm ring-1 ring-inset ring-zinc-300 placeholder:text-zinc-400 focus:ring-2 focus:ring-inset focus:ring-emerald-600";

export default function AdminAccessPanel() {
   const [session, setSession] = useState(null);
   const [loginId, setLoginId] = useState("");
   const [password, setPassword] = useState("");
   const [submitting, setSubmitting] = useState(false);
   const [error, setError] = useState("");

   useEffect(() => {
      const syncAdminSession = () => setSession(getAdminSession());

      syncAdminSession();
      window.addEventListener("flowmerce-admin-auth", syncAdminSession);
      window.addEventListener("storage", syncAdminSession);

      return () => {
         window.removeEventListener("flowmerce-admin-auth", syncAdminSession);
         window.removeEventListener("storage", syncAdminSession);
      };
   }, []);

   const handleSubmit = async (event) => {
      event.preventDefault();
      setError("");
      setSubmitting(true);

      try {
         await signInAdmin({ loginId, password });
         setPassword("");
      } catch (loginError) {
         setError(loginError.message || "관리자 로그인을 진행하지 못했습니다.");
      } finally {
         setSubmitting(false);
      }
   };

   if (!session) {
      return (
         <div className="flex min-h-screen items-center justify-center bg-zinc-100 px-5 py-10">
            <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
               <h1 className="text-2xl font-semibold text-zinc-950">
                  플로우머스 관리자용
               </h1>
               <form onSubmit={handleSubmit} className="mt-7 space-y-4">
                  <div>
                     <label
                        htmlFor="admin-login-id"
                        className="text-sm font-medium text-zinc-600"
                     >
                        아이디
                     </label>
                     <input
                        id="admin-login-id"
                        type="text"
                        value={loginId}
                        onChange={(event) => setLoginId(event.target.value)}
                        className={`${inputClass} mt-1.5`}
                        placeholder="아이디"
                        required
                     />
                  </div>

                  <div>
                     <label
                        htmlFor="admin-password"
                        className="text-sm font-medium text-zinc-600"
                     >
                        비밀번호
                     </label>
                     <input
                        id="admin-password"
                        type="password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        className={`${inputClass} mt-1.5`}
                        placeholder="비밀번호"
                        required
                     />
                  </div>

                  {error && (
                     <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                        {error}
                     </p>
                  )}

                  <button
                     type="submit"
                     disabled={submitting}
                     className="inline-flex w-full justify-center rounded-lg border border-emerald-700 bg-emerald-600 px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                     {submitting ? "로그인 중..." : "관리자 로그인"}
                  </button>
               </form>
            </div>
         </div>
      );
   }

   return (
      <div className="min-h-screen bg-zinc-50 px-5 py-10">
         <div className="mx-auto max-w-7xl space-y-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
               <div>
                  <p className="text-sm font-semibold text-emerald-600">Admin</p>
                  <h1 className="mt-2 text-4xl font-semibold text-zinc-950">
                     플로우머스 관리자용
                  </h1>
               </div>
               <button
                  type="button"
                  onClick={signOutAdmin}
                  className="inline-flex items-center justify-center rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-800 shadow-sm transition hover:bg-zinc-50"
               >
                  관리자 로그아웃
               </button>
            </div>

            <AdminDashboard />
         </div>
      </div>
   );
}
