import "./globals.css";

export const metadata = {
   title: "플로우머스 | 명품 구매대행 자동화 솔루션",
   description:
      "명품 쇼핑몰 상품 등록 자동화, 구매대행 자동화, 마진 설정, 단어 치환, SEO 상품명 최적화와 재고관리까지 지원하는 플로우머스 솔루션 소개 사이트입니다.",
   icons: {
      icon: [
         { url: "/favicon.ico", sizes: "any" },
         { url: "/icon.png", type: "image/png", sizes: "768x768" },
      ],
      shortcut: "/favicon.ico",
      apple: "/icon.png",
   },
};

export default function RootLayout({ children }) {
   return (
      <html
         lang="ko"
         className="h-full min-h-screen scroll-smooth bg-white text-base text-zinc-950 antialiased"
      >
         <head>
            <link
               rel="preconnect"
               href="https://cdn.jsdelivr.net"
               crossOrigin="anonymous"
            />
            <link
               rel="stylesheet"
               href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css"
            />
         </head>
         <body className="flex h-full flex-col">{children}</body>
      </html>
   );
}
