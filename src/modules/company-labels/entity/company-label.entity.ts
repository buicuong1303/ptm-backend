/* eslint-disable @typescript-eslint/no-unused-vars */
import { EntityStatus } from 'src/common/constant/entity-status';
import { Company } from 'src/modules/companies/entity/company.entity';
import { Label } from 'src/modules/labels/entity/label.entity';
import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'company_labels' })
export class CompanyLabel extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ default: '' })
  creationUserId: string;

  @Column({ default: '' })
  lastModifiedUserId: string;

  @CreateDateColumn({ type: 'timestamptz' })
  creationTime: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  lastModifiedTime: Date;

  @Column({ default: EntityStatus.ACTIVE })
  status: EntityStatus;

  @ManyToOne((type) => Company, (company) => company.labelsOfCompany)
  company: Company;

  @ManyToOne((type) => Label, (label) => label.companiesOfLabel)
  label: Label;
}
