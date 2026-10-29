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
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  REJECTED = 'REJECTED',
}

export enum ReportCategory {
  ROADS = 'ROADS',
  LIGHTING = 'LIGHTING',
  WASTE = 'WASTE',
  PUBLIC_SPACE = 'PUBLIC_SPACE',
  SECURITY = 'SECURITY',
  OTHER = 'OTHER',
}

@Entity({ name: 'reports' })
@Index('idx_reports_owner_id', ['ownerId'])
@Index('idx_reports_status', ['status'])
export class Report {
  @ApiProperty({ format: 'uuid' })
  @PrimaryColumn('uuid')
  id: string;

  @ApiProperty({ format: 'uuid' })
  @Column({ type: 'uuid' })
  ownerId: string;

  @ApiProperty({ example: 'Bache en la calle 10', maxLength: 150 })
  @Column({ type: 'varchar', length: 150 })
  title: string;

  @ApiProperty({
    example: 'Hay un bache profundo frente al parque',
    maxLength: 2000,
  })
  @Column({ type: 'varchar', length: 2000 })
  description: string;

  @ApiProperty({ enum: ReportCategory })
  @Column({ type: 'varchar', length: 32 })
  category: ReportCategory;

  @ApiProperty({ enum: ReportStatus })
  @Column({ type: 'varchar', length: 16, default: ReportStatus.REPORTED })
  status: ReportStatus;

  @ApiProperty({ type: String, format: 'date-time' })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  @UpdateDateColumn()
  updatedAt: Date;
}
