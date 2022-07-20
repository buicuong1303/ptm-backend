/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  BaseEntity,
  PrimaryGeneratedColumn,
  Column,
  Entity,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  Index,
} from 'typeorm';
import { EntityStatus } from 'src/common/constant/entity-status';
import { Message } from './message.entity';
import { Transform } from 'class-transformer';

@Entity({ name: 'calls' })
export class Call extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  direction: string;

  @Column()
  duration: number;

  @Column({ default: null, nullable: true })
  @Index(['message', 'companyCode'], {
    unique: true,
    where: "'exId' IS NOT NULL",
  })
  @Transform((value) => (value !== null ? value : ''))
  exId: string;

  @Column()
  externalCallStatus: string;

  @Column({ default: '' })
  creationUserId: string;

  @Column({ default: '' })
  lastModifiedUserId: string;

  @CreateDateColumn({ type: 'timestamptz' })
  creationTime: Date;

  @Column({ type: 'timestamptz', nullable: true })
  exCreationTime: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  lastModifiedTime: Date;

  @Column({ default: EntityStatus.ACTIVE })
  status: EntityStatus;

  @OneToOne(() => Message, (message) => message.call)
  message;
}
