import { GroupMessagesService } from './../group-message/group-messages.service';
import { AwsS3Service } from './../services/http/aws-s3/aws-s3.service';
import {
  forwardRef,
  HttpStatus,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Message } from './entity/message.entity';
import { MessageRepository } from './repository/message.repository';
import * as _ from 'lodash';
import { CreateComposeMessageDto } from './dto/create-compose-message.dto';
import { UpdateMessageDto } from './dto/update-message.dto';
import { CustomersService } from '../customers/customers.service';
import { EntityStatus } from 'src/common/constant/entity-status';
import { UsersService } from '../users/users.service';
import { Connection, getManager, Not, QueryRunner } from 'typeorm';
import { MessageDto } from 'src/common/dto/message.dto';
import { RingcentralService } from 'src/modules/services/amqp/services/ringcentral.service';
import { MessageMode } from 'src/common/constant/message-mode';
import { InternalStatus } from 'src/common/constant/internal-status';
import { ExternalStatus } from 'src/common/constant/external-status';
import { MessageDirection } from 'src/common/constant/message-direction';
import { ConversationsService } from '../conversations/conversations.service';
import { RealtimeService } from '../services/amqp/services/realtime.service';
import { CustomerRepository } from '../customers/repository/customer.repository';
import { CreateMessageDto } from './dto/create-message.dto';
import { CompanyRepository } from '../companies/repository/company.repository';
import { AwsS3PresignedMethod } from '../../common/constant/aws-s3-presigned-method';
import { v4 as uuid } from 'uuid';
import { CompanyCustomerRepository } from '../company-customers/repository/company-customer.repository';
import { ParticipantsService } from '../participants/participants.service';
import { AttachmentRepository } from './repository/attachment.repository';
import { Attachment } from './entity/attachment.entity';
import { CompanyCustomer } from '../company-customers/entity/company-customer.entity';
import { Conversation } from '../conversations/entity/conversation.entity';
import { CreateCompanyCustomerDto } from '../company-customers/dto/create-company-customer.dto';
import { SignedUrlDto } from 'src/common/dto/signed-url.dto';
import { UploadAttachmentDto } from 'src/common/dto/upload-attachment.dto';
import { convertFileSize } from 'src/common/utils/handle-file';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from 'src/common/constant/notification-type';
import { Company } from '../companies/entity/company.entity';
import { MessageSet } from '../schedule-messages/entity/message-set.entity';
import { User } from '../users/entity/user.entity';
import { ScheduleMessage } from '../schedule-messages/entity/schedule-message.entity';
import { ScheduleMessageStatus } from 'src/common/constant/schedule-message-status';
import { MessageSetStatus } from 'src/common/constant/message-set-status';
import { ParticipantRepository } from '../participants/repository/participant.repository';
import { MessageSetRepository } from '../schedule-messages/repository/message-set.repository';
import * as probe from 'probe-image-size';
import { EsSearchServiceInterface } from '../es-search/interface/es-search.service.interface';
import { trycat } from 'src/common/utils/trycat';
import { HttpException } from '@nestjs/common';
import { Scroll, Search } from '@elastic/elasticsearch/api/requestParams';
import { esIndexs } from '../es-search/constant/es-indexs';
import { HighLightDto } from '../es-search/dto/high-light.dto';
import { SearchScrollParameter } from '../es-search/dto/search-scroll-parameter.dto';
import { CompanyUser } from '../company-users/entity/company-user.entity';
import { Participant } from '../participants/entity/participant.entity';
import { ReadStatus } from 'src/common/constant/read-status';
import * as mtz from 'moment-timezone';
import { SignatureRepository } from '../signatures/repository/signatures.repository';
import { Call } from './entity/call.entity';
import * as momenttz from 'moment-timezone';
import * as moment from 'moment';
import { createConcretesKey } from 'src/common/utils/createConcretesKey';
import { SyncDataDto } from './dto/sync-data.dto';
import { GroupMessage } from '../group-message/entity/group-message.entity';

@Injectable()
export class MessagesService {
  constructor(
    @Inject(forwardRef(() => ConversationsService))
    private readonly conversationsService: ConversationsService,
    private readonly notificationService: NotificationsService,
    private readonly usersService: UsersService,
    private readonly customersService: CustomersService,
    private readonly connection: Connection,
    @InjectRepository(MessageRepository)
    private readonly messageRepository: MessageRepository,
    private readonly signatureRepository: SignatureRepository,
    @InjectRepository(AttachmentRepository)
    private readonly attachmentRepository: AttachmentRepository,
    private readonly _ringcentralService: RingcentralService,
    private readonly _realTimeService: RealtimeService,
    private readonly _awsS3: AwsS3Service,
    private readonly customersRepository: CustomerRepository,
    private readonly messageSetRepository: MessageSetRepository,
    private readonly participantService: ParticipantsService,
    @InjectRepository(CompanyRepository)
    private readonly companyRepository: CompanyRepository,
    @InjectRepository(CompanyCustomerRepository)
    private readonly companyCustomerRepository: CompanyCustomerRepository,
    @InjectRepository(ParticipantRepository)
    private readonly participantRepository: ParticipantRepository,
    private readonly _participantsService: ParticipantsService,
    @Inject(forwardRef(() => 'EsSearchService'))
    private readonly _esSearchService: EsSearchServiceInterface<any>,
    private readonly _groupMessageService: GroupMessagesService,
  ) {}
  private readonly logger = new Logger(MessagesService.name);

  public async search(searchTerm: string, from = 0, to = 1) {
    const searchData: Search = {
      index: esIndexs.message.index,
      body: {
        from: from,
        size: to,
        query: {
          multi_match: {
            query: searchTerm,
            type: 'phrase_prefix',
            fields: [],
          },
        },
        highlight: {
          //* highlight term
          fields: <HighLightDto>{
            text: {},
            'attachments.name': {},
          },
        },
      },
    };

    const [data, error] = await trycat(
      this._esSearchService.searchDoc(searchData),
    );

    if (!error) return data;
    throw new HttpException(error, HttpStatus.INTERNAL_SERVER_ERROR);
  }

  public async searchScroll(
    searchScrollParameter: SearchScrollParameter,
    user: any,
  ) {
    const companies = await getManager()
      .createQueryBuilder(CompanyUser, 'companyUser')
      .select(['companyUser.id', 'company.id', 'company.code'])
      .innerJoin('companyUser.user', 'user')
      .innerJoin('companyUser.company', 'company')
      .leftJoin('company.signature', 'signature')
      .andWhere('user.id = :userId', { userId: user.id })
      .andWhere('companyUser.status = :status', { status: EntityStatus.ACTIVE })
      .andWhere('company.status = :status', { status: EntityStatus.ACTIVE })
      .getMany();

    const time = searchScrollParameter.filters.time;
    const date = new Date();
    const types = searchScrollParameter.filters.types?.toLowerCase();
    const rangeTime = {};
    let fields = [];

    switch (types.toLowerCase()) {
      case 'customers':
        fields = ['customers_fields']; //* fields_1
        break;
      case 'messages':
        fields = ['text', 'attachments.name']; //* fields_2
        break;
      case 'users':
        fields = ['users_fields']; //* fields_3
        break;
      default:
        fields = ['text', 'attachments.name']; //* mix fields_1  fields_2  fields_3
        break;
    }
    switch (time.toLowerCase()) {
      case 'past hour':
        date.setHours(date.getHours() - 1);
        rangeTime['gte'] = date.toISOString();
        break;
      case 'past 24 hours':
        date.setHours(date.getHours() - 24);
        rangeTime['gte'] = date.toISOString();
        break;
      case 'last week':
        const day = date.getDay();
        const sunday = date.getDate() - day; // get sunday
        const timeEnd = new Date(date.setDate(sunday));
        const timeStart = new Date(date.setDate(timeEnd.getDate() - 6));
        rangeTime['gte'] = timeStart;
        rangeTime['lte'] = timeEnd;
        break;
      case 'last month':
        const firstDate = new Date(date.getFullYear(), date.getMonth() - 1, 1)
          .toISOString()
          .slice(0, 10);
        const lastDate = new Date(date.getFullYear(), date.getMonth(), 0)
          .toISOString()
          .slice(0, 10);
        rangeTime['gte'] = firstDate;
        rangeTime['lte'] = lastDate;
        break;
      case 'last year':
        const lastDateOfYear = new Date(date.getFullYear() - 1, 11, 31)
          .toISOString()
          .slice(0, 10);
        const firstDateOfYear = new Date(date.getFullYear() - 1, 0, 1)
          .toISOString()
          .slice(0, 10);
        rangeTime['gte'] = firstDateOfYear;
        rangeTime['lte'] = lastDateOfYear;
        break;

      default:
        rangeTime['gte'] = null;
        break;
    }

    const searchData: Search = {
      index: types === 'all' ? '*' : types,
      scroll: '5m',
      body: {
        size: searchScrollParameter.size || 10,
        sort: [
          {
            creationTime: { order: 'desc', unmapped_type: 'date' },
          },
        ],
        query: {
          bool: {
            must: [
              {
                multi_match: {
                  query: searchScrollParameter.searchValue,
                  type: 'phrase_prefix',
                  fields: fields,
                  slop: 4,
                },
              },
              {
                range: {
                  creationTime: rangeTime,
                },
              },
            ],
            filter: {
              terms: {
                'conversations.company_customers.companies.code': [
                  ...companies.map((item) => item.company.code),
                ],
              },
            },
          },
          //TODO handle query string
        },
        highlight: {
          //* highlight term
          fields: <HighLightDto>{
            text: {},
            'attachments.name': {},
          },
        },
      },
    };

    const [data, error] = await trycat(
      this._esSearchService.searchScrollDoc(searchData),
    );
    if (searchScrollParameter.scroll.scroll_id) {
      await trycat(
        this._esSearchService.clearScroll([
          searchScrollParameter.scroll.scroll_id,
        ]),
      );
    }
    if (!error) return data;
    throw new HttpException(error, HttpStatus.INTERNAL_SERVER_ERROR);
  }

