/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  BaseEntity,
  PrimaryGeneratedColumn,
  Column,
  Entity,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Unique,
} from 'typeorm';
import { EntityStatus } from 'src/common/constant/entity-status';
import { CompanyCustomer } from 'src/modules/company-customers/entity/company-customer.entity';
import { GroupCustomer } from 'src/modules/groups-customers/entity/groups-customers.entity';
import { MessageSet } from 'src/modules/schedule-messages/entity/message-set.entity';
import { CustomerCampaign } from 'src/modules/customer-campaigns/entity/customer-campaigns.entity';

@Unique(['status', 'phoneNumber'])
@Entity({ name: 'customers' })
export class Customer extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ default: '' })
  fullName: string;

  @Column({ default: '', unique: false })
  phoneNumber: string;

  @Column({ nullable: true })
  emailAddress: string;

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

  @OneToMany((type) => MessageSet, (messageSet) => messageSet.customer)
  messageSets: MessageSet[];

  @OneToMany(
    (type) => CompanyCustomer,
    (companyCustomer) => companyCustomer.customer,
  )
  companiesOfCustomer: CompanyCustomer[];

  @OneToMany((type) => GroupCustomer, (groupCustomer) => groupCustomer.customer)
  groupsOfCustomer: GroupCustomer[];

  @OneToMany(
    (type) => CustomerCampaign,
    (customerCampaign) => customerCampaign.customer,
  )
  campaignsOfCustomer: CustomerCampaign[];
}
