"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getSession } from "@/lib/auth";
import {
   addRequest,
   canReadRequestDetail,
   getVisibleRequests,
} from "@/lib/requests";

const fieldClass =
   "block w-full rounded-lg border-0 bg-white px-4 py-3 text-sm shadow-sm ring-1 ring-inset ring-zinc-300 placeholder:text-zinc-400 focus:ring-2 focus:ring-inset focus:ring-emerald-600";

export default function RequestForm() {
   const router = useRouter();
   const [session, setSession] = useState(null);
   const [isWriting, setIsWriting] = useState(false);
   const [requests, setRequests] = useState([]);
   const [status, setStatus] = useState("idle");
   const [message, setMessage] = useState("");
   const [phone, setPhone] = useState("");

   useEffect(() => {
      const currentSession = getSession();

      setSession(currentSession);
      setRequests(getVisibleRequests(currentSession));
   }, []);

   const formatPhoneNumber = (value) => {
      const digits = value.replace(/\D/g, "").slice(0, 11);

      if (digits.length <= 3) {
         return digits;
      }

      if (digits.length <= 7) {
         return `${digits.slice(0, 3)}-${digits.slice(3)}`;
      }

      return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
   };

   const handleStartWriting = () => {
      const currentSession = getSession();

      if (!currentSession) {
         router.push("/signup?next=/request");
         return;
      }

      setSession(currentSession);
      setRequests(getVisibleRequests(currentSession));
      setIsWriting(true);
   };

   const handleSubmit = async (event) => {
      event.preventDefault();

      const currentSession = getSession();

      if (!currentSession) {
         router.push("/signup?next=/request");
         return;
      }

      setStatus("loading");
      setMessage("");

      const formData = new FormData(event.currentTarget);
      const payload = Object.fromEntries(formData.entries());

      const response = await fetch("/api/request", {
         method: "POST",
         headers: {
            "Content-Type": "application/json",
         },
         body: JSON.stringify({
            ...payload,
            authorEmail: currentSession.email,
         }),
      });

      if (!response.ok) {
         setStatus("error");
         setMessage("요청을 저장하지 못했습니다. 잠시 후 다시 시도해주세요.");
         return;
      }

      addRequest(payload, currentSession);
      setRequests(getVisibleRequests(currentSession));
      event.currentTarget.reset();
      setPhone("");
      setStatus("success");
      setMessage("요청 완료");
   };

   return (
      <div className="space-y-7">
         {!isWriting && (
            <div className="rounded-lg border border-zinc-200 bg-white p-7 shadow-sm">
               <h2 className="text-2xl font-semibold">요청서를 시작하세요</h2>
               <p className="mt-3 text-sm leading-6 text-zinc-600">
                  폼을 열기 전 로그인 상태를 확인합니다. 로그인하지 않았다면 회원가입 화면으로 이동합니다.
               </p>
               <button
                  type="button"
                  onClick={handleStartWriting}
                  className="mt-7 inline-flex rounded-lg border border-emerald-700 bg-emerald-600 px-5 py-3 text-sm font-medium text-white shadow-sm duration-150 hover:bg-emerald-700"
               >
                  요청서 작성하기
               </button>
               <p className="mt-4 text-xs text-zinc-500">
                  목록은 모두 볼 수 있고, 아이디와 패스워드 같은 상세 정보는 작성자와 관리자만 볼 수 있습니다.
               </p>
            </div>
         )}

         {isWriting && session && (
            <form
               onSubmit={handleSubmit}
               className="rounded-lg border border-zinc-200 bg-white p-7 shadow-sm"
            >
               <div className="grid gap-5 md:grid-cols-2">
                  <div>
                     <label
                        htmlFor="name"
                        className="text-sm font-medium text-zinc-600"
                     >
                        이름
                     </label>
                     <input
                        id="name"
                        name="name"
                        type="text"
                        defaultValue={session.name}
                        className={`${fieldClass} mt-1.5`}
                        required
                     />
                  </div>
                  <div>
                     <label
                        htmlFor="email"
                        className="text-sm font-medium text-zinc-600"
                     >
                        이메일
                     </label>
                     <input
                        id="email"
                        name="email"
                        type="email"
                        defaultValue={session.email}
                        className={`${fieldClass} mt-1.5`}
                        required
                     />
                  </div>
               </div>

               <div className="mt-5">
                  <label
                     htmlFor="platform"
                     className="text-sm font-medium text-zinc-600"
                  >
                     플랫폼 선택
                  </label>
                  <select
                     id="platform"
                     name="platform"
                     className={`${fieldClass} mt-1.5`}
                     required
                  >
                     <option value="카페24">카페24</option>
                     <option value="고도몰">고도몰</option>
                     <option value="스마트스토어">스마트스토어</option>
                     <option value="메이크샵">메이크샵</option>
                  </select>
               </div>

               <div className="mt-5 grid gap-5 md:grid-cols-2">
                  <div>
                     <label
                        htmlFor="mallId"
                        className="text-sm font-medium text-zinc-600"
                     >
                        아이디
                     </label>
                     <input
                        id="mallId"
                        name="mallId"
                        type="text"
                        placeholder="쇼핑몰 아이디"
                        className={`${fieldClass} mt-1.5`}
                        required
                     />
                  </div>
                  <div>
                     <label
                        htmlFor="mallPassword"
                        className="text-sm font-medium text-zinc-600"
                     >
                        패스워드
                     </label>
                     <input
                        id="mallPassword"
                        name="mallPassword"
                        type="password"
                        placeholder="쇼핑몰 패스워드"
                        className={`${fieldClass} mt-1.5`}
                        required
                     />
                  </div>
               </div>

               <div className="mt-5 grid gap-5 md:grid-cols-2">
                  <div>
                     <label
                        htmlFor="plan"
                        className="text-sm font-medium text-zinc-600"
                     >
                        결제플랜
                     </label>
                     <select
                        id="plan"
                        name="plan"
                        className={`${fieldClass} mt-1.5`}
                        required
                     >
                        <option value="베이직">베이직</option>
                        <option value="프로">프로</option>
                        <option value="엔터프라이즈">엔터프라이즈</option>
                     </select>
                  </div>
                  <div>
                     <label
                        htmlFor="phone"
                        className="text-sm font-medium text-zinc-600"
                     >
                        연락처
                     </label>
                     <input
                        id="phone"
                        name="phone"
                        type="tel"
                        inputMode="numeric"
                        value={phone}
                        onChange={(event) =>
                           setPhone(formatPhoneNumber(event.target.value))
                        }
                        placeholder="010-1234-5678"
                        className={`${fieldClass} mt-1.5`}
                        maxLength={13}
                        required
                     />
                  </div>
               </div>

               <div className="mt-5">
                  <label
                     htmlFor="content"
                     className="text-sm font-medium text-zinc-600"
                  >
                     문의 내용
                  </label>
                  <textarea
                     id="content"
                     name="content"
                     rows={7}
                     placeholder={`쇼핑몰 아이디:
쇼핑몰 패스워드:
추가 요청사항(선택):`}
                     className={`${fieldClass} mt-1.5`}
                     required
                  />
               </div>

               {message && (
                  <p
                     className={`mt-5 rounded-lg px-4 py-3 text-sm font-medium ${
                        status === "success"
                           ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                           : "border border-red-200 bg-red-50 text-red-700"
                     }`}
                  >
                     {message}
                  </p>
               )}

               <button
                  type="submit"
                  disabled={status === "loading"}
                  className="mt-7 inline-flex rounded-lg border border-emerald-700 bg-emerald-600 px-5 py-3 text-sm font-medium text-white shadow-sm duration-150 hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
               >
                  {status === "loading" ? "전송 중" : "문의하기"}
               </button>
            </form>
         )}

         {requests.length > 0 && (
            <div className="rounded-lg border border-zinc-200 bg-white p-7 shadow-sm">
               <div className="flex items-center justify-between gap-4">
                  <div>
                     <h2 className="text-xl font-semibold">요청서 목록</h2>
                     <p className="mt-1 text-sm text-zinc-600">
                        로그인하면 내 요청서가 먼저 보이고, 상세 정보는 작성자와 관리자만 확인할 수 있습니다.
                     </p>
                  </div>
                  {session?.role === "admin" && (
                     <span className="rounded border border-emerald-700 bg-emerald-600 px-2 py-1.5 text-xs font-semibold text-white shadow-sm">
                        관리자
                     </span>
                  )}
               </div>
               <div className="mt-5 space-y-4">
                  {requests.map((request) => (
                     <RequestCard
                        key={request.id}
                        request={request}
                        session={session}
                     />
                  ))}
               </div>
            </div>
         )}
      </div>
   );
}

