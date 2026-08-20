import { Controller } from '@nestjs/common';
import { VersaceService } from './versace.service';

@Controller('versace')
export class VersaceController {
  constructor(private readonly versaceService: VersaceService) {}
}
