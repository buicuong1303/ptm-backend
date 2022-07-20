import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MessageRepository } from '../messages/repository/message.repository';
import { OptSuggestionsModule } from '../opt-suggestions/opt-suggestions.module';
import { SensitiveDetectsRepository } from './repository/sensitive-detects.repository';
import { SensitiveDetectsController } from './sensitive-detects.controller';
import { SensitiveDetectsService } from './sensitive-detects.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([SensitiveDetectsRepository, MessageRepository]),
    OptSuggestionsModule,
  ],
  controllers: [SensitiveDetectsController],
  providers: [SensitiveDetectsService],
  exports: [SensitiveDetectsService],
})
export class SensitiveDetectsModule {}