  public async scroll(searchScrollParameter: SearchScrollParameter) {
    if (searchScrollParameter.scroll) {
      const searchData: Scroll = searchScrollParameter.scroll;

      const [data, error] = await trycat(
        this._esSearchService.scrollDoc(searchData),
      );
      await new Promise((r) => setTimeout(r, 1000));
      if (!error) return data;
      throw new HttpException(error, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  public async clearScroll(scroll_ids: string[]) {
    if (scroll_ids?.length > 0) {
      const [data, error] = await trycat(
        this._esSearchService.clearScroll(scroll_ids),
      );
      if (!error) return data;
      throw new HttpException(error, HttpStatus.INTERNAL_SERVER_ERROR);
    }
    return;
  }

  private async handleAttachments(attachments: Array<any>) {
    try {
      //* upload to s3
      if (attachments.length < 1) return;
      const uploadAttachments = attachments.map((file) => {
        const dimension = probe.sync(file.buffer);
        const fileInfo: UploadAttachmentDto = {
          fileName: file.originalname,
          type: file.mimetype,
          data: file.buffer,
          width: dimension ? dimension.width : null,
          height: dimension ? dimension.height : null,
        };
        return this._awsS3.uploadFilePreSignUrl(fileInfo);
      });

      const infoUploadedAttachments = (
        await Promise.all(uploadAttachments)
      ).map((attachment, index) => ({
        url: attachment['config'].url.slice(
          0,
          attachment['config'].url.indexOf('?'),
        ),
        type: attachments[index].mimetype,
        name: attachments[index].originalname,
        size: convertFileSize(attachment['config'].data.byteLength),
        height: attachment['height'],
        width: attachment['width'],
      }));
      return infoUploadedAttachments;
    } catch (error) {
      this.logger.error(error);
      throw new InternalServerErrorException();
    }
  }

  async checkSoftPhone(data) {
    const { message } = data;
    return !!!(await this.messageRepository.findOne({
      where: {
        exId: message.exId,
        status: Not(EntityStatus.DELETE),
      },
    }));
  }

  async getMessages() {
    return await this.messageRepository.find({});
  }

  async getInfoPaginationMessagesInConversation(conversationId: any) {
    try {
      const latest = await getManager()
        .createQueryBuilder(Message, 'message')
        .select('MAX(message.index)', 'latest')
        .innerJoin('message.conversation', 'conversation')
        .where('conversation.id = :conversationId', { conversationId })
        .getRawOne();
      const oldest = await getManager()
        .createQueryBuilder(Message, 'message')
        .select('MIN(message.index)', 'oldest')
        .innerJoin('message.conversation', 'conversation')
        .where('conversation.id = :conversationId', { conversationId })
        .getRawOne();
      return {
        pagination: {
          latest: latest.latest,
          oldest: oldest.oldest,
        },
      };
    } catch (error) {
      this.logger.error(error);
      throw new InternalServerErrorException();
    }
  }

  async getMessagesInConversation(
    conversationId: any,
    currentMessages: number,
    limitMessageInConversations: any,
  ) {
    try {
      const messagesInConversation = await getManager()
        .createQueryBuilder(Message, 'message')
        .leftJoinAndSelect('message.creationUserId', 'user')
        .leftJoinAndSelect('message.attachments', 'attachments')
        .innerJoinAndSelect('message.conversation', 'conversation')
        .leftJoinAndSelect('message.call', 'call')
        .andWhere('conversation.id = :conversationId', { conversationId })
        .orderBy('message.index', 'DESC')
        .skip(currentMessages)
        .take(limitMessageInConversations)
        .getMany();
      const countMessages = await getManager()
        .createQueryBuilder(Message, 'message')
        .leftJoinAndSelect('message.creationUserId', 'user')
        .leftJoinAndSelect('message.attachments', 'attachments')
        .innerJoinAndSelect('message.conversation', 'conversation')
        .andWhere('conversation.id = :conversationId', { conversationId })
        .orderBy('message.index', 'DESC')
        .getCount();
      messagesInConversation;
      return { data: messagesInConversation, total: countMessages };
    } catch (error) {
      this.logger.error(error);
      throw new InternalServerErrorException();
    }
  }

  async lazyLoadMessagesInConversation(
    conversationId: any,
    topBoundary: number,
    botBoundary: number,
  ) {
    const query = await getManager()
      .createQueryBuilder(Message, 'message')
      .leftJoinAndSelect('message.creationUserId', 'user')
      .leftJoinAndSelect('message.attachments', 'attachments')
      .innerJoin('message.conversation', 'conversation')
      .where('conversation.id = :conversationId', { conversationId })
      .take(15);
    const oldest = await getManager()
      .createQueryBuilder(Message, 'message')
      .select('MIN(message.index)', 'oldest')
      .innerJoin('message.conversation', 'conversation')
      .where('conversation.id = :conversationId', { conversationId })
      .getRawOne();
    const latest = await getManager()
      .createQueryBuilder(Message, 'message')
      .select('MAX(message.index)', 'latest')
      .innerJoin('message.conversation', 'conversation')
      .where('conversation.id = :conversationId', { conversationId })
      .getRawOne();
    if (topBoundary) {
      query
        .andWhere('message.index < :index', { index: topBoundary })
        .orderBy('message.index', 'DESC');
      const data = await query.getMany();
      await new Promise((r) => setTimeout(r, 2000));
      return {
        pagination: {
          latest: latest.latest,
          oldest: oldest.oldest,
        },
        messages: data.reverse(),
      };
    } else if (botBoundary) {
      query
        .andWhere('message.index > :index', { index: botBoundary })
        .orderBy('message.index', 'ASC');
      const data = await query.getMany();
      await new Promise((r) => setTimeout(r, 2000));

      return {
        pagination: {
          latest: latest.latest,
          oldest: oldest.oldest,
        },
        messages: data,
      };
    }
  }

  async jumpToMessageInConversation(conversationId: string, messageId: string) {
    const infoMessage = await getManager()
      .createQueryBuilder(Message, 'message')
      .leftJoinAndSelect('message.creationUserId', 'user')
      .leftJoinAndSelect('message.attachments', 'attachments')
      .innerJoinAndSelect('message.conversation', 'conversation')
      .where('message.id = :messageId', { messageId })
      .getOne();
    const delta = 15;
    const oldest = await getManager()
      .createQueryBuilder(Message, 'message')
      .select('MIN(message.index)', 'oldest')
      .innerJoin('message.conversation', 'conversation')
      .where('conversation.id = :conversationId', { conversationId })
      .getRawOne();
    const latest = await getManager()
      .createQueryBuilder(Message, 'message')
      .select('MAX(message.index)', 'latest')
      .innerJoin('message.conversation', 'conversation')
      .where('conversation.id = :conversationId', { conversationId })
      .getRawOne();

    const beforeMessages = await getManager()
      .createQueryBuilder(Message, 'message')
      .leftJoinAndSelect('message.creationUserId', 'user')
      .leftJoinAndSelect('message.attachments', 'attachments')
      .innerJoinAndSelect('message.conversation', 'conversation')
      .where('conversation.id = :conversationId', { conversationId })
      .andWhere('message.index < :index', { index: infoMessage.index })
      .orderBy('message.index', 'DESC')
      .take(delta)
      .getMany();
    const afterMessages = await getManager()
      .createQueryBuilder(Message, 'message')
      .leftJoinAndSelect('message.creationUserId', 'user')
      .leftJoinAndSelect('message.attachments', 'attachments')
      .innerJoinAndSelect('message.conversation', 'conversation')
      .where('conversation.id = :conversationId', { conversationId })
      .andWhere('message.index > :index', { index: infoMessage.index })
      .orderBy('message.index', 'ASC')
      .take(delta)
      .getMany();
    await new Promise((r) => setTimeout(r, 2000));
    return {
      messages: [...beforeMessages.reverse(), infoMessage, ...afterMessages],
      pagination: {
        latest: latest.latest,
        oldest: oldest.oldest,
      },
    };
  }

  async createOutboundMessage(data: any): Promise<any> {
    const queryRunner = this.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const sender = data.request.sender;
      const message: CreateMessageDto = data.request.message;

      const infoConversation = await this.conversationsService.getConversation(
        message.conversationId,
      );
      const infoCompany = await this.companyRepository.findOne({
        where: {
          code: message.companyCode,
          status: Not(EntityStatus.DELETE),
        },
        relations: ['signature'],
      });
      if (!infoConversation)
        throw new NotFoundException('Not found conversation');

      const infoUserCreate = await this.usersService.getUser(sender.id);
      if (!infoUserCreate) throw new NotFoundException('Not found user');

      if (!infoCompany) throw new NotFoundException('Not found company');

      const newMessage = new Message();
      newMessage.creationUserId = infoUserCreate;
      newMessage.lastModifiedUserId = infoUserCreate;
      newMessage.conversation = infoConversation;
      newMessage.direction = MessageDirection.OUTBOUND;
      newMessage.mode = MessageMode.NORMAL;
      newMessage.text = message.text;

      if (data.request.signature) {
        newMessage.text =
          message.text.trim() !== ''
            ? data.request.message.userSignature
              ? message.text +
                '\n' +
                data.request.sender.name +
                ' - ' +
                data.request.signature.value
              : message.text + '\n' + data.request.signature.value
            : data.request.signature.value;
      } else {
        newMessage.text = data.request.message.userSignature
          ? message.text + '\n' + data.request.sender.name
          : newMessage.text;
      }
      newMessage.messageStatus = InternalStatus.SENDING;
      newMessage.companyCode = message.companyCode;
      const infoMessageAfterCreate = await queryRunner.manager.save(newMessage);

      //* store url attachments
      const storeAttachments = message.attachments.map((attachment) => {
        const newAttachment = new Attachment();
        newAttachment.url = attachment.url;
        newAttachment.name = attachment.name;
        newAttachment.category = attachment.type.split('/')[0];
        newAttachment.format = attachment.type.split('/')[1];
        newAttachment.size = attachment.size.split(' ')[0];
        newAttachment.message = infoMessageAfterCreate;
        newAttachment.width = attachment.width;
        newAttachment.height = attachment.height;

        return queryRunner.manager.save(newAttachment);
      });
      const infoAttachments = await Promise.all(storeAttachments);

      //* update last message for conversation
      await this.conversationsService.updateLastMessageAndUser(
        infoConversation.id,
        {
          lastMessage: infoMessageAfterCreate,
          lastUser: infoUserCreate,
        },
        queryRunner.manager,
      );

      const infoCompanyCustomer = await this.companyCustomerRepository.findOne({
        where: {
          conversation: infoConversation.id,
        },
        relations: ['customer'],
      });
      if (!infoCompanyCustomer)
        throw new NotFoundException('Not found customer');

      //* send message to ringcentral
      const messageToRingCentral: MessageDto = {
        text: infoMessageAfterCreate.text,
        attachments: infoAttachments.map((item) => ({
          url: item.url,
          contentType: item.category + '/' + item.format,
        })),
        phoneFrom: infoCompany.phone,
        phoneTo: infoCompanyCustomer.customer.phoneNumber,
        id: infoMessageAfterCreate.id,
        serviceToken: createConcretesKey(
          `${infoCompany.clientId}${infoCompany.clientSecret}${infoCompany.username}${infoCompany.password}`,
        ),
      };

      await queryRunner.commitTransaction();
      this._ringcentralService.sendMessage(messageToRingCentral);
      const dataMessage = {
        ...infoMessageAfterCreate,
        attachments: infoAttachments,
      };

      return dataMessage;
    } catch (error) {
      this.logger.error(error);
      await queryRunner.rollbackTransaction();
      throw new InternalServerErrorException('createOutboundMessage');
    } finally {
      await queryRunner.release();
    }
  }

  async createComposeMessages(
    createComposeMessageDto: CreateComposeMessageDto,
    user: any,
    files: any,
  ): Promise<any> {
    const queryRunner = this.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const {
        message,
        customerPhones,
        companyId,
        signatureId,
        personalSignature,
      } = createComposeMessageDto;
      const parsePersonalSignature = JSON.parse(personalSignature.toString());
      let signature;
      if (signatureId) {
        signature = await this.signatureRepository.findOne({
          where: {
            id: signatureId,
            status: EntityStatus.ACTIVE,
          },
        });
      }
      const infoCompany = await getManager()
        .createQueryBuilder(Company, 'company')
        .leftJoinAndSelect('company.signature', 'signature')
        .andWhere('company.id = :companyId and company.status != :status', {
          companyId: companyId,
          status: EntityStatus.DELETE,
        })
        .getOne();
      if (!infoCompany) throw new NotFoundException('Not found company');

      const customers = await this.customersService.getCustomers();

      //* get all customers in company
      const companyCustomers = await getManager()
        .createQueryBuilder(CompanyCustomer, 'companyCustomer')
        .innerJoinAndSelect('companyCustomer.company', 'company')
        .innerJoinAndSelect('companyCustomer.customer', 'customer')
        .innerJoinAndSelect('companyCustomer.conversation', 'conversation')
        .andWhere('company.id = :companyId', {
          companyId: infoCompany.id,
        })
        .andWhere('customer.status != :status', {
          status: EntityStatus.DELETE,
        })
        .andWhere('conversation.status != :status', {
          status: EntityStatus.DELETE,
        })
        .andWhere('companyCustomer.status != :status', {
          status: EntityStatus.DELETE,
        })
        .getMany();

      //* filter duplicate phone number
      const uniquePhones = customerPhones.filter(
        (phone, index) => customerPhones.indexOf(phone) === index,
      );
      const uniquePhonesLength = uniquePhones.length;

      //* two-dimensional array  [ [messageOfUserA, messageOfUserA], [messageOfUserB, messageOfUserB]]
      const groupByCustomerInCompanyMessages = [];
      const groupByNewCustomerMessages = [];

      const listNewConversations = [];
      //* two-dimensional array  [ [attachmentsOfMessageA, attachmentsOfMessageA], [attachmentsOfMessageB, attachmentsOfMessageB]]
      const attachmentsOfMessage = [];

      for (let i = 0; i < uniquePhonesLength; i++) {
        const infoCustomer = customers.find(
          (customer) => customer.phoneNumber === uniquePhones[i],
        );
        //* ----------- new customer in system------------
        if (!infoCustomer) {
          const numberOfPhones = customerPhones.filter(
            (phone) => uniquePhones[i] === phone,
          );
          const listCompanyCustomers =
            await this.customersService.createCustomer(
              //* ex: [ {companyCustomer: {}', participants:[]} ]
              {
                companyCustomers: [
                  {
                    status: EntityStatus.ACTIVE,
                    companyId: infoCompany.id,
                  },
                ],
                fullName: '',
                emailAddress: '',
                phoneNumber: uniquePhones[i],
                status: EntityStatus.ACTIVE,
              },
              queryRunner.manager,
              numberOfPhones.length,
              false,
              user,
              MessageDirection.OUTBOUND,
            );
          //* count the number of a phone numbers

          //* create the number of messages corresponding to the number of phone numbers
          const createMessages = numberOfPhones.map(async () => {
            const newMessage = new Message();
            newMessage.creationUserId = user;
            newMessage.lastModifiedUserId = user.id;
            newMessage.text = message;
            newMessage.messageStatus = InternalStatus.SENDING;
            if (signature) {
              newMessage.text =
                message.trim() !== ''
                  ? parsePersonalSignature
                    ? message +
                      '\n' +
                      user.firstName +
                      ' ' +
                      user.lastName +
                      ' - ' +
                      signature.value
                    : message + '\n' + signature.value
                  : '';
            } else {
              newMessage.text =
                message.trim() !== ''
                  ? parsePersonalSignature
                    ? message + '\n' + user.firstName + ' ' + user.lastName
                    : message
                  : '';
            }

            newMessage.conversation =
              listCompanyCustomers[0].companyCustomer.conversation;
            newMessage.direction = MessageDirection.OUTBOUND;
            newMessage.companyCode = infoCompany.code;
            const createdMessage = await queryRunner.manager.save(newMessage);
            if (files.length > 0) {
              const infoUploadedAttachments = await this.handleAttachments(
                files,
              );
              //* store attachment into db
              const storeAttachments = infoUploadedAttachments.map(
                (attachment) => {
                  const newAttachment = new Attachment();
                  newAttachment.url = attachment.url;
                  newAttachment.name = attachment.name;
                  newAttachment.category = attachment.type.split('/')[0];
                  newAttachment.format = attachment.type.split('/')[1];
                  newAttachment.size = +attachment.size.split(' ')[0];
                  newAttachment.message = createdMessage;
                  newAttachment.height = attachment.height;
                  newAttachment.width = attachment.height;
                  return queryRunner.manager.save(newAttachment);
                },
              );
              attachmentsOfMessage.push(await Promise.all(storeAttachments));
            }

            return createdMessage;
          });
          const createdMessages = await Promise.all(createMessages);

          const infoConversation = await queryRunner.manager.findOne(
            Conversation,
            listCompanyCustomers[0].companyCustomer.conversation.id,
          );
          //* update last message
          infoConversation.lastMessage =
            createdMessages[createdMessages.length - 1];
          infoConversation.lastUser = user;
          await queryRunner.manager.save(infoConversation);

          await this.notificationService.pushNotify(
            {
              entityId: listCompanyCustomers[0].companyCustomer.customer.id,
              notificationTypeId: NotificationType.NEW_CLIENT_BY_USER,
              creator: user,
              company: infoCompany,
            },
            queryRunner,
          );

          const infoConversationToRealTime = {
            conversation: {
              ...infoConversation,
              company: listCompanyCustomers[0].companyCustomer.company.code,
              customer: {
                ...listCompanyCustomers[0].companyCustomer.customer,
                companies: [
                  listCompanyCustomers[0].companyCustomer.company.name,
                ],
              },
              lastMessage: {
                text: createdMessages[0].text,
                creationTime: createdMessages[0].creationTime,
                direction: MessageDirection.OUTBOUND,
                exCreationTime: createdMessages[0].exCreationTime,
                messagesStatus: createdMessages[0].messageStatus,
                exMessageStatus: createdMessages[0].exMessageStatus,
                mode: createdMessages[0].mode,
                status: createdMessages[0].status,
                type: createdMessages[0].type,
              },
              lastUser: {
                id: createdMessages[0].creationUserId.id,
                name:
                  createdMessages[0].creationUserId.firstName +
                  ' ' +
                  createdMessages[0].creationUserId.lastName,
                email: createdMessages[0].creationUserId.email,
                avatar: createdMessages[0].creationUserId.avatar,
              },
              messages: createdMessages.map(
                (infoMessageAfterCreate, index) => ({
                  id: infoMessageAfterCreate.id,
                  text: infoMessageAfterCreate.text,
                  attachments: attachmentsOfMessage[index]
                    ? attachmentsOfMessage[index]
                    : [],
                  sender: user,
                  direction: MessageDirection.OUTBOUND,
                  creationTime: infoMessageAfterCreate.creationTime,
                  exCreationTime: infoMessageAfterCreate.exCreationTime,
                  messagesStatus: infoMessageAfterCreate.messageStatus,
                  exMessageStatus: infoMessageAfterCreate.exMessageStatus,
                  conversationId: infoMessageAfterCreate.conversation.id,
                  index: infoMessageAfterCreate.index,
                }),
              ),

              participants: listCompanyCustomers[0].participants,
            },
          };
          listNewConversations.push(infoConversationToRealTime);

          groupByNewCustomerMessages.push(
            createdMessages.map((message, index) => {
              return {
                ...message,
                attachments: attachmentsOfMessage[index]
                  ? attachmentsOfMessage[index]
                  : [],
                participants: listCompanyCustomers[0].participants,
                phoneTo: uniquePhones[i],
              };
            }),
          );
        } else {
          //* ----------- exist customer------------
          const infoCompanyCustomer = companyCustomers.find(
            (companyCustomers) =>
              companyCustomers.customer.id === infoCustomer.id,
          );

          //*------------- new customer in current company-------------
          if (!infoCompanyCustomer) {
            const companyCustomer: CreateCompanyCustomerDto = {
              companyId: infoCompany.id,
              status: EntityStatus.ACTIVE,
            };
            //* add customer to company
            const numberOfPhones = customerPhones.filter(
              (phone) => uniquePhones[i] === phone,
            );
            const addedCompanyCustomer =
              await this.customersService.addCustomerToCompany(
                infoCustomer,
                companyCustomer,
                queryRunner.manager,
                numberOfPhones.length, //*umn
                user,
                MessageDirection.OUTBOUND,
              ); //* ex: { companyCustomer: {}, participants: []}

            //* count the number of a phone numbers

            //* create the number of messages corresponding to the number of phone numbers
            const createMessages = numberOfPhones.map(async () => {
              const newMessage = new Message();
              newMessage.creationUserId = user;
              newMessage.lastModifiedUserId = user.id;
              newMessage.text = message;
              newMessage.messageStatus = InternalStatus.SENDING;
              if (signature) {
                newMessage.text =
                  message.trim() !== ''
                    ? parsePersonalSignature
                      ? message +
                        '\n' +
                        user.firstName +
                        ' ' +
                        user.lastName +
                        ' - ' +
                        signature.value
                      : message + '\n' + signature.value
                    : '';
              } else {
                newMessage.text =
                  message.trim() !== ''
                    ? parsePersonalSignature
                      ? message + '\n' + user.firstName + ' ' + user.lastName
                      : message
                    : '';
              }
              newMessage.conversation =
                addedCompanyCustomer.companyCustomer.conversation;
              newMessage.direction = MessageDirection.OUTBOUND;
              newMessage.companyCode = infoCompany.code;
              const createdMessage = await queryRunner.manager.save(newMessage);
              if (files.length > 0) {
                const infoUploadedAttachments = await this.handleAttachments(
                  files,
                );
                //* store attachment into db
                const storeAttachments = infoUploadedAttachments.map(
                  (attachment) => {
                    const newAttachment = new Attachment();
                    newAttachment.url = attachment.url;
                    newAttachment.name = attachment.name;
                    newAttachment.category = attachment.type.split('/')[0];
                    newAttachment.format = attachment.type.split('/')[1];
                    newAttachment.size = +attachment.size.split(' ')[0];
                    newAttachment.message = createdMessage;
                    newAttachment.height = attachment.height;
                    newAttachment.width = attachment.height;
                    return queryRunner.manager.save(newAttachment);
                  },
                );
                attachmentsOfMessage.push(await Promise.all(storeAttachments));
              }

              return createdMessage;
            });
            const createdMessages = await Promise.all(createMessages);
            //* find conversation from transaction, because data is not stored in db
            const infoConversation = await queryRunner.manager.findOne(
              Conversation,
              addedCompanyCustomer.companyCustomer.conversation.id,
            );
            //* update last message
            infoConversation.lastMessage =
              createdMessages[createdMessages.length - 1];
            infoConversation.lastUser = user;
            await queryRunner.manager.save(infoConversation);

            await this.notificationService.pushNotify(
              {
                entityId: addedCompanyCustomer.companyCustomer.customer.id,
                notificationTypeId: NotificationType.NEW_CLIENT_BY_USER,
                creator: user,
                company: infoCompany,
              },
              queryRunner,
            );
            const infoConversationToRealTime = {
              conversation: {
                ...infoConversation,
                company: addedCompanyCustomer.companyCustomer.company.code,
                customer: {
                  ...addedCompanyCustomer.companyCustomer.customer,
                  companies: [
                    addedCompanyCustomer.companyCustomer.company.name,
                  ],
                },
                lastMessage: {
                  text: createdMessages[0].text,
                  creationTime: createdMessages[0].creationTime,
                  direction: MessageDirection.OUTBOUND,
                  exCreationTime: createdMessages[0].exCreationTime,
                  messagesStatus: createdMessages[0].messageStatus,
                  exMessageStatus: createdMessages[0].exMessageStatus,
                  mode: createdMessages[0].mode,
                  status: createdMessages[0].status,
                  type: createdMessages[0].type,
                },
                lastUser: {
                  id: createdMessages[0].creationUserId.id,
                  name:
                    createdMessages[0].creationUserId.firstName +
                    ' ' +
                    createdMessages[0].creationUserId.lastName,
                  email: createdMessages[0].creationUserId.email,
                  avatar: createdMessages[0].creationUserId.avatar,
                },
                messages: createdMessages.map(
                  (infoMessageAfterCreate, index) => ({
                    id: infoMessageAfterCreate.id,
                    text: infoMessageAfterCreate.text,
                    attachments: attachmentsOfMessage[index]
                      ? attachmentsOfMessage[index]
                      : [],
                    sender: user,
                    direction: MessageDirection.OUTBOUND,
                    creationTime: infoMessageAfterCreate.creationTime,
                    exCreationTime: infoMessageAfterCreate.exCreationTime,
                    messagesStatus: infoMessageAfterCreate.messageStatus,
                    exMessageStatus: infoMessageAfterCreate.exMessageStatus,
                    conversationId: infoMessageAfterCreate.conversation.id,
                    index: infoMessageAfterCreate.index,
                  }),
                ),

                participants: addedCompanyCustomer.participants,
              },
            };

            listNewConversations.push(infoConversationToRealTime);

            groupByNewCustomerMessages.push(
              createdMessages.map((message, index) => {
                return {
                  ...message,
                  attachments: attachmentsOfMessage[index]
                    ? attachmentsOfMessage[index]
                    : [],
                  participants: addedCompanyCustomer.participants,
                  phoneTo: uniquePhones[i],
                };
              }),
            );
          } else {
            //*------------- exist customer in current company-------------
            //* count the number of a phone numbers
            //* update infoCompanyCustomer to active
            const numberOfPhones = customerPhones.filter(
              (phone) => infoCompanyCustomer.customer.phoneNumber === phone,
            );
            if (infoCompanyCustomer.status === EntityStatus.INACTIVE) {
              infoCompanyCustomer.status = EntityStatus.ACTIVE;
              await queryRunner.manager.save(infoCompanyCustomer);
            }
            const attendances = (
              await this.participantRepository.find({
                where: {
                  conversation: infoCompanyCustomer.conversation.id,
                  status: EntityStatus.ACTIVE,
                },
                relations: ['companyUser', 'companyUser.user'],
              })
            ).filter((item) => item.companyUser.status === EntityStatus.ACTIVE);

            const updateUmnPromise = attendances.map((participant) => {
              if (participant.companyUser.user.id !== user.id) {
                participant.umn += numberOfPhones.length;
                participant.readStatus = ReadStatus.UNREAD;
              }
              return queryRunner.manager.save(participant);
            });
            await Promise.all(updateUmnPromise);
            //* create the number of messages corresponding to the number of phone numbers
            const createMessages = numberOfPhones.map(async () => {
              const newMessage = new Message();
              newMessage.creationUserId = user;
              newMessage.lastModifiedUserId = user.id;
              newMessage.text = message;
              newMessage.messageStatus = InternalStatus.SENDING;
              if (signature) {
                newMessage.text =
                  message.trim() !== ''
                    ? parsePersonalSignature
                      ? message +
                        '\n' +
                        user.firstName +
                        ' ' +
                        user.lastName +
                        ' - ' +
                        signature.value
                      : message + '\n' + signature.value
                    : '';
              } else {
                newMessage.text =
                  message.trim() !== ''
                    ? parsePersonalSignature
                      ? message + '\n' + user.firstName + ' ' + user.lastName
                      : message
                    : '';
              }
              newMessage.conversation = infoCompanyCustomer.conversation;
              newMessage.direction = MessageDirection.OUTBOUND;
              newMessage.companyCode = infoCompany.code;
              const createdMessage = await queryRunner.manager.save(newMessage);
              if (files.length > 0) {
                const infoUploadedAttachments = await this.handleAttachments(
                  files,
                );
                //* store attachment into db
                const storeAttachments = infoUploadedAttachments.map(
                  (attachment) => {
                    const newAttachment = new Attachment();
                    newAttachment.url = attachment.url;
                    newAttachment.name = attachment.name;
                    newAttachment.category = attachment.type.split('/')[0];
                    newAttachment.format = attachment.type.split('/')[1];
                    newAttachment.size = +attachment.size.split(' ')[0];
                    newAttachment.message = createdMessage;
                    newAttachment.height = attachment.height;
                    newAttachment.width = attachment.height;
                    return queryRunner.manager.save(newAttachment);
                  },
                );
                attachmentsOfMessage.push(await Promise.all(storeAttachments));
              }

              return createdMessage;
            });
            const createdMessages = await Promise.all(createMessages);
            //* update last message
            await this.conversationsService.updateLastMessageAndUser(
              infoCompanyCustomer.conversation.id,
              {
                lastMessage: createdMessages[createdMessages.length - 1],
                lastUser: user,
              },
              queryRunner.manager,
            );
            const participants =
              await this.participantService.getUsersInConversation(
                createdMessages[0].conversation.id,
                queryRunner,
              );
            groupByCustomerInCompanyMessages.push(
              createdMessages.map((message, index) => {
                return {
                  ...message,
                  attachments: attachmentsOfMessage[index]
                    ? attachmentsOfMessage[index]
                    : [],
                  participants: participants,
                  phoneTo: uniquePhones[i],
                };
              }),
            );
          }
        }
      }
      //* convert to one-dimensional array
      const newCustomerMessages = groupByNewCustomerMessages.reduce(
        (total, item) => {
          return [...total, ...item];
        },
        [],
      );
      const customerInCompanyMessages = groupByCustomerInCompanyMessages.reduce(
        (total, item) => {
          return [...total, ...item];
        },
        [],
      );
      const combinedMessages = [
        ...newCustomerMessages,
        ...customerInCompanyMessages,
      ];
      if (listNewConversations.length > 0)
        this._realTimeService.createOutboundListMessagesToNewCustomer(
          listNewConversations,
        );
      this._realTimeService.createOutboundListMessages(
        customerInCompanyMessages,
      );

      await queryRunner.commitTransaction();

      for (let i = 0; i < combinedMessages.length; i++) {
        const messageToRingCentral: MessageDto = {
          text: combinedMessages[i].text,
          attachments: combinedMessages[i].attachments
            ? combinedMessages[i].attachments.map((item) => ({
                url: item.url,
                contentType: item.category + '/' + item.format,
              }))
            : [],
          phoneFrom: infoCompany.phone,
          phoneTo: combinedMessages[i].phoneTo,
          id: combinedMessages[i].id,
          serviceToken: createConcretesKey(
            `${infoCompany.clientId}${infoCompany.clientSecret}${infoCompany.username}${infoCompany.password}`,
          ),
        };
        this._ringcentralService.sendMessage(messageToRingCentral);
      }
    } catch (error) {
      this.logger.error(error);
      await queryRunner.rollbackTransaction();
      throw new InternalServerErrorException();
    } finally {
      await queryRunner.release();
    }
  }

  async sendScheduleMessage(messageSet: any): Promise<any> {
    const queryRunner = this.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    const infoMessageSet = await getManager()
      .createQueryBuilder(MessageSet, 'messageSet')
      .innerJoinAndSelect('messageSet.scheduleMessage', 'scheduleMessage')
      .innerJoinAndSelect('scheduleMessage.company', 'company')
      .innerJoinAndSelect('scheduleMessage.campaign', 'campaign')
      .where('messageSet.id = :messageSetId', {
        messageSetId: messageSet.messageSetId,
      })
      .getOne();
    const user = await getManager()
      .createQueryBuilder(User, 'user')
      .where('user.id = :senderId', {
        senderId: infoMessageSet.creationUserId,
      })
      .getOne();

    const totalMessageSets = await getManager()
      .createQueryBuilder(MessageSet, 'messageSet')
      .innerJoin('messageSet.scheduleMessage', 'scheduleMessage')
      .where('scheduleMessage.id = :scheduleMessageId', {
        scheduleMessageId: infoMessageSet.scheduleMessage.id,
      })
      .getCount();
    try {
      if (messageSet.status === 'error') {
        await getManager()
          .createQueryBuilder()
          .update(ScheduleMessage)
          .set({ isIssue: true })
          .where('id = :id', { id: infoMessageSet.scheduleMessage.id })
          .execute();

        infoMessageSet.messageSetStatus = MessageSetStatus.ERROR;
      } else {
        if (messageSet.status === 'late') {
          await getManager()
            .createQueryBuilder()
            .update(ScheduleMessage)
            .set({ sendStatus: ScheduleMessageStatus.TIMEOUT })
            .where('id = :id', { id: infoMessageSet.scheduleMessage.id })
            .execute();
          await getManager()
            .createQueryBuilder()
            .update(MessageSet)
            .set({ messageSetStatus: MessageSetStatus.LATE })
            .where(
              'scheduleMessage = :scheduleMessageId and messageSetStatus != :messageSetStatus',
              {
                scheduleMessageId: infoMessageSet.scheduleMessage.id,
                messageSetStatus: MessageSetStatus.WAITING,
              },
            )
            .execute();
        } else {
          if (messageSet.status === 'last') {
            if (infoMessageSet.scheduleMessage.isCronExpression) {
              await getManager()
                .createQueryBuilder()
                .update(ScheduleMessage)
                .set({ sendStatus: ScheduleMessageStatus.WAITING })
                .where('id = :id', { id: infoMessageSet.scheduleMessage.id })
                .execute();
            } else {
              await getManager()
                .createQueryBuilder()
                .update(ScheduleMessage)
                .set({ sendStatus: ScheduleMessageStatus.DONE })
                .where('id = :id', { id: infoMessageSet.scheduleMessage.id })
                .execute();
            }
          }
          infoMessageSet.messageSetStatus = MessageSetStatus.SENDING;
          const user = await getManager()
            .createQueryBuilder(User, 'user')
            .where('user.id = :senderId', {
              senderId: infoMessageSet.creationUserId,
            })
            .getOne();

          const customerPhone = infoMessageSet.customerPhone;

          const infoCompany = infoMessageSet.scheduleMessage.company;

          let message = infoMessageSet.content;
          for (const key in infoMessageSet.customFields) {
            if (
              Object.prototype.hasOwnProperty.call(
                infoMessageSet.customFields,
                key,
              )
            ) {
              const value = infoMessageSet.customFields[key];
              message = message.replace(new RegExp(`{${key}}`, 'gi'), value);
            }
          }

          const attachments = infoMessageSet.scheduleMessage.attachmentUrls;

          const infoCustomer = await this.customersRepository.findOne({
            where: {
              phoneNumber: customerPhone,
            },
          });
          //* ----------- new customer in system------------
          if (!infoCustomer) {
            const listCompanyCustomers =
              await this.customersService.createCustomer(
                //* ex: [ {companyCustomer: {}', participants:[]} ]
                {
                  companyCustomers: [
                    {
                      status: EntityStatus.ACTIVE,
                      companyId: infoCompany.id,
                    },
                  ],
                  fullName: '',
                  emailAddress: '',
                  phoneNumber: customerPhone,
                  status: EntityStatus.ACTIVE,
                },
                queryRunner.manager,
                1,
                false,
                user,
                MessageDirection.OUTBOUND,
              );
            const newMessage = new Message();
            newMessage.creationUserId = user;
            newMessage.lastModifiedUserId = user;
            newMessage.text = message;
            newMessage.conversation =
              listCompanyCustomers[0].companyCustomer.conversation;
            newMessage.direction = MessageDirection.OUTBOUND;
            newMessage.companyCode = infoCompany.code;
            newMessage.mode = MessageMode.SCHEDULE;
            newMessage.messageStatus = InternalStatus.SENDING;
            newMessage.campaign = infoMessageSet.scheduleMessage.campaign;
            const createdMessage = await queryRunner.manager.save(newMessage);

            infoMessageSet.messageSetStatus = MessageSetStatus.SENDING;
            infoMessageSet.message = newMessage;
            infoMessageSet.customer =
              listCompanyCustomers[0].companyCustomer.customer;
            await queryRunner.manager.save(infoMessageSet);

            const storeAttachments = attachments.map((attachment) => {
              const newAttachment = new Attachment();
              newAttachment.url = attachment['url'];
              newAttachment.name = attachment['name'];
              newAttachment.category = attachment['type'].split('/')[0];
              newAttachment.format = attachment['type'].split('/')[1];
              newAttachment.size = attachment['size'];
              newAttachment.message = createdMessage;
              newAttachment.width = attachment['width'];
              newAttachment.height = attachment['height'];
              return queryRunner.manager.save(newAttachment);
            });
            const infoAttachments = await Promise.all(storeAttachments);

            const infoConversation = await queryRunner.manager.findOne(
              Conversation,
              listCompanyCustomers[0].companyCustomer.conversation.id,
            );
            //* update last message
            infoConversation.lastMessage = createdMessage;
            infoConversation.lastUser = user;
            await queryRunner.manager.save(infoConversation);

            const messageToRingCentral: MessageDto = {
              text: createdMessage.text,
              attachments: infoAttachments.map((item) => ({
                url: item.url,
                contentType: item.category + '/' + item.format,
              })),
              phoneFrom: infoCompany.phone,
              phoneTo:
                listCompanyCustomers[0].companyCustomer.customer.phoneNumber, //+13128589573  +13128589752
              id: createdMessage.id,
              serviceToken: createConcretesKey(
                `${infoCompany.clientId}${infoCompany.clientSecret}${infoCompany.username}${infoCompany.password}`,
              ),
            };

            await queryRunner.commitTransaction();

            this._ringcentralService.sendMessage(messageToRingCentral);
          } else {
            //* ----------- exist customer------------
            //* get customer in company
            const infoCompanyCustomer = await getManager()
              .createQueryBuilder(CompanyCustomer, 'companyCustomer')
              .innerJoinAndSelect('companyCustomer.company', 'company')
              .innerJoinAndSelect('companyCustomer.customer', 'customer')
              .innerJoinAndSelect(
                'companyCustomer.conversation',
                'conversation',
              )
              .andWhere('company.id = :companyId', {
                companyId: infoCompany.id,
              })
              .andWhere('customer.id = :customerId', {
                customerId: infoCustomer.id,
              })
              .andWhere('customer.status != :status', {
                status: EntityStatus.DELETE,
              })
              .andWhere('conversation.status != :status', {
                status: EntityStatus.DELETE,
              })
              .andWhere('companyCustomer.status != :status', {
                status: EntityStatus.DELETE,
              })
              .getOne();
            //*------------- new customer in current company-------------
            if (!infoCompanyCustomer) {
              const companyCustomer: CreateCompanyCustomerDto = {
                companyId: infoCompany.id,
                status: EntityStatus.ACTIVE,
              };
              //* add customer to company

              const addedCompanyCustomer =
                await this.customersService.addCustomerToCompany(
                  infoCustomer,
                  companyCustomer,
                  queryRunner.manager,
                  1, //*umn
                  user,
                  MessageDirection.OUTBOUND,
                ); //* ex: { companyCustomer: {}, participants: []}

              const newMessage = new Message();
              newMessage.creationUserId = user;
              newMessage.lastModifiedUserId = user;
              newMessage.text = message;
              newMessage.conversation =
                addedCompanyCustomer.companyCustomer.conversation;
              newMessage.direction = MessageDirection.OUTBOUND;
              newMessage.companyCode = infoCompany.code;
              newMessage.mode = MessageMode.SCHEDULE;
              newMessage.messageStatus = InternalStatus.SENDING;
              newMessage.campaign = infoMessageSet.scheduleMessage.campaign;
              const createdMessage = await queryRunner.manager.save(newMessage);

              infoMessageSet.messageSetStatus = MessageSetStatus.SENDING;
              infoMessageSet.message = newMessage;
              infoMessageSet.customer = infoCustomer;
              await queryRunner.manager.save(infoMessageSet);

              const storeAttachments = attachments.map((attachment) => {
                const newAttachment = new Attachment();
                newAttachment.url = attachment['url'];
                newAttachment.name = attachment['name'];
                newAttachment.category = attachment['type'].split('/')[0];
                newAttachment.format = attachment['type'].split('/')[1];
                newAttachment.size = attachment['size'];
                newAttachment.message = createdMessage;
                newAttachment.width = attachment['width'];
                newAttachment.height = attachment['height'];
                return queryRunner.manager.save(newAttachment);
              });
              const infoAttachments = await Promise.all(storeAttachments);
              //* find conversation from transaction, because data is not stored in db

              const infoConversation = await queryRunner.manager.findOne(
                Conversation,
                addedCompanyCustomer.companyCustomer.conversation.id,
              );
              //* update last message
              infoConversation.lastMessage = createdMessage;
              infoConversation.lastUser = user;
              await queryRunner.manager.save(infoConversation);
              const messageToRingCentral: MessageDto = {
                text: createdMessage.text,
                attachments: infoAttachments.map((item) => ({
                  url: item.url,
                  contentType: item.category + '/' + item.format,
                })),
                phoneFrom: infoCompany.phone,
                phoneTo:
                  addedCompanyCustomer.companyCustomer.customer.phoneNumber,
                id: createdMessage.id,
                serviceToken: createConcretesKey(
                  `${infoCompany.clientId}${infoCompany.clientSecret}${infoCompany.username}${infoCompany.password}`,
                ),
              };

              await queryRunner.commitTransaction();

              this._ringcentralService.sendMessage(messageToRingCentral);
            } else {
              //*------------- exist customer in current company-------------
              //* update infoCompanyCustomer to active
              if (infoCompanyCustomer.status === EntityStatus.INACTIVE) {
                infoCompanyCustomer.status = EntityStatus.ACTIVE;
                await queryRunner.manager.save(infoCompanyCustomer);
              }
              const participants = await this.participantRepository.find({
                where: {
                  conversation: infoCompanyCustomer.conversation.id,
                  status: EntityStatus.ACTIVE,
                },
                relations: ['companyUser', 'companyUser.user'],
              });

              const updateUmnPromise = participants.map((participant) => {
                if (participant.companyUser.user.id !== user.id) {
                  participant.umn = 0;
                  participant.readStatus = ReadStatus.READ;
                }
                return queryRunner.manager.save(participant);
              });
              await Promise.all(updateUmnPromise);

              //* create message
              const newMessage = new Message();
              newMessage.creationUserId = user;
              newMessage.lastModifiedUserId = user;
              newMessage.text = message;
              newMessage.conversation = infoCompanyCustomer.conversation;
              newMessage.direction = MessageDirection.OUTBOUND;
              newMessage.companyCode = infoCompany.code;
              newMessage.mode = MessageMode.SCHEDULE;
              newMessage.messageStatus = InternalStatus.SENDING;
              newMessage.campaign = infoMessageSet.scheduleMessage.campaign;
              const createdMessage = await queryRunner.manager.save(newMessage);

              infoMessageSet.messageSetStatus = MessageSetStatus.SENDING;
              infoMessageSet.message = newMessage;
              infoMessageSet.customer = infoCustomer;
              await queryRunner.manager.save(infoMessageSet);

              const storeAttachments = attachments.map((attachment) => {
                const newAttachment = new Attachment();
                newAttachment.url = attachment['url'];
                newAttachment.name = attachment['name'];
                newAttachment.category = attachment['type'].split('/')[0];
                newAttachment.format = attachment['type'].split('/')[1];
                newAttachment.size = attachment['size'];
                newAttachment.width = attachment['width'];
                newAttachment.height = attachment['height'];
                newAttachment.message = createdMessage;
                return queryRunner.manager.save(newAttachment);
              });
              const infoAttachments = await Promise.all(storeAttachments);

              //* update last message
              await this.conversationsService.updateLastMessageAndUser(
                infoCompanyCustomer.conversation.id,
                {
                  lastMessage: createdMessage,
                  lastUser: user,
                },
                queryRunner.manager,
              );
              const messageToRingCentral: MessageDto = {
                text: createdMessage.text,
                attachments: infoAttachments.map((item) => ({
                  url: item.url,
                  contentType: item.category + '/' + item.format,
                })),
                phoneFrom: infoCompany.phone,
                phoneTo: infoCompanyCustomer.customer.phoneNumber,
                id: createdMessage.id,
                serviceToken: createConcretesKey(
                  `${infoCompany.clientId}${infoCompany.clientSecret}${infoCompany.username}${infoCompany.password}`,
                ),
              };

              await queryRunner.commitTransaction();

              this._ringcentralService.sendMessage(messageToRingCentral);
            }
          }
        }
      }
    } catch (error) {
      this.logger.error('sendScheduleMessage: ' + error);
      await queryRunner.rollbackTransaction();
      infoMessageSet.messageSetStatus = MessageSetStatus.ERROR;
    } finally {
      await queryRunner.manager.save(infoMessageSet);
      await queryRunner.release();

      const currentSentMessageSets = await getManager()
        .createQueryBuilder(MessageSet, 'messageSet')
        .innerJoin('messageSet.scheduleMessage', 'scheduleMessage')
        .where('scheduleMessage.id = :scheduleMessageId', {
          scheduleMessageId: infoMessageSet.scheduleMessage.id,
        })
        .andWhere('messageSet.messageSetStatus != :status', {
          status: MessageSetStatus.WAITING,
        })
        .getCount();

      await this._realTimeService.trackScheduleMessage({
        data: {
          totalMessages: totalMessageSets,
          currentSentMessages: currentSentMessageSets,
          scheduleMessageId: infoMessageSet.scheduleMessage.id,
        },
        notificationReceivers: [user],
      });
    }
  }

  async removeMessage(messageId: string, user = null) {
    const infoMessage = await this.messageRepository.findOne({
      where: {
        id: messageId,
        status: Not(EntityStatus.DELETE),
      },
    });
    if (!infoMessage) throw new NotFoundException('Not found message');

    try {
      // infoMessage.status = EntityStatus.DELETE;
      infoMessage.lastModifiedUserId = user ? user.id : '';
      return await infoMessage.save();
    } catch (error) {
      throw new InternalServerErrorException();
    }
  }

  //* need change to updateSentMessage
  async updateOutboundMessage(message: MessageDto) {
    const queryRunner = this.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const infoMessage = await this.messageRepository.findOne({
        where: {
          id: message.id,
        },
        relations: ['conversation'],
      });
      if (!infoMessage) throw new NotFoundException('Not found message');
      const messageSet = await this.messageSetRepository.findOne({
        where: {
          message: infoMessage,
        },
      });
      if (messageSet) {
        messageSet.messageSetStatus = MessageSetStatus.SENT;
        await messageSet.save();
      }

      infoMessage.exId = message.exId?.toString();
      infoMessage.exMessageStatus = message.exMessageStatus;
      infoMessage.exCreationTime = message.exCreationTime;
      infoMessage.exLastModifiedTime = message.exLastModifiedTime;
      switch (message.exMessageStatus.toLowerCase()) {
        case ExternalStatus.QUEUED:
          infoMessage.exMessageStatus = ExternalStatus.QUEUED;
          infoMessage.messageStatus = InternalStatus.SENT;
          break;
        case ExternalStatus.DELIVERED:
          infoMessage.exMessageStatus = ExternalStatus.DELIVERED;
          infoMessage.messageStatus = InternalStatus.SENT;
          break;
        case ExternalStatus.DELIVERED_FAIL:
          infoMessage.exMessageStatus = ExternalStatus.DELIVERED_FAIL;
          infoMessage.messageStatus = InternalStatus.SENT;
          break;
        case ExternalStatus.SENT:
          infoMessage.exMessageStatus = ExternalStatus.SENT;
          infoMessage.messageStatus = InternalStatus.SENT;
          break;
        case ExternalStatus.SENT_FAIL:
          infoMessage.exMessageStatus = ExternalStatus.SENT_FAIL;
          infoMessage.messageStatus = InternalStatus.SENT;
          break;
        default:
          this.logger.debug(`External status not match: ${message}`);
          break;
      }

      const infoAttachments = await this.attachmentRepository.find({
        where: {
          message: infoMessage.id,
        },
      });
      const updateAttachments = infoAttachments.map((item, index) => {
        item.exUrl = message.attachments[index].url;
        item.exId = message.attachments[index].url.slice(
          message.attachments[index].url.lastIndexOf('/') + 1,
        );
        return item.save();
      });
      await Promise.all(updateAttachments);

      const infoMessageAfterUpdate = await infoMessage.save();
      if (infoMessageAfterUpdate.mode === MessageMode.NORMAL) {
        const participants =
          await this._participantsService.getUsersInConversation(
            infoMessageAfterUpdate.conversation.id,
            queryRunner,
          );
        this._realTimeService.updateOutboundMessage({
          message: infoMessageAfterUpdate,
          participants,
        });
      }
      await queryRunner.commitTransaction();
      return infoMessageAfterUpdate;
    } catch (error) {
      this.logger.error(error);
      await queryRunner.rollbackTransaction();
      throw new InternalServerErrorException();
    } finally {
      await queryRunner.release();
    }
  }

