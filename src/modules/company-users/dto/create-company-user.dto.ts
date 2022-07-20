import { Company } from 'src/modules/companies/entity/company.entity';
import { User } from 'src/modules/users/entity/user.entity';

export class CreateCompanyUserDto {
  user: User;
  companies: Array<Company>;
}
