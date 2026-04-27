import AuthForm from "@/components/AuthForm";
import { createNoIndexMetadata } from "@/lib/seo";

export const metadata = createNoIndexMetadata({
   title: "회원가입",
   description: "플로우머스 회원가입 페이지입니다.",
});

export default function SignupPage() {
   return <AuthForm mode="signup" />;
}
