import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
  Patch,
  Request,
  ClassSerializerInterceptor,
  UseInterceptors,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { JoiValidationPipe } from 'src/common/pipes/validation-schema.pipe';
import { AuthService } from './auth.service';
import { ChangeConfirmEmailDto } from './dto/change-confirmation.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { SignUpCredentialsDto } from './dto/signup-credentials.dto';
import { SignUpSchema } from './schema/sign-up.schema';
import { ChangeConfirmationEmailSchema } from './schema/change-comfirmation-email.schema';
import { ForgotPasswordSchema } from './schema/forgot-password.schema';
import { ResetPasswordSchema } from './schema/reset-password.schema';
import { ResendEmailDto } from './dto/resend-email.dto';
import { JwtAuthGuard } from './guard/jwt-auth.guard';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { JwtStrategy } from './strategy/jwt.strategy';
import jwt_decode, { InvalidTokenError } from 'jwt-decode';
@Controller('auth')
@UseInterceptors(ClassSerializerInterceptor)
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly jwt: JwtStrategy,
  ) {}

  @Post('/sign-up')
  signUp(
    @Body(new JoiValidationPipe(SignUpSchema)) signUpDto: SignUpCredentialsDto,
  ) {
    return this.authService.signUp(signUpDto);
  }

  @Post('/resend-email') //* resend lai email luc dang ky
  resendEmail(
    @Body(new JoiValidationPipe(ForgotPasswordSchema))
    resendEmailDto: ResendEmailDto,
  ) {
    return this.authService.resendEmail(resendEmailDto);
  }
  @Get('/verify') //* kiem tra thong tin, kich hoat user sau khi dang ky/ quen mat khau
  async verifyAccount(@Query('token') token) {
    if (jwt_decode(token)['exp'] < Date.now() / 1000) {
      throw new InvalidTokenError();
    }
    const user = await this.jwt.validate(jwt_decode(token));
    return this.authService.verifyAccount(user);
  }

  @Patch('/verification/:userId') //* thay doi email khi dang sign up
  updateConfirmationEmail(
    @Body(new JoiValidationPipe(ChangeConfirmationEmailSchema))
    changeConfirmEmailDto: ChangeConfirmEmailDto,
    @Param('userId') userId,
  ) {
    const { email } = changeConfirmEmailDto;
    return this.authService.updateConfirmationEmail(userId, email);
  }

  @Post('/sign-in')
  @UseGuards(AuthGuard('local'))
  @UseGuards(ThrottlerGuard)
  @Throttle(5, 30)
  signIn(@Request() req) {
    return req.user;
  }

  @Post('/forgot-password') //* quen mat khau, muon gui mail de lay link doi mat khau moi
  forgotPassword(
    @Body(new JoiValidationPipe(ForgotPasswordSchema))
    forgotPasswordDto: ForgotPasswordDto,
  ) {
    return this.authService.forgotPassword(forgotPasswordDto);
  }

  @Patch('/reset-password') //*doi mat khau cho user
  async resetPassword(
    @Body(new JoiValidationPipe(ResetPasswordSchema))
    resetPasswordDto: ResetPasswordDto,
  ) {
    if (jwt_decode(resetPasswordDto.accessToken)['exp'] < Date.now() / 1000) {
      throw new InvalidTokenError();
    }
    const user = await this.jwt.validate(
      jwt_decode(resetPasswordDto.accessToken),
    );
    return this.authService.resetPassword(resetPasswordDto, user);
  }

  @Get('/rc-widget')
  public async signInRingCentral() {
    const token = await this.authService.authorize();
    return token;
  }
}
