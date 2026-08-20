import { Controller, Get, Post, Param, Body, Put, Delete } from '@nestjs/common';
import { ProductService } from './product.service';

@Controller('products')  // 기본 경로를 'products'로 설정
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  
}
