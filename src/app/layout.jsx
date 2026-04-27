import "./globals.css";
import {
   defaultDescription,
   defaultKeywords,
   defaultTitle,
   siteName,
   siteUrl,
} from "@/lib/seo";

export const metadata = {
   metadataBase: new URL(siteUrl),
   title: {
      default: defaultTitle,
      template: `%s | ${siteName}`,
   },
   description: defaultDescription,
   applicationName: siteName,
   authors: [{ name: siteName }],
   creator: siteName,
   publisher: siteName,
   keywords: defaultKeywords,
   category: "shopping",
   alternates: {
      canonical: "/",
      types: {
         "application/rss+xml": `${siteUrl}/rss.xml`,
      },
   },
   openGraph: {
      type: "website",
      locale: "ko_KR",
      url: "/",
      siteName,
      title: defaultTitle,
      description: defaultDescription,
      images: [
         {
            url: "/opengraph-image",
            width: 1200,
            height: 630,
            alt: `${siteName} 대표 이미지`,
         },
      ],
   },
   twitter: {
      card: "summary_large_image",
      title: defaultTitle,
      description: defaultDescription,
      images: ["/twitter-image"],
   },
   robots: {
      index: true,
      follow: true,
      googleBot: {
         index: true,
         follow: true,
         "max-image-preview": "large",
         "max-snippet": -1,
         "max-video-preview": -1,
      },
   },
   themeColor: "#10b981",
   manifest: "/manifest.webmanifest",
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
            <meta
               name="google-site-verification"
               content="w1ANMw07UIgoi8RnD092IT70psKloxmNMSpJQEFsH8Y"
            />
            <meta
               name="naver-site-verification"
               content="aff30bb4569645b6f75ec1c2922ebe54a12b8a94"
            />
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
