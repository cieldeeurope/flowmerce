import AuthForm from "@/components/AuthForm";

export const metadata = {
   title: "회원가입 - Flowmerce",
   description: "Flowmerce 요청서 작성을 위한 회원가입",
};

export default function SignupPage() {
   return <AuthForm mode="signup" />;
}
