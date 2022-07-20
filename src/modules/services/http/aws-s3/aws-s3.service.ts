import {
  HttpService,
  Injectable,
  ServiceUnavailableException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { S3 } from 'aws-sdk';
import * as AWS from 'aws-sdk';
import { AwsS3PresignedMethod } from 'src/common/constant/aws-s3-presigned-method';
import { AxiosResponse } from 'axios';
import { v4 as uuid } from 'uuid';
@Injectable()
export class AwsS3Service {
  private _awsConfigS3: any;
  private _s3: S3;

  constructor(private readonly httpService: HttpService) {
    //* AWS S3 config

    AWS.config.update({
      accessKeyId: process.env.AWS_S3_ACCESS_ID,
      secretAccessKey: process.env.AWS_S3_SECRET_ID,
      region: process.env.AWS_S3_REGION,
    });

    this._s3 = new S3();
  }

  public async getSignedUrl(
    key: string,
    presignedMethod: AwsS3PresignedMethod,
    contentType,
  ): Promise<string> {
    const params = {
      Bucket: process.env.AWS_S3_BKN,
      Key: key, // file path
      Expires: 120, // Expire date (seconds) - default 900s
      ContentType: contentType,
    };

    try {
      const signedUrl = await this._s3.getSignedUrlPromise(
        presignedMethod,
        params,
      );
      return signedUrl;
    } catch (error) {
      throw new ServiceUnavailableException('AWS S3 service unavailable!');
    }
  }

  public async uploadFile(dataBuffer: any, key: string) {
    const params = {
      Bucket: process.env.AWS_S3_BKN,
      Body: dataBuffer,
      Key: key,
    };

    try {
      const uploadResult = await this._s3.upload(params).promise();
      return uploadResult;
    } catch (error) {
      throw new ServiceUnavailableException('AWS S3 service unavailable!');
    }
  }

  public async downloadFile(key) {
    const params = {
      Bucket: process.env.AWS_S3_BKN,
      Key: unescape(key),
    };

    try {
      const readStream = await this._s3.getObject(params).promise();
      return readStream.Body;
    } catch (error) {
      console.log(error);
      throw new ServiceUnavailableException('AWS S3 service unavailable!');
    }
  }
  public async uploadFilePreSignUrl(fileInfo): Promise<AxiosResponse> {
    const acceptFiles = [
      'jpg',
      'jpeg',
      'png',
      'gif',
      'tif',
      'tiff',
      'bmp',
      'svg',
      'mp4',
      'mpeg',
      'mp3',
      'vcf',
      'vcard',
      'rtf',
      'zip',
    ];
    const format = fileInfo.type.split('/')[1];
    if (!acceptFiles.includes(format))
      throw new UnsupportedMediaTypeException();
    const key = `${process.env.AWS_S3_PATH_MESSAGE_ATTACHMENT}/${uuid()}/${
      fileInfo.fileName
    }`;
    try {
      const singedUrl = await this.getSignedUrl(
        key,
        AwsS3PresignedMethod.PUT,
        fileInfo.type,
      );
      const uploadedInfo = await this.httpService
        .put(singedUrl, fileInfo.data, {
          headers: {
            'Content-Type': fileInfo.type,
          },
        })
        .toPromise();
      return {
        ...fileInfo,
        ...uploadedInfo,
      };
    } catch (error) {
      console.log(error);
    }
  }
}
