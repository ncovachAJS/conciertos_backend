import { Module } from '@nestjs/common';
import { PhotosController } from './photos.controller';
import { PhotosService } from './photos.service';
import { PrismaModule } from '../prisma/prisma.module';
import { FriendsModule } from '../friends/friends.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { UploadsModule } from '../uploads/uploads.module';

@Module({
  imports: [PrismaModule, FriendsModule, NotificationsModule, UploadsModule],
  controllers: [PhotosController],
  providers: [PhotosService],
})
export class PhotosModule {}
