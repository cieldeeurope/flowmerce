import { Controller } from '@nestjs/common';
import { DelvauxService } from './delvaux.service';

@Controller('delvaux')
export class DelvauxController {
  constructor(private readonly delvauxService: DelvauxService) {}
}
