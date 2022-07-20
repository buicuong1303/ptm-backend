import { Module } from '@nestjs/common';
import { AuthZModule, AUTHZ_ENFORCER } from 'nest-authz';
import { RolesController } from './roles.controller';
import { RolesService } from './roles.service';
import * as casbin from 'casbin';
import { ConfigCasbinModule } from '../config-casbin/config-casbin.module';
import { ConfigCasbinService } from '../config-casbin/config-casbin.service';
import { RedisWatcher } from '@casbin/redis-watcher';
@Module({
  imports: [
    ConfigCasbinModule,
    AuthZModule.register({
      imports: [ConfigCasbinModule],
      enforcerProvider: {
        provide: AUTHZ_ENFORCER,
        useFactory: async (configSrv: ConfigCasbinService) => {
          const config = await configSrv.getAuthConfig();
          const enforce = async () => {
            //* Initialize the watcher
            // const watcher = await RedisWatcher.newWatcher({
            //   host: process.env.RDC_HOST,
            //   port: +process.env.RDC_PORT,
            //   password: process.env.RDC_PASSWD,
            //   db: 2,
            // });

            //* Initialize the enforcer
            const enforcer = await casbin.newEnforcer(
              config.model,
              config.policy,
            );
            // (await enforcer).setWatcher(watcher);
            return enforcer;
          };
          return await enforce();
        },
        inject: [ConfigCasbinService],
      },

      usernameFromContext: (ctx) => {
        const request = ctx.switchToHttp().getRequest();
        return request.user.id;
      },
    }),
  ],
  controllers: [RolesController],
  providers: [RolesService],
  exports: [RolesService],
})
export class RolesModule {}
