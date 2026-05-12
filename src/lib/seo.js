export const siteUrl = "https://flowmerce.co.kr";
export const siteName = "플로우머스";
export const siteNameFull = "플로우머스 | 쇼핑몰 자동화 솔루션";
export const defaultTitle = siteNameFull;
export const defaultDescription =
   "플로우머스는 카페24, 고도몰, 스마트스토어, 메이크샵 운영에 필요한 상품 등록 자동화, 재고관리 자동화, SEO 상품명 최적화, 카테고리 매핑, 마진 설정, 단어 치환, 수집 예약을 한 번에 관리하는 쇼핑몰 자동화 솔루션입니다.";
export const defaultOgImage = "/favicon.png";

export const defaultKeywords = [
   "플로우머스",
   "쇼핑몰 자동화 솔루션",
   "쇼핑몰 자동화",
   "상품 등록 자동화",
   "재고관리 자동화",
   "구매대행 자동화",
   "명품 구매대행",
   "명품 쇼핑몰 자동화",
   "카페24 자동화",
   "고도몰 자동화",
   "스마트스토어 자동화",
   "메이크샵 자동화",
   "카테고리 매핑",
   "마진 설정",
   "SEO 상품명 최적화",
];

function buildDocumentTitle(title) {
   if (!title) {
      return defaultTitle;
   }

   if (title.includes(siteName)) {
      return title;
   }

   return `${siteName} | ${title}`;
}

export function createMetadata({
   title,
   description = defaultDescription,
   path = "/",
   image = defaultOgImage,
}) {
   const documentTitle = buildDocumentTitle(title);

   return {
      title: documentTitle,
      description,
      keywords: defaultKeywords,
      alternates: {
         canonical: path,
      },
      openGraph: {
         type: "website",
         locale: "ko_KR",
         url: path,
         title: documentTitle,
         description,
         siteName,
         images: [
            {
               url: image,
               width: 1200,
               height: 1200,
               alt: `${siteName} 대표 아이콘`,
            },
         ],
      },
      twitter: {
         card: "summary_large_image",
         title: documentTitle,
         description,
         images: [image],
      },
   };
}

export function createNoIndexMetadata({
   title,
   description = defaultDescription,
}) {
   const documentTitle = buildDocumentTitle(title);

   return {
      title: documentTitle,
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
