import FlowmerceStudioPanel from "@/components/FlowmerceStudioPanel";
import { createNoIndexMetadata } from "@/lib/seo";

export const metadata = createNoIndexMetadata({
   title: "Flowmerce Studio",
   description:
      "호스팅 계정, 카테고리 매핑, 마진, 치환, 수집예약까지 한 화면에서 이어가는 고객용 작업 공간입니다.",
});

export default function FlowmerceStudioPage() {
   return (
      <main className="mx-auto w-full max-w-[1680px] px-4 py-8 sm:px-6 lg:px-8">
         <FlowmerceStudioPanel />
      </main>
   );
}
