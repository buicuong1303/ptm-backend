import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Connection, getManager, Not, Raw } from 'typeorm';
import { UserRepository } from './repository/user.repository';
import * as rds from 'randomstring';
import * as bcrypt from 'bcrypt';
import { EmailQueueService } from 'src/modules/queues/modules/email-queue/email-queue.service';
import { EntityStatus } from 'src/common/constant/entity-status';
import { AddUserDto } from './dto/add-user.dto';
import * as _ from 'lodash';
import { User } from './entity/user.entity';
import { PermissionsService } from '../permissions/permissions.service';
import { RolesService } from '../roles/roles.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CompanyUsersService } from '../company-users/company-users.service';
import { CompaniesService } from '../companies/companies.service';
import { v4 as uuid } from 'uuid';
import { AwsS3Service } from '../services/http/aws-s3/aws-s3.service';
import { AwsS3PresignedMethod } from '../../common/constant/aws-s3-presigned-method';
import { UpdateSettingDto } from './dto/update-setting.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly emailService: EmailQueueService,
    private readonly permissionService: PermissionsService,
    private readonly rolesService: RolesService,
    private readonly companyUsersService: CompanyUsersService,
    private readonly companiesService: CompaniesService,
    private readonly _awsS3: AwsS3Service,
    private readonly connection: Connection,
    @InjectRepository(UserRepository)
    private readonly userRepository: UserRepository,
    private readonly roleService: RolesService,
  ) {}
  private readonly logger = new Logger(UsersService.name);
  async getProfile(user: any): Promise<any> {
    const infoUser = await this.userRepository.findOne({
      where: {
        id: user.id,
        status: EntityStatus.ACTIVE,
      },
    });
    const roles = await this.roleService.getRoleOfUser(user.id);
    if (!infoUser) throw new NotFoundException('Not found user');
    return {
      ...infoUser,
      roles,
    };
  }

  async updateProfile(updateProfileDto: any, user = null): Promise<any> {
    const userUpdateProfile = await this.userRepository.findOne({
      where: {
        id: updateProfileDto.id,
        status: EntityStatus.ACTIVE,
      },
    });
    if (!userUpdateProfile) throw new NotFoundException('Not found user');

    const isExistEmail = await this.userRepository.findOne({
      where: {
        id: Not(updateProfileDto.id),
        email: Raw(
          (email) =>
            `UPPER(${email}) = '${updateProfileDto.email.toUpperCase()}'`,
        ),
        status: Not(EntityStatus.DELETE),
      },
    });
    if (isExistEmail) throw new ConflictException('Email address early exist');

    try {
      userUpdateProfile.firstName = updateProfileDto.firstName;
      userUpdateProfile.lastName = updateProfileDto.lastName;
      userUpdateProfile.email = updateProfileDto.email;
      userUpdateProfile.gender = updateProfileDto.gender;
      userUpdateProfile.lastModifiedUserId = user ? user.id : '';
      await userUpdateProfile.save();

      return userUpdateProfile;
    } catch (error) {
      throw new InternalServerErrorException();
    }
  }

  public async avatarSignedUrl(fileInfo: any) {
    try {
      const key = `${process.env.AWS_S3_PATH_AVATAR}/${uuid()}/${
        fileInfo.fileName
      }`;

      const urlUpload = await this._awsS3.getSignedUrl(
        key,
        AwsS3PresignedMethod.PUT,
        fileInfo.type,
      );

      const urlAvatar = urlUpload.split('?')[0];

      return { urlUpload, urlAvatar };
    } catch (error) {
      throw new InternalServerErrorException();
    }
  }

  public async updateAvatar(currentUser: any, updateAvatarDto: any) {
    const user = await this.userRepository.findOne({
      where: {
        id: currentUser.id,
        status: EntityStatus.ACTIVE,
      },
    });
    if (!user) throw new NotFoundException('Not found user');

    try {
      user.avatar = updateAvatarDto.avatar;

      return await user.save();
    } catch (error) {
      throw new InternalServerErrorException();
    }
  }

  async addUser(addUserDto: AddUserDto, user = null): Promise<any> {
    const queryRunner = this.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    const { username, email, companies } = addUserDto;

    //* check exist user
    const isExistUser = await this.userRepository.findOne({
      where: [
        {
          username,
        },
        {
          email,
        },
      ],
    });
    if (isExistUser)
      throw new ConflictException('Username or email already exist');
    try {
      //* check valid companies
      const infoCompanies = await this.companiesService.getInfoCompaniesActive(
        companies,
      );
      if (infoCompanies.length < companies.length)
        throw new NotFoundException('Not found company');

      //* create random password
      const salt = await bcrypt.genSalt();
      const randomPassword = rds.generate({
        length: 12,
        charset: 'alphabetic',
      });

      //* create new user
      const newUser = _.assign(new User(), addUserDto);
      newUser.initialPassword = randomPassword;
      newUser.password = await bcrypt.hash(randomPassword, salt);
      newUser.creationUserId = user ? user.id : '';
      const infoUser = await queryRunner.manager.save(newUser);

      //* update Permissions
      await this.permissionService.updatePermissionOfUser({
        user: infoUser.id,
        listPermissionDelete: addUserDto.permissionDeletes,
        listPermissionAdd: addUserDto.permissions,
      });

      //* update Roles
      await this.rolesService.updateRoleOfUser({
        user: infoUser.id,
        listRoleAdd: addUserDto.roles,
        listRoleDelete: addUserDto.roleDeletes,
      });

      //* add user to companies
      await this.companyUsersService.createCompanyUsers(
        {
          user: infoUser,
          companies: infoCompanies,
        },
        user,
        queryRunner.manager,
      );
      await queryRunner.commitTransaction();

      //* return full information
      return { ...infoUser };
    } catch (error) {
      this.logger.error(error);
      await queryRunner.rollbackTransaction();
      console.log(error);
      throw new InternalServerErrorException();
    } finally {
      await queryRunner.release();
    }
  }

  async getUser(userId: string): Promise<any> {
    const user = await this.userRepository.findOne({
      where: {
        id: userId,
        status: Not(EntityStatus.DELETE),
      },
    });
    if (!user) throw new NotFoundException('Not found user');

    return user;
  }

  async getUsers(): Promise<any> {
    try {
      const users = await getManager()
        .createQueryBuilder(User, 'user')
        .where('user.status != :status', {
          status: EntityStatus.DELETE,
        })
        .orderBy('user.firstName')
        // .leftJoinAndSelect('user.companiesOfUser', 'companyUser')
        .getMany();

      const listUser = users.map(async (item) => {
        const listPermission = await this.permissionService.getPermissionOfUser(
          item.id,
        );
        const listRole = await this.rolesService.getRoleOfUser(item.id);

        const companies = await this.companyUsersService.getCompaniesOfUser(
          item.id,
        );
        const data = _.assign(item, {
          permission: listPermission,
          role: listRole,
          companyUsers: companies,
        });

        return data;
      });
      const dataUsers = await Promise.all(listUser);
      return dataUsers;
    } catch (error) {
      throw new InternalServerErrorException();
    }
  }

  async deleteUser(userId: string, user = null): Promise<any> {
    const infoUser = await this.userRepository.findOne({ id: userId });
    if (!infoUser) throw new NotFoundException('Not found user');

    try {
      infoUser.status = EntityStatus.DELETE;
      infoUser.lastModifiedUserId = user ? user.id : '';
      await this.permissionService.deleteAllPermissionInUser(userId);
      await this.rolesService.deleteAllRoleInUser(userId);

      return await infoUser.save();
    } catch (error) {
      throw new InternalServerErrorException();
    }
  }

  //TODO need add transaction and use promise all
  async updateUser(userId: string, data: any): Promise<any> {
    const queryRunner = this.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const user = await this.userRepository.findOne({
        where: {
          id: userId,
          status: Not(EntityStatus.DELETE),
        },
      });
      if (!user) throw new NotFoundException('Not found user');

      const infoCompanies = await this.companiesService.getInfoCompanies([
        ...data.companyToDelete,
        ...data.companyToAdd,
      ]);
      if (
        infoCompanies.length <
        [...data.companyToDelete, ...data.companyToAdd].length
      ) {
        throw new NotFoundException('Not found company');
      }

      await this.permissionService.updatePermissionOfUser({
        user: userId,
        listPermissionDelete: data.permissionDelete,
        listPermissionAdd: data.permission,
      });

      await this.rolesService.updateRoleOfUser({
        user: userId,
        listRoleAdd: data.role,
        listRoleDelete: data.roleDelete,
      });

      await this.companyUsersService.updateCompanyUser(
        user,
        {
          companyToAdd: data.companyToAdd,
          companyToDelete: data.companyToDelete,
        },
        null,
        queryRunner.manager,
      );

      const dataUpdate = _.assign(user, data);
      await queryRunner.manager.save(dataUpdate);
      await queryRunner.commitTransaction();
      // await dataUpdate.save();

      return 'done';
    } catch (error) {
      console.log(error);
      await queryRunner.rollbackTransaction();
      throw new InternalServerErrorException();
    } finally {
      await queryRunner.release();
    }
  }

  async changePassword(
    user: User,
    changePasswordDto: ChangePasswordDto,
  ): Promise<any> {
    const { currentPassword, newPassword } = changePasswordDto;

    const infoUser = await this.userRepository.findOne({
      select: ['password'],
      where: {
        id: user.id,
      },
    });

    const isMatch = await bcrypt.compare(currentPassword, infoUser.password);

    if (isMatch) {
      const salt = await bcrypt.genSalt();
      user.password = await bcrypt.hash(newPassword, salt);
      return await user.save();
    }

    throw new BadRequestException('Current password incorrect');
  }

  public async getAvatarSignedUrl(fileInfo: any): Promise<string> {
    try {
      const key = `${process.env.AWS_S3_PATH_AVATAR}/${uuid()}/${
        fileInfo.fileName
      }`;

      return this._awsS3.getSignedUrl(
        key,
        AwsS3PresignedMethod.PUT,
        fileInfo.type,
      );
    } catch (error) {
      throw new InternalServerErrorException();
    }
  }

  async getCompaniesOfUser(userId: any): Promise<any> {
    try {
      const CompaniesOfUser = await this.companyUsersService.getCompaniesOfUser(
        userId,
      );
      return CompaniesOfUser;
    } catch (error) {
      throw new InternalServerErrorException();
    }
  }

  async updateUserOnlineStatus(user: any): Promise<any> {
    const userUpdate = await this.userRepository.findOne({
      where: {
        id: user.id,
        status: EntityStatus.ACTIVE,
      },
    });
    if (!userUpdate) throw new NotFoundException('Not found user');

    try {
      userUpdate.onlineStatus = user.onlineStatus;
      userUpdate.lastActivity = user.lastActivity;
      await userUpdate.save();

      return _.pick(userUpdate, [
        'id',
        'firstName',
        'lastName',
        'avatar',
        'onlineStatus',
        'lastActivity',
        'email',
        'gender',
        'status',
      ]);
    } catch (error) {
      throw new InternalServerErrorException();
    }
  }

  async getFullInformation(): Promise<any> {
    try {
      const userInfo = await this.getUsers();
      const permissions = await this.permissionService.getAllPermission();
      const roles = await this.rolesService.getAllRole();
      return {
        users: userInfo,
        permissions: permissions,
        roles: roles,
      };
    } catch (err) {
      console.log(err);
      throw new NotFoundException('Not found user');
    }
  }

  async updateSetting(updateSetting: UpdateSettingDto, user): Promise<any> {
    try {
      const userUpdate = await this.userRepository.findOne({
        where: {
          id: user.id,
          status: EntityStatus.ACTIVE,
        },
      });
      if (typeof updateSetting.allowDesktopNotification == 'boolean')
        userUpdate.allowDesktopNotification =
          updateSetting.allowDesktopNotification;
      if (typeof updateSetting.allowSoundNotification == 'boolean') {
        userUpdate.allowSoundNotification =
          updateSetting.allowSoundNotification;
      }
      return await userUpdate.save();
    } catch (error) {
      console.log(error);
    }
  }
}
