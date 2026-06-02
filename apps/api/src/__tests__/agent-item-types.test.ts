import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';

// Mock the auth middleware to use agent auth
vi.mock('../middleware/auth.js', () => ({
  authenticateAgent: (
    req: express.Request,
    _res: express.Response,
    next: express.NextFunction
  ) => {
    req.agentActor = { actorId: 'test-actor' };
    next();
  },
}));

// Mock getAgentMapping
const mockGetAgentMapping = vi.fn();
vi.mock('../services/agent.service.js', () => ({
  getAgentMapping: (...args: unknown[]) => mockGetAgentMapping(...args),
}));

// Mock the item-type service
const mockGetItemTypes = vi.fn();
const mockGetItemTypeById = vi.fn();
const mockCreateItemType = vi.fn();
const mockUpdateItemType = vi.fn();
const mockDeleteItemType = vi.fn();
const mockIsItemTypeInUse = vi.fn();

vi.mock('../services/item-type.service.js', () => ({
  getItemTypes: (...args: unknown[]) => mockGetItemTypes(...args),
  getItemTypeById: (...args: unknown[]) => mockGetItemTypeById(...args),
  createItemType: (...args: unknown[]) => mockCreateItemType(...args),
  updateItemType: (...args: unknown[]) => mockUpdateItemType(...args),
  deleteItemType: (...args: unknown[]) => mockDeleteItemType(...args),
  isItemTypeInUse: (...args: unknown[]) => mockIsItemTypeInUse(...args),
}));

import agentRouter from '../routes/agent/index.js';

describe('Agent Item Types API', () => {
  let app: express.Express;

  const mockActor = { actorId: 'test-actor', familyId: 'test-family', userId: 'test-uid' };

  const mockItemType = {
    id: 'item-type-1',
    familyId: 'test-family',
    name: 'テスト種別',
    manufacturer: 'テストメーカー',
    description: 'テスト説明',
    tags: ['tag1'],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAgentMapping.mockResolvedValue(mockActor);
    app = express();
    app.use(express.json());
    app.use('/agent', agentRouter);
  });

  describe('GET /agent/item-types', () => {
    it('should return list of item types', async () => {
      mockGetItemTypes.mockResolvedValue([mockItemType]);

      const response = await request(app).get('/agent/item-types');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.itemTypes).toHaveLength(1);
      expect(mockGetItemTypes).toHaveBeenCalledWith('test-family');
    });
  });

  describe('POST /agent/item-types', () => {
    it('should create new item type', async () => {
      mockCreateItemType.mockResolvedValue(mockItemType);

      const response = await request(app)
        .post('/agent/item-types')
        .send({ name: 'テスト種別', manufacturer: 'テストメーカー' });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.itemType.name).toBe('テスト種別');
    });

    it('should return 400 for invalid input', async () => {
      const response = await request(app)
        .post('/agent/item-types')
        .send({ name: '' });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('PUT /agent/item-types/:id', () => {
    it('should update item type', async () => {
      mockUpdateItemType.mockResolvedValue({ ...mockItemType, name: '更新種別' });

      const response = await request(app)
        .put('/agent/item-types/item-type-1')
        .send({ name: '更新種別' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.itemType.name).toBe('更新種別');
    });

    it('should return 404 if item type not found', async () => {
      mockUpdateItemType.mockResolvedValue(null);

      const response = await request(app)
        .put('/agent/item-types/not-found')
        .send({ name: '更新種別' });

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('ITEM_TYPE_NOT_FOUND');
    });
  });
});
