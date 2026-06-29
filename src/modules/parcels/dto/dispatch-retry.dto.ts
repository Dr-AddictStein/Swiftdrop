import { IsOptional, IsString } from 'class-validator';

export class DispatchRetryDto {
  @IsOptional()
  @IsString()
  remarks?: string;
}
