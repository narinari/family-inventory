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

// Mock the box service
const mockGetBoxes = vi.fn();
const mockGetBoxById = vi.fn();
const mockCreateBox = vi.fn();
const mockUpdateBox = vi.fn();
const mockDeleteBox = vi.fn();
const mockIsBoxInUse = vi.fn();
const mockGetBoxItems = vi.fn();

vi.mock('../services/box.service.js', () => ({
  getBoxes: (...args: unknown[]) => mockGetBoxes(...args),
  getBoxById: (...args: unknown[]) => mockGetBoxById(...args),
  createBox: (...args: unknown[]) => mockCreateBox(...args),
  updateBox: (...args: unknown[]) => mockUpdateBox(...args),
  deleteBox: (...args: unknown[]) => mockDeleteBox(...args),
  isBoxInUse: (...args: unknown[]) => mockIsBoxInUse(...args),
  getBoxItems: (...args: unknown[]) => mockGetBoxItems(...args),
}));

import boxesRoutes from '../routes/boxes.js';

describe('Boxes API', () => {
  let app: express.Express;

  const mockUser = {
    id: 'test-uid',
    email: 'test@example.com',
    displayName: 'Test User',
    familyId: 'test-family',
    role: 'member',
  };

  const mockBox = {
    id: 'box-1',
    familyId: 'test-family',
    name: 'テストボックス',
    locationId: 'loc-1',
    description: 'テスト説明',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/boxes', boxesRoutes);
  });

  describe('GET /boxes', () => {
    it('should return list of boxes', async () => {
      mockGetUserByUid.mockResolvedValue(mockUser);
      mockGetBoxes.mockResolvedValue([mockBox]);

      const response = await request(app).get('/boxes');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.boxes).toHaveLength(1);
    });
  });

  describe('POST /boxes', () => {
    it('should create new box', async () => {
      mockGetUserByUid.mockResolvedValue(mockUser);
      mockCreateBox.mockResolvedValue(mockBox);

      const response = await request(app)
        .post('/boxes')
        .send({ name: 'テストボックス' });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.box.name).toBe('テストボックス');
    });

    it('should return 400 for invalid input', async () => {
      mockGetUserByUid.mockResolvedValue(mockUser);

      const response = await request(app)
        .post('/boxes')
        .send({ name: '' });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('PUT /boxes/:id', () => {
    it('should update box', async () => {
      mockGetUserByUid.mockResolvedValue(mockUser);
      mockUpdateBox.mockResolvedValue({ ...mockBox, name: '更新ボックス' });

      const response = await request(app)
        .put('/boxes/box-1')
        .send({ name: '更新ボックス' });

      expect(response.status).toBe(200);
      expect(response.body.data.box.name).toBe('更新ボックス');
    });

    it('should return 404 if box not found', async () => {
      mockGetUserByUid.mockResolvedValue(mockUser);
      mockUpdateBox.mockResolvedValue(null);

      const response = await request(app)
        .put('/boxes/not-found')
        .send({ name: '更新ボックス' });

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('BOX_NOT_FOUND');
    });
  });

  describe('DELETE /boxes/:id', () => {
    it('should delete box', async () => {
      mockGetUserByUid.mockResolvedValue(mockUser);
      mockIsBoxInUse.mockResolvedValue(false);
      mockDeleteBox.mockResolvedValue(true);

      const response = await request(app).delete('/boxes/box-1');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should return 400 if box is in use', async () => {
      mockGetUserByUid.mockResolvedValue(mockUser);
      mockIsBoxInUse.mockResolvedValue(true);

      const response = await request(app).delete('/boxes/box-1');

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('BOX_IN_USE');
    });

    it('should return 404 if box not found', async () => {
      mockGetUserByUid.mockResolvedValue(mockUser);
      mockIsBoxInUse.mockResolvedValue(false);
      mockDeleteBox.mockResolvedValue(false);

      const response = await request(app).delete('/boxes/not-found');

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('BOX_NOT_FOUND');
    });
  });

  describe('GET /boxes/:id/items', () => {
    it('should return items in box', async () => {
      mockGetUserByUid.mockResolvedValue(mockUser);
      mockGetBoxById.mockResolvedValue(mockBox);
      mockGetBoxItems.mockResolvedValue([{ id: 'item-1', status: 'owned' }]);

      const response = await request(app).get('/boxes/box-1/items');

      expect(response.status).toBe(200);
      expect(response.body.data.box).toBeDefined();
      expect(response.body.data.items).toHaveLength(1);
    });

    it('should return 404 if box not found', async () => {
      mockGetUserByUid.mockResolvedValue(mockUser);
      mockGetBoxById.mockResolvedValue(null);

      const response = await request(app).get('/boxes/not-found/items');

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('BOX_NOT_FOUND');
    });
  });
});
