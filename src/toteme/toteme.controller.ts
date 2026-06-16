import { Controller } from '@nestjs/common';
import { TotemeService } from './toteme.service';

@Controller('toteme')
export class TotemeController {
  constructor(private readonly totemeService: TotemeService) {}
}
