import { Controller, Get, Query } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('/healthy')
  healthy(): string {
    return this.appService.healthy();
  }
  @Get('/pika')
  pika(@Query('q') text: string) {
    return this.appService.pika(text);
  }
}
