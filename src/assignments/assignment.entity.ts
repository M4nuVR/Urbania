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
import { User } from '../users/user.entity';

// MVP: una asignación vigente por reporte (reportId único).
@Entity({ name: 'assignments' })
@Index('UQ_assignments_report_id', ['reportId'], { unique: true })
@Index('IDX_assignments_authority_id', ['authorityId'])
export class Assignment {
  @ApiProperty({ format: 'uuid' })
  @PrimaryColumn('uuid')
  id: string;

  @ApiProperty({ format: 'uuid' })
  @Column({ type: 'uuid' })
  reportId: string;

  @ApiProperty({ format: 'uuid' })
  @Column({ type: 'uuid' })
  authorityId: string;

  @ApiProperty({ format: 'uuid' })
  @Column({ type: 'uuid' })
  assignedBy: string;

  @ApiProperty({ type: String, format: 'date-time' })
  @CreateDateColumn({ type: TIMESTAMPTZ })
  assignedAt: Date;

  @ApiPropertyOptional({ type: () => User })
  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'authorityId' })
  authority?: User;
}
