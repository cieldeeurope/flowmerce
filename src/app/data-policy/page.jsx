import LegalPageShell, {
   LegalList,
   LegalSection,
   LegalTable,
} from "@/components/LegalPageShell";
import { createMetadata } from "@/lib/seo";

export const metadata = createMetadata({
   title: "계정정보 및 데이터 삭제 기준",
   description:
      "플로우머스의 계정정보, 사이트 연동 정보, 쇼핑몰 등록 상품, 운영 데이터의 보관 및 삭제 기준을 안내합니다.",
   path: "/data-policy",
});

export default function DataPolicyPage() {
   return (
      <LegalPageShell
         badge="Data Policy"
         title="계정정보 및 데이터 삭제 기준"
         description="플로우머스는 구독형 자동화 서비스 특성상 계정정보와 운영 데이터를 일정 기준에 따라 보관 또는 삭제합니다. 본 정책은 서비스 종료, 미연장, 해지 이후의 처리 원칙을 설명합니다."
      >
         <LegalSection title="1. 기본 원칙">
            <LegalList
               items={[
                  "서비스 운영에 불필요해진 개인정보와 운영 데이터는 지체 없이 정리하는 것을 원칙으로 합니다.",
                  "다만 관계 법령상 보존 의무가 있는 정보는 별도로 분리하여 보관합니다.",
                  "플로우머스가 관리하던 쇼핑몰 상품 데이터와 회원 계정정보는 서로 다른 기준으로 관리될 수 있습니다.",
               ]}
            />
         </LegalSection>

         <LegalSection title="2. 쇼핑몰 등록 상품 및 운영 데이터 삭제">
            <LegalList
               items={[
                  "1개월 구독 고객이 연장 의사가 없음을 확인했거나, 만료 이후 연장 없이 종료되는 경우, 플로우머스가 관리하던 쇼핑몰 등록 상품 및 운영 데이터는 종료일로부터 3일 이내 삭제를 원칙으로 합니다.",
                  "이 기준은 구독 종료 후에도 자동화 결과물을 무단으로 유지·사용하는 상황을 방지하기 위한 운영 원칙입니다.",
                  "상품 삭제 범위에는 플로우머스가 관리 대상으로 보던 자동 등록 상품, 재고관리 대상 상품, 관련 운영 데이터가 포함될 수 있습니다.",
               ]}
            />
         </LegalSection>

         <LegalSection title="3. 계정정보 및 운영 이력 보관">
            <LegalTable
               headers={["구분", "보관 기간", "설명"]}
               rows={[
                  ["회원 계정 기본 정보", "서비스 종료 후 최대 2년", "재가입 확인, 분쟁 대응, 운영 이력 확인 목적"],
                  ["상담 및 지원 이력", "최대 2년", "문의 대응, 운영 이력 관리 목적"],
                  ["사이트 선택 및 플랜 운영 이력", "최대 2년", "서비스 제공 내역 확인 목적"],
                  ["법령상 보존 기록", "법령이 정한 기간", "별도 분리 보관"],
               ]}
            />
         </LegalSection>

         <LegalSection title="4. 계정 연동 정보 처리">
            <LegalList
               items={[
                  "쇼핑몰 로그인 정보, 사이트 연동 정보, 자동화 세팅 정보는 서비스 운영 목적 범위에서만 사용합니다.",
                  "운영 종료 또는 목적 달성 후에는 내부 기준과 보안 절차에 따라 삭제 또는 분리 보관합니다.",
                  "비밀번호는 원문을 보관하지 않으며, 서비스 계정 비밀번호는 암호화 저장 또는 별도 보안 절차를 적용합니다.",
               ]}
            />
         </LegalSection>

         <LegalSection title="5. 예외 및 주의사항">
            <LegalList
               items={[
                  "법적 분쟁, 환불 심사, 부정 사용 조사, 관계 법령상 의무가 있는 경우 일부 정보는 삭제가 지연될 수 있습니다.",
                  "고객이 종료 직전 상품 이전, 데이터 백업, 자체 운영 전환 등을 원할 경우 사전에 별도 협의가 필요할 수 있습니다.",
                  "계정 변경, 연락 두절, 운영 회피 방식으로 상품 삭제를 피하려는 시도는 서비스 이용 제한 또는 법적 조치 검토 대상이 될 수 있습니다.",
               ]}
            />
         </LegalSection>
      </LegalPageShell>
   );
}
