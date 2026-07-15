import { Injectable, Logger } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';

@Injectable()
export class UploadsService {
  private readonly logger = new Logger(UploadsService.name);

  constructor() {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });

    this.logger.log(
      `Cloudinary configurado para: ${process.env.CLOUDINARY_CLOUD_NAME}`,
    );
  }

  async uploadImage(file: any): Promise<string> {
    this.logger.debug('Procesando subida de imagen');

    return new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream({ folder: 'conciertos' }, (error, result) => {
          if (error) {
            this.logger.error('Error al subir imagen a Cloudinary', error.message);
            return reject(error);
          }
          this.logger.debug(`Imagen subida: ${result!.secure_url}`);
          resolve(result!.secure_url);
        })
        .end(file.buffer);
    });
  }
}