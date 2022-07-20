/* eslint-disable prettier/prettier */
import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityStatus } from 'src/common/constant/entity-status';
import { ReadStatus } from 'src/common/constant/read-status';
import { EntityManager, getManager, Not } from 'typeorm';
import { Participant } from '../participants/entity/participant.entity';
import { ParticipantRepository } from '../participants/repository/participant.repository';
import { User } from '../users/entity/user.entity';
import { CreateCompanyUserDto } from './dto/create-company-user.dto';
import { CompanyUser } from './entity/company-user.entity';
import { CompanyUserRepository } from './repository/company-user.repository';
import * as _ from 'lodash';
@Injectable()
export class CompanyUsersService {
  constructor(
    @InjectRepository(CompanyUserRepository)
    private readonly companyUserRepository: CompanyUserRepository,
    private readonly participantRepository: ParticipantRepository,
  ) {
    setTimeout(async () => {
      const data = await this.getCompaniesOfUser(
        '060e2672-0010-4cc2-a72e-961d2a9e7888',
      );
    }, 2000);
  }

  async createCompanyUsers(
    createCompanyUserDto: CreateCompanyUserDto,
    userRequest = null,
    manager,
  ) {
    const listCompanies = [];

    const { companies, user } = createCompanyUserDto;
    const companyLength = companies.length;

    for (let i = 0; i < companyLength; i++) {
      const oldCompanyUser = await this.companyUserRepository.findOne({
        where: {
          company: { id: companies[i].id },
        },
      });
      if (!oldCompanyUser) {
        const newData = new CompanyUser();
        newData.user = user;
        newData.company = companies[i];
        newData.creationUserId = userRequest ? userRequest.id : '';
        await manager.save(newData);
        // await newData.save();
      } else {
        const participantOfOldUser = await this.participantRepository.find({
          relations: ['conversation'],
          where: {
            companyUser: oldCompanyUser,
          },
        });
        if (participantOfOldUser.length === 0) {
          const newData = new CompanyUser();
          newData.user = user;
          newData.company = companies[i];
          newData.creationUserId = userRequest ? userRequest.id : '';
          await manager.save(newData);
          // await newData.save();
        } else {
          const listConversation = participantOfOldUser.map((item) => {
            return item.conversation;
          });
          const newData = new CompanyUser();
          newData.user = user;
          newData.company = companies[i];
          newData.creationUserId = userRequest ? userRequest.id : '';
          await manager.save(newData);
          // await newData.save();
          for (let j = 0; j < listConversation.length; j++) {
            const newParticipant = new Participant();
            newParticipant.companyUser = newData;
            newParticipant.conversation = listConversation[j];
            newParticipant.umn = 0;
            newParticipant.readStatus = ReadStatus.READ;
            newParticipant.creationUserId = userRequest ? userRequest.id : '';
            await manager.save(newParticipant);
            // await newParticipant.save();
          }
        }
      }
    }

    const infoCompanyUsersAfterCreate = await getManager()
      .createQueryBuilder()
      .insert()
      .into(CompanyUser)
      .values(listCompanies)
      .returning('*')
      .execute();

    return infoCompanyUsersAfterCreate;
  }

  findAll() {
    return `This action returns all companyUsers`;
  }

  async isExist(id: string) {
    return await this.companyUserRepository.findOne({
      where: {
        id: id,
        status: Not(EntityStatus.DELETE),
      },
    });
  }

  async getCompaniesOfUser(userId: string) {
    const result = await getManager()
      .createQueryBuilder(CompanyUser, 'companyUser')
      .select([
        'companyUser.id',
        'company.id',
        'company.code',
        'company.phone',
        'company.name',
        'signature.id',
        'signature.value',
        'signature.status',
        'labelsOfCompany.id',
        'label.id',
        'label.title',
        'label.bgColor',
      ])
      .innerJoin('companyUser.user', 'user')
      .innerJoin('companyUser.company', 'company')

      //* get default signature
      .leftJoin('company.signature', 'signature')
      .andWhere('user.id = :userId and user.status = :status', {
        userId: userId,
        status: EntityStatus.ACTIVE,
      })
      .andWhere('companyUser.status = :status', { status: EntityStatus.ACTIVE })
      .andWhere('company.status = :status', { status: EntityStatus.ACTIVE })

      //* get labels assign
      .leftJoin(
        'company.labelsOfCompany',
        'labelsOfCompany',
        'labelsOfCompany.status = :status',
        { status: EntityStatus.ACTIVE },
      )

      .leftJoin('labelsOfCompany.label', 'label', 'label.status = :status', {
        status: EntityStatus.ACTIVE,
      })

      .getMany();
    const mappingCompaniesPromise = result.map(async (companyUser) => {
      const labels = companyUser['company']['labelsOfCompany']
        .map((label) => {
          return label['label'];
        })
        .filter((label) => label);
      const users = await getManager()
        .createQueryBuilder(CompanyUser, 'companyUser')
        .select([
          'companyUser.id',
          'user.id',
          'user.firstName',
          'user.lastName',
          'user.status',
        ])
        .innerJoin('companyUser.user', 'user')
        .innerJoin('companyUser.company', 'company')
        .andWhere('company.id = :companyId', {
          companyId: companyUser['company'].id,
        })
        .andWhere('user.status = :status', {
          status: EntityStatus.ACTIVE,
        })
        .getMany();
      return {
        ...companyUser,
        company: _.omit(
          {
            ...companyUser['company'],
            labels: labels,
            users: users.map((item) => item.user),
          },
          ['labelsOfCompany'],
        ),
      };
    });

    const companies = await Promise.all(mappingCompaniesPromise);
    return companies;
  }

