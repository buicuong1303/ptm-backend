import { Repository, EntityRepository } from 'typeorm';
import { CompanyUser } from '../entity/company-user.entity';

@EntityRepository(CompanyUser)
export class CompanyUserRepository extends Repository<CompanyUser> {}
