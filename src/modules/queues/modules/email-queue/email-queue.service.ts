import { EmailQueueProducer } from './email-queue.producer';
import { Injectable } from '@nestjs/common';

@Injectable()
export class EmailQueueService {
  constructor(private readonly emailProducer: EmailQueueProducer) {}
  async sendConfirmationEmail(data) {
    return this.emailProducer.sendConfirmationEmail(data);
  }

  async sendResetPasswordEmail(data) {
    return this.emailProducer.sendResetPasswordEmail(data);
  }
}
