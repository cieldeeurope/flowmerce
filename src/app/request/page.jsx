import { redirect } from "next/navigation";
import { createNoIndexMetadata } from "@/lib/seo";

export const metadata = createNoIndexMetadata({
   title: "플랜 안내",
   description: "현재 요청서 기능은 비활성화되어 가격 페이지로 이동합니다.",
});

export default function RequestPage() {
   redirect("/pricing");
}
