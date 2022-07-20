import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import {
  AuthActionVerb,
  AuthPossession,
  AuthZGuard,
  UsePermissions,
} from 'nest-authz';
import { GetUser } from 'src/common/decorator/get-user.decorator';
import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard';
import { AddOptSuggestionDto } from './dto/opt-suggestion.dto';
import { UpdateOptSuggestionDto } from './dto/update-opt-suggestions.dto';
import { OptSuggestionsService } from './opt-suggestions.service';

@Controller('opt-suggestions')
@UseGuards(JwtAuthGuard)
export class OptSuggestionsController {
  constructor(private optSuggestionService: OptSuggestionsService) {}

  @Get('/')
  @UseGuards(AuthZGuard)
  @UsePermissions({
    action: AuthActionVerb.READ,
    resource: '/suggestions',
    possession: AuthPossession.ANY,
  })
  getAllOptSuggestions(@Query() queries): any {
    if (Object.keys(queries).length > 0) {
      const { limitItem, currentItem, searchValue } = queries;
      return this.optSuggestionService.filterSuggestion(
        limitItem,
        currentItem,
        searchValue,
      );
    } else {
      return this.optSuggestionService.getSuggestions();
    }
  }

  @Get('/customer-campaign')
  @UseGuards(AuthZGuard)
  @UsePermissions({
    action: AuthActionVerb.READ,
    resource: '/suggestions',
    possession: AuthPossession.ANY,
  })
  getCampaignCustomersOut(@Query() queries) {
    const { limitItem, currentItem, searchValue } = queries;
    return this.optSuggestionService.filterSuggestionHistory(
      limitItem,
      currentItem,
      searchValue,
    );
    // return this.optSuggestionService.getCampaignCustomersOut();
  }

  @Get('/customers/:customerId/campaigns/:campaignId')
  @UseGuards(AuthZGuard)
  @UsePermissions({
    action: AuthActionVerb.READ,
    resource: '/suggestions',
    possession: AuthPossession.ANY,
  })
  getSuggestionHistory(
    @Param('customerId') customerId: string,
    @Param('campaignId') campaignId: string,
  ) {
    return this.optSuggestionService.getSuggestionHistory(
      campaignId,
      customerId,
    );
  }

  @Get('/:id')
  @UseGuards(AuthZGuard)
  @UsePermissions({
    action: AuthActionVerb.READ,
    resource: '/suggestions',
    possession: AuthPossession.ANY,
  })
  getOptSuggestionById(@Param('id') id: string): any {
    return this.optSuggestionService.getSuggestionById(id);
  }

  @Patch('/')
  @UseGuards(AuthZGuard)
  @UsePermissions({
    action: AuthActionVerb.UPDATE,
    resource: '/suggestions',
    possession: AuthPossession.ANY,
  })
  updateOptSuggestion(
    @Body() updateOptSuggestionDto: UpdateOptSuggestionDto,
    @GetUser() user: any,
  ) {
    return this.optSuggestionService.updateOptSuggestion(
      updateOptSuggestionDto,
      user,
    );
  }

  @Patch('/reason')
  @UseGuards(AuthZGuard)
  @UsePermissions({
    action: AuthActionVerb.UPDATE,
    resource: '/suggestions',
    possession: AuthPossession.ANY,
  })
  updateReasonOptSuggestion(@Body() data: any, @GetUser() user: any) {
    return this.optSuggestionService.updateReasonOptSuggestion(data, user);
  }

  @Post('/')
  @UseGuards(AuthZGuard)
  @UsePermissions({
    action: AuthActionVerb.CREATE,
    resource: '/suggestions',
    possession: AuthPossession.ANY,
  })
  createOptSuggestion(
    @Body() addOptSuggestionDto: AddOptSuggestionDto,
    @GetUser() user: any,
  ) {
    return this.optSuggestionService.createOptSuggestion(
      addOptSuggestionDto,
      user,
    );
  }
}
