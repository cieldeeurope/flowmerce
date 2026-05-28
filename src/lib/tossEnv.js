export function getTossClientKey() {
   return (
      process.env.toss_clientKey ||
      process.env.TOSS_CLIENT_KEY ||
      process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY ||
      ""
   ).trim();
}

export function getTossSecretKey() {
   return (
      process.env.toss_secretKey ||
      process.env.TOSS_SECRET_KEY ||
      ""
   ).trim();
}

export function getTossSecurityKey() {
   return (
      process.env.toss_securityKey ||
      process.env.TOSS_SECURITY_KEY ||
      ""
   ).trim();
}

export function getTossApiVersion() {
   return (process.env.TOSS_API_VERSION || "2024-06-01").trim();
}
