import { Controller } from '@nestjs/common';
import { JimmychooService } from './jimmychoo.service';

@Controller('jimmychoo')
export class JimmychooController {
  constructor(private readonly jimmychooService: JimmychooService) {}
}
