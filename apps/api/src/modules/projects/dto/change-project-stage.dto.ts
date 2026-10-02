import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export const WORKFLOW_STAGE_CODES = [
  'YENI_TALEP',
  'DEGERLENDIRME',
  'COZUM_KESIF',
  'TEKLIF_VERILDI',
  'KARAR_BEKLENIYOR',
  'KAZANILDI',
  'KAYBEDILDI',
] as const;

export type WorkflowStageCode = (typeof WORKFLOW_STAGE_CODES)[number];

export class ChangeProjectStageDto {
  @ApiProperty({ enum: WORKFLOW_STAGE_CODES, example: 'DEGERLENDIRME' })
  @IsIn(WORKFLOW_STAGE_CODES)
  stageCode!: WorkflowStageCode;

  @ApiProperty({ required: false, description: 'One-step backward transitions require a reason.' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}
