import { forwardRef, HttpModule, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CampaignsRepository } from '../campaigns/repository/campaigns.repository';
import { CompanyRepository } from '../companies/repository/company.repository';
import { CompanyCustomerRepository } from '../company-customers/repository/company-customer.repository';
import { CustomerRepository } from '../customers/repository/customer.repository';
import { AmqpModule } from '../services/amqp/amqp.module';
import { AwsS3Module } from '../services/http/aws-s3/aws-s3.module';
import { UserRepository } from '../users/repository/user.repository';
import { ScheduleMessageRepository } from './repository/schedule-message.repository';
import { ScheduleMessagesController } from './schedule-messages.controller';
import { ScheduleMessagesService } from './schedule-messages.service';

@Module({
  imports: [
    HttpModule.register({
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    }),
    TypeOrmModule.forFeature([
      //* for current scope
      CompanyRepository,
      ScheduleMessageRepository,
      CustomerRepository,
      CompanyCustomerRepository,
      UserRepository,
      CampaignsRepository,
    ]),
    forwardRef(() => AmqpModule),
    AwsS3Module,
  ],
  controllers: [ScheduleMessagesController],
  providers: [ScheduleMessagesService],
  exports: [ScheduleMessagesService],
})
export class ScheduleMessagesModule {}
