import { Repository, EntityRepository } from 'typeorm';
import { OptSuggestion } from '../entity/opt-suggestion.entity';

@EntityRepository(OptSuggestion)
export class OptSuggestionRepository extends Repository<OptSuggestion> {}
