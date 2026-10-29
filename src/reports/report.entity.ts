import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum ReportStatus {
  REPORTED = 'REPORTED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
}

// Base mínima para que Persona 4 cambie el estado y Persona 3 tenga a qué
// referenciar. Persona 2 es dueña de esta entidad: agrega sus campos con una
// migración nueva y no expone otra ruta que modifique `status`.
@Entity({ name: 'reports' })
@Index('IDX_reports_citizen_id', ['citizenId'])
@Index('IDX_reports_status', ['status'])
export class Report {
  @ApiProperty({ format: 'uuid' })
  @PrimaryColumn('uuid')
  id: string;

  @ApiProperty({ example: 'Luminaria dañada' })
  @Column({ type: 'varchar', length: 200 })
  title: string;

  @ApiProperty()
  @Column({ type: 'text' })
  description: string;

  @ApiProperty({ enum: ReportStatus })
  @Column({ type: 'varchar', length: 16, default: ReportStatus.REPORTED })
  status: ReportStatus;

  @ApiProperty({ format: 'uuid' })
  @Column({ type: 'uuid' })
  citizenId: string;

  @ApiProperty({ type: String, format: 'date-time' })
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