  async updateMessage(updateMessageDto: UpdateMessageDto, user = null) {
    const { messageId } = updateMessageDto;

    const infoMessage = await this.messageRepository.findOne({
      where: {
        id: messageId,
        status: Not(EntityStatus.DELETE),
      },
    });
    if (!infoMessage) throw new NotFoundException('Not found message');

    try {
      const newMessage = _.assign(infoMessage, updateMessageDto);
      newMessage.lastModifiedUserId = user ? user.id : '';

      return await newMessage.save();
    } catch (error) {
      this.logger.error(error);
      throw new InternalServerErrorException();
    }
  }

  //* need change to updateOutboundMessage
  public async updateOutBoundListMessages(messages: MessageDto[]) {
    const appMessages = [];
    const softPhoneMessages = [];
    const softPhoneMessagesToNewCustomer = [];
    const length = messages.length;

    for (let i = 0; i < length; i++) {
      const queryRunner = this.connection.createQueryRunner();
      await queryRunner.connect();
      try {
        await queryRunner.startTransaction();
        const infoMessage = await this.messageRepository.findOne({
          where: {
            exId: messages[i].exId,
            status: Not(EntityStatus.DELETE),
          },
          relations: ['conversation', 'creationUserId'],
        });

        //*------------handle messages from app normal----------
        if (infoMessage) {
          const messageSet = await this.messageSetRepository.findOne({
            where: {
              message: infoMessage,
            },
          });
          if (messageSet) {
            messageSet.messageSetStatus = MessageSetStatus.SENT;
            await messageSet.save();
          }
          infoMessage.exCreationTime = messages[i].exCreationTime;
          infoMessage.exLastModifiedTime = messages[i].exLastModifiedTime;
          // todo update internal message status
          switch (messages[i].exMessageStatus.toLowerCase()) {
            case ExternalStatus.QUEUED:
              infoMessage.exMessageStatus = ExternalStatus.QUEUED;
              infoMessage.messageStatus = InternalStatus.SENT;
              break;
            case ExternalStatus.DELIVERED:
              infoMessage.exMessageStatus = ExternalStatus.DELIVERED;
              infoMessage.messageStatus = InternalStatus.SENT;
              break;
            case ExternalStatus.DELIVERED_FAIL:
              infoMessage.exMessageStatus = ExternalStatus.DELIVERED_FAIL;
              infoMessage.messageStatus = InternalStatus.SENT;
              break;
            case ExternalStatus.SENT:
              infoMessage.exMessageStatus = ExternalStatus.SENT;
              infoMessage.messageStatus = InternalStatus.SENT;
              break;
            case ExternalStatus.SENT_FAIL:
              infoMessage.exMessageStatus = ExternalStatus.SENT_FAIL;
              infoMessage.messageStatus = InternalStatus.SENT;
              break;
            default:
              break;
          }
          const infoMessageAfterCreate = await queryRunner.manager.save(
            infoMessage,
          );
          appMessages.push({
            ...infoMessageAfterCreate,
            participants: await this.participantService.getUsersInConversation(
              infoMessageAfterCreate.conversation.id,
              queryRunner,
            ),
          });

          const infoAttachments = await this.attachmentRepository.find({
            where: {
              message: infoMessage.id,
            },
          });
          const updateAttachments = infoAttachments.map((item, index) => {
            item.exUrl = messages[i].attachments[index].url;
            item.exId = messages[i].attachments[index].url.slice(
              messages[i].attachments[index].url.lastIndexOf('/') + 1,
            );
            return queryRunner.manager.save(item);
          });
          await Promise.all(updateAttachments);
        } else {
          //*----------- handle message from soft phone--------------
          const infoCustomer = await this.customersRepository.findOne({
            where: {
              phoneNumber: messages[i].phoneTo,
              status: Not(EntityStatus.DELETE),
            },
          });
          const infoCompany = await this.companyRepository.findOne({
            where: {
              phone: messages[i].phoneFrom,
              status: Not(EntityStatus.DELETE),
            },
          });

          if (!infoCompany) {
            this.logger.debug(
              'Company not found! ' + '\n' + JSON.stringify(messages),
            );
          }
          //* ----------- new customer in system------------
          if (!infoCustomer) {
            const companyCustomers = await this.customersService.createCustomer(
              {
                companyCustomers: [
                  {
                    status: EntityStatus.ACTIVE,
                    companyId: infoCompany.id,
                  },
                ],
                fullName: '',
                emailAddress: '',
                phoneNumber: messages[i].phoneTo,
                status: EntityStatus.ACTIVE,
              },
              queryRunner.manager,
              1, //* umn,
              false,
              null,
              MessageDirection.OUTBOUND,
            );
            const newMessage = new Message();
            newMessage.conversation =
              companyCustomers[0].companyCustomer.conversation;
            newMessage.direction = MessageDirection.OUTBOUND;
            newMessage.mode = MessageMode.NORMAL;
            newMessage.text = messages[i].text;
            newMessage.exId = messages[i].exId;
            newMessage.exCreationTime = messages[i].exCreationTime;
            newMessage.exLastModifiedTime = messages[i].exLastModifiedTime;
            newMessage.isPolling = messages[i].isPolling; //* only work for polling sync message
            switch (messages[i].exMessageStatus.toLowerCase()) {
              case ExternalStatus.QUEUED:
                newMessage.exMessageStatus = ExternalStatus.QUEUED;
                newMessage.messageStatus = InternalStatus.SENDING;
                break;
              case ExternalStatus.DELIVERED:
                newMessage.exMessageStatus = ExternalStatus.DELIVERED;
                newMessage.messageStatus = InternalStatus.SENT;
                break;
              case ExternalStatus.DELIVERED_FAIL:
                newMessage.exMessageStatus = ExternalStatus.DELIVERED_FAIL;
                newMessage.messageStatus = InternalStatus.ERROR;
                break;
              case ExternalStatus.SENT:
                newMessage.exMessageStatus = ExternalStatus.SENT;
                newMessage.messageStatus = InternalStatus.SENT;
                break;
              case ExternalStatus.SENT_FAIL:
                newMessage.exMessageStatus = ExternalStatus.SENT_FAIL;
                newMessage.messageStatus = InternalStatus.ERROR;
                break;
              default:
                break;
            }
            newMessage.companyCode = infoCompany.code;
            const infoMessageAfterCreate = await queryRunner.manager.save(
              newMessage,
            );
            //* create new attachment
            let savedAttachments = [];
            if (messages[i].attachments.length > 0) {
              const saveAttachments = messages[i].attachments.map(
                (attachment) => {
                  const newAttachment = new Attachment();
                  newAttachment.category = attachment.contentType.split('/')[0];
                  newAttachment.format = attachment.contentType.split('/')[1];
                  newAttachment.exId = attachment.url.slice(
                    attachment.url.lastIndexOf('/') + 1,
                  );
                  newAttachment.url = attachment.internalUrl;
                  newAttachment.exUrl = attachment.url;
                  newAttachment.message = infoMessageAfterCreate;
                  newAttachment.size = attachment.size.split(' ')[0];
                  newAttachment.width = attachment.width;
                  newAttachment.height = attachment.height;
                  newAttachment.name = attachment.name;
                  return queryRunner.manager.save(newAttachment);
                },
              );
              savedAttachments = (await Promise.all(saveAttachments)).map(
                (item) => ({
                  url: item.url,
                  exUrl: item.exUrl,
                  category: item.category,
                  format: item.format,
                  id: item.id,
                  width: item.width,
                  height: item.height,
                  size: item.size,
                  name: item.name,
                }),
              );
            }
            const infoConversation = await queryRunner.manager.findOne(
              Conversation,
              companyCustomers[0].companyCustomer.conversation.id,
            );
            infoConversation.lastMessage = infoMessageAfterCreate;
            await queryRunner.manager.save(infoConversation);
            await this.notificationService.pushNotify(
              {
                entityId: companyCustomers[0].companyCustomer.customer.id,
                notificationTypeId: NotificationType.NEW_CLIENT,
                company: infoCompany,
              },
              queryRunner,
            );

            softPhoneMessagesToNewCustomer.push({
              conversation: {
                ...infoConversation,
                company: companyCustomers[0].companyCustomer.company.code,
                customer: {
                  ...companyCustomers[0].companyCustomer.customer,
                  companies: [companyCustomers[0].companyCustomer.company.name],
                  campaigns: [],
                },
                lastMessage: {
                  text: infoMessageAfterCreate.text,
                  direction: MessageDirection.OUTBOUND,
                  creationTime: infoMessageAfterCreate.creationTime,
                  exCreationTime: infoMessageAfterCreate.exCreationTime,
                  messagesStatus: infoMessageAfterCreate.messageStatus,
                  exMessageStatus: infoMessageAfterCreate.exMessageStatus,
                  mode: infoMessageAfterCreate.mode,
                  status: infoMessageAfterCreate.status,
                  type: infoMessageAfterCreate.type,
                },
                messages: [
                  {
                    id: infoMessageAfterCreate.id,
                    text: infoMessageAfterCreate.text,
                    attachments: savedAttachments,
                    sender: {},
                    direction: MessageDirection.OUTBOUND,
                    mode: MessageMode.NORMAL,
                    creationTime: infoMessageAfterCreate.creationTime,
                    exCreationTime: infoMessageAfterCreate.exCreationTime,
                    messagesStatus: infoMessageAfterCreate.messageStatus,
                    exMessageStatus: infoMessageAfterCreate.exMessageStatus,
                    conversationId: infoMessageAfterCreate.conversation.id,
                    isPolling: infoMessageAfterCreate.isPolling,
                    index: infoMessageAfterCreate.index,
                  },
                ],
                participants: companyCustomers[0].participants,
              },
            });
          } else {
            //* ----------- exist customer--------------
            const infoCompanyCustomer = await getManager()
              .createQueryBuilder(CompanyCustomer, 'companyCustomer')
              .innerJoinAndSelect('companyCustomer.company', 'company')
              .innerJoinAndSelect('companyCustomer.customer', 'customer')
              .innerJoinAndSelect(
                'companyCustomer.conversation',
                'conversation',
              )
              .andWhere('customer.id = :customerId', {
                customerId: infoCustomer.id,
              })
              .andWhere('company.id = :companyId', {
                companyId: infoCompany.id,
              })
              .andWhere('conversation.status != :status', {
                status: EntityStatus.DELETE,
              })
              .andWhere('companyCustomer.status != :status', {
                status: EntityStatus.DELETE,
              })
              .getOne();

            //* ----------- new customer in company------------
            if (!infoCompanyCustomer) {
              const companyCustomer: CreateCompanyCustomerDto = {
                companyId: infoCompany.id,
                status: EntityStatus.ACTIVE,
              };
              const addedCompanyCustomer =
                await this.customersService.addCustomerToCompany(
                  infoCustomer,
                  companyCustomer,
                  queryRunner.manager,
                  1, //*umn,
                  null,
                  MessageDirection.OUTBOUND,
                ); //* ex: { companyCustomer: {}, participants: []}
              const newMessage = new Message();
              newMessage.conversation =
                addedCompanyCustomer.companyCustomer.conversation;
              newMessage.direction = MessageDirection.OUTBOUND;
              newMessage.mode = MessageMode.NORMAL;
              newMessage.text = messages[i].text;
              newMessage.exId = messages[i].exId;
              newMessage.exCreationTime = messages[i].exCreationTime;
              newMessage.exLastModifiedTime = messages[i].exLastModifiedTime;
              newMessage.isPolling = messages[i].isPolling; //* only work for polling sync message
              switch (messages[i].exMessageStatus.toLowerCase()) {
                case ExternalStatus.QUEUED:
                  newMessage.exMessageStatus = ExternalStatus.QUEUED;
                  newMessage.messageStatus = InternalStatus.SENDING;
                  break;
                case ExternalStatus.DELIVERED:
                  newMessage.exMessageStatus = ExternalStatus.DELIVERED;
                  newMessage.messageStatus = InternalStatus.SENT;
                  break;
                case ExternalStatus.DELIVERED_FAIL:
                  newMessage.exMessageStatus = ExternalStatus.DELIVERED_FAIL;
                  newMessage.messageStatus = InternalStatus.ERROR;
                  break;
                case ExternalStatus.SENT:
                  newMessage.exMessageStatus = ExternalStatus.SENT;
                  newMessage.messageStatus = InternalStatus.SENT;
                  break;
                case ExternalStatus.SENT_FAIL:
                  newMessage.exMessageStatus = ExternalStatus.SENT_FAIL;
                  newMessage.messageStatus = InternalStatus.ERROR;
                  break;
                default:
                  break;
              }
              newMessage.companyCode = infoCompany.code;
              const infoMessageAfterCreate = await queryRunner.manager.save(
                newMessage,
              );
              //* create new attachment
              let savedAttachments = [];
              if (messages[i].attachments.length > 0) {
                const saveAttachments = messages[i].attachments.map(
                  (attachment) => {
                    const newAttachment = new Attachment();
                    newAttachment.category =
                      attachment.contentType.split('/')[0];
                    newAttachment.format = attachment.contentType.split('/')[1];
                    newAttachment.exId = attachment.url.slice(
                      attachment.url.lastIndexOf('/') + 1,
                    );
                    newAttachment.url = attachment.internalUrl;
                    newAttachment.exUrl = attachment.url;
                    newAttachment.message = infoMessageAfterCreate;
                    newAttachment.size = attachment.size.split(' ')[0];
                    newAttachment.width = attachment.width;
                    newAttachment.height = attachment.height;
                    newAttachment.name = attachment.name;
                    return queryRunner.manager.save(newAttachment);
                  },
                );
                savedAttachments = (await Promise.all(saveAttachments)).map(
                  (item) => ({
                    url: item.url,
                    exUrl: item.exUrl,
                    category: item.category,
                    format: item.format,
                    id: item.id,
                    width: item.width,
                    height: item.height,
                    size: item.size,
                    name: item.name,
                  }),
                );
              }
              const infoConversation = await queryRunner.manager.findOne(
                Conversation,
                addedCompanyCustomer.companyCustomer.conversation.id,
              );
              infoConversation.lastMessage = infoMessageAfterCreate;
              await queryRunner.manager.save(infoConversation);
              await this.notificationService.pushNotify(
                {
                  entityId: addedCompanyCustomer.companyCustomer.customer.id,
                  notificationTypeId: NotificationType.NEW_CLIENT,
                  company: infoCompany,
                },
                queryRunner,
              );
              softPhoneMessagesToNewCustomer.push({
                conversation: {
                  ...infoConversation,
                  company: addedCompanyCustomer.companyCustomer.company.code,
                  customer: {
                    ...addedCompanyCustomer.companyCustomer.customer,
                    companies: [
                      addedCompanyCustomer.companyCustomer.company.name,
                    ],
                    campaigns: [],
                  },
                  lastMessage: {
                    text: infoMessageAfterCreate.text,
                    creationTime: infoMessageAfterCreate.creationTime,
                    exCreationTime: infoMessageAfterCreate.exCreationTime,
                    messagesStatus: infoMessageAfterCreate.messageStatus,
                    exMessageStatus: infoMessageAfterCreate.exMessageStatus,
                    direction: MessageDirection.OUTBOUND,
                    mode: infoMessageAfterCreate.mode,
                    status: infoMessageAfterCreate.status,
                    type: infoMessageAfterCreate.type,
                  },
                  messages: [
                    {
                      id: infoMessageAfterCreate.id,
                      text: infoMessageAfterCreate.text,
                      attachments: savedAttachments,
                      sender: {},
                      direction: MessageDirection.OUTBOUND,
                      creationTime: infoMessageAfterCreate.creationTime,
                      exCreationTime: infoMessageAfterCreate.exCreationTime,
                      messagesStatus: infoMessageAfterCreate.messageStatus,
                      exMessageStatus: infoMessageAfterCreate.exMessageStatus,
                      conversationId: infoMessageAfterCreate.conversation.id,
                      isPolling: infoMessageAfterCreate.isPolling,
                      index: infoMessageAfterCreate.index,
                    },
                  ],
                  participants: addedCompanyCustomer.participants,
                },
              });
            } else {
              //* ----------- exist customer in company------------
              //* update infoCompanyCustomer to active
              let splitText = messages[i].text;
              if (process.env.NODE_ENV === 'development') {
                splitText = messages[i].text.slice(49);
              }
              const start = new Date();
              start.setHours(0, 0, 0, 0);
              const end = new Date(start);
              end.setDate(start.getDate() + 1);
              const messagesExisted = await queryRunner.manager
                .createQueryBuilder(Message, 'message')
                .where('message.exId IS NULL')
                .leftJoinAndSelect('message.attachments', 'attachments')
                .andWhere('message.text = :text', { text: splitText })
                .andWhere(':customer = :customerPhone', {
                  customer: infoCustomer.phoneNumber,
                  customerPhone: messages[i].phoneTo,
                })
                .andWhere(':company = :companyPhone', {
                  company: infoCompany.phone,
                  companyPhone: messages[i].phoneFrom,
                })
                .andWhere(
                  `message.creationTime BETWEEN '${start.toISOString()}' AND '${end.toISOString()}'`,
                )
                .getMany();
              let messageExisted: Message;
              for (let j = 0; j < messagesExisted.length; j++) {
                const diff = moment(messages[i].exCreationTime).diff(
                  moment(messagesExisted[j].creationTime),
                );
                if (diff / 1000 < 30) {
                  if (
                    messages[i].attachments.length ===
                    messagesExisted[j].attachments.length
                  ) {
                    if (messages[i].attachments.length === 0) {
                      messageExisted = messagesExisted[j];
                    } else {
                      let countAttachments = 0;
                      messages[i].attachments.forEach((item) => {
                        messagesExisted[j].attachments.forEach((element) => {
                          if (
                            parseInt(item.height) == element.height &&
                            parseInt(item.width) == element.width &&
                            parseFloat(item.size) == element.size
                          ) {
                            countAttachments += 1;
                          }
                        });
                      });
                      if (
                        countAttachments >=
                        messagesExisted[j].attachments.length
                      ) {
                        messageExisted = messagesExisted[j];
                      }
                    }
                  }
                }
              }
              if (messageExisted) {
                messageExisted.exId = messages[i].exId;
                messageExisted.exCreationTime = messages[i].exCreationTime;
                messageExisted.exLastModifiedTime =
                  messages[i].exLastModifiedTime;
                messageExisted.exMessageStatus = messages[i].exMessageStatus;
                messageExisted.messageStatus = InternalStatus.SENT;
                await queryRunner.manager.save(messageExisted);

                if (messageExisted.attachments.length > 0) {
                  for (let l = 0; l < messageExisted.attachments.length; l++) {
                    const attachmentMessage = messageExisted.attachments[l];
                    for (let k = 0; k < messages[i].attachments.length; k++) {
                      const attachmentRing = messages[i].attachments[k];
                      if (
                        parseInt(attachmentRing.height) ==
                          attachmentMessage.height &&
                        parseInt(attachmentRing.width) ==
                          attachmentMessage.width &&
                        parseFloat(attachmentRing.size) ==
                          attachmentMessage.size
                      ) {
                        attachmentMessage.exId = attachmentRing.url.slice(
                          attachmentRing.url.lastIndexOf('/') + 1,
                        );
                        attachmentMessage.exUrl = attachmentRing.url;
                        await queryRunner.manager.save(attachmentMessage);
                      }
                    }
                  }
                }
              } else {
                if (infoCompanyCustomer.status === EntityStatus.INACTIVE) {
                  infoCompanyCustomer.status = EntityStatus.ACTIVE;
                  await queryRunner.manager.save(infoCompanyCustomer);
                }
                const attendances = (
                  await this.participantRepository.find({
                    where: {
                      conversation: infoCompanyCustomer.conversation.id,
                      status: EntityStatus.ACTIVE,
                    },
                    relations: ['companyUser', 'companyUser.user'],
                  })
                ).filter(
                  (item) => item.companyUser.status === EntityStatus.ACTIVE,
                );

                const updateUmnPromise = attendances.map((participant) => {
                  participant.umn += 1;
                  participant.readStatus = ReadStatus.UNREAD;
                  return queryRunner.manager.save(participant);
                });
                await Promise.all(updateUmnPromise);

                const newMessage = new Message();
                newMessage.conversation = infoCompanyCustomer.conversation;
                newMessage.direction = MessageDirection.OUTBOUND;
                newMessage.mode = MessageMode.NORMAL;
                newMessage.text = messages[i].text;
                newMessage.exId = messages[i].exId;
                newMessage.exCreationTime = messages[i].exCreationTime;
                newMessage.exLastModifiedTime = messages[i].exLastModifiedTime;
                newMessage.isPolling = messages[i].isPolling;
                switch (messages[i].exMessageStatus.toLowerCase()) {
                  case ExternalStatus.QUEUED:
                    newMessage.exMessageStatus = ExternalStatus.QUEUED;
                    newMessage.messageStatus = InternalStatus.SENDING;
                    break;
                  case ExternalStatus.DELIVERED:
                    newMessage.exMessageStatus = ExternalStatus.DELIVERED;
                    newMessage.messageStatus = InternalStatus.SENT;
                    break;
                  case ExternalStatus.DELIVERED_FAIL:
                    newMessage.exMessageStatus = ExternalStatus.DELIVERED_FAIL;
                    newMessage.messageStatus = InternalStatus.ERROR;
                    break;
                  case ExternalStatus.SENT:
                    newMessage.exMessageStatus = ExternalStatus.SENT;
                    newMessage.messageStatus = InternalStatus.SENT;
                    break;
                  case ExternalStatus.SENT_FAIL:
                    newMessage.exMessageStatus = ExternalStatus.SENT_FAIL;
                    newMessage.messageStatus = InternalStatus.ERROR;
                    break;
                  default:
                    break;
                }
                newMessage.companyCode = infoCompany.code;
                const infoMessageAfterCreate = await queryRunner.manager.save(
                  newMessage,
                );
                //* create new attachment
                let createdAttachments = [];
                if (messages[i].attachments.length > 0) {
                  const saveAttachments = messages[i].attachments.map(
                    (attachment) => {
                      const newAttachment = new Attachment();
                      newAttachment.category =
                        attachment.contentType.split('/')[0];
                      newAttachment.format =
                        attachment.contentType.split('/')[1];
                      newAttachment.exId = attachment.url.slice(
                        attachment.url.lastIndexOf('/') + 1,
                      );
                      newAttachment.url = attachment.internalUrl;
                      newAttachment.exUrl = attachment.url;
                      newAttachment.message = infoMessageAfterCreate;
                      newAttachment.size = attachment.size.split(' ')[0];
                      newAttachment.width = attachment.width;
                      newAttachment.height = attachment.height;
                      newAttachment.name = attachment.name;
                      return queryRunner.manager.save(newAttachment);
                    },
                  );
                  createdAttachments = (await Promise.all(saveAttachments)).map(
                    (item) => ({
                      url: item.url,
                      exUrl: item.exUrl,
                      category: item.category,
                      format: item.format,
                      id: item.id,
                      width: item.width,
                      height: item.height,
                      size: item.size,
                      name: item.name,
                    }),
                  );
                }

                softPhoneMessages.push({
                  ...infoMessageAfterCreate,
                  attachments: createdAttachments,
                  participants: attendances,
                });
                await this.conversationsService.updateLastMessageAndUser(
                  infoCompanyCustomer.conversation.id,
                  {
                    lastMessage: infoMessageAfterCreate,
                    lastUser: null,
                  },
                  queryRunner.manager,
                );
              }
            }
          }
        }
        await queryRunner.commitTransaction();
      } catch (error) {
        this.logger.error(error);
        await queryRunner.rollbackTransaction();
        throw new InternalServerErrorException();
      } finally {
        await queryRunner.release();
      }
    }

    if (appMessages.length !== 0)
      //TODO: get all users which relate with customer send to socket to get connection and noti
      this._realTimeService.updateOutboundListMessages(
        appMessages.filter((message) => message.mode === MessageMode.NORMAL),
      );

    if (softPhoneMessagesToNewCustomer.length !== 0)
      this._realTimeService.createOutboundListMessagesToNewCustomer(
        softPhoneMessagesToNewCustomer,
      );
    if (softPhoneMessages.length !== 0)
      //TODO: get all users which relate with customer send to socket to get connection and notify
      this._realTimeService.createOutboundListMessages(softPhoneMessages);

    return {};
  }

