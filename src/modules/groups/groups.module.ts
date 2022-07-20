import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompanyCustomersModule } from '../company-customers/company-customers.module';
import { CustomerRepository } from '../customers/repository/customer.repository';
import { GroupCustomerRepository } from '../groups-customers/repository/groups-customers.repository';
import { SignaturesModule } from '../signatures/signatures.module';
import { GroupsController } from './groups.controller';
import { GroupsService } from './groups.service';
import { GroupRepository } from './repository/group.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      GroupRepository,
      GroupCustomerRepository,
      CustomerRepository,
    ]),
    SignaturesModule,
    CompanyCustomersModule,
  ],
  controllers: [GroupsController],
  providers: [GroupsService],
  exports: [GroupsService],
})
export class GroupsModule {}
