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
import { CampaignsService } from './campaigns.service';

@Controller('campaigns')
@UseGuards(JwtAuthGuard)
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  @Post('/')
  @UseGuards(AuthZGuard)
  @UsePermissions({
    action: AuthActionVerb.CREATE,
    resource: '/campaigns',
    possession: AuthPossession.ANY,
  })
  createCampaign(
    @Body()
    createSensitiveDto: any,
    @GetUser() user: any,
  ) {
    return this.campaignsService.createCampaign(createSensitiveDto, user);
  }

  @Patch('/:id')
  @UseGuards(AuthZGuard)
  @UsePermissions({
    action: AuthActionVerb.UPDATE,
    resource: '/campaigns',
    possession: AuthPossession.ANY,
  })
  updateCampaign(
    @Param('id') id: string,
    @Body()
    updateSensitiveDto: any,
    @GetUser() user: any,
  ) {
    return this.campaignsService.updateCampaign(updateSensitiveDto, id, user);
  }

  @Get('/')
  @UseGuards(AuthZGuard)
  @UsePermissions({
    action: AuthActionVerb.READ,
    resource: '/campaigns',
    possession: AuthPossession.ANY,
  })
  getCampaigns() {
    return this.campaignsService.getCampaigns();
  }

  @Get('/:id')
  @UseGuards(AuthZGuard)
  @UsePermissions({
    action: AuthActionVerb.READ,
    resource: '/campaigns',
    possession: AuthPossession.ANY,
  })
  getCampaignById(@Param('id') id: string) {
    return this.campaignsService.getCampaignById(id);
  }

  @Delete('/:id')
  @UseGuards(AuthZGuard)
  @UsePermissions({
    action: AuthActionVerb.DELETE,
    resource: '/campaigns',
    possession: AuthPossession.ANY,
  })
  deleteCampaign(@Param('id') id: string, @GetUser() user: any) {
    return this.campaignsService.deleteCampaign(id, user);
  }
}
