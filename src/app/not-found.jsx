import { ArrowLeftIcon } from "@/components/icons/ArrowLeftIcon";
import Link from "next/link";
import { createNoIndexMetadata } from "@/lib/seo";

export const metadata = createNoIndexMetadata({
   title: "페이지를 찾을 수 없습니다",
   description: "요청하신 페이지를 찾을 수 없습니다.",
});

export default function NotFound() {
   return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-zinc-50 px-7">
         <div className="flex w-full max-w-sm">
            <Link
               href="/"
               className="inline-flex items-center gap-x-1.5 rounded-lg py-2 text-sm font-medium text-zinc-600 duration-150 hover:bg-zinc-200 hover:px-3"
            >
               <ArrowLeftIcon className="h-4 w-4" />
               홈으로 돌아가기
            </Link>
         </div>

         <div className="mt-7 flex w-full max-w-sm flex-col">
            <p className="text-lg font-medium text-emerald-600">404</p>
            <h1 className="mt-5 text-4xl font-medium">
               페이지를 찾을 수 없습니다
            </h1>
            <p className="mt-3.5 leading-7 text-zinc-600">
               요청하신 주소가 변경되었거나 삭제되었을 수 있습니다.
            </p>
         </div>
      </div>
   );
}
