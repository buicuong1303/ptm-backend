import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  AuthActionVerb,
  AuthPossession,
  AuthZGuard,
  UsePermissions,
} from 'nest-authz';
import { GetUser } from '../auth/decorator/get-user.decorator';
import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard';
import { CreateLabelDto } from './dto/create-label.dto';
import { UpdateLabelDto } from './dto/update-label.dto';
import { LabelsService } from './labels.service';

@Controller('labels')
@UseGuards(JwtAuthGuard)
export class LabelsController {
  constructor(private readonly labelService: LabelsService) {}
  @Post('/')
  @UseGuards(AuthZGuard)
  @UsePermissions({
    action: AuthActionVerb.CREATE,
    resource: '/labels',
    possession: AuthPossession.ANY,
  })
  createLabel(@Body() createLabelDto: CreateLabelDto, @GetUser() user) {
    return this.labelService.createLabel(createLabelDto, user);
  }

  @Get('/')
  @UseGuards(AuthZGuard)
  @UsePermissions({
    action: AuthActionVerb.READ,
    resource: '/labels',
    possession: AuthPossession.ANY,
  })
  getLabels() {
    return this.labelService.getLabels();
  }

  @Get('/:id')
  @UseGuards(AuthZGuard)
  @UsePermissions({
    action: AuthActionVerb.READ,
    resource: '/labels',
    possession: AuthPossession.ANY,
  })
  getLabel(@Param('id') id) {
    return this.labelService.getLabel(id);
  }

  @Put('/:id')
  @UseGuards(AuthZGuard)
  @UsePermissions({
    action: AuthActionVerb.UPDATE,
    resource: '/labels',
    possession: AuthPossession.ANY,
  })
  updateLabel(
    @Param('id') id,
    @Body() updateLabelDto: UpdateLabelDto,
    CreateLabelDto,
    @GetUser() user,
  ) {
    return this.labelService.updateLabel(id, updateLabelDto, user);
  }

  @Patch('/:id')
  @UseGuards(AuthZGuard)
  @UsePermissions({
    action: AuthActionVerb.DELETE,
    resource: '/labels',
    possession: AuthPossession.ANY,
  })
  deleteLabel(@Param('id') id) {
    return this.labelService.deleteLabel(id);
  }
}
