/* eslint-disable prettier/prettier */
import { Controller, Get, Param, Query } from '@nestjs/common';
import { CallLogService } from './call-logs.service';

@Controller('call-logs')
export class CallLogController {
  constructor(private readonly callLogRecords: CallLogService) {}

  @Get('/:phoneNumber/company/:companyPhone')
  getCallLogRecords(
    @Param('phoneNumber') phoneNumber: string,
    @Param('companyPhone') companyPhone: string,
    @Query() queries,
  ) {
    const { dateFrom, dateTo, companyCode } = queries;
    return this.callLogRecords.getCallLogRecords(
      phoneNumber,
      dateFrom,
      dateTo,
      companyPhone,
      companyCode,
    );
  }
}
