import { ExternalStatus } from 'src/common/constant/external-status';
import {
  ConflictException,
  HttpService,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AwsS3PresignedMethod } from 'src/common/constant/aws-s3-presigned-method';
import { EntityStatus } from 'src/common/constant/entity-status';
import { Brackets, Connection, getManager, In, Not } from 'typeorm';
import { CompanyRepository } from '../companies/repository/company.repository';
import { AwsS3Service } from '../services/http/aws-s3/aws-s3.service';
import { CreateScheduleMessageDto } from './dto/create-schedule-message.dto';
import { ScheduleMessage } from './entity/schedule-message.entity';
import { ScheduleMessageRepository } from './repository/schedule-message.repository';
import { v4 as uuid } from 'uuid';
import { ScheduleFile } from 'src/common/dto/schedule-file.dto';
import { UpdateScheduleMessageDto } from './dto/update-schedule-message.dto';
import { User } from '../users/entity/user.entity';
import * as moment from 'moment';
import { MessageSetStatus } from 'src/common/constant/message-set-status';
import { ScheduleMessageStatus } from 'src/common/constant/schedule-message-status';
import * as XLSX from 'xlsx';
import { MessageSet } from './entity/message-set.entity';
import { WorkerService } from '../services/amqp/services/woker.service';
import { UserRepository } from '../users/repository/user.repository';
import { formatPhoneNumber } from 'src/common/utils/formatPhoneNumber';
import { MessageLimit } from 'src/common/constant/limit';
import { Message } from '../messages/entity/message.entity';
import { MessageDirection } from 'src/common/constant/message-direction';
import * as _ from 'lodash';
import { Logger } from '@nestjs/common';
import { CampaignsRepository } from '../campaigns/repository/campaigns.repository';
import { transformSavePhoneNumber } from 'src/common/utils/transformSavePhoneNumber';
import { Customer } from '../customers/entity/customer.entity';
import { CustomerCampaign } from '../customer-campaigns/entity/customer-campaigns.entity';
import { Campaign } from '../campaigns/entity/campaigns.entity';

@Injectable()
export class ScheduleMessagesService {
  private readonly logger = new Logger(ScheduleMessagesService.name);

  constructor(
    @InjectRepository(ScheduleMessageRepository)
    private readonly scheduleMessageRepository: ScheduleMessageRepository,
    private readonly userRepository: UserRepository,
    @InjectRepository(CompanyRepository)
    private readonly companyRepository: CompanyRepository,
    @InjectRepository(CampaignsRepository)
    private readonly campaignRepository: CampaignsRepository,
    private readonly _awsS3: AwsS3Service,
    private readonly workerService: WorkerService,
    private readonly connection: Connection,
    private readonly _httpService: HttpService,
  ) {}

  //* file: Buffer
  private extractDataCustomersFile = (file: any) => {
    try {
      const workbook = XLSX.read(file, { type: 'buffer', cellDates: true });
      const ws = workbook.Sheets[workbook.SheetNames[0]];

      const headers = [];
      const cells: any = workbook.Sheets[workbook.SheetNames[0]];
      for (const [key] of Object.entries(cells)) {
        if (key.indexOf('1') !== -1) headers.push(cells[key].v);
      }

      //* convert sheet to json
      const extractedData = XLSX.utils.sheet_to_json(ws, {
        defval: '',
        header: headers,
        raw: false,
      });

      //* setup return data
      const data = {
        data: extractedData,
        sheetName: workbook.SheetNames[0],
        phoneNumberKey: headers[0],
      };

      return data;
    } catch (error) {
      console.log(error);
    }
  };

