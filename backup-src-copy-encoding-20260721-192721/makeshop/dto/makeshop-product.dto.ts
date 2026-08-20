export class MakeShopCreateProductDto {
  product_name: string;
  sellprice: string;

  category_code?: string;
  display?: 'Y' | 'N';
  sell_use?: 'Y' | 'N';

  content?: string;
  mobile_content?: string;
  summary?: string;

  brand?: string;
  manufacturer?: string;
  origin?: string;
  model_name?: string;

  main_image?: string;
  list_image?: string;
  add_images?: string[];

  option_use?: 'Y' | 'N';
  options?: {
    option_name: string;
  }[];
  opt_values?: string[];
  opt_price?: number[];
  stocks?: {
    option_values: string[];
    stock: number;
    price?: number;
  }[];

  delivery_fee?: number;
  delivery_type?: string;
  adult_use?: 'Y' | 'N';
}

export class MakeShopUpdateProductDto {
  product_code: string;

  product_name?: string;
  sellprice?: string;
  category_code?: string;
  display?: 'Y' | 'N';
  sell_use?: 'Y' | 'N';
  option_use?: 'Y' | 'N';
  options?: {
    option_name: string;
  }[];
  opt_values?: string[];
  opt_price?: number[];
  stocks?: {
    option_values: string[];
    stock: number;
    price?: number;
  }[];
}
