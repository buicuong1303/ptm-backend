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
import { Signature } from 'src/modules/signatures/entity/signature.entity';
import { ScheduleMessage } from './schedule-message.entity';

@Entity({ name: 'schedule_signature_messages' })
export class ScheduleSignature extends BaseEntity {
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

  @ManyToOne(
    (type) => ScheduleMessage,
    (schedule) => schedule.scheduleSignatureOfScheduleMessage,
  )
  scheduleMessage: ScheduleMessage;

  @ManyToOne(
    (type) => Signature,
    (signature) => signature.scheduleSignatureOfSignature,
  )
  signature: Signature;
}
