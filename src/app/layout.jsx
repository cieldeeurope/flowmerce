import "./globals.css";
import {
   defaultDescription,
   defaultKeywords,
   defaultTitle,
   siteName,
   siteUrl,
} from "@/lib/seo";

const faviconUrl = `${siteUrl}/favicon.ico`;
const appleIconUrl = `${siteUrl}/brand/silver-symbol.png`;

export const metadata = {
   metadataBase: new URL(siteUrl),
   title: defaultTitle,
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
            url: "/icon.png",
            width: 768,
            height: 768,
            alt: `${siteName} 대표 이미지`,
         },
      ],
   },
   twitter: {
      card: "summary_large_image",
      title: defaultTitle,
      description: defaultDescription,
      images: ["/icon.png"],
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
      icon: [{ url: faviconUrl, sizes: "any" }],
      shortcut: [faviconUrl],
      apple: [{ url: appleIconUrl, type: "image/png" }],
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
            <link rel="shortcut icon" href={faviconUrl} />
            <link rel="icon" href={faviconUrl} sizes="any" />
            <link rel="apple-touch-icon" href={appleIconUrl} />
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
