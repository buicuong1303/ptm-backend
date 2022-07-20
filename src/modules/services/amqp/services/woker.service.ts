import { AmqpProducer } from '../amqp.producer';
import { Injectable } from '@nestjs/common';

@Injectable()
export class WorkerService {
  constructor(private readonly _amqpProducer: AmqpProducer) {}

  public async createScheduleMessage(scheduleMessage): Promise<any> {
    return await this._amqpProducer.createScheduleMessage(scheduleMessage);
  }
  public async updateScheduleMessage(scheduleMessage): Promise<any> {
    return await this._amqpProducer.updateScheduleMessage(scheduleMessage);
  }
  public async pauseScheduleMessage(scheduleMessageId): Promise<any> {
    return await this._amqpProducer.pauseScheduleMessage(scheduleMessageId);
  }
  public async stopScheduleMessage(scheduleMessageId): Promise<any> {
    return await this._amqpProducer.stopScheduleMessage(scheduleMessageId);
  }
  public async resumeScheduleMessage(messageSets): Promise<any> {
    return await this._amqpProducer.resumeScheduleMessage(messageSets);
  }
  public async deleteScheduleMessage(messageSets): Promise<any> {
    return await this._amqpProducer.deleteScheduleMessage(messageSets);
  }
}
