/* eslint-disable prettier/prettier */
import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { LogActivity } from 'src/modules/log-activities/entity/log-activities.entity';

@Injectable()
export class LogActivityQueueProducer {
  constructor(
    @InjectQueue('log-activity-queue')
    private readonly logActivityQueue: Queue,
  ) {}

  async assignLabelActivity(data: LogActivity) {
    const job = await this.logActivityQueue.add('assign-label-activity', data, {
      attempts: 2,
      backoff: 10000,
      // delay: 5000,
      removeOnComplete: process.env.NODE_ENV === 'development' ? false : true,
      removeOnFail: false,
    });
    return job;
  }

  async editClientActivity(data: LogActivity) {
    const job = await this.logActivityQueue.add('edit-client-activity', data, {
      attempts: 2,
      backoff: 10000,
      // delay: 5000,
      removeOnComplete: process.env.NODE_ENV === 'development' ? false : true,
      removeOnFail: false,
    });
    return job;
  }

  async updateConversationActivity(data: LogActivity) {
    const job = await this.logActivityQueue.add(
      'update-conversation-activity',
      data,
      {
        attempts: 2,
        backoff: 10000,
        // delay: 5000,
        removeOnComplete: process.env.NODE_ENV === 'development' ? false : true,
        removeOnFail: false,
      },
    );
    return job;
  }

  async updateUnreadMessageActivity(data: LogActivity) {
    const job = await this.logActivityQueue.add(
      'update-unread-message-activity',
      data,
      {
        attempts: 2,
        backoff: 10000,
        // delay: 5000,
        removeOnComplete: process.env.NODE_ENV === 'development' ? false : true,
        removeOnFail: false,
      },
    );
    return job;
  }
}
