import { IsString, MaxLength } from 'class-validator';
import { EntityStatus } from 'src/common/constant/entity-status';

export class CreateGroupDto {
  @IsString()
  @MaxLength(20)
  name: string;

  @IsString()
  @MaxLength(500)
  description: string;

  status: EntityStatus;
}
