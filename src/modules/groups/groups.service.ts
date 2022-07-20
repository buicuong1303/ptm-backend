import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import * as XLSX from 'xlsx';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateGroupDto } from './dto/createGroup.dto';
import { Group } from './entity/group.entity';
import * as _ from 'lodash';
import { GroupRepository } from './repository/group.repository';
import { EntityStatus } from 'src/common/constant/entity-status';
import { Not } from 'typeorm';
import { GroupCustomerRepository } from '../groups-customers/repository/groups-customers.repository';
import { CompanyCustomersService } from '../company-customers/company-customers.service';
import { CustomerRepository } from '../customers/repository/customer.repository';
import { UpdateGroupDto } from './dto/updateGroup.dto';
@Injectable()
export class GroupsService {
  constructor(
    @InjectRepository(GroupRepository)
    private readonly groupRepository: GroupRepository,
    private readonly groupCustomerRepository: GroupCustomerRepository,
    private readonly companyCustomerService: CompanyCustomersService,
    private readonly customerRepository: CustomerRepository,
  ) {}

  async createGroup(createGroupDto: CreateGroupDto, user = null) {
    const groupExisted = await this.groupRepository.findOne({
      where: {
        name: createGroupDto.name,
        status: Not(EntityStatus.DELETE),
      },
    });
    if (groupExisted) throw new ConflictException(`Group already exists`);

    try {
      const group = _.assign(new Group(), createGroupDto);
      group.creationUserId = user ? user.id : '';

      return await group.save();
    } catch (error) {
      throw new InternalServerErrorException();
    }
  }

  async updateGroup(
    updateGroupDto: UpdateGroupDto,
    groupId: string,
    user = null,
  ) {
    const group = await this.groupRepository.findOne({
      where: {
        id: groupId,
        status: Not(EntityStatus.DELETE),
      },
    });
    if (!group) throw new NotFoundException('Not found group');

    try {
      group.name = updateGroupDto.name;
      group.status = updateGroupDto.status;
      group.description = updateGroupDto.description;
      group.lastModifiedUserId = user ? user.id : '';
      await group.save();

      return group;
    } catch (error) {
      throw new InternalServerErrorException();
    }
  }

  async getGroups() {
    const groups = await this.groupRepository.find({
      where: {
        status: Not(EntityStatus.DELETE),
      },
      order: {
        creationTime: 'ASC',
      },
    });
    return groups;
  }

  async deleteGroup(groupId: string, user = null) {
    const group = await this.groupRepository.findOne({
      where: {
        id: groupId,
        status: Not(EntityStatus.DELETE),
      },
    });
    if (!group) throw new NotFoundException('Not found group');

    try {
      group.status = EntityStatus.DELETE;
      group.lastModifiedUserId = user ? user.id : '';
      await group.save();

      return group;
    } catch (error) {
      throw new InternalServerErrorException();
    }
  }

  async getFullGroups() {
    const listGroup = [];

    const groups = await this.groupRepository.find({
      where: {
        status: Not(EntityStatus.DELETE),
      },
    });

    for (let i = 0; i < groups.length; i++) {
      const groupCustomer = await this.groupCustomerRepository.find({
        relations: ['customer', 'group'],
        where: {
          group: groups[i],
          status: EntityStatus.ACTIVE,
        },
      });
      const listCustomer = groupCustomer.map((item) => item.customer);
      groups[i]['customer'] = listCustomer;
      listGroup.push(groups[i]);
    }

    return listGroup;
  }

  async getFullWithGroupId(groupId: string) {
    const group = await this.groupRepository.findOne({
      where: {
        id: groupId,
        status: Not(EntityStatus.DELETE),
      },
    });

    const groupCustomer = await this.groupCustomerRepository.find({
      relations: ['customer', 'group'],
      where: {
        group: group,
        status: Not(EntityStatus.DELETE),
      },
      order: {
        creationTime: 'ASC',
      },
    });

    const newListCustomer = [];
    const listCustomer = groupCustomer.map((item) => {
      item.customer['groupCustomerStatus'] = item.status;
      return item.customer;
    });

    for (let i = 0; i < listCustomer.length; i++) {
      const listCompany =
        await this.companyCustomerService.getCompaniesOfCustomer(
          listCustomer[i].id,
        );
      listCustomer[i]['companies'] = listCompany;
      newListCustomer.push(listCustomer[i]);
    }

    return newListCustomer;
  }

