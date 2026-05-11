import Link from "next/link";

export default function NavLink({ href, children }) {
   return (
      <Link
         href={href}
         className="inline-block text-base font-semibold text-zinc-800 transition hover:text-zinc-950"
      >
         {children}
      </Link>
   );
}
