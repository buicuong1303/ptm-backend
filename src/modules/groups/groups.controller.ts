/* eslint-disable prettier/prettier */
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  ValidationPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  AuthActionVerb,
  AuthPossession,
  AuthZGuard,
  UsePermissions,
} from 'nest-authz';
import { GetUser } from 'src/common/decorator/get-user.decorator';
import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard';
import { CreateGroupDto } from './dto/createGroup.dto';
import { UpdateGroupDto } from './dto/updateGroup.dto';
import { GroupsService } from './groups.service';

@Controller('groups')
@UseGuards(JwtAuthGuard)
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Post('/')
  @UseGuards(JwtAuthGuard, AuthZGuard)
  @UsePermissions({
    action: AuthActionVerb.CREATE,
    resource: '/groups',
    possession: AuthPossession.ANY,
  })
  createGroup(
    @Body(ValidationPipe)
    createGroupDto: CreateGroupDto,
    @GetUser() user: any,
  ) {
    return this.groupsService.createGroup(createGroupDto, user);
  }

  @Get('/')
  @UseGuards(JwtAuthGuard, AuthZGuard)
  @UsePermissions({
    action: AuthActionVerb.READ,
    resource: '/groups',
    possession: AuthPossession.ANY,
  })
  getGroups() {
    return this.groupsService.getGroups();
  }

  @Get('/:id')
  @UseGuards(JwtAuthGuard, AuthZGuard)
  @UsePermissions({
    action: AuthActionVerb.READ,
    resource: '/groups',
    possession: AuthPossession.ANY,
  })
  getGroup(@Param('id') groupId: string) {
    return this.groupsService.getFullWithGroupId(groupId);
  }

  @Patch('/:id')
  @UseGuards(JwtAuthGuard, AuthZGuard)
  @UsePermissions({
    action: AuthActionVerb.UPDATE,
    resource: '/groups',
    possession: AuthPossession.ANY,
  })
  updateGroup(
    @Body(ValidationPipe)
    updateGroupDto: UpdateGroupDto,
    @Param('id') groupId: string,
    @GetUser() user: any,
  ) {
    return this.groupsService.updateGroup(updateGroupDto, groupId, user);
  }

  @Delete('/:id')
  @UseGuards(JwtAuthGuard, AuthZGuard)
  @UsePermissions({
    action: AuthActionVerb.DELETE,
    resource: '/groups',
    possession: AuthPossession.ANY,
  })
  deleteGroup(@Param('id') groupId: string, @GetUser() user: any) {
    return this.groupsService.deleteGroup(groupId, user);
  }

  @Post('/:groupId/file')
  @UseGuards(JwtAuthGuard, AuthZGuard)
  @UsePermissions({
    action: AuthActionVerb.UPDATE,
    resource: '/groups',
    possession: AuthPossession.ANY,
  })
  @UseInterceptors(FileInterceptor('file'))
  async readFile(
    @UploadedFile() file,
    @Param('groupId') groupId: string,
  ): Promise<any> {
    return this.groupsService.readFile(file, groupId);
  }

  @Delete('/:groupId/customers/:customerId')
  @UseGuards(JwtAuthGuard, AuthZGuard)
  @UsePermissions({
    action: AuthActionVerb.UPDATE,
    resource: '/groups',
    possession: AuthPossession.ANY,
  })
  deleteCustomerInGroup(
    @Param('groupId') groupId: string,
    @Param('customerId') customerId: string,
    @GetUser() user: any,
  ) {
    return this.groupsService.deleteCustomerInGroup(customerId, groupId, user);
  }
}
