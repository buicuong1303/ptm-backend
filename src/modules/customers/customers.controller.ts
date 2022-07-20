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
  UploadedFile,
  UseGuards,
  UseInterceptors,
  ValidationPipe,
} from '@nestjs/common';
import {
  AuthActionVerb,
  AuthPossession,
  AuthZGuard,
  UsePermissions,
} from 'nest-authz';
import { GetUser } from 'src/common/decorator/get-user.decorator';
import {
  Connection,
  EntityManager,
  Transaction,
  TransactionManager,
} from 'typeorm';
import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard';
import { CustomersService } from './customers.service';
import { AddCustomerDto } from './dto/add-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { EditCustomerDto } from './dto/edit-customer.dto';
import { MessageDirection } from 'src/common/constant/message-direction';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('customers')
@UseGuards(JwtAuthGuard)
export class CustomerController {
  constructor(
    private customersService: CustomersService,
    private readonly connection: Connection,
  ) {}

  @Post('/excel')
  @Transaction()
  async addCustomerFromExcel(
    @Body() data: any,
    @GetUser() user: any,
    @TransactionManager() manager: EntityManager,
  ): Promise<any> {
    return this.customersService.addCustomerFromExcel(data.data, user, manager);
  }

  @Post('/file')
  @UseInterceptors(FileInterceptor('file'))
  async readFile(@UploadedFile() file): Promise<any> {
    return this.customersService.readFile(file);
  }

  @Post('/:createWithUi')
  @UseGuards(JwtAuthGuard, AuthZGuard)
  @UsePermissions({
    action: AuthActionVerb.CREATE,
    resource: '/customers',
    possession: AuthPossession.ANY,
  })
  @Transaction()
  createCustomer(
    @Body(ValidationPipe) addCustomerDto: AddCustomerDto,
    @Param('createWithUi') createWithUi: any,
    @GetUser() user: any,
    @TransactionManager() manager: EntityManager,
  ): any {
    return this.customersService.createCustomer(
      addCustomerDto,
      manager,
      0,
      createWithUi,
      user,
      MessageDirection.OUTBOUND,
    );
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, AuthZGuard)
  @UsePermissions({
    action: AuthActionVerb.UPDATE,
    resource: '/customers',
    possession: AuthPossession.ANY,
  })
  async updateCustomer(
    @Body(ValidationPipe) updateCustomerDto: UpdateCustomerDto,
    @Param('id') id: string,
    @GetUser() user: any,
  ): Promise<any> {
    const queryRunner = this.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    return this.customersService.updateCustomer(
      id,
      updateCustomerDto,
      queryRunner.manager,
      user,
    );
  }

  @Delete('/:id')
  @UseGuards(JwtAuthGuard, AuthZGuard)
  @UsePermissions({
    action: AuthActionVerb.DELETE,
    resource: '/customers',
    possession: AuthPossession.ANY,
  })
  deleteCustomer(@Param('id') id: string, @GetUser() user: any): any {
    return this.customersService.removeCustomer(id, user);
  }

  @Get()
  @UseGuards(JwtAuthGuard, AuthZGuard)
  @UsePermissions({
    action: AuthActionVerb.READ,
    resource: '/customers',
    possession: AuthPossession.ANY,
  })
  getCustomers(@Query() queries): any {
    if (Object.keys(queries).length > 0) {
      const { limitItem, currentItem, searchValue } = queries;
      return this.customersService.filterCustomers(
        limitItem,
        currentItem,
        searchValue,
      );
    } else {
      return this.customersService.getCustomers();
    }
  }

  @Get('/compose-text')
  @UseGuards(JwtAuthGuard, AuthZGuard)
  @UsePermissions({
    action: AuthActionVerb.READ,
    resource: '/compose-text',
    possession: AuthPossession.ANY,
  })
  getCustomersComposeText(@Query() queries): any {
    return this.customersService.getCustomersComposeText(queries);
  }

  @Get('/:id')
  @UseGuards(JwtAuthGuard, AuthZGuard)
  @UsePermissions({
    action: AuthActionVerb.READ,
    resource: '/customers',
    possession: AuthPossession.ANY,
  })
  getCustomerById(@Param('id') id: string): any {
    return this.customersService.getCustomerById(id);
  }

  @Post('/groups/:id')
  @UseGuards(JwtAuthGuard, AuthZGuard)
  @UsePermissions({
    action: AuthActionVerb.UPDATE,
    resource: '/groups',
    possession: AuthPossession.ANY,
  })
  addCustomersToGroup(
    @Param('id') id: string,
    @Body() listPhone: string[],
    @GetUser() user: any,
  ): any {
    return this.customersService.addCustomersToGroup(listPhone, id, user);
  }

  @Get('/groups/:id')
  @UseGuards(JwtAuthGuard, AuthZGuard)
  @UsePermissions({
    action: AuthActionVerb.READ,
    resource: '/groups',
    possession: AuthPossession.ANY,
  })
  getCustomersInGroup(@Param('id') id: string): any {
    return this.customersService.getCustomersInGroup(id);
  }

  @Delete('/:customerId/groups/:groupId')
  @UseGuards(JwtAuthGuard, AuthZGuard)
  @UsePermissions({
    action: AuthActionVerb.UPDATE,
    resource: '/groups',
    possession: AuthPossession.ANY,
  })
  deleteCustomersInGroup(
    @Param('groupId') groupId: string,
    @Param('customerId') customerId: string,
    @GetUser() user: any,
  ): any {
    return this.customersService.deleteCustomerInGroup(
      groupId,
      customerId,
      user,
    );
  }

  @Post('/:id/edit')
  async editCustomer(
    @Body() editCustomerDto: EditCustomerDto,
    @Param('id') id: string,
    @GetUser() user: any,
  ): Promise<any> {
    const queryRunner = this.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    return this.customersService.editCustomer(
      id,
      editCustomerDto,
      queryRunner.manager,
      user,
    );
  }

  @Post('/validate/composeText')
  async validateCustomerCampaign(@Body() selectedPhones: string[]): Promise<any> {
    return this.customersService.validateCustomerCampaign(selectedPhones);
  }
}
