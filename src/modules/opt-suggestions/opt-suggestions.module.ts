import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CampaignsRepository } from '../campaigns/repository/campaigns.repository';
import { CompanyCustomersModule } from '../company-customers/company-customers.module';
import { CompanyCustomerRepository } from '../company-customers/repository/company-customer.repository';
import { ConversationsModule } from '../conversations/conversations.module';
import { ConversationRepository } from '../conversations/repository/conversation.repository';
import { CustomerRepository } from '../customers/repository/customer.repository';
import { MessageRepository } from '../messages/repository/message.repository';
import { OptSuggestionsController } from './opt-suggestions.controller';
import { OptSuggestionsService } from './opt-suggestions.service';
import { OptSuggestionRepository } from './repository/opt-suggestion.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      //* for current scope
      OptSuggestionRepository,
      CustomerRepository,
      MessageRepository,
      ConversationRepository,
      CompanyCustomerRepository,
      CampaignsRepository,
    ]),
    forwardRef(() => ConversationsModule),
    forwardRef(() => CompanyCustomersModule),
  ],
  providers: [OptSuggestionsService],
  controllers: [OptSuggestionsController],
  exports: [OptSuggestionsService],
})
export class OptSuggestionsModule {}
