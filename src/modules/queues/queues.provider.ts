import { InjectQueue } from '@nestjs/bull';
import { Injectable } from '@nestjs/common';
import { setQueues, BullMQAdapter } from 'bull-board';
import { Queue as QueueMQ } from 'bullmq';

@Injectable()
export class QueuesProvider {
  constructor(
    @InjectQueue('log-activity-queue')
    private readonly logActivityQueue: QueueMQ,
    @InjectQueue('email-queue')
    private readonly emailQueue: QueueMQ,
    @InjectQueue('es-search-queue')
    private readonly esSearchQueue: QueueMQ,
    @InjectQueue('profanity-queue')
    private readonly profanityQueue: QueueMQ,
  ) {
    this._setupBullQueueMonitoring();
  }

  private _setupBullQueueMonitoring = () => {
    const bullMQAdapters: BullMQAdapter[] = [
      new BullMQAdapter(this.logActivityQueue),
      new BullMQAdapter(this.emailQueue),
      new BullMQAdapter(this.esSearchQueue),
      new BullMQAdapter(this.profanityQueue),
    ];

    setQueues(bullMQAdapters);
  };
}
