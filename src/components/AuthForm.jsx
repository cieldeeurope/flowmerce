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
   phone: "",
   email: "",
};

const initialLoginForm = {
   loginId: "",
   password: "",
};

const initialSignupAgreements = {
   terms: false,
   privacy: false,
   subscription: false,
};

function formatPhoneInput(value) {
   const digits = String(value || "")
      .replace(/\D/g, "")
      .slice(0, 11);

   if (digits.length <= 3) {
      return digits;
   }

   if (digits.length <= 7) {
      return `${digits.slice(0, 3)}-${digits.slice(3)}`;
   }

   return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

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
   const [signupAgreements, setSignupAgreements] = useState(
      initialSignupAgreements,
   );
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

      return "회원가입이 완료되었습니다. 지금 바로 로그인해 마이페이지를 확인해보세요.";
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
      const nextValue = field === "phone" ? formatPhoneInput(value) : value;

      setSignupForm((current) => ({
         ...current,
         [field]: nextValue,
      }));

      if (field === "loginId") {
         setIdCheck((current) =>
            current.value === nextValue
               ? current
               : { status: "idle", message: "", value: "" },
         );
      }

      if (field === "customId") {
         setNicknameCheck((current) =>
            current.value === nextValue
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

            if (!/^\d{3}-\d{4}-\d{4}$/.test(signupForm.phone)) {
               throw new Error("연락처 형식이 아닙니다.");
            }

            if (!Object.values(signupAgreements).every(Boolean)) {
               throw new Error("필수 동의 사항을 모두 확인해주세요.");
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
               ? "회원가입 후 관리자 확인과 세팅을 거치면 서비스를 이용하실 수 있습니다."
               : "로그인 후 마이페이지에서 진행 상태와 이용 현황을 확인하실 수 있습니다."}
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
                              disabled={!signupForm.loginId.trim()}
                           >
                              중복체크
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
                              placeholder="비밀번호"
                              className={inputClass}
                              value={signupForm.password}
                              onChange={(event) =>
                                 handleSignupChange("password", event.target.value)
                              }
                              required
                           />
                        </div>
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
                     </div>

                     <div>
                        <label
                           htmlFor="customId"
                           className="text-sm font-medium text-zinc-600"
                        >
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
                              disabled={!signupForm.customId.trim()}
                           >
                              중복체크
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
                        <label htmlFor="phone" className="text-sm font-medium text-zinc-600">
                           연락처
                        </label>
                        <div className="mt-1.5">
                           <input
                              type="tel"
                              name="phone"
                              id="phone"
                              placeholder="010-0000-0000"
                              inputMode="numeric"
                              maxLength={13}
                              className={inputClass}
                              value={signupForm.phone}
                              onChange={(event) =>
                                 handleSignupChange("phone", event.target.value)
                              }
                              required
                           />
                        </div>
                     </div>

                     <div>
                        <label htmlFor="email" className="text-sm font-medium text-zinc-600">
                           이메일
                        </label>
                        <div className="mt-1.5">
                           <input
                              type="email"
                              name="email"
                              id="email"
                              placeholder="example@flowmerce.co.kr"
                              className={inputClass}
                              value={signupForm.email}
                              onChange={(event) =>
                                 handleSignupChange("email", event.target.value)
                              }
                           />
                        </div>
                     </div>

                     <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                        <p className="text-sm font-medium text-zinc-800">
                           가입 전 필수 확인
                        </p>
                        <div className="mt-3 space-y-3">
                           <label className="flex items-start gap-3 text-sm leading-6 text-zinc-600">
                              <input
                                 type="checkbox"
                                 checked={signupAgreements.terms}
                                 onChange={(event) =>
                                    setSignupAgreements((current) => ({
                                       ...current,
                                       terms: event.target.checked,
                                    }))
                                 }
                                 className="mt-1 h-4 w-4 rounded border-zinc-300 text-emerald-600"
                              />
                              <span>
                                 <Link
                                    href="/terms"
                                    target="_blank"
                                    className="font-semibold text-zinc-950 underline decoration-zinc-300 underline-offset-4"
                                 >
                                    이용약관
                                 </Link>
                                 을 확인하고 동의합니다.
                              </span>
                           </label>

                           <label className="flex items-start gap-3 text-sm leading-6 text-zinc-600">
                              <input
                                 type="checkbox"
                                 checked={signupAgreements.privacy}
                                 onChange={(event) =>
                                    setSignupAgreements((current) => ({
                                       ...current,
                                       privacy: event.target.checked,
                                    }))
                                 }
                                 className="mt-1 h-4 w-4 rounded border-zinc-300 text-emerald-600"
                              />
                              <span>
                                 <Link
                                    href="/privacy"
                                    target="_blank"
                                    className="font-semibold text-zinc-950 underline decoration-zinc-300 underline-offset-4"
                                 >
                                    개인정보처리방침
                                 </Link>
                                 을 확인하고 동의합니다.
                              </span>
                           </label>

                           <label className="flex items-start gap-3 text-sm leading-6 text-zinc-600">
                              <input
                                 type="checkbox"
                                 checked={signupAgreements.subscription}
                                 onChange={(event) =>
                                    setSignupAgreements((current) => ({
                                       ...current,
                                       subscription: event.target.checked,
                                    }))
                                 }
                                 className="mt-1 h-4 w-4 rounded border-zinc-300 text-emerald-600"
                              />
                              <span>
                                 <Link
                                    href="/subscription-agreement"
                                    target="_blank"
                                    className="font-semibold text-zinc-950 underline decoration-zinc-300 underline-offset-4"
                                 >
                                    구독 및 운영 동의서
                                 </Link>
                                 와 구독 종료 후 상품 삭제 기준을 확인했습니다.
                              </span>
                           </label>
                        </div>

                        <p className="mt-3 text-xs leading-6 text-zinc-500">
                           회원가입은 계정 생성 단계이며, 실제 구독 전에는 가격 페이지에서 운영 기준과
                           환불/데이터 정책을 다시 확인할 수 있습니다.
                        </p>
                     </div>
                  </>
                )}

               {!isSignup && (
                  <>
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
                              placeholder="비밀번호"
                              className={inputClass}
                              value={loginForm.password}
                              onChange={(event) =>
                                 setLoginForm((current) => ({
                                    ...current,
                                    password: event.target.value,
                                 }))
                              }
                              required
                           />
                        </div>
                     </div>
                  </>
               )}
            </div>

            <div className="space-y-4 py-7">
               {error && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                     {error}
                  </div>
               )}

               <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex h-12 w-full items-center justify-center rounded-lg bg-emerald-600 px-4 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
               >
                  {submitting
                     ? isSignup
                        ? "가입 중..."
                        : "로그인 중..."
                     : isSignup
                       ? "회원가입"
                       : "로그인"}
               </button>

               <p className="text-center text-sm text-zinc-600">
                  {isSignup ? "이미 계정이 있나요?" : "아직 계정이 없나요?"}{" "}
                  <Link
                     href={isSignup ? "/login" : "/signup"}
                     className="font-medium text-emerald-700 hover:text-emerald-800"
                  >
                     {isSignup ? "로그인" : "회원가입"}
                  </Link>
               </p>
            </div>
         </form>
      </div>
   );
}
