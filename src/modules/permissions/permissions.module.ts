import { Module } from '@nestjs/common';
import { RolesModule } from '../roles/roles.module';
import { PermissionsController } from './permissions.controller';
import { PermissionsService } from './permissions.service';
@Module({
  imports: [RolesModule],
  controllers: [PermissionsController],
  providers: [PermissionsService],
  exports: [PermissionsService],
})
export class PermissionsModule {}
