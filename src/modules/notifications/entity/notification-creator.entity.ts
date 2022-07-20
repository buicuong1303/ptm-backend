import {
  BaseEntity,
  PrimaryGeneratedColumn,
  Column,
  Entity,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { EntityStatus } from 'src/common/constant/entity-status';
import { ReadStatus } from 'src/common/constant/read-status';
import { User } from 'src/modules/users/entity/user.entity';
import { NotificationTemplate } from 'src/modules/notifications/entity/notification-template.entity';
import { CompanyUser } from 'src/modules/company-users/entity/company-user.entity';
@Entity({ name: 'notification_creators' })
export class NotificationCreator extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({ type: 'timestamptz' })
  creationTime: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  lastModifiedTime: Date;

  @Column({ default: EntityStatus.ACTIVE })
  status: EntityStatus;

  @ManyToOne(
    (type) => NotificationTemplate,
    (notificationTemplate) => notificationTemplate.notificationCreators,
    { nullable: false },
  )
  notificationTemplate: NotificationTemplate;

  @ManyToOne((type) => User, (user) => user.notificationOfCreators, {
    nullable: false,
  })
  @JoinColumn({ name: 'creatorId' })
  creator: User;
}
