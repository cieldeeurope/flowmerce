export class Cafe24CreateProductDto {
  // =========================
  // 🟢 상품 기본 정보
  // =========================
  product_name: string;      // 필수
  price: number;             // 필수
  supply_price: number;      // 필수

  display?: 'T' | 'F';
  selling?: 'T' | 'F';
  product_condition?: 'N' | 'B' | 'R' | 'U' | 'E' | 'F' | 'S';

  model_name?: string;
  summary_description?: string;
  simple_description?: string;
  description?: string;

  // =========================
  // 🟢 카테고리
  // =========================
  add_category_no?: {
    category_no: number;
  }[];

  // =========================
  // 🟢 이미지
  // =========================
  detail_image?: string;
  list_image?: string;
  additional_image?: string[];

  // =========================
  // 🟢 배송
  // =========================
  shipping_fee_type?: 'T' | 'R' | 'M' | 'D' | 'W' | 'C' | 'N';
  shipping_calculation?: 'A' | 'M';
  shipping_fee?: number;
  shipping_fee_by_product?: 'T' | 'F';
  shipping_scope?: 'A' | 'B' | 'C';
  shipping_method?: string;
  shipping_area?: string;
  shipping_period?: {
    minimum: number;
    maximum: number;
  };
  prepaid_shipping_fee?: 'P' | 'C' | 'B';
  product_shipping_type?: 'D' | 'C' | 'E';
  clearance_category_code?: string;
  shipping_info?: string;
  exchange_info?: string;
  service_info?: string;
  shipping_info_by_product?: 'T' | 'F';
  exchange_info_by_product?: 'T' | 'F';
  service_info_by_product?: 'T' | 'F';

  // =========================
  // 🟢 옵션
  // =========================
  has_option?: 'T' | 'F';
  options?: {
    name: string;
    value: string[];
  }[];

  size_guide?: {
    use: 'T' | 'F';
    type: 'default';
    default: 'Male' | 'Female';
  };

  // =========================
  // 🟢 기타
  // =========================
  product_tag?: string[];
}


export class Cafe24UpdateProductDto {
  // 🔥 수정은 product_no 기준
  product_no: number; // 필수

  product_name?: string;
  price?: number;
  supply_price?: number;

  display?: 'T' | 'F';
  selling?: 'T' | 'F';

  description?: string;

  add_category_no?: {
    category_no: number;
  }[];

  detail_image?: string;
  list_image?: string;

  shipping_fee_type?: 'T' | 'R' | 'M' | 'D' | 'W' | 'C' | 'N';
  shipping_calculation?: 'A' | 'M';
  shipping_fee?: number;
  shipping_fee_by_product?: 'T' | 'F';
  shipping_scope?: 'A' | 'B' | 'C';
  shipping_method?: string;
  shipping_area?: string;
  shipping_period?: {
    minimum: number;
    maximum: number;
  };
  prepaid_shipping_fee?: 'P' | 'C' | 'B';
  product_shipping_type?: 'D' | 'C' | 'E';
  clearance_category_code?: string;
  shipping_info?: string;
  exchange_info?: string;
  service_info?: string;
  shipping_info_by_product?: 'T' | 'F';
  exchange_info_by_product?: 'T' | 'F';
  service_info_by_product?: 'T' | 'F';
}
