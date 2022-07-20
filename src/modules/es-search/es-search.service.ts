import { EsSearchServiceInterface } from './interface/es-search.service.interface';
import { HttpException, Injectable } from '@nestjs/common';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { trycat } from 'src/common/utils/trycat';
import { HttpStatus, Logger } from '@nestjs/common';
import { esIndexs } from './constant/es-indexs';
import { HighLightDto } from './dto/high-light.dto';

@Injectable()
export class EsSearchService implements EsSearchServiceInterface<any> {
  private _logger: Logger = new Logger(EsSearchService.name);

  constructor(private readonly _esService: ElasticsearchService) {}

  async insertIndex(): Promise<any> {
    console.log('Start check existing index...');
    const checkIndex = await this._esService.indices.exists({
      index: esIndexs.message.index,
    });

    console.log('Done check existing index...');

    if (checkIndex.statusCode === 404) {
      console.log('Start indexing...');
      this._esService.indices.create(
        {
          index: esIndexs.message.index,
          body: {
            mappings: esIndexs.message.mapping,
            settings: esIndexs.message.settings,
          },
        },
        (err: any) => {
          if (err) {
            console.log('Error while indexing: ' + JSON.stringify(err));
          }
        },
      );
    }
  }

  async deleteIndex(indexData: any): Promise<any> {
    const [data, error] = await trycat(
      this._esService.indices.delete(indexData),
    );

    if (!error) return data;
    this._logger.debug(error);
  }

  async searchDoc(searchData: any): Promise<any> {
    const [data, error] = await trycat(this._esService.search(searchData));

    if (!error) {
      const { body } = data;
      const hits = body.hits.hits;
      return hits.map((item: any) => {
        return {
          _source: item._source,
          highlights: <HighLightDto>{
            text: !item.highlight.text
              ? []
              : item.highlight.text.map((item: any) => item.replace('\\g', '')),
            'attachments.name': !item.highlight['attachments.name']
              ? []
              : item.highlight['attachments.name'].map((item: any) =>
                  item.replace('\\g', ''),
                ),
          },
        };
      });
    }
    this._logger.debug(error);
  }

  async searchScrollDoc(searchData: any): Promise<any> {
    const [data, error] = await trycat(this._esService.search(searchData));
    if (!error) {
      const { body } = data;
      const hits = body.hits.hits;
      return {
        _scroll_id: body._scroll_id,
        hist: hits.map((item: any) => {
          return {
            _source: item._source,
            highlights: <HighLightDto>{
              text: !item.highlight?.text
                ? []
                : item.highlight.text.map((item: any) =>
                    item.match(/<em>(.*?)<\/em>/g).map(function (val) {
                      return val.replace(/<\/?em>/g, '');
                    }),
                  )[0],
              'attachments.name': !item.highlight?.['attachments.name']
                ? []
                : item.highlight?.['attachments.name'].map((item: any) =>
                    item.match(/<em>(.*?)<\/em>/g).map(function (val) {
                      return val.replace(/<\/?em>/g, '');
                    }),
                  )[0],
            },
          };
        }),
      };
    }
    this._logger.debug(error);
  }

  async scrollDoc(scrollData: any): Promise<any> {
    const [data, error] = await trycat(this._esService.scroll(scrollData));

    if (!error) {
      const { body } = data;
      const hits = body.hits.hits;
      return {
        _scroll_id: body._scroll_id,
        hist: hits.map((item: any) => {
          return {
            _source: item._source,
            highlights: <HighLightDto>{
              text: !item.highlight?.text
                ? []
                : item.highlight.text.map((item: any) =>
                    item.match(/<em>(.*?)<\/em>/g).map(function (val) {
                      return val.replace(/<\/?em>/g, '');
                    }),
                  )[0],
              'attachments.name': !item.highlight?.['attachments.name']
                ? []
                : item.highlight?.['attachments.name'].map((item: any) =>
                    item.match(/<em>(.*?)<\/em>/g).map(function (val) {
                      return val.replace(/<\/?em>/g, '');
                    }),
                  )[0],
            },
          };
        }),
      };
    }
    this._logger.debug(error);
  }

  async clearScroll(scrollIds: any): Promise<any> {
    const [data, error] = await trycat(
      this._esService.clearScroll({
        scroll_id: scrollIds,
      }),
    );
    if (!error) return data;
    this._logger.debug(error);
  }

  async insertBulkDoc(bulkData: any): Promise<any> {
    const [data, error] = await trycat(this._esService.bulk(bulkData));

    if (!error) return data;
    this._logger.debug(error);
  }

  async insertDoc(insertData: any): Promise<any> {
    const [data, error] = await trycat(this._esService.index(insertData));

    if (!error) return data;
    this._logger.debug(error);
  }

  async deleteDoc(deleteData: any): Promise<any> {
    const [data, error] = await trycat(this._esService.delete(deleteData));

    if (!error) return data;
    this._logger.debug(error);
  }

  async updateDoc(updateData: any): Promise<any> {
    const [data, error] = await trycat(this._esService.update(updateData));

    if (!error) return data;
    this._logger.debug(error);
  }
}
