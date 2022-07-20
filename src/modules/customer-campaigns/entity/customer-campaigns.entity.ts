/* eslint-disable @typescript-eslint/no-unused-vars */
import { EntityStatus } from 'src/common/constant/entity-status';
import { Campaign } from 'src/modules/campaigns/entity/campaigns.entity';
import { Customer } from 'src/modules/customers/entity/customer.entity';
import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'customer_campaigns' })
export class CustomerCampaign extends BaseEntity {
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

  @ManyToOne((type) => Campaign, (campaign) => campaign.customersOfCampaign)
  campaign: Campaign;

  @ManyToOne((type) => Customer, (customer) => customer.campaignsOfCustomer)
  customer: Customer;
}
