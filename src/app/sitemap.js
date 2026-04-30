import { siteUrl } from "@/lib/seo";

export default function sitemap() {
   const lastModified = new Date();

   return [
      {
         url: siteUrl,
         lastModified,
         changeFrequency: "weekly",
         priority: 1,
      },
      {
         url: `${siteUrl}/pricing`,
         lastModified,
         changeFrequency: "weekly",
         priority: 0.9,
      },
      {
         url: `${siteUrl}/guide`,
         lastModified,
         changeFrequency: "weekly",
         priority: 0.85,
      },
      {
         url: `${siteUrl}/program`,
         lastModified,
         changeFrequency: "monthly",
         priority: 0.8,
      },
      {
         url: `${siteUrl}/consulting`,
         lastModified,
         changeFrequency: "monthly",
         priority: 0.8,
      },
      {
         url: `${siteUrl}/inquiry`,
         lastModified,
         changeFrequency: "weekly",
         priority: 0.75,
      },
      {
         url: `${siteUrl}/terms`,
         lastModified,
         changeFrequency: "yearly",
         priority: 0.4,
      },
      {
         url: `${siteUrl}/privacy`,
         lastModified,
         changeFrequency: "yearly",
         priority: 0.4,
      },
      {
         url: `${siteUrl}/refund-policy`,
         lastModified,
         changeFrequency: "yearly",
         priority: 0.35,
      },
      {
         url: `${siteUrl}/data-policy`,
         lastModified,
         changeFrequency: "yearly",
         priority: 0.35,
      },
   ];
}
