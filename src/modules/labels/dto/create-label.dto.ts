import { IsArray, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateLabelDto {
  @IsString()
  @MaxLength(20)
  @IsNotEmpty()
  title: string;

  @IsString()
  @MaxLength(500)
  description: string;

  @IsString()
  @MaxLength(500)
  @IsNotEmpty()
  bgColor: string;

  @IsArray()
  companies: Array<any>;
}
