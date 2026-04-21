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

export default function Home() {
   return (
      <>
         <Header />
         <main>
            <Hero />
            <LogoCarousel />
            <Platforms />
            <IdentityGuide />
            <SalesProof />
            <Features />
            <Pricing />
            <Faqs />
            <Contacts />
         </main>
         <Footer />
      </>
   );
}
