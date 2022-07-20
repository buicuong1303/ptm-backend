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
import { Company } from 'src/modules/companies/entity/company.entity';
@Entity({ name: 'notification_receivers' })
export class NotificationReceiver extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({ type: 'timestamptz' })
  creationTime: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  lastModifiedTime: Date;

  @Column({ default: EntityStatus.ACTIVE })
  status: EntityStatus;

  @Column({ default: ReadStatus.UNREAD })
  readStatus: string;

  @ManyToOne(
    (type) => NotificationTemplate,
    (notificationTemplate) => notificationTemplate.notificationReceivers,
    { nullable: false },
  )
  notificationTemplate: NotificationTemplate;

  @ManyToOne((type) => User, (user) => user.notificationOfReceivers, {
    nullable: false,
  })
  @JoinColumn({ name: 'receiverId' })
  receiver: User;

  @ManyToOne((type) => Company, (company) => company.notificationOfCompanies, {
    nullable: false,
  })
  company: Company;
}
