export default function manifest() {
   return {
      name: "플로우머스 | 쇼핑몰 자동화 솔루션",
      short_name: "플로우머스",
      description:
         "쇼핑몰 상품 등록 자동화, 명품 구매대행 자동화, SEO 상품명 최적화, 재고관리 자동화까지 지원하는 플로우머스.",
      start_url: "/",
      display: "standalone",
      background_color: "#ffffff",
      theme_color: "#10b981",
      icons: [
         {
            src: "/icon.png",
            sizes: "768x768",
            type: "image/png",
         },
         {
            src: "/favicon.ico",
            sizes: "any",
            type: "image/x-icon",
         },
      ],
   };
}
