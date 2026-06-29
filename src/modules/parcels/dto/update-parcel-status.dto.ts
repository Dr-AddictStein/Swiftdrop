import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ParcelStatus } from '../../../common/enums/parcel-status.enum';

export class UpdateParcelStatusDto {
  @IsEnum(ParcelStatus)
  status!: ParcelStatus;

  @IsOptional()
  @IsString()
  remarks?: string;
}
