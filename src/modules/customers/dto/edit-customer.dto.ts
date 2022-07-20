import { IsArray, IsOptional, IsString, MaxLength } from 'class-validator';

export class EditCustomerDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name: string;

  @IsArray()
  campaigns: Array<any>;

  @IsString()
  conversationId: string;
}
