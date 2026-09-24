import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('health')
@Controller('health')
export class HealthController {
  @Public()
  @Get()
  getHealth() {
    return {
      service: 'BIEM ONE API',
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
