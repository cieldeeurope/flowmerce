import Container from "./Container";
import Accordion from "./Accordion";

export default function Faqs() {
   const faqs = [
      {
         id: "01",
         question: "공식홈페이지 외 종합플랫폼은 안되나요?",
         answer:
            "명품 공식홈페이지 외에 대형 부티끄 홈페이지도 이용할 수 있습니다. 리스트에 없는 사이트는 추가 요청 개발이 가능합니다.",
      },
      {
         id: "02",
         question: "무료 체험판이 있나요?",
         answer:
            "무료 체험판은 제공하지 않습니다. 플로우머스는 상품 데이터, 수집 설정, 계정 정보, 재고 흐름 등 운영에 필요한 데이터를 저장하고 보관해야 하기 때문에 체험판 형태로 운영하기 어렵습니다. 처음 이용하신다면 베이직 플랜으로 시작해 실제 흐름을 확인해보시는 것을 권장드립니다.",
      },
      {
         id: "03",
         question: "한 달만 구독해서 상품등록만 할 수 있나요?",
         answer:
            "구독은 최소 한 달부터 가능합니다. 다만 구독이 종료되면 플로우머스가 관리하던 상품은 쇼핑몰과 데이터 저장소에서 삭제될 수 있습니다. 상품 삭제를 피하기 위해 계정을 변경하거나 연락이 어려운 상태로 운영을 회피하는 경우에는 서비스 이용 약관과 데이터 관리 기준에 따라 책임이 발생할 수 있으니, 종료 전 반드시 상담을 통해 정리해 주세요.",
      },
      {
         id: "04",
         question: "연간 구독권이나 장기 할인도 있나요?",
         answer:
            "6개월 구독 시 5% 할인, 연간 구독 시 10% 할인이 적용됩니다. 장기 운영을 전제로 상품 수집, 재고관리, SEO 등록 흐름을 안정적으로 가져가실 분들에게 권장드립니다.",
      },
      {
         id: "05",
         question: "도중에 플랜 변경이 가능한가요?",
         answer:
            "가능합니다. 기본적으로 현재 월 플랜은 유지되고 다음 달부터 변경된 플랜이 적용됩니다. 단, 플랜 업그레이드는 중간에도 가능하며 이용 날짜에 따른 차액 결제는 별도 문의로 안내드립니다.",
      },
      {
         id: "06",
         question: "제가 직접 해야 하는 작업은 무엇인가요?",
         answer:
            "카테고리 매핑을 제외한 사전 셋팅은 플로우머스가 진행합니다. 고객님은 쇼핑몰 카테고리를 클릭으로 매핑해주시면 되고, 이후 원하는 시기에 수집 요청과 재고관리 요청을 진행할 수 있습니다.",
      },
      {
         id: "07",
         question: "상품명과 상세페이지도 똑같이 올라가나요?",
         answer:
            "아니요. 플로우머스는 SEO를 고려해 상품명과 상품 내용을 최적화해 등록합니다. 같은 상품을 그대로 복사해 올리는 방식보다 검색 노출과 판매 전환에 더 유리한 흐름을 목표로 합니다.",
      },
      {
         id: "08",
         question: "카페24, 고도몰, 스마트스토어, 메이크샵 외 플랫폼도 가능한가요?",
         answer:
            "기본 지원 플랫폼 외에도 사이트 요청과 플랫폼 구축 요청이 가능합니다. 사용 중인 쇼핑몰 구조와 필요한 자동화 범위를 문의해주시면 검토 후 안내드립니다.",
      },
      {
         id: "09",
         question: "재고관리는 어떻게 요청하나요?",
         answer:
            "카테고리 매핑과 기본 셋팅이 끝난 뒤 원하는 시점에 재고관리 요청을 할 수 있습니다. 재고관리 과정에서는 기존 상품 업데이트와 새 상품 등록이 함께 발생할 수 있어 플랜별 요청 처리량 기준으로 관리됩니다.",
      },
   ];

   return (
      <section className="pt-16 md:pt-28" id="faq">
         <Container>
            <div className="space-y-4 sm:text-center">
               <span className="inline-flex rounded-md border border-emerald-300 bg-emerald-100 px-2.5 py-1.5 text-xs font-semibold text-emerald-600 shadow-sm">
                  FAQ
               </span>
               <h2 className="mx-auto max-w-2xl text-2xl font-semibold leading-tight sm:text-3xl md:text-4xl">
                  자주 묻는 질문과 답변
               </h2>
            </div>

            <div className="mt-10 space-y-3.5 md:mt-14">
               {faqs.map(({ id, question, answer }) => (
                  <Accordion key={id} title={question}>
                     <p className="max-w-3xl leading-7 text-zinc-600">{answer}</p>
                  </Accordion>
               ))}
            </div>
         </Container>
      </section>
   );
}
