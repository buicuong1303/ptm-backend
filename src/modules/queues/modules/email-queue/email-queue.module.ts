import { EmailQueueConsumer } from './email-queue.consumer';
import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { EmailQueueService } from './email-queue.service';
import { EmailQueueProducer } from './email-queue.producer';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserRepository } from 'src/modules/users/repository/user.repository';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      //* for current scope
      UserRepository,
    ]),
    BullModule.registerQueue({
      name: 'email-queue',
    }),
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: () => {
        return {
          transport: `smtps://${process.env.MAIL_USR}:${process.env.MAIL_PWD}@smtp.gmail.com`,
          template: {
            dir: __dirname + '/templates',
            adapter: new HandlebarsAdapter(),
            options: {
              strict: true,
            },
          },
        };
      },
    }),
  ],
  providers: [EmailQueueProducer, EmailQueueConsumer, EmailQueueService],
  exports: [BullModule, EmailQueueService],
})
export class EmailQueueModule {}
