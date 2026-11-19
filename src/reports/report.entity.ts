import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Category } from '../categories/entities/category.entity';

export enum ReportStatus {
  REPORTED = 'REPORTED',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  REJECTED = 'REJECTED',
}

@Entity({ name: 'reports' })
@Index('idx_reports_owner_id', ['ownerId'])
@Index('idx_reports_status', ['status'])
@Index('idx_reports_category_id', ['categoryId'])
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

  @ApiProperty({ format: 'uuid' })
  @Column({ type: 'uuid' })
  categoryId: string;

  // RESTRICT: un borrado físico de la categoría no puede dejar reportes
  // sin clasificación. Las categorías se desactivan, no se borran.
  @ApiProperty({ type: () => Category })
  @ManyToOne(() => Category, { onDelete: 'RESTRICT', nullable: false })
  @JoinColumn({ name: 'categoryId' })
  category?: Category;

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
