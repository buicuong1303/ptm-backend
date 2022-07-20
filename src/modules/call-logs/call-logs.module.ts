import { CompaniesModule } from './../companies/companies.module';
import { Module } from '@nestjs/common';
import { CallLogService } from './call-logs.service';
import { CallLogController } from './call-logs.controller';
import { AmqpModule } from '../services/amqp/amqp.module';

@Module({
  imports: [AmqpModule, CompaniesModule],
  controllers: [CallLogController],
  providers: [CallLogService],
  exports: [CallLogService],
})
export class CallLogModule {}
