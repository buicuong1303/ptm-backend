import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AddOptSuggestionDto } from './dto/opt-suggestion.dto';
import * as _ from 'lodash';
import { OptSuggestionRepository } from './repository/opt-suggestion.repository';
import { OptSuggestion } from './entity/opt-suggestion.entity';
import { UpdateOptSuggestionDto } from './dto/update-opt-suggestions.dto';
import { EntityStatus } from 'src/common/constant/entity-status';
import { getManager } from 'typeorm';
import { ConversationRepository } from '../conversations/repository/conversation.repository';
import { MessageRepository } from '../messages/repository/message.repository';
import { CompanyCustomerRepository } from '../company-customers/repository/company-customer.repository';
import { CompanyCustomer } from '../company-customers/entity/company-customer.entity';
import { transformSearchPhoneNumber } from 'src/common/utils/transformSearchPhoneNumber';
import { OptStatus } from 'src/common/constant/opt-status';
import { CampaignsRepository } from '../campaigns/repository/campaigns.repository';
import { CustomerCampaign } from '../customer-campaigns/entity/customer-campaigns.entity';
import { Message } from '../messages/entity/message.entity';
import { Campaign } from '../campaigns/entity/campaigns.entity';
import { Customer } from '../customers/entity/customer.entity';
import { User } from '../users/entity/user.entity';

@Injectable()
export class OptSuggestionsService {
  constructor(
    @InjectRepository(OptSuggestionRepository)
    private companyCustomerRepository: CompanyCustomerRepository,
    private conversationRepository: ConversationRepository,
    private messageRepository: MessageRepository,
    private optSuggestionRepository: OptSuggestionRepository,
    private campaignRepository: CampaignsRepository,
  ) {}

  async filterSuggestion(
    limitItem: any = null,
    currentItem: any = null,
    searchValue: any = '',
  ) {
    let results = [];
    const resultsMix = {
      currentItem: currentItem,
      totalSuggestions: 0,
      optSuggestions: [],
    };
    const optSuggestions = await this.getSuggestions();

    if (optSuggestions.length === 0)
      throw new NotFoundException('Not found Opt Suggestions');

    if (!searchValue) {
      results = [...optSuggestions];
    } else {
      for (let i = 0; i < optSuggestions.length; i++) {
        let lastUser = '';
        for (const key in optSuggestions[i]) {
          if (
            key === 'customerPhone' &&
            optSuggestions[i][key] &&
            optSuggestions[i][key]
              .toLowerCase()
              .indexOf(
                transformSearchPhoneNumber(searchValue).toLowerCase() || 'any',
              ) != -1
          ) {
            if (optSuggestions[i].lastModifiedUserId) {
              if (optSuggestions[i].lastModifiedUserId) {
                const user = await getManager()
                  .createQueryBuilder(User, 'user')
                  .where('user.id = :userId', {
                    userId: optSuggestions[i].lastModifiedUserId,
                  })
                  .getOne();
                if (user) {
                  lastUser = `${user.firstName} ${user.lastName}`;
                }
              }
            }
            optSuggestions[i].lastUserActive = lastUser;
            results.push(optSuggestions[i]);
            break;
          }
          if (
            (key === 'reason' ||
              key === 'optStatus' ||
              key === 'status' ||
              key === 'campaign') &&
            optSuggestions[i][key] &&
            optSuggestions[i][key]
              .toLowerCase()
              .indexOf(searchValue.toLowerCase()) != -1
          ) {
            if (optSuggestions[i].lastModifiedUserId) {
              if (optSuggestions[i].lastModifiedUserId) {
                const user = await getManager()
                  .createQueryBuilder(User, 'user')
                  .where('user.id = :userId', {
                    userId: optSuggestions[i].lastModifiedUserId,
                  })
                  .getOne();
                if (user) {
                  lastUser = `${user.firstName} ${user.lastName}`;
                }
              }
            }
            optSuggestions[i].lastUserActive = lastUser;
            results.push(optSuggestions[i]);
            break;
          }
        }
      }
    }
    resultsMix.totalSuggestions = results.length;
    const listCustomers = results.splice(currentItem, limitItem);

    const customersFullInfor = await Promise.all(listCustomers);

    resultsMix.optSuggestions = customersFullInfor;

    return resultsMix;
  }

