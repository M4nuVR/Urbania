import { BadRequestException, NotFoundException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { Repository } from 'typeorm';
import { ReportAuthorizationService } from '../common/report-authorization.service';
import { CreateEvidenceDto } from './dto/create-evidence.dto';
import { Evidence, EvidenceType } from './evidence.entity';
import { EvidencesService } from './evidences.service';

describe('EvidencesService', () => {
  const principal = { id: 'owner-id', roles: ['CITIZEN'] };
  const authorization = {
    authorizeModification: jest.fn(),
    authorizeRead: jest.fn(),
  };
  const repository = {
    create: jest.fn((value) => value),
    findOneBy: jest.fn(),
    remove: jest.fn(),
    save: jest.fn((value) => Promise.resolve(value)),
  };
  let service: EvidencesService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new EvidencesService(
      repository as unknown as Repository<Evidence>,
      authorization as unknown as ReportAuthorizationService,
    );
  });

  it('accepts HTTPS and HTTP URL formats in the DTO', async () => {
    const valid = plainToInstance(CreateEvidenceDto, {
      url: 'https://files.example.org/photo.jpg',
      type: EvidenceType.IMAGE,
    });
    const devUrl = plainToInstance(CreateEvidenceDto, {
      url: 'http://files.example.org/photo.jpg',
      type: EvidenceType.IMAGE,
    });

    expect(await validate(valid)).toHaveLength(0);
    expect(await validate(devUrl)).toHaveLength(0);
  });

  it('rejects HTTP evidence URLs in production', async () => {
    const previousNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    authorization.authorizeModification.mockResolvedValue(undefined);

    try {
      await expect(
        service.create('report-id', principal, {
          url: 'http://files.example.org/photo.jpg',
          type: EvidenceType.IMAGE,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(repository.save).not.toHaveBeenCalled();
    } finally {
      process.env.NODE_ENV = previousNodeEnv;
    }
  });

  it('authorizes deletion against the evidence report, not a caller-supplied report', async () => {
    const evidence = {
      id: 'evidence-id',
      reportId: 'actual-report-id',
    } as Evidence;
    repository.findOneBy.mockResolvedValue(evidence);

    await service.remove(evidence.id, principal);

    expect(authorization.authorizeModification).toHaveBeenCalledWith(
      'actual-report-id',
      principal,
    );
    expect(repository.remove).toHaveBeenCalledWith(evidence);
  });

  it('returns not found when the evidence does not exist', async () => {
    repository.findOneBy.mockResolvedValue(null);

    await expect(
      service.remove('missing-id', principal),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(authorization.authorizeModification).not.toHaveBeenCalled();
  });
});
