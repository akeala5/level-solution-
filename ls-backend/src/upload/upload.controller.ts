import {
  Controller, Post, Get, Body, Query, UseInterceptors,
  UploadedFile, UploadedFiles, ParseFilePipe, MaxFileSizeValidator,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiConsumes, ApiOperation } from '@nestjs/swagger';
import { UploadService } from './upload.service';

@ApiTags('Upload')
@ApiBearerAuth()
@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('image')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload une image (optimisée WebP)' })
  uploadImage(
    @UploadedFile() file: Express.Multer.File,
    @Query('folder') folder?: string,
  ) {
    return this.uploadService.uploadImage(file, folder);
  }

  @Post('images')
  @UseInterceptors(FilesInterceptor('files', 10, { limits: { fileSize: 10 * 1024 * 1024 } }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload plusieurs images' })
  uploadImages(
    @UploadedFiles() files: Express.Multer.File[],
    @Query('folder') folder?: string,
  ) {
    return this.uploadService.uploadMultiple(files, folder);
  }

  @Get('presign')
  @ApiOperation({ summary: 'Obtenir une URL pré-signée pour upload direct' })
  presign(@Query('folder') folder: string, @Query('filename') filename: string) {
    return this.uploadService.getPresignedUrl(folder, filename);
  }
}
