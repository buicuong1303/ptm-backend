import { QueuesModule } from './modules/queues/queues.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { typeOrmConfigAsync } from './common/config/typeorm.config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ConversationsModule } from './modules/conversations/conversations.module';
import { MessagesModule } from './modules/messages/messages.module';
import { CustomersModule } from './modules/customers/customers.module';
import { SignaturesModule } from './modules/signatures/signatures.module';
import { ScheduleMessagesModule } from './modules/schedule-messages/schedule-messages.module';
import { ParticipantsModule } from './modules/participants/participants.module';
import { PermissionsModule } from './modules/permissions/permissions.module';
import { RolesModule } from './modules/roles/roles.module';
import { OptSuggestionsModule } from './modules/opt-suggestions/opt-suggestions.module';
import { AmqpModule } from './modules/services/amqp/amqp.module';
import { CompaniesModule } from './modules/companies/companies.module';
import { GroupsModule } from './modules/groups/groups.module';
import { GroupCustomersModule } from './modules/groups-customers/groups-customers.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ScheduleModule } from '@nestjs/schedule';
import { EsSearchModule } from './modules/es-search/es-search.module';
import { BullModule } from '@nestjs/bull';
import { redisQueueConfigAsync } from './common/config/redis-queue.config';
import { CallLogModule } from './modules/call-logs/call-logs.module';
import { LabelsModule } from './modules/labels/labels.module';
import { CompanyLabelsModule } from './modules/company-labels/company-labels.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { ProfanityQueueModule } from './modules/queues/modules/profanity-queue/profanity-queue.module';
import { ViewHistoryModule } from './modules/view-history/view-history.module';
import { SensitivesModule } from './modules/sensitives/sensitives.module';
import { SensitiveDetectsModule } from './modules/sensitive-detects/sensitive-detects.module';
import { CampaignsModule } from './modules/campaigns/campaigns.module';
import { CustomerCampaignsModule } from './modules/customer-campaigns/customer-campaigns.module';
import { JwtCustomModule } from './modules/jwt-custom/jwt-custom.module';
@Module({
  imports: [
    AmqpModule,
    AuthModule,
    RolesModule,
    PermissionsModule,
    UsersModule,
    TypeOrmModule.forRootAsync(typeOrmConfigAsync),
    ConversationsModule,
    MessagesModule,
    CustomersModule,
    SignaturesModule,
    ScheduleMessagesModule,
    ParticipantsModule,
    OptSuggestionsModule,
    CompaniesModule,
    GroupsModule,
    GroupCustomersModule,
    NotificationsModule,
    ScheduleModule.forRoot(),
    EsSearchModule,
    BullModule.forRootAsync(redisQueueConfigAsync),
    QueuesModule,
    CallLogModule,
    LabelsModule,
    CompanyLabelsModule,
    DashboardModule,
    ViewHistoryModule,
    SensitivesModule,
    ProfanityQueueModule,
    SensitiveDetectsModule,
    CampaignsModule,
    CustomerCampaignsModule,
    JwtCustomModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
