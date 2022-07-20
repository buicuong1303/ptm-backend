import {
  IsArray,
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { EntityStatus } from 'src/common/constant/entity-status';

export class AddCustomerDto {
  @IsArray()
  @IsOptional()
  companyCustomers: Array<any>;

  @IsArray()
  @IsOptional()
  campaignCustomers?: Array<any>;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  fullName: string;

  @MinLength(10)
  @MaxLength(12)
  @IsString()
  phoneNumber: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(100)
  emailAddress: string;

  @IsOptional()
  status: EntityStatus;
}
