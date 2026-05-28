export const tossBillingLabels = {
   monthly: "월 구독",
   sixMonth: "6개월 구독",
   annual: "12개월 구독",
};

export const tossPlanPayments = {
   Basic: {
      monthly: {
         amount: 190000,
         orderName: "플로우머스 Basic 월 구독권",
      },
      sixMonth: {
         amount: 1080000,
         orderName: "플로우머스 Basic 6개월 구독권",
      },
      annual: {
         amount: 2050000,
         orderName: "플로우머스 Basic 12개월 구독권",
      },
   },
};

export function getTossPlanPayment(planName, billing) {
   return tossPlanPayments?.[planName]?.[billing] || null;
}
