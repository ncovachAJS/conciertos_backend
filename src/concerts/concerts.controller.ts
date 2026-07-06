import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Post,
    Put,
} from '@nestjs/common';

import { UpdateConcertDto } from './dto/update-concert.dto';

import { ConcertsService } from './concerts.service';
import { CreateConcertDto } from './dto/create-concert.dto';

@Controller('concerts')
export class ConcertsController {

    constructor(
        private readonly concertsService: ConcertsService,
    ) { }

    @Get()
    findAll() {
        return this.concertsService.findAll();
    }

    @Post()
    create(
        @Body() dto: CreateConcertDto,
    ) {
        return this.concertsService.create(dto);
    }

    @Put(':id')
    update(
        @Param('id') id: string,
        @Body() dto: UpdateConcertDto,
    ) {
        return this.concertsService.update(id, dto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.concertsService.remove(id);
    }

}