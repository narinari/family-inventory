import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';

// Mock the auth middleware
vi.mock('../middleware/auth.js', () => ({
  authenticateToken: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    req.authUser = {
      uid: 'test-uid',
      email: 'test@example.com',
      emailVerified: true,
    };
    next();
  },
}));

// Mock the auth service
const mockGetUserByUid = vi.fn();
vi.mock('../services/auth.service.js', () => ({
  getUserByUid: (...args: unknown[]) => mockGetUserByUid(...args),
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

import itemTypesRoutes from '../routes/item-types.js';

describe('Item Types API', () => {
  let app: express.Express;

  const mockUser = {
    id: 'test-uid',
    email: 'test@example.com',
    displayName: 'Test User',
    familyId: 'test-family',
    role: 'member',
  };

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
    app = express();
    app.use(express.json());
    app.use('/item-types', itemTypesRoutes);
  });

  describe('GET /item-types', () => {
    it('should return list of item types', async () => {
      mockGetUserByUid.mockResolvedValue(mockUser);
      mockGetItemTypes.mockResolvedValue([mockItemType]);

      const response = await request(app).get('/item-types');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.itemTypes).toHaveLength(1);
      expect(mockGetItemTypes).toHaveBeenCalledWith('test-family');
    });

    it('should return 404 if user not found', async () => {
      mockGetUserByUid.mockResolvedValue(null);

      const response = await request(app).get('/item-types');

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('USER_NOT_FOUND');
    });
  });

  describe('POST /item-types', () => {
    it('should create new item type', async () => {
      mockGetUserByUid.mockResolvedValue(mockUser);
      mockCreateItemType.mockResolvedValue(mockItemType);

      const response = await request(app)
        .post('/item-types')
        .send({ name: 'テスト種別', manufacturer: 'テストメーカー' });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.itemType.name).toBe('テスト種別');
    });

    it('should return 400 for invalid input', async () => {
      mockGetUserByUid.mockResolvedValue(mockUser);

      const response = await request(app)
        .post('/item-types')
        .send({ name: '' });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('PUT /item-types/:id', () => {
    it('should update item type', async () => {
      mockGetUserByUid.mockResolvedValue(mockUser);
      mockUpdateItemType.mockResolvedValue({ ...mockItemType, name: '更新種別' });

      const response = await request(app)
        .put('/item-types/item-type-1')
        .send({ name: '更新種別' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.itemType.name).toBe('更新種別');
    });

    it('should return 404 if item type not found', async () => {
      mockGetUserByUid.mockResolvedValue(mockUser);
      mockUpdateItemType.mockResolvedValue(null);

      const response = await request(app)
        .put('/item-types/not-found')
        .send({ name: '更新種別' });

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('ITEM_TYPE_NOT_FOUND');
    });
  });

  describe('DELETE /item-types/:id', () => {
    it('should delete item type', async () => {
      mockGetUserByUid.mockResolvedValue(mockUser);
      mockIsItemTypeInUse.mockResolvedValue(false);
      mockDeleteItemType.mockResolvedValue(true);

      const response = await request(app).delete('/item-types/item-type-1');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should return 400 if item type is in use', async () => {
      mockGetUserByUid.mockResolvedValue(mockUser);
      mockIsItemTypeInUse.mockResolvedValue(true);

      const response = await request(app).delete('/item-types/item-type-1');

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('ITEM_TYPE_IN_USE');
    });

    it('should return 404 if item type not found', async () => {
      mockGetUserByUid.mockResolvedValue(mockUser);
      mockIsItemTypeInUse.mockResolvedValue(false);
      mockDeleteItemType.mockResolvedValue(false);

      const response = await request(app).delete('/item-types/not-found');

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('ITEM_TYPE_NOT_FOUND');
    });
  });
});
