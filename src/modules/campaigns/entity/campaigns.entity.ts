/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  BaseEntity,
  PrimaryGeneratedColumn,
  Column,
  Entity,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  OneToMany,
} from 'typeorm';
import { EntityStatus } from 'src/common/constant/entity-status';
import { CustomerCampaign } from 'src/modules/customer-campaigns/entity/customer-campaigns.entity';
import { ScheduleMessage } from 'src/modules/schedule-messages/entity/schedule-message.entity';
import { Message } from 'src/modules/messages/entity/message.entity';

@Entity({ name: 'campaigns' })
export class Campaign extends BaseEntity {
  @Column()
  name: string;

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

  @OneToOne(
    (type) => CustomerCampaign,
    (customerCampaign) => customerCampaign.campaign,
  )
  customersOfCampaign: CustomerCampaign[];

  @OneToMany(
    (type) => ScheduleMessage,
    (scheduleMessage) => scheduleMessage.campaign,
  )
  scheduleMessages: ScheduleMessage[];

  @OneToMany((type) => Message, (message) => message.campaign)
  messages: Message[];
}
