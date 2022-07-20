import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { GetUser } from 'src/common/decorator/get-user.decorator';
import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard';
import { SensitiveDetectsService } from './sensitive-detects.service';

@Controller('sensitive-detects')
@UseGuards(JwtAuthGuard)
export class SensitiveDetectsController {
  constructor(
    private readonly sensitiveDetectsService: SensitiveDetectsService,
  ) {}

  @Post('/')
  createSensitive(
    @Body()
    createSensitiveDto: any,
    @GetUser() user: any,
  ) {
    return this.sensitiveDetectsService.createSensitiveDetect(
      createSensitiveDto,
      user,
    );
  }

  @Patch('/:id')
  updateSensitive(
    @Param('id') id: string,
    @Body()
    updateSensitiveDto: any,
    @GetUser() user: any,
  ) {
    return this.sensitiveDetectsService.updateSensitiveDetect(
      updateSensitiveDto,
      id,
      user,
    );
  }

  @Get('/')
  getSensitives(@Query() filters) {
    return this.sensitiveDetectsService.getSensitiveDetects(filters);
  }

  @Get('/export')
  getAllDataExport() {
    return this.sensitiveDetectsService.getAllDataExport();
  }

  @Get('/search')
  searchSensitiveDetect(@Query() filters) {
    return this.sensitiveDetectsService.searchSensitiveDetect(filters);
  }

  @Get('/:id')
  getSensitiveById(@Param('id') id: string) {
    return this.sensitiveDetectsService.getSensitiveDetectsById(id);
  }

  @Delete('/:id')
  deleteSensitive(@Param('id') id: string, @GetUser() user: any) {
    return this.sensitiveDetectsService.deleteSensitiveDetect(id, user);
  }
}
