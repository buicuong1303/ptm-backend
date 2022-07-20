import {
  ConflictException,
  forwardRef,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { AddSignaturesDto } from './dto/add-signatures.dto';
import * as _ from 'lodash';
import { Signature } from './entity/signature.entity';
import { UpdateSignaturesDto } from './dto/update-signature.dto';
import { SignatureRepository } from './repository/signatures.repository';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityStatus } from 'src/common/constant/entity-status';
import { getManager, Not } from 'typeorm';
import { CompaniesService } from '../companies/companies.service';

@Injectable()
export class SignaturesService {
  constructor(
    @InjectRepository(SignatureRepository)
    private signatureRepository: SignatureRepository,

    @Inject(forwardRef(() => CompaniesService))
    private readonly companiesService: CompaniesService,
  ) {}

  //* Create Signature
  async createSignatures(addSignaturesDto: AddSignaturesDto, user = null) {
    const signatureExisted = await this.signatureRepository.findOne({
      where: [
        { name: addSignaturesDto.name, status: Not(EntityStatus.DELETE) },
      ],
    });
    if (signatureExisted)
      throw new ConflictException('Name or key already exists');

    try {
      const signatureCreate = _.assign(new Signature(), addSignaturesDto);
      signatureCreate.creationUserId = user ? user.id : '';
      await signatureCreate.save();

      return signatureCreate;
    } catch (error) {
      throw new InternalServerErrorException();
    }
  }

  //* Get all Signatures
  async getAllSignature() {
    const query = getManager().createQueryBuilder(Signature, 'signature');
    query.andWhere(`status != :status`, { status: EntityStatus.DELETE });
    query.addOrderBy('signature.creationTime', 'DESC');

    try {
      return query.getMany();
    } catch (error) {
      throw error;
    }
  }
  async getAllSignatureActive() {
    const query = getManager().createQueryBuilder(Signature, 'signature');
    query.andWhere(`status = :status`, { status: EntityStatus.ACTIVE });
    query.addOrderBy('signature.creationTime', 'DESC');

    try {
      return query.getMany();
    } catch (error) {
      throw error;
    }
  }

  //* Get Signature by Id
  async getSignatureById(id: string) {
    const signature = await this.signatureRepository.findOne({
      where: {
        id: id,
        status: Not(EntityStatus.DELETE),
      },
    });
    if (!signature) throw new NotFoundException('Not found Signature');

    try {
      return signature;
    } catch (error) {
      throw error;
    }
  }

  //* Update Signature
  async updateSignature(
    id: string,
    updateSignatureDto: UpdateSignaturesDto,
    user = null,
  ) {
    const signature = await this.signatureRepository.findOne({
      where: {
        id: id,
        status: Not(EntityStatus.DELETE),
      },
    });
    if (!signature) throw new NotFoundException('Not found Signature');

    const signatureExisted = await this.signatureRepository.findOne({
      where: [
        {
          id: Not(id),
          name: updateSignatureDto.name,
          status: Not(EntityStatus.DELETE),
        },
      ],
    });
    if (signatureExisted)
      throw new ConflictException('Signature already exists');

    try {
      const signatureUpdate = _.assign(signature, updateSignatureDto);
      signatureUpdate.lastModifiedUserId = user ? user.id : '';
      signatureUpdate.save();

      return signatureUpdate;
    } catch (error) {
      throw new InternalServerErrorException();
    }
  }

  //* Delete Signature
  async deleteSignature(id: string, user = null) {
    const signature = await this.signatureRepository.findOne({
      where: {
        id: id,
        status: Not(EntityStatus.DELETE),
      },
    });
    if (!signature) throw new NotFoundException('Not found Signature');

    const signatureInCompany =
      await this.companiesService.getCompaniesUseSignature(id);
    if (signatureInCompany.length > 0)
      throw new ConflictException('Signature is being used for company');

    try {
      signature.status = EntityStatus.DELETE;
      signature.lastModifiedUserId = user ? user.id : '';
      signature.save();

      return signature;
    } catch (error) {
      throw error;
    }
  }
}
