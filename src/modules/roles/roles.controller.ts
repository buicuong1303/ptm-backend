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

import { RolesService } from './roles.service';

@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  //Add Role
  @Post('/')
  @UseGuards(JwtAuthGuard, AuthZGuard, ThrottlerGuard)
  @Throttle(1, 5)
  @UsePermissions({
    action: AuthActionVerb.CREATE,
    resource: '/roles',
    possession: AuthPossession.ANY,
  })
  addRole(@Body() data: any): any {
    return this.rolesService.addRole(data);
  }

  //Add Role for User
  @Post('/users')
  @UseGuards(JwtAuthGuard, AuthZGuard, ThrottlerGuard)
  @Throttle(1, 5)
  @UsePermissions({
    action: AuthActionVerb.UPDATE,
    resource: '/users',
    possession: AuthPossession.ANY,
  })
  addRoleForUser(@Body() data: any): any {
    return this.rolesService.addRoleForUser(data);
  }

  //Update Role
  @Patch('/')
  @UseGuards(JwtAuthGuard, AuthZGuard, ThrottlerGuard)
  @Throttle(1, 5)
  @UsePermissions({
    action: AuthActionVerb.UPDATE,
    resource: '/roles',
    possession: AuthPossession.ANY,
  })
  updateRole(@Body() data: any): any {
    return this.rolesService.updateRole(data);
  }

  //Add permission to Role
  @Post('/permissions')
  @UseGuards(JwtAuthGuard, AuthZGuard, ThrottlerGuard)
  @Throttle(1, 5)
  @UsePermissions({
    action: AuthActionVerb.UPDATE,
    resource: '/roles',
    possession: AuthPossession.ANY,
  })
  addPermissionToRole(@Body() data: any): any {
    return this.rolesService.addPermissionToRole(data);
  }

  //Delete Permission in Role
  @Delete('/permissions')
  @UseGuards(JwtAuthGuard, AuthZGuard, ThrottlerGuard)
  @Throttle(1, 5)
  @UsePermissions({
    action: AuthActionVerb.UPDATE,
    resource: '/roles',
    possession: AuthPossession.ANY,
  })
  deletePermissionInRole(@Body() data: any): any {
    return this.rolesService.deletePermissionInRole(data);
  }

  //Delete Role
  @Delete('/:role')
  @UseGuards(JwtAuthGuard, AuthZGuard, ThrottlerGuard)
  @Throttle(1, 5)
  @UsePermissions({
    action: AuthActionVerb.DELETE,
    resource: '/roles',
    possession: AuthPossession.ANY,
  })
  deleteRole(@Param('role') data: string): any {
    return this.rolesService.deleteRole(data);
  }

  //Get All Role
  @Get('/')
  @UseGuards(JwtAuthGuard, AuthZGuard)
  @UsePermissions({
    action: AuthActionVerb.READ,
    resource: '/roles',
    possession: AuthPossession.ANY,
  })
  getAllRole(): any {
    return this.rolesService.getAllRole();
  }

  //Get Permission in Role
  @Get('/permissions/:permission')
  @UseGuards(JwtAuthGuard, AuthZGuard)
  @UsePermissions({
    action: AuthActionVerb.READ,
    resource: '/roles',
    possession: AuthPossession.ANY,
  })
  getPermissionOfRole(@Param('permission') permission: string): any {
    return this.rolesService.getPermissionOfRole(permission);
  }

  //Get Role of User
  @Get('/users/:user')
  getRoleOfUser(@Param('user') user: string): any {
    return this.rolesService.getRoleOfUser(user);
  }

  //Get User in Role
  @Get('/:role/users')
  @UseGuards(JwtAuthGuard, AuthZGuard)
  @UsePermissions({
    action: AuthActionVerb.READ,
    resource: '/roles',
    possession: AuthPossession.ANY,
  })
  getUserInRole(@Param('role') role: string): any {
    return this.rolesService.getUserInRole(role);
  }

  //Get Role By Role's Name
  @Get('/:role')
  @UseGuards(JwtAuthGuard, AuthZGuard)
  @UsePermissions({
    action: AuthActionVerb.READ,
    resource: '/roles',
    possession: AuthPossession.ANY,
  })
  getRoleByRolename(@Param('role') role: string): any {
    return this.rolesService.getRoleByRolename(role);
  }

  //Update Permission of Role
  @Patch('/permissions')
  @UseGuards(JwtAuthGuard, AuthZGuard, ThrottlerGuard)
  @Throttle(1, 5)
  @UsePermissions({
    action: AuthActionVerb.UPDATE,
    resource: '/roles',
    possession: AuthPossession.ANY,
  })
  updatePermissionOfRole(@Body() data: any): any {
    return this.rolesService.updatePermissionOfRole(data);
  }

  //Delete User from Role
  @Delete('/users')
  @UseGuards(JwtAuthGuard, AuthZGuard, ThrottlerGuard)
  @Throttle(1, 5)
  @UsePermissions({
    action: AuthActionVerb.UPDATE,
    resource: '/roles',
    possession: AuthPossession.ANY,
  })
  deleteUserOfRole(@Body() data: any): any {
    return this.rolesService.deleteUserOfRole(data);
  }

  //Update Role of User
  @Patch('/users')
  @UseGuards(JwtAuthGuard, AuthZGuard, ThrottlerGuard)
  @Throttle(1, 5)
  @UsePermissions({
    action: AuthActionVerb.UPDATE,
    resource: '/roles',
    possession: AuthPossession.ANY,
  })
  updateUserOfRole(@Body() data: any): any {
    return this.rolesService.updateRoleOfUser(data);
  }
}
