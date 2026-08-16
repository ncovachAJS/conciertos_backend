jest.mock('bcrypt');
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

const mockUsersService = {
  findById: jest.fn(),
  findByEmail: jest.fn(),
  updateAvatar: jest.fn(),
  updateName: jest.fn(),
  updatePassword: jest.fn(),
  updateEmail: jest.fn(),
  deleteAccount: jest.fn(),
};

const mockUser = {
  id: 'u1', name: 'Nico', email: 'nico@test.com',
  password: 'hashed', avatarUrl: null, isPro: false,
};

const mockReq = { user: { id: 'u1' } };

describe('UsersController', () => {
  let controller: UsersController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: mockUsersService }],
    }).compile();
    controller = module.get<UsersController>(UsersController);
  });

  it('should be defined', () => expect(controller).toBeDefined());

  // ── updateAvatar ──────────────────────────────────────────────────────────

  describe('updateAvatar', () => {
    it('delegates to usersService.updateAvatar', async () => {
      const updated = { id: 'u1', name: 'Nico', email: 'nico@test.com', avatarUrl: 'https://cdn/a.jpg' };
      mockUsersService.updateAvatar.mockResolvedValue(updated);
      const result = await controller.updateAvatar(mockReq, 'https://cdn/a.jpg');
      expect(mockUsersService.updateAvatar).toHaveBeenCalledWith('u1', 'https://cdn/a.jpg');
      expect(result.avatarUrl).toBe('https://cdn/a.jpg');
    });
  });

  // ── updateName ────────────────────────────────────────────────────────────

  describe('updateName', () => {
    it('throws BadRequestException when name is empty', async () => {
      await expect(controller.updateName(mockReq, '')).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when name is only spaces', async () => {
      await expect(controller.updateName(mockReq, '   ')).rejects.toThrow(BadRequestException);
    });

    it('updates name when valid', async () => {
      const updated = { id: 'u1', name: 'Nuevo', email: 'nico@test.com', avatarUrl: null };
      mockUsersService.updateName.mockResolvedValue(updated);
      const result = await controller.updateName(mockReq, ' Nuevo ');
      expect(mockUsersService.updateName).toHaveBeenCalledWith('u1', 'Nuevo');
      expect(result.name).toBe('Nuevo');
    });
  });

  // ── updatePassword ────────────────────────────────────────────────────────

  describe('updatePassword', () => {
    it('throws when currentPassword is missing', async () => {
      await expect(controller.updatePassword(mockReq, '', 'newpwd123')).rejects.toThrow(BadRequestException);
    });

    it('throws when newPassword is too short', async () => {
      await expect(controller.updatePassword(mockReq, 'oldpwd', 'abc')).rejects.toThrow(BadRequestException);
    });

    it('throws when user not found', async () => {
      mockUsersService.findById.mockResolvedValue(null);
      await expect(controller.updatePassword(mockReq, 'oldpwd', 'newpassword')).rejects.toThrow(BadRequestException);
    });

    it('throws when current password is wrong', async () => {
      mockUsersService.findById.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      await expect(controller.updatePassword(mockReq, 'wrong', 'newpassword')).rejects.toThrow(BadRequestException);
    });

    it('updates password when current is correct', async () => {
      mockUsersService.findById.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue('newhash');
      mockUsersService.updatePassword.mockResolvedValue({ id: 'u1' });
      const result = await controller.updatePassword(mockReq, 'correct', 'newpassword');
      expect(result.message).toContain('actualizada');
      expect(mockUsersService.updatePassword).toHaveBeenCalledWith('u1', 'newhash');
    });
  });

  // ── updateEmail ───────────────────────────────────────────────────────────

  describe('updateEmail', () => {
    it('throws when email is missing', async () => {
      await expect(controller.updateEmail(mockReq, '', 'pwd')).rejects.toThrow(BadRequestException);
    });

    it('throws when email format is invalid', async () => {
      await expect(controller.updateEmail(mockReq, 'not-an-email', 'pwd')).rejects.toThrow(BadRequestException);
    });

    it('throws when user not found', async () => {
      mockUsersService.findById.mockResolvedValue(null);
      await expect(controller.updateEmail(mockReq, 'new@test.com', 'pwd')).rejects.toThrow(BadRequestException);
    });

    it('throws when password is wrong', async () => {
      mockUsersService.findById.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      await expect(controller.updateEmail(mockReq, 'new@test.com', 'wrong')).rejects.toThrow(BadRequestException);
    });

    it('throws when email already taken by another user', async () => {
      mockUsersService.findById.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockUsersService.findByEmail.mockResolvedValue({ id: 'u99', email: 'new@test.com' });
      await expect(controller.updateEmail(mockReq, 'new@test.com', 'correct')).rejects.toThrow(BadRequestException);
    });

    it('updates email when valid and not taken', async () => {
      mockUsersService.findById.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockUsersService.findByEmail.mockResolvedValue(null);
      const updated = { id: 'u1', name: 'Nico', email: 'new@test.com', avatarUrl: null };
      mockUsersService.updateEmail.mockResolvedValue(updated);
      const result = await controller.updateEmail(mockReq, 'new@test.com', 'correct');
      expect(result.email).toBe('new@test.com');
    });
  });

  // ── deleteAccount ─────────────────────────────────────────────────────────

  describe('deleteAccount', () => {
    it('throws when currentPassword is missing', async () => {
      await expect(controller.deleteAccount(mockReq, '')).rejects.toThrow(BadRequestException);
    });

    it('throws when user not found', async () => {
      mockUsersService.findById.mockResolvedValue(null);
      await expect(controller.deleteAccount(mockReq, 'pwd')).rejects.toThrow(BadRequestException);
    });

    it('throws when password is wrong', async () => {
      mockUsersService.findById.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      await expect(controller.deleteAccount(mockReq, 'wrong')).rejects.toThrow(BadRequestException);
    });

    it('deletes account when password is correct', async () => {
      mockUsersService.findById.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockUsersService.deleteAccount.mockResolvedValue(undefined);
      const result = await controller.deleteAccount(mockReq, 'correct');
      expect(result.message).toContain('eliminada');
      expect(mockUsersService.deleteAccount).toHaveBeenCalledWith('u1');
    });
  });
});
