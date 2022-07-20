/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  BaseEntity,
  PrimaryGeneratedColumn,
  Column,
  Entity,
  CreateDateColumn,
  OneToMany,
  OneToOne,
  JoinColumn,
  ManyToOne,
} from 'typeorm';
import { EntityStatus } from 'src/common/constant/entity-status';
import { Participant } from '../../participants/entity/participant.entity';
import { Message } from 'src/modules/messages/entity/message.entity';
import { User } from 'src/modules/users/entity/user.entity';
import { CompanyCustomer } from 'src/modules/company-customers/entity/company-customer.entity';

@Entity({ name: 'conversations' })
export class Conversation extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ default: '' })
  name: string;

  @Column({ default: '' })
  creationUserId: string;

  @OneToOne((type) => Message, (message) => message.lastMessageOfConversation)
  @JoinColumn()
  lastMessage: Message;

  @ManyToOne((type) => User, (user) => user.lastUserOfConversation)
  @JoinColumn()
  lastUser: User;

  @Column({ default: '' })
  lastModifiedUserId: string;

  @CreateDateColumn({ type: 'timestamptz' })
  creationTime: Date;

  @Column({ type: 'timestamptz', nullable: true })
  lastModifiedTime: Date;

  @Column({ default: EntityStatus.ACTIVE })
  status: EntityStatus;

  @Column({ default: false })
  isCompleted: boolean;

  @Column({ default: '' })
  newOrExisting: string;

  @OneToMany((type) => Participant, (participant) => participant.conversation)
  participants: Participant[];

  @OneToMany((type) => Message, (message) => message.conversation)
  messages: Message[];

  @Column('text', { array: true, nullable: true })
  labels: string[];

  @OneToOne(
    (type) => CompanyCustomer,
    (companyCustomer) => companyCustomer.conversation,
  )
  companyCustomer: CompanyCustomer;
}
