import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { QueryFailedError, Repository } from 'typeorm';
import { UsersService } from '../users/users.service';
import { ProfileDto, ProfileResponseDto } from './dto/profile-response.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { Profile } from './entities/profile.entity';

type ProfileChanges = Partial<Pick<Profile, 'avatarUrl' | 'bio'>>;

@Injectable()
export class ProfilesService {
  constructor(
    @InjectRepository(Profile)
    private readonly profiles: Repository<Profile>,
    private readonly users: UsersService,
  ) {}

  async findMine(userId: string): Promise<ProfileResponseDto> {
    await this.assertUserExists(userId);
    const profile = await this.profiles.findOneBy({ userId });
    return { profile: profile ? ProfileDto.from(profile) : null };
  }

  // Crea el perfil en la primera modificación; después solo actualiza
  // los campos recibidos.
  async updateMine(
    userId: string,
    input: UpdateProfileDto,
  ): Promise<ProfileResponseDto> {
    const changes: ProfileChanges = {};
    if (input.avatarUrl !== undefined) changes.avatarUrl = input.avatarUrl;
    if (input.bio !== undefined) changes.bio = input.bio;
    if (Object.keys(changes).length === 0) {
      throw new BadRequestException('Debes enviar al menos un campo');
    }

    await this.assertUserExists(userId);
    const existing = await this.profiles.findOneBy({ userId });
    if (existing) {
      return this.applyChanges(existing.id, changes);
    }

    try {
      await this.profiles.insert({
        id: randomUUID(),
        userId,
        avatarUrl: changes.avatarUrl ?? null,
        bio: changes.bio ?? null,
      });
    } catch (error) {
      // Dos PATCH iniciales simultáneos: el segundo choca con la restricción
      // única de userId, recupera el perfil creado y aplica sus campos.
      if (!this.isDuplicateProfile(error)) throw error;
      const created = await this.profiles.findOneByOrFail({ userId });
      return this.applyChanges(created.id, changes);
    }
    return this.respond(userId);
  }

  private async applyChanges(
    id: string,
    changes: ProfileChanges,
  ): Promise<ProfileResponseDto> {
    // update() parcial: no sobrescribe campos que esta solicitud no envió.
    await this.profiles.update({ id }, changes);
    const profile = await this.profiles.findOneByOrFail({ id });
    return { profile: ProfileDto.from(profile) };
  }

  private async respond(userId: string): Promise<ProfileResponseDto> {
    const profile = await this.profiles.findOneByOrFail({ userId });
    return { profile: ProfileDto.from(profile) };
  }

  private async assertUserExists(userId: string): Promise<void> {
    // Un JWT válido puede pertenecer a un usuario que ya fue eliminado.
    if (!(await this.users.findById(userId))) {
      throw new UnauthorizedException('El usuario del token ya no existe');
    }
  }

  private isDuplicateProfile(error: unknown): boolean {
    if (!(error instanceof QueryFailedError)) return false;
    const driver = error.driverError as {
      code?: string;
      constraint?: string;
      message?: string;
    };
    const postgresConflict =
      driver.code === '23505' && driver.constraint === 'uq_profiles_user_id';
    const sqljsConflict =
      driver.message?.includes('UNIQUE constraint failed: profiles.userId') ??
      false;
    return postgresConflict || sqljsConflict;
  }
}
