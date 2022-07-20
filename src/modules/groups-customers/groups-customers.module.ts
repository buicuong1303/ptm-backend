import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomerRepository } from '../customers/repository/customer.repository';
import { GroupCustomersService } from './groups-customers.service';
import { GroupCustomersController } from './groups-customers.controller';
import { GroupCustomerRepository } from './repository/groups-customers.repository';
import { GroupRepository } from '../groups/repository/group.repository';
import { GroupsModule } from '../groups/groups.module';
import { CustomersModule } from '../customers/customers.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      GroupCustomerRepository,
      CustomerRepository,
      GroupRepository,
    ]),
    GroupsModule,
    CustomersModule,
  ],
  controllers: [GroupCustomersController],
  providers: [GroupCustomersService],
  exports: [GroupCustomersService],
})
export class GroupCustomersModule {}
