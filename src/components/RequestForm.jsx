"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { getSession } from "@/lib/auth";
import { submitInquiry } from "@/lib/requests";

const fieldClass =
   "block w-full rounded-lg border-0 bg-white px-4 py-3 text-sm shadow-sm ring-1 ring-inset ring-zinc-300 placeholder:text-zinc-400 focus:ring-2 focus:ring-inset focus:ring-emerald-600";

const inquiryTypes = [
   "플랜 문의",
   "컨설팅 문의",
   "기술 문의",
   "사이트 문의",
   "계정 문의",
   "기타 문의",
];

const kakaoUrl = "https://pf.kakao.com/_hPdjX/chat";

export default function RequestForm() {
   const searchParams = useSearchParams();
   const [status, setStatus] = useState("idle");
   const [message, setMessage] = useState("");
   const [phone, setPhone] = useState("");

   const defaultType = useMemo(() => {
      const requestedType = searchParams.get("type");
      return inquiryTypes.includes(requestedType) ? requestedType : inquiryTypes[0];
   }, [searchParams]);

   const withdrawalTemplate = useMemo(() => {
      if (searchParams.get("template") !== "withdrawal") {
         return "";
      }

      return `회원탈퇴를 희망합니다.

- 로그인 아이디(loginId):
- 닉네임(customId):
- 연락처:
- 본인 확인 가능한 시간대:
- 추가 요청사항(선택):

비밀번호는 적지 말아주세요. 접수 후 본인 확인 절차에 따라 순차 안내드립니다.`;
   }, [searchParams]);

   const contentPlaceholder = withdrawalTemplate
      ? "기본 안내 문구를 확인한 뒤 필요한 내용만 추가로 작성해주세요."
      : `기재하신 연락처로 유선 상담이 진행될 수 있으니 정확하게 작성해주세요.

- 문의하실 내용
- 관심 있는 플랜 또는 서비스
- 사용 중인 쇼핑몰 또는 운영 상황
- 연락 가능한 시간대`;

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

   const handleSubmit = async (event) => {
      event.preventDefault();
      setStatus("loading");
      setMessage("");

      const formElement = event.currentTarget;
      const formData = new FormData(formElement);
      const payload = Object.fromEntries(formData.entries());
      const session = getSession();

      try {
         await submitInquiry(payload, session);
         formElement.reset();
         setPhone("");
         setStatus("success");
         setMessage(
            "문의가 정상적으로 접수되었습니다. 기재하신 연락처로 순차 안내드릴 예정입니다.",
         );
      } catch {
         setStatus("error");
         setMessage("문의를 접수하지 못했습니다. 잠시 후 다시 시도해주세요.");
         return;
      }
   };

   return (
      <div className="space-y-7">
         <div className="rounded-lg border border-zinc-200 bg-white p-7 shadow-sm">
            <h2 className="text-2xl font-semibold">문의하기</h2>
            <p className="mt-3 text-sm leading-7 text-zinc-600">
               문의는 대부분 담당자 유선 상담으로 진행됩니다. 연락 가능한 연락처를
               정확하게 기재해주시면 순차적으로 안내드리고 있습니다.
            </p>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
               <a
                  href={kakaoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex justify-center rounded-lg border border-zinc-300 bg-white px-5 py-3 text-sm font-medium text-zinc-800 shadow-sm transition hover:bg-zinc-50"
               >
                  카카오톡으로 상담하기
               </a>
               <Link
                  href="#inquiry-form"
                  className="inline-flex justify-center rounded-lg border border-emerald-700 bg-emerald-600 px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-700"
               >
                  문의글 작성하기
               </Link>
            </div>
         </div>

         <form
            id="inquiry-form"
            onSubmit={handleSubmit}
            className="rounded-lg border border-zinc-200 bg-white p-7 shadow-sm"
         >
            <div className="grid gap-5 md:grid-cols-2">
               <div>
                  <label htmlFor="type" className="text-sm font-medium text-zinc-600">
                     문의 유형
                  </label>
                  <select
                     id="type"
                     name="type"
                     className={`${fieldClass} mt-1.5`}
                     defaultValue={defaultType}
                     required
                  >
                     {inquiryTypes.map((type) => (
                        <option key={type} value={type}>
                           {type}
                        </option>
                     ))}
                  </select>
               </div>

               <div>
                  <label htmlFor="name" className="text-sm font-medium text-zinc-600">
                     이름
                  </label>
                  <input
                     id="name"
                     name="name"
                     type="text"
                     className={`${fieldClass} mt-1.5`}
                     placeholder="이름을 입력해주세요"
                     required
                  />
               </div>
            </div>

            <div className="mt-5 grid gap-5 md:grid-cols-2">
               <div>
                  <label htmlFor="phone" className="text-sm font-medium text-zinc-600">
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
                     className={`${fieldClass} mt-1.5`}
                     placeholder="010-1234-5678"
                     maxLength={13}
                     required
                  />
               </div>

               <div>
                  <label htmlFor="email" className="text-sm font-medium text-zinc-600">
                     이메일 <span className="text-zinc-400">(선택)</span>
                  </label>
                  <input
                     id="email"
                     name="email"
                     type="email"
                     className={`${fieldClass} mt-1.5`}
                     placeholder="you@example.com"
                  />
               </div>
            </div>

            <div className="mt-5">
               <label htmlFor="content" className="text-sm font-medium text-zinc-600">
                  문의 내용
               </label>
               <textarea
                  id="content"
                  name="content"
                  rows={8}
                  className={`${fieldClass} mt-1.5`}
                  defaultValue={withdrawalTemplate || undefined}
                  placeholder={contentPlaceholder}
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
               className="mt-7 inline-flex rounded-lg border border-emerald-700 bg-emerald-600 px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
               {status === "loading" ? "접수 중..." : "문의 등록하기"}
            </button>
         </form>
      </div>
   );
}
