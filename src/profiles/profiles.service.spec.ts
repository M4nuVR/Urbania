import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { QueryFailedError, Repository } from 'typeorm';
import { UsersService } from '../users/users.service';
import { Profile } from './entities/profile.entity';
import { ProfilesService } from './profiles.service';

describe('ProfilesService', () => {
  const userId = 'user-id';
  const repository = {
    findOneBy: jest.fn(),
    findOneByOrFail: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
  };
  const users = { findById: jest.fn() };
  const stored: Profile = {
    id: 'profile-id',
    userId,
    avatarUrl: 'https://example.org/a.png',
    bio: 'Bio original',
    createdAt: new Date('2026-11-18T00:00:00Z'),
  };
  let service: ProfilesService;

  beforeEach(() => {
    jest.resetAllMocks();
    users.findById.mockResolvedValue({ id: userId });
    service = new ProfilesService(
      repository as unknown as Repository<Profile>,
      users as unknown as UsersService,
    );
  });

  it('returns { profile: null } for a user without profile', async () => {
    repository.findOneBy.mockResolvedValue(null);
    await expect(service.findMine(userId)).resolves.toEqual({ profile: null });
    expect(repository.findOneBy).toHaveBeenCalledWith({ userId });
  });

  it('exposes only public profile fields', async () => {
    repository.findOneBy.mockResolvedValue({
      ...stored,
      user: { passwordHash: 'secret' },
    });
    const { profile } = await service.findMine(userId);
    expect(Object.keys(profile ?? {}).sort()).toEqual(
      ['avatarUrl', 'bio', 'createdAt', 'id', 'userId'].sort(),
    );
  });

  it('rejects an empty update before touching the database', async () => {
    await expect(service.updateMine(userId, {})).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(users.findById).not.toHaveBeenCalled();
    expect(repository.insert).not.toHaveBeenCalled();
  });

  it('rejects a token whose user no longer exists', async () => {
    users.findById.mockResolvedValue(null);
    await expect(
      service.updateMine(userId, { bio: 'x' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(service.findMine(userId)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(repository.insert).not.toHaveBeenCalled();
  });

  it('creates the profile on the first update', async () => {
    repository.findOneBy.mockResolvedValue(null);
    repository.findOneByOrFail.mockResolvedValue({
      ...stored,
      avatarUrl: null,
    });
    await service.updateMine(userId, { bio: 'Hola' });
    const [inserted] = repository.insert.mock.calls[0] as [Profile];
    expect(inserted).toMatchObject({ userId, bio: 'Hola', avatarUrl: null });
    expect(inserted.id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('updates only the fields that were sent and allows null', async () => {
    repository.findOneBy.mockResolvedValue(stored);
    repository.findOneByOrFail.mockResolvedValue({
      ...stored,
      avatarUrl: null,
    });
    const result = await service.updateMine(userId, { avatarUrl: null });
    expect(repository.update).toHaveBeenCalledWith(
      { id: stored.id },
      { avatarUrl: null },
    );
    expect(repository.insert).not.toHaveBeenCalled();
    expect(result.profile).toMatchObject({
      id: stored.id,
      bio: 'Bio original',
    });
  });

  it('recovers from a concurrent first insert by updating the winner', async () => {
    repository.findOneBy.mockResolvedValue(null);
    repository.insert.mockRejectedValue(
      new QueryFailedError(
        'INSERT',
        [],
        Object.assign(new Error('duplicate key'), {
          code: '23505',
          constraint: 'uq_profiles_user_id',
        }),
      ),
    );
    repository.findOneByOrFail.mockResolvedValue(stored);
    await service.updateMine(userId, { bio: 'Segunda' });
    expect(repository.update).toHaveBeenCalledWith(
      { id: stored.id },
      { bio: 'Segunda' },
    );
  });

  it('does not hide unrelated database errors', async () => {
    repository.findOneBy.mockResolvedValue(null);
    const failure = new QueryFailedError(
      'INSERT',
      [],
      Object.assign(new Error('fk'), { code: '23503' }),
    );
    repository.insert.mockRejectedValue(failure);
    await expect(service.updateMine(userId, { bio: 'x' })).rejects.toBe(
      failure,
    );
    expect(repository.update).not.toHaveBeenCalled();
  });
});
