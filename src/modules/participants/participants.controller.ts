import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { GetUser } from 'src/common/decorator/get-user.decorator';
import {
  EntityManager,
  QueryRunner,
  Transaction,
  TransactionManager,
} from 'typeorm';
import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard';
import { UpdateReadStatusDto } from './dto/update-read-status.dto';
import { UpdateUmnDto } from './dto/update-umn.dto';
import { ParticipantsService } from './participants.service';

@Controller('participants')
@UseGuards(JwtAuthGuard)
export class ParticipantsController {
  constructor(private readonly participantService: ParticipantsService) {}

  @Patch('/:participantId')
  updateReadStatusParticipant(
    @Body() updateReadStatusDto: UpdateReadStatusDto,
    @Param('participantId') participantId,
  ) {
    return this.participantService.updateReadStatus(
      updateReadStatusDto,
      participantId,
    );
  }

  //* conversation section
  @Get('/conversation/:conversationId')
  @Transaction()
  getUsersInConversation(
    @Param('conversationId') conversationId,
    @TransactionManager() queryRunner: QueryRunner,
  ) {
    return this.participantService.getUsersInConversation(
      conversationId,
      queryRunner,
    );
  }

  //TODO validate with joi
  @Post('/conversation/:conversationId')
  @Transaction()
  addUserIntoConversation(
    @Body('companyUserId') companyUserId,
    @Param('conversationId') conversationId,
    @TransactionManager() manager: EntityManager,
    @GetUser() user: any,
  ) {
    return this.participantService.addUserIntoConversation(
      conversationId,
      companyUserId,
      manager,
      0,
      user,
    );
  }

  @Delete('/conversation/:conversationId')
  removeUserFromConversation(
    @Body('companyUserId') companyUserId,
    @Param('conversationId') conversationId,
    @GetUser() user: any,
  ) {
    return this.participantService.removeUserFromConversation(
      conversationId,
      companyUserId,
      user,
    );
  }

  //? userId or companyUserId
  @Get('/user/:userId')
  getConversationsOfUser(@Param('userId') userId, @Query() queries) {
    const { currentItems, limitConversations, type, search } = queries;
    return this.participantService.getConversationsInCompanyOfUser(
      userId,
      currentItems,
      limitConversations,
      type,
      search,
    );
  }

  @Patch('/:participantId/updateUmnConversation')
  updateUmnWhenReadMessage(
    @Param('participantId') participantId,
    @Body('readStatus') readStatus,
  ) {
    return this.participantService.updateUmnConversation(
      participantId,
      readStatus,
    );
  }

  @Post('/updateUmnConversations')
  updateUmnWhenReadMessages(
    @Body() updateUmnDto: UpdateUmnDto,
    @GetUser() user,
  ) {
    return this.participantService.updateUmnConversations(updateUmnDto, user);
  }
}
