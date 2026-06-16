/* eslint-disable @next/next/next-script-for-ga */
import "./globals.css";
import UserSessionManager from "@/components/UserSessionManager";
import {
   defaultDescription,
   defaultKeywords,
   defaultTitle,
   siteName,
   siteUrl,
} from "@/lib/seo";

const primaryIconUrl = `${siteUrl}/favicon.png`;
const gtmId = "GTM-N5K69TV3";
const googleAnalyticsId = "G-SW7209YYLB";
const naverAnalyticsId = "c937c450f32000";

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
            url: "/favicon.png",
            width: 1200,
            height: 1200,
            alt: `${siteName} 대표 아이콘`,
         },
      ],
   },
   twitter: {
      card: "summary_large_image",
      title: defaultTitle,
      description: defaultDescription,
      images: ["/favicon.png"],
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
   themeColor: "#1e3aff",
   manifest: "/manifest.webmanifest",
   icons: {
      icon: [{ url: primaryIconUrl, sizes: "768x768", type: "image/png" }],
      shortcut: [{ url: primaryIconUrl, sizes: "768x768", type: "image/png" }],
      apple: [{ url: primaryIconUrl, sizes: "768x768", type: "image/png" }],
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
            <link rel="icon" href={primaryIconUrl} sizes="768x768" type="image/png" />
            <link rel="apple-touch-icon" href={primaryIconUrl} sizes="768x768" />
            <link
               rel="preconnect"
               href="https://cdn.jsdelivr.net"
               crossOrigin="anonymous"
            />
            <link
               rel="stylesheet"
               href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css"
            />

            <script
               dangerouslySetInnerHTML={{
                  __html: `
                     (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
                     new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
                     j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
                     'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
                     })(window,document,'script','dataLayer','${gtmId}');
                  `,
               }}
            />
            <script
               async
               src={`https://www.googletagmanager.com/gtag/js?id=${googleAnalyticsId}`}
            />
            <script
               dangerouslySetInnerHTML={{
                  __html: `
                     window.dataLayer = window.dataLayer || [];
                     function gtag(){dataLayer.push(arguments);}
                     gtag('js', new Date());
                     gtag('config', '${googleAnalyticsId}');
                  `,
               }}
            />
            <script async src="https://wcs.pstatic.net/wcslog.js" />
            <script
               dangerouslySetInnerHTML={{
                  __html: `
                     if(!window.wcs_add) window.wcs_add = {};
                     window.wcs_add["wa"] = "${naverAnalyticsId}";
                     if(window.wcs) {
                       wcs_do();
                     }
                  `,
               }}
            />
         </head>
         <body className="flex h-full flex-col">
            <UserSessionManager />
            {children}
         </body>
      </html>
   );
}
