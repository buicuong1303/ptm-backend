import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CampaignsRepository } from '../campaigns/repository/campaigns.repository';
import { CustomerCampaignsService } from './customer-campaigns.service';
import { CustomerCampaignRepository } from './repository/campaign-customer.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([CampaignsRepository, CustomerCampaignRepository]),
  ],
  providers: [CustomerCampaignsService],
  exports: [CustomerCampaignsService],
})
export class CustomerCampaignsModule {}
