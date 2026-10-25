import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'ciudadano@example.org' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'contrasena-segura' })
  @IsString()
  @MaxLength(72)
  password: string;
}
