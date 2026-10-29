import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum Role {
  CITIZEN = 'CITIZEN',
  AUTHORITY = 'AUTHORITY',
  ADMIN = 'ADMIN',
}

// Base mínima para que Persona 4 pueda validar roles y relacionar asignaciones.
// Persona 1 es dueña de esta entidad: completa los campos y el registro/login.
@Entity({ name: 'users' })
export class User {
  @ApiProperty({ format: 'uuid' })
  @PrimaryColumn('uuid')
  id: string;

  @ApiProperty({ example: 'Autoridad Alumbrado' })
  @Column({ type: 'varchar', length: 120 })
  name: string;

  @ApiProperty({ example: 'autoridad@urbania.dev' })
  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  // select: false → nunca sale en consultas ni relaciones salvo que se pida.
  @Column({ type: 'varchar', length: 255, select: false })
  passwordHash: string;

  @ApiProperty({ enum: Role })
  @Column({ type: 'varchar', length: 16, default: Role.CITIZEN })
  role: Role;

  @ApiProperty({ type: String, format: 'date-time' })
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
