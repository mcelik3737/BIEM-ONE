import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

export class CompleteNextActionDto {
  @ApiPropertyOptional({ description: 'Optional replacement next action.' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  nextAction?: string;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  @IsOptional()
  @IsDateString()
  nextActionDate?: string;
}
