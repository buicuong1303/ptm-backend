import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { MessageEsIndex } from 'src/modules/es-search/es-index/message.es.index';

@Processor('es-search-queue')
export class EsSearchQueueConsumer {
  private logger: Logger = new Logger(EsSearchQueueConsumer.name);
  constructor(private readonly _messageEsIndex: MessageEsIndex) {}

  @Process({ name: 'insert-message-document', concurrency: 1 })
  async insertMessageDocument(job: Job<any>, done: any) {
    const { message } = job.data;

    try {
      await this._messageEsIndex.insertMessageDocument(message);
      done();
    } catch (ex) {
      this.logger.error(ex);
      done(new Error('Insert Document Error'));
    }
  }

  @Process({ name: 'update-message-document', concurrency: 0 })
  async updateMessageDocument(job: Job<any>, done: any) {
    const { message } = job.data;

    try {
      await this._messageEsIndex.updateMessageDocument(message);
      done();
    } catch (ex) {
      this.logger.error(ex);
      done(new Error('Update Document Error'));
    }
  }
}