  private extractPhoneNumber = (file: Buffer) => {
    try {
      const workbook = XLSX.read(file, { type: 'buffer', cellDates: true });
      const ws = workbook.Sheets[workbook.SheetNames[0]];

      //* convert sheet to json
      const extractedData = XLSX.utils.sheet_to_json(ws, {
        defval: '',
        header: ['phoneNumber'],
        raw: false,
      });

      //* setup return data
      const data = {
        data: extractedData,
        sheetName: workbook.SheetNames[0],
      };

      return data;
    } catch (error) {
      throw new InternalServerErrorException();
    }
  };

  // async getGroupsOfCustomer(customer: Customer) {
  //   const groupCustomer = await this.groupCustomerRepository.find({
  //     where: {
  //       customer: customer,
  //       status: EntityStatus.ACTIVE,
  //     },
  //   });
  //   if (!groupCustomer) return 'Not found group';
  //   const listGroup = [];
  //   groupCustomer.forEach((item) => {
  //     listGroup.push(item.group);
  //   });
  //   return listGroup;
  // }

  async checkPhoneNumber(file: any, groupId: string) {
    const listCustomerNew = [];
    const listCustomerDuplicate = [];
    const listRowError = [];

    const group = await this.groupRepository.findOne({
      where: {
        id: groupId,
        status: EntityStatus.ACTIVE,
      },
    });
    if (!group) throw new NotFoundException('Not found group');

    for (let i = 0; i < file.length; i++) {
      if (
        file[i].phoneNumber
          .toString()
          .slice(1)
          .match(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]|[a-z]/i)
      ) {
        listRowError.push((i + 2).toString());
        continue;
      }

      if (
        !file[i].phoneNumber.toString()[0].match(/[0-9]/i) &&
        file[i].phoneNumber.toString()[0] !== '+'
      ) {
        listRowError.push((i + 2).toString());
        continue;
      }
      let customer;
      if (file[i].phoneNumber.toString().includes('+')) {
        customer = await this.customerRepository.findOne({
          where: {
            phoneNumber: file[i].phoneNumber,
            status: EntityStatus.ACTIVE,
          },
        });
      } else {
        customer = await this.customerRepository.findOne({
          where: {
            phoneNumber: '+' + file[i].phoneNumber,
            status: EntityStatus.ACTIVE,
          },
        });
      }
      if (!customer) {
        listCustomerNew.push({
          phoneNumber: file[i].phoneNumber.toString(),
          status: 'new',
          company: [],
        });
      } else {
        const companiesOfCustomer =
          await this.companyCustomerService.getCompaniesOfCustomer(customer.id);

        const groupCustomer = await this.groupCustomerRepository.findOne({
          where: {
            customer: customer,
            group: group,
            status: Not(EntityStatus.DELETE),
          },
        });

        if (!groupCustomer) {
          listCustomerNew.push({
            phoneNumber: file[i].phoneNumber.toString(),
            status: 'new',
            company: companiesOfCustomer,
          });
        } else {
          listCustomerDuplicate.push({
            phoneNumber: file[i].phoneNumber.toString(),
            status: 'duplicate',
            company: companiesOfCustomer,
          });
        }
      }
    }

    if (listRowError.length > 0) {
      throw new BadRequestException(
        `Rows ${listRowError.join()} are not phone number `,
      );
    }

    const listCustomer = listCustomerDuplicate.concat(listCustomerNew);
    return listCustomer;
  }

  async readFile(file: any, groupId: string) {
    const fileData = this.extractPhoneNumber(file.buffer);
    const data = fileData.data;
    //* remove row header
    data.shift();
    return await this.checkPhoneNumber(data, groupId);
  }

  async deleteCustomerInGroup(
    customerId: string,
    groupId: string,
    user = null,
  ) {
    const groupCustomer = await this.groupCustomerRepository.findOne({
      where: {
        customer: { id: customerId },
        group: { id: groupId },
        status: Not(EntityStatus.DELETE),
      },
    });
    if (!groupCustomer)
      throw new NotFoundException('Not found customer in group');

    try {
      groupCustomer.status = EntityStatus.DELETE;
      groupCustomer.lastModifiedUserId = user ? user.id : '';
      await groupCustomer.save();

      return customerId;
    } catch (error) {
      throw new InternalServerErrorException();
    }
  }
}
