import { Controller } from '@nestjs/common';
import { AlaiaService } from './alaia.service';

@Controller('alaia')
export class AlaiaController {
  constructor(private readonly alaiaService: AlaiaService) {}
}
