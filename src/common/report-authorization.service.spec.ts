import {
  ConflictException,
  ForbiddenException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import {
  AuthenticatedPrincipal,
  REPORT_ACCESS_PORT,
  ReportAccessPort,
} from './report-access';
import { ReportAuthorizationService } from './report-authorization.service';

describe('ReportAuthorizationService', () => {
  const principal: AuthenticatedPrincipal = {
    id: 'owner-id',
    roles: ['CITIZEN'],
  };
  const report = { id: 'report-id', ownerId: 'owner-id', status: 'REPORTED' };
  const access: jest.Mocked<ReportAccessPort> = {
    findById: jest.fn(),
    canRead: jest.fn(),
    canModify: jest.fn(),
  };
  const moduleRef = {
    get: jest.fn(),
  };
  let service: ReportAuthorizationService;

  beforeEach(() => {
    jest.clearAllMocks();
    moduleRef.get.mockReturnValue(access);
    access.findById.mockResolvedValue(report);
    access.canRead.mockResolvedValue(true);
    access.canModify.mockResolvedValue(true);
    service = new ReportAuthorizationService(moduleRef as unknown as ModuleRef);
  });

  it('requires the report owner and editable status for changes', async () => {
    await service.authorizeModification(report.id, principal);
    expect(access.canModify).toHaveBeenCalledWith(principal, report);

    await expect(
      service.authorizeModification(report.id, {
        ...principal,
        id: 'other-id',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);

    access.findById.mockResolvedValue({ ...report, status: 'IN_PROGRESS' });
    await expect(
      service.authorizeModification(report.id, principal),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('uses the report access policy for reads', async () => {
    access.canRead.mockResolvedValue(false);

    await expect(
      service.authorizeRead(report.id, principal),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('fails closed until the reports adapter is registered', async () => {
    moduleRef.get.mockImplementation(() => {
      throw new Error('missing provider');
    });

    await expect(
      service.authorizeRead(report.id, principal),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
