export class MarginDTO {
  id?: number; // 🔥 추가 (optional)

  minAmount: number;
  maxAmount: number;
  minMargin: number;
  marginValue: number;
  site: string;

  customId: string;
  accountPlatform: string;

  exchangeRate: number;
  discountRate: number;
}