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

@Entity({ name: 'sensitive_detects' })
export class SensitiveDetect extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ default: '' })
  creationUserId: string;

  @Column({ default: '' })
  lastModifiedUserId: string;

  @CreateDateColumn({ type: 'timestamptz' })
  creationTime: Date;

  @Column({ type: 'timestamptz', nullable: true })
  lastModifiedTime: Date;

  @Column({ default: EntityStatus.ACTIVE })
  status: EntityStatus;

  @Column({ default: '' })
  reason: string;

  @OneToOne((type) => Message, (message) => message.sensitiveMessage)
  @JoinColumn()
  message: Message;
}
