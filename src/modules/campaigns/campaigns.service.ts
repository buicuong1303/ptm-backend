import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as _ from 'lodash';
import { EntityStatus } from 'src/common/constant/entity-status';
import { getManager, Not } from 'typeorm';
import { Campaign } from './entity/campaigns.entity';
import { CampaignsRepository } from './repository/campaigns.repository';
@Injectable()
export class CampaignsService {
  constructor(
    @InjectRepository(CampaignsRepository)
    private readonly campaignsRepository: CampaignsRepository,
  ) {}

  async createCampaign(createSensitiveDto: any, user) {
    const campaignExisted = await getManager()
      .createQueryBuilder(Campaign, 'campaign')
      .where('campaign.name = :campaignName', {
        campaignName: createSensitiveDto.name,
      })
      .andWhere('campaign.status = :status', { status: EntityStatus.ACTIVE })
      .getOne();
    if (campaignExisted) throw new ConflictException('Campaign existed');
    const campaign = new Campaign();
    campaign.name = createSensitiveDto.name.trim();
    campaign.status = createSensitiveDto.status;
    campaign.creationUserId = user.id;
    campaign.lastModifiedUserId = user.id;
    return await campaign.save();
  }

  async updateCampaign(updateSensitiveDto: any, id: string, user) {
    const campaignExisted = await getManager()
      .createQueryBuilder(Campaign, 'campaign')
      .where('campaign.name = :campaignName', {
        campaignName: updateSensitiveDto.name.trim(),
      })
      .andWhere('campaign.status = :status', { status: EntityStatus.ACTIVE })
      .andWhere('campaign.id != :id', { id })
      .getOne();
    if (campaignExisted) throw new ConflictException('Campaign existed');
    const campaign = await this.campaignsRepository.findOne({
      where: {
        id: id,
      },
    });
    campaign.name = updateSensitiveDto.name.trim();
    campaign.status = updateSensitiveDto.status;
    campaign.lastModifiedUserId = user.id;
    return await campaign.save();
  }

  async deleteCampaign(id: string, user) {
    const campaign = await this.campaignsRepository.findOne({
      where: {
        status: EntityStatus.ACTIVE,
        id: id,
      },
    });
    campaign.status = EntityStatus.DELETE;
    campaign.lastModifiedUserId = user.id;
    return await campaign.save();
  }

  async getCampaigns() {
    const campaigns = await this.campaignsRepository.find({
      order: {
        creationTime: 'DESC',
      },
      where: {
        status: Not(EntityStatus.DELETE),
      },
    });
    return campaigns;
  }

  async getCampaignById(id: string) {
    const campaign = await this.campaignsRepository.findOne({
      where: {
        status: EntityStatus.ACTIVE,
        id: id,
      },
    });
    return campaign;
  }
}
