/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  Processor,
  Process,
  OnQueueActive,
  OnQueueCompleted,
  OnQueueFailed,
} from '@nestjs/bull';
import { Job } from 'bull';
import { LogActivity } from 'src/modules/log-activities/entity/log-activities.entity';
import { LogActivitiesService } from 'src/modules/log-activities/log-activities.service';

@Processor('log-activity-queue')
export class LogActivityQueueConsumer {
  constructor(private readonly logActivityService: LogActivitiesService) {}

  @Process('assign-label-activity')
  async assignLabelActivity(job: Job<LogActivity>) {
    await this.logActivityService.writeLog(job.data);
  }

  @Process('edit-client-activity')
  async editClientActivity(job: Job<LogActivity>) {
    await this.logActivityService.writeLog(job.data);
  }

  @Process('update-conversation-activity')
  async updateConversationActivity(job: Job<LogActivity>) {
    await this.logActivityService.writeLog(job.data);
  }

  @Process('update-unread-message-activity')
  async updateUnreadMessageActivity(job: Job<LogActivity>) {
    await this.logActivityService.writeLog(job.data);
  }
}
