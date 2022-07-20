import {
  BaseEntity,
  PrimaryGeneratedColumn,
  Column,
  Entity,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Unique,
} from 'typeorm';
import { EntityStatus } from 'src/common/constant/entity-status';
import { EntityName } from 'src/common/constant/entity-name';
import { NotificationTemplate } from './notification-template.entity';

@Entity({ name: 'notification_types' })
@Unique(['entity', 'content'])
export class NotificationType extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({ type: 'timestamptz' })
  creationTime: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  lastModifiedTime: Date;

  @Column({ default: EntityStatus.ACTIVE })
  status: EntityStatus;

  @Column()
  entity: EntityName;

  @Column({ default: '' })
  description: string;

  @Column()
  content: string;

  @OneToMany(
    (type) => NotificationTemplate,
    (notificationTemplate) => notificationTemplate.notificationType,
  )
  notificationTemplates: Notification[];
}
