import { Test, TestingModule } from '@nestjs/testing';
import { WantToAttendService } from './want-to-attend.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma = {
  wantToAttend: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
  },
};

const baseDto = {
  eventId: 'ev1',
  artist: 'Artista',
  venue: 'Sala',
  city: 'Madrid',
  country: 'España',
  date: '2025-09-01',
  imageUrl: 'https://img.com/a.jpg',
  ticketUrl: 'https://tickets.com',
};

const baseEntry = {
  id: 'wta1',
  userId: 'u1',
  ...baseDto,
  date: new Date(baseDto.date),
};

describe('WantToAttendService', () => {
  let service: WantToAttendService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WantToAttendService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<WantToAttendService>(WantToAttendService);
  });

  it('should be defined', () => expect(service).toBeDefined());

  describe('getAll', () => {
    it('returns list ordered by date', async () => {
      mockPrisma.wantToAttend.findMany.mockResolvedValue([baseEntry]);
      const result = await service.getAll('u1');
      expect(result).toHaveLength(1);
      expect(mockPrisma.wantToAttend.findMany).toHaveBeenCalledWith({
        where: { userId: 'u1' },
        orderBy: { date: 'asc' },
      });
    });
  });

  describe('toggle', () => {
    it('removes entry when it already exists and returns added: false', async () => {
      mockPrisma.wantToAttend.findUnique.mockResolvedValue(baseEntry);
      mockPrisma.wantToAttend.delete.mockResolvedValue(baseEntry);
      const result = await service.toggle('u1', baseDto);
      expect(result).toEqual({ added: false });
      expect(mockPrisma.wantToAttend.delete).toHaveBeenCalledWith({
        where: { userId_eventId: { userId: 'u1', eventId: 'ev1' } },
      });
    });

    it('creates entry when it does not exist and returns added: true', async () => {
      mockPrisma.wantToAttend.findUnique.mockResolvedValue(null);
      mockPrisma.wantToAttend.create.mockResolvedValue(baseEntry);
      const result = await service.toggle('u1', baseDto);
      expect(result).toEqual({ added: true });
      expect(mockPrisma.wantToAttend.create).toHaveBeenCalledWith({
        data: {
          userId: 'u1',
          eventId: 'ev1',
          artist: 'Artista',
          venue: 'Sala',
          city: 'Madrid',
          country: 'España',
          date: new Date('2025-09-01'),
          imageUrl: 'https://img.com/a.jpg',
          ticketUrl: 'https://tickets.com',
        },
      });
    });
  });
});
