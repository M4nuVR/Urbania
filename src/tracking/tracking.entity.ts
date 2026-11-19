import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { TIMESTAMPTZ } from '../database/column-types';
import { ReportStatus } from '../reports/report.entity';
import { User } from '../users/user.entity';

// Historial inmutable: no se exponen rutas de edición ni borrado.
// previousStatus es nulo solo en la entrada inicial REPORTED.
@Entity({ name: 'tracking' })
@Index('IDX_tracking_report_id_created_at', ['reportId', 'createdAt'])
export class Tracking {
  @ApiProperty({ format: 'uuid' })
  @PrimaryColumn('uuid')
  id: string;

  @ApiProperty({ format: 'uuid' })
  @Column({ type: 'uuid' })
  reportId: string;

  @ApiPropertyOptional({ enum: ReportStatus, nullable: true })
  @Column({ type: 'varchar', length: 16, nullable: true })
  previousStatus: ReportStatus | null;

  @ApiProperty({ enum: ReportStatus })
  @Column({ type: 'varchar', length: 16 })
  newStatus: ReportStatus;

  @ApiProperty({ format: 'uuid' })
  @Column({ type: 'uuid' })
  changedBy: string;

  @ApiPropertyOptional({ maxLength: 1000, nullable: true })
  @Column({ type: 'varchar', length: 1000, nullable: true })
  observation: string | null;

  @ApiProperty({ type: String, format: 'date-time' })
  @CreateDateColumn({ type: TIMESTAMPTZ })
  createdAt: Date;

  @ApiPropertyOptional({ type: () => User })
  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'changedBy' })
  user?: User;
}
