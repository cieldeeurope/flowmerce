import Contacts from "@/components/Contacts";
import Faqs from "@/components/Faqs";
import Features from "@/components/Features";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import IdentityGuide from "@/components/IdentityGuide";
import LogoCarousel from "@/components/LogoCarousel";
import Platforms from "@/components/Platforms";
import Pricing from "@/components/Pricing";
import SalesProof from "@/components/SalesProof";
import Testimonials from "@/components/Testimonials";
import { createMetadata, siteUrl } from "@/lib/seo";

export const metadata = createMetadata({
   title: "쇼핑몰 자동화 솔루션",
   description:
      "쇼핑몰 상품 등록 자동화, 명품 구매대행 자동화, SEO 상품명 최적화, 재고관리 자동화까지 지원하는 플로우머스.",
   path: "/",
});

export default function Home() {
   const structuredData = [
      {
         "@context": "https://schema.org",
         "@type": "Organization",
         name: "플로우머스",
         url: siteUrl,
         logo: `${siteUrl}/icon.png`,
         sameAs: ["http://pf.kakao.com/_hPdjX/chat"],
      },
      {
         "@context": "https://schema.org",
         "@type": "WebSite",
         name: "플로우머스",
         url: siteUrl,
         inLanguage: "ko-KR",
      },
      {
         "@context": "https://schema.org",
         "@type": "Service",
         name: "플로우머스 쇼핑몰 자동화 솔루션",
         provider: {
            "@type": "Organization",
            name: "플로우머스",
         },
         areaServed: "KR",
         serviceType: "쇼핑몰 자동화 및 명품 구매대행 자동화",
         description:
            "카페24, 고도몰, 스마트스토어, 메이크샵 등 쇼핑몰 상품 등록 자동화와 재고관리 자동화, 명품 구매대행 운영 구조를 지원하는 서비스입니다.",
      },
   ];

   return (
      <>
         <Header />
         <main>
            <script
               type="application/ld+json"
               dangerouslySetInnerHTML={{
                  __html: JSON.stringify(structuredData),
               }}
            />
            <Hero />
            <LogoCarousel />
            <Platforms />
            <IdentityGuide />
            <SalesProof />
            <Testimonials />
            <Features />
            <Pricing />
            <Faqs />
            <Contacts />
         </main>
         <Footer />
      </>
   );
}
