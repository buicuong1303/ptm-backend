import {
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { EntityStatus } from 'src/common/constant/entity-status';

export class CreateCompanyDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsString()
  @MaxLength(100)
  code: string;

  @IsString()
  @MaxLength(12)
  @MinLength(10)
  phone: string;

  @IsString()
  @MaxLength(500)
  description: string;

  @IsUUID()
  signature: string;

  status: EntityStatus;

  @IsString()
  @MaxLength(100)
  server: string;

  @IsString()
  @MaxLength(100)
  clientId: string;

  @IsString()
  @MaxLength(100)
  clientSecret: string;

  @IsString()
  @MaxLength(100)
  username: string;

  @IsString()
  @MaxLength(100)
  password: string;

  @IsOptional()
  @MaxLength(100)
  extension?: string;

  @IsString()
  @MaxLength(100)
  dlrAddress: string;

  @IsString()
  @MaxLength(100)
  dlrMTT: string;

  @IsOptional()
  appStatus?: string;

  @IsOptional()
  appError?: string;
}
