import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { FriendshipStatus } from '@prisma/client';
import { FriendsService } from './friends.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

const mockPrisma = {
  user: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
  },
  friendship: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  concert: {
    findMany: jest.fn(),
  },
};

const mockNotificationsService = {
  notifyFriendRequest: jest.fn().mockResolvedValue(undefined),
  notifyFriendAccepted: jest.fn().mockResolvedValue(undefined),
};

const baseUser = { id: 'u2', name: 'Ana', email: 'ana@test.com', avatarUrl: null };
const baseFriendship = {
  id: 'fs1', senderId: 'u1', receiverId: 'u2',
  status: FriendshipStatus.ACCEPTED, createdAt: new Date(),
  sender: baseUser, receiver: baseUser,
};

describe('FriendsService', () => {
  let service: FriendsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FriendsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    }).compile();
    service = module.get<FriendsService>(FriendsService);
  });

  it('should be defined', () => expect(service).toBeDefined());

  // ── searchUsers ───────────────────────────────────────────────────────────

  describe('searchUsers', () => {
    it('returns empty array when query is too short', async () => {
      const result = await service.searchUsers('u1', 'a');
      expect(result).toEqual([]);
      expect(mockPrisma.user.findMany).not.toHaveBeenCalled();
    });

    it('returns users with friendship status', async () => {
      mockPrisma.user.findMany.mockResolvedValue([baseUser]);
      mockPrisma.friendship.findMany.mockResolvedValue([
        { id: 'fs1', senderId: 'u1', receiverId: 'u2', status: FriendshipStatus.PENDING },
      ]);
      const result = await service.searchUsers('u1', 'Ana');
      expect(result).toHaveLength(1);
      expect(result[0].friendshipStatus).toBe(FriendshipStatus.PENDING);
    });

    it('sets friendshipStatus to null when no relationship exists', async () => {
      mockPrisma.user.findMany.mockResolvedValue([baseUser]);
      mockPrisma.friendship.findMany.mockResolvedValue([]);
      const result = await service.searchUsers('u1', 'Ana');
      expect(result[0].friendshipStatus).toBeNull();
    });
  });

  // ── sendRequest ───────────────────────────────────────────────────────────

  describe('sendRequest', () => {
    it('throws BadRequestException when sender === receiver', async () => {
      await expect(service.sendRequest('u1', 'u1')).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when friendship already exists', async () => {
      mockPrisma.friendship.findFirst.mockResolvedValue(baseFriendship);
      await expect(service.sendRequest('u1', 'u2')).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException when receiver not found', async () => {
      mockPrisma.friendship.findFirst.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(service.sendRequest('u1', 'u2')).rejects.toThrow(NotFoundException);
    });

    it('creates friendship and notifies receiver', async () => {
      mockPrisma.friendship.findFirst.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue(baseUser);
      mockPrisma.friendship.create.mockResolvedValue(baseFriendship);
      const result = await service.sendRequest('u1', 'u2');
      expect(result.id).toBe('fs1');
      expect(mockNotificationsService.notifyFriendRequest).toHaveBeenCalledWith('u1', 'u2');
    });
  });

  // ── acceptRequest ─────────────────────────────────────────────────────────

  describe('acceptRequest', () => {
    it('throws NotFoundException when request not found', async () => {
      mockPrisma.friendship.findFirst.mockResolvedValue(null);
      await expect(service.acceptRequest('u2', 'fs1')).rejects.toThrow(NotFoundException);
    });

    it('updates status and notifies sender', async () => {
      mockPrisma.friendship.findFirst.mockResolvedValue({ ...baseFriendship, status: FriendshipStatus.PENDING });
      mockPrisma.friendship.update.mockResolvedValue({ ...baseFriendship, status: FriendshipStatus.ACCEPTED });
      const result = await service.acceptRequest('u2', 'fs1');
      expect(result.status).toBe(FriendshipStatus.ACCEPTED);
      expect(mockNotificationsService.notifyFriendAccepted).toHaveBeenCalledWith('u2', 'u1');
    });
  });

  // ── removeRequest ──────────────────────────────────────────────────────────

  describe('removeRequest', () => {
    it('throws NotFoundException when friendship not found', async () => {
      mockPrisma.friendship.findFirst.mockResolvedValue(null);
      await expect(service.removeRequest('u1', 'fs1')).rejects.toThrow(NotFoundException);
    });

    it('deletes friendship', async () => {
      mockPrisma.friendship.findFirst.mockResolvedValue(baseFriendship);
      mockPrisma.friendship.delete.mockResolvedValue(baseFriendship);
      const result = await service.removeRequest('u1', 'fs1');
      expect(result.id).toBe('fs1');
    });
  });

  // ── getFriends ────────────────────────────────────────────────────────────

  describe('getFriends', () => {
    it('returns friends list with friendshipId', async () => {
      mockPrisma.friendship.findMany.mockResolvedValue([
        { id: 'fs1', senderId: 'u1', receiverId: 'u2', sender: baseUser, receiver: { ...baseUser, id: 'u2' } },
      ]);
      const result = await service.getFriends('u1');
      expect(result).toHaveLength(1);
      expect(result[0].friendshipId).toBe('fs1');
      expect(result[0].friend.id).toBe('u2');
    });
  });

  // ── getPendingRequests ────────────────────────────────────────────────────

  describe('getPendingRequests', () => {
    it('returns pending requests', async () => {
      mockPrisma.friendship.findMany.mockResolvedValue([baseFriendship]);
      const result = await service.getPendingRequests('u2');
      expect(result).toHaveLength(1);
    });
  });

  // ── areFriends ────────────────────────────────────────────────────────────

  describe('areFriends', () => {
    it('returns true when friendship exists', async () => {
      mockPrisma.friendship.findFirst.mockResolvedValue(baseFriendship);
      expect(await service.areFriends('u1', 'u2')).toBe(true);
    });

    it('returns false when no friendship', async () => {
      mockPrisma.friendship.findFirst.mockResolvedValue(null);
      expect(await service.areFriends('u1', 'u3')).toBe(false);
    });
  });

  // ── getFriendStats ────────────────────────────────────────────────────────

  describe('getFriendStats', () => {
    it('throws when not friends', async () => {
      mockPrisma.friendship.findFirst.mockResolvedValue(null);
      await expect(service.getFriendStats('u1', 'u2')).rejects.toThrow('No sois amigos');
    });

    it('returns stats object when friends', async () => {
      mockPrisma.friendship.findFirst.mockResolvedValue(baseFriendship);
      mockPrisma.concert.findMany.mockResolvedValue([
        { artist: 'Artista', festival: '', city: 'Madrid', date: new Date(), rating: 5, genre: 'Rock', favorite: true, price: 30 },
        { artist: 'Artista', festival: 'FestA', city: 'BCN', date: new Date(), rating: 4, genre: 'Metal', favorite: false, price: 50 },
      ]);
      const result = await service.getFriendStats('u1', 'u2');
      expect(result.totalConcerts).toBe(2);
      expect(result.totalSpent).toBe(80);
      expect(result.uniqueArtists).toBe(1);
      expect(result.rockConcerts).toBe(1);
      expect(result.metalConcerts).toBe(1);
    });
  });

  // ── getFriendUpcomingConcerts ─────────────────────────────────────────────

  describe('getFriendUpcomingConcerts', () => {
    it('throws when not friends', async () => {
      mockPrisma.friendship.findFirst.mockResolvedValue(null);
      await expect(service.getFriendUpcomingConcerts('u1', 'u2')).rejects.toThrow('No sois amigos');
    });

    it('returns upcoming concerts', async () => {
      mockPrisma.friendship.findFirst.mockResolvedValue(baseFriendship);
      const upcoming = { id: 'c1', name: 'Show', artist: 'X', festival: '', date: new Date(), imageUrl: '', venue: '', city: '' };
      mockPrisma.concert.findMany.mockResolvedValue([upcoming]);
      const result = await service.getFriendUpcomingConcerts('u1', 'u2');
      expect(result).toHaveLength(1);
    });
  });

  // ── getFriendAllConcerts ──────────────────────────────────────────────────

  describe('getFriendAllConcerts', () => {
    it('throws when not friends', async () => {
      mockPrisma.friendship.findFirst.mockResolvedValue(null);
      await expect(service.getFriendAllConcerts('u1', 'u2')).rejects.toThrow('No sois amigos');
    });

    it('returns all concerts (own + tagged)', async () => {
      mockPrisma.friendship.findFirst.mockResolvedValue(baseFriendship);
      mockPrisma.concert.findMany.mockResolvedValue([{ id: 'c1', artist: 'X' }]);
      const result = await service.getFriendAllConcerts('u1', 'u2');
      expect(result).toHaveLength(1);
    });
  });
});
