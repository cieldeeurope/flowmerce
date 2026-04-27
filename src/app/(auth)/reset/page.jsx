import { createNoIndexMetadata } from "@/lib/seo";

export const metadata = createNoIndexMetadata({
   title: "비밀번호 재설정",
   description: "플로우머스 비밀번호 재설정 안내 페이지입니다.",
});

export default function ResetPage() {
   return (
      <div className="mt-7 flex w-full max-w-sm flex-col">
         <h1 className="text-2xl font-medium">비밀번호 재설정</h1>
         <p className="mt-2 leading-7 text-zinc-600">
            현재는 자동 비밀번호 찾기 기능을 운영하지 않습니다.
            <br />
            비밀번호가 기억나지 않으면 관리자 문의를 통해 임시 비밀번호
            재설정을 안내받아주세요.
         </p>
      </div>
   );
}
