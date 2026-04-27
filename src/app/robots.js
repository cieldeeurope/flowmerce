import { siteUrl } from "@/lib/seo";

export default function robots() {
   return {
      rules: [
         {
            userAgent: "*",
            allow: "/",
            disallow: [
               "/admin",
               "/mypage",
               "/login",
               "/signin",
               "/signup",
               "/reset",
               "/request",
               "/api/",
            ],
         },
         {
            userAgent: ["Googlebot", "Googlebot-Image", "Googlebot-News"],
            allow: "/",
            disallow: ["/admin", "/mypage", "/request", "/api/"],
         },
         {
            userAgent: ["Yeti", "NaverBot", "Ads-Naver", "Daumoa"],
            allow: ["/", "/favicon.ico"],
            disallow: ["/admin", "/mypage", "/request", "/api/"],
            crawlDelay: 5,
         },
      ],
      sitemap: `${siteUrl}/sitemap.xml`,
      host: siteUrl,
   };
}
