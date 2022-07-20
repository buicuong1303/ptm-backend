import { LogActivityQueueProducer } from './log-activity-queue.producer';
import { Injectable } from '@nestjs/common';
import { LogActivity } from 'src/modules/log-activities/entity/log-activities.entity';

@Injectable()
export class LogActivityQueueService {
  constructor(private readonly logActivityProducer: LogActivityQueueProducer) {}

  async assignLabelActivity(data: LogActivity): Promise<any> {
    return await this.logActivityProducer.assignLabelActivity(data);
  }

  async editClientActivity(data: LogActivity): Promise<any> {
    return await this.logActivityProducer.editClientActivity(data);
  }

  async updateConversationActivity(data: LogActivity): Promise<any> {
    return await this.logActivityProducer.updateConversationActivity(data);
  }

  async updateUnreadMessageActivity(data: LogActivity): Promise<any> {
    return await this.logActivityProducer.updateUnreadMessageActivity(data);
  }
}
