import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityStatus } from 'src/common/constant/entity-status';
import { MessageDirection } from 'src/common/constant/message-direction';
import { Brackets, getManager } from 'typeorm';
import { AnalyzerService } from '../services/amqp/services/analyzer.service';
import { Sensitive } from './entity/sensitives.entity';
import { SensitivesRepository } from './repository/sensitives.repository';
import * as mtz from 'moment-timezone';
import { OptSuggestion } from '../opt-suggestions/entity/opt-suggestion.entity';
import { Message } from '../messages/entity/message.entity';
@Injectable()
export class SensitivesService {
  constructor(
    @InjectRepository(SensitivesRepository)
    private readonly sensitivesRepository: SensitivesRepository,
    private readonly analyzerService: AnalyzerService,
  ) {}

  async createSensitive(createSensitiveDto: any, user: any) {
    const sensitiveExisted = await getManager()
      .createQueryBuilder(Sensitive, 'sensitive')
      .where('sensitive.sensitiveKey = :sensitiveKey', {
        sensitiveKey: createSensitiveDto.sensitiveKey.trim(),
      })
      .andWhere('sensitive.type = :type', { type: createSensitiveDto.type })
      .andWhere('sensitive.direction = :direction', {
        direction: createSensitiveDto.direction,
      })
      .andWhere('sensitive.status = :status', { status: EntityStatus.ACTIVE })
      .getOne();
    if (sensitiveExisted) throw new ConflictException('Sensitive existed');
    const sensitive = new Sensitive();
    sensitive.sensitiveKey = createSensitiveDto.sensitiveKey.trim();
    sensitive.type = createSensitiveDto.type;
    sensitive.direction = createSensitiveDto.direction;
    sensitive.status = createSensitiveDto.status;
    sensitive.creationUserId = user?.id;
    sensitive.lastModifiedUserId = user?.id;
    return await sensitive.save();
  }

  async updateSensitive(updateSensitiveDto: any, id: string, user: any) {
    const sensitiveExisted = await getManager()
      .createQueryBuilder(Sensitive, 'sensitive')
      .where('sensitive.sensitiveKey = :sensitiveKey', {
        sensitiveKey: updateSensitiveDto.sensitiveKey.trim(),
      })
      .andWhere('sensitive.type = :type', { type: updateSensitiveDto.type })
      .andWhere('sensitive.direction = :direction', {
        direction: updateSensitiveDto.direction,
      })
      .andWhere('sensitive.status = :status', { status: EntityStatus.ACTIVE })
      .andWhere('sensitive.id != :id', { id })
      .getOne();
    if (sensitiveExisted) throw new ConflictException('Sensitive existed');
    const sensitive = await this.sensitivesRepository.findOne({
      where: {
        id: id,
      },
    });
    sensitive.sensitiveKey = updateSensitiveDto.sensitiveKey.trim();
    sensitive.type = updateSensitiveDto.type;
    sensitive.direction = updateSensitiveDto.direction;
    sensitive.status = updateSensitiveDto.status;
    sensitive.lastModifiedUserId = user.id;
    return await sensitive.save();
  }

  async updateTrainStatus(data: any) {
    try {
      if (data['sensitive_word_ids'].length > 0) {
        await getManager()
          .createQueryBuilder()
          .update(Sensitive)
          .set({ isTrained: true })
          .where('id IN (:...sensitiveWordIds) and isTrained = :isTrained', {
            sensitiveWordIds: data['sensitive_word_ids'],
            isTrained: false,
          })
          .execute();
      }
      if (data['opt_suggestion_ids'].length > 0) {
        await getManager()
          .createQueryBuilder()
          .update(OptSuggestion)
          .set({ isTrained: true })
          .where('id IN (:...optSuggestionIds) and isTrained = :isTrained', {
            optSuggestionIds: data['opt_suggestion_ids'],
            isTrained: false,
          })
          .execute();
      }
    } catch (error) {
      throw new InternalServerErrorException();
    }
  }

  async deleteSensitive(id: string, user: any) {
    const sensitive = await this.sensitivesRepository.findOne({
      where: {
        status: EntityStatus.ACTIVE,
        id: id,
      },
    });
    sensitive.status = EntityStatus.DELETE;
    sensitive.lastModifiedUserId = user?.id;
    return await sensitive.save();
  }

  async getSensitives() {
    const sensitives = await this.sensitivesRepository.find({
      order: {
        creationTime: 'DESC',
      },
      where: {
        status: EntityStatus.ACTIVE,
      },
    });
    return sensitives;
  }

