import { IsString, MaxLength } from 'class-validator';
import { EntityStatus } from 'src/common/constant/entity-status';

export class AddSignaturesDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsString()
  @MaxLength(500)
  value: string;

  status: EntityStatus;
}
