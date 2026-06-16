import { Controller, Post, Body } from '@nestjs/common';
import { R2Service } from './r2.service';
import { Product } from 'src/product/product.entity'; // Product 엔티티 임포트
import { Mapping } from 'src/mapping/mapping.entity'; // CategoryMapping 엔티티 임포트

@Controller('r2')
export class R2Controller {
  constructor(private readonly r2Service: R2Service) {}


}
