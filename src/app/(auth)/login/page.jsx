import AuthForm from "@/components/AuthForm";
import { createNoIndexMetadata } from "@/lib/seo";

export const metadata = createNoIndexMetadata({
   title: "로그인",
   description: "플로우머스 로그인 페이지입니다.",
});

export default function LoginPage() {
   return <AuthForm mode="login" />;
}
