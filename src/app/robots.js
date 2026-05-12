import { siteUrl } from "@/lib/seo";

export default function robots() {
   return {
      rules: [
         {
            userAgent: "*",
            allow: "/",
            disallow: [
               "/admin",
               "/admin-flowmerce",
               "/flowmerce-studio",
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
            disallow: ["/admin", "/admin-flowmerce", "/flowmerce-studio", "/mypage", "/request", "/api/"],
         },
         {
            userAgent: ["Yeti", "NaverBot", "Ads-Naver", "Daumoa"],
            allow: "/",
            disallow: ["/admin", "/admin-flowmerce", "/flowmerce-studio", "/mypage", "/request", "/api/"],
            crawlDelay: 5,
         },
      ],
      sitemap: `${siteUrl}/sitemap.xml`,
      host: siteUrl,
   };
}
