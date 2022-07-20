import { EntityStatus } from 'src/common/constant/entity-status';

export class CreateCompanyCustomerDto {
  status: EntityStatus;
  companyId: string;
}
