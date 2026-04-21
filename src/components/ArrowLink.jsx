import Link from "next/link";
import { ArrowRightIcon } from "./icons/ArrowRightIcon";

export default function ArrowLink({ href, text }) {
   return (
      <Link
         href={href}
         className="inline-flex items-center gap-x-1.5 text-sm font-medium hover:text-zinc-600"
      >
         {text} <ArrowRightIcon className="h-4 w-4" />
      </Link>
   );
}
