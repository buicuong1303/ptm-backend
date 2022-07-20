import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  AuthActionVerb,
  AuthPossession,
  AuthZGuard,
  UsePermissions,
} from 'nest-authz';
import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard';
import { FilterMessageGroupDto } from './dto/filter-group-message.dto';
import { GroupMessagesService } from './group-messages.service';

@UseGuards(JwtAuthGuard)
@Controller('group-messages')
export class GroupMessagesController {
  constructor(private readonly _groupMessagesService: GroupMessagesService) {}

  @Get('/')
  @UseGuards(AuthZGuard)
  @UsePermissions({
    action: AuthActionVerb.READ,
    resource: '/group-messages',
    possession: AuthPossession.ANY,
  })
  getGroupMessages(@Query() filterMessageGroupData: FilterMessageGroupDto) {
    const { page, pageSize, searchQuery, current, isReload } =
      filterMessageGroupData;
    return this._groupMessagesService.getGroupMessages(
      page,
      pageSize,
      searchQuery,
      current,
      isReload,
    );
  }
}
