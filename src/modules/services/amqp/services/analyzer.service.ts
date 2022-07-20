import { AmqpProducer } from '../amqp.producer';
import { Injectable } from '@nestjs/common';
import { TrainSensitiveDto } from '../dto/train-sensitive.dto';

@Injectable()
export class AnalyzerService {
  constructor(private readonly _amqpProducer: AmqpProducer) {}

  public async detectSensitive(message: any): Promise<any> {
    message = {
      id: message.id,
      text: message.text,
      direction: message.direction || 'inbound',
    };
    return this._amqpProducer.detectSensitive(message);
  }

  public async trainSensitive(
    trainSensitiveData: TrainSensitiveDto,
  ): Promise<any> {
    return this._amqpProducer.trainSensitive(trainSensitiveData);
  }
}
