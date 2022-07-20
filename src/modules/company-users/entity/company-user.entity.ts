import { EntityStatus } from 'src/common/constant/entity-status';
import { Company } from 'src/modules/companies/entity/company.entity';
import { NotificationCreator } from 'src/modules/notifications/entity/notification-creator.entity';
import { NotificationReceiver } from 'src/modules/notifications/entity/notification-receiver.entity';
import { Participant } from 'src/modules/participants/entity/participant.entity';
import { User } from 'src/modules/users/entity/user.entity';
import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'company_users' })
export class CompanyUser extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

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

  @ManyToOne(() => Company, (company) => company.usersOfCompany)
  company: Company;

  @ManyToOne(() => User, (user) => user.companiesOfUser)
  user: User;

  @OneToMany(() => Participant, (participant) => participant.companyUser)
  participants: Participant[];

  @OneToMany(
    (type) => NotificationCreator,
    (notificationCreator) => notificationCreator.creator,
  )
  notificationOfCreators: NotificationCreator[];
}
