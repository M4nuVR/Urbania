import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { Repository } from 'typeorm';
import { AuthenticatedPrincipal } from '../common/report-access';
import { ReportAuthorizationService } from '../common/report-authorization.service';
import { CreateEvidenceDto } from './dto/create-evidence.dto';
import { Evidence } from './evidence.entity';

@Injectable()
export class EvidencesService {
  constructor(
    @InjectRepository(Evidence)
    private readonly evidences: Repository<Evidence>,
    private readonly reportAuthorization: ReportAuthorizationService,
  ) {}

  async create(
    reportId: string,
    principal: AuthenticatedPrincipal,
    input: CreateEvidenceDto,
  ): Promise<Evidence> {
    await this.reportAuthorization.authorizeModification(reportId, principal);
    this.validateUrlProtocol(input.url);

    return this.evidences.save(
      this.evidences.create({
        ...input,
        id: randomUUID(),
        reportId,
        description: input.description ?? null,
      }),
    );
  }

  async findForReport(
    reportId: string,
    principal: AuthenticatedPrincipal,
  ): Promise<Evidence[]> {
    await this.reportAuthorization.authorizeRead(reportId, principal);
    return this.evidences.find({
      where: { reportId },
      order: { createdAt: 'ASC' },
    });
  }

  async remove(
    evidenceId: string,
    principal: AuthenticatedPrincipal,
  ): Promise<void> {
    const evidence = await this.evidences.findOneBy({ id: evidenceId });
    if (!evidence) {
      throw new NotFoundException('Evidencia no encontrada');
    }

    await this.reportAuthorization.authorizeModification(
      evidence.reportId,
      principal,
    );
    await this.evidences.remove(evidence);
  }

  private validateUrlProtocol(url: string): void {
    let protocol: string;
    try {
      protocol = new URL(url).protocol;
    } catch {
      throw new BadRequestException('La URL de evidencia no es valida');
    }

    if (protocol === 'https:') {
      return;
    }
    if (protocol === 'http:' && process.env.NODE_ENV !== 'production') {
      return;
    }
    throw new BadRequestException(
      'La URL de evidencia debe usar HTTPS; HTTP solo se permite en desarrollo',
    );
  }
}
