import { Controller } from '@nestjs/common';
import { EtroService } from './etro.service';

@Controller('etro')
export class EtroController {
  constructor(private readonly etroService: EtroService) {}
}
