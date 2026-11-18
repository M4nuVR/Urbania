import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
} from 'typeorm';

@Entity({ name: 'categories' })
@Index('uq_categories_slug', ['slug'], { unique: true })
export class Category {
  @ApiProperty({ format: 'uuid', readOnly: true })
  @PrimaryColumn('uuid')
  id: string;

  @ApiProperty({ example: 'Vías', maxLength: 100 })
  @Column({ type: 'varchar', length: 100 })
  name: string;

  @ApiProperty({ example: 'vias', maxLength: 64 })
  @Column({ type: 'varchar', length: 64 })
  slug: string;

  @ApiProperty({ type: String, nullable: true, maxLength: 500 })
  @Column({ type: 'varchar', length: 500, nullable: true })
  description: string | null;

  @ApiProperty({ default: true })
  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @ApiProperty({ type: String, format: 'date-time', readOnly: true })
  @CreateDateColumn()
  createdAt: Date;
}