  async updateCompanyUser(
    user: User,
    { companyToAdd, companyToDelete },
    userRequest = null,
    manager: EntityManager,
  ) {
    const listCompaniesToAdd = [];

    if (companyToDelete.length > 0) {
      await getManager()
        .createQueryBuilder()
        .update(CompanyUser)
        .andWhere('user.id = :userId', { userId: user.id })
        .andWhere('company.id IN (:...companyIds)', {
          companyIds: companyToDelete,
        })
        .set({
          status: EntityStatus.INACTIVE,
          lastModifiedUserId: userRequest ? userRequest.id : '',
        })
        .execute();
    }

    if (companyToAdd.length > 0) {
      const infoCompanyUsers = [];
      for (let i = 0; i < companyToAdd.length; i++) {
        const userInCompany = await this.companyUserRepository.findOne({
          where: {
            user: user,
            company: { id: companyToAdd[i] },
          },
        });
        if (!userInCompany) {
          const oldCompanyUser = await this.companyUserRepository.findOne({
            where: {
              company: { id: companyToAdd[i] },
            },
          });
          if (!oldCompanyUser) {
            const newData = new CompanyUser();
            newData.user = user;
            newData.company = companyToAdd[i];
            newData.creationUserId = userRequest ? userRequest.id : '';
            await manager.save(newData);
            // await newData.save();
            listCompaniesToAdd.push(newData);
          } else {
            const participantOfOldUser = await this.participantRepository.find({
              relations: ['conversation'],
              where: {
                companyUser: oldCompanyUser,
              },
            });
            if (participantOfOldUser.length === 0) {
              const newData = new CompanyUser();
              newData.user = user;
              newData.company = companyToAdd[i];
              newData.creationUserId = userRequest ? userRequest.id : '';
              await manager.save(newData);
              // await newData.save();
              listCompaniesToAdd.push(newData);
            } else {
              const listConversation = participantOfOldUser.map((item) => {
                return item.conversation;
              });
              const newData = new CompanyUser();
              newData.user = user;
              newData.company = companyToAdd[i];
              newData.creationUserId = userRequest ? userRequest.id : '';
              await manager.save(newData);
              // await newData.save();
              for (let j = 0; j < listConversation.length; j++) {
                const newParticipant = new Participant();
                newParticipant.companyUser = newData;
                newParticipant.conversation = listConversation[j];
                newParticipant.umn = 0;
                newParticipant.readStatus = ReadStatus.READ;
                newParticipant.creationUserId = userRequest
                  ? userRequest.id
                  : '';
                await manager.save(newParticipant);
                // await newParticipant.save();
              }
              listCompaniesToAdd.push(newData);
            }
          }
        } else {
          userInCompany.status = EntityStatus.ACTIVE;
          userInCompany.creationUserId = userRequest ? userRequest.id : '';
          infoCompanyUsers.push(userInCompany);
          await manager.save(userInCompany);
          // await userInCompany.save();
        }
      }
      return infoCompanyUsers;
    }
  }

  remove(id: number) {
    return `This action removes a #${id} companyUser`;
  }

  async getCompanyOfUser(userId: string, companyId: string) {
    const companyOfUser = await this.companyUserRepository.findOne({
      where: {
        user: userId,
        company: companyId,
        status: Not(EntityStatus.DELETE),
      },
    });
    if (!companyOfUser) throw new NotFoundException('Not found company user');

    return companyOfUser;
  }

  async getUserInCompany(companyId: any) {
    try {
      const userInCompany = await this.companyUserRepository.find({
        relations: ['user'],
        where: {
          company: companyId,
          status: Not(EntityStatus.DELETE),
        },
      });
      return userInCompany;
    } catch (error) {
      throw new InternalServerErrorException();
    }
  }
}
