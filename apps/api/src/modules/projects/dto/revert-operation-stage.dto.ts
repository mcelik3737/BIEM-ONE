import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class RevertOperationStageDto {
  @ApiProperty({ example: 'Saha hazırlıkları tamamlanmadığı için geri alındı.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  reason!: string;
}
