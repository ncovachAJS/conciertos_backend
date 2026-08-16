import { Test, TestingModule } from '@nestjs/testing';
import { ConcertsController } from './concerts.controller';
import { ConcertsService } from './concerts.service';

const mockConcertsService = {
  findAll: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
  tagFriend: jest.fn(),
  untagFriend: jest.fn(),
  findFriendsActivity: jest.fn(),
  getComments: jest.fn(),
  addComment: jest.fn(),
  deleteComment: jest.fn(),
};

describe('ConcertsController', () => {
  let controller: ConcertsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ConcertsController],
      providers: [{ provide: ConcertsService, useValue: mockConcertsService }],
    }).compile();

    controller = module.get<ConcertsController>(ConcertsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
