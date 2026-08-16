/**
 * Script de migración one-time — organiza fotos existentes en Cloudinary por carpetas de usuario.
 *
 * Qué hace:
 *  1. Lee todas las ConcertPhoto de la BD (con su concierto para obtener userId cuando
 *     photo.userId es null, que ocurre en fotos subidas antes de que se añadiera el campo).
 *  2. Si la URL ya está dentro de conciertos/users/{userId}/ → la salta.
 *  3. Si no → llama a cloudinary.uploader.rename() para moverla y actualiza la URL en la BD.
 *
 * Ejecutar localmente:
 *   npx ts-node -r tsconfig-paths/register src/scripts/migrate-photos-to-folders.ts
 *
 * Las variables CLOUDINARY_* y DATABASE_URL deben estar disponibles en el entorno
 * (p.ej. en .env en la raíz del proyecto).
 */

import { PrismaClient } from '@prisma/client';
import { v2 as cloudinary } from 'cloudinary';

// Carga .env si está disponible; si no, usa las variables del entorno del shell.
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('dotenv').config();
} catch {
  // dotenv no disponible — ok si las vars ya están en el entorno
}

// ── Configuración ──────────────────────────────────────────────────────────────

const DRY_RUN = process.argv.includes('--dry-run');
const DELAY_MS = 400; // pausa entre llamadas al Admin API (rate limit Cloudinary: ~50/s free)

const prisma = new PrismaClient();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Extrae el public_id de una URL de Cloudinary.
 *  https://res.cloudinary.com/cloud/image/upload/v123/conciertos/users/uid/file.jpg
 *  → conciertos/users/uid/file
 */
function extractPublicId(url: string): string | null {
  try {
    const match = url.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[^.]+)?$/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ── Main ───────────────────────────────────────────────────────────────────────

async function main() {
  if (DRY_RUN) {
    console.log('🔍 MODO DRY-RUN — no se hará ningún cambio en Cloudinary ni en la BD\n');
  }

  console.log('📋 Leyendo fotos de la base de datos...');

  const photos = await prisma.concertPhoto.findMany({
    include: { concert: { select: { userId: true } } },
    orderBy: { createdAt: 'asc' },
  });

  console.log(`📸 Total fotos: ${photos.length}\n`);

  const stats = { moved: 0, skipped: 0, failed: 0 };

  for (const photo of photos) {
    // userId de la foto o, si es null (foto antigua), del concierto
    const userId = photo.userId ?? photo.concert.userId;
    const publicId = extractPublicId(photo.imageUrl);

    if (!publicId) {
      console.warn(`⚠️  No se pudo extraer public_id: ${photo.imageUrl}`);
      stats.skipped++;
      continue;
    }

    // ¿Ya está en la carpeta correcta?
    const targetPrefix = `conciertos/users/${userId}/`;
    if (publicId.startsWith(targetPrefix)) {
      stats.skipped++;
      continue;
    }

    // Nombre de archivo (sin carpeta)
    const filename = publicId.split('/').pop()!;
    const newPublicId = `${targetPrefix}${filename}`;

    if (DRY_RUN) {
      console.log(`  [DRY] ${publicId}  →  ${newPublicId}`);
      stats.moved++;
      continue;
    }

    try {
      const result = await cloudinary.uploader.rename(publicId, newPublicId, {
        overwrite: true,
      });

      await prisma.concertPhoto.update({
        where: { id: photo.id },
        data: { imageUrl: result.secure_url },
      });

      console.log(`✅ [${stats.moved + 1}] ${publicId}  →  ${newPublicId}`);
      stats.moved++;
    } catch (err: any) {
      console.error(`❌ Fallo en foto ${photo.id}: ${err.message}`);
      stats.failed++;
    }

    await sleep(DELAY_MS);
  }

  console.log('\n✨ Migración completada:');
  console.log(`   ✅ Movidas  : ${stats.moved}`);
  console.log(`   ⏭️  Saltadas : ${stats.skipped} (ya estaban en la carpeta correcta)`);
  console.log(`   ❌ Fallidas : ${stats.failed}`);

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
