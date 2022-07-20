import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ViewHistoryService } from './view-history.service';
import { GetHistoryDto } from './dto/get-history.dto';
import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard';

@Controller('/view-history')
export class ViewResponseController {
  constructor(private readonly viewHistoryService: ViewHistoryService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  getHistory(@Body() getResponseDto: GetHistoryDto): Promise<any> {
    return this.viewHistoryService.getHistory(getResponseDto);
  }
}
