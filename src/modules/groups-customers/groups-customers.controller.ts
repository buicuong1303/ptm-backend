/* eslint-disable prettier/prettier */
import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { GetUser } from 'src/common/decorator/get-user.decorator';
import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard';
import { GroupCustomersService } from './groups-customers.service';

@Controller('groups-customers')
@UseGuards(JwtAuthGuard)
export class GroupCustomersController {
  constructor(private readonly groupCustomersService: GroupCustomersService) {}

  @Post('/')
  changeStatusGroupCustomer(@Body() data: any, @GetUser() user: any) {
    return this.groupCustomersService.changeStatusGroupCustomer(data, user);
  }
}
