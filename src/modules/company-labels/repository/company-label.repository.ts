import { Repository, EntityRepository } from 'typeorm';
import { CompanyLabel } from '../entity/company-label.entity';

@EntityRepository(CompanyLabel)
export class CompanyLabelRepository extends Repository<CompanyLabel> {}
