/** @type {import('next').NextConfig} */
const securityHeaders = [
   {
      key: "X-Frame-Options",
      value: "SAMEORIGIN",
   },
   {
      key: "X-Content-Type-Options",
      value: "nosniff",
   },
   {
      key: "Referrer-Policy",
      value: "strict-origin-when-cross-origin",
   },
   {
      key: "Strict-Transport-Security",
      value: "max-age=31536000; includeSubDomains; preload",
   },
   {
      key: "Permissions-Policy",
      value: "camera=(), microphone=(), geolocation=()",
   },
];

const apiBaseUrl = (
   process.env.NEXT_PUBLIC_API_BASE_URL ||
   process.env.API_BASE_URL ||
   "https://api.flowmerce.co.kr"
).replace(/\/$/, "");

const nextConfig = {
   async headers() {
      return [
         {
            source: "/:path*",
            headers: securityHeaders,
         },
      ];
   },
   async rewrites() {
      return [
         {
            source: "/categories/:path*",
            destination: `${apiBaseUrl}/categories/:path*`,
         },
      ];
   },
};

module.exports = nextConfig;