  private async _createInboundMessage(
    message: MessageDto,
    conversationEnhanced: any,
    participants,
    queryRunner: QueryRunner,
  ) {
    const conversation: Conversation = conversationEnhanced.conversation;

    const dataMessage = new Message();
    dataMessage.exCreationTime = message.exCreationTime;
    dataMessage.exLastModifiedTime = message.exLastModifiedTime;
    dataMessage.direction = MessageDirection.INBOUND;
    dataMessage.text =
      message.text.trim().length > 0 ? message.text.trim() : '';
    dataMessage.conversation = conversation;
    dataMessage.exMessageStatus = message.exMessageStatus;
    dataMessage.exId = message.exId;
    dataMessage.isHaveAttachment = false;
    dataMessage.messageStatus = InternalStatus.RECEIVED;
    dataMessage.companyCode = conversationEnhanced.company.code;
    dataMessage.mode = MessageMode.NORMAL;
    dataMessage.isPolling = message.isPolling;
    const messageSave = await queryRunner.manager.save(dataMessage);
    const newMessages = _.assign(new Message(), _.cloneDeep(messageSave));
    conversation.lastMessage = newMessages;
    conversation.isCompleted = false;
    await queryRunner.manager.save(conversation);
    let savedAttachments = [];
    if (message.attachments.length > 0) {
      const saveAttachments = message.attachments.map((attachment) => {
        const newAttachment = new Attachment();
        newAttachment.category = attachment.contentType.split('/')[0];
        newAttachment.format = attachment.contentType.split('/')[1];
        newAttachment.exId = attachment.url.slice(
          attachment.url.lastIndexOf('/') + 1,
        );
        newAttachment.url = attachment.internalUrl;
        newAttachment.exUrl = attachment.url;
        newAttachment.message = messageSave;
        newAttachment.width = attachment.width;
        newAttachment.height = attachment.height;
        newAttachment.size = attachment.size.split(' ')[0];
        newAttachment.name = attachment.name;
        return queryRunner.manager.save(newAttachment);
      });
      savedAttachments = (await Promise.all(saveAttachments)).map(
        (item: any) => ({
          url: item.url,
          exUrl: item.exUrl,
          category: item.category,
          format: item.format,
          id: item.id,
          width: item.width,
          height: item.height,
          name: item.name,
        }),
      );
    }
    const newData = {
      conversation: {
        ...conversation,
        company: conversationEnhanced.company.code,
        customer: {
          ...conversationEnhanced.customer,
          campaigns: [],
        },
        lastMessage: {
          text: messageSave.text,
          creationTime: messageSave.creationTime,
          exId: messageSave.exId,
          direction: MessageDirection.INBOUND,
          exLastModifiedTime: messageSave.exLastModifiedTime,
          exCreationTime: messageSave.exCreationTime,
          messagesStatus: messageSave.messageStatus,
          exMessageStatus: messageSave.exMessageStatus,
          mode: messageSave.mode,
          type: messageSave.type,
        },
        messages: [
          {
            id: messageSave.id,
            companyCode: conversationEnhanced.company.code,
            phoneFrom: message.phoneFrom,
            phoneTo: message.phoneTo,
            text: messageSave.text,
            attachments: savedAttachments,
            sender: {},
            direction: MessageDirection.INBOUND,
            exId: messageSave.exId,
            exLastModifiedTime: messageSave.exLastModifiedTime,
            creationTime: messageSave.creationTime,
            exCreationTime: messageSave.exCreationTime,
            messagesStatus: messageSave.messageStatus,
            exMessageStatus: messageSave.exMessageStatus,
            conversationId: conversation.id,
            mode: messageSave.mode,
            isPolling: message.isPolling,
            index: messageSave.index,
            type: messageSave.type,
          },
        ],
        participants: participants,
      },
    };

    await this.notificationService.pushNotify(
      {
        entityId: dataMessage.id,
        notificationTypeId: NotificationType.INBOUND_MESSAGE,
        company: conversationEnhanced.company,
      },
      queryRunner,
    );

    return newData;
  }