  async createOptSuggestion(optSuggestionDto: AddOptSuggestionDto, user?: any) {
    const message = await this.messageRepository.findOne({
      where: {
        id: optSuggestionDto.messageId,
      },
      relations: ['conversation'],
    });
    if (!message && optSuggestionDto.customerId) {
      const customer = await getManager()
        .createQueryBuilder(Customer, 'customer')
        .where('customer.id = :customerId', {
          customerId: optSuggestionDto.customerId,
        })
        .getOne();

      if (!customer) throw new NotFoundException('Not Found customer');
      const optSuggestion = new OptSuggestion();
      optSuggestion.optStatus = optSuggestionDto.optStatus;
      optSuggestion.reason = optSuggestionDto.reason;
      optSuggestion.rate = optSuggestionDto.rate;
      optSuggestion.customerId = customer.id;
      optSuggestion.campaignId = optSuggestionDto.campaignId;
      optSuggestion.creationUserId = user?.id;
      optSuggestion.lastModifiedUserId = user?.id;
      return {
        success: true,
        data: await optSuggestion.save(),
      };
    }
    if (message) {
      if (optSuggestionDto.campaignId) {
        const isExistOptSuggestion = await this.optSuggestionRepository.findOne(
          {
            where: {
              messageId: message.id,
              campaignId: optSuggestionDto.campaignId,
            },
          },
        );
        if (isExistOptSuggestion)
          return {
            success: false,
            message: 'Opt suggestion has been exist',
          };
      }
      const companyCustomer = await getManager()
        .createQueryBuilder(CompanyCustomer, 'companyCustomer')
        .innerJoinAndSelect('companyCustomer.conversation', 'conversation')
        .innerJoinAndSelect('companyCustomer.customer', 'customer')
        .where('conversation.id = :conversationId', {
          conversationId: message.conversation.id,
        })
        .getOne();
      if (!companyCustomer)
        throw new NotFoundException('Not found company customer !!');
      const optSuggestion = new OptSuggestion();
      optSuggestion.optStatus = optSuggestionDto.optStatus;
      optSuggestion.reason = optSuggestionDto.reason;
      optSuggestion.rate = optSuggestionDto.rate;
      optSuggestion.customerId = companyCustomer.customer.id;
      optSuggestion.messageId = optSuggestionDto.messageId;
      optSuggestion.campaignId = optSuggestionDto.campaignId;
      optSuggestion.creationUserId = user?.id;
      optSuggestion.lastModifiedUserId = user?.id;
      return {
        success: true,
        data: await optSuggestion.save(),
      };
    }
  }

  async updateOptSuggestion(
    updateOptSuggestionDto: UpdateOptSuggestionDto,
    user: any,
  ) {
    const optSuggestion = await getManager()
      .createQueryBuilder(OptSuggestion, 'optSuggestion')
      .where('optSuggestion.id = :optSuggestionId', {
        optSuggestionId: updateOptSuggestionDto.optSuggestionId,
      })
      .getOne();
    if (!optSuggestion) throw new NotFoundException('Not found Opt Suggestion');
    if (updateOptSuggestionDto.confirm === false) {
      optSuggestion.suggestionStatus = updateOptSuggestionDto.confirm;
      if (updateOptSuggestionDto.campaignId) {
        optSuggestion.campaignId = updateOptSuggestionDto.campaignId;
      }
      optSuggestion.lastModifiedUserId = user.id;
      await optSuggestion.save();
      return optSuggestion;
    }
    if (!updateOptSuggestionDto.campaignId)
      throw new NotFoundException('Campaign cant empty');
    const campaign = await getManager()
      .createQueryBuilder(Campaign, 'campaign')
      .where('campaign.id = :campaignId', {
        campaignId: updateOptSuggestionDto.campaignId,
      })
      .getOne();
    if (!campaign) throw new NotFoundException('Not found campaign');
    const customer = await getManager()
      .createQueryBuilder(Customer, 'customer')
      .where('customer.id = :customerId', {
        customerId: optSuggestion.customerId,
      })
      .getOne();
    if (!customer) throw new NotFoundException('Not Found customer');
    const customerCampaign = await getManager()
      .createQueryBuilder(CustomerCampaign, 'customerCampaign')
      .innerJoinAndSelect('customerCampaign.customer', 'customer')
      .innerJoinAndSelect('customerCampaign.campaign', 'campaign')
      .where('customer.id = :customerId', {
        customerId: customer.id,
      })
      .andWhere('campaign.id = :campaignId', {
        campaignId: campaign.id,
      })
      .getOne();

    optSuggestion.suggestionStatus = updateOptSuggestionDto.confirm;
    optSuggestion.campaignId = updateOptSuggestionDto.campaignId;
    optSuggestion.lastModifiedUserId = user.id;
    await optSuggestion.save();
    if (optSuggestion.suggestionStatus) {
      if (!customerCampaign) {
        const newCustomerCampaign = new CustomerCampaign();
        newCustomerCampaign.campaign = campaign;
        newCustomerCampaign.customer = customer;
        newCustomerCampaign.creationUserId = user.id;
        newCustomerCampaign.lastModifiedUserId = user.id;
        if (optSuggestion.optStatus === OptStatus.OUT) {
          newCustomerCampaign.status = EntityStatus.ACTIVE;
        } else {
          newCustomerCampaign.status = EntityStatus.DELETE;
        }
        await newCustomerCampaign.save();
      } else {
        if (optSuggestion.optStatus === OptStatus.OUT) {
          customerCampaign.status = EntityStatus.ACTIVE;
        } else {
          customerCampaign.status = EntityStatus.DELETE;
        }
        customerCampaign.lastModifiedUserId = user.id;
        await customerCampaign.save();
      }
    }
    return optSuggestion;
  }

