import { AssignLabelDto } from './dto/assign-label.dto';
/* eslint-disable prettier/prettier */
import {
  Controller,
  ClassSerializerInterceptor,
  Get,
  Post,
  Param,
  Delete,
  Request,
  UseInterceptors,
  UseGuards,
  Query,
  Patch,
  Body,
  ValidationPipe,
  Put,
} from '@nestjs/common';
import { GetUser } from 'src/common/decorator/get-user.decorator';
import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard';
import { ConversationsService } from './conversations.service';
import { EditConversationDto } from './dto/edit-conversation.dto';
@Controller('conversations')
@UseInterceptors(ClassSerializerInterceptor)
@UseGuards(JwtAuthGuard)
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}
  @Post()
  createConversation() {
    return this.conversationsService.createConversation();
  }

  @Get()
  getConversations() {
    return this.conversationsService.getConversations();
  }

  @Post('/user')
  getConversationsOfUser(
    @Request() req: any,
    @Query() queries,
    @Body() filters,
  ) {
    const { page, limitConversations, limitMessageInConversations, companyId } =
      queries;
    return this.conversationsService.getConversationsOfUser(
      req.user,
      companyId,
      page,
      limitConversations,
      limitMessageInConversations,
      filters,
    );
  }

  @Get('/:id/new')
  getNewConversationOfUser(
    @Param('id') id: string,
    @Request() req: any,
    @Query() queries,
  ) {
    const { limitMessageInConversations, companyCode } = queries;
    return this.conversationsService.getNewConversationOfUser(
      req.user,
      id,
      companyCode,
      limitMessageInConversations,
    );
  }

  @Get('/:id')
  getConversation(@Param('id') id: string) {
    return this.conversationsService.getConversation(id);
  }

  //TODO: need add permission
  @Put('/:id')
  assignLabelToConversation(
    @Param('id') id: string,
    @Body() assignLabelsDto: AssignLabelDto,
  ) {
    return this.conversationsService.assignLabelsToConversation(
      id,
      assignLabelsDto,
    );
  }

  @Delete('/:id')
  remove(@Param('id') id: string) {
    return this.conversationsService.remove(id);
  }

  //TODO: need add permission
  @Patch('/:id')
  editConversation(
    @Param('id') id: string,
    @Body(ValidationPipe) editConversation: EditConversationDto,
    @GetUser() user: any,
  ) {
    return this.conversationsService.editConversation(
      id,
      editConversation,
      user,
    );
  }

  //TODO: need add permission
  @Patch('/')
  editConversations(@Body() editConversations, @GetUser() user: any) {
    const { ids, ...rest } = editConversations;
    return this.conversationsService.editConversations(ids, rest, user);
  }
}
