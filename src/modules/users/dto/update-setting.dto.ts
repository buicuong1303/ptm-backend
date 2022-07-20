import { bool } from 'aws-sdk/clients/signer';
export class UpdateSettingDto {
  allowDesktopNotification: bool;
  allowSoundNotification: bool;
}
