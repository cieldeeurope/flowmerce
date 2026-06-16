// product.service.ts

import { Injectable } from '@nestjs/common';
import { MarginService } from 'src/margin/margin.service';
import { Product } from './product.entity';

@Injectable()
export class ProductService {
    constructor(private readonly marginService: MarginService) {}

    
}
