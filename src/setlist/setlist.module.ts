import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';

import { SetlistController } from './setlist.controller';
import { SetlistService } from './setlist.service';

@Module({
  imports: [HttpModule],
  controllers: [SetlistController],
  providers: [SetlistService],
})
export class SetlistModule {}
