import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { ParcelStatus } from '../../../common/enums/parcel-status.enum';

export class CreateDeliveryEventDto {
  @IsUUID()
  parcelId!: string;

  @IsEnum(ParcelStatus)
  status!: ParcelStatus;

  @IsOptional()
  @IsString()
  remarks?: string;
}
