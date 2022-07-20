import { Repository, EntityRepository } from 'typeorm';
import { CompanyCustomer } from '../entity/company-customer.entity';

@EntityRepository(CompanyCustomer)
export class CompanyCustomerRepository extends Repository<CompanyCustomer> {}
