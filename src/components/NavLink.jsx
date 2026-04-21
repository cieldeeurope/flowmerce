import Link from "next/link";

export default function NavLink({ href, children }) {
   return (
      <Link
         href={href}
         className="inline-block text-sm font-medium text-zinc-600 hover:text-zinc-950"
      >
         {children}
      </Link>
   );
}
