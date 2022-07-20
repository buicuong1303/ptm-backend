import { SyncDataDto } from './../../messages/dto/sync-data.dto';
import { Injectable, NotFoundException } from '@nestjs/common';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { MessageDto } from 'src/common/dto/message.dto';
import { Message } from 'src/modules/messages/entity/message.entity';
import { TimeoutError } from 'rxjs';
import { RCTConfigDto } from './dto/rct-config.dto';
import { TrainSensitiveDto } from './dto/train-sensitive.dto';

@Injectable()
export class AmqpProducer {
  constructor(private readonly _amqpConnection: AmqpConnection) {}

  public sendMessage(message: MessageDto) {
    try {
      this._amqpConnection.publish(
        'phpswteam.php_text_message',
        'message.cmd.send.backend.ringcentral',
        message,
      );
    } catch (error) {
      //TODO: need custom message to return client without Ringcentral information
      throw new TimeoutError();
    }
  }

  public async addConcrete(config: RCTConfigDto) {
    try {
      const data = await this._amqpConnection.request<any>({
        exchange: 'phpswteam.php_text_message',
        routingKey: 'concretes.cmd.create.ringcentral.backend',
        payload: { config },
      });

      return data;
    } catch (error) {
      throw new TimeoutError();
    }
  }

  public async removeConcrete(config: RCTConfigDto) {
    try {
      const data = await this._amqpConnection.request<any>({
        exchange: 'phpswteam.php_text_message',
        routingKey: 'concretes.cmd.remove.ringcentral.backend',
        payload: { config },
      });

      return data;
    } catch (error) {
      throw new TimeoutError();
    }
  }

  public async updateOutboundListMessages(messages: Array<Message>) {
    this._amqpConnection.publish(
      'phpswteam.php_text_message',
      'message.cmd.update_outbound_list_messages.backend.realtime',
      messages,
    );
  }

  public async createOutboundListMessages(messages: Array<Message>) {
    return this._amqpConnection.publish(
      'phpswteam.php_text_message',
      'message.cmd.create_outbound_list_messages.backend.realtime',
      messages,
    );
  }

  public async updateOutboundMessage(payload) {
    return this._amqpConnection.publish(
      'phpswteam.php_text_message',
      'message.cmd.update_outbound_message.backend.realtime',
      payload,
    );
  }

  public async receiveMessageBackend(payload: any) {
    return this._amqpConnection.publish(
      'phpswteam.php_text_message',
      'message.cmd.receive.backend.real_time',
      payload,
    );
  }

  public async createOutboundListMessagesToNewCustomer(data) {
    return this._amqpConnection.publish(
      'phpswteam.php_text_message',
      'conversation.cmd.create.backend.realtime',
      data,
    );
  }

  public async pushNotification({ data, notificationReceivers }) {
    return this._amqpConnection.publish(
      'phpswteam.php_text_message',
      'notification.cmd.push_notification.backend.realtime',
      { data, notificationReceivers },
    );
  }

  public async createScheduleMessage(scheduleMessage) {
    try {
      const data = await this._amqpConnection.request<any>({
        exchange: 'phpswteam.php_text_message',
        routingKey: 'schedule_massage.cmd.create.backend.worker',
        payload: {
          request: scheduleMessage,
        },
      });
      if (data === true) {
        return data;
      } else {
        throw new NotFoundException('Cant create schedule');
      }
    } catch (error) {
      throw new TimeoutError();
    }
  }

  public async updateScheduleMessage(scheduleMessage) {
    try {
      return await this._amqpConnection.request<any>({
        exchange: 'phpswteam.php_text_message',
        routingKey: 'schedule_massage.cmd.update.backend.worker',
        payload: {
          request: scheduleMessage,
        },
        // timeout: 10000,
      });
    } catch (error) {
      throw new TimeoutError();
    }
  }

  public async stopScheduleMessage(scheduleMessageId) {
    try {
      const data = await this._amqpConnection.request<any>({
        exchange: 'phpswteam.php_text_message',
        routingKey: 'schedule_massage.cmd.stop.backend.worker',
        payload: {
          request: scheduleMessageId,
        },
        // timeout: 10000,
      });
      return data;
    } catch (error) {
      throw new TimeoutError();
    }
  }