  async deleteOptSuggestion(optSuggestionId) {
    const optSuggestion = await this.optSuggestionRepository.findOne({
      where: {
        id: optSuggestionId,
        status: EntityStatus.ACTIVE,
      },
    });
    optSuggestion.status = EntityStatus.DELETE;
    await optSuggestion.save();
  }
  async getSuggestions() {
    const entityStatus = EntityStatus.ACTIVE;
    const suggestions = await getManager()
      .createQueryBuilder(OptSuggestion, 'optSuggestion')
      .where('optSuggestion.status = :entityStatus', { entityStatus })
      .orderBy('optSuggestion.suggestionStatus IS NULL', 'DESC')
      .addOrderBy('optSuggestion.creationTime', 'DESC')
      .getMany();

    const suggestionsFormat = suggestions.map(async (item) => {
      const message = await getManager()
        .createQueryBuilder(Message, 'message')
        .innerJoinAndSelect('message.conversation', 'conversation')
        .innerJoinAndSelect('conversation.companyCustomer', 'companyCustomer')
        .innerJoinAndSelect('companyCustomer.company', 'company')
        .innerJoinAndSelect('companyCustomer.customer', 'customer')
        .where('message.id = :messageId', { messageId: item.messageId })
        .getOne();
      const customer = await getManager()
        .createQueryBuilder(Customer, 'customer')
        .where('customer.id = :customerId', { customerId: item.customerId })
        .getOne();
      if (!customer) throw new NotFoundException('Not found customer');
      const campaignSql = getManager().createQueryBuilder(Campaign, 'campaign');
      let campaign = null;
      if (item.campaignId) {
        campaignSql.andWhere('campaign.id = :campaignId', {
          campaignId: item.campaignId,
        });
        campaign = await campaignSql.getOne();
      }
      let lastUser = '';
      if (item.lastModifiedUserId) {
        const user = await getManager()
          .createQueryBuilder(User, 'user')
          .where('user.id = :userId', { userId: item.lastModifiedUserId })
          .getOne();
        if (user) {
          lastUser = `${user.firstName} ${user.lastName}`;
        }
      }
      return {
        ...item,
        lastUserActive: lastUser,
        customerPhone: customer.phoneNumber,
        campaign: campaign ? campaign.name : '',
        message: message,
      };
    });
    return Promise.all(suggestionsFormat);
  }

  async getSuggestionById(id) {
    const suggestion = await this.optSuggestionRepository.findOne({
      where: {
        id: id,
      },
    });

    return suggestion;
  }

  async getCampaignCustomersOut() {
    const customerCampaigns = await getManager()
      .createQueryBuilder(CustomerCampaign, 'customerCampaign')
      .innerJoinAndSelect('customerCampaign.campaign', 'campaign')
      .innerJoinAndSelect('customerCampaign.customer', 'customer')
      .where('customerCampaign.status = :status', {
        status: EntityStatus.ACTIVE,
      })
      .orderBy('customerCampaign.creationTime', 'DESC')
      .getMany();
    const dataCustomerCampaigns = [];

    for (let i = 0; i < customerCampaigns.length; i++) {
      const customerCampaign = customerCampaigns[i];
      let lastUser = '';
      if (customerCampaign.lastModifiedUserId) {
        const user = await getManager()
          .createQueryBuilder(User, 'user')
          .where('user.id = :userId', {
            userId: customerCampaign.lastModifiedUserId,
          })
          .getOne();
        if (user) {
          lastUser = `${user.firstName} ${user.lastName}`;
        }
      }
      dataCustomerCampaigns.push({
        lastUserActive: lastUser,
        ...customerCampaign,
      });
    }
    return dataCustomerCampaigns;
  }

