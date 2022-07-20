import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { CreateNotificationTypeDto } from './dto/create-notification-type.dto';
import { ReadStatus } from 'src/common/constant/read-status';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('/types')
  create(@Body() createNotificationTypeDto: CreateNotificationTypeDto) {
    return this.notificationsService.createNotificationType(
      createNotificationTypeDto,
    );
  }

  @Get('/users/:userId')
  getNotificationsOfUser(@Param('userId') userId: string, @Query() filters) {
    return this.notificationsService.getNotificationsOfUser(userId, filters);
  }

  @Patch('/users/:userId')
  updateNotifications(
    @Param('userId') userId: string,
    @Body('notificationIds') notificationIds: any,
  ) {
    return this.notificationsService.updateNotifications(
      userId,
      notificationIds,
    );
  }
  @Patch('/:notificationId/users/:userId')
  updateNotification(
    @Param() params: any,
    @Body('readStatus') readStatus: ReadStatus,
  ) {
    const { notificationId, userId } = params;
    return this.notificationsService.updateNotification(
      notificationId,
      userId,
      readStatus,
    );
  }
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.notificationsService.findOne(+id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.notificationsService.remove(+id);
  }
  @Patch('/users/:id/readAll')
  readAllNotifications(@Param('id') id: string) {
    return this.notificationsService.readAllNotifications(id);
  }
}
