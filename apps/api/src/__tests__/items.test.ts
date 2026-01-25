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

// Mock the item service
const mockGetItems = vi.fn();
const mockGetItemWithRelatedTags = vi.fn();
const mockCreateItem = vi.fn();
const mockUpdateItem = vi.fn();
const mockConsumeItem = vi.fn();
const mockGiveItem = vi.fn();
const mockSellItem = vi.fn();
const mockGetItemLocation = vi.fn();

vi.mock('../services/item.service.js', () => ({
  getItems: (...args: unknown[]) => mockGetItems(...args),
  getItemWithRelatedTags: (...args: unknown[]) => mockGetItemWithRelatedTags(...args),
  createItem: (...args: unknown[]) => mockCreateItem(...args),
  updateItem: (...args: unknown[]) => mockUpdateItem(...args),
  consumeItem: (...args: unknown[]) => mockConsumeItem(...args),
  giveItem: (...args: unknown[]) => mockGiveItem(...args),
  sellItem: (...args: unknown[]) => mockSellItem(...args),
  getItemLocation: (...args: unknown[]) => mockGetItemLocation(...args),
}));

import itemsRoutes from '../routes/items.js';

describe('Items API', () => {
  let app: express.Express;

  const mockUser = {
    id: 'test-uid',
    email: 'test@example.com',
    displayName: 'Test User',
    familyId: 'test-family',
    role: 'member',
  };

  const mockItem = {
    id: 'item-1',
    familyId: 'test-family',
    itemTypeId: 'item-type-1',
    ownerId: 'test-uid',
    status: 'owned',
    tags: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/items', itemsRoutes);
  });

  describe('GET /items', () => {
    it('should return list of items', async () => {
      mockGetUserByUid.mockResolvedValue(mockUser);
      mockGetItems.mockResolvedValue([mockItem]);

      const response = await request(app).get('/items');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.items).toHaveLength(1);
    });

    it('should filter items by status', async () => {
      mockGetUserByUid.mockResolvedValue(mockUser);
      mockGetItems.mockResolvedValue([mockItem]);

      const response = await request(app).get('/items?status=owned');

      expect(response.status).toBe(200);
      expect(mockGetItems).toHaveBeenCalledWith('test-family', expect.objectContaining({ status: 'owned' }));
    });
  });

  describe('GET /items/:id', () => {
    it('should return item by id', async () => {
      mockGetUserByUid.mockResolvedValue(mockUser);
      mockGetItemWithRelatedTags.mockResolvedValue({ item: mockItem, relatedTags: {} });

      const response = await request(app).get('/items/item-1');

      expect(response.status).toBe(200);
      expect(response.body.data.item.id).toBe('item-1');
    });

    it('should return 404 if item not found', async () => {
      mockGetUserByUid.mockResolvedValue(mockUser);
      mockGetItemWithRelatedTags.mockResolvedValue(null);

      const response = await request(app).get('/items/not-found');

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('ITEM_NOT_FOUND');
    });
  });

  describe('POST /items', () => {
    it('should create new item', async () => {
      mockGetUserByUid.mockResolvedValue(mockUser);
      mockCreateItem.mockResolvedValue(mockItem);

      const response = await request(app)
        .post('/items')
        .send({ itemTypeId: 'item-type-1' });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
    });

    it('should return 400 for invalid input', async () => {
      mockGetUserByUid.mockResolvedValue(mockUser);

      const response = await request(app)
        .post('/items')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('PUT /items/:id', () => {
    it('should update item', async () => {
      mockGetUserByUid.mockResolvedValue(mockUser);
      mockUpdateItem.mockResolvedValue({ ...mockItem, memo: '更新メモ' });

      const response = await request(app)
        .put('/items/item-1')
        .send({ memo: '更新メモ' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /items/:id/consume', () => {
    it('should consume item', async () => {
      mockGetUserByUid.mockResolvedValue(mockUser);
      mockConsumeItem.mockResolvedValue({ ...mockItem, status: 'consumed' });

      const response = await request(app).post('/items/item-1/consume');

      expect(response.status).toBe(200);
      expect(response.body.data.item.status).toBe('consumed');
    });

    it('should return 400 if item status is invalid', async () => {
      mockGetUserByUid.mockResolvedValue(mockUser);
      mockConsumeItem.mockRejectedValue(new Error('INVALID_STATUS'));

      const response = await request(app).post('/items/item-1/consume');

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_STATUS');
    });
  });

  describe('POST /items/:id/give', () => {
    it('should give item', async () => {
      mockGetUserByUid.mockResolvedValue(mockUser);
      mockGiveItem.mockResolvedValue({ ...mockItem, status: 'given', givenTo: '友人' });

      const response = await request(app)
        .post('/items/item-1/give')
        .send({ givenTo: '友人' });

      expect(response.status).toBe(200);
      expect(response.body.data.item.status).toBe('given');
    });

    it('should return 400 if givenTo is missing', async () => {
      mockGetUserByUid.mockResolvedValue(mockUser);

      const response = await request(app)
        .post('/items/item-1/give')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /items/:id/sell', () => {
    it('should sell item', async () => {
      mockGetUserByUid.mockResolvedValue(mockUser);
      mockSellItem.mockResolvedValue({ ...mockItem, status: 'sold', soldPrice: 1000 });

      const response = await request(app)
        .post('/items/item-1/sell')
        .send({ soldPrice: 1000 });

      expect(response.status).toBe(200);
      expect(response.body.data.item.status).toBe('sold');
    });
  });

  describe('GET /items/:id/location', () => {
    it('should return item location', async () => {
      mockGetUserByUid.mockResolvedValue(mockUser);
      mockGetItemLocation.mockResolvedValue({
        item: mockItem,
        itemType: { id: 'item-type-1', name: 'テスト' },
        box: { id: 'box-1', name: 'ボックス1' },
        location: { id: 'loc-1', name: '納戸' },
      });

      const response = await request(app).get('/items/item-1/location');

      expect(response.status).toBe(200);
      expect(response.body.data.box.name).toBe('ボックス1');
      expect(response.body.data.location.name).toBe('納戸');
    });
  });
});
