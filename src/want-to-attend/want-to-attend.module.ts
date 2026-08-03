import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { WantToAttendController } from './want-to-attend.controller';
import { WantToAttendService } from './want-to-attend.service';

@Module({
  imports: [PrismaModule],
  controllers: [WantToAttendController],
  providers: [WantToAttendService],
})
export class WantToAttendModule {}
