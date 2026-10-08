import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';
import { EvidenceType } from '../evidence.entity';

export class CreateEvidenceDto {
  @ApiProperty({ example: 'https://files.example.org/evidence/photo.jpg' })
  @IsString()
  @MaxLength(2048)
  @IsUrl({ protocols: ['https', 'http'], require_protocol: true })
  url: string;

  @ApiProperty({ enum: EvidenceType, example: EvidenceType.IMAGE })
  @IsEnum(EvidenceType)
  type: EvidenceType;

  @ApiPropertyOptional({
    example: 'Bache junto a la interseccion',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
