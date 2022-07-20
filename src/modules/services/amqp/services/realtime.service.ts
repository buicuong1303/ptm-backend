import { AmqpProducer } from '../amqp.producer';
import { Injectable } from '@nestjs/common';
@Injectable()
export class RealtimeService {
  constructor(private readonly _amqpProducer: AmqpProducer) {}

  public async updateOutboundListMessages(updatedMessages: any): Promise<any> {
    return this._amqpProducer.updateOutboundListMessages(updatedMessages);
  }

  public async createOutboundListMessages(createdMessages: any): Promise<any> {
    return this._amqpProducer.createOutboundListMessages(createdMessages);
  }

  public async createOutboundListMessagesToNewCustomer(
    data: any,
  ): Promise<any> {
    return this._amqpProducer.createOutboundListMessagesToNewCustomer(data);
  }

  public async receiveMissedInboundCallFromNewCustomer(data): Promise<any> {
    return this._amqpProducer.createOutboundListMessagesToNewCustomer([data]);
  }

  public async receivedMessageBackend(message: any) {
    return this._amqpProducer.receiveMessageBackend(message);
  }

  public async pushNotification({ data, notificationReceivers }) {
    return this._amqpProducer.pushNotification({ data, notificationReceivers });
  }

  public async trackScheduleMessage({ data, notificationReceivers }) {
    return this._amqpProducer.trackScheduleMessage({
      data,
      notificationReceivers,
    });
  }

  public async updateOutboundMessage(payload) {
    return this._amqpProducer.updateOutboundMessage(payload);
  }

  public async receiveMissedInboundCall(payload) {
    return this._amqpProducer.receiveMissedInboundCall(payload);
  }
}
