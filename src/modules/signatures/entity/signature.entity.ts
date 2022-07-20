/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  BaseEntity,
  PrimaryGeneratedColumn,
  Column,
  Entity,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { EntityStatus } from 'src/common/constant/entity-status';
import { ScheduleSignature } from 'src/modules/schedule-messages/entity/schedule-signature.entity';
import { Company } from 'src/modules/companies/entity/company.entity';

@Entity({ name: 'signatures' })
export class Signature extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ default: '' })
  name: string;

  @Column({ default: '' })
  value: string;

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

  @OneToMany(
    (type) => ScheduleSignature,
    (scheduleSignature) => scheduleSignature.signature,
  )
  scheduleSignatureOfSignature: ScheduleSignature[];

  @OneToMany((type) => Company, (company) => company.signature)
  companySignatureOfSignature: Company[];
}
