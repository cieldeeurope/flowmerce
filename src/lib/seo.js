export const siteUrl = "https://flowmerce.co.kr";
export const siteName = "\ud50c\ub85c\uc6b0\uba38\uc2a4";
export const defaultTitle =
   "\ud50c\ub85c\uc6b0\uba38\uc2a4 | \uc1fc\ud551\ubab0 \uc790\ub3d9\ud654 \uc194\ub8e8\uc158";
export const defaultDescription =
   "\uc1fc\ud551\ubab0 \uc0c1\ud488 \ub4f1\ub85d \uc790\ub3d9\ud654, \uba85\ud488 \uad6c\ub9e4\ub300\ud589 \uc790\ub3d9\ud654, SEO \uc0c1\ud488\uba85 \ucd5c\uc801\ud654, \uc7ac\uace0\uad00\ub9ac \uc790\ub3d9\ud654\uae4c\uc9c0 \uc9c0\uc6d0\ud558\ub294 \ud50c\ub85c\uc6b0\uba38\uc2a4";
export const defaultOgImage = "/icon.png";

export const defaultKeywords = [
   "\ud50c\ub85c\uc6b0\uba38\uc2a4",
   "\uc1fc\ud551\ubab0 \uc790\ub3d9\ud654",
   "\uad6c\ub9e4\ub300\ud589 \uc790\ub3d9\ud654",
   "\uba85\ud488 \uad6c\ub9e4\ub300\ud589",
   "\uc0c1\ud488 \ub4f1\ub85d \uc790\ub3d9\ud654",
   "\uc7ac\uace0\uad00\ub9ac \uc790\ub3d9\ud654",
   "\uc2a4\ub9c8\ud2b8\uc2a4\ud1a0\uc5b4 \uc790\ub3d9\ud654",
   "\uce74\ud39824 \uc790\ub3d9\ud654",
   "\uace0\ub3c4\ubab0 \uc790\ub3d9\ud654",
   "\uba54\uc774\uc0ac\uc774\ud2b8 \uc790\ub3d9\ud654",
   "SEO \uc0c1\ud488\uba85 \ucd5c\uc801\ud654",
   "\uc1fc\ud551\ubab0 \uc790\ub3d9 \ub4f1\ub85d",
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
               height: 630,
               alt: `${siteName} \ub300\ud45c \uc774\ubbf8\uc9c0`,
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
