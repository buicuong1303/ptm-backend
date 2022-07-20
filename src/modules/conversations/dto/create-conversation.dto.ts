import { IsOptional } from 'class-validator';

export class CreateConversationDto {
  @IsOptional()
  name: string;
}
