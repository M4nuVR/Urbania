import { ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { IsUUID, ValidateIf } from 'class-validator';
import { CreateReportDto } from './create-report.dto';

export class UpdateReportDto extends PartialType(
  OmitType(CreateReportDto, ['categoryId'] as const),
) {
  // Opcional pero NO nullable: PartialType usa @IsOptional, que también deja
  // pasar null. Aquí solo se omite la validación cuando el campo no viene.
  @ApiPropertyOptional({ format: 'uuid' })
  @ValidateIf((_object, value) => value !== undefined)
  @IsUUID()
  categoryId?: string;
}
