import { Test, TestingModule } from '@nestjs/testing';
import { WantToAttendController } from './want-to-attend.controller';
import { WantToAttendService } from './want-to-attend.service';

const mockWantToAttendService = {
  getAll: jest.fn(),
  toggle: jest.fn(),
};

const mockReq = { user: { id: 'u1' } };

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

describe('WantToAttendController', () => {
  let controller: WantToAttendController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WantToAttendController],
      providers: [{ provide: WantToAttendService, useValue: mockWantToAttendService }],
    }).compile();
    controller = module.get<WantToAttendController>(WantToAttendController);
  });

  it('should be defined', () => expect(controller).toBeDefined());

  describe('getAll', () => {
    it('delegates to service with userId', async () => {
      mockWantToAttendService.getAll.mockResolvedValue([]);
      const result = await controller.getAll(mockReq);
      expect(mockWantToAttendService.getAll).toHaveBeenCalledWith('u1');
      expect(result).toEqual([]);
    });
  });

  describe('toggle', () => {
    it('delegates to service with userId + dto and returns added: true', async () => {
      mockWantToAttendService.toggle.mockResolvedValue({ added: true });
      const result = await controller.toggle(mockReq, baseDto);
      expect(mockWantToAttendService.toggle).toHaveBeenCalledWith('u1', baseDto);
      expect(result).toEqual({ added: true });
    });

    it('returns added: false when event is removed', async () => {
      mockWantToAttendService.toggle.mockResolvedValue({ added: false });
      const result = await controller.toggle(mockReq, baseDto);
      expect(result).toEqual({ added: false });
    });
  });
});
