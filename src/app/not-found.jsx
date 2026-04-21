import { ArrowLeftIcon } from "@/components/icons/ArrowLeftIcon";
import Link from "next/link";

export default function NotFound() {
   return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-zinc-50 px-7">
         <div className="flex w-full max-w-sm">
            <Link
               href="/"
               className="inline-flex items-center gap-x-1.5 rounded-lg py-2 text-sm font-medium text-zinc-600 duration-150 hover:bg-zinc-200 hover:px-3"
            >
               <ArrowLeftIcon className="h-4 w-4" />
               Back to home
            </Link>
         </div>

         <div className="mt-7 flex w-full max-w-sm flex-col">
            <p className="text-lg font-medium text-emerald-600">404</p>
            <h1 className="mt-5 text-4xl font-medium">Page not found</h1>
            <p className="mt-3.5 text-zinc-600">
               Sorry, we couldn&apos;t find the page you&apos;re looking for.
            </p>
         </div>
      </div>
   );
}
