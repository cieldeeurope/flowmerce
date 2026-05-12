import { defaultDescription, siteNameFull } from "@/lib/seo";

export default function manifest() {
   return {
      name: siteNameFull,
      short_name: "플로우머스",
      description: defaultDescription,
      start_url: "/",
      display: "standalone",
      background_color: "#ffffff",
      theme_color: "#1e3aff",
      icons: [
         {
            src: "/favicon.png",
            sizes: "768x768",
            type: "image/png",
         },
      ],
   };
}
