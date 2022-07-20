import { Controller, Get, Param } from '@nestjs/common';
import { CompanyCustomersService } from './company-customers.service';

@Controller('company-customers')
export class CompanyCustomersController {
  constructor(
    private readonly companyCustomersService: CompanyCustomersService,
  ) {}

  @Get('/:id')
  getCompaniesOfCustomer(@Param('id') customerId: string): any {
    return this.companyCustomersService.getCompaniesOfCustomer(customerId);
  }
}
