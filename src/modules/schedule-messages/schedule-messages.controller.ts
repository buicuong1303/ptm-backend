import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import {
  AuthActionVerb,
  AuthPossession,
  AuthZGuard,
  UsePermissions,
} from 'nest-authz';
import { GetUser } from 'src/common/decorator/get-user.decorator';
import { ScheduleFile } from 'src/common/dto/schedule-file.dto';
import { JoiValidationPipe } from 'src/common/pipes/validation-schema.pipe';
import { WsThrottlerGuard } from '../auth/decorator/throttler.decorator';
import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard';
import { CreateScheduleMessageDto } from './dto/create-schedule-message.dto';
import { UpdateScheduleMessageDto } from './dto/update-schedule-message.dto';
import { ScheduleMessagesService } from './schedule-messages.service';
import { CreateScheduleMessageSchema } from './schema/create-schedule-message.schema';

@Controller('schedule-messages')
@UseGuards(JwtAuthGuard)
export class ScheduleMessagesController {
  constructor(
    private readonly scheduleMessageService: ScheduleMessagesService,
  ) {}

  @Post('/validate')
  // @UseGuards(JwtAuthGuard, AuthZGuard)
  // @UsePermissions({
  //   action: AuthActionVerb.CREATE,
  //   resource: '/schedules',
  //   possession: AuthPossession.ANY,
  // })
  @UseInterceptors(FileInterceptor('file'))
  validateSchedule(
    @UploadedFile('file') file: any,
    @Body('fileInformation') fileInformation: any,
    @Body('isFile') isFile: string,
    @Body('campaignId') campaignId: string,
    @Body('content') content: string,
    @Body('customFields') customFields: any,
  ) {
    return this.scheduleMessageService.validateSchedule(
      file,
      isFile,
      JSON.parse(fileInformation || '{}'),
      campaignId,
      content,
      customFields,
    );
  }

  @Post('/')
  @UseGuards(JwtAuthGuard, AuthZGuard)
  @UsePermissions({
    action: AuthActionVerb.CREATE,
    resource: '/schedules',
    possession: AuthPossession.ANY,
  })
  createScheduleMessage(
    @Body(new JoiValidationPipe(CreateScheduleMessageSchema))
    createScheduleMessageDto: CreateScheduleMessageDto,
    @GetUser() user: any,
  ) {
    return this.scheduleMessageService.createScheduleMessage(
      createScheduleMessageDto,
      user,
    );
  }

  @Post('/signed-url')
  @UseGuards(JwtAuthGuard, AuthZGuard)
  // @UsePermissions({
  //   action: AuthActionVerb.READ,
  //   resource: '/schedules',
  //   possession: AuthPossession.ANY,
  // })
  getSignedUrl(@Body() scheduleFiles: ScheduleFile) {
    return this.scheduleMessageService.getSignedUrl(scheduleFiles);
  }

  @Put('/update/:id')
  @UseGuards(JwtAuthGuard, AuthZGuard)
  @UsePermissions({
    action: AuthActionVerb.UPDATE,
    resource: '/schedules',
    possession: AuthPossession.OWN_ANY,
    //Kiem tra truong hop possession co OWN
    isOwn: (req: any): boolean => {
      if (req.args[0].user.id === req.args[0].body.creationUserId) {
        return true;
      }
      return false;
    },
  })
  updateScheduleMessage(
    @Param('id') id: string,
    @Body()
    updateScheduleMessageDto: UpdateScheduleMessageDto,
    @GetUser() user: any,
  ) {
    return this.scheduleMessageService.updateScheduleMessage(
      id,
      updateScheduleMessageDto,
      user,
    );
  }

  @Delete('/:id')
  @UseGuards(JwtAuthGuard, AuthZGuard)
  @UsePermissions({
    action: AuthActionVerb.DELETE,
    resource: '/schedules',
    possession: AuthPossession.ANY,
  })
  deleteSchedule(@Param('id') id: string, @GetUser() user: any) {
    return this.scheduleMessageService.deleteScheduleMessage(id, user);
  }

