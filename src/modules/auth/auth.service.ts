import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/modules/users/entity/user.entity';
import { UserRepository } from 'src/modules/users/repository/user.repository';
import { SignUpCredentialsDto } from './dto/signup-credentials.dto';
import * as bcrypt from 'bcrypt';
import * as _ from 'lodash';
import { EmailQueueService } from 'src/modules/queues/modules/email-queue/email-queue.service';
import { EntityStatus } from 'src/common/constant/entity-status';
import { JwtService } from '@nestjs/jwt';
import { JwtPayLoad } from './interface/jwt-payload.interface';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ResendEmailDto } from './dto/resend-email.dto';
import { getManager } from 'typeorm';
import { RingcentralService } from '../services/amqp/services/ringcentral.service';
import { ModuleRef } from '@nestjs/core';
@Injectable()
export class AuthService {
  private rcService: RingcentralService;
  constructor(
    private readonly emailService: EmailQueueService,
    private jwtService: JwtService,
    @InjectRepository(UserRepository)
    private readonly userRepository: UserRepository,
    private moduleRef: ModuleRef,
  ) {
    this.rcService = this.moduleRef.get(RingcentralService, { strict: false });
  }
  async signUp(signUpDto: SignUpCredentialsDto): Promise<any> {
    const { username, email, password } = signUpDto;
    const isExistUser = await getManager()
      .createQueryBuilder(User, 'user')
      .where('user.username = :username OR user.email = :email', {
        username,
        email,
      })
      .andWhere('user.status = :status', { status: EntityStatus.ACTIVE })
      .getOne();
    if (isExistUser)
      throw new ConflictException('Username or email already exist');

    try {
      const newUser = await _.assign(new User(), signUpDto);
      const salt = await bcrypt.genSalt();

      newUser.password = await bcrypt.hash(password, salt);
      const infoUser = await newUser.save();
      const payload: JwtPayLoad = {
        id: infoUser.id,
        name: infoUser.firstName,
      };
      const token = await this.jwtService.sign(payload, {
        expiresIn: process.env.JWT_EXPIRES_IN,
      });

      this.emailService.sendConfirmationEmail({
        subject: 'Verify account',
        email,
        username: infoUser.username,
        token: token,
        template: 'verify-account',
      });
      return {
        error: false,
        status: 'success',
        data: email,
      };
    } catch (error) {
      throw new Error('Can not create user');
    }
  }

  //? handle logic or delete
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async updateConfirmationEmail(userId: string, email: string): Promise<any> {
    // const isExistEmail = await this.userRepository.findOne({
    //   where: {
    //     email: email,
    //   },
    // });
    // if (isExistEmail) throw new ConflictException('Email already exist');
    // const infoUser = await this.userRepository.findOne({
    //   where: {
    //     id: userId,
    //     verify: Not(IsNull()),
    //   },
    // });
    // if (!infoUser) throw new NotFoundException('Not found user');
    // try {
    //   const salt = await bcrypt.genSalt();
    //   const rand = rds.generate({
    //     length: 12,
    //     charset: 'alphabetic',
    //   });
    //   const challenge = await bcrypt.hash(rand, salt);
    //   infoUser.verify = challenge;
    //   infoUser.email = email;
    //   const userUpdated = await infoUser.save();
    //   this.emailService.sendConfirmationEmail({
    //     subject: 'Verify account',
    //     email: userUpdated.email,
    //     username: infoUser.username,
    //     userId: infoUser.id,
    //     challenge: rand,
    //     template: 'verify-account',
    //   });
    // } catch (error) {
    //   throw new Error('Can not update email');
    // }
  }

  async resendEmail(resendEmailDto: ResendEmailDto): Promise<any> {
    try {
      const { email } = resendEmailDto;
      const infoUser = await this.userRepository.findOne({
        where: {
          email: resendEmailDto.email,
        },
      });
      if (!infoUser) throw new NotFoundException('Not found user');

      const payload: JwtPayLoad = {
        id: infoUser.id,
        name: infoUser.firstName,
      };

      const token = await this.jwtService.sign(payload, {
        expiresIn: process.env.JWT_EXPIRES_IN,
      });

      this.emailService.sendConfirmationEmail({
        subject: 'Verify account',
        email,
        username: infoUser.username,
        token: token,
        template: 'verify-account',
      });
    } catch (error) {
      console.log(error);
      throw new InternalServerErrorException();
    }
  }

  async verifyAccount(user: User): Promise<any> {
    if (user.status == EntityStatus.INACTIVE) {
      user.status = EntityStatus.ACTIVE;
      await user.save();
    }
    return {
      error: false,
      status: 'success',
    };
  }

  async signIn({ username, password }): Promise<any> {
    const infoUser = await this.userRepository.findOne({
      select: ['password', 'id'],
      where: {
        username: username,
        status: EntityStatus.ACTIVE,
      },
    });
    if (!infoUser)
      throw new BadRequestException('User name or password incorrect');
    const isMatch = await bcrypt.compare(password, infoUser.password);
    if (!isMatch)
      throw new BadRequestException('User name or password incorrect');

    try {
      const payload: JwtPayLoad = {
        id: infoUser.id,
        name: infoUser.firstName,
      };

      const token = await this.jwtService.sign(payload, {
        expiresIn: process.env.JWT_EXPIRES_IN,
      });

      return {
        error: false,
        status: 'success',
        data: {
          token: token,
        },
      };
    } catch (error) {
      throw new InternalServerErrorException('User name or password incorrect');
    }
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto): Promise<any> {
    const { email } = forgotPasswordDto;
    const infoUser = await this.userRepository.findOne({
      where: {
        email: email,
      },
    });
    if (!infoUser) throw new NotFoundException('Not found email');
    try {
      const payload: JwtPayLoad = {
        id: infoUser.id,
        name: infoUser.firstName,
      };
      const token = await this.jwtService.sign(payload, {
        expiresIn: process.env.JWT_EXPIRES_RESET_PASSWORD_IN,
      });
      this.emailService.sendResetPasswordEmail({
        subject: 'Reset password',
        email,
        username: infoUser.username,
        userId: infoUser.id,
        token: token,
        template: 'reset-password',
      });
      return {
        error: false,
        status: 'success',
        data: email,
      };
    } catch (error) {
      console.log(error);
      throw new InternalServerErrorException();
    }
  }

  async resetPassword(
    provideNewPassword: ResetPasswordDto,
    user: User,
  ): Promise<any> {
    const salt = await bcrypt.genSalt();
    user.password = await bcrypt.hash(provideNewPassword.newPassword, salt);
    try {
      return user.save();
    } catch (error) {
      throw new UnauthorizedException();
    }
  }

  public async authorize() {
    return this.rcService.signInRingCentral();
  }
}
