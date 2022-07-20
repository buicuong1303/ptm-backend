/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  BaseEntity,
  PrimaryGeneratedColumn,
  Column,
  Entity,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToOne,
} from 'typeorm';
import { EntityStatus } from 'src/common/constant/entity-status';
import { Message } from 'src/modules/messages/entity/message.entity';
import { BulkSetStatus } from 'src/common/constant/bulk-set-status';
import { Customer } from 'src/modules/customers/entity/customer.entity';
import { ScheduleMessage } from './schedule-message.entity';
import { MessageSetStatus } from 'src/common/constant/message-set-status';

@Entity({ name: 'message_sets' })
export class MessageSet extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ default: '' })
  messageSetStatus: MessageSetStatus;

  @Column({ type: 'jsonb' })
  customFields: JSON;

  @Column({ default: '' })
  content: string;

  @Column()
  companyPhone: string;

  @Column()
  customerPhone: string;

  @Column('simple-array', { default: [] })
  attachmentUrls: string[];

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

  @ManyToOne(
    (type) => ScheduleMessage,
    (ScheduleMessage) => ScheduleMessage.messageSetOfScheduleMessage,
  )
  scheduleMessage: ScheduleMessage;

  @ManyToOne((type) => Customer, (customer) => customer.messageSets)
  customer: Customer;

  @OneToOne((type) => Message)
  @JoinColumn()
  message: Message;
}
