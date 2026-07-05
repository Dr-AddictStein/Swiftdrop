import { IsEmail, IsString, MinLength } from 'class-validator';

export class CreateCompanyDto {
  @IsString()
  @MinLength(1)
  companyName!: string;

  @IsString()
  @MinLength(1)
  adminName!: string;

  @IsEmail()
  adminEmail!: string;

  @IsString()
  @MinLength(6)
  adminPassword!: string;
}
