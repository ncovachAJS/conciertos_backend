import { Test, TestingModule } from '@nestjs/testing';
import { ConcertsService } from './concerts.service';
import { PrismaService } from '../prisma/prisma.service';
import { FriendsService } from '../friends/friends.service';
import { NotificationsService } from '../notifications/notifications.service';

const mockPrisma = {
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
  friendship: { findMany: jest.fn() },
  $transaction: jest.fn(),
};

const mockFriendsService = { areFriends: jest.fn() };
const mockNotificationsService = {
  notifyFriendConcert: jest.fn(),
  notifyConcertTag: jest.fn(),
};

describe('ConcertsService', () => {
  let service: ConcertsService;

  beforeEach(async () => {
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

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
