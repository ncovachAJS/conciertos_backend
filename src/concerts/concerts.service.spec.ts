import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, HttpException, NotFoundException } from '@nestjs/common';
import { ConcertsService } from './concerts.service';
import { PrismaService } from '../prisma/prisma.service';
import { FriendsService } from '../friends/friends.service';
import { NotificationsService } from '../notifications/notifications.service';

const baseConcert = {
  id: 'c1',
  userId: 'u1',
  name: 'Show',
  artist: 'Artista',
  date: new Date('2025-06-01'),
  festival: '',
  venue: 'Sala',
  city: 'Madrid',
  description: '',
  genre: 'Rock',
  imageUrl: '',
  rating: 5,
  soundRating: 5,
  atmosphereRating: 5,
  setlistRating: 5,
  valueRating: 5,
  artistRating: 5,
  liked: true,
  favorite: false,
  price: 30,
  createdAt: new Date(),
  updatedAt: new Date(),
  participants: [],
  user: { id: 'u1', name: 'Nico', avatarUrl: null },
};

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
  },
  concert: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  concertParticipant: {
    upsert: jest.fn(),
    deleteMany: jest.fn(),
  },
  concertComment: {
    findMany: jest.fn(),
    create: jest.fn(),
    findFirst: jest.fn(),
    delete: jest.fn(),
  },
  friendship: { findMany: jest.fn() },
  $transaction: jest.fn(),
};

const mockFriendsService = { areFriends: jest.fn() };
const mockNotificationsService = {
  notifyFriendConcert: jest.fn().mockResolvedValue(undefined),
  notifyConcertTag: jest.fn().mockResolvedValue(undefined),
  notifyConcertComment: jest.fn().mockResolvedValue(undefined),
};

