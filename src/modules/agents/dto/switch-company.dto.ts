import { IsString, Length } from 'class-validator';

export class SwitchCompanyDto {
  @IsString()
  @Length(4, 20)
  joinCode!: string;
}
