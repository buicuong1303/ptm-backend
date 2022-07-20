/* eslint-disable @typescript-eslint/no-unused-vars */
import { EntityStatus } from 'src/common/constant/entity-status';
import { Company } from 'src/modules/companies/entity/company.entity';
import { Conversation } from 'src/modules/conversations/entity/conversation.entity';
import { Customer } from 'src/modules/customers/entity/customer.entity';
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

@Entity({ name: 'company_customers' })
export class CompanyCustomer extends BaseEntity {
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

  @ManyToOne((type) => Company, (company) => company.customersOfCompany)
  company: Company;

  @ManyToOne((type) => Customer, (customer) => customer.companiesOfCustomer)
  customer: Customer;

  @OneToOne((type) => Conversation)
  @JoinColumn()
  conversation: Conversation;
}
