import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import {
  AuthActionVerb,
  AuthPossession,
  AuthZGuard,
  UsePermissions,
} from 'nest-authz';
import { JwtAuthGuard } from 'src/modules/auth/guard/jwt-auth.guard';

import { PermissionsService } from './permissions.service';

@Controller('permissions')
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  //Add permission
  @Post('/')
  @UseGuards(JwtAuthGuard, AuthZGuard, ThrottlerGuard)
  @Throttle(1, 5)
  @UsePermissions({
    action: AuthActionVerb.CREATE,
    resource: '/permissions',
    possession: AuthPossession.ANY,
  })
  addPermission(@Body() data: any): any {
    return this.permissionsService.addPermission(data);
  }

  //update permission
  @Patch('/')
  @UseGuards(JwtAuthGuard, AuthZGuard, ThrottlerGuard)
  @Throttle(1, 5)
  @UsePermissions({
    action: AuthActionVerb.UPDATE,
    resource: '/permissions',
    possession: AuthPossession.ANY,
  })
  updatePermission(@Body() data: any): any {
    return this.permissionsService.updatePermission(data);
  }

  //update Permission of User
  @Patch('/users')
  @UseGuards(JwtAuthGuard, AuthZGuard, ThrottlerGuard)
  @Throttle(1, 5)
  @UsePermissions({
    action: AuthActionVerb.READ,
    resource: '/users',
    possession: AuthPossession.ANY,
  })
  updatePermissionOfUser(@Body() data: any): any {
    return this.permissionsService.updatePermissionOfUser(data);
  }

  //get all permission
  @Get('/')
  @UseGuards(JwtAuthGuard, AuthZGuard)
  @UsePermissions({
    action: AuthActionVerb.READ,
    resource: '/permissions',
    possession: AuthPossession.ANY,
  })
  getAllPermission(): any {
    return this.permissionsService.getAllPermission();
  }

  //Delete permission
  @Delete('/:permission/actions/:action')
  @UseGuards(JwtAuthGuard, AuthZGuard, ThrottlerGuard)
  @Throttle(1, 5)
  @UsePermissions({
    action: AuthActionVerb.DELETE,
    resource: '/permissions',
    possession: AuthPossession.ANY,
  })
  deletePermission(
    @Param('permission') oldObj: string,
    @Param('action') oldAct: string,
  ): any {
    return this.permissionsService.deletePermission(`/${oldObj}`, oldAct);
  }

  //Add user to permission
  @Post('/users')
  @UseGuards(JwtAuthGuard, AuthZGuard, ThrottlerGuard)
  @Throttle(1, 5)
  @UsePermissions({
    action: AuthActionVerb.UPDATE,
    resource: '/users',
    possession: AuthPossession.ANY,
  })
  addUserToPermission(@Body() data: any): any {
    return this.permissionsService.addUserToPermission(data);
  }

  //Delete user to permission
  @Delete('/users')
  @UseGuards(JwtAuthGuard, AuthZGuard, ThrottlerGuard)
  @Throttle(1, 5)
  @UsePermissions({
    action: AuthActionVerb.UPDATE,
    resource: '/users',
    possession: AuthPossession.ANY,
  })
  deleteUserToPermission(@Body() data: any): any {
    return this.permissionsService.deleteUserFromPermission(data);
  }

  //Get All permission of User
  @Get('/users/:user')
  @UseGuards(JwtAuthGuard, AuthZGuard)
  @UsePermissions({
    action: AuthActionVerb.READ,
    resource: '/permissions',
    possession: AuthPossession.ANY,
  })
  getAllPermissionOfUser(@Param('user') user: any): any {
    return this.permissionsService.getAllPermissionOfUser(user);
  }

  @Delete('/users/delete/:user')
  @UseGuards(JwtAuthGuard, AuthZGuard, ThrottlerGuard)
  @Throttle(1, 5)
  @UsePermissions({
    action: AuthActionVerb.UPDATE,
    resource: '/users',
    possession: AuthPossession.ANY,
  })
  deleteAllPermissionInUser(@Param('user') user: any): any {
    return this.permissionsService.deleteAllPermissionInUser(user);
  }

  //Get permission for client
  @Get('/client/:user')
  getPermissionOfUserForFontend(@Param('user') user: any): any {
    return this.permissionsService.getPermissionOfUserForFontend(user);
  }
}