  public async validateSchedule(
    file: any,
    isFile: string,
    fileInformation: any,
    campaignId: string,
    content: string,
    customFields: any,
  ) {
    let fileBuffer = null;

    //* find campaign All
    const campaignAll = await getManager()
      .createQueryBuilder(Campaign, 'campaign')
      .where('campaign.name = :all', { all: 'All' })
      .andWhere('campaign.status = :active', { active: EntityStatus.ACTIVE })
      .getOne();
    const campaignAllId = campaignAll?.id;

    if (isFile === 'true') fileBuffer = file?.buffer;
    else {
      const customerFile = await this._httpService
        .get(fileInformation?.url, { responseType: 'arraybuffer' })
        .toPromise();
      fileBuffer = customerFile?.data;
    }

    if (!fileBuffer)
      throw new InternalServerErrorException('Cannot load file data');

    //* read file data
    const fileData = this.extractDataCustomersFile(fileBuffer);
    const data = fileData?.data;
    data.shift();

    if (data?.length <= 0) throw new ConflictException('Invalid file data');

    //* init validate warning
    const warnings = {
      fileName: file?.originalname || fileInformation?.name,
      invalidPhoneNumber: [],
      optOutPhoneNumber: [],
    };

    //* validate phoneNumber list in file data
    const phoneNumbers = data.map((item: any) => {
      const regexPhoneNumber =
        /^((\+[0-9]{1}|())([0-9]{3}|[\(][0-9]{3}[\)])((-|\.| )|())([0-9]{3})((-|\.| )|())([0-9]{4}))$/;

      //* description regexPhoneNumber
      // /^(
      //   (\+[0-9]{1}|())                 => +x | null
      //   ([0-9]{3}|[\(][0-9]{3}[\)])     => xxx | (xxx)
      //   ((-|\.| )|())                   => - | . | space | null
      //   ([0-9]{3})                      => xxx
      //   ((-|\.| )|())                   => - | . | space | null
      //   ([0-9]{4})                      => xxxx
      // )$/;

      //* phone number format exp
      // +xxxxxxxxxxx
      // +x(xxx)-xxx-xxxx
      // +x(xxx).xxx.xxxx
      // +x(xxx) xxx xxxx
      // xxxxxxxxxx
      // (xxx)-xxx-xxxx
      // xxx.xxx.xxxx
      // xxx xxx xxxx
      // ...

      //* check phoneNumber format
      const invalidPhoneNumber = regexPhoneNumber.test(
        item[fileData.phoneNumberKey]?.trim(),
      );

      if (!invalidPhoneNumber)
        warnings.invalidPhoneNumber.push({
          column: fileData.phoneNumberKey,
          row: item.__rowNum__ + 1,
          location: `A${item.__rowNum__ + 1}`,
          phoneNumber: item[fileData.phoneNumberKey],
          message: 'Invalid phone number',
        });
      // console.log(formatPhoneNumber(item[fileData.phoneNumberKey]?.trim()));

      //* check length when add content and custom field
      let enhancedContent = content;
      for (const customField of JSON.parse(customFields)) {
        if (customField['status'] === 'active') {
          enhancedContent = content.replace(
            new RegExp(`{${customField['field']}}`, 'gi'),
            item[customField['column']],
          );
        }
      }

      if (enhancedContent.length > MessageLimit.MAX_LENGTH) {
        warnings.invalidPhoneNumber.push({
          column: '',
          row: item.__rowNum__ + 1,
          location: 'Custom fields',
          phoneNumber: item[fileData.phoneNumberKey],
          message: `Length of content which was appended custom fields is exceed ${MessageLimit.MAX_LENGTH.toString()} characters.`,
        });
      }

      return item;
    });

    try {
      //* transform phoneNumber list in file data to database format number
      const formatPhoneNumbers = phoneNumbers.map((item: string) =>
        transformSavePhoneNumber(item[fileData.phoneNumberKey]),
      );

      //* check phoneNumber opt out in database
      const customers =
        phoneNumbers?.length > 0
          ? await getManager()
              .createQueryBuilder(Customer, 'customer')
              .select(['customer.id'])
              .where('customer.phoneNumber IN (:...phoneNumbers)', {
                phoneNumbers: formatPhoneNumbers,
              })
              .andWhere('customer.status != :status', {
                status: EntityStatus.DELETE,
              })
              .getMany()
          : [];

      const customersId =
        customers.map((customer: Customer) => customer.id) || [];

      const customerCampaigns =
        customersId?.length > 0
          ? await getManager()
              .createQueryBuilder(CustomerCampaign, 'customerCampaign')
              .innerJoinAndSelect('customerCampaign.customer', 'customer')
              .select([
                'customerCampaign.id',
                'customerCampaign.status',
                'customer',
              ])
              .where('customerCampaign.customer IN (:...customersId)', {
                customersId: customersId,
              })
              .andWhere('customerCampaign.campaign IN (:...campaignIds)', {
                campaignIds: [campaignId, campaignAllId],
              })
              .andWhere('customerCampaign.status = :active', {
                active: EntityStatus.ACTIVE,
              })
              .getMany()
          : [];

      const phoneNumbersOptOut = customerCampaigns.map(
        (item) => item.customer?.phoneNumber,
      );

      //* mapping opt out phone Number and push to  result warnings
      formatPhoneNumbers.map((item, index) => {
        if (
          phoneNumbersOptOut.findIndex(
            (phoneNumberOptOut) => phoneNumberOptOut === item,
          ) !== -1
        ) {
          warnings.optOutPhoneNumber.push({
            column: fileData.phoneNumberKey,
            row: phoneNumbers[index]['__rowNum__'] + 1,
            location: `A${phoneNumbers[index]['__rowNum__'] + 1}`,
            phoneNumber: phoneNumbers[index][fileData.phoneNumberKey],
            message: 'Opt out phone number',
          });
        }
        return item;
      });

      return warnings;
    } catch (error) {
      console.log(error);
      throw new InternalServerErrorException();
    }
  }

  public async createScheduleMessage(
    createScheduleMessageDto: CreateScheduleMessageDto,
    user = null,
  ) {
    const queryRunner = this.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    const infoCompany = await this.companyRepository.findOne({
      where: {
        status: Not(EntityStatus.DELETE),
        id: createScheduleMessageDto.companyId,
      },
    });
    const infoCampaign = await this.campaignRepository.findOne({
      where: {
        status: Not(EntityStatus.DELETE),
        id: createScheduleMessageDto.campaignId,
      },
    });
    if (!infoCompany) throw new NotFoundException('Not found company');
    if (!infoCampaign) throw new NotFoundException('Not found campaign');
    try {
      const newScheduleMessage = new ScheduleMessage();
      newScheduleMessage.content = createScheduleMessageDto.content;
      newScheduleMessage.name = createScheduleMessageDto.name;
      newScheduleMessage.company = infoCompany;
      newScheduleMessage.campaign = infoCampaign;
      newScheduleMessage.canRetry = createScheduleMessageDto.canRetry;
      newScheduleMessage.customerUrl = createScheduleMessageDto.customerUrl;
      newScheduleMessage.cronExpression =
        createScheduleMessageDto.cronExpression;
      newScheduleMessage.isCronExpression =
        createScheduleMessageDto.isCronExpression;
      newScheduleMessage.dateTime = new Date(createScheduleMessageDto.dateTime);
      newScheduleMessage.creationUserId = user ? user.id : '';
      newScheduleMessage.attachmentUrls =
        createScheduleMessageDto.attachmentUrls
          ? createScheduleMessageDto.attachmentUrls
          : [];
      newScheduleMessage.customFields = createScheduleMessageDto.customFields
        ? createScheduleMessageDto.customFields
        : null;
      newScheduleMessage.sendStatus = ScheduleMessageStatus.WAITING;
      const createdScheduleMessage = await queryRunner.manager.save(
        newScheduleMessage,
      );

      await this.workerService.createScheduleMessage({
        cronExpression: createdScheduleMessage.cronExpression,
        scheduleMessageId: createdScheduleMessage.id,
        isCronExpression: createdScheduleMessage.isCronExpression,
        specifiedDate: createdScheduleMessage.dateTime,
      });

      await queryRunner.commitTransaction();

      return createdScheduleMessage;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw new InternalServerErrorException();
    } finally {
      await queryRunner.release();
    }
  }

