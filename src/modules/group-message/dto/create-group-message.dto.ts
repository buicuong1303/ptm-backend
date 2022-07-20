import { ExternalStatus } from './../../../common/constant/external-status';
import { IsArray, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { MessageDirection } from '../../../common/constant/message-direction';

export class CreateGroupMessageDto {
  @IsString()
  @IsNotEmpty()
  from: string;

  @IsString()
  @IsNotEmpty()
  to: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(990)
  text: string;

  @IsArray()
  @IsNotEmpty()
  nonTargets: string[];

  @IsString()
  @IsNotEmpty()
  exId: string;

  @IsString()
  @IsNotEmpty()
  exCreationTime: Date;

  @IsString()
  @IsNotEmpty()
  exLastModifiedTime: Date;

  exStatus: ExternalStatus;

  direction: MessageDirection;
}
