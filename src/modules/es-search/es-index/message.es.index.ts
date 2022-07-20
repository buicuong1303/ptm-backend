import { Inject, Injectable } from '@nestjs/common';
import { EsSearchServiceInterface } from '../interface/es-search.service.interface';
import { Message } from 'src/modules/messages/entity/message.entity';
import { esIndexs } from '../constant/es-indexs';
import * as _ from 'lodash';
import { MessageRepository } from 'src/modules/messages/repository/message.repository';

@Injectable()
export class MessageEsIndex {
  constructor(
    @Inject('EsSearchService')
    private readonly _esSearchService: EsSearchServiceInterface<any>,

    private readonly _messageRepository: MessageRepository,
  ) {}

  //TODO need move to message service
  public async getMessageForElasticSearchData(messageId: string) {
    const data = await this._messageRepository.findOne({
      where: {
        id: messageId,
      },
      relations: [
        'creationUserId',
        'attachments',
        'conversation',
        'conversation.lastMessage',
        'conversation.lastUser',
        'conversation.companyCustomer',
        'conversation.companyCustomer.company',
        'conversation.companyCustomer.customer',
      ],
    });

    return data;
  }

  public transformMessageForMapping(message: Message): any {
    const messageForMapping = {
      id: message.id,
      text: message.text, //* elastic search cannot insert text starting with '\n'
      direction: message.direction,
      attachments: !message.attachments
        ? []
        : message.attachments.map((attachment) => {
            return {
              name: attachment.name,
              url: attachment.url,
              category: attachment.category,
              format: attachment.format,
            };
          }),
      users: {
        id: message.creationUserId?.id,
        firstName: message.creationUserId?.firstName,
        lastName: message.creationUserId?.lastName,
        avatar: message.creationUserId?.avatar,
      },
      creationTime: message.creationTime,
      lastModifiedTime: message.lastModifiedTime,
      conversations: {
        id: message.conversation.id,
        company_customers: {
          id: message.conversation?.companyCustomer?.id,
          companies: {
            id: message.conversation?.companyCustomer?.company?.id,
            code: message.conversation?.companyCustomer?.company?.code,
            name: message.conversation?.companyCustomer?.company?.name,
          },
          customers: {
            id: message.conversation?.companyCustomer?.customer?.id,
            phoneNumber:
              message.conversation?.companyCustomer?.customer?.phoneNumber,
          },
        },
      },
      messageStatus: message.messageStatus,
      exMessageStatus: message.exMessageStatus,
    };

    return messageForMapping;
  }

  public async insertMessageDocument(message: Message): Promise<any> {
    const messageFullInformation: Message =
      await this.getMessageForElasticSearchData(message.id);

    if (!messageFullInformation) return;

    const messageData = this.transformMessageForMapping(messageFullInformation);

    if (!messageData) return;

    const data = {
      body: [
        {
          index: {
            _index: 'messages',
            _id: messageData.id,
          },
        },
        { ...messageData },
      ],
    };

    return await this._esSearchService.insertBulkDoc(data);
  }

  public async updateMessageDocument(message: Message): Promise<any> {
    if (!message) return;
    //* handle delete old message in es
    await this.deleteMessageDocument(message.id);
    //* handle reinsert message to es
    return await this.insertMessageDocument(message);
  }

  public async deleteMessageDocument(messageId: string): Promise<any> {
    const data = {
      id: messageId,
      index: 'messages',
    };
    return this._esSearchService.deleteDoc(data);
  }

  //* pre-handle data for elasticsearch api, this method return bulk data. In addition, can use entity directly
  //! need test before use
  private _bulkDocument(data: any): any {
    const bulk = [];

    // * specified action and resource
    bulk.push({
      index: {
        _index: esIndexs.message.index,
        _id: data.id,
      },
    });

    // * specified data
    bulk.push(_.omit(data, ['id']));

    return {
      index: esIndexs.message.index,
      body: bulk,
    };
  }
}
