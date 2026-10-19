import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { PrismaModule } from '../prisma/prisma.module';
import { DiscogsService } from './discogs.service';
import { DiscogsAuthController } from './discogs-auth.controller';
import { DiscogsOauthService } from './discogs-oauth.service';
import { RecordsController } from './records.controller';
import { RecordsService } from './records.service';

@Module({
  imports: [PrismaModule, HttpModule],
  controllers: [RecordsController, DiscogsAuthController],
  providers: [RecordsService, DiscogsService, DiscogsOauthService],
})
export class RecordsModule {}
