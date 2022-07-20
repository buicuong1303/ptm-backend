/* eslint-disable prettier/prettier */
import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from 'src/modules/auth/guard/jwt-auth.guard';
import { AddUserDto } from './dto/add-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { JoiValidationPipe } from '../../common/pipes/validation-schema.pipe';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateProfileSchema } from './schema/update-profile.schema copy';
import {
  AuthActionVerb,
  AuthPossession,
  AuthZGuard,
  UsePermissions,
} from 'nest-authz';
import { SignedUrlAvatarDto } from './dto/signed-url-avatar.dto';
import { UpdateAvatarDto } from './dto/update-avatar.dto';
import { GetUser } from 'src/common/decorator/get-user.decorator';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { UpdateSettingSchema } from './schema/update-setting.schema';
import { UpdateSettingDto } from './dto/update-setting.dto';

@Controller('users')
@UseGuards(JwtAuthGuard)
@UseInterceptors(ClassSerializerInterceptor)
export class UsersController {
  constructor(private readonly userService: UsersService) {}

  @Get('/profile')
  // @UseGuards(JwtAuthGuard, AuthZGuard)
  getProfile(@Request() req: any) {
    return this.userService.getProfile(req.user);
  }

  @Patch('/profile')
  @UseGuards(JwtAuthGuard, AuthZGuard)
  @UsePermissions({
    action: AuthActionVerb.UPDATE,
    //Object
    resource: '/users',
    possession: AuthPossession.OWN_ANY,

    //Kiem tra truong hop possession co OWN
    isOwn: (req: any): boolean => {
      if (req.args[0].user.id === req.args[0].body.id) {
        return true;
      }
      return false;
    },
  })
  updateProfile(
    @Body(new JoiValidationPipe(UpdateProfileSchema))
    updateProfileDto: UpdateProfileDto,
    @GetUser() user: any,
  ) {
    return this.userService.updateProfile(updateProfileDto, user);
  }
  @Patch('/setting')
  @UseGuards(JwtAuthGuard, AuthZGuard)
  @UsePermissions({
    action: AuthActionVerb.UPDATE,
    //Object
    resource: '/users',
    possession: AuthPossession.OWN_ANY,

    //Kiem tra truong hop possession co OWN
    isOwn: (req: any): boolean => {
      if (req.args[0].user.id === req.args[0].body.id) {
        return true;
      }
      return false;
    },
  })
  updateSetting(
    @Body(new JoiValidationPipe(UpdateSettingSchema))
    updateSettingDto: UpdateSettingDto,
    @GetUser() user: any,
  ) {
    return this.userService.updateSetting(updateSettingDto, user);
  }

  @Get('/avatar-signed-url')
  @UseGuards(JwtAuthGuard, AuthZGuard)
  @UsePermissions({
    action: AuthActionVerb.READ,
    resource: '/users',
    possession: AuthPossession.ANY,
  })
  getSignedUrlAvatar(@Query() signedUrlAvatar: SignedUrlAvatarDto) {
    return this.userService.avatarSignedUrl(signedUrlAvatar);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('/avatar')
  updateAvatar(@Request() req: any, @Query() updateAvatarDto: UpdateAvatarDto) {
    return this.userService.updateAvatar(req.user, updateAvatarDto);
  }

  @Post('/')
  @UseGuards(JwtAuthGuard, AuthZGuard, ThrottlerGuard)
  @Throttle(1, 5)
  addUser(@Body() addUserDto: AddUserDto, @GetUser() user: any) {
    return this.userService.addUser(addUserDto, user);
  }

  @Get('/:userId')
  @UseGuards(JwtAuthGuard, AuthZGuard)
  @UsePermissions({
    action: AuthActionVerb.READ,
    resource: '/users',
    possession: AuthPossession.ANY,
  })
  getUser(@Param('userId') userId: any) {
    return this.userService.getUser(userId);
  }

  @Get('/')
  @UseGuards(JwtAuthGuard, AuthZGuard)
  getUsers() {
    return this.userService.getUsers();
  }

  @Delete('/:userId')
  @UseGuards(JwtAuthGuard, AuthZGuard)
  @UsePermissions({
    action: AuthActionVerb.DELETE,
    resource: '/users',
    possession: AuthPossession.ANY,
  })
  deleteUser(@Param('userId') userId: any, @GetUser() user: any) {
    return this.userService.deleteUser(userId, user);
  }

  @Post('/:userId/')
  @UseGuards(JwtAuthGuard, AuthZGuard, ThrottlerGuard)
  @Throttle(1, 5)
  updateUser(@Param('userId') userId: any, @Body() data: any) {
    return this.userService.updateUser(userId, data);
  }

  @UseGuards(JwtAuthGuard, AuthZGuard)
  @Patch('/change-password')
  changePassword(
    @Body() changePasswordDto: ChangePasswordDto,
    @Request() req: any,
  ) {
    return this.userService.changePassword(req.user, changePasswordDto);
  }

  @Get('/:userId/companies')
  getCompaniesOfUser(@Param('userId') userId: any) {
    return this.userService.getCompaniesOfUser(userId);
  }

  @Get('/permissions/roles')
  getFullInformation() {
    return this.userService.getFullInformation();
  }
}
