import { ApiProperty } from '@nestjs/swagger';
import { Profile } from '../entities/profile.entity';

// Respuesta explícita: nunca serializa la entidad User ni sus credenciales.
export class ProfileDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ format: 'uuid' })
  userId: string;

  @ApiProperty({ type: String, nullable: true, maxLength: 2048 })
  avatarUrl: string | null;

  @ApiProperty({ type: String, nullable: true, maxLength: 500 })
  bio: string | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt: Date;

  static from(profile: Profile): ProfileDto {
    return {
      id: profile.id,
      userId: profile.userId,
      avatarUrl: profile.avatarUrl,
      bio: profile.bio,
      createdAt: profile.createdAt,
    };
  }
}

export class ProfileResponseDto {
  @ApiProperty({
    type: ProfileDto,
    nullable: true,
    description: 'null si el usuario aún no tiene perfil',
  })
  profile: ProfileDto | null;
}
