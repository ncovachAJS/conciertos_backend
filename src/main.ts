import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';

import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  if (!process.env.JWT_SECRET) {
    throw new Error('❌ JWT_SECRET no definida en las variables de entorno');
  }
  const app = await NestFactory.create(AppModule);

  // Cabeceras de seguridad HTTP (XSS, clickjacking, MIME sniffing, etc.)
  app.use(helmet());

  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',').map((o) => o.trim()) ?? [];

  app.enableCors({
    origin: (origin, callback) => {
      // Las apps nativas (iOS/Android) no envían origin → siempre permitidas.
      if (!origin) return callback(null, true);
      // Cualquier localhost se permite (desarrollo web local).
      if (/^https?:\/\/localhost(:\d+)?$/.test(origin)) return callback(null, true);
      // Orígenes de producción configurados vía variable de entorno.
      if (allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`CORS: origen no permitido: ${origin}`));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());

  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Conciertos API')
      .setDescription('API para gestionar conciertos')
      .setVersion('1.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
        'JWT',
      )
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, document);
    console.log('📄 Swagger disponible en /api (solo entorno no-productivo)');
  }

  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');

  console.log(`🚀 API iniciada en puerto ${process.env.PORT ?? 3000}`);
}

bootstrap();