function RequestCard({ request, session }) {
   const canReadDetail = canReadRequestDetail(request, session);
   const isMine = session?.email === request.authorEmail;

   return (
      <article className="rounded-lg border border-zinc-200 p-5">
         <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
               <p className="font-medium text-zinc-950">
                  {request.title || "요청서 작성드립니다."}
               </p>
               <p className="mt-1 text-xs text-zinc-500">
                  {new Date(request.createdAt).toLocaleString("ko-KR")}
               </p>
            </div>
            {isMine && (
               <span className="rounded border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
                  내 문의
               </span>
            )}
         </div>

         <dl className="mt-4 grid gap-3 text-sm md:grid-cols-2">
            <div>
               <dt className="text-xs font-medium text-zinc-500">플랜</dt>
               <dd className="mt-1 text-zinc-950">{request.plan || "베이직"}</dd>
            </div>
            <div>
               <dt className="text-xs font-medium text-zinc-500">호스팅</dt>
               <dd className="mt-1 text-zinc-950">{request.platform}</dd>
            </div>
         </dl>

         {canReadDetail ? (
            <div className="mt-4 rounded-lg bg-zinc-50 p-4 text-sm text-zinc-600">
               <p>작성자: {request.authorName} ({request.authorEmail})</p>
               <p className="mt-1">연락처: {request.phone}</p>
               <p className="mt-1">쇼핑몰 아이디: {request.mallId}</p>
               <p className="mt-1">쇼핑몰 패스워드: {request.mallPassword}</p>
               <p className="mt-3 whitespace-pre-line">{request.content}</p>
            </div>
         ) : (
            <p className="mt-4 text-xs text-zinc-500">
               상세 내용은 작성자와 관리자만 확인할 수 있습니다.
            </p>
         )}
      </article>
   );
}
