import { SignedUrlDto } from './../../common/dto/signed-url.dto';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { CreateComposeMessageDto } from './dto/create-compose-message.dto';
import { CreateMessageDto } from './dto/create-message.dto';
import { UpdateMessageDto } from './dto/update-message.dto';
import { MessagesService } from './messages.service';
import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard';
import { GetUser } from 'src/common/decorator/get-user.decorator';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  AuthActionVerb,
  AuthPossession,
  AuthZGuard,
  UsePermissions,
} from 'nest-authz';
import { SearchScrollParameter } from '../es-search/dto/search-scroll-parameter.dto';

@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(private readonly messageService: MessagesService) {}
  @Post()
  @UseGuards(JwtAuthGuard, AuthZGuard)
  @UsePermissions({
    action: AuthActionVerb.CREATE,
    resource: '/chat',
    possession: AuthPossession.ANY,
  })
  createMessage(
    @Body()
    createMessageDto: CreateMessageDto,
  ) {
    return this.messageService.createOutboundMessage(createMessageDto);
  }

  @Post('/compose-text')
  @UseInterceptors(
    FilesInterceptor('files', 5, {
      limits: {
        fileSize: 1572864,
      },
    }),
  )
  createComposeMessages(
    @Body()
    createComposeMessageDto: CreateComposeMessageDto,
    @GetUser() user: any,
    @UploadedFiles() files: any,
  ) {
    return this.messageService.createComposeMessages(
      createComposeMessageDto,
      user,
      files,
    );
  }

  @Get()
  @UseGuards(JwtAuthGuard, AuthZGuard)
  @UsePermissions({
    action: AuthActionVerb.READ,
    resource: '/chat',
    possession: AuthPossession.ANY,
  })
  getMessages() {
    return this.messageService.getMessages();
  }

  @Get('/pagination/conversation/:id')
  getInfoPaginationMessagesInConversation(@Param('id') conversationId: string) {
    return this.messageService.getInfoPaginationMessagesInConversation(
      conversationId,
    );
  }

  @Get('/conversation/:id')
  @UseGuards(JwtAuthGuard, AuthZGuard)
  @UsePermissions({
    action: AuthActionVerb.READ,
    resource: '/chat',
    possession: AuthPossession.ANY,
  })
  getMessagesInConversation(
    @Param('id') conversationId: string,
    @Query() queries: any,
  ) {
    const { currentItems, limitMessageInConversations } = queries;
    return this.messageService.getMessagesInConversation(
      conversationId,
      currentItems,
      limitMessageInConversations,
    );
  }

  //* use for lazy load when search
  @Get('/conversation/:id/load-two-way')
  @UseGuards(JwtAuthGuard, AuthZGuard)
  @UsePermissions({
    action: AuthActionVerb.READ,
    resource: '/chat',
    possession: AuthPossession.ANY,
  })
  lazyLoadMessagesInConversation(
    @Param('id') conversationId: string,
    @Query() queries: any,
  ) {
    const { topBoundary, botBoundary } = queries;
    return this.messageService.lazyLoadMessagesInConversation(
      conversationId,
      topBoundary,
      botBoundary,
    );
  }

  @Get('/conversation/:conversationId/jump/:messageId')
  @UseGuards(JwtAuthGuard, AuthZGuard)
  @UsePermissions({
    action: AuthActionVerb.READ,
    resource: '/chat',
    possession: AuthPossession.ANY,
  })
  jumpToMessageInConversation(@Param() params) {
    const { conversationId, messageId } = params;
    return this.messageService.jumpToMessageInConversation(
      conversationId,
      messageId,
    );
  }
  @Patch()
  updateMessage(
    @Body()
    updateMessageDto: UpdateMessageDto,
    @GetUser() user: any,
  ) {
    return this.messageService.updateMessage(updateMessageDto, user);
  }

  @Get('/attachment-signed-url')
  getSignedUrlAttachment(
    @Query()
    signedUrl: SignedUrlDto,
  ) {
    return this.messageService.getAttachmentSignedUrl(signedUrl);
  }

  @Get('/message-set/:id')
  sendScheduleMessage(
    @Param('id')
    id: string,
  ) {
    return this.messageService.sendScheduleMessage({
      status: 'sending',
      messageSetId: id,
    });
  }

  @Get('/search')
  search(@Query() queries: any) {
    const { searchValue, from, to } = queries;
    return this.messageService.search(searchValue, from, to);
  }

  @Post('/search-scroll')
  searchScroll(
    @Body() searchScrollParameter: SearchScrollParameter,
    @GetUser() user,
  ) {
    return this.messageService.searchScroll(searchScrollParameter, user);
  }

  @Post('/scroll')
  scroll(@Body() searchScrollParameter: SearchScrollParameter) {
    return this.messageService.scroll(searchScrollParameter);
  }

  @Post('/search-scroll/clear')
  clearScroll(@Body('scroll_ids') scrollIds) {
    return this.messageService.clearScroll(scrollIds);
  }
}
