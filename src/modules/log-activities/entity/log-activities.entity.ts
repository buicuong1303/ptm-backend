import {
  BaseEntity,
  PrimaryGeneratedColumn,
  Column,
  Entity,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { HttpMethod } from '../enum/http-method.enum';
import { LogType } from '../enum/log-type.enum';
import { EntityStatus } from 'src/common/constant/entity-status';
import { LogEntity } from '../enum/log-entity.enum';
import { LogAction } from '../enum/log-action.enum';

@Entity({ name: 'log_activities' })
export class LogActivity extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  ip: string;

  @Column('uuid')
  userId: string;

  @Column()
  path: string;

  @Column()
  method: HttpMethod;

  @Column({ default: '' })
  message: string;

  @Column()
  logType: LogType;

  @Column()
  logEntity: LogEntity;

  @Column()
  logAction: LogAction;

  @Column({ default: '{}' })
  requestData: string;

  @Column()
  oldData: string;

  @Column()
  newData: string;

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
}
