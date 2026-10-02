import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
@Controller('health')
export class HealthController {
  constructor(private readonly db: PrismaService) {}
  @Get()
  async getHealth() {
    try {
      await this.db.$queryRaw`SELECT 1`;
      return { service: 'BIEM ONE API', status: 'ok' };
    } catch {
      throw new ServiceUnavailableException('Veritabanına ulaşılamıyor.');
    }
  }
}
