import { IsArray, IsDate, IsNotEmpty, IsUUID } from 'class-validator';

export class GetHistoryDto {
  @IsUUID()
  @IsNotEmpty()
  companyId: string;
  @IsArray()
  phones: Array<string>;
  startDate: any;
  endDate: any;
}
