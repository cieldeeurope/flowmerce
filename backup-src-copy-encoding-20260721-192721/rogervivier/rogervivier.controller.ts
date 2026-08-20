import { Controller } from '@nestjs/common';
import { RogervivierService } from './rogervivier.service';

@Controller('rogervivier')
export class RogervivierController {
  constructor(private readonly rogervivierService: RogervivierService) {}
}
