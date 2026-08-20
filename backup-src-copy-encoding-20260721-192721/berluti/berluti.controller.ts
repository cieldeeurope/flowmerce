import { Controller } from '@nestjs/common';
import { BerlutiService } from './berluti.service';

@Controller('berluti')
export class BerlutiController {
  constructor(private readonly berlutiService: BerlutiService) {}
}
