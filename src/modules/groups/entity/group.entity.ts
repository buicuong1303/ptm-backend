/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  BaseEntity,
  PrimaryGeneratedColumn,
  Column,
  Entity,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { EntityStatus } from 'src/common/constant/entity-status';
import { GroupCustomer } from 'src/modules/groups-customers/entity/groups-customers.entity';

@Entity({ name: 'groups' })
export class Group extends BaseEntity {
  @Column()
  name: string;

  @Column({ default: '' })
  description: string;

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({ type: 'timestamptz' })
  creationTime: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  lastModifiedTime: Date;

  @Column({ default: '' })
  creationUserId: string;

  @Column({ default: '' })
  lastModifiedUserId: string;

  @Column({ default: EntityStatus.ACTIVE })
  status: EntityStatus;

  @OneToMany(
    (type) => GroupCustomer,
    (groupCustomer) => {
      groupCustomer.group;
    },
  )
  groupsOfCustomer: GroupCustomer[];
}