  @Get()
  @UseGuards(JwtAuthGuard, AuthZGuard)
  @UsePermissions({
    action: AuthActionVerb.READ,
    resource: '/schedules',
    possession: AuthPossession.ANY,
  })
  getScheduleMessages(@Query() filters) {
    return this.scheduleMessageService.getScheduleMessages(filters);
  }

  @Get('/pulling')
  @UseGuards(JwtAuthGuard, AuthZGuard)
  @UsePermissions({
    action: AuthActionVerb.READ,
    resource: '/schedules',
    possession: AuthPossession.ANY,
  })
  getPullingScheduleMessages(@Query() filters) {
    return this.scheduleMessageService.getPullingSchedule(filters);
  }

  @Get('/:id')
  @UseGuards(JwtAuthGuard, AuthZGuard)
  @UsePermissions({
    action: AuthActionVerb.READ,
    resource: '/schedules',
    possession: AuthPossession.ANY,
  })
  getScheduleMessage(@Param('id') id: string) {
    return this.scheduleMessageService.getScheduleMessage(id);
  }

  @Get('/:id/message-sets')
  @UseGuards(JwtAuthGuard, AuthZGuard)
  @UsePermissions({
    action: AuthActionVerb.READ,
    resource: '/schedules',
    possession: AuthPossession.ANY,
  })
  getMessageSetsOfScheduleMessage(@Param('id') id: string) {
    return this.scheduleMessageService.getMessageSetsOfScheduleMessage(id);
  }

  @Patch('/stop/:id')
  @UseGuards(JwtAuthGuard, AuthZGuard, WsThrottlerGuard)
  @Throttle(1, 5)
  @UsePermissions({
    action: AuthActionVerb.UPDATE,
    resource: '/schedules',
    possession: AuthPossession.OWN_ANY,
    //Kiem tra truong hop possession co OWN
    isOwn: (req: any): boolean => {
      if (req.args[0].user.id === req.args[0].body.creationUserId) {
        return true;
      }
      return false;
    },
  })
  stopScheduleMessage(@Param('id') id: string, @GetUser() user: any) {
    return this.scheduleMessageService.stopScheduleMessage(id, user);
  }

  @Patch('/pause/:id')
  @UseGuards(JwtAuthGuard, AuthZGuard, WsThrottlerGuard)
  @Throttle(1, 10)
  @UsePermissions({
    action: AuthActionVerb.UPDATE,
    resource: '/schedules',
    possession: AuthPossession.OWN_ANY,
    //Kiem tra truong hop possession co OWN
    isOwn: (req: any): boolean => {
      if (req.args[0].user.id === req.args[0].body.creationUserId) {
        return true;
      }
      return false;
    },
  })
  pauseScheduleMessage(@Param('id') id: string, @GetUser() user: any) {
    return this.scheduleMessageService.pauseScheduleMessage(id, user);
  }

  @Patch('/resume/:id')
  @UseGuards(JwtAuthGuard, AuthZGuard, WsThrottlerGuard)
  @Throttle(1, 10)
  @UsePermissions({
    action: AuthActionVerb.UPDATE,
    resource: '/schedules',
    possession: AuthPossession.OWN_ANY,
    //Kiem tra truong hop possession co OWN
    isOwn: (req: any): boolean => {
      if (req.args[0].user.id === req.args[0].body.creationUserId) {
        return true;
      }
      return false;
    },
  })
  resumeScheduleMessage(@Param('id') id: string, @GetUser() user: any) {
    return this.scheduleMessageService.resumeScheduleMessage(id, user);
  }

  @Post('/run/:id')
  runScheduleMessage(@Param('id') id: string) {
    return this.scheduleMessageService.runScheduleMessage(id);
  }

  @Get('/:id/message-sets/retry')
  getMessageSetOfScheduleRetry(@Param('id') id: string) {
    return this.scheduleMessageService.getMessageSetOfScheduleRetry(id);
  }
}