  private async _createBackupScheduleMessage(
    schedule: ScheduleMessage,
    failedMessageSets: [MessageSet],
  ) {
    const queryRunner = this.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    const listMessageFailed = failedMessageSets.map((item) => item.id);

    try {
      const scheduleMessage = _.omit(schedule, [
        'id',
        'lastModifiedTime',
        'creationTime',
        'sendStatus',
        'name',
      ]);
      const scheduleTime = moment().add(6, 'minutes').toDate();

      scheduleMessage['sendStatus'] = ScheduleMessageStatus.WAITING;
      scheduleMessage['name'] = `Retry - ${schedule.name}`;
      const backupSchedule = new ScheduleMessage();
      backupSchedule.name = scheduleMessage['name'];
      backupSchedule.sendStatus = scheduleMessage['sendStatus'];
      backupSchedule.content = scheduleMessage['content'];
      backupSchedule.cronExpression = scheduleMessage['cronExpression'];
      backupSchedule.isCronExpression = scheduleMessage['isCronExpression'];
      backupSchedule.dateTime = scheduleTime;
      backupSchedule.isIssue = scheduleMessage['isIssue'];
      backupSchedule.customerUrl = scheduleMessage['customerUrl'];
      backupSchedule.attachmentUrls = scheduleMessage['attachmentUrls'];
      backupSchedule.customFields = scheduleMessage['customFields'];
      backupSchedule.creationUserId = scheduleMessage['creationUserId'];
      backupSchedule.lastModifiedUserId = scheduleMessage['lastModifiedUserId'];
      backupSchedule.status = scheduleMessage['status'];
      backupSchedule.company = scheduleMessage['company'];
      backupSchedule.backupScheduleMessageId = schedule['id'];
      backupSchedule.isBackup = false;
      backupSchedule.messagesFailed = listMessageFailed;
      backupSchedule.campaign = scheduleMessage['campaign'];

      const newScheduleMessage = await queryRunner.manager.save(backupSchedule);

      await queryRunner.manager.update(ScheduleMessage, schedule.id, {
        isBackup: true,
      });

      await this.workerService.createScheduleMessage({
        cronExpression: newScheduleMessage.cronExpression,
        scheduleMessageId: newScheduleMessage.id,
        isCronExpression: newScheduleMessage.isCronExpression,
        specifiedDate: scheduleTime,
      });

      await queryRunner.commitTransaction();
      return newScheduleMessage;
    } catch (error) {
      this.logger.error(error);
      await queryRunner.rollbackTransaction();
    } finally {
      await queryRunner.release();
    }
  }

  public async updateScheduleMessage(
    id: string,
    updateScheduleMessageDto: UpdateScheduleMessageDto,
    user: User,
  ) {
    const infoScheduleMessage = await this.scheduleMessageRepository.findOne({
      where: {
        id: id,
        status: Not(EntityStatus.DELETE),
        sendStatus: ScheduleMessageStatus.WAITING,
      },
    });
    if (!infoScheduleMessage)
      throw new NotFoundException('Not found schedule message');

    const infoCompany = await this.companyRepository.findOne({
      where: {
        id: updateScheduleMessageDto.companyId,
        status: Not(EntityStatus.DELETE),
      },
    });
    if (!infoCompany) throw new NotFoundException('Not found company');
    const infoCampaign = await this.campaignRepository.findOne({
      where: {
        id: updateScheduleMessageDto.campaignId,
        status: Not(EntityStatus.DELETE),
      },
    });
    if (!infoCampaign) throw new NotFoundException('Not found campaign');
    try {
      if (
        (updateScheduleMessageDto.isCronExpression &&
          updateScheduleMessageDto.cronExpression !==
            infoScheduleMessage.cronExpression) ||
        (!updateScheduleMessageDto.isCronExpression &&
          JSON.stringify(new Date(updateScheduleMessageDto.dateTime)) !==
            JSON.stringify(infoScheduleMessage.dateTime))
      ) {
        await this.workerService.updateScheduleMessage({
          cronExpression: updateScheduleMessageDto.cronExpression,
          scheduleMessageId: infoScheduleMessage.id,
          isCronExpression: updateScheduleMessageDto.isCronExpression,
          specifiedDate: updateScheduleMessageDto.dateTime,
        });
      }
      if (!updateScheduleMessageDto.backupScheduleMessageId) {
        infoScheduleMessage.company = infoCompany;
        infoScheduleMessage.content = updateScheduleMessageDto.content;
        infoScheduleMessage.campaign = infoCampaign;
        infoScheduleMessage.canRetry = updateScheduleMessageDto.canRetry;
        infoScheduleMessage.customerUrl = updateScheduleMessageDto.customerUrl;
        infoScheduleMessage.customFields =
          updateScheduleMessageDto.customFields;
        infoScheduleMessage.attachmentUrls =
          updateScheduleMessageDto.attachmentUrls;
      }
      infoScheduleMessage.lastModifiedUserId = user ? user.id : '';
      infoScheduleMessage.name = updateScheduleMessageDto.name;
      infoScheduleMessage.cronExpression =
        updateScheduleMessageDto.cronExpression;
      infoScheduleMessage.isCronExpression =
        updateScheduleMessageDto.isCronExpression;
      infoScheduleMessage.dateTime = new Date(
        updateScheduleMessageDto.dateTime,
      );
    } catch (error) {
      infoScheduleMessage.sendStatus = ScheduleMessageStatus.ERROR;
      throw new InternalServerErrorException();
    } finally {
      return await infoScheduleMessage.save();
    }
  }

