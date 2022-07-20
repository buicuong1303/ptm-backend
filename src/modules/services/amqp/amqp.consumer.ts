import { SyncConfigDto } from './../../../common/dto/sync-config.dto';
/* eslint-disable @typescript-eslint/no-unused-vars */
import { MessagesService } from 'src/modules/messages/messages.service';
import { Injectable } from '@nestjs/common';
import { Nack, RabbitRPC, RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { ParticipantsService } from 'src/modules/participants/participants.service';
import { UsersService } from 'src/modules/users/users.service';
import { ScheduleMessagesService } from 'src/modules/schedule-messages/schedule-messages.service';
import { CompaniesService } from 'src/modules/companies/companies.service';
import { OptSuggestionsService } from 'src/modules/opt-suggestions/opt-suggestions.service';
import { SensitiveDetectsService } from 'src/modules/sensitive-detects/sensitive-detects.service';
import { MessageDirection } from 'src/common/constant/message-direction';
import {
  Connection,
  EntityManager,
  Transaction,
  TransactionManager,
} from 'typeorm';
import { SensitivesService } from 'src/modules/sensitives/sensitives.service';
@Injectable()
export class AmqpConsumer {
  constructor(
    private readonly _companiesService: CompaniesService,
    private readonly _messagesService: MessagesService,
    private readonly _participantsService: ParticipantsService,
    private readonly _userService: UsersService,
    private readonly connection: Connection,
    private readonly _scheduleMessageService: ScheduleMessagesService,
    private readonly _optSuggestionService: OptSuggestionsService,
    private readonly _sensitiveDetectService: SensitiveDetectsService,
    private readonly _sensitiveService: SensitivesService,
  ) {}

  //* receive message from RingCentral
  @RabbitRPC({
    exchange: 'phpswteam.php_text_message',
    routingKey: 'message.cmd.receive.ringcentral.backend',
    queue: 'phpswteam.php_text_message-message.cmd.receive.ringcentral.backend',
    queueOptions: {
      deadLetterExchange: 'phpswteam.dlx_php_text_message',
      deadLetterRoutingKey: `dlx.log`,
    },
  })
  public async receivedInboundMessage(data: any) {
    try {
      await this._messagesService.handleReceivedInboundMessage(data.message);
      return true;
    } catch (error) {
      return new Nack();
    }
    return {};
  }

  //* update message from RingCentral
  @RabbitRPC({
    exchange: 'phpswteam.php_text_message',
    routingKey: 'message.evt.update_outbound_message.ringcentral.backend',
    queue:
      'phpswteam.php_text_message-message.evt.update_outbound_message.ringcentral.backend',
    queueOptions: {
      deadLetterExchange: 'phpswteam.dlx_php_text_message',
      deadLetterRoutingKey: `dlx.log`,
    },
  })
  //* need change to updateSentMessage
  public async updateOutboundMessage(data: any) {
    try {
      await this._messagesService.updateOutboundMessage(data.message);
    } catch (error) {
      console.log('error');
      return new Nack();
    }
    return {};
  }

  @RabbitRPC({
    exchange: 'phpswteam.php_text_message',
    routingKey:
      'message.cmd.receive_outbound_list_messages.ringcentral.backend',
    queue:
      'phpswteam.php_text_message-message.cmd.receive_outbound_list_messages.ringcentral.backend',
    queueOptions: {
      deadLetterExchange: 'phpswteam.dlx_php_text_message',
      deadLetterRoutingKey: `dlx.log`,
    },
  })
  //* need change to updateOutboundMessage
  public async updateOutboundListMessages(data: any) {
    try {
      await this._messagesService.updateOutBoundListMessages(data.messages);
    } catch (error) {
      return new Nack();
    }
    return {};
  }

  //* receive message sent from real time
  @RabbitRPC({
    exchange: 'phpswteam.php_text_message',
    routingKey: 'message.cmd.send.real_time.backend',
    queue: 'phpswteam.php_text_message-message.cmd.send.real_time.backend',
    queueOptions: {
      deadLetterExchange: 'phpswteam.dlx_php_text_message',
      deadLetterRoutingKey: `dlx.log`,
    },
  })
  public async sendMessage(data: any) {
    return await this._messagesService.createOutboundMessage(data);
  }

  //* receive call from RingCentral
  @RabbitSubscribe({
    exchange: 'phpswteam.php_text_message',
    routingKey: 'call.cmd.receive.ringcentral.backend',
    queue: 'phpswteam.php_text_message-call.cmd.receive.ringcentral.backend',
    queueOptions: {
      deadLetterExchange: 'phpswteam.dlx_php_text_message',
      deadLetterRoutingKey: `dlx.log`,
    },
  })
  public async receivedInboundCall(msg: any) {
    console.log(`Received inbound call: ${JSON.stringify(msg)}`);
  }

  @RabbitRPC({
    exchange: 'phpswteam.php_text_message',
    routingKey: 'call.cmd.receive_missed_inbound_call.ringcentral.backend',
    queue:
      'phpswteam.php_text_message-call.cmd.receive_missed_inbound_call.ringcentral.backend',
    queueOptions: {
      deadLetterExchange: 'phpswteam.dlx_php_text_message',
      deadLetterRoutingKey: `dlx.log`,
    },
  })
  public async receivedMissedInboundCall(data: any) {
    try {
      await this._messagesService.receiveInboundMissedCall(data.call);
    } catch (error) {
      return new Nack();
    }
    return {};
  }

  @RabbitSubscribe({
    exchange: 'phpswteam.php_text_message',
    routingKey: 'user.cmd.disconnect.realtime.backend',
    queue: 'phpswteam.php_text_message-user.cmd.disconnect.realtime.backend',
    queueOptions: {
      deadLetterExchange: 'phpswteam.dlx_php_text_message',
      deadLetterRoutingKey: `dlx.log`,
    },
  })
  public async userOffline(msg: any) {
    console.log(`User offline: ${JSON.stringify(msg)}`);
  }

  //* Receive a request get users in the conversation
  @RabbitRPC({
    exchange: 'phpswteam.php_text_message',
    routingKey: 'user.cmd.get.real_time.backend',
    queue: 'phpswteam.php_text_message-user.cmd.get.real_time.backend',
    queueOptions: {
      deadLetterExchange: 'phpswteam.dlx_php_text_message',
      deadLetterRoutingKey: `dlx.log`,
    },
  })
  @Transaction()
  public async getUsersInConversation(
    conversationId: string,
    @TransactionManager() manager: EntityManager,
  ) {
    try {
      return await this._participantsService.getUsersInConversation(
        conversationId,
        manager.queryRunner,
      );
    } catch (error) {
      return new Nack();
    }
  }

  //* Receive a request get users in the conversation
  @RabbitRPC({
    exchange: 'phpswteam.php_text_message',
    routingKey: 'participant.cmd.get.real_time.backend',
    queue: 'phpswteam.php_text_message-participant.cmd.get.real_time.backend',
    queueOptions: {
      deadLetterExchange: 'phpswteam.dlx_php_text_message',
      deadLetterRoutingKey: `dlx.log`,
    },
  })
  public async getUsersWithParticipant(participantId: string) {
    try {
      return await this._participantsService.getUsersWithParticipant(
        participantId,
      );
    } catch (error) {
      return new Nack();
    }
  }

  //* Receive a request get users in the conversation
  @RabbitRPC({
    exchange: 'phpswteam.php_text_message',
    routingKey: 'participant.cmd.update_umn.real_time.backend',
    queue:
      'phpswteam.php_text_message-participant.cmd.update_umn.real_time.backend',
    queueOptions: {
      deadLetterExchange: 'phpswteam.dlx_php_text_message',
      deadLetterRoutingKey: `dlx.log`,
    },
  })
  public async updateUmnWithNewMessage(participantId: string) {
    try {
      return await this._participantsService.updateUmnWithNewMessage(
        participantId,
      );
    } catch (error) {
      return new Nack();
    }
  }

  //* Receive a request get users in the conversation
  @RabbitRPC({
    exchange: 'phpswteam.php_text_message',
    routingKey: 'participant.cmd.update_umn_read.real_time.backend',
    queue:
      'phpswteam.php_text_message-participant.cmd.update_umn_read.real_time.backend',
    queueOptions: {
      deadLetterExchange: 'phpswteam.dlx_php_text_message',
      deadLetterRoutingKey: `dlx.log`,
    },
  })
  public async updateUmnConversation(participantId: string) {
    try {
      return await this._participantsService.updateUmnConversation(
        participantId,
      );
    } catch (error) {
      return new Nack();
    }
  }

  @RabbitRPC({
    exchange: 'phpswteam.php_text_message',
    routingKey: 'companies.cmd.get.ringcentral.backend',
    queue: 'phpswteam.php_text_message-companies.cmd.get.ringcentral.backend',
    queueOptions: {
      deadLetterExchange: 'phpswteam.dlx_php_text_message',
      deadLetterRoutingKey: `dlx.log`,
    },
  })
  public async getCompanies() {
    try {
      return await this._companiesService.getCompanies();
    } catch (error) {
      return new Nack();
    }
  }

  @RabbitRPC({
    exchange: 'phpswteam.php_text_message',
    routingKey: 'companies.cmd.update.ringcentral.backend',
    queue:
      'phpswteam.php_text_message-companies.cmd.update.ringcentral.backend',
    queueOptions: {
      deadLetterExchange: 'phpswteam.dlx_php_text_message',
      deadLetterRoutingKey: `dlx.log`,
    },
  })
  public async updateErrorStatus(data: any) {
    try {
      return await this._companiesService.updateErrorStatus(data.appInfor);
    } catch (error) {
      return new Nack();
    }
  }

  @RabbitRPC({
    exchange: 'phpswteam.php_text_message',
    routingKey: 'message.cmd.check_soft_phone.ringcentral.backend',
    queue:
      'phpswteam.php_text_message-message.cmd.check_soft_phone.ringcentral.backend',
    queueOptions: {
      deadLetterExchange: 'phpswteam.dlx_php_text_message',
      deadLetterRoutingKey: `dlx.log`,
    },
  })
  public async checkSoftPhone(data: any) {
    try {
      return await this._messagesService.checkSoftPhone(data);
    } catch (error) {
      return new Nack();
    }
  }

  @RabbitRPC({
    exchange: 'phpswteam.php_text_message',
    routingKey: 'user.cmd.update_online_status.real_time.backend',
    queue:
      'phpswteam.php_text_message-user.cmd.update_online_status.real_time.backend',
    queueOptions: {
      deadLetterExchange: 'phpswteam.dlx_php_text_message',
      deadLetterRoutingKey: `dlx.log`,
    },
  })
  public async updateUserOnlineStatus(participantId: string) {
    try {
      return await this._userService.updateUserOnlineStatus(participantId);
    } catch (error) {
      return new Nack();
    }
  }

  @RabbitRPC({
    exchange: 'phpswteam.php_text_message',
    routingKey: 'schedule_message.cmd.run.worker.backend',
    queue: 'phpswteam.php_text_message-schedule_message.cmd.run.worker.backend',
    queueOptions: {
      deadLetterExchange: 'phpswteam.dlx_php_text_message',
      deadLetterRoutingKey: `dlx.log`,
    },
  })
  public async runScheduleMessage(data) {
    try {
      return await this._scheduleMessageService.runScheduleMessage(
        data.request.scheduleMessageId,
      );
    } catch (error) {
      return new Nack();
    }
  }

  @RabbitRPC({
    exchange: 'phpswteam.php_text_message',
    routingKey: 'schedule_message.cmd.send_message.worker.backend',
    queue: 'phpswteam.php_text_message-message.cmd.send_message.worker.backend',
    queueOptions: {
      deadLetterExchange: 'phpswteam.dlx_php_text_message',
      deadLetterRoutingKey: `dlx.log`,
    },
  })
  public async sendScheduleMessage(messageSet) {
    await this._messagesService.sendScheduleMessage(messageSet);
    return {};
  }

  @RabbitSubscribe({
    exchange: 'phpswteam.php_text_message',
    routingKey: 'message.cmd.send_error.ringcentral.backend',
    queue:
      'phpswteam.php_text_message-message.cmd.send_error.ringcentral.backend',
    queueOptions: {
      deadLetterExchange: 'phpswteam.dlx_php_text_message',
      deadLetterRoutingKey: `dlx.log`,
    },
  })
  public async sendMessageError(message) {
    this._messagesService.sendMessageError(message);
  }

  @RabbitSubscribe({
    exchange: 'phpswteam.dlx_php_text_message',
    routingKey: 'dlx.#',
    queue: 'phpswteam.dlx_php_text_message-queue',
  })
  public async handleDLX(data: any, amqpMsg: any) {
    console.log('Error throw out DLX...');
    const { properties } = amqpMsg;
    const xDeaths: [] = properties['headers']['x-death'];
    xDeaths.map((xDeath) => {
      console.log(JSON.stringify(xDeath));
    });
  }

  @RabbitRPC({
    exchange: 'phpswteam.php_text_message',
    routingKey: 'message.evt.update_queued.ringcentral.backend',
    queue:
      'phpswteam.php_text_message-message.evt.update_queued.ringcentral.backend',
    queueOptions: {
      deadLetterExchange: 'phpswteam.dlx_php_text_message',
      deadLetterRoutingKey: `dlx.log`,
    },
  })
  public async updateQueuedMessage(data: any) {
    try {
      await this._messagesService.updateQueuedMessage(data.message);
    } catch (error) {
      console.log(error);
      return new Nack();
    }
    return {};
  }

  @RabbitSubscribe({
    exchange: 'phpswteam.php_text_message',
    routingKey: 'message.evt.detect_sensitive.analyzer.backend',
    queue:
      'phpswteam.php_text_message-message.evt.detect_sensitive.analyzer.backend',
    queueOptions: {
      deadLetterExchange: 'phpswteam.dlx_php_text_message',
      deadLetterRoutingKey: `dlx.log`,
    },
  })
  public detectSensitive(data: any) {
    if (+data.rate > parseFloat(process.env.SENSITIVE_THRESHOLD)) {
      if (data.direction === MessageDirection.OUTBOUND)
        this._sensitiveDetectService.createSensitiveDetect({
          messageId: data.id,
          reason: 'Sensitive word',
        });
      else {
        this._sensitiveDetectService.detectOptOut(data);
      }
    }
  }
  @RabbitSubscribe({
    exchange: 'phpswteam.php_text_message',
    routingKey: 'message.evt.train.analyzer.backend',
    queue: 'phpswteam.php_text_message-message.evt.train.analyzer.backend',
    queueOptions: {
      deadLetterExchange: 'phpswteam.dlx_php_text_message',
      deadLetterRoutingKey: `dlx.log`,
    },
  })
  public updateTrainStatus(data: any) {
    this._sensitiveService.updateTrainStatus(data);
  }

  @RabbitSubscribe({
    exchange: 'phpswteam.php_text_message',
    routingKey: 'message.cmd.sync.worker.backend',
    queue: 'phpswteam.php_text_message-message.cmd.sync.worker.backend',
    queueOptions: {
      deadLetterExchange: 'phpswteam.dlx_php_text_message',
      deadLetterRoutingKey: `dlx.log`,
    },
  })
  public syncMessage(syncConfig: SyncConfigDto) {
    return this._messagesService.syncMessage(
      syncConfig.timeFrom,
      syncConfig.timeTo,
    );
  }

  @RabbitSubscribe({
    exchange: 'phpswteam.php_text_message',
    routingKey: 'queued_message.cmd.sync.worker.backend',
    queue: 'phpswteam.php_text_message-queued_message.cmd.sync.worker.backend',
    queueOptions: {
      deadLetterExchange: 'phpswteam.dlx_php_text_message',
      deadLetterRoutingKey: `dlx.log`,
    },
  })
  public syncQueuedMessage(payload: any) {
    return this._messagesService.syncQueuedMessage();
  }

  @RabbitSubscribe({
    exchange: 'phpswteam.php_text_message',
    routingKey: 'missed_call.cmd.sync.worker.backend',
    queue: 'phpswteam.php_text_message-missed_call.cmd.sync.worker.backend',
    queueOptions: {
      deadLetterExchange: 'phpswteam.dlx_php_text_message',
      deadLetterRoutingKey: `dlx.log`,
    },
  })
  public syncMissedCall(backTime: number) {
    return this._messagesService.syncMissedCall(backTime);
  }

  @RabbitSubscribe({
    exchange: 'phpswteam.php_text_message',
    routingKey: 'message.cmd.sync_after_restart.worker.backend',
    queue:
      'phpswteam.php_text_message-message.cmd.sync_after_restart.worker.backend',
    queueOptions: {
      deadLetterExchange: 'phpswteam.dlx_php_text_message',
      deadLetterRoutingKey: `dlx.log`,
    },
  })
  public syncMessageAfterRestart(data: any) {
    return this._messagesService.syncMessageAfterRestart();
  }

  @RabbitSubscribe({
    exchange: 'phpswteam.php_text_message',
    routingKey: 'missed_call.cmd.sync_after_restart.worker.backend',
    queue:
      'phpswteam.php_text_message-missed_call.cmd.sync_after_restart.worker.backend',
    queueOptions: {
      deadLetterExchange: 'phpswteam.dlx_php_text_message',
      deadLetterRoutingKey: `dlx.log`,
    },
  })
  public syncMissedCallAfterRestart(data: any) {
    return this._messagesService.syncMissedCallAfterRestart();
  }

  @RabbitSubscribe({
    exchange: 'phpswteam.php_text_message',
    routingKey: 'sensitive.cmd.train.worker.backend',
    queue: 'phpswteam.php_text_message-sensitive.cmd.train.worker.backend',
    queueOptions: {
      deadLetterExchange: 'phpswteam.dlx_php_text_message',
      deadLetterRoutingKey: `dlx.log`,
    },
  })
  public trainSensitive(data: any) {
    const { direction } = data;
    return this._sensitiveService.trainSensitive(direction);
  }

  @RabbitSubscribe({
    exchange: 'phpswteam.php_text_message',
    routingKey: 'schedule.cmd.message_fail.worker.backend',
    queue:
      'phpswteam.php_text_message-schedule.cmd.message_fail.worker.backend',
    queueOptions: {
      deadLetterExchange: 'phpswteam.dlx_php_text_message',
      deadLetterRoutingKey: `dlx.log`,
    },
  })
  public detectScheduleMessageFail() {
    return this._scheduleMessageService._detectFailedScheduleMessageToRetry();
  }
}
