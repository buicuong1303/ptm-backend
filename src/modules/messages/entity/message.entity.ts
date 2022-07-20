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
  OneToOne,
  JoinTable,
  JoinColumn,
  Generated,
  Index,
  BeforeInsert,
  BeforeUpdate,
} from 'typeorm';
import { EntityStatus } from 'src/common/constant/entity-status';
import { User } from 'src/modules/users/entity/user.entity';
import { Conversation } from '../../conversations/entity/conversation.entity';
import { InternalStatus } from 'src/common/constant/internal-status';
import { ExternalStatus } from 'src/common/constant/external-status';
import { Attachment } from './attachment.entity';
import { MessageMode } from 'src/common/constant/message-mode';
import { Call } from './call.entity';
import { Transform } from 'class-transformer';
import { SensitiveDetect } from 'src/modules/sensitive-detects/entity/sensitive-detects.entity';
import { Campaign } from 'src/modules/campaigns/entity/campaigns.entity';

@Entity({ name: 'messages' })
export class Message extends BaseEntity {
  //* general
  @ManyToOne((type) => User, (user) => user.createMessages)
  @JoinColumn({ name: 'creationUserId' })
  creationUserId: User;

  @ManyToOne((type) => User, (user) => user.updateMessages)
  @JoinColumn({ name: 'lastModifiedUserId' })
  lastModifiedUserId: User;

  @Column({ default: MessageMode.NORMAL })
  mode: MessageMode;

  @Column()
  direction: string;

  @Column({ default: '' })
  text: string;

  @Column({ default: '' })
  companyCode: string;

  @Column({ default: false })
  isHaveAttachment: boolean;

  @Column({ default: false })
  isPolling: boolean;

  //* internal
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({ type: 'timestamptz' })
  creationTime: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  lastModifiedTime: Date;

  @Column({ default: '' })
  messageStatus: InternalStatus;

  //* external
  @Column({ default: '' })
  exMessageStatus: ExternalStatus;

  @Column({ default: null, nullable: true })
  @Index(['exId', 'companyCode'], {
    unique: true,
    where: "'exId' IS NOT NULL",
  })
  @Transform((value) => (value !== null ? value : ''))
  exId: string;

  @Column({ default: 'text' })
  type: string;

  @Column({ type: 'timestamptz', nullable: true })
  exCreationTime: Date;

  @Column({ type: 'timestamptz', nullable: true })
  exLastModifiedTime: Date;

  @Column({ default: '' })
  status: EntityStatus;

  @ManyToOne((type) => Conversation, (conversation) => conversation.messages)
  conversation: Conversation;

  @OneToMany((type) => Attachment, (attachment) => attachment.message)
  attachments: Attachment[];

  @OneToOne(() => Conversation, (conversation) => conversation.lastMessage)
  lastMessageOfConversation;

  @OneToOne(() => SensitiveDetect, (conversation) => conversation.message)
  sensitiveMessage;

  @OneToOne((type) => Call, (call) => call.message)
  @JoinColumn()
  call: Call;

  @Column()
  @Generated('increment')
  index: number;

  @ManyToOne((type) => Campaign, (campaign) => campaign.messages)
  campaign: Campaign;

  @BeforeInsert()
  @BeforeUpdate()
  transformIsPolling() {
    this.isPolling = this.isPolling ? this.isPolling : false;
  }
}
