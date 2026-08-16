import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

const mockAuthService = {
  register: jest.fn(),
  login: jest.fn(),
  me: jest.fn(),
  forgotPassword: jest.fn(),
  resetPassword: jest.fn(),
};

const mockUser = { id: 'u1', name: 'Nico', email: 'nico@test.com', avatarUrl: null, isPro: false, memberNumber: 1 };

describe('AuthController', () => {
  let controller: AuthController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    }).compile();
    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => expect(controller).toBeDefined());

  describe('register', () => {
    it('delegates to authService.register', async () => {
      mockAuthService.register.mockResolvedValue({ token: 't', user: mockUser });
      const result = await controller.register({ name: 'Nico', email: 'nico@test.com', password: '123456' });
      expect(result.token).toBe('t');
      expect(mockAuthService.register).toHaveBeenCalledWith({ name: 'Nico', email: 'nico@test.com', password: '123456' });
    });
  });

  describe('login', () => {
    it('delegates to authService.login with email+password', async () => {
      mockAuthService.login.mockResolvedValue({ token: 't2', user: mockUser });
      const result = await controller.login({ email: 'nico@test.com', password: '123456' });
      expect(result.token).toBe('t2');
      expect(mockAuthService.login).toHaveBeenCalledWith('nico@test.com', '123456');
    });
  });

  describe('me', () => {
    it('delegates to authService.me with userId from req', async () => {
      mockAuthService.me.mockResolvedValue(mockUser);
      const req = { user: { id: 'u1' } };
      const result = await controller.me(req);
      expect(result).toEqual(mockUser);
      expect(mockAuthService.me).toHaveBeenCalledWith('u1');
    });
  });

  describe('forgotPassword', () => {
    it('delegates to authService.forgotPassword', async () => {
      mockAuthService.forgotPassword.mockResolvedValue({ message: 'Si el email existe, recibirás un enlace.' });
      const result = await controller.forgotPassword('nico@test.com');
      expect(result.message).toContain('Si el email existe');
    });
  });

  describe('resetPassword', () => {
    it('delegates to authService.resetPassword', async () => {
      mockAuthService.resetPassword.mockResolvedValue({ message: 'Contraseña actualizada correctamente' });
      const result = await controller.resetPassword('tok', 'newpwd');
      expect(result.message).toContain('actualizada');
    });
  });

  describe('resetPage', () => {
    it('returns 400 for invalid token', () => {
      const res = { status: jest.fn().mockReturnThis(), send: jest.fn() } as any;
      controller.resetPage('not-hex', res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('returns HTML for valid 64-char hex token', () => {
      const validToken = 'a'.repeat(64);
      const res = { setHeader: jest.fn(), send: jest.fn() } as any;
      controller.resetPage(validToken, res);
      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/html');
      expect(res.send).toHaveBeenCalled();
    });

    it('returns 400 when token is missing', () => {
      const res = { status: jest.fn().mockReturnThis(), send: jest.fn() } as any;
      controller.resetPage('', res);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });
});
