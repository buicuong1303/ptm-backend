import { IsOptional } from 'class-validator';

export class EditConversationDto {
  @IsOptional()
  isCompleted: boolean;
  @IsOptional()
  newOrExisting: string;
}
