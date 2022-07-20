import { EntityStatus } from 'src/common/constant/entity-status';

export class UpdateCampaignCustomerDto {
  status: EntityStatus;
  value: string;
}
