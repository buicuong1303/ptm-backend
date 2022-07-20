import { Injectable } from '@nestjs/common';
import TypeORMAdapter from 'typeorm-adapter';

@Injectable()
export class ConfigCasbinService {
  async getAuthConfig() {
    const policyCasbin = await TypeORMAdapter.newAdapter({
      name: 'casbin',
      type: 'postgres',
      host: process.env.POSTGRES_HOST,
      port: +process.env.POSTGRES_PORT,
      username: process.env.POSTGRES_USER,
      password: process.env.POSTGRES_PASSWORD,
      database: process.env.POSTGRES_DB,
    });
    return new Promise<{ model: string; policy: any }>((resolve, reject) => {
      setTimeout(() => {
        return resolve({
          model: __dirname + '/../../common/casbin-model/model.conf',
          policy: policyCasbin,
        });
      }, 200);
    });
  }
}
