import { PartialType } from '@nestjs/mapped-types';
import { CreateCompanyUserDto } from './create-company-user.dto';

export class UpdateCompanyUserDto extends PartialType(CreateCompanyUserDto) {}