  public async stopScheduleMessage(id: string, user = null): Promise<any> {
    const infoScheduleMessage = await this.scheduleMessageRepository.findOne({
      where: {
        id: id,
        status: Not(EntityStatus.DELETE),
        sendStatus: In([
          ScheduleMessageStatus.PAUSING,
          ScheduleMessageStatus.WAITING,
          ScheduleMessageStatus.SENDING,
        ]),
      },
    });
    if (!infoScheduleMessage)
      throw new NotFoundException('Not found schedule message');

    try {
      const messageSetIds = await this.workerService.stopScheduleMessage(
        infoScheduleMessage.id,
      );
      if (messageSetIds.length > 0) {
        await getManager()
          .createQueryBuilder()
          .update(MessageSet)
          .set({ messageSetStatus: MessageSetStatus.STOP })
          .where('id IN (:...ids)', { ids: messageSetIds })
          .execute();
      } else {
        await getManager()
          .createQueryBuilder(MessageSet, 'messageSet')
          .innerJoinAndSelect('messageSet.scheduleMessage', 'scheduleMessage')
          .update(MessageSet)
          .set({ messageSetStatus: MessageSetStatus.STOP })
          .where(
            'scheduleMessage.id = :scheduleMessageId and messageSetStatus = :messageSetStatus',
            {
              scheduleMessageId: infoScheduleMessage.id,
              messageSetStatus: MessageSetStatus.PAUSING,
            },
          )
          .execute();
      }
      infoScheduleMessage.lastModifiedUserId = user ? user.id : '';
      infoScheduleMessage.sendStatus = ScheduleMessageStatus.STOP;
    } catch (error) {
      infoScheduleMessage.sendStatus = ScheduleMessageStatus.ERROR;
      throw new InternalServerErrorException();
    } finally {
      return await infoScheduleMessage.save();
    }
  }

  public async pauseScheduleMessage(id: string, user = null): Promise<any> {
    const infoScheduleMessage = await this.scheduleMessageRepository.findOne({
      where: {
        id: id,
        status: Not(EntityStatus.DELETE),
        sendStatus: ScheduleMessageStatus.SENDING,
      },
    });
    if (!infoScheduleMessage)
      throw new NotFoundException('Not found schedule message');

    infoScheduleMessage.lastModifiedUserId = user ? user.id : '';
    infoScheduleMessage.sendStatus = ScheduleMessageStatus.PAUSING;

    try {
      const messageSetIds = await this.workerService.pauseScheduleMessage(
        infoScheduleMessage.id,
      );
      if (Array.isArray(messageSetIds)) {
        if (messageSetIds?.length)
          await getManager()
            .createQueryBuilder()
            .update(MessageSet)
            .set({ messageSetStatus: MessageSetStatus.PAUSING })
            .where('id IN (:...ids)', { ids: messageSetIds })
            .execute();
      } else {
        throw new NotFoundException('Pause schedule fail');
      }
    } catch (error) {
      infoScheduleMessage.sendStatus = ScheduleMessageStatus.ERROR;
      throw new InternalServerErrorException();
    } finally {
      await new Promise((r) => setTimeout(r, 3000));
      return await infoScheduleMessage.save();
    }
  }

