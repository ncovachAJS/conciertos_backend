import { Test, TestingModule } from '@nestjs/testing';
import { FriendsController } from './friends.controller';
import { FriendsService } from './friends.service';

const mockFriendsService = {
  getFriends: jest.fn(),
  getPendingRequests: jest.fn(),
  searchUsers: jest.fn(),
  getFriendStats: jest.fn(),
  getFriendUpcomingConcerts: jest.fn(),
  getFriendAllConcerts: jest.fn(),
  sendRequest: jest.fn(),
  acceptRequest: jest.fn(),
  removeRequest: jest.fn(),
};

const mockReq = { user: { id: 'u1' } };

describe('FriendsController', () => {
  let controller: FriendsController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FriendsController],
      providers: [{ provide: FriendsService, useValue: mockFriendsService }],
    }).compile();
    controller = module.get<FriendsController>(FriendsController);
  });

  it('should be defined', () => expect(controller).toBeDefined());

  it('getFriends delegates with userId', async () => {
    mockFriendsService.getFriends.mockResolvedValue([]);
    await controller.getFriends(mockReq);
    expect(mockFriendsService.getFriends).toHaveBeenCalledWith('u1');
  });

  it('getPending delegates with userId', async () => {
    mockFriendsService.getPendingRequests.mockResolvedValue([]);
    await controller.getPending(mockReq);
    expect(mockFriendsService.getPendingRequests).toHaveBeenCalledWith('u1');
  });

  it('search delegates with userId + query', async () => {
    mockFriendsService.searchUsers.mockResolvedValue([]);
    await controller.search(mockReq, 'Ana');
    expect(mockFriendsService.searchUsers).toHaveBeenCalledWith('u1', 'Ana');
  });

  it('getFriendStats delegates with userId + friendId', async () => {
    mockFriendsService.getFriendStats.mockResolvedValue({ totalConcerts: 0 });
    await controller.getFriendStats(mockReq, 'u2');
    expect(mockFriendsService.getFriendStats).toHaveBeenCalledWith('u1', 'u2');
  });

  it('getFriendUpcomingConcerts delegates correctly', async () => {
    mockFriendsService.getFriendUpcomingConcerts.mockResolvedValue([]);
    await controller.getFriendUpcomingConcerts(mockReq, 'u2');
    expect(mockFriendsService.getFriendUpcomingConcerts).toHaveBeenCalledWith('u1', 'u2');
  });

  it('getFriendAllConcerts delegates correctly', async () => {
    mockFriendsService.getFriendAllConcerts.mockResolvedValue([]);
    await controller.getFriendAllConcerts(mockReq, 'u2');
    expect(mockFriendsService.getFriendAllConcerts).toHaveBeenCalledWith('u1', 'u2');
  });

  it('sendRequest delegates with senderId + receiverId', async () => {
    mockFriendsService.sendRequest.mockResolvedValue({ id: 'fs1' });
    await controller.sendRequest(mockReq, 'u2');
    expect(mockFriendsService.sendRequest).toHaveBeenCalledWith('u1', 'u2');
  });

  it('acceptRequest delegates with userId + friendshipId', async () => {
    mockFriendsService.acceptRequest.mockResolvedValue({ id: 'fs1' });
    await controller.acceptRequest(mockReq, 'fs1');
    expect(mockFriendsService.acceptRequest).toHaveBeenCalledWith('u1', 'fs1');
  });

  it('remove delegates with userId + friendshipId', async () => {
    mockFriendsService.removeRequest.mockResolvedValue({ id: 'fs1' });
    await controller.remove(mockReq, 'fs1');
    expect(mockFriendsService.removeRequest).toHaveBeenCalledWith('u1', 'fs1');
  });
});