  public async pauseScheduleMessage(scheduleMessageId) {
    try {
      const data = await this._amqpConnection.request<any>({
        exchange: 'phpswteam.php_text_message',
        routingKey: 'schedule_massage.cmd.pause.backend.worker',
        payload: {
          request: scheduleMessageId,
        },
        // timeout: 10000,
      });
      return data;
    } catch (error) {
      throw new TimeoutError();
    }
  }

  public async resumeScheduleMessage(messageSets) {
    try {
      const data = await this._amqpConnection.request<any>({
        exchange: 'phpswteam.php_text_message',
        routingKey: 'schedule_massage.cmd.resume.backend.worker',
        payload: {
          request: messageSets,
        },
        // timeout: 10000,
      });
      return data;
    } catch (error) {
      throw new TimeoutError();
    }
  }

  public async deleteScheduleMessage(scheduleMessageId) {
    const data = await this._amqpConnection.request<any>({
      exchange: 'phpswteam.php_text_message',
      routingKey: 'schedule_massage.cmd.delete.backend.worker',
      payload: {
        request: scheduleMessageId,
      },
      // timeout: 10000,
    });
    return data;
  }

  public async trackScheduleMessage({ data, notificationReceivers }) {
    return this._amqpConnection.publish(
      'phpswteam.php_text_message',
      'schedule_message.cmd.track_schedule_message.backend.realtime',
      { data, notificationReceivers },
    );
  }

  public async updateQueuedMessage(queuedMessages: Array<any>) {
    return this._amqpConnection.publish(
      'phpswteam.php_text_message',
      'message.cmd.update.backend.ringcentral',
      queuedMessages,
    );
  }

  public async receiveMissedInboundCall(payload) {
    return this._amqpConnection.publish(
      'phpswteam.php_text_message',
      'call.cmd.receive_missed_inbound_call.backend.realtime',
      payload,
    );
  }

  public async signInRingCentral() {
    try {
      const data = await this._amqpConnection.request<any>({
        exchange: 'phpswteam.php_text_message',
        routingKey: 'widget.cmd.login.backend.ringcentral',
        payload: {},
        // timeout: 10000,
      });
      if (data) {
        return data;
      } else {
        throw new NotFoundException('Can not login');
      }
    } catch (error) {
      throw new TimeoutError();
    }
  }

  public async getCallLogRecords(phoneNumber, dateFrom, dateTo, serviceToken) {
    try {
      const data = await this._amqpConnection.request<any>({
        exchange: 'phpswteam.php_text_message',
        routingKey: 'call-log.cmd.get.backend.ringcentral',
        timeout: 10000,
        payload: {
          phoneNumber: phoneNumber,
          dateFrom: dateFrom,
          dateTo: dateTo,
          serviceToken,
        },
      });
      return data;
    } catch (error) {
      throw new TimeoutError();
    }
  }

  public async nextPageCallLogs(nextPage, serviceToken) {
    try {
      const data = await this._amqpConnection.request<any>({
        exchange: 'phpswteam.php_text_message',
        routingKey: 'call-log.cmd.next-page.backend.ringcentral',
        timeout: 10000,
        payload: {
          nextPage: nextPage,
          serviceToken,
        },
      });
      return data;
    } catch (error) {
      throw new TimeoutError();
    }
  }

  public async syncMessages(syncDatas: SyncDataDto[]) {
    return this._amqpConnection.publish(
      'phpswteam.php_text_message',
      'message.cmd.sync.backend.ringcentral',
      syncDatas,
    );
  }

  public async syncMissedCalls(syncDatas: SyncDataDto[]) {
    return this._amqpConnection.publish(
      'phpswteam.php_text_message',
      'call.cmd.sync.backend.ringcentral',
      syncDatas,
    );
  }

  public async detectSensitive(message: any) {
    return this._amqpConnection.publish(
      'phpswteam.php_text_message',
      'message.cmd.detect_sensitive.backend.analyzer',
      message,
    );
  }

  public async trainSensitive(trainSensitiveData: TrainSensitiveDto) {
    return this._amqpConnection.publish(
      'phpswteam.php_text_message',
      'sensitive.cmd.train.backend.analyzer',
      trainSensitiveData,
    );
  }
}
