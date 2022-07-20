import { UUIDVersion } from 'class-validator';
export class CreateComposeMessageDto {
  message: string;
  files: string;
  customerPhones: Array<string>;
  companyId: UUIDVersion;
  signatureId: string;
  personalSignature: boolean;
}