  public async runScheduleMessage(id: string): Promise<any> {
    const infoScheduleMessage = await this.scheduleMessageRepository.findOne({
      where: {
        id: id,
        status: Not(EntityStatus.DELETE),
        sendStatus: In([
          ScheduleMessageStatus.WAITING,
          ScheduleMessageStatus.TIMEOUT,
        ]),
      },
      relations: ['company'],
    });
    if (!infoScheduleMessage)
      throw new NotFoundException('Not found schedule message');

    const urlSpliceBucketName = infoScheduleMessage.customerUrl['url'].slice(
      infoScheduleMessage.customerUrl['url'].indexOf(process.env.AWS_S3_BKN),
    );
    const key = urlSpliceBucketName.slice(urlSpliceBucketName.indexOf('/') + 1);

    infoScheduleMessage.sendStatus = ScheduleMessageStatus.SENDING;
    try {
      if (infoScheduleMessage.backupScheduleMessageId) {
        const failedMessageSets: MessageSet[] = await getManager()
          .createQueryBuilder(MessageSet, 'messageSet')
          .innerJoinAndSelect(
            'messageSet.message',
            'message',
            'messageSet.messageId = message.id',
          )
          .where('messageSet.scheduleMessageId = :scheduleMessageId', {
            scheduleMessageId: infoScheduleMessage.backupScheduleMessageId,
          })
          .andWhere(
            '(message.exMessageStatus = :exStatusDelivered OR message.exMessageStatus = :exStatusSent)',
            {
              exStatusDelivered: ExternalStatus.DELIVERED_FAIL,
              exStatusSent: ExternalStatus.SENT_FAIL,
            },
          )
          .select('messageSet')
          .getMany();
        if (failedMessageSets.length > 0) {
          // * create MessageSet
          const newMessageSetsPromise = failedMessageSets.map(
            async (messageSet) => {
              const newMessageSet = new MessageSet();
              const backupMessageSet = _.omit(messageSet, [
                'id',
                'lastModifiedTime',
                'creationTime',
                'scheduleMessage',
                'message',
                'messageSetStatus',
              ]);
              backupMessageSet['messageSetStatus'] = MessageSetStatus.WAITING;
              backupMessageSet['message'] = null;
              backupMessageSet['scheduleMessage'] = infoScheduleMessage;
              newMessageSet.messageSetStatus =
                backupMessageSet['messageSetStatus'];
              newMessageSet.customFields = backupMessageSet['customFields'];
              newMessageSet.content = backupMessageSet['content'];
              newMessageSet.companyPhone = backupMessageSet['companyPhone'];
              newMessageSet.customerPhone = backupMessageSet['customerPhone'];
              newMessageSet.attachmentUrls = backupMessageSet['attachmentUrls'];
              newMessageSet.creationUserId = backupMessageSet['creationUserId'];
              newMessageSet.lastModifiedUserId =
                backupMessageSet['lastModifiedUserId'];
              newMessageSet.status = backupMessageSet['status'];
              newMessageSet.scheduleMessage =
                backupMessageSet['scheduleMessage'];
              newMessageSet.customer = backupMessageSet['customer'];
              newMessageSet.message = backupMessageSet['message'];
              return await newMessageSet.save();
            },
          );
          return (await Promise.all(newMessageSetsPromise)).map(
            (item) => item.id,
          );
        }
      } else {
        const buffer = await this._awsS3.downloadFile(key);
        const fileData = this.extractDataCustomersFile(buffer);
        const data = fileData?.data;
        data.shift();

        const infoCustomers = data;
        const messageSets = infoCustomers.map(async (customer) => {
          const newMessageSet = new MessageSet();
          const result = Object.assign({});
          for (let i = 0; i < infoScheduleMessage.customFields.length; i++) {
            if (infoScheduleMessage.customFields[i]['column'] === 'phone') {
              result[infoScheduleMessage.customFields[i]['field']] =
                formatPhoneNumber(
                  customer[infoScheduleMessage.customFields[i]['column']],
                );
            } else {
              result[infoScheduleMessage.customFields[i]['field']] =
                customer[infoScheduleMessage.customFields[i]['column']];
            }
          }
          newMessageSet.content = infoScheduleMessage.content;
          newMessageSet.customFields = result;
          const plainPhone = customer['phone'].replace(/[^0-9]/g, '');
          newMessageSet.customerPhone =
            plainPhone.length === 10 ? `+1${plainPhone}` : `+${plainPhone}`;
          newMessageSet.messageSetStatus = MessageSetStatus.WAITING;
          newMessageSet.attachmentUrls = infoScheduleMessage.attachmentUrls.map(
            (attachment) => attachment['url'],
          );
          newMessageSet.scheduleMessage = infoScheduleMessage;
          newMessageSet.companyPhone = infoScheduleMessage.company.phone;
          newMessageSet.creationUserId = infoScheduleMessage.creationUserId;
          return newMessageSet.save();
        });

        return (await Promise.all(messageSets)).map((item) => item.id);
      }
    } catch (error) {
      console.log(error);
      infoScheduleMessage.sendStatus = ScheduleMessageStatus.ERROR;
      throw new InternalServerErrorException();
    } finally {
      await infoScheduleMessage.save();
    }
  }

  public async resumeScheduleMessage(id: string, user = null): Promise<any> {
    const infoScheduleMessage = await this.scheduleMessageRepository.findOne({
      where: {
        id: id,
        status: Not(EntityStatus.DELETE),
        sendStatus: ScheduleMessageStatus.PAUSING,
      },
    });
    if (!infoScheduleMessage)
      throw new NotFoundException('Not found schedule message');

    infoScheduleMessage.lastModifiedUserId = user ? user.id : '';
    infoScheduleMessage.sendStatus = ScheduleMessageStatus.SENDING;

    try {
      const messageSets = await getManager()
        .createQueryBuilder(MessageSet, 'messageSet')
        .select(['messageSet.id'])
        .innerJoin('messageSet.scheduleMessage', 'scheduleMessage')
        .andWhere('scheduleMessage.id = :id', { id })
        .andWhere('messageSet.messageSetStatus = :messageSetStatus', {
          messageSetStatus: MessageSetStatus.PAUSING,
        })
        .getMany();

      const listMessageSet = messageSets.map((item) => item.id);

      if (listMessageSet?.length)
        await getManager()
          .createQueryBuilder()
          .update(MessageSet)
          .set({ messageSetStatus: MessageSetStatus.WAITING })
          .where('id IN (:...ids)', { ids: listMessageSet })
          .execute();

      const data = await this.workerService.resumeScheduleMessage({
        scheduleMessageId: infoScheduleMessage.id,
        sendMessageDataList: listMessageSet,
      });

      if (data === true) return data;
      else throw new NotFoundException('Not found schedule message');
    } catch (error) {
      infoScheduleMessage.sendStatus = ScheduleMessageStatus.ERROR;
      throw new InternalServerErrorException();
    } finally {
      await infoScheduleMessage.save();
    }
  }

  public async deleteScheduleMessage(id: string, user = null): Promise<any> {
    const infoScheduleMessage = await this.scheduleMessageRepository.findOne({
      where: {
        id: id,
        status: Not(EntityStatus.DELETE),
        sendStatus: In([
          ScheduleMessageStatus.STOP,
          ScheduleMessageStatus.DONE,
          ScheduleMessageStatus.ERROR,
          ScheduleMessageStatus.TIMEOUT,
        ]),
      },
    });
    if (!infoScheduleMessage)
      throw new NotFoundException('Not found schedule message');

    try {
      infoScheduleMessage.lastModifiedUserId = user ? user.id : '';
      infoScheduleMessage.status = EntityStatus.DELETE;
      await infoScheduleMessage.save();

      return {
        error: false,
        status: 'success',
      };
    } catch (error) {
      throw new InternalServerErrorException();
    }
  }

