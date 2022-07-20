import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { router as BullBoardUI } from 'bull-board';

async function bootstrap() {
  const logger = new Logger('bootstrap');
  const port = process.env.PORT;
  logger.log(`Application run on port: ${port}`);

  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.setGlobalPrefix(`${process.env.PREFIX_PATH}`);

  //* use middleware
  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe({ transform: true }));
  //* CORS
  app.enableCors();

  //* static access
  app.useStaticAssets(join(__dirname, '..', 'public'), { prefix: '/public/' });

  //* bull queue monitoring
  app.use('/queues/monitoring-ui', BullBoardUI);

  await app.listen(port);
}
bootstrap();
