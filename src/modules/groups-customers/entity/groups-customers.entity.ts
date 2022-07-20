/* eslint-disable @typescript-eslint/no-unused-vars */
import { EntityStatus } from 'src/common/constant/entity-status';
import { Customer } from 'src/modules/customers/entity/customer.entity';
import { Group } from 'src/modules/groups/entity/group.entity';
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

@Entity({ name: 'groups_customers' })
export class GroupCustomer extends BaseEntity {
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

  @ManyToOne((type) => Group, (group) => group.groupsOfCustomer)
  group: Group;

  @ManyToOne((type) => Customer, (customer) => customer.groupsOfCustomer)
  customer: Customer;
}
