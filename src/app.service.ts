import { Injectable } from '@nestjs/common';
import { AnalyzerService } from './modules/services/amqp/services/analyzer.service';

@Injectable()
export class AppService {
  constructor(private readonly analyzerService: AnalyzerService) {}
  getHello(): string {
    return 'Hello World!';
  }

  healthy(): string {
    return 'Healthy!!!';
  }
  pika(text: string) {
    return this.analyzerService.detectSensitive({
      id: 1,
      text: text,
      direction: 'inbound',
    });
  }
}
