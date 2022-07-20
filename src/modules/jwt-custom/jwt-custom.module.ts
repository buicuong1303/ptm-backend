import { JwtModule } from '@nestjs/jwt';
import { Module, Global } from '@nestjs/common';
import { JwtCustomService } from './jwt-custom.service';

@Global()
@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET,
    }),
  ],
  providers: [JwtCustomService],
  exports: [JwtCustomService],
})
export class JwtCustomModule {}
