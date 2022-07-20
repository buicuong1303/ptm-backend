import { Module } from '@nestjs/common';

import { ViewResponseController } from './view-history.controller';
import { ViewHistoryService } from './view-history.service';
@Module({
  imports: [],
  controllers: [ViewResponseController],
  providers: [ViewHistoryService],
})
export class ViewHistoryModule {}
