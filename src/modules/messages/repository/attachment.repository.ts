import { Repository, EntityRepository } from 'typeorm';
import { Attachment } from '../entity/attachment.entity';

@EntityRepository(Attachment)
export class AttachmentRepository extends Repository<Attachment> {}
