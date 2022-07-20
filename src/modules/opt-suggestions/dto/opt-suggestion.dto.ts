import { OptStatus } from 'src/common/constant/opt-status';

export class AddOptSuggestionDto {
  messageId: string;
  customerId?: string;
  optStatus: OptStatus;
  reason: string;
  rate: number;
  campaignId?: string;
}