  public getAttachmentSignedUrl(fileInfo: SignedUrlDto): Promise<string> {
    const acceptFiles = [
      'jpg',
      'jpeg',
      'png',
      'gif',
      'tif',
      'tiff',
      'bmp',
      'svg',
      'mp4',
      'mpeg',
      'mp3',
      'vcf',
      'vcard',
      'rtf',
      'zip',
      'svg+xml',
    ];
    const format = fileInfo.type.split('/')[1];
    if (!acceptFiles.includes(format))
      throw new UnsupportedMediaTypeException();

    try {
      const key = `${process.env.AWS_S3_PATH_MESSAGE_ATTACHMENT}/${uuid()}/${
        fileInfo.fileName
      }`;

      return this._awsS3.getSignedUrl(
        key,
        AwsS3PresignedMethod.PUT,
        fileInfo.type,
      );
    } catch (error) {
      this.logger.error(error);
      throw new InternalServerErrorException();
    }
  }

  public async uploadMessageAttachment(
    fileName: string,
    dataBuffer: Buffer,
  ): Promise<string> {
    try {
      const key = `${
        process.env.AWS_S3_PATH_MESSAGE_ATTACHMENT
      }/${uuid()}/${fileName}`;

      const uploadFile = await this._awsS3.uploadFile(dataBuffer, key);
      return uploadFile.Location;
    } catch (error) {
      this.logger.error(error);
      throw new InternalServerErrorException();
    }
  }

