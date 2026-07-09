export const tossBillingLabels = {
   monthly: "1개월",
   sixMonth: "6개월",
   annual: "12개월",
};

export const tossBillingPaymentLabels = {
   monthly: "1개월 이용권",
   sixMonth: "6개월 이용권",
   annual: "12개월 이용권",
};

export const tossBillingMonths = {
   monthly: 1,
   sixMonth: 6,
   annual: 12,
};

export const HOSTING_SETUP_FEE = 110000;

export const CONSULTING_PAYMENT = {
   amount: 1540000,
   orderName: "플로우머스 1:1 컨설팅",
};

export const tossPlanBasePayments = {
   Boutique: {
      monthly: {
         amount: 550000,
         orderName: "플로우머스 Boutique 1개월 이용권",
      },
      sixMonth: {
         amount: 3130000,
         orderName: "플로우머스 Boutique 6개월 이용권",
      },
      annual: {
         amount: 5940000,
         orderName: "플로우머스 Boutique 12개월 이용권",
      },
   },
   Basic: {
      monthly: {
         amount: 190000,
         orderName: "플로우머스 Basic 1개월 이용권",
      },
      sixMonth: {
         amount: 1080000,
         orderName: "플로우머스 Basic 6개월 이용권",
      },
      annual: {
         amount: 2050000,
         orderName: "플로우머스 Basic 12개월 이용권",
      },
   },
   Pro: {
      monthly: {
         amount: 490000,
         orderName: "플로우머스 Pro 1개월 이용권",
      },
      sixMonth: {
         amount: 2790000,
         orderName: "플로우머스 Pro 6개월 이용권",
      },
      annual: {
         amount: 5290000,
         orderName: "플로우머스 Pro 12개월 이용권",
      },
   },
   Enterprise: {
      monthly: {
         amount: 990000,
         orderName: "플로우머스 Enterprise 1개월 이용권",
      },
      sixMonth: {
         amount: 5643000,
         orderName: "플로우머스 Enterprise 6개월 이용권",
      },
      annual: {
         amount: 9900000,
         orderName: "플로우머스 Enterprise 12개월 이용권",
      },
   },
};

const planNameMap = {
   boutique: "Boutique",
   basic: "Basic",
   pro: "Pro",
   enterprise: "Enterprise",
};

export const tossBillingOptions = Object.entries(tossBillingLabels).map(
   ([id, label]) => ({ id, label }),
);

export function normalizePlanName(planName) {
   if (!planName) {
      return "";
   }

   const trimmedPlanName = String(planName).trim();
   return planNameMap[trimmedPlanName.toLowerCase()] || trimmedPlanName;
}

export function planRequiresHostingFee(planName) {
   return ["Boutique", "Basic"].includes(normalizePlanName(planName));
}

export function formatKrw(amount) {
   const roundedAmount = Math.round(Number(amount) || 0);
   return `${new Intl.NumberFormat("ko-KR").format(roundedAmount)}원`;
}

export function getPlanBaseAmount(planName, billing) {
   const normalizedPlanName = normalizePlanName(planName);
   return tossPlanBasePayments?.[normalizedPlanName]?.[billing]?.amount ?? null;
}

export function getPlanDisplayPrice(planName, billing) {
   const normalizedPlanName = normalizePlanName(planName);
   const amount = getPlanBaseAmount(normalizedPlanName, billing);

   if (amount === null) {
      return "상담";
   }

   const prefix = tossBillingLabels[billing];
   const suffix = normalizedPlanName === "Enterprise" ? " ~" : "";
   return `${prefix} ${formatKrw(amount)}${suffix}`;
}

export function getTossPlanPayment(
   planName,
   billing,
   {
      includeHostingFee = false,
      extraAmount = 0,
      orderName,
      orderNameSuffix = "",
   } = {},
) {
   const normalizedPlanName = normalizePlanName(planName);
   const basePayment = tossPlanBasePayments?.[normalizedPlanName]?.[billing];

   if (!basePayment) {
      return null;
   }

   const hostingAmount =
      includeHostingFee && planRequiresHostingFee(normalizedPlanName)
         ? HOSTING_SETUP_FEE
         : 0;
   const normalizedExtraAmount = Math.max(0, Math.round(Number(extraAmount) || 0));
   const orderNameParts = [];

   if (hostingAmount > 0) {
      orderNameParts.push("호스팅 연동");
   }

   if (orderNameSuffix) {
      orderNameParts.push(orderNameSuffix);
   }

   return {
      ...basePayment,
      amount: basePayment.amount + hostingAmount + normalizedExtraAmount,
      baseAmount: basePayment.amount,
      extraAmount: normalizedExtraAmount,
      hostingAmount,
      orderName:
         orderName ||
         `${basePayment.orderName}${
            orderNameParts.length > 0 ? ` + ${orderNameParts.join(" + ")}` : ""
         }`,
      planName: normalizedPlanName,
      billing,
   };
}

export function getConsultingPayment() {
   return CONSULTING_PAYMENT;
}

export function calculateRemainingDays(endAt, now = new Date()) {
   if (!endAt) {
      return 0;
   }

   const endDate = new Date(endAt);
   const baseDate = new Date(now);

   if (Number.isNaN(endDate.getTime()) || Number.isNaN(baseDate.getTime())) {
      return 0;
   }

   const dayMs = 24 * 60 * 60 * 1000;
   return Math.max(0, Math.ceil((endDate.getTime() - baseDate.getTime()) / dayMs));
}

export function calculateUpgradePayment({
   targetPlanName,
   billing,
   subscriptionEndAt,
   now = new Date(),
}) {
   const remainingDays = calculateRemainingDays(subscriptionEndAt, now);
   const monthlyAmount = getPlanBaseAmount(targetPlanName, "monthly") || 0;
   const dailyAmount = monthlyAmount / 30;
   const proratedAmount = Math.round(dailyAmount * remainingDays);

   return {
      ...getTossPlanPayment(targetPlanName, billing, {
         extraAmount: proratedAmount,
         orderNameSuffix:
            remainingDays > 0 ? `${remainingDays}일 업그레이드 일할 계산` : "업그레이드",
      }),
      dailyAmount,
      remainingDays,
      proratedAmount,
   };
}
