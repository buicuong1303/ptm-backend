import {
  forwardRef,
  MiddlewareConsumer,
  Module,
  RequestMethod,
} from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserRepository } from 'src/modules/users/repository/user.repository';
import { CompanyUsersModule } from '../company-users/company-users.module';
import { ConversationsModule } from '../conversations/conversations.module';
import { UsersModule } from '../users/users.module';
import { ActivityLoggerMiddleware } from './middlewares/activity-logger.middleware';
import { ParticipantsController } from './participants.controller';
import { ParticipantsService } from './participants.service';
import { ParticipantRepository } from './repository/participant.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      //* for current scope
      ParticipantRepository,
      UserRepository,
    ]),
    CompanyUsersModule,
    forwardRef(() => ConversationsModule),
    UsersModule,
  ],
  providers: [ParticipantsService],
  controllers: [ParticipantsController],
  exports: [ParticipantsService],
})
export class ParticipantsModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(ActivityLoggerMiddleware)

      .forRoutes(
        {
          path: ':splat*?/participants/:participantId/updateUmnConversation',
          method: RequestMethod.PATCH,
        },
        {
          path: ':splat*?/participants/updateUmnConversations',
          method: RequestMethod.POST,
        },
      );
  }
}
