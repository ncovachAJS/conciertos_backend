import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

import { PrismaModule } from './prisma/prisma.module';
import { ConcertsModule } from './concerts/concerts.module';
import { PhotosModule } from './photos/photos.module';
import { UploadsModule } from './uploads/uploads.module';
import { SpotifyModule } from './spotify/spotify.module';
import { RecommendationsModule } from './recommendations/recommendations.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { FriendsModule } from './friends/friends.module';
import { NotificationsModule } from './notifications/notifications.module';
import { WantToAttendModule } from './want-to-attend/want-to-attend.module';
import { SetlistModule } from './setlist/setlist.module';

/* eslint-disable @typescript-eslint/no-var-requires */
const { initializeApp, getApps, cert } = require('firebase-admin/app');
/* eslint-enable */

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([
      { name: 'global', ttl: 60_000, limit: 120 }, // 120 req/min por IP
    ]),
    PrismaModule,
    ConcertsModule,
    PhotosModule,
    UploadsModule,
    SpotifyModule,
    RecommendationsModule,
    UsersModule,
    AuthModule,
    FriendsModule,
    NotificationsModule,
    WantToAttendModule,
    SetlistModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}