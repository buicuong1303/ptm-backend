/* eslint-disable prettier/prettier */
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
import { AddSignaturesDto } from './dto/add-signatures.dto';
import { UpdateSignaturesDto } from './dto/update-signature.dto';
import { SignaturesService } from './signatures.service';

@Controller('signatures')
@UseGuards(JwtAuthGuard)
export class SignaturesController {
  constructor(private signaturesService: SignaturesService) {}

  @Post('/')
  @UseGuards(JwtAuthGuard, AuthZGuard)
  @UsePermissions({
    action: AuthActionVerb.CREATE,
    resource: '/signatures',
    possession: AuthPossession.ANY,
  })
  createSignature(
    @Body(ValidationPipe) addSignaturesDto: AddSignaturesDto,
    @GetUser() user: any,
  ): any {
    return this.signaturesService.createSignatures(addSignaturesDto, user);
  }

  @Patch('/:id')
  @UseGuards(JwtAuthGuard, AuthZGuard)
  // @UsePermissions({
  //   action: AuthActionVerb.UPDATE,
  //   resource: '/signatures',
  //   possession: AuthPossession.ANY,
  // })
  updateSignature(
    @Param('id') id: string,
    @Body(ValidationPipe) updateSignaturesDto: UpdateSignaturesDto,
    @GetUser() user: any,
  ): any {
    return this.signaturesService.updateSignature(
      id,
      updateSignaturesDto,
      user,
    );
  }

  @Delete('/:id')
  @UseGuards(JwtAuthGuard, AuthZGuard)
  @UsePermissions({
    action: AuthActionVerb.DELETE,
    resource: '/signatures',
    possession: AuthPossession.ANY,
  })
  deleteSignature(@Param('id') id: string, @GetUser() user: any): any {
    return this.signaturesService.deleteSignature(id, user);
  }

  @Get('/')
  @UseGuards(JwtAuthGuard, AuthZGuard)
  // @UsePermissions({
  //   action: AuthActionVerb.READ,
  //   resource: '/signatures',
  //   possession: AuthPossession.ANY,
  // })
  getSignature(): any {
    return this.signaturesService.getAllSignature();
  }

  @Get('/active')
  @UseGuards(JwtAuthGuard, AuthZGuard)
  // @UsePermissions({
  //   action: AuthActionVerb.READ,
  //   resource: '/signatures',
  //   possession: AuthPossession.ANY,
  // })
  getSignatureActive(): any {
    return this.signaturesService.getAllSignatureActive();
  }

  @Get('/:id')
  @UseGuards(JwtAuthGuard, AuthZGuard)
  @UsePermissions({
    action: AuthActionVerb.READ,
    resource: '/signatures',
    possession: AuthPossession.ANY,
  })
  getSignatureById(@Param('id') id: string): any {
    return this.signaturesService.getSignatureById(id);
  }
}
