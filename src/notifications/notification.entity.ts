import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
} from 'typeorm';

export enum NotificationType {
  ASSIGNED = 'ASSIGNED',
  STATUS_CHANGED = 'STATUS_CHANGED',
}

@Entity({ name: 'notifications' })
@Index('IDX_notifications_user_id_created_at', ['userId', 'createdAt'])
export class Notification {
  @ApiProperty({ format: 'uuid' })
  @PrimaryColumn('uuid')
  id: string;

  @ApiProperty({ format: 'uuid' })
  @Column({ type: 'uuid' })
  userId: string;

  @ApiProperty({ format: 'uuid' })
  @Column({ type: 'uuid' })
  reportId: string;

  @ApiProperty({ enum: NotificationType })
  @Column({ type: 'varchar', length: 16 })
  type: NotificationType;

  @ApiProperty({ maxLength: 500 })
  @Column({ type: 'varchar', length: 500 })
  message: string;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  @Column({ type: 'timestamptz', nullable: true })
  readAt: Date | null;

  @ApiProperty({ type: String, format: 'date-time' })
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
