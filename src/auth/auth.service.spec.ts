jest.mock('bcrypt');
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { EmailService } from '../email/email.service';

const mockUser = {
  id: 'user-1',
  name: 'Nico',
  email: 'nico@test.com',
  password: 'hashedpwd',
  avatarUrl: null,
  isPro: false,
  resetToken: null,
  resetTokenExpiry: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  passwordChangedAt: null,
};

const mockUsersService = {
  findByEmail: jest.fn(),
  findById: jest.fn(),
  findByResetToken: jest.fn(),
  create: jest.fn(),
  getMemberNumber: jest.fn(),
  setResetToken: jest.fn(),
  clearResetToken: jest.fn(),
  updatePassword: jest.fn(),
};

const mockJwtService = { sign: jest.fn().mockReturnValue('jwt-token') };
const mockEmailService = { sendPasswordReset: jest.fn() };

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: EmailService, useValue: mockEmailService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => expect(service).toBeDefined());

  // ── register ───────────────────────────────────────────────────────────────

  describe('register', () => {
    it('throws if email already exists', async () => {
      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      await expect(
        service.register({ name: 'Nico', email: 'nico@test.com', password: '123456' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('creates user and returns token + user', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);
      mockUsersService.create.mockResolvedValue(mockUser);
      mockUsersService.getMemberNumber.mockResolvedValue(1);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');

      const result = await service.register({
        name: 'Nico',
        email: 'nico@test.com',
        password: '123456',
      });

      expect(result.token).toBe('jwt-token');
      expect(result.user.email).toBe('nico@test.com');
      expect(result.user.memberNumber).toBe(1);
    });
  });

  // ── login ──────────────────────────────────────────────────────────────────

  describe('login', () => {
    it('throws UnauthorizedException when user not found', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);
      await expect(service.login('x@x.com', 'pwd')).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when password wrong', async () => {
      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      await expect(service.login('nico@test.com', 'wrong')).rejects.toThrow(UnauthorizedException);
    });

    it('returns token + user on valid credentials', async () => {
      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockUsersService.getMemberNumber.mockResolvedValue(2);

      const result = await service.login('nico@test.com', '123456');
      expect(result.token).toBe('jwt-token');
      expect(result.user.id).toBe('user-1');
    });
  });

  // ── me ─────────────────────────────────────────────────────────────────────

  describe('me', () => {
    it('returns null when user not found', async () => {
      mockUsersService.findById.mockResolvedValue(null);
      expect(await service.me('no-id')).toBeNull();
    });

    it('returns user data when found', async () => {
      mockUsersService.findById.mockResolvedValue(mockUser);
      mockUsersService.getMemberNumber.mockResolvedValue(3);
      const result = await service.me('user-1');
      expect(result!.email).toBe('nico@test.com');
      expect(result!.memberNumber).toBe(3);
    });
  });

  // ── forgotPassword ─────────────────────────────────────────────────────────

  describe('forgotPassword', () => {
    it('returns generic message when email not found', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);
      const result = await service.forgotPassword('missing@test.com');
      expect(result.message).toContain('Si el email existe');
      expect(mockEmailService.sendPasswordReset).not.toHaveBeenCalled();
    });

    it('sets reset token and sends email when user found', async () => {
      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      mockUsersService.setResetToken.mockResolvedValue(undefined);
      mockEmailService.sendPasswordReset.mockResolvedValue(undefined);

      const result = await service.forgotPassword('nico@test.com');
      expect(result.message).toContain('Si el email existe');
      expect(mockUsersService.setResetToken).toHaveBeenCalledWith(
        'user-1',
        expect.any(String),
        expect.any(Date),
      );
      expect(mockEmailService.sendPasswordReset).toHaveBeenCalledWith(
        'nico@test.com',
        expect.any(String),
      );
    });
  });

  // ── resetPassword ──────────────────────────────────────────────────────────

  describe('resetPassword', () => {
    it('throws BadRequestException when token not found', async () => {
      mockUsersService.findByResetToken.mockResolvedValue(null);
      await expect(service.resetPassword('bad-token', 'newpwd')).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when token missing expiry', async () => {
      mockUsersService.findByResetToken.mockResolvedValue({ ...mockUser, resetTokenExpiry: null });
      await expect(service.resetPassword('tok', 'newpwd')).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when token expired', async () => {
      mockUsersService.findByResetToken.mockResolvedValue({
        ...mockUser,
        resetTokenExpiry: new Date(Date.now() - 1000),
      });
      mockUsersService.clearResetToken.mockResolvedValue(undefined);
      await expect(service.resetPassword('tok', 'newpwd')).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when password too short', async () => {
      mockUsersService.findByResetToken.mockResolvedValue({
        ...mockUser,
        resetTokenExpiry: new Date(Date.now() + 60_000),
      });
      await expect(service.resetPassword('tok', 'abc')).rejects.toThrow(BadRequestException);
    });

    it('updates password and clears token on valid data', async () => {
      mockUsersService.findByResetToken.mockResolvedValue({
        ...mockUser,
        resetTokenExpiry: new Date(Date.now() + 60_000),
      });
      (bcrypt.hash as jest.Mock).mockResolvedValue('newhash');
      mockUsersService.updatePassword.mockResolvedValue(undefined);
      mockUsersService.clearResetToken.mockResolvedValue(undefined);

      const result = await service.resetPassword('tok', 'newpassword');
      expect(result.message).toContain('actualizada');
      expect(mockUsersService.updatePassword).toHaveBeenCalledWith('user-1', 'newhash');
      expect(mockUsersService.clearResetToken).toHaveBeenCalledWith('user-1');
    });
  });
});
