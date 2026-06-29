import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ParcelStatus } from '../../../common/enums/parcel-status.enum';

export class ListParcelsQueryDto {
  @IsOptional()
  @IsEnum(ParcelStatus)
  status?: ParcelStatus;

  @IsOptional()
  @IsString()
  sender?: string;
}
