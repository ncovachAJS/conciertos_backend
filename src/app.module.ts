import { Module } from '@nestjs/common';

import { PrismaModule } from './prisma/prisma.module';
import { ConcertsModule } from './concerts/concerts.module';


@Module({
  imports: [
    PrismaModule,
    ConcertsModule,
  ],
})
export class AppModule {}