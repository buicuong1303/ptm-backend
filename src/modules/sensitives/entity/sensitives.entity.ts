/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  BaseEntity,
  PrimaryGeneratedColumn,
  Column,
  Entity,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { EntityStatus } from 'src/common/constant/entity-status';
import { MessageDirection } from 'src/common/constant/message-direction';

@Entity({ name: 'sensitives' })
export class Sensitive extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({ type: 'timestamptz' })
  creationTime: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  lastModifiedTime: Date;

  @Column({ default: '' })
  creationUserId: string;

  @Column({ default: '' })
  lastModifiedUserId: string;

  @Column({ default: '' })
  sensitiveKey: string;

  @Column({ default: '' })
  type: string;

  @Column({ default: false })
  isTrained: boolean;

  @Column({ nullable: true })
  direction: MessageDirection;

  @Column({ default: EntityStatus.ACTIVE })
  status: EntityStatus;
}
