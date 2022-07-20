import { ConfigModule } from '@nestjs/config';
export default class RedisQueueConfig {
  static getRedisConfig() {
    return {
      redis: {
        host: process.env.RDQ_HOST,
        port: +process.env.RDQ_PORT,
        password: process.env.RDQ_PASSWD,
      },
    };
  }
}
export const redisQueueConfigAsync = {
  imports: [ConfigModule],
  useFactory: async () => RedisQueueConfig.getRedisConfig(),
};
