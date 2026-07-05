import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ReportIncidentDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
