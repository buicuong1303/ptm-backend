/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  BaseEntity,
  PrimaryGeneratedColumn,
  Column,
  Entity,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
} from 'typeorm';
import { EntityStatus } from 'src/common/constant/entity-status';
import { Conversation } from '../../conversations/entity/conversation.entity';
import { Message } from './message.entity';
import { float } from 'aws-sdk/clients/lightsail';
import { ScheduleMessage } from 'src/modules/schedule-messages/entity/schedule-message.entity';
import { GroupMessage } from '../../group-message/entity/group-message.entity';

@Entity({ name: 'attachments' })
export class Attachment extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ default: '' })
  lastModifiedUserId: string;

  @CreateDateColumn({ type: 'timestamptz' })
  creationTime: Date;

  @Column({ default: '' })
  creationUserId: string;

  @Column({ default: '' }) //* ringcentral id
  exId: string;

  @Column({ default: '' }) //* aws-s3 location
  url: string;

  @Column({ default: '' })
  name: string;

  @Column({ default: '' })
  category: string;

  @Column({ default: '' })
  format: string;

  @Column('numeric', {
    scale: 1,
    nullable: true,
  })
  size: number;
  @Column('numeric', {
    scale: 1,
    nullable: true,
  })
  height: number;

  @Column('numeric', {
    scale: 1,
    nullable: true,
  })
  width: number;

  @Column({ default: '' })
  exSize: string;

  @Column({ default: '' }) //* ringcentral uri
  exUrl: string;

  @UpdateDateColumn({ type: 'timestamptz' })
  lastModifiedTime: Date;

  @Column({ default: EntityStatus.ACTIVE })
  status: EntityStatus;

  @ManyToOne((type) => Message, (message) => message.attachments)
  message: Message;

  @ManyToOne((type) => GroupMessage, (groupMessage) => groupMessage.attachments)
  groupMessage: GroupMessage;
}
