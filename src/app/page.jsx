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

const homeTitle = "플로우머스";
const homeDescription =
   "상품 등록 자동화부터 SEO 상품명 최적화, 재고 연동, 원격 수집 운영까지 한 번에 관리하는 쇼핑몰 자동화 SaaS, 플로우머스.";

export const metadata = createMetadata({
   title: homeTitle,
   description: homeDescription,
   path: "/",
});

export default function Home() {
   const structuredData = [
      {
         "@context": "https://schema.org",
         "@type": "Organization",
         name: "플로우머스",
         url: siteUrl,
         logo: `${siteUrl}/brand/silver-symbol.png`,
         sameAs: ["https://pf.kakao.com/_hPdjX/chat"],
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
         name: "플로우머스 쇼핑몰 운영 자동화 SaaS",
         provider: {
            "@type": "Organization",
            name: "플로우머스",
         },
         areaServed: "KR",
         serviceType: "쇼핑몰 자동화 및 구매대행 운영 자동화",
         description:
            "스마트스토어, 고도몰, 카페24 등 쇼핑몰 운영에 필요한 상품 등록 자동화, 재고 연동, SEO 상품명 최적화, 원격 수집 실행을 지원하는 SaaS입니다.",
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
