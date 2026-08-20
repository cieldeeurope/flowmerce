import { Controller } from '@nestjs/common';
import { CpcompanyService } from './cpcompany.service';

@Controller('cpcompany')
export class CpcompanyController {
  constructor(private readonly cpcompanyService: CpcompanyService) {}
}
