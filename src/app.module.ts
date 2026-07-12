import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { PrismaModule } from './prisma/prisma.module';
import { ConcertsModule } from './concerts/concerts.module';
import { PhotosModule } from './photos/photos.module';

import { UploadsModule } from './uploads/uploads.module';

import { SpotifyModule } from './spotify/spotify.module';

import { RecommendationsModule } from './recommendations/recommendations.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    ConcertsModule,
    PhotosModule,
    UploadsModule,
    SpotifyModule,
    RecommendationsModule,
    UsersModule,
    AuthModule,
  ],
})
export class AppModule {}