import { redirect } from "next/navigation";
import { createNoIndexMetadata } from "@/lib/seo";

export const metadata = createNoIndexMetadata({
   title: "문의 이동",
   description: "기존 요청서 페이지는 문의 페이지로 통합되었습니다.",
});

export default function RequestPage() {
   redirect("/inquiry");
}
