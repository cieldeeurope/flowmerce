import Container from "@/components/Container";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import RequestForm from "@/components/RequestForm";
import { createMetadata } from "@/lib/seo";

export const metadata = createMetadata({
   title: "문의",
   description:
      "플랜 문의, 컨설팅 문의, 기술 문의, 사이트 문의, 계정 문의를 남기고 담당자 유선 상담을 받아보세요.",
   path: "/inquiry",
});

export default function InquiryPage() {
   return (
      <>
         <Header />
         <main className="bg-zinc-50 py-16 md:py-24">
            <Container>
               <div className="mb-10 max-w-3xl">
                  <span className="inline-flex rounded-md border border-emerald-300 bg-emerald-100 px-2.5 py-1.5 text-xs font-semibold text-emerald-600 shadow-sm">
                     Inquiry
                  </span>
                  <h1 className="mt-4 text-4xl font-semibold leading-tight sm:text-5xl">
                     문의
                  </h1>
                  <p className="mt-5 text-lg leading-8 text-zinc-600">
                     플랜, 컨설팅, 기술, 계정, 사이트 관련 문의를 남겨주시면 담당자가
                     순차적으로 안내드립니다.
                  </p>
               </div>

               <RequestForm />
            </Container>
         </main>
         <Footer />
      </>
   );
}
