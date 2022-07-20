import { CompaniesService } from 'src/modules/companies/companies.service';
import { Injectable, NotFoundException } from '@nestjs/common';
import { createConcretesKey } from '../../common/utils/createConcretesKey';
import { RingcentralService } from '../services/amqp/services/ringcentral.service';

@Injectable()
export class CallLogService {
  constructor(
    private readonly _ringcentralService: RingcentralService,
    private readonly _companiesService: CompaniesService,
  ) {}

  async getCallLogRecords(
    phoneNumber,
    dateFrom,
    dateTo,
    companyPhone,
    companyCode,
  ) {
    const company = await this._companiesService.getCompanyWithCode(
      companyCode,
    );

    if (!company) throw new NotFoundException('Not found company');

    const serviceToken = createConcretesKey(
      `${company.clientId}${company.clientSecret}${company.username}${company.password}`,
    );

    const record = [];
    let navigation = null;
    const data = await this._ringcentralService.getCallLogRecords(
      phoneNumber,
      dateFrom,
      dateTo,
      serviceToken,
    );
    if (data && data.records && data.records.length > 0) {
      data.records.forEach((item) => {
        if (
          (item.to.phoneNumber &&
            item.to.phoneNumber.slice(1) === companyPhone) ||
          (item.from.phoneNumber &&
            item.from.phoneNumber.slice(1) === companyPhone)
        ) {
          record.push(item);
          navigation = data.navigation;
        }
        if (!item.to.phoneNumber || !item.from.phoneNumber) {
          record.push(item);
          navigation = data.navigation;
        }
      });
      while (navigation && navigation.nextPage) {
        const dataNextPage = await this._getNextPageRecords(
          navigation,
          serviceToken,
        );
        if (dataNextPage && dataNextPage.records.length > 0) {
          dataNextPage.records.forEach((item) => {
            if (
              item.to.phoneNumber.slice(1) === companyPhone ||
              item.from.phoneNumber.slice(1) === companyPhone
            ) {
              record.push(item);
              navigation = dataNextPage.navigation;
            }
          });
        } else {
          break;
        }
      }
      return {
        records: record,
        navigation: navigation,
      };
    }
    return { records: [], navigation: null };
  }

  private async _getNextPageRecords(navigation, serviceToken) {
    const data = await this._ringcentralService.nextPageCallLogs(
      navigation,
      serviceToken,
    );
    if (data.records) {
      return {
        records: data.records,
        navigation: data.navigation,
      };
    }
    return {};
  }
}
