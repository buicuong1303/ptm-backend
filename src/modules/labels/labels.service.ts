import { Connection, getManager } from 'typeorm';
import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateLabelDto } from './dto/create-label.dto';
import { LabelRepository } from './repository/label.repository';
import { Label } from './entity/label.entity';
import { CompanyRepository } from '../companies/repository/company.repository';
import { CompanyLabel } from '../company-labels/entity/company-label.entity';
import { EntityStatus } from 'src/common/constant/entity-status';
import { UpdateLabelDto } from './dto/update-label.dto';
import { User } from '../users/entity/user.entity';
@Injectable()
export class LabelsService {
  constructor(
    @InjectRepository(CompanyRepository)
    private readonly _companyRepository: CompanyRepository,
    @InjectRepository(LabelRepository)
    private readonly _labelRepository: LabelRepository,
    private readonly _connection: Connection,
  ) {}
  async createLabel(createLabelDto: CreateLabelDto, user: User) {
    const queryRunner = this._connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const newLabel = new Label();
      newLabel.bgColor = createLabelDto.bgColor;
      newLabel.title = createLabelDto.title;
      newLabel.description = createLabelDto.description;
      newLabel.creationUserId = user.id;
      newLabel.lastModifiedUserId = user.id;
      const newLabelAfterCreated = await queryRunner.manager.save(newLabel);
      const assignLabelToCompanyPromise = createLabelDto.companies.map(
        async (item) => {
          const infoCompany = await this._companyRepository.findOne(item.value);
          if (!infoCompany) throw new NotFoundException('Company is not exist');
          const newCompanyLabel = new CompanyLabel();
          newCompanyLabel.label = newLabelAfterCreated;
          newCompanyLabel.company = infoCompany;
          return queryRunner.manager.save(newCompanyLabel);
        },
      );
      await Promise.all(assignLabelToCompanyPromise);
      await queryRunner.commitTransaction();
      return newLabelAfterCreated;
    } catch (error) {
      console.log(error);
      await queryRunner.rollbackTransaction();
      throw new InternalServerErrorException();
    } finally {
      await queryRunner.release();
    }
  }

  async getLabels() {
    try {
      const data = await getManager()
        .createQueryBuilder(Label, 'label')
        .select([
          'label.id',
          'label.title',
          'label.bgColor',
          'label.description',
        ])
        .orderBy('label.title')
        .addSelect(['company.id', 'companiesOfLabel.id', 'company.name'])
        .leftJoin('label.companiesOfLabel', 'companiesOfLabel')
        .leftJoin('companiesOfLabel.company', 'company')
        .andWhere('label.status = :status', { status: EntityStatus.ACTIVE })
        .getMany();
      return data;
    } catch (error) {
      throw new InternalServerErrorException();
    }
  }

  async getLabel(id) {
    try {
      const data = await getManager()
        .createQueryBuilder(Label, 'label')
        .select([
          'label.id',
          'label.title',
          'label.bgColor',
          'label.description',
        ])
        .addSelect(['company.id', 'companiesOfLabel.id', 'company.name'])
        .leftJoin('label.companiesOfLabel', 'companiesOfLabel')
        .leftJoin('companiesOfLabel.company', 'company')
        .andWhere('label.id = :id', { id })
        .andWhere('label.status = :status', { status: EntityStatus.ACTIVE })
        .getOne();
      return data;
    } catch (error) {
      throw new InternalServerErrorException();
    }
  }
  async updateLabel(id, updateLabelDto: UpdateLabelDto, user: User) {
    const infoLabel = await this._labelRepository.findOne({
      where: {
        id: id,
      },
      relations: ['companiesOfLabel'],
    });
    if (!infoLabel) throw new NotFoundException('Label is not exist');

    const queryRunner = this._connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    infoLabel.title = updateLabelDto.title;
    infoLabel.description = updateLabelDto.description;
    infoLabel.bgColor = updateLabelDto.bgColor;
    infoLabel.lastModifiedUserId = user.id;
    await queryRunner.manager.save(infoLabel);

    const newCompanies = [];
    const oldCompanies = [];
    updateLabelDto.companies.forEach((item) => {
      if (item.id === undefined) newCompanies.push(item);
      else oldCompanies.push(item);
    });
    const removeCompanies = infoLabel.companiesOfLabel.filter(
      (currentCompany) =>
        oldCompanies.findIndex((item) => item.id === currentCompany.id) === -1,
    );

    try {
      if (newCompanies.length > 0) {
        const assignLabelToCompanyPromise = newCompanies.map(async (item) => {
          const infoCompany = await this._companyRepository.findOne(item.value);
          if (!infoCompany) throw new NotFoundException('Company is not exist');
          const newCompanyLabel = new CompanyLabel();
          newCompanyLabel.label = infoLabel;
          newCompanyLabel.company = infoCompany;
          return queryRunner.manager.save(newCompanyLabel);
        });
        await Promise.all(assignLabelToCompanyPromise);
      }
      if (removeCompanies.length > 0) {
        await queryRunner.manager
          .createQueryBuilder()
          .delete()
          .from(CompanyLabel)
          .where('id IN (:...ids)', {
            ids: removeCompanies.map((item) => item.id),
          })
          .execute();
      }
      await queryRunner.commitTransaction();
    } catch (error) {
      console.log(error);
      await queryRunner.rollbackTransaction();
      throw new InternalServerErrorException();
    } finally {
      await queryRunner.release();
    }
  }

  async deleteLabel(id) {
    const infoLabel = await this._labelRepository.findOne({
      where: {
        id: id,
        status: EntityStatus.ACTIVE,
      },
    });
    if (!infoLabel) throw new NotFoundException('Label is not exist');
    infoLabel.status = EntityStatus.DELETE;
    return await infoLabel.save();
  }

  public async getLabelsWithIds(ids: string[]) {
    try {
      const labels =
        ids?.length > 0
          ? await getManager()
              .createQueryBuilder(Label, 'label')
              .where('label.id IN (:...labelIds)', { labelIds: ids })
              .orderBy('label.title')
              .andWhere('label.status = :status', {
                status: EntityStatus.ACTIVE,
              })
              .getMany()
          : [];
      return labels;
    } catch (error) {
      return [];
    }
  }
}
