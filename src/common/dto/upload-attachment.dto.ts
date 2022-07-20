export class UploadAttachmentDto {
  fileName: string;
  type: string;
  data: Array<Buffer>;
  width: any;
  height: any;
}
