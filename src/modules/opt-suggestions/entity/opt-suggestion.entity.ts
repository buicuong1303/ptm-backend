import {
  BaseEntity,
  PrimaryGeneratedColumn,
  Column,
  Entity,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { EntityStatus } from 'src/common/constant/entity-status';
import { OptStatus } from 'src/common/constant/opt-status';

@Entity({ name: 'opt_suggestions' })
export class OptSuggestion extends BaseEntity {
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

  @Column()
  optStatus: OptStatus;

  @Column({ nullable: true })
  suggestionStatus: boolean;

  @Column({ default: '' })
  reason: string;

  @Column({ default: '' })
  campaignId: string;

  @Column('uuid', { nullable: true })
  messageId: string;

  @Column('uuid')
  customerId: string;

  @Column('decimal', { precision: 5, scale: 2, nullable: true })
  rate: number;

  @Column({ default: false })
  isTrained: boolean;
}
