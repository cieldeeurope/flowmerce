import LegalPageShell, {
   LegalList,
   LegalSection,
} from "@/components/LegalPageShell";
import { createMetadata } from "@/lib/seo";

export const metadata = createMetadata({
   title: "환불 및 해지 정책",
   description:
      "플로우머스의 구독 해지, 세팅 시작 전후 환불 기준, 운영 개시 이후 정산 원칙을 안내합니다.",
   path: "/refund-policy",
});

export default function RefundPolicyPage() {
   return (
      <LegalPageShell
         badge="Refund"
         title="환불 및 해지 정책"
         description="플로우머스는 구독형 서비스와 사전 셋팅이 함께 제공되는 구조이므로, 세팅 진행 여부에 따라 환불 및 해지 기준이 달라집니다."
      >
         <LegalSection title="1. 기본 원칙">
            <LegalList
               items={[
                  "구독 결제 이후에도 사전 셋팅이 시작되기 전까지는 취소 또는 환불을 요청할 수 있습니다.",
                  "사전 셋팅, 계정 연동, 데이터 구조화, 카테고리 매핑 안내, 자동화 설정, 사이트 구성 작업이 시작된 이후에는 이미 제공된 용역 범위에 대해 환불이 제한될 수 있습니다.",
                  "플로우머스는 맞춤형 운영 세팅과 인력 투입이 포함된 서비스이므로, 세팅 개시 이후에는 원칙적으로 전액 환불이 어렵습니다.",
                  "다만 관계 법령상 청약철회 또는 환불이 인정되는 경우에는 관련 법령을 우선 적용합니다.",
               ]}
            />
         </LegalSection>

         <LegalSection title="2. 세팅 시작 전 환불">
            <LegalList
               items={[
                  "결제 완료 후 세팅 시작 전 단계에서 고객이 취소를 요청한 경우, 결제 취소 또는 환불을 검토할 수 있습니다.",
                  "환불이 승인되면 사용된 결제 수단 또는 별도 협의된 방식으로 처리됩니다.",
               ]}
            />
         </LegalSection>

         <LegalSection title="3. 세팅 시작 후 환불">
            <LegalList
               items={[
                  "세팅 시작 이후에는 진행된 작업 범위, 인력 투입 여부, 계정 연동 여부, 데이터 처리 범위를 기준으로 환불 가능 여부를 판단합니다.",
                  "특히 쇼핑몰 계정 연동, 사이트 선택 확정, 카테고리 구조 작업, 자동화 설정이 진행된 경우에는 환불이 제한되거나 제공된 범위만큼 공제 후 처리될 수 있습니다.",
                  "고객의 단순 변심, 운영 전략 변경, 판매 지연, 예상 성과와의 차이만으로는 세팅 완료분의 환불 사유가 되지 않을 수 있습니다.",
               ]}
            />
         </LegalSection>

         <LegalSection title="4. 구독 해지 및 만료">
            <LegalList
               items={[
                  "회원은 만료 전 문의를 통해 연장 여부, 업그레이드 여부, 해지 의사를 전달할 수 있습니다.",
                  "구독이 종료되면 플로우머스가 관리하던 자동화 운영 범위도 종료됩니다.",
                  "구독 종료 후 데이터 및 상품 처리 기준은 계정정보/데이터 삭제 기준 정책에 따릅니다.",
               ]}
            />
         </LegalSection>

         <LegalSection title="5. 주의사항">
            <LegalList
               items={[
                  "고객이 쇼핑몰 계정, 운영 정보 또는 사이트 정보를 허위로 제공해 발생한 문제는 환불 사유가 되지 않을 수 있습니다.",
                  "외부 플랫폼 정책 변경, 공급가 변동, 재고 변동, 환율 변동 등 통제 불가능한 외부 요인은 환불 사유로 인정되지 않을 수 있습니다.",
                  "환불 또는 해지 요청 시 본인 확인과 결제 내역 확인이 필요할 수 있습니다.",
               ]}
            />
         </LegalSection>
      </LegalPageShell>
   );
}
