import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

const mockNotificationsService = {
  getAll: jest.fn(),
  getUnreadCount: jest.fn(),
  markRead: jest.fn(),
  markAllRead: jest.fn(),
  deleteOne: jest.fn(),
  deleteAll: jest.fn(),
  saveToken: jest.fn(),
  removeToken: jest.fn(),
};

const mockReq = { user: { id: 'u1' } };

describe('NotificationsController', () => {
  let controller: NotificationsController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [{ provide: NotificationsService, useValue: mockNotificationsService }],
    }).compile();
    controller = module.get<NotificationsController>(NotificationsController);
  });

  it('should be defined', () => expect(controller).toBeDefined());

  it('getAll delegates with userId', async () => {
    mockNotificationsService.getAll.mockResolvedValue([]);
    await controller.getAll(mockReq);
    expect(mockNotificationsService.getAll).toHaveBeenCalledWith('u1');
  });

  it('getUnreadCount delegates with userId', async () => {
    mockNotificationsService.getUnreadCount.mockResolvedValue({ count: 3 });
    const result = await controller.getUnreadCount(mockReq);
    expect(mockNotificationsService.getUnreadCount).toHaveBeenCalledWith('u1');
    expect(result).toEqual({ count: 3 });
  });

  it('markRead delegates with userId + notificationId', async () => {
    mockNotificationsService.markRead.mockResolvedValue({ id: 'n1', read: true });
    await controller.markRead(mockReq, 'n1');
    expect(mockNotificationsService.markRead).toHaveBeenCalledWith('u1', 'n1');
  });

  it('markAllRead delegates with userId', async () => {
    mockNotificationsService.markAllRead.mockResolvedValue({ count: 5 });
    await controller.markAllRead(mockReq);
    expect(mockNotificationsService.markAllRead).toHaveBeenCalledWith('u1');
  });

  it('deleteOne delegates with userId + notificationId', async () => {
    mockNotificationsService.deleteOne.mockResolvedValue({ id: 'n1' });
    await controller.deleteOne(mockReq, 'n1');
    expect(mockNotificationsService.deleteOne).toHaveBeenCalledWith('u1', 'n1');
  });

  it('deleteAll delegates with userId', async () => {
    mockNotificationsService.deleteAll.mockResolvedValue({ count: 10 });
    await controller.deleteAll(mockReq);
    expect(mockNotificationsService.deleteAll).toHaveBeenCalledWith('u1');
  });

  it('saveToken delegates with userId + token + platform', async () => {
    mockNotificationsService.saveToken.mockResolvedValue({});
    await controller.saveToken(mockReq, { token: 'fcm-token', platform: 'ios' });
    expect(mockNotificationsService.saveToken).toHaveBeenCalledWith('u1', 'fcm-token', 'ios');
  });

  it('removeToken delegates with token + userId', async () => {
    mockNotificationsService.removeToken.mockResolvedValue({});
    await controller.removeToken(mockReq, 'fcm-token');
    expect(mockNotificationsService.removeToken).toHaveBeenCalledWith('fcm-token', 'u1');
  });
});
