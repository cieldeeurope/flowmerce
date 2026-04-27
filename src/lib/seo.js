export const siteUrl = "https://flowmerce.co.kr";
export const siteName = "플로우머스";
export const defaultTitle = "플로우머스 | 쇼핑몰 자동화 솔루션";
export const defaultDescription =
   "쇼핑몰 상품 등록 자동화, 명품 구매대행 자동화, SEO 상품명 최적화, 재고관리 자동화까지 지원하는 플로우머스.";
export const defaultOgImage = "/icon.png";

export const defaultKeywords = [
   "플로우머스",
   "쇼핑몰 자동화",
   "구매대행 자동화",
   "명품 구매대행",
   "상품 등록 자동화",
   "재고관리 자동화",
   "스마트스토어 자동화",
   "카페24 자동화",
   "고도몰 자동화",
   "메이크샵 자동화",
   "SEO 상품명 최적화",
   "쇼핑몰 자동 등록",
];

export function createMetadata({
   title,
   description = defaultDescription,
   path = "/",
   image = defaultOgImage,
}) {
   return {
      title,
      description,
      keywords: defaultKeywords,
      alternates: {
         canonical: path,
      },
      openGraph: {
         type: "website",
         locale: "ko_KR",
         url: path,
         title,
         description,
         siteName,
         images: [
            {
               url: image,
               width: 1200,
               height: 630,
               alt: `${siteName} 대표 이미지`,
            },
         ],
      },
      twitter: {
         card: "summary_large_image",
         title,
         description,
         images: [image],
      },
   };
}

export function createNoIndexMetadata({
   title,
   description = defaultDescription,
}) {
   return {
      title,
      description,
      robots: {
         index: false,
         follow: false,
         nocache: true,
         googleBot: {
            index: false,
            follow: false,
            noimageindex: true,
         },
      },
   };
}
