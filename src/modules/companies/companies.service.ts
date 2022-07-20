/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { CompanyLabelsService } from './../company-labels/company-labels.service';
import { CompanyLabelRepository } from './../company-labels/repository/company-label.repository';
import { getManager } from 'typeorm';
import {
  BadRequestException,
  ConflictException,
  forwardRef,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { CompanyRepository } from './repository/company.repository';
import * as _ from 'lodash';
import { Company } from './entity/company.entity';
import { SignaturesService } from '../signatures/signatures.service';
import { Connection, In, Not } from 'typeorm';
import { EntityStatus } from 'src/common/constant/entity-status';
import { ModuleRef } from '@nestjs/core';
import { RingcentralService } from '../services/amqp/services/ringcentral.service';
import { AppStatus } from 'src/common/constant/app-status';
import { CustomerCampaign } from '../customer-campaigns/entity/customer-campaigns.entity';

@Injectable()
export class CompaniesService {
  private readonly logger = new Logger(CompaniesService.name);
  private ringcentralService: RingcentralService;

  constructor(
    @InjectRepository(CompanyRepository)
    private readonly companyRepository: CompanyRepository,
    @Inject(forwardRef(() => SignaturesService))
    private readonly signatureService: SignaturesService,
    private readonly moduleRef: ModuleRef,
    private readonly connection: Connection,
    private readonly _companyLabelsService: CompanyLabelsService,
  ) {
    this.ringcentralService = this.moduleRef.get(RingcentralService, {
      strict: false,
    });
  }

  onModuleInit() {
    this.ringcentralService = this.moduleRef.get(RingcentralService, {
      strict: false,
    });
  }

  async create(createCompanyDto: CreateCompanyDto, user = null) {
    const { signature, code } = createCompanyDto;

    const queryRunner = this.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    if (createCompanyDto.phone.indexOf('+') < 0)
      createCompanyDto.phone = '+1' + createCompanyDto.phone;

    const infoSignature = await this.signatureService.getSignatureById(
      signature,
    );
    if (!infoSignature) throw new NotFoundException('Not found signature');

    const isExistCode = await this.companyRepository.findOne({
      where: {
        code: code,
        status: Not(EntityStatus.DELETE),
      },
    });
    if (isExistCode) throw new ConflictException('Code already exist');

    const isExistPhone = await this.companyRepository.findOne({
      where: {
        phone: createCompanyDto.phone,
        status: Not(EntityStatus.DELETE),
      },
    });
    if (isExistPhone) throw new ConflictException('Phone already exist');

    let hasError = false;
    let errorDatas: [];
    let newCompany: Company;
    try {
      newCompany = _.assign(new Company(), createCompanyDto);
      newCompany.signature = infoSignature;
      newCompany.creationUserId = user ? user.id : '';
      newCompany.appStatus = AppStatus.SUCCESS;
      newCompany.appError = null;
      await queryRunner.manager.save(newCompany);

      const isExistApp = await this.companyRepository.findOne({
        where: {
          id: Not(newCompany.id),
          clientId: createCompanyDto.clientId,
          clientSecret: createCompanyDto.clientSecret,
          username: createCompanyDto.username,
          extension: createCompanyDto.extension,
          status: Not(EntityStatus.DELETE),
          appStatus: AppStatus.SUCCESS,
        },
      });

      if (!isExistApp) {
        const result = await this.ringcentralService.addConcrete({
          username: newCompany.username,
          password: newCompany.password,
          extension: newCompany.extension,
          server: newCompany.server,
          clientId: newCompany.clientId,
          clientSecret: newCompany.clientSecret,
          dlrAddress: newCompany.dlrAddress,
          dlrMTT: newCompany.dlrMTT,
        });

        if (!result) throw new InternalServerErrorException();
      } else {
        const errors = [];

        if (isExistApp.server !== createCompanyDto.server)
          errors.push({
            property: 'server',
            message: 'Server invalid',
          });

        if (isExistApp.dlrAddress !== createCompanyDto.dlrAddress)
          errors.push({
            property: 'dlrAddress',
            message: 'DlrAddress invalid',
          });

        if (isExistApp.dlrMTT !== createCompanyDto.dlrMTT)
          errors.push({
            property: 'dlrMTT',
            message: 'DlrMTT invalid',
          });

        if (errors.length > 0)
          throw new BadRequestException(JSON.stringify(errors));
      }

      await queryRunner.commitTransaction();
    } catch (error) {
      hasError = true;
      this.logger.error(error);
      await queryRunner.rollbackTransaction();

      if (error?.status === 400) errorDatas = JSON.parse(error.message);

      throw new InternalServerErrorException();
    } finally {
      await queryRunner.release();

      if (hasError) {
        if (errorDatas?.length > 0) {
          const errorObject = {
            error: 'Bad Request',
            message: errorDatas,
          };
          throw new InternalServerErrorException(JSON.stringify(errorObject));
        } else throw new InternalServerErrorException();
      }

      const companyFullInfor = await this.companyRepository.findOne(
        newCompany.id,
        {
          relations: ['signature'],
        },
      );

      return _.omit(companyFullInfor, ['clientId', 'clientSecret', 'password']);
    }
  }

  async findAll() {
    const companies = await this.companyRepository.find({
      where: {
        status: Not(EntityStatus.DELETE),
      },
      relations: ['signature'],
    });

    return companies.map((item: Company) => {
      return {
        ...item,
        clientId: '',
        clientSecret: '',
        password: '',
      };
    });
  }

  async getCompanies(type = 'active') {
    const companies = await this.companyRepository.find({
      where: {
        status:
          type === 'active'
            ? EntityStatus.ACTIVE
            : type === 'notDelete'
            ? Not(EntityStatus.DELETE)
            : Not(null),
      },
    });

    return companies;
  }

  async getInfoCompanies(ids: Array<string>) {
    return await this.companyRepository.find({
      where: {
        id: In(ids),
        status: Not(EntityStatus.DELETE),
      },
    });
  }

  async getInfoCompaniesActive(ids: Array<string>) {
    return await this.companyRepository.find({
      where: {
        id: In(ids),
        status: EntityStatus.ACTIVE,
      },
    });
  }

  async getInfoCompany(id: string) {
    return await this.companyRepository.findOne({
      where: {
        id: id,
        status: Not(EntityStatus.DELETE),
      },
    });
  }

  async getCompanyByPhone(phoneNumber: string) {
    return await this.companyRepository.findOne({
      where: {
        phone: phoneNumber,
        status: EntityStatus.ACTIVE,
      },
    });
  }

  async update(id: string, updateCompanyDto: UpdateCompanyDto, user = null) {
    const { signature, code, clientId, clientSecret, password } =
      updateCompanyDto;

    const queryRunner = this.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    if (updateCompanyDto.phone.indexOf('+') < 0)
      updateCompanyDto.phone = '+1' + updateCompanyDto.phone;

    const infoCompany = await this.companyRepository.findOne({
      where: {
        id: id,
        status: Not(EntityStatus.DELETE),
      },
      relations: ['signature'],
    });
    if (!infoCompany) throw new NotFoundException('Not found company');

    const infoSignature = await this.signatureService.getSignatureById(
      signature,
    );
    if (!infoSignature) throw new NotFoundException('Not found signature');

    const isExistCode = await this.companyRepository.findOne({
      where: {
        id: Not(id),
        code: code,
        status: Not(EntityStatus.DELETE),
      },
    });
    if (isExistCode) throw new ConflictException('Code already exist');

    const isExistPhone = await this.companyRepository.findOne({
      where: {
        id: Not(id),
        phone: updateCompanyDto.phone,
        status: Not(EntityStatus.DELETE),
      },
    });
    if (isExistPhone) throw new ConflictException('Phone already exist');

    let hasError = false;
    let errorDatas: [];

    try {
      // TODO Kiem tra xem con company nao dung concrete nay nua khong, neu khong co thi remove
      const isAppForMultipleCompany = await this.companyRepository.findOne({
        where: {
          id: Not(id),
          clientId: infoCompany.clientId,
          clientSecret: infoCompany.clientSecret,
          username: infoCompany.username,
          extension: infoCompany.extension,
          status: Not(EntityStatus.DELETE),
        },
      });
      if (
        !isAppForMultipleCompany &&
        (infoCompany.username !== updateCompanyDto.username ||
          (!!updateCompanyDto.password &&
            infoCompany.password !== updateCompanyDto.password) ||
          infoCompany.extension !== updateCompanyDto.extension ||
          infoCompany.server !== updateCompanyDto.server ||
          (!!updateCompanyDto.clientId &&
            infoCompany.clientId !== updateCompanyDto.clientId) ||
          (!!updateCompanyDto.clientSecret &&
            infoCompany.clientSecret !== updateCompanyDto.clientSecret) ||
          infoCompany.dlrAddress !== updateCompanyDto.dlrAddress ||
          infoCompany.dlrMTT !== updateCompanyDto.dlrMTT)
      ) {
        const result = await this.ringcentralService.removeConcrete({
          username: infoCompany.username,
          password: infoCompany.password,
          extension: infoCompany.extension,
          server: infoCompany.server,
          clientId: infoCompany.clientId,
          clientSecret: infoCompany.clientSecret,
          dlrAddress: infoCompany.dlrAddress,
          dlrMTT: infoCompany.dlrMTT,
        });

        if (!result) throw new InternalServerErrorException();
      }

      const oldCustomer = infoCompany.phone;
      const newData = _.assign(
        _.cloneDeep(infoCompany),
        _.omit(updateCompanyDto, ['clientId', 'clientSecret', 'password']),
      );
      newData.clientId = clientId ? clientId : infoCompany.clientId;
      newData.clientSecret = clientSecret
        ? clientSecret
        : infoCompany.clientSecret;
      newData.password = password ? password : infoCompany.password;
      newData.lastModifiedUserId = user ? user.id : '';
      newData.phone = oldCustomer;
      newData.appStatus = AppStatus.SUCCESS;
      newData.appError = null;
      const infoCompanyAfterUpdate = await queryRunner.manager.save(newData);

      if (
        infoCompany.username !== updateCompanyDto.username ||
        (!!updateCompanyDto.password &&
          infoCompany.password !== updateCompanyDto.password) ||
        infoCompany.extension !== updateCompanyDto.extension ||
        infoCompany.server !== updateCompanyDto.server ||
        (!!updateCompanyDto.clientId &&
          infoCompany.clientId !== updateCompanyDto.clientId) ||
        (!!updateCompanyDto.clientSecret &&
          infoCompany.clientSecret !== updateCompanyDto.clientSecret) ||
        infoCompany.dlrAddress !== updateCompanyDto.dlrAddress ||
        infoCompany.dlrMTT !== updateCompanyDto.dlrMTT
      ) {
        // TODO Kiem tra xem concrete voi thong tin tuong tu ton tai khong, neu khong co thi them moi
        const isExistApp = await this.companyRepository.findOne({
          where: {
            id: Not(id),
            clientId: infoCompanyAfterUpdate.clientId,
            clientSecret: infoCompanyAfterUpdate.clientSecret,
            username: infoCompanyAfterUpdate.username,
            extension: infoCompanyAfterUpdate.extension,
            status: Not(EntityStatus.DELETE),
            appStatus: AppStatus.SUCCESS,
          },
        });
        if (!isExistApp) {
          const result = await this.ringcentralService.addConcrete({
            username: infoCompanyAfterUpdate.username,
            password: infoCompanyAfterUpdate.password,
            extension: infoCompanyAfterUpdate.extension,
            server: infoCompanyAfterUpdate.server,
            clientId: infoCompanyAfterUpdate.clientId,
            clientSecret: infoCompanyAfterUpdate.clientSecret,
            dlrAddress: infoCompanyAfterUpdate.dlrAddress,
            dlrMTT: infoCompanyAfterUpdate.dlrMTT,
          });

          if (!result) throw new InternalServerErrorException();
        } else {
          const errors = [];

          if (isExistApp.server !== updateCompanyDto.server)
            errors.push({
              property: 'server',
              message: 'Server invalid',
            });

          if (isExistApp.dlrAddress !== updateCompanyDto.dlrAddress)
            errors.push({
              property: 'dlrAddress',
              message: 'DlrAddress invalid',
            });

          if (isExistApp.dlrMTT !== updateCompanyDto.dlrMTT)
            errors.push({
              property: 'dlrMTT',
              message: 'DlrMTT invalid',
            });

          if (errors.length > 0)
            throw new BadRequestException(JSON.stringify(errors));
        }
      }

      await queryRunner.commitTransaction();
    } catch (error) {
      hasError = true;
      this.logger.error(error);
      await queryRunner.rollbackTransaction();

      if (error?.status === 400) errorDatas = JSON.parse(error.message);

      throw new InternalServerErrorException();
    } finally {
      await queryRunner.release();

      if (hasError) {
        if (errorDatas?.length > 0) {
          const errorObject = {
            error: 'Bad Request',
            message: errorDatas,
          };
          throw new InternalServerErrorException(JSON.stringify(errorObject));
        } else throw new InternalServerErrorException();
      }

      const companyFullInfor = await this.companyRepository.findOne(
        updateCompanyDto.id,
        {
          relations: ['signature'],
        },
      );

      return _.omit(companyFullInfor, ['clientId', 'clientSecret', 'password']);
    }
  }

  async updateErrorStatus({ rctConfig, appStatus, appError }) {
    if (appStatus === AppStatus.ERROR) {
      const companies = await this.companyRepository.find({
        where: {
          username: rctConfig.username,
          status: Not(EntityStatus.DELETE),
        },
      });

      for (let i = 0; i < companies.length; i++) {
        const company = companies[i];
        company.appStatus = appStatus;
        company.appError = appError;
        await company.save();
      }

      return companies;
    } else {
      const companies = await this.companyRepository.find({
        where: {
          username: rctConfig.username,
          password: rctConfig.password,
          server: rctConfig.server,
          clientId: rctConfig.clientId,
          clientSecret: rctConfig.clientSecret,
          dlrAddress: rctConfig.dlrAddress,
          dlrMTT: rctConfig.dlrMTT,
          status: Not(EntityStatus.DELETE),
        },
      });

      for (let i = 0; i < companies.length; i++) {
        const company = companies[i];
        company.appStatus = appStatus;
        company.appError = appError;
        await company.save();
      }

      return companies;
    }
  }

  async remove(id: string, user = null) {
    const queryRunner = this.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    const companyDeleted = await this.companyRepository.findOne({
      where: { id, status: Not(EntityStatus.DELETE) },
    });
    if (!companyDeleted) throw new NotFoundException('Not found company');

    try {
      companyDeleted.lastModifiedUserId = user ? user.id : '';
      companyDeleted.status = EntityStatus.DELETE;
      await queryRunner.manager.save(companyDeleted);

      // TODO Kiem tra xem con company nao dung concrete nay nua khong, neu khong co thi remove
      try {
        const isExistApp = await this.companyRepository.findOne({
          where: {
            id: Not(id),
            clientId: companyDeleted.clientId,
            clientSecret: companyDeleted.clientSecret,
            username: companyDeleted.username,
            extension: companyDeleted.extension,
            status: Not(EntityStatus.DELETE),
          },
        });
        if (!isExistApp) {
          const result = await this.ringcentralService.removeConcrete({
            username: companyDeleted.username,
            password: companyDeleted.password,
            extension: companyDeleted.extension,
            server: companyDeleted.server,
            clientId: companyDeleted.clientId,
            clientSecret: companyDeleted.clientSecret,
            dlrAddress: companyDeleted.dlrAddress,
            dlrMTT: companyDeleted.dlrMTT,
          });

          if (!result) throw new InternalServerErrorException();
        }
      } catch (error) {
        throw new InternalServerErrorException();
      }

      await queryRunner.commitTransaction();

      return _.omit(companyDeleted, ['clientId', 'clientSecret', 'password']);
    } catch (error) {
      this.logger.error(error);
      await queryRunner.rollbackTransaction();
      throw new InternalServerErrorException();
    } finally {
      await queryRunner.release();
    }
  }

  async getCompaniesUseSignature(signatureId: string) {
    const companies = await this.companyRepository.find({
      where: {
        signature: signatureId,
        status: Not(EntityStatus.DELETE),
      },
    });

    return companies;
  }

  async getCompanyWithCode(code: string) {
    const company = await this.companyRepository.findOne({
      where: {
        code: code,
        status: Not(EntityStatus.DELETE),
      },
    });

    return company;
  }

  public getLabelsOfCompany(id: string) {
    return this._companyLabelsService.getLabelsOfCompany(id);
  }
}
