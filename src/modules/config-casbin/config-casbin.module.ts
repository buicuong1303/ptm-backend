import { Module } from '@nestjs/common';
import { ConfigCasbinService } from './config-casbin.service';

@Module({
  imports: [],
  controllers: [],
  providers: [ConfigCasbinService],
  exports: [ConfigCasbinService],
})
export class ConfigCasbinModule {}
