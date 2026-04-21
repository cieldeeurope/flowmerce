"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { signIn, signUp } from "@/lib/auth";

const inputClass =
   "block w-full rounded-lg border-0 bg-white px-4 py-3 text-sm shadow-sm ring-1 ring-inset ring-zinc-300 placeholder:text-zinc-400 focus:ring-2 focus:ring-inset focus:ring-emerald-600";

export default function AuthForm({ mode }) {
   const router = useRouter();
   const searchParams = useSearchParams();
   const [error, setError] = useState("");
   const isSignup = mode === "signup";

   const handleSubmit = (event) => {
      event.preventDefault();
      setError("");

      const formData = new FormData(event.currentTarget);
      const payload = {
         name: String(formData.get("name") || ""),
         email: String(formData.get("email") || ""),
         password: String(formData.get("password") || ""),
      };

      try {
         if (isSignup) {
            signUp(payload);
         } else {
            signIn(payload);
         }

         router.push(searchParams.get("next") || "/request");
      } catch (authError) {
         setError(authError.message);
      }
   };

   return (
      <div className="mt-7 flex w-full max-w-sm flex-col">
         <h1 className="text-2xl font-medium">
            {isSignup ? "회원가입" : "로그인"}
         </h1>
         <p className="mt-2 text-zinc-600">
            {isSignup
               ? "요청서를 작성할 계정을 만들어주세요."
               : "계정으로 로그인하면 요청서를 작성할 수 있습니다."}
         </p>

         <form onSubmit={handleSubmit} className="mt-7 divide-y divide-zinc-300">
            <div className="space-y-3.5 py-7">
               {isSignup && (
                  <div>
                     <label
                        htmlFor="name"
                        className="text-sm font-medium text-zinc-600"
                     >
                        이름
                     </label>
                     <div className="mt-1.5">
                        <input
                           type="text"
                           name="name"
                           id="name"
                           placeholder="홍길동"
                           className={inputClass}
                           required
                        />
                     </div>
                  </div>
               )}

               <div>
                  <label
                     htmlFor="email"
                     className="text-sm font-medium text-zinc-600"
                  >
                     이메일
                  </label>
                  <div className="mt-1.5">
                     <input
                        type="email"
                        name="email"
                        id="email"
                        placeholder="you@example.com"
                        className={inputClass}
                        required
                     />
                  </div>
               </div>

               <div>
                  <label
                     htmlFor="password"
                     className="text-sm font-medium text-zinc-600"
                  >
                     비밀번호
                  </label>
                  <div className="mt-1.5">
                     <input
                        type="password"
                        name="password"
                        id="password"
                        placeholder="비밀번호를 입력하세요"
                        className={inputClass}
                        required
                     />
                  </div>
               </div>

               {error && (
                  <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                     {error}
                  </p>
               )}

               <div className="pt-3.5">
                  <button
                     type="submit"
                     className="block rounded-lg border border-emerald-700 bg-emerald-600 px-5 py-3 text-sm font-medium text-white shadow-sm duration-150 hover:bg-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
                  >
                     {isSignup ? "회원가입" : "로그인"}
                  </button>
               </div>
            </div>

            <p className="py-7 text-sm text-zinc-600">
               {isSignup ? "이미 계정이 있으신가요?" : "아직 계정이 없으신가요?"}{" "}
               <Link
                  href={isSignup ? "/login" : "/signup"}
                  className="font-medium text-emerald-600 hover:text-emerald-700"
               >
                  {isSignup ? "로그인" : "회원가입"}
               </Link>
            </p>
         </form>
      </div>
   );
}
