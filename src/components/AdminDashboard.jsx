"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getSession } from "@/lib/auth";
import { getVisibleRequests } from "@/lib/requests";

export default function AdminDashboard() {
   const router = useRouter();
   const [session, setSession] = useState(null);
   const [requests, setRequests] = useState([]);
   const [checked, setChecked] = useState(false);

   useEffect(() => {
      const currentSession = getSession();

      if (!currentSession) {
         router.replace("/login?next=/admin");
         return;
      }

      setSession(currentSession);
      setRequests(getVisibleRequests(currentSession));
      setChecked(true);
   }, [router]);

   if (!checked) {
      return (
         <div className="rounded-lg border border-zinc-200 bg-white p-7 text-sm text-zinc-600 shadow-sm">
            권한을 확인하고 있습니다.
         </div>
      );
   }

   if (session?.role !== "admin") {
      return (
         <div className="rounded-lg border border-zinc-200 bg-white p-7 shadow-sm">
            <h2 className="text-2xl font-semibold">접근 권한이 없습니다</h2>
            <p className="mt-3 text-sm text-zinc-600">
               관리자 계정으로 로그인해야 전체 요청서를 볼 수 있습니다.
            </p>
            <Link
               href="/request"
               className="mt-7 inline-flex rounded-lg border border-emerald-700 bg-emerald-600 px-5 py-3 text-sm font-medium text-white shadow-sm duration-150 hover:bg-emerald-700"
            >
               요청서로 이동
            </Link>
         </div>
      );
   }

   return (
      <div className="rounded-lg border border-zinc-200 bg-white p-7 shadow-sm">
         <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
               <h2 className="text-2xl font-semibold">전체 요청서</h2>
               <p className="mt-2 text-sm text-zinc-600">
                  mock 저장소 기준으로 모든 사용자의 요청서를 확인합니다.
               </p>
            </div>
            <span className="rounded border border-emerald-700 bg-emerald-600 px-2 py-1.5 text-xs font-semibold text-white shadow-sm">
               관리자
            </span>
         </div>

         {requests.length === 0 ? (
            <p className="mt-7 rounded-lg border border-zinc-200 bg-zinc-50 p-5 text-sm text-zinc-600">
               아직 제출된 요청서가 없습니다.
            </p>
         ) : (
            <div className="mt-7 overflow-x-auto">
               <table className="min-w-full divide-y divide-zinc-200 text-sm">
                  <thead className="bg-zinc-50">
                     <tr>
                        <th className="px-5 py-4 text-left font-semibold text-zinc-950">
                           작성자
                        </th>
                        <th className="px-5 py-4 text-left font-semibold text-zinc-950">
                           호스팅
                        </th>
                        <th className="px-5 py-4 text-left font-semibold text-zinc-950">
                           플랜
                        </th>
                        <th className="px-5 py-4 text-left font-semibold text-zinc-950">
                           연락처
                        </th>
                        <th className="px-5 py-4 text-left font-semibold text-zinc-950">
                           쇼핑몰 계정
                        </th>
                        <th className="px-5 py-4 text-left font-semibold text-zinc-950">
                           문의 내용
                        </th>
                        <th className="px-5 py-4 text-left font-semibold text-zinc-950">
                           작성일
                        </th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200">
                     {requests.map((request) => (
                        <tr key={request.id}>
                           <td className="whitespace-nowrap px-5 py-4 text-zinc-600">
                              {request.authorName}
                              <span className="block text-xs text-zinc-400">
                                 {request.authorEmail}
                              </span>
                           </td>
                           <td className="whitespace-nowrap px-5 py-4 text-zinc-600">
                              {request.platform}
                           </td>
                           <td className="whitespace-nowrap px-5 py-4 text-zinc-600">
                              {request.plan || "베이직"}
                           </td>
                           <td className="whitespace-nowrap px-5 py-4 text-zinc-600">
                              {request.phone}
                           </td>
                           <td className="whitespace-nowrap px-5 py-4 text-zinc-600">
                              {request.mallId}
                              <span className="block text-xs text-zinc-400">
                                 {request.mallPassword}
                              </span>
                           </td>
                           <td className="min-w-72 px-5 py-4 text-zinc-600">
                              {request.content}
                           </td>
                           <td className="whitespace-nowrap px-5 py-4 text-zinc-600">
                              {new Date(request.createdAt).toLocaleString("ko-KR")}
                           </td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            </div>
         )}
      </div>
   );
}
