import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity({ name: 'locations' })
@Index('uq_locations_report_id', ['reportId'], { unique: true })
export class Location {
  @ApiProperty({ format: 'uuid' })
  @PrimaryColumn('uuid')
  id: string;

  @ApiProperty({ format: 'uuid' })
  @Column({ type: 'uuid' })
  reportId: string;

  @ApiPropertyOptional({ example: 'Calle 10 # 5-20', nullable: true })
  @Column({ type: 'varchar', length: 255, nullable: true })
  address: string | null;

  @ApiPropertyOptional({ example: 'Centro', nullable: true })
  @Column({ type: 'varchar', length: 120, nullable: true })
  neighborhood: string | null;

  @ApiPropertyOptional({ example: 'Zona norte', nullable: true })
  @Column({ type: 'varchar', length: 120, nullable: true })
  zone: string | null;

  @ApiPropertyOptional({
    example: 4.711,
    minimum: -90,
    maximum: 90,
    nullable: true,
  })
  @Column({ type: 'double precision', nullable: true })
  latitude: number | null;

  @ApiPropertyOptional({
    example: -74.0721,
    minimum: -180,
    maximum: 180,
    nullable: true,
  })
  @Column({ type: 'double precision', nullable: true })
  longitude: number | null;
}
