import AdminDashboard from "@/components/AdminDashboard";
import Container from "@/components/Container";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { createNoIndexMetadata } from "@/lib/seo";

export const metadata = createNoIndexMetadata({
   title: "관리자",
   description: "플로우머스 관리자 전용 페이지입니다.",
});

export default function AdminPage() {
   return (
      <>
         <Header />
         <main className="bg-zinc-50 py-16 md:py-24">
            <Container>
               <div className="mb-10 max-w-3xl">
                  <span className="inline-flex rounded-md border border-emerald-300 bg-emerald-100 px-2.5 py-1.5 text-xs font-semibold text-emerald-600 shadow-sm">
                     Admin
                  </span>
                  <h1 className="mt-4 text-4xl font-semibold leading-tight sm:text-5xl">
                     요청서 관리자 대시보드
                  </h1>
                  <p className="mt-5 text-lg text-zinc-600">
                     관리자 계정은 전체 요청서를 확인하고, 일반 사용자는 본인이
                     작성한 요청서만 볼 수 있습니다.
                  </p>
               </div>
               <AdminDashboard />
            </Container>
         </main>
         <Footer />
      </>
   );
}
