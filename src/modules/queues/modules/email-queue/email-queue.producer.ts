import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

@Injectable()
export class EmailQueueProducer {
  constructor(
    @InjectQueue('email-queue')
    private readonly emailQueue: Queue,
  ) {}
  async sendConfirmationEmail(data: any) {
    const job = await this.emailQueue.add(
      'send-confirmation-email',
      {
        info: data,
      },
      {
        attempts: 5,
        backoff: 10000,
        removeOnComplete: process.env.NODE_ENV === 'development' ? false : true,
        removeOnFail: false,
      },
    );
    return job;
  }

  async sendResetPasswordEmail(data: any) {
    const jobReset = await this.emailQueue.add(
      'send-reset-password-email',
      {
        info: data,
      },
      {
        attempts: 5,
        backoff: 10000,
        removeOnComplete: process.env.NODE_ENV === 'development' ? false : true,
        removeOnFail: false,
      },
    );
    const delayedJobs = await this.emailQueue.getDelayed();
    const cleanResetPasswordJob = delayedJobs.find(
      (job) =>
        job.name === 'clean-reset-password-email' &&
        job.data.info.userId === data.userId,
    );
    if (cleanResetPasswordJob) {
      cleanResetPasswordJob.remove();
    }
    await this.emailQueue.add(
      'clean-reset-password-email',
      {
        info: data,
      },
      {
        attempts: 5,
        backoff: 10000,
        delay: 1000 * 60,
        removeOnComplete: process.env.NODE_ENV === 'development' ? false : true,
        removeOnFail: false,
      },
    );
    return jobReset;
  }
}
