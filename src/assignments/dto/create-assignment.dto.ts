import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class CreateAssignmentDto {
  @ApiProperty({
    format: 'uuid',
    description: 'Usuario con rol AUTHORITY que atenderá el reporte',
  })
  @IsUUID()
  authorityId: string;
}
