import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AmqpModule } from '../services/amqp/amqp.module';
import { SensitivesRepository } from './repository/sensitives.repository';
import { SensitivesController } from './sensitives.controller';
import { SensitivesService } from './sensitives.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([SensitivesRepository]),
    forwardRef(() => AmqpModule),
  ],
  controllers: [SensitivesController],
  providers: [SensitivesService],
  exports: [SensitivesService],
})
export class SensitivesModule {}
