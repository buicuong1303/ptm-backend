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
import {
  AuthActionVerb,
  AuthPossession,
  AuthZGuard,
  UsePermissions,
} from 'nest-authz';
import { GetUser } from 'src/common/decorator/get-user.decorator';
import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard';
import { SensitivesService } from './sensitives.service';

@Controller('sensitives')
@UseGuards(JwtAuthGuard)
export class SensitivesController {
  constructor(private readonly sensitivesService: SensitivesService) {}

  @Post('/')
  @UseGuards(AuthZGuard)
  @UsePermissions({
    action: AuthActionVerb.CREATE,
    resource: '/sensitives',
    possession: AuthPossession.ANY,
  })
  createSensitive(
    @Body()
    createSensitiveDto: any,
    @GetUser() user: any,
  ) {
    return this.sensitivesService.createSensitive(createSensitiveDto, user);
  }

  @Patch('/:id')
  @UseGuards(AuthZGuard)
  @UsePermissions({
    action: AuthActionVerb.UPDATE,
    resource: '/sensitives',
    possession: AuthPossession.ANY,
  })
  updateSensitive(
    @Param('id') id: string,
    @Body()
    updateSensitiveDto: any,
    @GetUser() user: any,
  ) {
    return this.sensitivesService.updateSensitive(updateSensitiveDto, id, user);
  }

  @Get('/')
  @UseGuards(AuthZGuard)
  @UsePermissions({
    action: AuthActionVerb.READ,
    resource: '/sensitives',
    possession: AuthPossession.ANY,
  })
  getSensitives() {
    return this.sensitivesService.getSensitives();
  }

  @Get('/:id')
  @UseGuards(AuthZGuard)
  @UsePermissions({
    action: AuthActionVerb.READ,
    resource: '/sensitives',
    possession: AuthPossession.ANY,
  })
  getSensitiveById(@Param('id') id: string) {
    return this.sensitivesService.getSensitivesById(id);
  }

  @Delete('/:id')
  @UseGuards(AuthZGuard)
  @UsePermissions({
    action: AuthActionVerb.DELETE,
    resource: '/sensitives',
    possession: AuthPossession.ANY,
  })
  deleteSensitive(@Param('id') id: string, @GetUser() user: any) {
    return this.sensitivesService.deleteSensitive(id, user);
  }
}
