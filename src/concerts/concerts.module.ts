import { Module } from '@nestjs/common';
import { ConcertsController } from './concerts.controller';
import { ConcertsService } from './concerts.service';
import { PrismaModule } from '../prisma/prisma.module';
import { FriendsModule } from '../friends/friends.module';

@Module({
  imports: [PrismaModule, FriendsModule],
  controllers: [ConcertsController],
  providers: [ConcertsService],
})
export class ConcertsModule {}