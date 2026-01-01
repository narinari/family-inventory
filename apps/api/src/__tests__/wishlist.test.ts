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

// Mock the wishlist service
const mockGetWishlistItems = vi.fn();
const mockGetWishlistById = vi.fn();
const mockCreateWishlistItem = vi.fn();
const mockUpdateWishlistItem = vi.fn();
const mockPurchaseWishlistItem = vi.fn();
const mockCancelWishlistItem = vi.fn();

vi.mock('../services/wishlist.service.js', () => ({
  getWishlistItems: (...args: unknown[]) => mockGetWishlistItems(...args),
  getWishlistById: (...args: unknown[]) => mockGetWishlistById(...args),
  createWishlistItem: (...args: unknown[]) => mockCreateWishlistItem(...args),
  updateWishlistItem: (...args: unknown[]) => mockUpdateWishlistItem(...args),
  purchaseWishlistItem: (...args: unknown[]) => mockPurchaseWishlistItem(...args),
  cancelWishlistItem: (...args: unknown[]) => mockCancelWishlistItem(...args),
}));

import wishlistRoutes from '../routes/wishlist.js';

describe('Wishlist API', () => {
  let app: express.Express;

  const mockUser = {
    id: 'test-uid',
    email: 'test@example.com',
    displayName: 'Test User',
    familyId: 'test-family',
    role: 'member',
  };

  const mockWishlistItem = {
    id: 'wish-1',
    familyId: 'test-family',
    name: '電動ドライバー',
    requesterId: 'test-uid',
    priority: 'high',
    status: 'pending',
    tags: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/wishlist', wishlistRoutes);
  });

  describe('GET /wishlist', () => {
    it('should return list of wishlist items', async () => {
      mockGetUserByUid.mockResolvedValue(mockUser);
      mockGetWishlistItems.mockResolvedValue([mockWishlistItem]);

      const response = await request(app).get('/wishlist');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.wishlist).toHaveLength(1);
    });

    it('should filter by status', async () => {
      mockGetUserByUid.mockResolvedValue(mockUser);
      mockGetWishlistItems.mockResolvedValue([mockWishlistItem]);

      const response = await request(app).get('/wishlist?status=pending');

      expect(response.status).toBe(200);
      expect(mockGetWishlistItems).toHaveBeenCalledWith('test-family', expect.objectContaining({ status: 'pending' }));
    });
  });

  describe('GET /wishlist/:id', () => {
    it('should return wishlist item by id', async () => {
      mockGetUserByUid.mockResolvedValue(mockUser);
      mockGetWishlistById.mockResolvedValue(mockWishlistItem);

      const response = await request(app).get('/wishlist/wish-1');

      expect(response.status).toBe(200);
      expect(response.body.data.wishlist.id).toBe('wish-1');
    });

    it('should return 404 if not found', async () => {
      mockGetUserByUid.mockResolvedValue(mockUser);
      mockGetWishlistById.mockResolvedValue(null);

      const response = await request(app).get('/wishlist/not-found');

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('WISHLIST_NOT_FOUND');
    });
  });

  describe('POST /wishlist', () => {
    it('should create new wishlist item', async () => {
      mockGetUserByUid.mockResolvedValue(mockUser);
      mockCreateWishlistItem.mockResolvedValue(mockWishlistItem);

      const response = await request(app)
        .post('/wishlist')
        .send({ name: '電動ドライバー', priority: 'high' });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.wishlist.name).toBe('電動ドライバー');
    });

    it('should return 400 for invalid input', async () => {
      mockGetUserByUid.mockResolvedValue(mockUser);

      const response = await request(app)
        .post('/wishlist')
        .send({ name: '' });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('PUT /wishlist/:id', () => {
    it('should update wishlist item', async () => {
      mockGetUserByUid.mockResolvedValue(mockUser);
      mockUpdateWishlistItem.mockResolvedValue({ ...mockWishlistItem, priority: 'low' });

      const response = await request(app)
        .put('/wishlist/wish-1')
        .send({ priority: 'low' });

      expect(response.status).toBe(200);
      expect(response.body.data.wishlist.priority).toBe('low');
    });

    it('should return 404 if not found', async () => {
      mockGetUserByUid.mockResolvedValue(mockUser);
      mockUpdateWishlistItem.mockResolvedValue(null);

      const response = await request(app)
        .put('/wishlist/not-found')
        .send({ priority: 'low' });

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('WISHLIST_NOT_FOUND');
    });
  });

  describe('POST /wishlist/:id/purchase', () => {
    it('should purchase and create item', async () => {
      mockGetUserByUid.mockResolvedValue(mockUser);
      mockPurchaseWishlistItem.mockResolvedValue({
        wishlist: { ...mockWishlistItem, status: 'purchased' },
        item: { id: 'item-1', status: 'owned' },
      });

      const response = await request(app).post('/wishlist/wish-1/purchase');

      expect(response.status).toBe(200);
      expect(response.body.data.wishlist.status).toBe('purchased');
      expect(response.body.data.item).toBeDefined();
    });

    it('should return 404 if not found', async () => {
      mockGetUserByUid.mockResolvedValue(mockUser);
      mockPurchaseWishlistItem.mockResolvedValue(null);

      const response = await request(app).post('/wishlist/not-found/purchase');

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('WISHLIST_NOT_FOUND');
    });

    it('should return 400 if status is invalid', async () => {
      mockGetUserByUid.mockResolvedValue(mockUser);
      mockPurchaseWishlistItem.mockRejectedValue(new Error('INVALID_STATUS'));

      const response = await request(app).post('/wishlist/wish-1/purchase');

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_STATUS');
    });
  });

  describe('POST /wishlist/:id/cancel', () => {
    it('should cancel wishlist item', async () => {
      mockGetUserByUid.mockResolvedValue(mockUser);
      mockCancelWishlistItem.mockResolvedValue({ ...mockWishlistItem, status: 'cancelled' });

      const response = await request(app).post('/wishlist/wish-1/cancel');

      expect(response.status).toBe(200);
      expect(response.body.data.wishlist.status).toBe('cancelled');
    });

    it('should return 400 if status is invalid', async () => {
      mockGetUserByUid.mockResolvedValue(mockUser);
      mockCancelWishlistItem.mockRejectedValue(new Error('INVALID_STATUS'));

      const response = await request(app).post('/wishlist/wish-1/cancel');

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_STATUS');
    });
  });
});
