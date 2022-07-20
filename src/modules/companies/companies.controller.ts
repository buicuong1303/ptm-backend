/* eslint-disable prettier/prettier */
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Patch,
  UseGuards,
} from '@nestjs/common';
import {
  AuthActionVerb,
  AuthPossession,
  AuthZGuard,
  UsePermissions,
} from 'nest-authz';
import { GetUser } from 'src/common/decorator/get-user.decorator';
import { JoiValidationPipe } from 'src/common/pipes/validation-schema.pipe';
import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard';
import { CompaniesService } from './companies.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { CreateCompanySchema } from './schema/create-company.schema';
import { UpdateCompanySchema } from './schema/update-company.schema';

@Controller('companies')
@UseGuards(JwtAuthGuard)
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Post()
  @UseGuards(JwtAuthGuard, AuthZGuard)
  @UsePermissions({
    action: AuthActionVerb.CREATE,
    resource: '/companies',
    possession: AuthPossession.ANY,
  })
  create(
    @Body(new JoiValidationPipe(CreateCompanySchema))
    createCompanyDto: CreateCompanyDto,
    @GetUser() user: any,
  ) {
    return this.companiesService.create(createCompanyDto, user);
  }

  @Get()
  @UseGuards(JwtAuthGuard, AuthZGuard)
  @UsePermissions({
    action: AuthActionVerb.READ,
    resource: '/companies',
    possession: AuthPossession.ANY,
  })
  findAll() {
    return this.companiesService.findAll();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, AuthZGuard)
  @UsePermissions({
    action: AuthActionVerb.READ,
    resource: '/companies',
    possession: AuthPossession.ANY,
  })
  findOne(@Param('id') id: string) {
    return this.companiesService.getInfoCompany(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, AuthZGuard)
  @UsePermissions({
    action: AuthActionVerb.UPDATE,
    resource: '/companies',
    possession: AuthPossession.ANY,
  })
  update(
    @Param('id') id: string,
    @Body(new JoiValidationPipe(UpdateCompanySchema))
    updateCompanyDto: UpdateCompanyDto,
    @GetUser() user: any,
  ) {
    return this.companiesService.update(id, updateCompanyDto, user);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, AuthZGuard)
  @UsePermissions({
    action: AuthActionVerb.DELETE,
    resource: '/companies',
    possession: AuthPossession.ANY,
  })
  remove(@Param('id') id: string, @GetUser() user: any) {
    return this.companiesService.remove(id, user);
  }

  //TODO: need add permission
  @Get('/:id/labels')
  getLabelsOfCompany(@Param('id') id: string, @GetUser() user: any) {
    return this.companiesService.getLabelsOfCompany(id);
  }
}
