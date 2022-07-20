/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  Processor,
  Process,
  OnQueueActive,
  OnQueueCompleted,
  OnQueueFailed,
} from '@nestjs/bull';
import { Job } from 'bull';
import { EmailQueueService } from './email-queue.service';
import { MailerService } from '@nestjs-modules/mailer';

import { UserRepository } from 'src/modules/users/repository/user.repository';
import { InjectRepository } from '@nestjs/typeorm';

@Processor('email-queue')
export class EmailQueueConsumer {
  constructor(
    private readonly mailerService: MailerService,
    @InjectRepository(UserRepository)
    private readonly userRepository: UserRepository,
  ) {}

  @Process('send-confirmation-email')
  async sendConfirmationEmail(job: Job<any>) {
    const { username, token, email, subject, template } = job.data.info;
    this.mailerService
      .sendMail({
        to: email, // list of receivers
        from: '"noreply@phpbroker.com" <modules@nestjs.com>', // sender address
        subject: `${subject} ✔`, // Subject line
        context: {
          // Data to be sent to template engine.
          username,
          token,
          host: process.env.HOST,
        },
        template: __dirname + `/templates/${template}`,
      })
      .then(() => {
        console.log('sent...' + email);
      })
      .catch((error) => {
        console.log(error);
      });
  }
  @Process('send-reset-password-email')
  async sendResetPasswordEmail(job: Job<any>) {
    const { username, token, userId, email, subject, template } = job.data.info;
    this.mailerService
      .sendMail({
        to: email, // list of receivers
        from: '"noreply@phpbroker.com" <modules@nestjs.com>', // sender address
        subject: `${subject} ✔`, // Subject line
        context: {
          // Data to be sent to template engine.
          username,
          token,
          userId,
          host: process.env.HOST,
        },
        template: __dirname + `/templates/${template}`,
      })
      .then(() => {
        console.log('sent...' + email);
      })
      .catch((error) => {
        console.log(error);
      });
  }
  // @Process('clean-reset-password-email')
  // async cleanResetPasswordEmail(job: Job<any>) {
  //   const { userId: id } = job.data.info;
  //   const infoUser = await this.userRepository.findOne({ id });
  //   if (infoUser) {
  //     infoUser.resetPasswordToken = null;
  //     await infoUser.save();
  //   }
  // }
}
