import { IsString, MaxLength } from 'class-validator';
import { EntityStatus } from 'src/common/constant/entity-status';

export class UpdateGroupDto {
  @IsString()
  @MaxLength(20)
  name: string;

  @IsString()
  @MaxLength(500)
  description: string;

  status: EntityStatus;
}
