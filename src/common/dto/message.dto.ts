import { MessageDirection } from '../constant/message-direction';
import { ExternalStatus } from './../constant/external-status';

export class MessageDto {
  text: string;
  attachments: Array<any>;
  phoneFrom: string;
  phoneTo: string;
  nonTargets?: string[]; //* only using for message from group
  id: string;
  serviceToken: string; //* is userName in company

  exId?: string;
  exMessageStatus?: ExternalStatus; //* Sent | SentFailed | Delivered | DeliveredFailed | Queue | Received
  exCreationTime?: any;
  exLastModifiedTime?: any;
  direction?: MessageDirection;
  isPolling?: boolean;
}