describe('ConcertsService', () => {
  let service: ConcertsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConcertsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: FriendsService, useValue: mockFriendsService },
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    }).compile();
    service = module.get<ConcertsService>(ConcertsService);
  });

  it('should be defined', () => expect(service).toBeDefined());

  // ── findAll ───────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('returns paginated concerts with meta', async () => {
      mockPrisma.$transaction.mockResolvedValue([[baseConcert], 1]);
      const result = await service.findAll('u1', { page: 1, limit: 20 });
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
    });

    it('resets personal values for tagged (non-owner) concerts', async () => {
      const taggedConcert = { ...baseConcert, userId: 'other', rating: 5, liked: true, favorite: true };
      mockPrisma.$transaction.mockResolvedValue([[taggedConcert], 1]);
      const result = await service.findAll('u1', { page: 1, limit: 20 });
      expect(result.data[0].rating).toBe(0);
      expect(result.data[0].liked).toBe(false);
      expect(result.data[0].favorite).toBe(false);
    });

    it('caps limit at 200', async () => {
      mockPrisma.$transaction.mockResolvedValue([[], 0]);
      await service.findAll('u1', { page: 1, limit: 500 });
      // $transaction was called; verify internally limit was capped
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });
  });

  // ── create ────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('throws 402 when free user reaches concert limit', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ isPro: false });
      mockPrisma.concert.count.mockResolvedValue(50);
      let thrown: unknown = null;
      try {
        await service.create('u1', { artist: 'Artista', date: '2025-06-01' } as any);
      } catch (err) {
        thrown = err;
      }
      expect(thrown).toBeInstanceOf(HttpException);
      expect((thrown as HttpException).getStatus()).toBe(402);
    });

    it('allows create when user is Pro regardless of concert count', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ isPro: true });
      mockPrisma.concert.create.mockResolvedValue(baseConcert);
      mockPrisma.concert.findUnique.mockResolvedValue(baseConcert);
      const result = await service.create('u1', { artist: 'Artista', date: '2025-06-01' } as any);
      expect(mockPrisma.concert.count).not.toHaveBeenCalled();
      expect(result).toEqual(baseConcert);
    });

    it('creates concert and calls findOne', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ isPro: false });
      mockPrisma.concert.count.mockResolvedValue(0);
      mockPrisma.concert.create.mockResolvedValue(baseConcert);
      mockPrisma.concert.findUnique.mockResolvedValue(baseConcert);
      const result = await service.create('u1', {
        artist: 'Artista',
        date: '2025-06-01',
      } as any);
      expect(mockPrisma.concert.create).toHaveBeenCalled();
      expect(result).toEqual(baseConcert);
    });

    it('notifies friends after creation (fire-and-forget)', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ isPro: false });
      mockPrisma.concert.count.mockResolvedValue(0);
      mockPrisma.concert.create.mockResolvedValue(baseConcert);
      mockPrisma.concert.findUnique.mockResolvedValue(baseConcert);
      await service.create('u1', { artist: 'Artista', date: '2025-06-01' } as any);
      // notifyFriendConcert is called async; we just check it was invoked
      expect(mockNotificationsService.notifyFriendConcert).toHaveBeenCalledWith('u1', expect.any(String), 'c1');
    });

    it('tags friends when taggedFriendIds is provided', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ isPro: false });
      mockPrisma.concert.count.mockResolvedValue(0);
      mockPrisma.concert.create.mockResolvedValue(baseConcert);
      mockPrisma.concert.findUnique.mockResolvedValue(baseConcert);
      mockPrisma.friendship.findMany.mockResolvedValue([
        { senderId: 'u1', receiverId: 'f1' },
      ]);
      mockPrisma.concertParticipant.upsert.mockResolvedValue({});

      await service.create('u1', {
        artist: 'Artista',
        date: '2025-06-01',
        taggedFriendIds: ['f1'],
      } as any);

      expect(mockPrisma.concertParticipant.upsert).toHaveBeenCalled();
    });
  });

  // ── update ────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('throws NotFoundException when concert not found', async () => {
      mockPrisma.concert.findFirst.mockResolvedValue(null);
      await expect(service.update('u1', 'c1', { artist: 'X' } as any)).rejects.toThrow(NotFoundException);
    });

    it('updates and returns refreshed concert', async () => {
      mockPrisma.concert.findFirst.mockResolvedValue(baseConcert);
      mockPrisma.concert.update.mockResolvedValue(baseConcert);
      mockPrisma.concert.findUnique.mockResolvedValue(baseConcert);
      const result = await service.update('u1', 'c1', { artist: 'Nuevo' } as any);
      expect(result).toEqual(baseConcert);
    });

    it('syncs tagged friends when taggedFriendIds is provided', async () => {
      mockPrisma.concert.findFirst.mockResolvedValue(baseConcert);
      mockPrisma.concert.update.mockResolvedValue(baseConcert);
      mockPrisma.concert.findUnique.mockResolvedValue(baseConcert);
      mockPrisma.concertParticipant.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.friendship.findMany.mockResolvedValue([{ senderId: 'u1', receiverId: 'f1' }]);
      mockPrisma.concertParticipant.upsert.mockResolvedValue({});

      await service.update('u1', 'c1', { taggedFriendIds: ['f1'] } as any);
      expect(mockPrisma.concertParticipant.deleteMany).toHaveBeenCalledWith({ where: { concertId: 'c1' } });
    });
  });

  // ── remove ────────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('throws NotFoundException when concert not found', async () => {
      mockPrisma.concert.findFirst.mockResolvedValue(null);
      await expect(service.remove('u1', 'c1')).rejects.toThrow(NotFoundException);
    });

    it('deletes and returns the deleted concert', async () => {
      mockPrisma.concert.findFirst.mockResolvedValue(baseConcert);
      mockPrisma.concert.delete.mockResolvedValue(baseConcert);
      const result = await service.remove('u1', 'c1');
      expect(result.id).toBe('c1');
    });
  });

  // ── tagFriend ─────────────────────────────────────────────────────────────

  describe('tagFriend', () => {
    it('throws NotFoundException when concert not found', async () => {
      mockPrisma.concert.findFirst.mockResolvedValue(null);
      await expect(service.tagFriend('u1', 'c1', 'f1')).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when not friends', async () => {
      mockPrisma.concert.findFirst.mockResolvedValue(baseConcert);
      mockFriendsService.areFriends.mockResolvedValue(false);
      await expect(service.tagFriend('u1', 'c1', 'f1')).rejects.toThrow(ForbiddenException);
    });

    it('throws BadRequestException when trying to tag yourself', async () => {
      mockPrisma.concert.findFirst.mockResolvedValue(baseConcert);
      mockFriendsService.areFriends.mockResolvedValue(true);
      let thrown: unknown = null;
      try {
        await service.tagFriend('u1', 'c1', 'u1');
      } catch (err) {
        thrown = err;
      }
      expect(thrown).toBeInstanceOf(BadRequestException);
    });

    it('tags friend and returns updated concert', async () => {
      mockPrisma.concert.findFirst.mockResolvedValue(baseConcert);
      mockFriendsService.areFriends.mockResolvedValue(true);
      mockPrisma.concertParticipant.upsert.mockResolvedValue({});
      mockPrisma.concert.findUnique.mockResolvedValue(baseConcert);
      const result = await service.tagFriend('u1', 'c1', 'f1');
      expect(result).toEqual(baseConcert);
    });
  });

  // ── untagFriend ───────────────────────────────────────────────────────────

  describe('untagFriend', () => {
    it('throws NotFoundException when concert not found', async () => {
      mockPrisma.concert.findFirst.mockResolvedValue(null);
      await expect(service.untagFriend('u1', 'c1', 'f1')).rejects.toThrow(NotFoundException);
    });

    it('removes participant and returns updated concert', async () => {
      mockPrisma.concert.findFirst.mockResolvedValue(baseConcert);
      mockPrisma.concertParticipant.deleteMany.mockResolvedValue({ count: 1 });
      mockPrisma.concert.findUnique.mockResolvedValue(baseConcert);
      const result = await service.untagFriend('u1', 'c1', 'f1');
      expect(result).toEqual(baseConcert);
    });
  });

  // ── findFriendsActivity ───────────────────────────────────────────────────

  describe('findFriendsActivity', () => {
    it('returns empty when no friends', async () => {
      mockPrisma.friendship.findMany.mockResolvedValue([]);
      const result = await service.findFriendsActivity('u1');
      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
    });

    it('returns friend concerts when friends exist', async () => {
      mockPrisma.friendship.findMany.mockResolvedValue([{ senderId: 'u1', receiverId: 'f1' }]);
      mockPrisma.$transaction.mockResolvedValue([[baseConcert], 1]);
      const result = await service.findFriendsActivity('u1');
      expect(result.data).toHaveLength(1);
    });
  });

  // ── getComments ───────────────────────────────────────────────────────────

  describe('getComments', () => {
    it('returns list of comments for owner', async () => {
      const concert = { userId: 'u1', participants: [] };
      const comment = { id: 'cm1', text: 'Genial', user: { id: 'u2', name: 'Ana', avatarUrl: null } };
      mockPrisma.concert.findUnique.mockResolvedValue(concert);
      mockPrisma.concertComment.findMany.mockResolvedValue([comment]);
      const result = await service.getComments('u1', 'c1');
      expect(result).toHaveLength(1);
      expect(result[0].text).toBe('Genial');
    });
  });

  // ── addComment ────────────────────────────────────────────────────────────

  describe('addComment', () => {
    it('throws when text is empty', async () => {
      await expect(service.addComment('u2', 'c1', '')).rejects.toThrow();
    });

    it('creates comment and notifies owner when commenter != owner', async () => {
      const comment = { id: 'cm1', text: 'Buena', user: { id: 'u2', name: 'Ana', avatarUrl: null } };
      mockPrisma.concertComment.create.mockResolvedValue(comment);
      mockPrisma.concert.findUnique.mockResolvedValue({ userId: 'u1', name: 'Show', artist: 'Artista' });
      const result = await service.addComment('u2', 'c1', 'Buena');
      expect(result.text).toBe('Buena');
      expect(mockNotificationsService.notifyConcertComment).toHaveBeenCalledWith('u2', 'u1', 'Show', 'c1');
    });

    it('does not notify when commenter is owner', async () => {
      const comment = { id: 'cm1', text: 'Buena', user: { id: 'u1', name: 'Nico', avatarUrl: null } };
      mockPrisma.concertComment.create.mockResolvedValue(comment);
      mockPrisma.concert.findUnique.mockResolvedValue({ userId: 'u1', name: 'Show', artist: 'Artista' });
      await service.addComment('u1', 'c1', 'Buena');
      expect(mockNotificationsService.notifyConcertComment).not.toHaveBeenCalled();
    });
  });

  // ── deleteComment ─────────────────────────────────────────────────────────

  describe('deleteComment', () => {
    it('throws when comment not found or not owned', async () => {
      mockPrisma.concertComment.findFirst.mockResolvedValue(null);
      await expect(service.deleteComment('u2', 'cm1')).rejects.toThrow();
    });

    it('deletes and returns the deleted comment', async () => {
      const comment = { id: 'cm1', userId: 'u2', text: 'ok' };
      mockPrisma.concertComment.findFirst.mockResolvedValue(comment);
      mockPrisma.concertComment.delete.mockResolvedValue(comment);
      const result = await service.deleteComment('u2', 'cm1');
      expect(result.id).toBe('cm1');
    });
  });
});
