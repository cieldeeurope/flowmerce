import Container from "@/components/Container";
import Footer from "@/components/Footer";
import Header from "@/components/Header";

function LegalSection({ title, children }) {
   return (
      <section className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm sm:p-7">
         <h2 className="text-2xl font-semibold text-zinc-950">{title}</h2>
         <div className="mt-4 space-y-4 text-sm leading-7 text-zinc-600">
            {children}
         </div>
      </section>
   );
}

function LegalList({ items }) {
   return (
      <ul className="space-y-2">
         {items.map((item) => (
            <li key={item} className="pl-5 text-sm leading-7 text-zinc-600">
               <span className="-ml-5 mr-2 font-semibold text-zinc-950">•</span>
               {item}
            </li>
         ))}
      </ul>
   );
}

function LegalTable({ headers, rows }) {
   return (
      <div className="overflow-x-auto rounded-lg border border-zinc-200">
         <table className="min-w-full divide-y divide-zinc-200 bg-white text-left text-sm">
            <thead className="bg-zinc-50">
               <tr>
                  {headers.map((header) => (
                     <th
                        key={header}
                        className="px-4 py-3 font-semibold text-zinc-950"
                     >
                        {header}
                     </th>
                  ))}
               </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
               {rows.map((row) => (
                  <tr key={row.join("-")}>
                     {row.map((cell) => (
                        <td key={cell} className="px-4 py-3 text-zinc-600">
                           {cell}
                        </td>
                     ))}
                  </tr>
               ))}
            </tbody>
         </table>
      </div>
   );
}

export default function LegalPageShell({
   badge,
   title,
   description,
   updatedAt = "2026-04-28",
   children,
}) {
   return (
      <>
         <Header />
         <main className="bg-zinc-50 py-16 md:py-24">
            <Container>
               <div className="mx-auto max-w-4xl">
                  <div className="rounded-lg border border-zinc-200 bg-white p-7 shadow-sm sm:p-9">
                     <span className="inline-flex rounded-md border border-emerald-300 bg-emerald-100 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 shadow-sm">
                        {badge}
                     </span>
                     <h1 className="mt-4 text-4xl font-semibold leading-tight text-zinc-950 sm:text-5xl">
                        {title}
                     </h1>
                     <p className="mt-5 max-w-3xl text-base leading-8 text-zinc-600">
                        {description}
                     </p>
                     <div className="mt-6 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
                        시행일 및 최종 업데이트: <strong className="text-zinc-950">{updatedAt}</strong>
                     </div>
                  </div>

                  <div className="mt-8 space-y-6">{children}</div>
               </div>
            </Container>
         </main>
         <Footer />
      </>
   );
}

export { LegalList, LegalSection, LegalTable };