  async getSensitivesById(id: string) {
    const sensitive = await this.sensitivesRepository.findOne({
      where: {
        status: EntityStatus.ACTIVE,
        id: id,
      },
    });
    return sensitive;
  }
  async detectSensitiveWord(text: string, direction: MessageDirection) {
    try {
      const infoWord = await getManager()
        .createQueryBuilder(Sensitive, 'sensitive')
        .andWhere('LOWER(sensitive.sensitiveKey) IN (:...words)', {
          words: text.split(' ').map((word) => word.toLowerCase()),
        })
        .andWhere('sensitive.type = :type', { type: 'normal' })
        .andWhere('sensitive.direction = :direction', { direction })
        .andWhere('sensitive.status = :status', {
          status: EntityStatus.ACTIVE,
        })
        .getOne();
      return !!infoWord;
    } catch (error) {
      throw new InternalServerErrorException();
    }
  }

  async trainSensitive(direction: MessageDirection) {
    //* find if have any new sensitive word or any sensitive which was trained have been deleted => trigger train all active data again
    //* detect change sensitive word
    const needTrainSensitiveWord = await getManager()
      .createQueryBuilder(Sensitive, 'sensitive')
      .andWhere('sensitive.type = :type', { type: 'training' })
      .andWhere('sensitive.direction = :direction', { direction })
      .andWhere(
        new Brackets((qb) => {
          qb.where(
            new Brackets((qb) => {
              qb.where('sensitive.status = :statusActive', {
                statusActive: EntityStatus.ACTIVE,
              }).andWhere('sensitive.isTrained= :isTrainedTrue', {
                isTrainedTrue: false,
              });
            }),
          ).orWhere(
            new Brackets((qb) => {
              qb.where('sensitive.status = :statusDelete', {
                statusDelete: EntityStatus.DELETE,
              })
                .andWhere('sensitive.isTrained = :isTrainedFalse', {
                  isTrainedFalse: true,
                })
                .andWhere('sensitive.lastModifiedTime BETWEEN :from AND :to', {
                  from: mtz(new Date())
                    .tz('America/Los_Angeles')
                    .startOf('day')
                    .format(),
                  to: mtz(new Date())
                    .tz('America/Los_Angeles')
                    .endOf('day')
                    .format(),
                });
            }),
          );
        }),
      )
      .getMany();
    //* detect new optSuggestion word
    const needTrainOptSuggestions: any = await getManager()
      .createQueryBuilder(OptSuggestion, 'optSuggestion')
      .innerJoinAndSelect(
        Message,
        'message',
        'optSuggestion.messageId = message.id',
      )
      .where('optSuggestion.suggestionStatus IS NOT NULL')
      .andWhere('optSuggestion.optStatus = :optStatus', { optStatus: 'out' })
      .andWhere('optSuggestion.isTrained = :isTrained', { isTrained: false })
      .getMany();

    const sensitive_words = [];
    const sensitive_word_ids = [];
    let sensitive_is_offensive = [];

    const opt_suggestion_words = [];
    const opt_suggestion_is_offensive = [];
    const opt_suggestion_ids = [];

    if (
      needTrainSensitiveWord.length > 0 ||
      needTrainOptSuggestions.length > 0
    ) {
      //* get list sensitive words again
      const sensitives = await getManager()
        .createQueryBuilder(Sensitive, 'sensitive')
        .andWhere('sensitive.status = :status', { status: EntityStatus.ACTIVE })
        .andWhere('sensitive.type = :type', { type: 'training' })
        .andWhere('sensitive.direction = :direction', { direction })
        .getMany();
      if (sensitives.length > 0) {
        sensitive_words.push(...sensitives.map((word) => word.sensitiveKey));
        sensitive_word_ids.push(...sensitives.map((word) => word.id));
        sensitive_is_offensive = Array(sensitives.length).fill(1);
      }
      //* get list optSuggestions again
      let optSuggestions: any = await getManager()
        .createQueryBuilder(OptSuggestion, 'optSuggestion')
        .innerJoinAndSelect(
          Message,
          'message',
          'optSuggestion.messageId = message.id',
        )
        .where('optSuggestion.suggestionStatus IS NOT NULL')
        .andWhere('optSuggestion.optStatus = :optStatus', { optStatus: 'out' })
        .getMany();
      optSuggestions = optSuggestions.map(async (opt) => {
        return {
          ...opt,
          messageId: await getManager()
            .createQueryBuilder(Message, 'message')
            .andWhere('message.id = :id', { id: opt.messageId })
            .getOne(),
        };
      });

      optSuggestions = await Promise.all(optSuggestions);

      if (optSuggestions.length > 0) {
        optSuggestions.forEach((item) => {
          opt_suggestion_words.push(item.messageId.text);
          if (item.suggestionStatus === true) {
            opt_suggestion_is_offensive.push(1);
          } else opt_suggestion_is_offensive.push(0);
          opt_suggestion_ids.push(item.id);
        });
      }
    }

    if (sensitive_words.length > 0)
      await this.analyzerService.trainSensitive({
        direction: direction,
        sensitive: {
          sensitive_words,
          sensitive_word_ids,
          sensitive_is_offensive,
        },
        optSuggestion: {
          opt_suggestion_words,
          opt_suggestion_is_offensive,
          opt_suggestion_ids,
        },
      });
  }
}
