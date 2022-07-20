import { EntityStatus } from 'src/common/constant/entity-status';

export class CreateCampaignCustomerDto {
  status: EntityStatus;
  value: string;
}