  public async getSignedUrl(scheduleFile: ScheduleFile): Promise<any> {
    const acceptAttachments = [
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
    ];
    const acceptCustomerFile = [
      'vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];
    const id = uuid();
    const { customerFile, attachments } = scheduleFile;
    if (customerFile)
      if (!acceptCustomerFile.includes(customerFile.type.split('/')[1]))
        throw new UnsupportedMediaTypeException();

    if (attachments) {
      const isValid = attachments.every((attachment) => {
        return acceptAttachments.includes(attachment.type.split('/')[1]);
      });
      if (!isValid) throw new UnsupportedMediaTypeException();
    }

    try {
      const response = {};
      if (attachments) {
        const signedAttachments = attachments.map((attachment) => {
          return this._awsS3.getSignedUrl(
            `${process.env.AWS_S3_PATH_SCHEDULE_MESSAGE}/${id}/attachment/${attachment.fileName}`,
            AwsS3PresignedMethod.PUT,
            attachment.type,
          );
        });
        response['attachmentUrls'] = await Promise.all(signedAttachments);
      }
      if (customerFile) {
        const signedCustomerFile = await this._awsS3.getSignedUrl(
          `${process.env.AWS_S3_PATH_SCHEDULE_MESSAGE}/${id}/customerFile/${customerFile.fileName}`,
          AwsS3PresignedMethod.PUT,
          customerFile.type,
        );
        response['customerUrl'] = signedCustomerFile;
      }
      return response;
    } catch (error) {
      throw new InternalServerErrorException();
    }
  }

  public async getScheduleMessages(filters): Promise<any> {
    const { _page, _limit } = filters;
    try {
      const infoSchedules = await getManager()
        .createQueryBuilder(ScheduleMessage, 'scheduleMessage')
        .leftJoinAndSelect(
          'scheduleMessage.messageSetOfScheduleMessage',
          'messageSetOfScheduleMessage',
        )
        .leftJoinAndSelect('scheduleMessage.company', 'company')
        .where('scheduleMessage.status != :status', {
          status: EntityStatus.DELETE,
        })
        .andWhere('scheduleMessage.backupScheduleMessageId is null')
        .take(_limit)
        .skip((+_page - 1) * _limit)
        .orderBy('scheduleMessage.dateTime', 'DESC')
        .getMany();

      const countInfoScheduleMessage = await getManager()
        .createQueryBuilder(ScheduleMessage, 'scheduleMessage')
        .leftJoinAndSelect(
          'scheduleMessage.messageSetOfScheduleMessage',
          'messageSetOfScheduleMessage',
        )
        .where('scheduleMessage.status != :status', {
          status: EntityStatus.DELETE,
        })
        .andWhere('scheduleMessage.backupScheduleMessageId is null')
        .getCount();

      const childScheduleList = await getManager()
        .createQueryBuilder(ScheduleMessage, 'scheduleMessage')
        .leftJoinAndSelect('scheduleMessage.company', 'company')
        .leftJoinAndSelect(
          'scheduleMessage.messageSetOfScheduleMessage',
          'messageSetOfScheduleMessage',
        )
        .where('scheduleMessage.backupScheduleMessageId is not null')
        .getMany();
      const fullInfoSchedules = infoSchedules.map(async (schedule) => {
        const currentSentMessages = schedule.messageSetOfScheduleMessage.filter(
          (messageSet) =>
            messageSet.messageSetStatus !== MessageSetStatus.WAITING &&
            messageSet.messageSetStatus !== MessageSetStatus.PAUSING &&
            messageSet.messageSetStatus !== MessageSetStatus.STOP,
        ).length;
        const totalMessages = schedule.messageSetOfScheduleMessage.length;
        const user = await this.userRepository.findOne({
          where: {
            id: schedule.creationUserId,
          },
        });
        let childSchedule;
        childScheduleList.forEach((item) => {
          const currentSentMessagesChild =
            item.messageSetOfScheduleMessage.filter(
              (messageSet) =>
                messageSet.messageSetStatus !== MessageSetStatus.WAITING &&
                messageSet.messageSetStatus !== MessageSetStatus.PAUSING &&
                messageSet.messageSetStatus !== MessageSetStatus.STOP,
            ).length;
          let totalMessagesChild = item.messageSetOfScheduleMessage.length;
          if (!totalMessagesChild) {
            totalMessagesChild = item['messagesFailed'].length;
          }
          if (item['backupScheduleMessageId'] === schedule.id) {
            childSchedule = {
              ...item,
              currentSentMessagesChild,
              totalMessagesChild,
              userCreated: user,
            };
          }
        });
        return {
          ...schedule,
          currentSentMessages,
          backup: childSchedule,
          totalMessages,
          userCreated: user,
        };
      });
      const data = await Promise.all(fullInfoSchedules);
      return {
        pagination: {
          _limit: _limit,
          _page: +_page,
          _total: countInfoScheduleMessage,
        },
        data: data,
      };
    } catch (error) {
      throw new InternalServerErrorException();
    }
  }

  public async getPullingSchedule(filters): Promise<any> {
    const { recordsNumber } = filters;
    try {
      const schedulerWaiting = await this.scheduleMessageRepository.find({
        where: {
          sendStatus: ScheduleMessageStatus.WAITING,
        },
      });
      for (let i = 0; i < schedulerWaiting.length; i++) {
        if (
          !moment()
            .subtract(5, 'minutes')
            .isBefore(schedulerWaiting[i].dateTime)
        ) {
          schedulerWaiting[i].sendStatus = ScheduleMessageStatus.ERROR;
          await schedulerWaiting[i].save();
        }
      }
      const infoSchedules = await getManager()
        .createQueryBuilder(ScheduleMessage, 'scheduleMessage')
        .leftJoinAndSelect('scheduleMessage.company', 'company')
        .leftJoinAndSelect(
          'scheduleMessage.messageSetOfScheduleMessage',
          'messageSetOfScheduleMessage',
        )
        .where('scheduleMessage.status != :status', {
          status: EntityStatus.DELETE,
        })
        .andWhere('scheduleMessage.backupScheduleMessageId is null')
        .take(recordsNumber)
        // .skip((+_page - 1) * _limit)
        .orderBy('scheduleMessage.dateTime', 'DESC')
        .getMany();

      const childScheduleList = await getManager()
        .createQueryBuilder(ScheduleMessage, 'scheduleMessage')
        .leftJoinAndSelect('scheduleMessage.company', 'company')
        .leftJoinAndSelect(
          'scheduleMessage.messageSetOfScheduleMessage',
          'messageSetOfScheduleMessage',
        )
        .where('scheduleMessage.backupScheduleMessageId is not null')
        .getMany();

      const fullInfoSchedules = infoSchedules.map(async (schedule) => {
        const currentSentMessages = schedule.messageSetOfScheduleMessage.filter(
          (messageSet) =>
            messageSet.messageSetStatus !== MessageSetStatus.WAITING &&
            messageSet.messageSetStatus !== MessageSetStatus.PAUSING &&
            messageSet.messageSetStatus !== MessageSetStatus.STOP,
        ).length;
        const totalMessages = schedule.messageSetOfScheduleMessage.length;
        const user = await this.userRepository.findOne({
          where: {
            id: schedule.creationUserId,
            status: EntityStatus.ACTIVE,
          },
        });
        let childSchedule;
        childScheduleList.forEach((item) => {
          const currentSentMessagesChild =
            item.messageSetOfScheduleMessage.filter(
              (messageSet) =>
                messageSet.messageSetStatus !== MessageSetStatus.WAITING &&
                messageSet.messageSetStatus !== MessageSetStatus.PAUSING &&
                messageSet.messageSetStatus !== MessageSetStatus.STOP,
            ).length;
          let totalMessagesChild = item.messageSetOfScheduleMessage.length;
          if (!totalMessagesChild) {
            totalMessagesChild = item.messagesFailed.length;
          }
          if (item.backupScheduleMessageId === schedule.id) {
            childSchedule = {
              ...item,
              currentSentMessagesChild,
              totalMessagesChild,
              userCreated: user,
            };
          }
        });
        return {
          ...schedule,
          currentSentMessages,
          backup: childSchedule,
          totalMessages,
          userCreated: user,
        };
      });
      const data = await Promise.all(fullInfoSchedules);
      return data;
    } catch (error) {
      throw new InternalServerErrorException();
    }
  }

  public async getScheduleMessage(id: string): Promise<any> {
    const infoSchedule = await getManager()
      .createQueryBuilder(ScheduleMessage, 'scheduleMessage')
      .addSelect(['campaign.id'])
      .innerJoinAndSelect('scheduleMessage.company', 'company')
      .innerJoin('scheduleMessage.campaign', 'campaign')
      .andWhere(
        'scheduleMessage.id = :id and scheduleMessage.status != :status and scheduleMessage.sendStatus = :sendStatus',
        {
          id: id,
          status: EntityStatus.DELETE,
          sendStatus: ScheduleMessageStatus.WAITING,
        },
      )
      .andWhere('company.status != :status', { status: EntityStatus.DELETE })
      .getOne();
    if (!infoSchedule)
      throw new NotFoundException('Not found schedule message');
    return { ...infoSchedule, company: infoSchedule.company.id };
  }

  public async getMessageSetsOfScheduleMessage(id: string): Promise<any> {
    let messageSets = await getManager()
      .createQueryBuilder(MessageSet, 'messageSet')
      .innerJoinAndSelect('messageSet.scheduleMessage', 'scheduleMessage')
      .leftJoinAndSelect('messageSet.message', 'message')
      .innerJoinAndSelect('message.conversation', 'conversation')
      .andWhere(
        'scheduleMessage.id = :scheduleMessageId and scheduleMessage.sendStatus != :sendStatus',
        { scheduleMessageId: id, sendStatus: ScheduleMessageStatus.WAITING },
      )
      .orderBy('message.creationTime', 'DESC')
      .getMany();
    if (messageSets.length === 0) {
      const scheduleMessage = await getManager()
        .createQueryBuilder(ScheduleMessage, 'scheduleMessage')
        .leftJoinAndSelect(
          'scheduleMessage.messageSetOfScheduleMessage',
          'messageSetOfScheduleMessage',
        )
        .where('scheduleMessage.id = :id', {
          id,
        })
        .getOne();
      const listMessageSet = [];
      for (let i = 0; i < scheduleMessage.messagesFailed.length; i++) {
        const messageSetId = scheduleMessage.messagesFailed[i];
        const messageSet = await getManager()
          .createQueryBuilder(MessageSet, 'messageSet')
          .innerJoinAndSelect('messageSet.scheduleMessage', 'scheduleMessage')
          .leftJoinAndSelect('messageSet.message', 'message')
          .innerJoinAndSelect('message.conversation', 'conversation')
          .where('messageSet.id = :messageSetId', {
            messageSetId,
          })
          .getOne();
        messageSet.messageSetStatus = MessageSetStatus.STOP;
        listMessageSet.push(messageSet);
      }
      messageSets = listMessageSet;
    }
    const getResponse = messageSets.map(async (messageSet) => {
      const nextOutboundMessage = await getManager()
        .createQueryBuilder(Message, 'message')
        .innerJoinAndSelect('message.conversation', 'conversation')
        .andWhere(
          'message.direction = :direction and conversation.id = :conversationId',
          {
            direction: MessageDirection.OUTBOUND,
            conversationId: messageSet.message.conversation.id,
          },
        )
        .andWhere('message.index > :index', { index: messageSet.message.index })
        .getOne();
      if (nextOutboundMessage) {
        const responses = await getManager()
          .createQueryBuilder(Message, 'message')
          .select(['message.id', 'message.text', 'message.creationTime'])
          .innerJoin('message.conversation', 'conversation')
          .andWhere(
            'message.direction = :direction and conversation.id = :conversationId',
            {
              direction: MessageDirection.INBOUND,
              conversationId: messageSet.message.conversation.id,
            },
          )
          .andWhere(
            'message.index > :startIndex and message.index < :endIndex ',
            {
              startIndex: messageSet.message.index,
              endIndex: nextOutboundMessage.index,
            },
          )
          .getMany();
        return {
          ...messageSet,
          responses: responses,
        };
      } else {
        const responses = await getManager()
          .createQueryBuilder(Message, 'message')
          .select(['message.id', 'message.text', 'message.creationTime'])
          .innerJoin('message.conversation', 'conversation')
          .andWhere(
            'message.direction = :direction and conversation.id = :conversationId',
            {
              direction: MessageDirection.INBOUND,
              conversationId: messageSet.message.conversation.id,
            },
          )
          .andWhere('message.index > :index', {
            index: messageSet.message.index,
          })
          .getMany();
        return {
          ...messageSet,
          responses: responses,
        };
      }
    });
    return await Promise.all(getResponse);
  }

  public async _detectFailedScheduleMessageToRetry() {
    const scheduleMessages: ScheduleMessage[] = await getManager()
      .createQueryBuilder(ScheduleMessage, 'scheduleMessage')
      .innerJoinAndSelect('scheduleMessage.company', 'company')
      .innerJoinAndSelect('scheduleMessage.campaign', 'campaign')
      .where('scheduleMessage.sendStatus = :sendStatus', {
        sendStatus: ScheduleMessageStatus.DONE,
      })
      .andWhere('scheduleMessage.lastModifiedTime > :currentTime', {
        currentTime: moment(new Date()).subtract(1, 'hours'),
      })
      .andWhere('scheduleMessage.isBackup = :isBackup', { isBackup: false })
      .andWhere('scheduleMessage.canRetry = :canRetry', { canRetry: true })
      .getMany();
    for (let index = 0; index < scheduleMessages.length; index++) {
      const scheduleMessage = scheduleMessages[index];
      const { queuedMessageCount } = await getManager()
        .createQueryBuilder(MessageSet, 'messageSet')
        .innerJoinAndSelect(
          'messageSet.message',
          'message',
          'messageSet.messageId = message.id',
        )
        .where('message.exMessageStatus = :exStatus', {
          exStatus: ExternalStatus.QUEUED,
        })
        .select('COUNT(*)', 'queuedMessageCount')
        .getRawOne();
      if (parseInt(queuedMessageCount) === 0) {
        const failedMessageSets: any = await getManager()
          .createQueryBuilder(MessageSet, 'messageSet')
          .innerJoinAndSelect(
            'messageSet.message',
            'message',
            'messageSet.messageId = message.id',
          )
          .where('messageSet.scheduleMessageId = :scheduleMessageId', {
            scheduleMessageId: scheduleMessage.id,
          })
          .andWhere(
            '(message.exMessageStatus = :exStatusDelivered OR message.exMessageStatus = :exStatusSent)',
            {
              exStatusDelivered: ExternalStatus.DELIVERED_FAIL,
              exStatusSent: ExternalStatus.SENT_FAIL,
            },
          )
          .select('messageSet')
          .getMany();
        if (failedMessageSets.length > 0) {
          await this._createBackupScheduleMessage(
            scheduleMessage,
            failedMessageSets,
          );
        }
      } else {
        continue;
      }
    }
  }

  public async getMessageSetOfScheduleRetry(id: string) {
    const scheduleMessage = await getManager()
      .createQueryBuilder(ScheduleMessage, 'scheduleMessage')
      .leftJoinAndSelect(
        'scheduleMessage.messageSetOfScheduleMessage',
        'messageSetOfScheduleMessage',
      )
      .where('scheduleMessage.id = :id', {
        id,
      })
      .getOne();
    const listMessageSet = [];
    for (let i = 0; i < scheduleMessage.messagesFailed.length; i++) {
      const messageSetId = scheduleMessage.messagesFailed[i];
      const messageSet = await getManager()
        .createQueryBuilder(MessageSet, 'messageSet')
        .where('messageSet.id = :messageSetId', {
          messageSetId,
        })
        .getOne();
      let message = messageSet.content;
      for (const key in messageSet.customFields) {
        if (
          Object.prototype.hasOwnProperty.call(messageSet.customFields, key)
        ) {
          const value = messageSet.customFields[key];
          message = message.replace(new RegExp(`{${key}}`, 'gi'), value);
        }
      }
      const customerPhone = formatPhoneNumber(messageSet.customerPhone);
      listMessageSet.push({
        content: message,
        ...messageSet.customFields,
        phone: customerPhone,
      });
    }
    return listMessageSet;
  }
}
