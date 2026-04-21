import "./globals.css";
import localFont from "next/font/local";

const inter = localFont({
   src: [
      {
         path: "../../public/fonts/Inter.var.woff2",
         weight: "100 900",
         style: "normal",
      },
      {
         path: "../../public/fonts/Inter-italic.var.woff2",
         weight: "100 900",
         style: "italic",
      },
   ],
   variable: "--font-inter",
   display: "swap",
});

export const metadata = {
   title: "Flowmerce - 쇼핑몰 상품 등록 자동화",
   description:
      "명품 크롤링, 마진 설정, 단어 치환, SEO 상품명 최적화, 재고관리까지 지원하는 쇼핑몰 상품 등록 자동화 서비스입니다.",
};

export default function RootLayout({ children }) {
   return (
      <html
         lang="ko"
         className={`h-full min-h-screen scroll-smooth bg-white text-base text-zinc-950 antialiased ${inter.variable}`}
      >
         <body className="flex h-full flex-col">{children}</body>
      </html>
   );
}
