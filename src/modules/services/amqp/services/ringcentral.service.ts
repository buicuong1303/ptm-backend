import { SyncDataDto } from './../../../messages/dto/sync-data.dto';
import { MessageDto } from 'src/common/dto/message.dto';
import { AmqpProducer } from '../amqp.producer';
import { Injectable } from '@nestjs/common';
import { RCTConfigDto } from '../dto/rct-config.dto';

@Injectable()
export class RingcentralService {
  constructor(private readonly _amqpProducer: AmqpProducer) {}

  public sendMessage(message: MessageDto) {
    return this._amqpProducer.sendMessage(message);
  }

  public async updateQueuedMessage(exMessages: Array<any>): Promise<any> {
    return this._amqpProducer.updateQueuedMessage(exMessages);
  }

  public async syncMessages(syncDatas: SyncDataDto[]): Promise<any> {
    return this._amqpProducer.syncMessages(syncDatas);
  }

  public async syncMissedCalls(syncDatas: SyncDataDto[]): Promise<any> {
    return this._amqpProducer.syncMissedCalls(syncDatas);
  }

  public async signInRingCentral(): Promise<any> {
    return this._amqpProducer.signInRingCentral();
  }

  public async getCallLogRecords(
    phoneNumber,
    dateFrom,
    dateTo,
    serviceToken,
  ): Promise<any> {
    return this._amqpProducer.getCallLogRecords(
      phoneNumber,
      dateFrom,
      dateTo,
      serviceToken,
    );
  }

  public async nextPageCallLogs(nextPage, serviceToken): Promise<any> {
    return this._amqpProducer.nextPageCallLogs(nextPage, serviceToken);
  }

  public async addConcrete(config: RCTConfigDto): Promise<any> {
    return await this._amqpProducer.addConcrete(config);
  }

  public async removeConcrete(config: RCTConfigDto): Promise<any> {
    return await this._amqpProducer.removeConcrete(config);
  }
}
