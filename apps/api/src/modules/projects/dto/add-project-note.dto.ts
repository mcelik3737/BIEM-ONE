import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class AddProjectNoteDto {
  @ApiProperty({ example: 'Müşteri ile telefon görüşmesi yapıldı.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  note!: string;
}
