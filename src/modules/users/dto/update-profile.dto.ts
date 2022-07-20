import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';
export class UpdateProfileDto {
  @MaxLength(30)
  @IsString()
  firstName: string;

  @MaxLength(30)
  @IsString()
  lastName: string;

  @IsEmail()
  @MaxLength(100)
  @IsString()
  email: string;

  @IsOptional()
  @IsString()
  gender: string;

  @IsOptional()
  @IsString()
  status: string;
}
