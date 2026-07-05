import { IsEmail, IsString, MinLength } from 'class-validator';

export class RegisterAdminDto {
  @IsString()
  @MinLength(1)
  companyName!: string;

  @IsString()
  @MinLength(1)
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;
}
