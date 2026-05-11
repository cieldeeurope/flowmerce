import Container from "@/components/Container";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import MyPagePanel from "@/components/MyPagePanel";
import { createNoIndexMetadata } from "@/lib/seo";

export const metadata = createNoIndexMetadata({
   title: "마이페이지",
   description: "플로우머스 계정 정보와 구독 상태를 관리하는 페이지입니다.",
});

export default function MyPage() {
   return (
      <>
         <Header />
         <main className="bg-[#f7f4ef] py-16 md:py-24">
            <Container>
               <MyPagePanel />
            </Container>
         </main>
         <Footer />
      </>
   );
}
