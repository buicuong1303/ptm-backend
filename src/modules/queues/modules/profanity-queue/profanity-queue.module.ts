import { ProfanityQueueConsumer } from './profanity-queue.consumer';
import { BullModule } from '@nestjs/bull';
import { Module, forwardRef } from '@nestjs/common';
import { ProfanityQueueProducer } from './profanity-queue.producer';
import { ProfanityQueueService } from './profanity-queue.service';
import { AmqpModule } from 'src/modules/services/amqp/amqp.module';
import { SensitivesModule } from 'src/modules/sensitives/sensitives.module';
import { SensitiveDetectsModule } from 'src/modules/sensitive-detects/sensitive-detects.module';
import { OptSuggestionsModule } from 'src/modules/opt-suggestions/opt-suggestions.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Message } from 'src/modules/messages/entity/message.entity';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'profanity-queue',
    }),
    forwardRef(() => AmqpModule),
    TypeOrmModule.forFeature([Message]),
    SensitivesModule,
    SensitiveDetectsModule,
    OptSuggestionsModule,
  ],
  providers: [
    ProfanityQueueProducer,
    ProfanityQueueConsumer,
    ProfanityQueueService,
  ],
  exports: [ProfanityQueueService, BullModule],
})
export class ProfanityQueueModule {}
