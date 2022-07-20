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
import { CompanyLabel } from 'src/modules/company-labels/entity/company-label.entity';

@Entity({ name: 'labels' })
export class Label extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column()
  bgColor: string;

  @Column({ default: '' })
  description: string;

  @CreateDateColumn({ type: 'timestamptz' })
  creationTime: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  lastModifiedTime: Date;

  @Column({ default: '' })
  creationUserId: string;

  @Column({ default: '' })
  lastModifiedUserId: string;

  @Column({ default: EntityStatus.ACTIVE })
  status: EntityStatus;

  @OneToMany(() => CompanyLabel, (companyLabel) => companyLabel.label)
  companiesOfLabel: CompanyLabel[];
}