  async getSuggestionHistory(campaignId: string, customerId: string) {
    const suggestion = await getManager()
      .createQueryBuilder(OptSuggestion, 'optSuggestion')
      .where('optSuggestion.campaignId = :campaignId', { campaignId })
      .orderBy('optSuggestion.creationTime', 'DESC')
      .getMany();
    const suggestionFilterCustomer = suggestion.map(async (item) => {
      const message = await getManager()
        .createQueryBuilder(Message, 'message')
        .innerJoinAndSelect('message.conversation', 'conversation')
        .where('message.id = :messageId', { messageId: item.messageId })
        .getOne();
      let companyCustomer;
      if (message) {
        companyCustomer = await getManager()
          .createQueryBuilder(CompanyCustomer, 'companyCustomer')
          .innerJoinAndSelect('companyCustomer.customer', 'customer')
          .innerJoinAndSelect('companyCustomer.company', 'company')
          .innerJoinAndSelect('companyCustomer.conversation', 'conversation')
          .where('conversation.id = :conversationId', {
            conversationId: message.conversation.id,
          })
          .andWhere('customer.id = :customerId', { customerId: customerId })
          .getOne();
      }
      if (item.customerId === customerId) {
        return {
          ...item,
          conversationId: message ? message.conversation.id : '',
          messageText: message ? message.text : '',
          companyCode: message ? companyCustomer.company.code : '',
        };
      } else {
        return null;
      }
    });
    const suggestionFilter = await Promise.all(suggestionFilterCustomer);
    const dataFilter = suggestionFilter.filter((item) => {
      if (item) {
        return true;
      } else {
        return false;
      }
    });
    const dataAttachUsername = dataFilter.map(async (item) => {
      if (item.lastModifiedUserId) {
        const user = await getManager()
          .createQueryBuilder(User, 'user')
          .where('user.id = :userId', { userId: item.lastModifiedUserId })
          .getOne();
        if (!user) throw new NotFoundException('Not found User');
        const name = `${user.firstName} ${user.lastName}`;
        item['lastUserActive'] = name;
        return item;
      } else {
        item['lastUserActive'] = '';
        return item;
      }
    });

    const lastData = await Promise.all(dataAttachUsername);

    return lastData;
    // return suggestion;
  }

  async filterSuggestionHistory(
    limitItem: any = null,
    currentItem: any = null,
    searchValue: any = '',
  ) {
    let results = [];
    const resultsMix = {
      currentItem: currentItem,
      totalSuggestions: 0,
      suggestionsHistory: [],
    };
    const optSuggestions = await this.getCampaignCustomersOut();
    if (optSuggestions.length === 0)
      throw new NotFoundException('Not found Opt Suggestions');
    if (!searchValue) {
      results = [...optSuggestions];
    } else {
      for (let i = 0; i < optSuggestions.length; i++) {
        let lastUser = '';
        if (
          optSuggestions[i].customer &&
          optSuggestions[i].customer.phoneNumber
            .toLowerCase()
            .indexOf(
              transformSearchPhoneNumber(searchValue).toLowerCase() || 'any',
            ) != -1
        ) {
          if (optSuggestions[i].lastModifiedUserId) {
            if (optSuggestions[i].lastModifiedUserId) {
              const user = await getManager()
                .createQueryBuilder(User, 'user')
                .where('user.id = :userId', {
                  userId: optSuggestions[i].lastModifiedUserId,
                })
                .getOne();
              if (user) {
                lastUser = `${user.firstName} ${user.lastName}`;
              }
            }
          }
          optSuggestions[i].lastUserActive = lastUser;
          results.push(optSuggestions[i]);
          continue;
        }
        if (
          optSuggestions[i].campaign &&
          optSuggestions[i].campaign.name
            .toLowerCase()
            .indexOf(searchValue.toLowerCase()) != -1
        ) {
          if (optSuggestions[i].lastModifiedUserId) {
            if (optSuggestions[i].lastModifiedUserId) {
              const user = await getManager()
                .createQueryBuilder(User, 'user')
                .where('user.id = :userId', {
                  userId: optSuggestions[i].lastModifiedUserId,
                })
                .getOne();
              if (user) {
                lastUser = `${user.firstName} ${user.lastName}`;
              }
            }
          }
          optSuggestions[i].lastUserActive = lastUser;
          results.push(optSuggestions[i]);
          continue;
        }
      }
    }
    resultsMix.totalSuggestions = results.length;
    const listCustomers = results.splice(currentItem, limitItem);

    const customersFullInfor = await Promise.all(listCustomers);

    resultsMix.suggestionsHistory = customersFullInfor;

    return resultsMix;
  }

  async updateReasonOptSuggestion(data, user) {
    const { optSuggestionId, reason } = data;
    const optSuggestion = await getManager()
      .createQueryBuilder(OptSuggestion, 'optSuggestion')
      .where('optSuggestion.id = :optSuggestionId', {
        optSuggestionId: optSuggestionId,
      })
      .getOne();
    optSuggestion.reason = reason;
    optSuggestion.lastModifiedUserId = user?.id;
    return await optSuggestion.save();
  }
}
