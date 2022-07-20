/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  BaseEntity,
  PrimaryGeneratedColumn,
  Column,
  Entity,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
} from 'typeorm';
import { EntityStatus } from 'src/common/constant/entity-status';
import { ScheduleMessageStatus } from 'src/common/constant/schedule-message-status';
import { MessageSet } from './message-set.entity';
import { ScheduleSignature } from 'src/modules/schedule-messages/entity/schedule-signature.entity';
import { Company } from 'src/modules/companies/entity/company.entity';
import { Campaign } from 'src/modules/campaigns/entity/campaigns.entity';
@Entity({ name: 'schedule_messages' })
export class ScheduleMessage extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ default: ScheduleMessageStatus.WAITING })
  sendStatus: ScheduleMessageStatus;

  @Column({ default: '' })
  content: string;

  @Column({ default: '' })
  cronExpression: string;

  @Column({ default: false })
  isCronExpression: boolean;

  @Column({ nullable: true })
  dateTime: Date;

  @Column({ default: false })
  isIssue: boolean;

  @Column({ nullable: true })
  canRetry: boolean;

  @Column('jsonb', { nullable: false })
  customerUrl: JSON;

  @Column('jsonb', { default: [] })
  attachmentUrls: JSON[];

  @Column('jsonb', { nullable: true })
  customFields: JSON[];

  @Column({ default: '' })
  creationUserId: string;

  @Column({ default: '' })
  lastModifiedUserId: string;

  @Column('simple-array', { default: '' })
  messagesFailed: string[];

  @CreateDateColumn({ type: 'timestamptz' })
  creationTime: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  lastModifiedTime: Date;

  @Column({ default: EntityStatus.ACTIVE })
  status: EntityStatus;

  @OneToMany((type) => MessageSet, (messageSet) => messageSet.scheduleMessage)
  messageSetOfScheduleMessage: MessageSet[];

  //* true when have been retry schedule
  @Column({ default: false })
  isBackup: boolean;

  @Column({ default: null, nullable: true })
  backupScheduleMessageId: string;

  @OneToMany(
    (type) => ScheduleSignature,
    (scheduleSignature) => scheduleSignature.scheduleMessage,
  )
  scheduleSignatureOfScheduleMessage: ScheduleSignature[];
  @ManyToOne((type) => Company, (company) => company.scheduleMessages)
  company: Company;

  @ManyToOne((type) => Campaign, (campaign) => campaign.scheduleMessages)
  campaign: Campaign;
}
