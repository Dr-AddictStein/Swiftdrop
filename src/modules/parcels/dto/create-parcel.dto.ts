import {
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateParcelDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  trackingNumber?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  senderName!: string;

  @IsString()
  @IsNotEmpty()
  senderAddress!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  recipientName!: string;

  @IsString()
  @IsNotEmpty()
  recipientAddress!: string;
}
