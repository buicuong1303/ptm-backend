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
import { ReadStatus } from 'src/common/constant/read-status';
import { Conversation } from '../../conversations/entity/conversation.entity';
import { CompanyUser } from 'src/modules/company-users/entity/company-user.entity';

@Entity({ name: 'participants' })
export class Participant extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  readStatus: ReadStatus;

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

  @Column({ default: 0 })
  umn: number;

  @ManyToOne(
    (type) => Conversation,
    (conversation) => conversation.participants,
  )
  conversation: Conversation;

  @ManyToOne((type) => CompanyUser, (companyUser) => companyUser.participants)
  companyUser: CompanyUser;
}
