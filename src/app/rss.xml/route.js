import { siteName, siteUrl } from "@/lib/seo";

const feedItems = [
   {
      title: "플로우머스 메인",
      description:
         "쇼핑몰 상품 등록 자동화, 명품 구매대행 자동화, SEO 상품명 최적화, 재고관리 자동화 정보를 소개합니다.",
      path: "/",
   },
   {
      title: "플랜별 가격 안내",
      description:
         "플로우머스 요금제, 월 요청 처리량, 지원 사이트, 하이엔드 사이트 기준을 안내합니다.",
      path: "/pricing",
   },
   {
      title: "핵심 가이드",
      description:
         "실제 운영 성과와 정산 사례를 통해 명품 구매대행 자동화의 수익 구조를 설명합니다.",
      path: "/guide",
   },
   {
      title: "프로그램 소개",
      description:
         "상품등록 및 재고관리 프로그램, 실시간 방문자 재고 업데이트, 마진 설정, 단어 치환 기능을 안내합니다.",
      path: "/program",
   },
   {
      title: "컨설팅",
      description:
         "명품 구매대행 구조, 현지 거래처 연결, 병행수입 대비 운영 전략을 일대일로 안내합니다.",
      path: "/consulting",
   },
];

export async function GET() {
   const buildDate = new Date().toUTCString();

   const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${siteName}</title>
    <link>${siteUrl}</link>
    <description>쇼핑몰 자동화와 명품 구매대행 자동화 정보를 제공하는 ${siteName} RSS 피드입니다.</description>
    <language>ko-kr</language>
    <lastBuildDate>${buildDate}</lastBuildDate>
    ${feedItems
       .map(
          (item) => `
    <item>
      <title><![CDATA[${item.title}]]></title>
      <link>${siteUrl}${item.path}</link>
      <guid>${siteUrl}${item.path}</guid>
      <description><![CDATA[${item.description}]]></description>
      <pubDate>${buildDate}</pubDate>
    </item>`,
       )
       .join("")}
  </channel>
</rss>`;

   return new Response(xml, {
      headers: {
         "Content-Type": "application/rss+xml; charset=UTF-8",
      },
   });
}
