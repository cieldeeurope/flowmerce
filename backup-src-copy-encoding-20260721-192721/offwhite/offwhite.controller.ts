import { Controller } from '@nestjs/common';
import { OffwhiteService } from './offwhite.service';

@Controller('offwhite')
export class OffwhiteController {
  constructor(private readonly offwhiteService: OffwhiteService) {}
}
