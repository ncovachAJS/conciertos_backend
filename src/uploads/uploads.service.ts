import { Injectable } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';

@Injectable()
export class UploadsService {
  constructor() {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }

  async uploadImage(file: any): Promise<string> {
    console.log('📸 Archivo recibido:', !!file);

    return new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            folder: 'conciertos',
          },
          (error, result) => {
            console.log('❌ Cloudinary error:', error);
            console.log('✅ Cloudinary result:', result);

            if (error) {
              return reject(error);
            }

            resolve(result!.secure_url);
          },
        )
        .end(file.buffer);
    });
  }
}
