import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString, MaxLength, MinLength } from 'class-validator';
import { ReportCategory } from '../report.entity';

export class CreateReportDto {
  @ApiProperty({ example: 'Bache en la calle 10', maxLength: 150 })
  @IsString()
  @MinLength(3)
  @MaxLength(150)
  title: string;

  @ApiProperty({
    example: 'Hay un bache profundo frente al parque',
    maxLength: 2000,
  })
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  description: string;

  @ApiProperty({ enum: ReportCategory, example: ReportCategory.ROADS })
  @IsEnum(ReportCategory)
  category: ReportCategory;
}
