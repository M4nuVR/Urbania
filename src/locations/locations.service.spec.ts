import { BadRequestException, ConflictException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { QueryFailedError, Repository } from 'typeorm';
import { ReportAuthorizationService } from '../common/report-authorization.service';
import { CreateLocationDto } from './dto/create-location.dto';
import { Location } from './location.entity';
import { LocationsService } from './locations.service';

describe('LocationsService', () => {
  const principal = { id: 'owner-id', roles: ['CITIZEN'] };
  const authorization = {
    authorizeModification: jest.fn(),
    authorizeRead: jest.fn(),
  };
  const repository = {
    create: jest.fn((value) => value),
    findOneBy: jest.fn(),
    save: jest.fn((value) => Promise.resolve(value)),
  };
  let service: LocationsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new LocationsService(
      repository as unknown as Repository<Location>,
      authorization as unknown as ReportAuthorizationService,
    );
  });

  it('rejects one coordinate without the other', async () => {
    await expect(
      service.create('report-id', principal, {
        address: 'Calle 10',
        latitude: 4.7,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a second location for the same report', async () => {
    repository.findOneBy.mockResolvedValue({ id: 'existing' });

    await expect(
      service.create('report-id', principal, { neighborhood: 'Centro' }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('maps a concurrent PostgreSQL uniqueness conflict to HTTP 409', async () => {
    repository.findOneBy.mockResolvedValue(null);
    repository.save.mockRejectedValue(
      new QueryFailedError(
        'INSERT INTO locations',
        [],
        Object.assign(new Error('duplicate key'), { code: '23505' }),
      ),
    );

    await expect(
      service.create('report-id', principal, { address: 'Calle 10' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('enforces coordinate limits through DTO validation', async () => {
    const dto = plainToInstance(CreateLocationDto, {
      address: 'Calle 10',
      latitude: 91,
      longitude: -181,
    });

    const errors = await validate(dto);
    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(['latitude', 'longitude']),
    );
  });
});
