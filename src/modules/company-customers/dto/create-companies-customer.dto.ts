import { Company } from 'src/modules/companies/entity/company.entity';
import { Customer } from 'src/modules/customers/entity/customer.entity';

export class CreateCompaniesCustomerDto {
  customer: Customer;
  companies: Array<Company>;
}
