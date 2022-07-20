import { ExternalStatus } from './../../../common/constant/external-status';
/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  BaseEntity,
  PrimaryGeneratedColumn,
  Column,
  Entity,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { EntityStatus } from 'src/common/constant/entity-status';
import { Attachment } from '../../messages/entity/attachment.entity';
import { Transform } from 'class-transformer';
import { MessageDirection } from '../../../common/constant/message-direction';

@Entity({ name: 'group_messages' })
export class GroupMessage extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ default: '' })
  creationUserId: string;

  @CreateDateColumn({ type: 'timestamptz' })
  creationTime: Date;

  @Column({ default: '' })
  lastModifiedUserId: string;

  @UpdateDateColumn({ type: 'timestamptz' })
  lastModifiedTime: Date;

  @Column({ default: EntityStatus.ACTIVE })
  status: EntityStatus;

  @Column()
  from: string;

  @Column()
  to: string;

  @Column()
  nonTargets: string;

  @Column({ default: '' })
  text: string;

  @OneToMany((type) => Attachment, (attachment) => attachment.groupMessage)
  attachments: Attachment[];

  @Column({ default: '' })
  direction: MessageDirection;

  @Column({ default: null, nullable: true })
  @Index(['exId', 'companyCode'], {
    unique: true,
    where: "'exId' IS NOT NULL",
  })
  @Transform((value) => (value !== null ? value : ''))
  exId: string;

  @Column({ type: 'timestamptz', nullable: true })
  exCreationTime: Date;

  @Column({ type: 'timestamptz', nullable: true })
  exLastModifiedTime: Date;

  @Column({ default: '' })
  exStatus: ExternalStatus;
}
