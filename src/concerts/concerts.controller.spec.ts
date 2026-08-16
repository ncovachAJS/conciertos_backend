import { Test, TestingModule } from '@nestjs/testing';
import { ConcertsController } from './concerts.controller';
import { ConcertsService } from './concerts.service';

const mockConcertsService = {
  findAll: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
  tagFriend: jest.fn(),
  untagFriend: jest.fn(),
  findFriendsActivity: jest.fn(),
  getComments: jest.fn(),
  addComment: jest.fn(),
  deleteComment: jest.fn(),
};

const mockReq = { user: { id: 'u1' } };

const baseConcert = {
  id: 'c1', userId: 'u1', name: 'Show', artist: 'Artista',
  date: new Date(), participants: [], user: { id: 'u1', name: 'Nico', avatarUrl: null },
};

describe('ConcertsController', () => {
  let controller: ConcertsController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ConcertsController],
      providers: [{ provide: ConcertsService, useValue: mockConcertsService }],
    }).compile();
    controller = module.get<ConcertsController>(ConcertsController);
  });

  it('should be defined', () => expect(controller).toBeDefined());

  describe('findAll', () => {
    it('returns paginated concerts with default pagination', async () => {
      mockConcertsService.findAll.mockResolvedValue({ data: [baseConcert], meta: { total: 1, page: 1, limit: 50, totalPages: 1 } });
      const result = await controller.findAll(mockReq);
      expect(mockConcertsService.findAll).toHaveBeenCalledWith('u1', { page: 1, limit: 50 });
      expect(result.data).toHaveLength(1);
    });

    it('parses page and limit from query strings', async () => {
      mockConcertsService.findAll.mockResolvedValue({ data: [], meta: { total: 0, page: 2, limit: 10, totalPages: 0 } });
      await controller.findAll(mockReq, '2', '10');
      expect(mockConcertsService.findAll).toHaveBeenCalledWith('u1', { page: 2, limit: 10 });
    });
  });

  describe('create', () => {
    it('delegates to service with userId + dto', async () => {
      mockConcertsService.create.mockResolvedValue(baseConcert);
      const dto = { artist: 'Artista', date: '2025-06-01' } as any;
      const result = await controller.create(mockReq, dto);
      expect(mockConcertsService.create).toHaveBeenCalledWith('u1', dto);
      expect(result.id).toBe('c1');
    });
  });

  describe('update', () => {
    it('delegates to service', async () => {
      mockConcertsService.update.mockResolvedValue(baseConcert);
      const result = await controller.update(mockReq, 'c1', { artist: 'Nuevo' } as any);
      expect(mockConcertsService.update).toHaveBeenCalledWith('u1', 'c1', { artist: 'Nuevo' });
      expect(result.id).toBe('c1');
    });
  });

  describe('remove', () => {
    it('delegates to service', async () => {
      mockConcertsService.remove.mockResolvedValue(baseConcert);
      const result = await controller.remove(mockReq, 'c1');
      expect(mockConcertsService.remove).toHaveBeenCalledWith('u1', 'c1');
      expect(result.id).toBe('c1');
    });
  });

  describe('findFriendsActivity', () => {
    it('delegates with default pagination', async () => {
      mockConcertsService.findFriendsActivity.mockResolvedValue({ data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } });
      await controller.findFriendsActivity(mockReq);
      expect(mockConcertsService.findFriendsActivity).toHaveBeenCalledWith('u1', 1, 20);
    });

    it('parses page and limit from query strings', async () => {
      mockConcertsService.findFriendsActivity.mockResolvedValue({ data: [], meta: {} });
      await controller.findFriendsActivity(mockReq, '2', '10');
      expect(mockConcertsService.findFriendsActivity).toHaveBeenCalledWith('u1', 2, 10);
    });
  });

  describe('getComments', () => {
    it('delegates to service with concertId', async () => {
      mockConcertsService.getComments.mockResolvedValue([]);
      await controller.getComments('c1');
      expect(mockConcertsService.getComments).toHaveBeenCalledWith('c1');
    });
  });

  describe('addComment', () => {
    it('delegates to service with userId + concertId + text', async () => {
      const comment = { id: 'cm1', text: 'Bien' };
      mockConcertsService.addComment.mockResolvedValue(comment);
      const result = await controller.addComment(mockReq, 'c1', 'Bien');
      expect(mockConcertsService.addComment).toHaveBeenCalledWith('u1', 'c1', 'Bien');
      expect(result).toEqual(comment);
    });
  });

  describe('deleteComment', () => {
    it('delegates to service with userId + commentId', async () => {
      const comment = { id: 'cm1', text: 'Bien' };
      mockConcertsService.deleteComment.mockResolvedValue(comment);
      await controller.deleteComment(mockReq, 'c1', 'cm1');
      expect(mockConcertsService.deleteComment).toHaveBeenCalledWith('u1', 'cm1');
    });
  });
});
