import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';

const mockUser = {
  id: 'u1',
  name: 'Nico',
  email: 'nico@test.com',
  password: 'hashed',
  avatarUrl: null,
  isPro: false,
  resetToken: null,
  resetTokenExpiry: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date(),
  passwordChangedAt: null,
};

const mockPrisma = {
  user: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
    delete: jest.fn(),
  },
  notification: { deleteMany: jest.fn() },
  deviceToken: { deleteMany: jest.fn() },
  friendship: { deleteMany: jest.fn() },
  concert: { deleteMany: jest.fn() },
  $transaction: jest.fn(),
};

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => expect(service).toBeDefined());

  describe('findAll', () => {
    it('returns all users', async () => {
      mockPrisma.user.findMany.mockResolvedValue([mockUser]);
      const result = await service.findAll();
      expect(result).toHaveLength(1);
    });
  });

  describe('findByEmail', () => {
    it('returns user when found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      const result = await service.findByEmail('nico@test.com');
      expect(result!.id).toBe('u1');
    });

    it('returns null when not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      expect(await service.findByEmail('missing@test.com')).toBeNull();
    });
  });

  describe('findById', () => {
    it('returns user when found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      const result = await service.findById('u1');
      expect(result!.name).toBe('Nico');
    });
  });

  describe('findByResetToken', () => {
    it('returns user when token matches', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(mockUser);
      const result = await service.findByResetToken('some-token');
      expect(result!.id).toBe('u1');
    });
  });

  describe('create', () => {
    it('creates and returns user', async () => {
      mockPrisma.user.create.mockResolvedValue(mockUser);
      const result = await service.create({ name: 'Nico', email: 'nico@test.com', password: 'hashed' });
      expect(result.id).toBe('u1');
    });
  });

  describe('updateAvatar', () => {
    it('updates avatar and returns updated user', async () => {
      const updated = { id: 'u1', name: 'Nico', email: 'nico@test.com', avatarUrl: 'https://example.com/avatar.jpg' };
      mockPrisma.user.update.mockResolvedValue(updated);
      const result = await service.updateAvatar('u1', 'https://example.com/avatar.jpg');
      expect(result.avatarUrl).toBe('https://example.com/avatar.jpg');
    });
  });

  describe('updateName', () => {
    it('updates name', async () => {
      const updated = { id: 'u1', name: 'Nuevo', email: 'nico@test.com', avatarUrl: null };
      mockPrisma.user.update.mockResolvedValue(updated);
      const result = await service.updateName('u1', 'Nuevo');
      expect(result.name).toBe('Nuevo');
    });
  });

  describe('updatePassword', () => {
    it('updates password with timestamp', async () => {
      mockPrisma.user.update.mockResolvedValue({ id: 'u1' });
      const result = await service.updatePassword('u1', 'newhash');
      expect(result).toEqual({ id: 'u1' });
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: { password: 'newhash', passwordChangedAt: expect.any(Date) },
        select: { id: true },
      });
    });
  });

  describe('setResetToken', () => {
    it('stores token and expiry', async () => {
      mockPrisma.user.update.mockResolvedValue(mockUser);
      const expiry = new Date(Date.now() + 3600_000);
      await service.setResetToken('u1', 'tok', expiry);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: { resetToken: 'tok', resetTokenExpiry: expiry },
      });
    });
  });

  describe('clearResetToken', () => {
    it('clears token and expiry', async () => {
      mockPrisma.user.update.mockResolvedValue(mockUser);
      await service.clearResetToken('u1');
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: { resetToken: null, resetTokenExpiry: null },
      });
    });
  });

  describe('updateEmail', () => {
    it('updates email', async () => {
      const updated = { id: 'u1', name: 'Nico', email: 'new@test.com', avatarUrl: null };
      mockPrisma.user.update.mockResolvedValue(updated);
      const result = await service.updateEmail('u1', 'new@test.com');
      expect(result.email).toBe('new@test.com');
    });
  });

  describe('deleteAccount', () => {
    it('runs transaction to delete all user data', async () => {
      mockPrisma.$transaction.mockResolvedValue([]);
      await service.deleteAccount('u1');
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });
  });

  describe('getMemberNumber', () => {
    it('returns 0 when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      expect(await service.getMemberNumber('missing')).toBe(0);
    });

    it('returns count of users registered up to the same date', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ createdAt: new Date('2024-01-01') });
      mockPrisma.user.count.mockResolvedValue(42);
      const result = await service.getMemberNumber('u1');
      expect(result).toBe(42);
    });
  });
});
