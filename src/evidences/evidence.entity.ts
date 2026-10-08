import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
} from 'typeorm';

export enum EvidenceType {
  IMAGE = 'IMAGE',
  FILE = 'FILE',
}

@Entity({ name: 'evidences' })
@Index('idx_evidences_report_id', ['reportId'])
export class Evidence {
  @ApiProperty({ format: 'uuid' })
  @PrimaryColumn('uuid')
  id: string;

  @ApiProperty({ format: 'uuid' })
  @Column({ type: 'uuid' })
  reportId: string;

  @ApiProperty({
    format: 'uri',
    example: 'https://files.example.org/evidence/photo.jpg',
  })
  @Column({ type: 'varchar', length: 2048 })
  url: string;

  @ApiProperty({ enum: EvidenceType })
  @Column({ type: 'varchar', length: 16 })
  type: EvidenceType;

  @ApiPropertyOptional({ maxLength: 500, nullable: true })
  @Column({ type: 'varchar', length: 500, nullable: true })
  description: string | null;

  @ApiProperty({ type: String, format: 'date-time' })
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
