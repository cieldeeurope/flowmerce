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
import { createMetadata, siteName, siteNameFull, siteUrl } from "@/lib/seo";

const homeTitle = siteNameFull;
const homeDescription =
   "플로우머스는 카페24, 고도몰, 스마트스토어, 메이크샵 운영에 필요한 상품 등록 자동화, 재고관리 자동화, SEO 상품명 최적화, 카테고리 매핑, 마진 설정, 단어 치환, 수집 예약을 한 번에 관리하는 쇼핑몰 자동화 솔루션입니다.";

const primaryPages = [
   {
      name: "핵심 가이드",
      url: `${siteUrl}/guide`,
      description: "구매대행 구조와 운영 흐름을 정리한 핵심 가이드",
   },
   {
      name: "프로그램 소개",
      url: `${siteUrl}/program`,
      description: "실제 운영 화면과 사용 흐름을 확인하는 프로그램 소개",
   },
   {
      name: "컨설팅",
      url: `${siteUrl}/consulting`,
      description: "1:1 실전 컨설팅과 운영 확장 전략 안내",
   },
   {
      name: "가격",
      url: `${siteUrl}/pricing`,
      description: "플랜별 요금제와 운영 기준 안내",
   },
   {
      name: "자주 묻는 질문",
      url: `${siteUrl}/#faq`,
      description: "운영과 도입 전 가장 많이 묻는 질문 정리",
   },
   {
      name: "문의",
      url: `${siteUrl}/inquiry`,
      description: "카카오톡 상담과 문의 접수 페이지",
   },
];

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
         name: siteName,
         url: siteUrl,
         logo: `${siteUrl}/favicon.png`,
         sameAs: [
            "https://pf.kakao.com/_hPdjX/chat",
            "https://www.instagram.com/flowmerce.official/",
         ],
      },
      {
         "@context": "https://schema.org",
         "@type": "WebSite",
         name: siteName,
         alternateName: "플로우머스 쇼핑몰 자동화 솔루션",
         url: siteUrl,
         inLanguage: "ko-KR",
      },
      {
         "@context": "https://schema.org",
         "@type": "WebPage",
         name: homeTitle,
         headline: homeTitle,
         url: siteUrl,
         description: homeDescription,
         about: [
            "쇼핑몰 자동화",
            "상품 등록 자동화",
            "재고관리 자동화",
            "카테고리 매핑",
            "마진 설정",
            "SEO 상품명 최적화",
         ],
         isPartOf: {
            "@type": "WebSite",
            name: siteName,
            url: siteUrl,
         },
      },
      {
         "@context": "https://schema.org",
         "@type": "Service",
         name: "플로우머스 쇼핑몰 자동화 솔루션",
         provider: {
            "@type": "Organization",
            name: siteName,
            url: siteUrl,
         },
         areaServed: "KR",
         serviceType: "쇼핑몰 상품 등록 및 재고관리 자동화",
         description: homeDescription,
      },
      ...primaryPages.map((page) => ({
         "@context": "https://schema.org",
         "@type": "SiteNavigationElement",
         name: page.name,
         description: page.description,
         url: page.url,
      })),
      {
         "@context": "https://schema.org",
         "@type": "ItemList",
         name: "플로우머스 주요 페이지",
         itemListElement: primaryPages.map((page, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: page.name,
            url: page.url,
         })),
      },
   ];

   return (
      <>
         <Header />
         <main className="bg-[#f7f4ef] text-zinc-950">
            <script
               type="application/ld+json"
               dangerouslySetInnerHTML={{
                  __html: JSON.stringify(structuredData),
               }}
            />
            <Hero />
            <LogoCarousel />
            <Features />
            <Platforms />
            <SalesProof />
            <IdentityGuide />
            <Testimonials />
            <Pricing />
            <Faqs />
            <Contacts />
         </main>
         <Footer />
      </>
   );
}
