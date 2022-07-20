import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtPayLoad } from '../interface/jwt-payload.interface';
import { UserRepository } from 'src/modules/users/repository/user.repository';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityStatus } from 'src/common/constant/entity-status';
import { Not } from 'typeorm';

@Injectable()
export class JwtStrategy extends PassportStrategy(
  Strategy,
  'jwt-auth-strategy',
) {
  constructor(
    @InjectRepository(UserRepository)
    private userRepository: UserRepository,
  ) {
    super({
      // jwtFromRequest: ExtractJwt.fromExtractors([(request: Request) => {
      //   return request?.cookies?.Authentication;
      // }]),
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET,
      ignoreExpiration: false,
    });
  }

  async validate(payload: JwtPayLoad): Promise<any> {
    const { id } = payload;
    const user = await this.userRepository.findOne({
      where: {
        id: id,
        status: Not(EntityStatus.DELETE),
      },
    });

    if (!user) {
      throw new UnauthorizedException();
    }

    return user;
  }
}
