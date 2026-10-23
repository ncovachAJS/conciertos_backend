import { ExecutionContext, ForbiddenException, NotFoundException } from '@nestjs/common';

import { AdminGuard } from './admin.guard';
import { AdminService } from './admin.service';

const ctx = (userId?: string) =>
  ({
    switchToHttp: () => ({ getRequest: () => ({ user: { id: userId } }) }),
  }) as unknown as ExecutionContext;

describe('AdminGuard', () => {
  const prisma: any = { user: { findUnique: jest.fn() } };
  const guard = new AdminGuard(prisma);

  it('deja pasar a un admin', async () => {
    prisma.user.findUnique.mockResolvedValue({ isAdmin: true });
    await expect(guard.canActivate(ctx('u1'))).resolves.toBe(true);
  });

  it('rechaza a un usuario normal', async () => {
    prisma.user.findUnique.mockResolvedValue({ isAdmin: false });
    await expect(guard.canActivate(ctx('u1'))).rejects.toThrow(ForbiddenException);
  });

  it('rechaza si el usuario no existe', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(guard.canActivate(ctx('u1'))).rejects.toThrow(ForbiddenException);
  });
});

describe('AdminService', () => {
  const prisma: any = {
    user: { findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    deviceToken: { count: jest.fn(), findMany: jest.fn() },
  };
  const notifications: any = { broadcast: jest.fn() };
  const service = new AdminService(prisma, notifications);

  beforeEach(() => jest.clearAllMocks());

  it('broadcast filtra por audiencia Pro y limpia el texto', async () => {
    prisma.user.findMany.mockResolvedValue([{ id: 'a' }, { id: 'b' }]);
    prisma.deviceToken.count.mockResolvedValue(3);
    notifications.broadcast.mockResolvedValue({ recipients: 2, devices: 3 });

    const res = await service.broadcast('admin', {
      title: ' Novedad ',
      body: ' Hay versión nueva ',
      audience: 'pro',
    });

    expect(prisma.user.findMany).toHaveBeenCalledWith({
      where: { isPro: true },
      select: { id: true },
    });
    expect(notifications.broadcast).toHaveBeenCalledWith({
      senderId: 'admin',
      userIds: ['a', 'b'],
      title: 'Novedad',
      body: 'Hay versión nueva',
      inApp: true,
      onlyTokens: undefined,
    });
    expect(res).toEqual({ recipients: 2, devices: 3 });
  });

  it('con maxBuild solo apunta a dispositivos antiguos o sin versión', async () => {
    prisma.deviceToken.findMany.mockResolvedValue([
      { token: 't1', userId: 'a' },
      { token: 't2', userId: 'a' },
      { token: 't3', userId: 'b' },
    ]);
    notifications.broadcast.mockResolvedValue({ recipients: 2, devices: 3 });

    await service.broadcast('admin', {
      title: 'x',
      body: 'y',
      audience: 'all',
      maxBuild: 24,
    });

    expect(prisma.deviceToken.findMany).toHaveBeenCalledWith({
      where: { user: {}, OR: [{ appBuild: null }, { appBuild: { lt: 24 } }] },
      select: { token: true, userId: true },
    });
    expect(notifications.broadcast).toHaveBeenCalledWith(
      expect.objectContaining({
        userIds: ['a', 'b'],
        onlyTokens: ['t1', 't2', 't3'],
      }),
    );
  });

  it('pasa el destino del aviso como data', async () => {
    prisma.user.findMany.mockResolvedValue([{ id: 'a' }]);
    prisma.deviceToken.count.mockResolvedValue(1);
    notifications.broadcast.mockResolvedValue({ recipients: 1, devices: 1 });

    await service.broadcast('admin', {
      title: 'x',
      body: 'y',
      audience: 'all',
      target: 'store',
    });

    expect(notifications.broadcast).toHaveBeenCalledWith(
      expect.objectContaining({ data: { target: 'store' } }),
    );
  });

  it('la vista previa no envía nada', async () => {
    prisma.deviceToken.findMany.mockResolvedValue([{ token: 't1', userId: 'a' }]);
    const res = await service.previewBroadcast('all', 24);
    expect(res).toEqual({ recipients: 1, devices: 1 });
    expect(notifications.broadcast).not.toHaveBeenCalled();
  });

  it('setPro lanza 404 si el usuario no existe', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(service.setPro('admin', 'x', true)).rejects.toThrow(NotFoundException);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});
