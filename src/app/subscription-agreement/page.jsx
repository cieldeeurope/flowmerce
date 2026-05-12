import LegalPageShell, {
   LegalList,
   LegalSection,
} from "@/components/LegalPageShell";
import { createMetadata } from "@/lib/seo";

export const metadata = createMetadata({
   title: "구독 및 운영 동의서",
   description:
      "플로우머스 구독 전 확인해야 하는 운영 기준, 온보딩 안내, 구독 종료 후 상품 및 데이터 처리 원칙을 안내합니다.",
   path: "/subscription-agreement",
});

export default function SubscriptionAgreementPage() {
   return (
      <LegalPageShell
         badge="Subscription Agreement"
         title="구독 및 운영 동의서"
         description="본 문서는 플로우머스 구독 전 확인해야 하는 운영 기준을 정리한 안내 문서입니다. 결제, 계정 승인, 사이트 확정, 세팅 진행, 구독 종료 후 상품 및 데이터 처리 원칙을 함께 설명합니다."
         updatedAt="2026-05-12"
      >
         <LegalSection title="1. 적용 범위">
            <LegalList
               items={[
                  "본 동의서는 플로우머스 구독 신청, 운영 세팅, 쇼핑몰 연동, 구독 유지 및 종료 과정에 함께 적용됩니다.",
                  "실제 결제 여부와 별개로 회원가입 후 서비스 안내를 받는 단계에서도 본 기준을 미리 확인하는 것을 원칙으로 합니다.",
                  "세부 환불 기준과 개인정보 처리 기준은 별도 정책 문서와 함께 해석합니다.",
               ]}
            />
         </LegalSection>

         <LegalSection title="2. 온보딩 및 세팅 진행">
            <LegalList
               items={[
                  "플랜 결제와 사이트 확정 이후에는 연동할 쇼핑몰 관리자 정보 확인이 필요할 수 있습니다.",
                  "호스팅사별로 확인해야 하는 값이 달라, 세팅 온보딩은 카카오톡 채널 또는 별도로 안내된 전달 방식으로 순차 진행될 수 있습니다.",
                  "partnerKey, apiKey, 관리자 URL, 계정 정보 확인이 필요한 경우 플로우머스가 확인 순서와 범위를 안내합니다.",
               ]}
            />
         </LegalSection>

         <LegalSection title="3. 구독 시작, 승인, 사이트 확정">
            <LegalList
               items={[
                  "구독 시작일과 운영 시작일은 결제 완료 시점, 관리자 승인 시점, 실제 세팅 개시 시점에 따라 조정될 수 있습니다.",
                  "회원가입만으로 즉시 모든 기능이 열리는 구조가 아니며, 계정 승인과 세팅 준비가 완료되어야 실제 운영이 시작됩니다.",
                  "플랜별 사이트 선택은 확정 이후 관리자 확인 범위에서만 변경될 수 있습니다.",
               ]}
            />
         </LegalSection>

         <LegalSection title="4. 구독 종료 후 상품 및 데이터 처리">
            <LegalList
               items={[
                  "구독이 종료되면 플로우머스가 관리하던 상품, 운영 데이터, 자동화 관리 범위도 함께 종료됩니다.",
                  "1개월 구독 고객이 연장 없이 종료되거나 연장 의사가 없음을 확인한 경우, 플로우머스가 관리하던 등록 상품 및 운영 데이터는 종료일로부터 3일 이내 삭제를 원칙으로 합니다.",
                  "종료 전에는 반드시 상품 이관, 정리 일정, 운영 종료 방식을 먼저 상담해주셔야 합니다.",
               ]}
            />
         </LegalSection>

         <LegalSection title="5. 환불, 해지, 추가 확인">
            <LegalList
               items={[
                  "환불 및 해지 기준은 환불 및 해지정책 문서와 함께 적용됩니다.",
                  "개인정보, 계정정보, 운영 데이터 보관 및 삭제 기준은 개인정보처리방침과 계정정보 및 데이터 기준 정책을 함께 확인해주셔야 합니다.",
                  "법적 효력이나 개별 계약 문구 검토가 필요한 경우에는 실제 결제 단계의 계약 문안과 함께 별도 확인을 권장합니다.",
               ]}
            />
         </LegalSection>
      </LegalPageShell>
   );
}
