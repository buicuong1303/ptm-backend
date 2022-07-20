import {
  IsArray,
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
export class AddUserDto {
  @MaxLength(30)
  @IsString()
  firstName: string;

  @MaxLength(30)
  @IsString()
  lastName: string;

  @MaxLength(30)
  @IsString()
  username: string;

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

  @IsOptional()
  companies: any;

  @IsArray()
  permissions: Array<any>;

  @IsArray()
  roles: Array<any>;

  @IsArray()
  permissionDeletes: Array<any>;

  @IsArray()
  roleDeletes: Array<any>;
}
