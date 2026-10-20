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

    const year = new Date().getFullYear();

    return new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          { folder: `conciertos/users/${userId}/${year}` },
          (error, result) => {
            if (error) {
              this.logger.error('Error al subir imagen a Cloudinary', error.message);
              return reject(error);
            }
            this.logger.debug(`Imagen subida: ${result!.secure_url}`);
            resolve(result!.secure_url);
          },
        )
        .end(file.buffer);
    });
  }

  /** Carpeta raíz de Cloudinary donde viven todas las imágenes de un usuario. */
  private _userFolder(userId: string): string {
    return `conciertos/users/${userId}`;
  }

  /**
   * Devuelve true solo si la URL es de NUESTRA cuenta de Cloudinary y apunta a
   * una imagen dentro de la carpeta del usuario indicado. Evita que se guarden
   * (o se borren) URLs ajenas.
   */
  isOwnedUrl(url: string, userId: string): boolean {
    const cloud = process.env.CLOUDINARY_CLOUD_NAME;
    if (!cloud || !url || !userId) return false;
    try {
      const u = new URL(url);
      if (u.protocol !== 'https:' || u.hostname !== 'res.cloudinary.com') return false;
      if (!u.pathname.startsWith(`/${cloud}/image/upload/`)) return false;
      const publicId = this._extractPublicId(url);
      return !!publicId && publicId.startsWith(`${this._userFolder(userId)}/`) && !publicId.includes('..');
    } catch {
      return false;
    }
  }

  /** Borra una imagen solo si pertenece a `ownerId`. */
  async deleteImage(imageUrl: string, ownerId: string): Promise<void> {
    if (!this.isOwnedUrl(imageUrl, ownerId)) {
      this.logger.warn(`Se omite el borrado: la URL no pertenece al usuario ${ownerId}`);
      return;
    }
    const publicId = this._extractPublicId(imageUrl)!;
    try {
      await cloudinary.uploader.destroy(publicId);
      this.logger.debug(`Imagen eliminada de Cloudinary: ${publicId}`);
    } catch (err: any) {
      this.logger.error(`Error al eliminar imagen de Cloudinary: ${publicId}`, err?.message);
    }
  }

  /**
   * Borra todas las imágenes de un usuario (avatar y fotos) y su carpeta.
   * No lanza: si Cloudinary falla se registra y se devuelve false para que
   * el borrado de la cuenta no quede bloqueado.
   */
  async deleteUserImages(userId: string): Promise<boolean> {
    const prefix = `${this._userFolder(userId)}/`;
    try {
      let nextCursor: string | undefined;
      do {
        const res: any = await cloudinary.api.delete_resources_by_prefix(prefix, {
          next_cursor: nextCursor,
        });
        nextCursor = res?.next_cursor;
      } while (nextCursor);
      await cloudinary.api.delete_folder(this._userFolder(userId)).catch(() => {});
      this.logger.log(`Imágenes de Cloudinary eliminadas para el usuario ${userId}`);
      return true;
    } catch (err: any) {
      this.logger.error(
        `Error al eliminar imágenes de Cloudinary del usuario ${userId}`,
        err?.message,
      );
      return false;
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
