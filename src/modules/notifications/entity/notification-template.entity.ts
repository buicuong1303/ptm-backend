import {
  BaseEntity,
  PrimaryGeneratedColumn,
  Column,
  Entity,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  Unique,
} from 'typeorm';
import { EntityStatus } from 'src/common/constant/entity-status';
import { NotificationType } from './notification-type.entity';
import { NotificationReceiver } from './notification-receiver.entity';
import { NotificationCreator } from './notification-creator.entity';

@Entity({ name: 'notification_templates' })
@Unique(['entityId', 'notificationType'])
export class NotificationTemplate extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({ type: 'timestamptz' })
  creationTime: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  lastModifiedTime: Date;

  @Column({ default: EntityStatus.ACTIVE })
  status: EntityStatus;

  @Column('uuid')
  entityId: string;

  @ManyToOne(
    (type) => NotificationType,
    (notificationType) => notificationType.notificationTemplates,
  )
  notificationType: NotificationType;

  @OneToMany(
    (type) => NotificationReceiver,
    (notificationReceiver) => notificationReceiver.notificationTemplate,
  )
  notificationReceivers: NotificationReceiver[];
  @OneToMany(
    (type) => NotificationCreator,
    (notificationCreator) => notificationCreator.notificationTemplate,
  )
  notificationCreators: [];
}
