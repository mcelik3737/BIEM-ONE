import { WorkPriority } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateProjectDto {
  @ApiProperty({ example: 'Merkez Ofis Güvenlik Sistemi' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @ApiPropertyOptional({ enum: ['Telefon', 'E-posta', 'WhatsApp', 'İhale', 'Referans', 'Diğer'] })
  @IsOptional()
  @IsIn(['Telefon', 'E-posta', 'WhatsApp', 'İhale', 'Referans', 'Diğer'])
  source?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ownerId?: string;

  @ApiPropertyOptional({ enum: WorkPriority, default: WorkPriority.NORMAL })
  @IsOptional()
  @IsEnum(WorkPriority)
  priority?: WorkPriority;

  @ApiPropertyOptional({ example: 125000, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  estimatedValue?: number;

  @ApiPropertyOptional({ enum: ['TRY', 'USD', 'EUR'], default: 'TRY' })
  @IsOptional()
  @IsIn(['TRY', 'USD', 'EUR'])
  currency?: string;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  @IsOptional()
  @IsDateString()
  dueDate?: string;
}
