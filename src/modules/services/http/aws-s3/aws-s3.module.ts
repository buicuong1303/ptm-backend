import { HttpModule, Module } from '@nestjs/common';
import { AwsS3Service } from './aws-s3.service';

@Module({
  providers: [AwsS3Service],
  exports: [AwsS3Service],
  imports: [HttpModule],
})
export class AwsS3Module {}
