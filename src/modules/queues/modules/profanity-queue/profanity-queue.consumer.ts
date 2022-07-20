import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Job } from 'bullmq';
import { MessageDirection } from 'src/common/constant/message-direction';
import { OptStatus } from 'src/common/constant/opt-status';
import { Message } from 'src/modules/messages/entity/message.entity';
import { SensitiveDetectsService } from 'src/modules/sensitive-detects/sensitive-detects.service';
import { SensitivesService } from 'src/modules/sensitives/sensitives.service';
import { AnalyzerService } from 'src/modules/services/amqp/services/analyzer.service';
import { Repository } from 'typeorm';

@Processor('profanity-queue')
export class ProfanityQueueConsumer {
  private logger: Logger = new Logger(ProfanityQueueConsumer.name);

  constructor(
    private readonly analyzerService: AnalyzerService,
    private readonly sensitiveService: SensitivesService,
    private readonly sensitiveDetectService: SensitiveDetectsService,
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
  ) {}

  @Process({ name: 'detect-profanity', concurrency: 1 })
  async detectProfanity(job: Job<any>, done: any) {
    //* internal detect
    const infoMessage = await this.messageRepository.findOne(
      job.data.message.id,
    );
    if (!infoMessage) done(new Error('Not found message'));

    try {
      const isSensitive = await this.sensitiveService.detectSensitiveWord(
        job.data.message.text,
        job.data.message.direction,
      );

      if (isSensitive) {
        if (job.data.message.direction === MessageDirection.OUTBOUND) {
          this.sensitiveDetectService.createSensitiveDetect(
            {
              messageId: job.data.message.id,
              reason: 'Sensitive word matching',
            },
            null,
          );
        } else {
          this.sensitiveDetectService.detectOptOut({
            id: job.data.message.id,
            rate: 1,
            text: job.data.message.text,
            optStatus: OptStatus.OUT,
          });
        }
      } else {
        await this.analyzerService.detectSensitive(job.data.message);
      }
      done();
    } catch (ex) {
      this.logger.error(ex);

      done(new Error('Detect sensitive error'));
    }
  }
}