  private async _handleGroupMessage(message: MessageDto): Promise<void> {
    const queryRunner = this.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const newGroupMessage: GroupMessage =
        await this._groupMessageService.createGroupMessage(
          {
            from: message.phoneFrom,
            to: message.phoneTo,
            text: message.text,
            nonTargets: message.nonTargets,
            exId: message.exId,
            exCreationTime: message.exCreationTime,
            exLastModifiedTime: message.exLastModifiedTime,
            exStatus: message.exMessageStatus,
            direction: message.direction,
          },
          queryRunner.manager,
        );

      if (message.attachments.length > 0) {
        const saveAttachments = message.attachments.map((attachment) => {
          const newAttachment = new Attachment();
          newAttachment.category = attachment.contentType.split('/')[0];
          newAttachment.format = attachment.contentType.split('/')[1];
          newAttachment.exId = attachment.url.slice(
            attachment.url.lastIndexOf('/') + 1,
          );
          newAttachment.url = attachment.internalUrl;
          newAttachment.exUrl = attachment.url;
          newAttachment.groupMessage = newGroupMessage;
          newAttachment.width = attachment.width;
          newAttachment.height = attachment.height;
          newAttachment.size = attachment.size.split(' ')[0];
          newAttachment.name = attachment.name;
          return queryRunner.manager.save(newAttachment);
        });

        await Promise.all(saveAttachments);
      }

      await queryRunner.commitTransaction();
    } catch (error) {
      this.logger.debug(error);
      await queryRunner.rollbackTransaction();
    } finally {
      await queryRunner.release();
    }
  }

  async handleReceivedInboundMessage(message: MessageDto): Promise<void> {
    //* message from group
    if (message.nonTargets.length > 0 && message.phoneTo.trim().length > 0) {
      return this._handleGroupMessage(message);
    }

    const queryRunner = this.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    //* message from 1 client
    try {
      let conversation: any;
      let isNew = false;

      const existingMessage = await this.messageRepository.findOne({
        where: {
          exId: message.exId,
        },
      });

      if (existingMessage) return;

      const conversationExisted =
        await this.conversationsService.getConversationByPhone(
          message.phoneFrom,
          message.phoneTo,
        );

      if (conversationExisted) {
        isNew = false;
        conversation = conversationExisted;
      } else {
        let haveConversation = false;
        const customer = await this.customersRepository.findOne({
          where: {
            phoneNumber: message.phoneFrom,
            status: EntityStatus.ACTIVE,
          },
        });
        if (!customer) {
          haveConversation = false;
        } else {
          const company = await this.companyRepository.findOne({
            where: {
              phone: message.phoneTo,
              status: EntityStatus.ACTIVE,
            },
          });
          if (!company) {
            haveConversation = false;
          } else {
            const companyOfCustomer =
              await this.companyCustomerRepository.findOne({
                relations: ['conversation'],
                where: {
                  customer: customer,
                  company: company,
                },
              });
            if (!companyOfCustomer) {
              haveConversation = false;
            } else {
              // const conversation = await this.conversationRepository.findOne({
              //   where: {
              //     id: companyOfCustomer.conversation.id,
              //   },
              // });
              const conversation = await queryRunner.manager
                .createQueryBuilder(Conversation, 'conversation')
                .where('conversation.id = :conversationId', {
                  conversationId: companyOfCustomer.conversation.id,
                })
                .andWhere('conversation.status = :status', {
                  status: EntityStatus.ACTIVE,
                })
                .getOne();
              if (!conversation) {
                haveConversation = false;
              } else {
                haveConversation = true;
              }
            }
          }
        }
        if (haveConversation) {
          isNew = false;
        } else {
          isNew = true;
        }
        conversation =
          await this.conversationsService.createConversationWithNewCustomer(
            message.phoneFrom,
            message.phoneTo,
            queryRunner,
          );
      }

      //* cannot find conversation because error company phone
      if (!conversation.conversation) {
        this.logger.error(
          'Not found company in handleReceivedInboundMessage: ' +
            JSON.stringify(message),
        );
        return;
      }

      const participants = await this.participantService.getUsersInConversation(
        conversation.conversation.id,
        queryRunner,
      );

      const dataMessage = await this._createInboundMessage(
        message,
        conversation,
        participants,
        queryRunner,
      );

      const updateUmnPromise = dataMessage.conversation.participants.map(
        async (participant) => {
          return await this.participantService.updateUmnWithNewMessage(
            participant.id,
            queryRunner.manager,
          );
        },
      );

      await Promise.all(updateUmnPromise);

      dataMessage.conversation['isNew'] = isNew;

      await queryRunner.commitTransaction();
      await this._realTimeService.receivedMessageBackend([dataMessage]);
    } catch (error) {
      this.logger.error(error);
      await queryRunner.rollbackTransaction();
      throw new InternalServerErrorException();
    } finally {
      await queryRunner.release();
    }
  }

  public async getMessageForElasticSearchData(messageId: string) {
    const data = await this.messageRepository.findOne({
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

  async handleGetDashboardInformation(user: any) {
    const userId = user.id;
    const companiesOfUser = await getManager()
      .createQueryBuilder(CompanyUser, 'companyUser')
      .innerJoinAndSelect('companyUser.company', 'company')
      .innerJoinAndSelect('companyUser.user', 'user')
      .andWhere('company.status =  :status', { status: EntityStatus.ACTIVE })
      .andWhere('companyUser.status = :status', { status: EntityStatus.ACTIVE })
      .andWhere('user.id = :userId', { userId: userId })
      .getMany();
    const participants = [];
    for (let i = 0; i < companiesOfUser.length; i++) {
      const participant = await getManager()
        .createQueryBuilder(Participant, 'participant')
        .innerJoinAndSelect('participant.conversation', 'conversation')
        .innerJoinAndSelect('participant.companyUser', 'companyUser')
        .innerJoinAndSelect('conversation.lastMessage', 'lastMessage')
        .innerJoinAndSelect('conversation.companyCustomer', 'companyCustomer')
        .innerJoinAndSelect('companyCustomer.customer', 'customer')
        .where('companyUser.id = :companyUserId', {
          companyUserId: companiesOfUser[i].id,
        })
        .getMany();
      participants.push(...participant);
    }

    const startTime = mtz.tz('America/Los_Angeles').startOf('day');
    const endTime = mtz.tz('America/Los_Angeles').endOf('day');
    let numberOfNotReplyYetMessages = 0;
    let numberOfNotReadYetMessages = 0;
    const lastInboundMessages = [];
    if (participants.length > 0) {
      for (let i = 0; i < participants.length; i++) {
        const participantsIndex = participants[i];
        if (
          participantsIndex.conversation.lastMessage.direction ===
            MessageDirection.INBOUND &&
          participantsIndex.conversation.companyCustomer.customer.status ===
            EntityStatus.ACTIVE
        ) {
          lastInboundMessages.push(participantsIndex);
        }
      }
      numberOfNotReadYetMessages = lastInboundMessages.filter(
        (item) => item.readStatus === 'unread',
      ).length;

      numberOfNotReplyYetMessages = lastInboundMessages.length;

      const conversationIds = participants
        .map((item) => item?.conversation?.id)
        .filter((item) => item);
      const inboundMessages =
        conversationIds.length > 0
          ? await getManager()
              .createQueryBuilder(Message, 'message')
              .innerJoinAndSelect('message.conversation', 'conversation')
              .andWhere('conversation.id IN (:...conversationIds)', {
                conversationIds: conversationIds,
              })
              .andWhere('message.direction = :direction', {
                direction: MessageDirection.INBOUND,
              })
              .andWhere(
                'message.creationTime BETWEEN :startTime and :endTime',
                {
                  startTime,
                  endTime,
                },
              )
              .getMany()
          : [];
      const outboundMessages =
        conversationIds.length > 0
          ? await getManager()
              .createQueryBuilder(Message, 'message')
              .innerJoinAndSelect('message.conversation', 'conversation')
              .andWhere('conversation.id IN (:...conversationIds)', {
                conversationIds: conversationIds,
              })
              .andWhere('message.direction = :direction', {
                direction: MessageDirection.OUTBOUND,
              })
              .andWhere(
                'message.creationTime BETWEEN :startTime and :endTime',
                {
                  startTime,
                  endTime,
                },
              )
              .getMany()
          : [];
      //*Handle get Bar Chart data
      const barChartData = [];
      for (let i = 0; i < companiesOfUser.length; i++) {
        let numberOfOutboundMessages = 0;
        let numberOfInboundMessages = 0;
        numberOfOutboundMessages = outboundMessages.filter(
          (item) => item.companyCode === companiesOfUser[i].company.code,
        ).length;
        numberOfInboundMessages = inboundMessages.filter(
          (item) => item.companyCode === companiesOfUser[i].company.code,
        ).length;
        barChartData.push({
          name: companiesOfUser[i].company.name,
          Outbound: numberOfOutboundMessages,
          Inbound: numberOfInboundMessages,
        });
      }
      //* Handle Pie chart
      const customerForPieChart = lastInboundMessages.map(
        (item) => item.conversation.companyCustomer.customer,
      );

      let newCustomerNumber = 0;
      let oldCustomerNumber = 0;
      for (let i = 0; i < customerForPieChart.length; i++) {
        if (customerForPieChart[i].creationTime < startTime) {
          oldCustomerNumber++;
        } else {
          newCustomerNumber++;
        }
      }
      const pieChartData = [
        {
          name: 'New Clients',
          value: Number(
            Number(
              (newCustomerNumber * 100) /
                (newCustomerNumber + oldCustomerNumber),
            ).toFixed(2),
          ),
        },
        {
          name: 'Old Clients',
          value: Number(
            Number(
              100 -
                (newCustomerNumber * 100) /
                  (newCustomerNumber + oldCustomerNumber),
            ).toFixed(2),
          ),
        },
      ];
      return {
        numberOfInboundMessages: inboundMessages.length,
        numberOfOutboundMessages: outboundMessages.length,
        numberOfNotReplyYetMessages,
        numberOfNotReadYetMessages,
        barChart: barChartData,
        pieChart: pieChartData,
      };
    }
    return {
      numberOfInboundMessages: 0,
      numberOfOutboundMessages: 0,
      numberOfNotReplyYetMessages: 0,
      numberOfNotReadYetMessages: 0,
      barChart: [],
      pieChart: [],
    };
  }

  async getLastContactCustomers({ user, limitItem = 5, currentItems = 0 }) {
    const lastInboundMessages = [];
    const userId = user.id;
    const startTime = mtz.tz('America/Los_Angeles').startOf('day');
    const endTime = mtz.tz('America/Los_Angeles').endOf('day');
    const companiesOfUser = await getManager()
      .createQueryBuilder(CompanyUser, 'companyUser')
      .innerJoinAndSelect('companyUser.company', 'company')
      .innerJoinAndSelect('companyUser.user', 'user')
      .andWhere('company.status =  :status', { status: EntityStatus.ACTIVE })
      .andWhere('companyUser.status = :status', { status: EntityStatus.ACTIVE })
      .andWhere('user.id = :userId', { userId: userId })
      .getMany();

    const participants = [];
    for (let i = 0; i < companiesOfUser.length; i++) {
      const participant = await getManager()
        .createQueryBuilder(Participant, 'participant')
        .innerJoinAndSelect('participant.conversation', 'conversation')
        .innerJoinAndSelect('participant.companyUser', 'companyUser')
        .innerJoinAndSelect('conversation.lastMessage', 'lastMessage')
        .leftJoinAndSelect('lastMessage.attachments', 'attachments')
        .innerJoinAndSelect('conversation.companyCustomer', 'companyCustomer')
        .innerJoinAndSelect('companyCustomer.company', 'company')
        .innerJoinAndSelect('companyCustomer.customer', 'customer')
        .where('companyUser.id = :companyUserId', {
          companyUserId: companiesOfUser[i].id,
        })
        .getMany();
      participants.push(...participant);
    }
    for (let i = 0; i < participants.length; i++) {
      const participantsIndex = participants[i];
      if (
        participantsIndex.conversation.lastMessage.direction ===
          MessageDirection.INBOUND &&
        participantsIndex.conversation.companyCustomer.customer.status ===
          EntityStatus.ACTIVE &&
        participantsIndex.conversation.lastMessage.creationTime > startTime &&
        participantsIndex.conversation.lastMessage.creationTime < endTime
      ) {
        lastInboundMessages.push(participantsIndex);
      }
    }
    const data = lastInboundMessages.map((item) => ({
      customer: item.conversation.companyCustomer.customer,
      message: {
        ...item.conversation.lastMessage,
        attachments: item.conversation.lastMessage.attachments.length,
      },
      company: item.conversation.companyCustomer.company.name,
    }));
    const offset =
      currentItems + +limitItem < data.length
        ? currentItems + +limitItem
        : data.length;
    return {
      data: data
        .sort((a, b) => {
          if (
            new Date(a.message.creationTime) < new Date(b.message.creationTime)
          )
            return 1;
          else if (
            new Date(a.message.creationTime) > new Date(b.message.creationTime)
          )
            return -1;
          return 0;
        })
        .slice(currentItems, offset),
      pagination: {
        total: data.length,
      },
    };
  }

  async sendMessageError(messageId) {
    const queryRunner = this.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const infoMessage = await this.messageRepository.findOne({
        where: {
          id: messageId,
        },
        relations: ['conversation'],
      });
      const participants = await this.participantService.getUsersInConversation(
        infoMessage.conversation.id,
        queryRunner,
      );
      if (!infoMessage) throw new NotFoundException('Not found message');
      infoMessage.messageStatus = InternalStatus.ERROR;
      const infoSavedMessage = await infoMessage.save();

      if (infoSavedMessage.mode === MessageMode.SCHEDULE) {
        const infoMessageSet = await this.messageSetRepository.findOne({
          where: {
            message: infoMessage,
          },
        });
        if (!infoMessageSet)
          throw new NotFoundException('Not found message set');
        infoMessageSet.messageSetStatus = MessageSetStatus.ERROR;
        await queryRunner.manager.save(infoMessageSet);
      }

      if (infoSavedMessage.mode === MessageMode.NORMAL) {
        infoSavedMessage['conversationId'] = infoMessage.conversation.id;
        delete infoSavedMessage['conversation'];
        this._realTimeService.updateOutboundMessage({
          message: infoSavedMessage,
          participants,
        });
      }
      await queryRunner.commitTransaction();
    } catch (error) {
      this.logger.error(error);
      await queryRunner.rollbackTransaction();
      throw new InternalServerErrorException();
    } finally {
      await queryRunner.release();
    }
  }

  async updateQueuedMessage({ exMessageId, exMessageStatus }) {
    const infoMessage = await this.messageRepository.findOne({
      where: {
        exId: exMessageId,
        status: Not(EntityStatus.DELETE),
      },
    });
    if (!infoMessage) throw new NotFoundException('Not found message');
    try {
      infoMessage.exMessageStatus = exMessageStatus.toLowerCase();
      return await infoMessage.save();
    } catch (error) {
      this.logger.error(error);
      throw new InternalServerErrorException();
    }
  }

  async syncQueuedMessage() {
    const messages = await getManager()
      .createQueryBuilder(Message, 'message')
      .where('message.exMessageStatus = :exMessageStatus', {
        exMessageStatus: ExternalStatus.QUEUED,
      })
      .innerJoinAndSelect(
        Company,
        'company',
        'company.code = message.companyCode',
      )
      .select([
        'message.exId AS ex_id',
        'company.clientId AS client_id',
        'company.clientSecret AS client_secret',
        'company.username AS username',
        'company.password AS password',
      ])
      .take(20)
      .getRawMany();

    const queuedMessages = messages.map((message) => {
      return {
        exId: message['ex_id'],
        serviceToken: createConcretesKey(
          `${message['client_id']}${message['client_secret']}${message['username']}${message['password']}`,
        ),
      };
    });

    if (messages.length > 0) {
      await this._ringcentralService.updateQueuedMessage(queuedMessages);
    }
  }

  async syncMessage(timeFrom: string, timeTo: string) {
    const companies: any = await getManager()
      .createQueryBuilder(Company, 'company')
      .where('company.appStatus = :appStatus', { appStatus: 'success' })
      .andWhere('company.status = :status', { status: 'active' })
      .select([
        'company.code AS code',
        'company.clientId AS client_id',
        'company.clientSecret AS client_secret',
        'company.username AS username',
        'company.password AS password',
      ])
      .getRawMany();

    let syncDatas: SyncDataDto[] = companies?.map((update) => {
      const syncData: SyncDataDto = {
        timeFrom,
        timeTo,
        serviceToken: createConcretesKey(
          `${update['client_id']}${update['client_secret']}${update['username']}${update['password']}`,
        ),
      };
      return syncData;
    });

    //* distinct if duplicate company
    syncDatas = _.uniqBy(syncDatas, 'serviceToken');

    this.logger.debug(`Sync message: ${JSON.stringify(syncDatas)}`);

    await this._ringcentralService.syncMessages(syncDatas);
  }

  public async syncMissedCall(backTime: number) {
    const companies: any = await getManager()
      .createQueryBuilder(Company, 'company')
      .where('company.appStatus = :appStatus', { appStatus: 'success' })
      .andWhere('company.status = :status', { status: 'active' })
      .select([
        'company.code AS code',
        'company.clientId AS client_id',
        'company.clientSecret AS client_secret',
        'company.username AS username',
        'company.password AS password',
      ])
      .getRawMany();

    let syncDatas: SyncDataDto[] = companies?.map((update) => {
      const syncData: SyncDataDto = {
        timeFrom: momenttz(new Date())
          .subtract(backTime + 5, 'minutes')
          .toISOString(),
        timeTo: momenttz(new Date()).toISOString(),
        serviceToken: createConcretesKey(
          `${update['client_id']}${update['client_secret']}${update['username']}${update['password']}`,
        ),
      };
      return syncData;
    });

    //* distinct if duplicate company
    syncDatas = _.uniqBy(syncDatas, 'serviceToken');

    await this._ringcentralService.syncMissedCalls(syncDatas);
  }

  public async syncMessageAfterRestart() {
    const messageLatestUpdate: any = await getManager()
      .createQueryBuilder(Message, 'message')
      .innerJoinAndSelect(
        Company,
        'company',
        'message.companyCode = company.code',
      )
      .where('message.exId IS NOT NULL')
      .andWhere('company.appStatus = :appStatus', { appStatus: 'success' })
      .andWhere('company.status = :status', { status: 'active' })
      .select([
        'company.code AS code',
        'company.clientId AS client_id',
        'company.clientSecret AS client_secret',
        'company.username AS username',
        'company.password AS password',
      ])
      .addSelect('MAX(message.lastModifiedTime) AS last_modified_time')
      .groupBy('company.code')
      .addGroupBy('company.clientId')
      .addGroupBy('company.clientSecret')
      .addGroupBy('company.username')
      .addGroupBy('company.password')
      .getRawMany();

    const syncDatas: SyncDataDto[] = messageLatestUpdate?.map((update) => {
      const syncData: SyncDataDto = {
        timeFrom: momenttz(update['last_modified_time'])
          .subtract(12, 'hours')
          .toISOString(),
        timeTo: momenttz(new Date()).toISOString(),
        serviceToken: createConcretesKey(
          `${update['client_id']}${update['client_secret']}${update['username']}${update['password']}`,
        ),
      };
      return syncData;
    });

    //* distinct company if duplicate and only choose company with time rage is highest
    //TODO: need fix rate limit at Ringcentral service before using this code
    // syncDatas = _.chain(syncDatas)
    //   .groupBy('serviceToken')
    //   .map((value, key) => {
    //     return {
    //       serviceToken: key,
    //       timeFrom: _.minBy(value, (data) => new Date(data.timeFrom)).timeFrom,
    //       timeTo: _.maxBy(value, (data) => new Date(data.timeTo)).timeTo,
    //     };
    //   })
    //   .value();

    this.logger.debug(
      `Sync message after restart worker: ${JSON.stringify(syncDatas)}`,
    );
    await this._ringcentralService.syncMessages(syncDatas);
  }

  public async syncMissedCallAfterRestart() {
    const callLatestUpdate: any = await getManager()
      .createQueryBuilder(Call, 'call')
      .innerJoin('call.message', 'message')
      .innerJoinAndSelect(
        Company,
        'company',
        'message.companyCode = company.code',
      )
      .where('call.exId IS NOT NULL')
      .andWhere('company.appStatus = :appStatus', { appStatus: 'success' })
      .andWhere('company.status = :status', { status: 'active' })
      .select([
        'company.code AS code',
        'company.clientId AS client_id',
        'company.clientSecret AS client_secret',
        'company.username AS username',
        'company.password AS password',
      ])
      .addSelect('MAX(message.lastModifiedTime) AS last_modified_time')
      .groupBy('company.code')
      .addGroupBy('company.clientId')
      .addGroupBy('company.clientSecret')
      .addGroupBy('company.username')
      .addGroupBy('company.password')
      .getRawMany();

    let syncDatas: SyncDataDto[] = callLatestUpdate?.map((update) => {
      const syncData: SyncDataDto = {
        timeFrom: momenttz(update['last_modified_time'])
          .subtract(12, 'hours')
          .toISOString(),
        timeTo: momenttz(new Date()).toISOString(),
        serviceToken: createConcretesKey(
          `${update['client_id']}${update['client_secret']}${update['username']}${update['password']}`,
        ),
      };
      return syncData;
    });

    //* distinct company if duplicate and only choose company with time rage is highest
    syncDatas = _.chain(syncDatas)
      .groupBy('serviceToken')
      .map((value, key) => {
        return {
          serviceToken: key,
          timeFrom: _.minBy(value, (data) => new Date(data.timeFrom)).timeFrom,
          timeTo: _.maxBy(value, (data) => new Date(data.timeTo)).timeTo,
        };
      })
      .value();

    await this._ringcentralService.syncMissedCalls(syncDatas);
  }

  async receiveInboundMissedCall(call: any) {
    const queryRunner = this.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    let softPhoneCall = null;
    let softPhoneCallToNewCustomer = null;

    try {
      const callExisted = await getManager()
        .createQueryBuilder(Call, 'call')
        .where('call.exId = :exId', {
          exId: call.id,
        })
        .andWhere('call.status = :status', { status: EntityStatus.ACTIVE })
        .getOne();

      if (callExisted) return;

      const infoCustomer = await this.customersRepository.findOne({
        where: {
          phoneNumber: call.from.phoneNumber,
          status: Not(EntityStatus.DELETE),
        },
      });

      const infoCompany = await this.companyRepository.findOne({
        where: {
          phone: call.to.phoneNumber,
          status: Not(EntityStatus.DELETE),
        },
      });

      //* not found company
      if (!infoCompany) return;

      //* new client
      if (!infoCustomer) {
        const companyCustomers = await this.customersService.createCustomer(
          {
            companyCustomers: [
              {
                status: EntityStatus.ACTIVE,
                companyId: infoCompany.id,
              },
            ],
            fullName: '',
            emailAddress: '',
            phoneNumber: call.from.phoneNumber,
            status: EntityStatus.ACTIVE,
          },
          queryRunner.manager,
          1, //* umn,
          false,
          null,
          MessageDirection.INBOUND,
        );
        const infoConversation = await queryRunner.manager.findOne(
          Conversation,
          companyCustomers[0].companyCustomer.conversation.id,
        );
        const newCall = new Call();
        newCall.exCreationTime = call.startTime;
        newCall.exId = call.id;
        newCall.direction = MessageDirection.INBOUND;
        newCall.externalCallStatus = call.result;
        newCall.duration = call.duration;
        newCall.exCreationTime = call.startTime;
        const infoCallAfterCreate = await queryRunner.manager.save(newCall);

        const newMessage = new Message();
        newMessage.conversation =
          companyCustomers[0].companyCustomer.conversation;
        newMessage.direction = MessageDirection.INBOUND;
        newMessage.mode = MessageMode.NORMAL;
        newMessage.type = 'call';
        newMessage.exCreationTime = call.startTime;
        newMessage.exLastModifiedTime = call.startTime;
        newMessage.companyCode = infoCompany.code;
        newMessage.call = infoCallAfterCreate;
        newMessage.exMessageStatus = call.result;
        newMessage.messageStatus = InternalStatus.RECEIVED;
        newMessage.isPolling = call.isPolling;
        const infoMessageAfterCreate = await queryRunner.manager.save(
          newMessage,
        );
        let attachmentAfterCreate = null;
        if (call.attachment) {
          const newAttachment = new Attachment();
          newAttachment.url = call.attachment.internalUrl;
          newAttachment.exUrl = call.attachment.externalUrl;
          newAttachment.name = call.attachment.name;
          newAttachment.category = call.attachment.type.split('/')[0];
          newAttachment.format = call.attachment.type.split('/')[1];
          newAttachment.size = call.attachment.size.split(' ')[0];
          newAttachment.message = infoMessageAfterCreate;
          newAttachment.exId = call.attachment.externalId;

          attachmentAfterCreate = await queryRunner.manager.save(newAttachment);
        }

        infoConversation.lastMessage = infoMessageAfterCreate;
        await queryRunner.manager.save(infoConversation);
        softPhoneCallToNewCustomer = {
          conversation: {
            id: infoConversation.id,
            company: companyCustomers[0].companyCustomer.company.code,
            customer: {
              ...companyCustomers[0].companyCustomer.customer,
              companies: [companyCustomers[0].companyCustomer.company.name],
            },
            lastModifiedTime: infoConversation.lastModifiedTime,
            lastMessage: {
              text: '',
              direction: MessageDirection.INBOUND,
              creationTime: infoMessageAfterCreate.creationTime,
              exCreationTime: infoCallAfterCreate.exCreationTime,
              messagesStatus: InternalStatus.RECEIVED,
              exMessageStatus: infoMessageAfterCreate.exMessageStatus,
              mode: MessageMode.NORMAL,
              type: 'call',
            },
            messages: [
              {
                id: infoMessageAfterCreate.id,
                text: infoMessageAfterCreate.text,
                attachments: attachmentAfterCreate
                  ? [
                      {
                        url: attachmentAfterCreate.url,
                        exUrl: attachmentAfterCreate.exUrl,
                        category: attachmentAfterCreate.category,
                        format: attachmentAfterCreate.format,
                        id: attachmentAfterCreate.id,
                        width: attachmentAfterCreate.width,
                        height: attachmentAfterCreate.height,
                        size: attachmentAfterCreate.size,
                        name: attachmentAfterCreate.name,
                      },
                    ]
                  : [],
                sender: {},
                direction: MessageDirection.INBOUND,
                mode: MessageMode.NORMAL,
                creationTime: infoMessageAfterCreate.creationTime,
                exCreationTime: infoMessageAfterCreate.exCreationTime,
                messagesStatus: infoMessageAfterCreate.messageStatus,
                exMessageStatus: infoMessageAfterCreate.exMessageStatus,
                conversationId: infoMessageAfterCreate.conversation.id,
                call: newCall,
                type: 'call',
                index: infoMessageAfterCreate.index,
                companyCode: infoMessageAfterCreate.companyCode,
              },
            ],
            participants: companyCustomers[0].participants,
          },
        };

        //* notification new client
        await this.notificationService.pushNotify(
          {
            entityId: companyCustomers[0].companyCustomer.customer.id,
            notificationTypeId: NotificationType.NEW_CLIENT,
            company: infoCompany,
          },
          queryRunner,
        );

        //* notification new missed call
        await this.notificationService.pushNotify(
          {
            entityId: newCall.id,
            notificationTypeId: NotificationType.MISSED_CALL,
            company: infoCompany,
          },
          queryRunner,
        );
      } else {
        //* existing client
        const infoCompanyCustomer = await getManager()
          .createQueryBuilder(CompanyCustomer, 'companyCustomer')
          .innerJoinAndSelect('companyCustomer.company', 'company')
          .innerJoinAndSelect('companyCustomer.customer', 'customer')
          .innerJoinAndSelect('companyCustomer.conversation', 'conversation')
          .andWhere('customer.id = :customerId', {
            customerId: infoCustomer.id,
          })
          .andWhere('company.id = :companyId', {
            companyId: infoCompany.id,
          })
          .andWhere('conversation.status != :status', {
            status: EntityStatus.DELETE,
          })
          .andWhere('companyCustomer.status != :status', {
            status: EntityStatus.DELETE,
          })
          .getOne();

        //* existing client in company
        if (infoCompanyCustomer) {
          let attachmentAfterCreate = null;
          if (infoCompanyCustomer.status === EntityStatus.INACTIVE) {
            infoCompanyCustomer.status = EntityStatus.ACTIVE;
            await queryRunner.manager.save(infoCompanyCustomer);
          }
          const attendances = (
            await this.participantRepository.find({
              where: {
                conversation: infoCompanyCustomer.conversation.id,
                status: EntityStatus.ACTIVE,
              },
              relations: ['companyUser', 'companyUser.user'],
            })
          ).filter((item) => item.companyUser.status === EntityStatus.ACTIVE);

          const updateUmnPromise = attendances.map((participant) => {
            participant.umn += 1;
            participant.readStatus = ReadStatus.UNREAD;
            return queryRunner.manager.save(participant);
          });

          await Promise.all(updateUmnPromise);
          const newCall = new Call();
          newCall.exCreationTime = call.startTime;
          newCall.exId = call.id;
          newCall.direction = MessageDirection.INBOUND;
          newCall.externalCallStatus = call.result;
          newCall.duration = call.duration;
          newCall.exCreationTime = call.startTime;

          const infoCallAfterCreate = await queryRunner.manager.save(newCall);
          const newMessage = new Message();
          newMessage.conversation = infoCompanyCustomer.conversation;
          newMessage.direction = MessageDirection.INBOUND;
          newMessage.mode = MessageMode.NORMAL;
          newMessage.type = 'call';
          newMessage.exCreationTime = call.startTime;
          newMessage.exLastModifiedTime = call.startTime;
          newMessage.companyCode = infoCompany.code;
          newMessage.call = infoCallAfterCreate;
          newMessage.exMessageStatus = call.result;
          newMessage.messageStatus = InternalStatus.RECEIVED;
          newMessage.companyCode = infoCompany.code;
          newMessage.isPolling = call.isPolling;
          const infoMessageAfterCreate = await queryRunner.manager.save(
            newMessage,
          );
          if (call.attachment) {
            const newAttachment = new Attachment();
            newAttachment.url = call.attachment.internalUrl;
            newAttachment.exUrl = call.attachment.externalUrl;
            newAttachment.name = call.attachment.name;
            newAttachment.category = call.attachment.type.split('/')[0];
            newAttachment.format = call.attachment.type.split('/')[1];
            newAttachment.size = call.attachment.size.split(' ')[0];
            newAttachment.message = infoMessageAfterCreate;
            newAttachment.exId = call.attachment.externalId;

            attachmentAfterCreate = await queryRunner.manager.save(
              newAttachment,
            );
          }

          await this.conversationsService.updateLastMessageAndUser(
            infoCompanyCustomer.conversation.id,
            {
              lastMessage: infoMessageAfterCreate,
              lastUser: null,
            },
            queryRunner.manager,
          );
          softPhoneCall = {
            ...infoMessageAfterCreate,
            attachments: attachmentAfterCreate
              ? [
                  {
                    url: attachmentAfterCreate.url,
                    exUrl: attachmentAfterCreate.exUrl,
                    category: attachmentAfterCreate.category,
                    format: attachmentAfterCreate.format,
                    id: attachmentAfterCreate.id,
                    width: attachmentAfterCreate.width,
                    height: attachmentAfterCreate.height,
                    size: attachmentAfterCreate.size,
                    name: attachmentAfterCreate.name,
                  },
                ]
              : [],
            participants: attendances,
          };

          //* notification new missed call
          await this.notificationService.pushNotify(
            {
              entityId: newCall.id,
              notificationTypeId: NotificationType.MISSED_CALL,
              company: infoCompany,
            },
            queryRunner,
          );

          //* notification new missed call
        } else {
          //* existing client in system but new in company
          const companyCustomer: CreateCompanyCustomerDto = {
            companyId: infoCompany.id,
            status: EntityStatus.ACTIVE,
          };
          const addedCompanyCustomer =
            await this.customersService.addCustomerToCompany(
              infoCustomer,
              companyCustomer,
              queryRunner.manager,
              1, //*umn,
              null,
              MessageDirection.INBOUND,
            ); //* ex: { companyCustomer: {}, participants: []}
          const newCall = new Call();
          newCall.exCreationTime = call.startTime;
          newCall.exId = call.id;
          newCall.direction = MessageDirection.INBOUND;
          newCall.externalCallStatus = call.result;
          newCall.duration = call.duration;
          newCall.exCreationTime = call.startTime;
          const infoCallAfterCreate = await queryRunner.manager.save(newCall);

          const newMessage = new Message();
          newMessage.conversation =
            addedCompanyCustomer.companyCustomer.conversation;
          newMessage.direction = MessageDirection.INBOUND;
          newMessage.mode = MessageMode.NORMAL;
          newMessage.type = 'call';
          newMessage.exCreationTime = call.startTime;
          newMessage.exLastModifiedTime = call.startTime;
          newMessage.companyCode = infoCompany.code;
          newMessage.call = infoCallAfterCreate;
          newMessage.exMessageStatus = call.result;
          newMessage.messageStatus = InternalStatus.RECEIVED;
          const infoMessageAfterCreate = await queryRunner.manager.save(
            newMessage,
          );
          let attachmentAfterCreate = null;
          if (call.attachment) {
            const newAttachment = new Attachment();
            newAttachment.url = call.attachment.internalUrl;
            newAttachment.exUrl = call.attachment.externalUrl;
            newAttachment.name = call.attachment.name;
            newAttachment.category = call.attachment.type.split('/')[0];
            newAttachment.format = call.attachment.type.split('/')[1];
            newAttachment.size = call.attachment.size.split(' ')[0];
            newAttachment.message = infoMessageAfterCreate;
            newAttachment.exId = call.attachment.externalId;

            attachmentAfterCreate = await queryRunner.manager.save(
              newAttachment,
            );
          }
          const infoConversation = await queryRunner.manager.findOne(
            Conversation,
            addedCompanyCustomer.companyCustomer.conversation.id,
          );

          infoConversation.lastMessage = infoMessageAfterCreate;
          await queryRunner.manager.save(infoConversation);

          softPhoneCallToNewCustomer = {
            conversation: {
              id: infoConversation.id,
              company: addedCompanyCustomer.companyCustomer.company.code,
              customer: {
                ...addedCompanyCustomer.companyCustomer.customer,
                companies: [addedCompanyCustomer.companyCustomer.company.name],
              },
              lastModifiedTime: infoConversation.lastModifiedTime,
              lastMessage: {
                text: '',
                direction: MessageDirection.INBOUND,
                creationTime: infoMessageAfterCreate.creationTime,
                exCreationTime: infoCallAfterCreate.exCreationTime,
                exMessageStatus: infoMessageAfterCreate.exMessageStatus,
                messagesStatus: InternalStatus.RECEIVED,
                mode: MessageMode.NORMAL,
                type: 'call',
              },
              messages: [
                {
                  id: infoMessageAfterCreate.id,
                  text: infoMessageAfterCreate.text,
                  attachments: attachmentAfterCreate
                    ? [
                        {
                          url: attachmentAfterCreate.url,
                          exUrl: attachmentAfterCreate.exUrl,
                          category: attachmentAfterCreate.category,
                          format: attachmentAfterCreate.format,
                          id: attachmentAfterCreate.id,
                          width: attachmentAfterCreate.width,
                          height: attachmentAfterCreate.height,
                          size: attachmentAfterCreate.size,
                          name: attachmentAfterCreate.name,
                        },
                      ]
                    : [],
                  sender: {},
                  direction: MessageDirection.INBOUND,
                  mode: MessageMode.NORMAL,
                  type: 'call',
                  creationTime: infoMessageAfterCreate.creationTime,
                  exCreationTime: infoMessageAfterCreate.exCreationTime,
                  messagesStatus: infoMessageAfterCreate.messageStatus,
                  exMessageStatus: infoMessageAfterCreate.exMessageStatus,
                  conversationId: infoMessageAfterCreate.conversation.id,
                  call: newCall,
                  index: infoMessageAfterCreate.index,
                  companyCode: infoMessageAfterCreate.companyCode,
                },
              ],
              participants: addedCompanyCustomer.participants,
            },
          };

          //* notification new client
          await this.notificationService.pushNotify(
            {
              entityId: addedCompanyCustomer.companyCustomer.customer.id,
              notificationTypeId: NotificationType.NEW_CLIENT,
              company: infoCompany,
            },
            queryRunner,
          );

          //* notification new missed call
          await this.notificationService.pushNotify(
            {
              entityId: newCall.id,
              notificationTypeId: NotificationType.MISSED_CALL,
              company: infoCompany,
            },
            queryRunner,
          );
        }
      }

      await queryRunner.commitTransaction();
      if (softPhoneCallToNewCustomer)
        this._realTimeService.receiveMissedInboundCallFromNewCustomer(
          softPhoneCallToNewCustomer,
        );
      if (softPhoneCall) {
        this._realTimeService.receiveMissedInboundCall(softPhoneCall);
      }

      return {};
    } catch (error) {
      this.logger.error(error);
      await queryRunner.rollbackTransaction();
      throw new InternalServerErrorException();
    } finally {
      await queryRunner.release();
    }
  }
}
