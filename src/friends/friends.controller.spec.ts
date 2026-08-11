import { Test, TestingModule } from '@nestjs/testing';
import { FriendsController } from './friends.controller';
import { FriendsService } from './friends.service';

const mockFriendsService = {
  searchUsers: jest.fn(),
  sendRequest: jest.fn(),
  acceptRequest: jest.fn(),
  declineRequest: jest.fn(),
  remove: jest.fn(),
  findAll: jest.fn(),
  findPending: jest.fn(),
  areFriends: jest.fn(),
};

describe('FriendsController', () => {
  let controller: FriendsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FriendsController],
      providers: [{ provide: FriendsService, useValue: mockFriendsService }],
    }).compile();

    controller = module.get<FriendsController>(FriendsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
