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
  DeleteDateColumn,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { EntityStatus } from 'src/common/constant/entity-status';
import { Signature } from 'src/modules/signatures/entity/signature.entity';
import { CompanyCustomer } from 'src/modules/company-customers/entity/company-customer.entity';
import { CompanyUser } from 'src/modules/company-users/entity/company-user.entity';
import { NotificationReceiver } from 'src/modules/notifications/entity/notification-receiver.entity';
import { ScheduleMessage } from 'src/modules/schedule-messages/entity/schedule-message.entity';
import { Label } from 'src/modules/labels/entity/label.entity';
import { CompanyLabel } from 'src/modules/company-labels/entity/company-label.entity';
// import { BulkSignature } from 'src/modules/bulk-messages/entity/bulk-signature.entity';
// import { ScheduleSignature } from 'src/modules/schedule-messages/entity/schedule-signature.entity';

@Entity({ name: 'companies' })
export class Company extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ unique: false })
  code: string;

  @Column({ unique: false })
  phone: string;

  @Column({ nullable: true })
  description: string;

  @Column({ nullable: true })
  server: string;

  @Column({ nullable: true })
  clientId: string;

  @Column({ nullable: true })
  clientSecret: string;

  @Column({ nullable: true })
  username: string;

  @Column({ nullable: true })
  password: string;

  @Column({ default: '' })
  extension: string;

  @Column({ nullable: true })
  dlrAddress: string;

  @Column({ nullable: true })
  dlrMTT: string;

  @Column({ default: 'pending' })
  appStatus: string;

  @Column({ nullable: true })
  appError: string;

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
    (type) => Signature,
    (signature) => signature.companySignatureOfSignature,
  )
  signature;
  @OneToMany(
    (type) => CompanyCustomer,
    (companyCustomer) => companyCustomer.company,
  )
  customersOfCompany: CompanyCustomer[];

  @OneToMany((type) => CompanyUser, (companyUser) => companyUser.company)
  usersOfCompany: CompanyUser[];
  @OneToMany(
    (type) => NotificationReceiver,
    (notificationReceiver) => notificationReceiver.company,
  )
  notificationOfCompanies: NotificationReceiver[];

  @OneToMany(
    (type) => ScheduleMessage,
    (scheduleMessage) => scheduleMessage.attachmentUrls,
  )
  scheduleMessages: ScheduleMessage[];

  @OneToMany((type) => CompanyLabel, (companyLabel) => companyLabel.company)
  labelsOfCompany: CompanyCustomer[];
}
