import { JwtService } from '@nestjs/jwt';
import { Injectable } from '@nestjs/common';

@Injectable()
export class JwtCustomService {
  constructor(private readonly jwtService: JwtService) {}

  decode(token: string): any {
    return this.jwtService.decode(token);
  }

  verify(token: string) {
    return this.jwtService.verify(token);
  }
}
