import Container from "@/components/Container";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import RequestForm from "@/components/RequestForm";

export const metadata = {
   title: "요청서 - Flowmerce",
   description: "쇼핑몰 상품 등록 자동화 문의 요청서",
};

export default function RequestPage() {
   return (
      <>
         <Header />
         <main className="bg-zinc-50 py-16 md:py-24">
            <Container>
               <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
                  <div>
                     <span className="inline-flex rounded-md border border-emerald-300 bg-emerald-100 px-2.5 py-1.5 text-xs font-semibold text-emerald-600 shadow-sm">
                        Request
                     </span>
                     <h1 className="mt-4 text-4xl font-semibold leading-tight sm:text-5xl">
                        자동화 요청서를 작성해주세요
                     </h1>
                     <p className="mt-5 text-lg text-zinc-600">
                        요청서 목록은 누구나 볼 수 있고, 작성은 회원가입 후 진행됩니다. 아이디와 패스워드 같은 상세 정보는 작성자와 관리자만 확인합니다.
                     </p>
                     <div className="mt-7 rounded-lg border border-zinc-200 bg-white p-5 text-sm text-zinc-600 shadow-sm">
                        <p className="font-medium text-zinc-950">요청서 카테고리</p>
                        <p className="mt-2">상품 등록 자동화, 플랫폼 연동, 재고 동기화, 예약 업데이트, 호스팅 이전</p>
                     </div>
                  </div>
                  <RequestForm />
               </div>
            </Container>
         </main>
         <Footer />
      </>
   );
}
