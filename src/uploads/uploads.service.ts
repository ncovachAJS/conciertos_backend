import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

// application/octet-stream es el fallback que algunos clientes móviles envían
// cuando no pueden detectar el MIME type — lo aceptamos y Cloudinary validará el contenido.
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'application/octet-stream',
];

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

  async uploadImage(file: any, userId: string): Promise<string> {
    // Validar tipo
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(`Tipo de archivo no permitido: ${file.mimetype}`);
    }
    // Validar tamaño
    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException(`El archivo supera el tamaño máximo de 10 MB`);
    }

    this.logger.debug(`Procesando subida de imagen para usuario ${userId}`);

    return new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream({ folder: `conciertos/users/${userId}` }, (error, result) => {
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

  async deleteImage(imageUrl: string): Promise<void> {
    const publicId = this._extractPublicId(imageUrl);
    if (!publicId) {
      this.logger.warn(`No se pudo extraer el public_id de: ${imageUrl}`);
      return;
    }
    try {
      await cloudinary.uploader.destroy(publicId);
      this.logger.debug(`Imagen eliminada de Cloudinary: ${publicId}`);
    } catch (err: any) {
      this.logger.error(`Error al eliminar imagen de Cloudinary: ${publicId}`, err?.message);
    }
  }

  /** Extrae el public_id de una URL de Cloudinary.
   *  https://res.cloudinary.com/cloud/image/upload/v123/conciertos/users/uid/file.jpg
   *  → conciertos/users/uid/file
   */
  private _extractPublicId(url: string): string | null {
    try {
      const match = url.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[^.]+)?$/);
      return match ? match[1] : null;
    } catch {
      return null;
    }
  }
}
