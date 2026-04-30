import AdminAccessPanel from "@/components/AdminAccessPanel";
import { createNoIndexMetadata } from "@/lib/seo";

export const metadata = createNoIndexMetadata({
   title: "관리자",
   description: "플로우머스 관리자 전용 페이지입니다.",
});

export default function AdminFlowmercePage() {
   return <AdminAccessPanel />;
}
