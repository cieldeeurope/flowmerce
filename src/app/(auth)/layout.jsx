import { ArrowLeftIcon } from "@/components/icons/ArrowLeftIcon";
import Link from "next/link";

export default function AuthLayout({ children }) {
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
         {children}
      </div>
   );
}
