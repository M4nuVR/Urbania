import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, IsUrl, MaxLength, ValidateIf } from 'class-validator';

// Omitir un campo conserva su valor; enviar null lo elimina.
export class UpdateProfileDto {
  @ApiPropertyOptional({
    type: String,
    example: 'https://example.org/avatar.png',
    maxLength: 2048,
    nullable: true,
    description: 'URL HTTP o HTTPS. Solo se guarda la URL, no el archivo.',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @ValidateIf((_object, value) => value !== undefined && value !== null)
  @IsString()
  @MaxLength(2048)
  @IsUrl({ protocols: ['https', 'http'], require_protocol: true })
  avatarUrl?: string | null;

  @ApiPropertyOptional({
    type: String,
    example: 'Ciudadano interesado en mejorar su comunidad.',
    maxLength: 500,
    nullable: true,
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @ValidateIf((_object, value) => value !== undefined && value !== null)
  @IsString()
  @MaxLength(500)
  bio?: string | null;
}
