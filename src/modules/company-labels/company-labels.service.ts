import { Injectable } from '@nestjs/common';
import { getManager } from 'typeorm';
import { EntityStatus } from '../../common/constant/entity-status';
import { Company } from '../companies/entity/company.entity';

@Injectable()
export class CompanyLabelsService {
  public async getLabelsOfCompany(companyId: string) {
    const labels = await getManager()
      .createQueryBuilder(Company, 'company')
      .leftJoin('company.labelsOfCompany', 'labelsOfCompany')
      .leftJoin('labelsOfCompany.label', 'label')
      .andWhere('company.id = :companyId', { companyId: companyId })
      .andWhere('labelsOfCompany.status = :status', {
        status: EntityStatus.ACTIVE,
      })
      .andWhere('label.status = :status', { status: EntityStatus.ACTIVE })
      .andWhere('company.status = :status', { status: EntityStatus.ACTIVE })
      .select([
        'company.id',
        'company.code',
        'label.id',
        'label.title',
        'label.bgColor',
      ])
      .getMany();

    return labels;
  }
}
