import { EntityStatus } from 'aws-sdk/clients/machinelearning';
import { EntityName } from 'src/common/constant/entity-name';

export class CreateNotificationTypeDto {
  content: string;
  description: string;
  entity: EntityName;
  status: EntityStatus;
}
