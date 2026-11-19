import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
} from 'typeorm';

export enum UserRole {
  CITIZEN = 'CITIZEN',
  // Entidad responsable de atender reportes asignados (Persona 4)
  AUTHORITY = 'AUTHORITY',
  ADMIN = 'ADMIN',
}

@Entity({ name: 'users' })
@Index('uq_users_email', ['email'], { unique: true })
export class User {
  @ApiProperty({ format: 'uuid' })
  @PrimaryColumn('uuid')
  id: string;

  @ApiProperty({ example: 'ciudadano@example.org' })
  @Column({ type: 'varchar', length: 255 })
  email: string;

  @ApiProperty({ example: 'Ana Perez' })
  @Column({ type: 'varchar', length: 120 })
  fullName: string;

  @Column({ type: 'varchar', length: 255, select: false })
  passwordHash: string;

  @ApiProperty({ enum: UserRole })
  @Column({ type: 'varchar', length: 16, default: UserRole.CITIZEN })
  role: UserRole;

  @ApiProperty({ type: String, format: 'date-time' })
  @CreateDateColumn()
  createdAt: Date;
}
