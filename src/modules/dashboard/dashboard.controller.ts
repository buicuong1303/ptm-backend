import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { GetUser } from 'src/common/decorator/get-user.decorator';
import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}
  @Get('/')
  getDashboard(@Query() queries, @GetUser() user: any) {
    return this.dashboardService.handleGetDashboardInformation(user, queries);
  }
  @Get('/last-contact-customers')
  getLastContactCustomer(@Query() queries, @GetUser() user: any) {
    const { limitItem, currentItems } = queries;

    return this.dashboardService.getLastContactCustomers({
      user,
      limitItem,
      currentItems,
    });
  }
}
