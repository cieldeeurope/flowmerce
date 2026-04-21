import AuthForm from "@/components/AuthForm";

export const metadata = {
   title: "로그인 - Flowmerce",
   description: "Flowmerce 요청서 작성을 위한 로그인",
};

export default function LoginPage() {
   return <AuthForm mode="login" />;
}
