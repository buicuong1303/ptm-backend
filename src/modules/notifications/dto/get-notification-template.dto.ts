import { IsUUID } from 'class-validator';
import { Company } from 'src/modules/companies/entity/company.entity';
import { Customer } from 'src/modules/customers/entity/customer.entity';
import { User } from 'src/modules/users/entity/user.entity';

export class NotificationTemplateDto {
  @IsUUID()
  notificationTypeId: string;

  @IsUUID()
  entityId: string;

  entity?: any;

  creator?: User;

  client?: Customer;

  company: Company;
}
