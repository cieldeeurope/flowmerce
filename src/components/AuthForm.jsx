"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import {
   checkLoginIdAvailability,
   checkNicknameAvailability,
   signIn,
   signUp,
   validatePassword,
} from "@/lib/auth";

const inputClass =
   "block w-full rounded-lg border-0 bg-white px-4 py-3 text-sm shadow-sm ring-1 ring-inset ring-zinc-300 placeholder:text-zinc-400 focus:ring-2 focus:ring-inset focus:ring-emerald-600";

const checkButtonClass =
   "inline-flex h-[46px] shrink-0 items-center justify-center rounded-lg border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-800 shadow-sm transition hover:bg-zinc-50";

const initialSignupForm = {
   name: "",
   loginId: "",
   password: "",
   customId: "",
   email: "",
};

const initialLoginForm = {
   loginId: "",
   password: "",
};

function FieldFeedback({ tone = "neutral", message }) {
   if (!message) {
      return null;
   }

   const toneClass =
      tone === "success"
         ? "text-emerald-700"
         : tone === "error"
           ? "text-red-700"
           : "text-zinc-500";

   return <p className={`mt-2 text-xs font-medium ${toneClass}`}>{message}</p>;
}

export default function AuthForm({ mode }) {
   const router = useRouter();
   const searchParams = useSearchParams();
   const isSignup = mode === "signup";
   const [error, setError] = useState("");
   const [submitting, setSubmitting] = useState(false);
   const [signupForm, setSignupForm] = useState(initialSignupForm);
   const [loginForm, setLoginForm] = useState(initialLoginForm);
   const [idCheck, setIdCheck] = useState({
      status: "idle",
      message: "",
      value: "",
   });
   const [nicknameCheck, setNicknameCheck] = useState({
      status: "idle",
      message: "",
      value: "",
   });

   const registeredMessage = useMemo(() => {
      if (!searchParams.get("registered")) {
         return "";
      }

      return "회원가입이 완료되었습니다. 지금 바로 로그인해서 마이페이지에서 진행 상태를 확인할 수 있습니다.";
   }, [searchParams]);

   const passwordGuide = useMemo(() => {
      if (!isSignup || !signupForm.password) {
         return "";
      }

      if (validatePassword(signupForm.password)) {
         return "사용 가능한 비밀번호 형식입니다.";
      }

      return "영문, 숫자, 특수문자를 포함해 8자리 이상으로 입력해주세요.";
   }, [isSignup, signupForm.password]);

   const handleSignupChange = (field, value) => {
      setSignupForm((current) => ({
         ...current,
         [field]: value,
      }));

      if (field === "loginId") {
         setIdCheck((current) =>
            current.value === value
               ? current
               : { status: "idle", message: "", value: "" },
         );
      }

      if (field === "customId") {
         setNicknameCheck((current) =>
            current.value === value
               ? current
               : { status: "idle", message: "", value: "" },
         );
      }
   };

   const handleCheckLoginId = async () => {
      setError("");

      try {
         setIdCheck({
            status: "checking",
            message: "확인 중입니다...",
            value: signupForm.loginId,
         });

         const result = await checkLoginIdAvailability(signupForm.loginId);

         setIdCheck({
            status: result.available ? "success" : "error",
            message: result.available
               ? "사용 가능한 아이디입니다."
               : "이미 사용 중인 아이디입니다.",
            value: signupForm.loginId,
         });
      } catch (checkError) {
         setIdCheck({
            status: "error",
            message: checkError.message,
            value: signupForm.loginId,
         });
      }
   };

   const handleCheckNickname = async () => {
      setError("");

      try {
         setNicknameCheck({
            status: "checking",
            message: "확인 중입니다...",
            value: signupForm.customId,
         });

         const result = await checkNicknameAvailability(signupForm.customId);

         setNicknameCheck({
            status: result.available ? "success" : "error",
            message: result.available
               ? "사용 가능한 닉네임입니다."
               : "이미 사용 중인 닉네임입니다.",
            value: signupForm.customId,
         });
      } catch (checkError) {
         setNicknameCheck({
            status: "error",
            message: checkError.message,
            value: signupForm.customId,
         });
      }
   };

   const handleSubmit = async (event) => {
      event.preventDefault();
      setError("");
      setSubmitting(true);

      try {
         if (isSignup) {
            if (
               idCheck.status !== "success" ||
               idCheck.value !== signupForm.loginId
            ) {
               throw new Error("아이디 중복체크를 완료해주세요.");
            }

            if (
               nicknameCheck.status !== "success" ||
               nicknameCheck.value !== signupForm.customId
            ) {
               throw new Error("닉네임 중복체크를 완료해주세요.");
            }

            await signUp(signupForm);

            const next = searchParams.get("next");
            const loginUrl = next
               ? `/login?registered=1&next=${encodeURIComponent(next)}`
               : "/login?registered=1";

            router.push(loginUrl);
            return;
         }

         await signIn(loginForm);
         router.push(searchParams.get("next") || "/mypage");
      } catch (authError) {
         setError(authError.message);
      } finally {
         setSubmitting(false);
      }
   };

   return (
      <div className="mt-7 flex w-full max-w-md flex-col">
         <h1 className="text-2xl font-medium">
            {isSignup ? "회원가입" : "로그인"}
         </h1>
         <p className="mt-2 text-zinc-600">
            {isSignup
               ? "문의는 회원가입 없이도 가능합니다. 플랜 구독, 마이페이지 이용, 프로그램 사용 관리는 가입 후 진행할 수 있습니다."
               : "로그인하면 마이페이지에서 플랜, 사이트, 비밀번호를 편하게 관리할 수 있습니다."}
         </p>

         {registeredMessage && !isSignup && (
            <p className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
               {registeredMessage}
            </p>
         )}

         <form onSubmit={handleSubmit} className="mt-7 divide-y divide-zinc-300">
            <div className="space-y-4 py-7">
               {isSignup && (
                  <>
                     <div>
                        <label htmlFor="name" className="text-sm font-medium text-zinc-600">
                           이름
                        </label>
                        <div className="mt-1.5">
                           <input
                              type="text"
                              name="name"
                              id="name"
                              placeholder="이름"
                              className={inputClass}
                              value={signupForm.name}
                              onChange={(event) =>
                                 handleSignupChange("name", event.target.value)
                              }
                              required
                           />
                        </div>
                     </div>

                     <div>
                        <label htmlFor="loginId" className="text-sm font-medium text-zinc-600">
                           아이디
                        </label>
                        <div className="mt-1.5 flex gap-2">
                           <input
                              type="text"
                              name="loginId"
                              id="loginId"
                              placeholder="아이디"
                              className={inputClass}
                              value={signupForm.loginId}
                              onChange={(event) =>
                                 handleSignupChange("loginId", event.target.value)
                              }
                              required
                           />
                           <button
                              type="button"
                              onClick={handleCheckLoginId}
                              className={checkButtonClass}
                              disabled={idCheck.status === "checking"}
                           >
                              {idCheck.status === "checking" ? "확인중" : "중복체크"}
                           </button>
                        </div>
                        <FieldFeedback
                           tone={
                              idCheck.status === "success"
                                 ? "success"
                                 : idCheck.status === "error"
                                   ? "error"
                                   : "neutral"
                           }
                           message={idCheck.message}
                        />
                     </div>
                  </>
               )}

               {!isSignup && (
                  <div>
                     <label htmlFor="loginId" className="text-sm font-medium text-zinc-600">
                        아이디
                     </label>
                     <div className="mt-1.5">
                        <input
                           type="text"
                           name="loginId"
                           id="loginId"
                           placeholder="아이디"
                           className={inputClass}
                           value={loginForm.loginId}
                           onChange={(event) =>
                              setLoginForm((current) => ({
                                 ...current,
                                 loginId: event.target.value,
                              }))
                           }
                           required
                        />
                     </div>
                  </div>
               )}

               <div>
                  <label htmlFor="password" className="text-sm font-medium text-zinc-600">
                     비밀번호
                  </label>
                  <div className="mt-1.5">
                     <input
                        type="password"
                        name="password"
                        id="password"
                        placeholder="비밀번호를 입력해주세요"
                        className={inputClass}
                        value={isSignup ? signupForm.password : loginForm.password}
                        onChange={(event) =>
                           isSignup
                              ? handleSignupChange("password", event.target.value)
                              : setLoginForm((current) => ({
                                   ...current,
                                   password: event.target.value,
                                }))
                        }
                        required
                     />
                  </div>
                  {isSignup && (
                     <FieldFeedback
                        tone={
                           signupForm.password
                              ? validatePassword(signupForm.password)
                                 ? "success"
                                 : "error"
                              : "neutral"
                        }
                        message={passwordGuide}
                     />
                  )}
               </div>

               {isSignup && (
                  <>
                     <div>
                        <label htmlFor="customId" className="text-sm font-medium text-zinc-600">
                           닉네임
                        </label>
                        <div className="mt-1.5 flex gap-2">
                           <input
                              type="text"
                              name="customId"
                              id="customId"
                              placeholder="닉네임"
                              className={inputClass}
                              value={signupForm.customId}
                              onChange={(event) =>
                                 handleSignupChange("customId", event.target.value)
                              }
                              required
                           />
                           <button
                              type="button"
                              onClick={handleCheckNickname}
                              className={checkButtonClass}
                              disabled={nicknameCheck.status === "checking"}
                           >
                              {nicknameCheck.status === "checking" ? "확인중" : "중복체크"}
                           </button>
                        </div>
                        <FieldFeedback
                           tone={
                              nicknameCheck.status === "success"
                                 ? "success"
                                 : nicknameCheck.status === "error"
                                   ? "error"
                                   : "neutral"
                           }
                           message={nicknameCheck.message}
                        />
                     </div>

                     <div>
                        <label htmlFor="email" className="text-sm font-medium text-zinc-600">
                           이메일 <span className="text-zinc-400">(선택)</span>
                        </label>
                        <div className="mt-1.5">
                           <input
                              type="email"
                              name="email"
                              id="email"
                              placeholder="you@example.com"
                              className={inputClass}
                              value={signupForm.email}
                              onChange={(event) =>
                                 handleSignupChange("email", event.target.value)
                              }
                           />
                        </div>
                     </div>
                  </>
               )}

               {error && (
                  <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                     {error}
                  </p>
               )}

               {!isSignup && (
                  <p className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm leading-6 text-zinc-600">
                     비밀번호를 잊으셨다면 문의 페이지 또는 카카오톡 채널로 문의해주세요.
                     기존 비밀번호 확인은 불가능하며, 본인 확인 후 임시 비밀번호 재설정을
                     도와드립니다.
                  </p>
               )}

               <div className="pt-3.5">
                  <button
                     type="submit"
                     disabled={submitting}
                     className="block rounded-lg border border-emerald-700 bg-emerald-600 px-5 py-3 text-sm font-medium text-white shadow-sm duration-150 hover:bg-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                     {submitting
                        ? isSignup
                           ? "가입 중..."
                           : "로그인 중..."
                        : isSignup
                          ? "회원가입"
                          : "로그인"}
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
