/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  BaseEntity,
  PrimaryGeneratedColumn,
  Column,
  Entity,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  OneToOne,
} from 'typeorm';
import { EntityStatus } from 'src/common/constant/entity-status';
import { OnlineStatus } from 'src/common/constant/online-status';
import { Message } from 'src/modules/messages/entity/message.entity';
import { Exclude } from 'class-transformer';
import { Conversation } from 'src/modules/conversations/entity/conversation.entity';
import { CompanyUser } from 'src/modules/company-users/entity/company-user.entity';
import { NotificationReceiver } from 'src/modules/notifications/entity/notification-receiver.entity';
import { NotificationCreator } from 'src/modules/notifications/entity/notification-creator.entity';
import { bool } from 'aws-sdk/clients/signer';

@Entity({ name: 'users' })
export class User extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ default: '' })
  avatar: string;

  @Column({ default: '' })
  firstName: string;

  @Column({ default: '' })
  lastName: string;

  @Column({ nullable: true, unique: true })
  email: string;

  @Column({ default: false })
  allowDesktopNotification: bool;

  @Column({ default: false })
  allowSoundNotification: bool;

  @Column({ default: '' })
  gender: string;

  @Column({ unique: true })
  username: string;

  @Column({ nullable: true, select: false })
  @Exclude()
  password: string;

  @Column({ nullable: true, select: false })
  @Exclude()
  initialPassword: string;

  @Column({ default: OnlineStatus.OFFLINE })
  onlineStatus: OnlineStatus;

  @CreateDateColumn({ type: 'timestamptz' })
  lastActivity: Date;

  @Column({ default: '' })
  creationUserId: string;

  @Column({ default: '' })
  lastModifiedUserId: string;

  @CreateDateColumn({ type: 'timestamptz' })
  creationTime: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  lastModifiedTime: Date;

  @Column({ default: EntityStatus.INACTIVE })
  status: EntityStatus;

  @OneToMany((type) => Message, (message) => message.creationUserId)
  createMessages: Message[];

  @OneToMany((type) => Message, (message) => message.lastModifiedUserId)
  updateMessages: Message[];

  @OneToMany(() => Conversation, (conversation) => conversation.lastUser)
  lastUserOfConversation: User[];

  @OneToMany((type) => CompanyUser, (companyUser) => companyUser.user)
  companiesOfUser: CompanyUser[];

  @OneToMany(
    (type) => NotificationReceiver,
    (notificationReceiver) => notificationReceiver.receiver,
  )
  notificationOfReceivers: NotificationReceiver[];
  @OneToMany(
    (type) => NotificationCreator,
    (notificationReceiver) => notificationReceiver.creator,
  )
  notificationOfCreators: NotificationCreator[];
}
