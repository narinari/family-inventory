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

// Mock the tag service
const mockGetTags = vi.fn();
const mockCreateTag = vi.fn();
const mockUpdateTag = vi.fn();
const mockDeleteTag = vi.fn();

vi.mock('../services/tag.service.js', () => ({
  getTags: (...args: unknown[]) => mockGetTags(...args),
  createTag: (...args: unknown[]) => mockCreateTag(...args),
  updateTag: (...args: unknown[]) => mockUpdateTag(...args),
  deleteTag: (...args: unknown[]) => mockDeleteTag(...args),
}));

import tagsRoutes from '../routes/tags.js';

describe('Tags API', () => {
  let app: express.Express;

  const mockUser = {
    id: 'test-uid',
    email: 'test@example.com',
    displayName: 'Test User',
    familyId: 'test-family',
    role: 'member',
  };

  const mockTag = {
    id: 'tag-1',
    familyId: 'test-family',
    name: '冬物',
    color: '#0000FF',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/tags', tagsRoutes);
  });

  describe('GET /tags', () => {
    it('should return list of tags', async () => {
      mockGetUserByUid.mockResolvedValue(mockUser);
      mockGetTags.mockResolvedValue([mockTag]);

      const response = await request(app).get('/tags');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.tags).toHaveLength(1);
    });

    it('should return 404 if user not found', async () => {
      mockGetUserByUid.mockResolvedValue(null);

      const response = await request(app).get('/tags');

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('USER_NOT_FOUND');
    });
  });

  describe('POST /tags', () => {
    it('should create new tag', async () => {
      mockGetUserByUid.mockResolvedValue(mockUser);
      mockCreateTag.mockResolvedValue(mockTag);

      const response = await request(app)
        .post('/tags')
        .send({ name: '冬物', color: '#0000FF' });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.tag.name).toBe('冬物');
    });

    it('should return 400 for invalid input', async () => {
      mockGetUserByUid.mockResolvedValue(mockUser);

      const response = await request(app)
        .post('/tags')
        .send({ name: '' });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('PUT /tags/:id', () => {
    it('should update tag', async () => {
      mockGetUserByUid.mockResolvedValue(mockUser);
      mockUpdateTag.mockResolvedValue({ ...mockTag, name: '夏物' });

      const response = await request(app)
        .put('/tags/tag-1')
        .send({ name: '夏物' });

      expect(response.status).toBe(200);
      expect(response.body.data.tag.name).toBe('夏物');
    });

    it('should return 404 if tag not found', async () => {
      mockGetUserByUid.mockResolvedValue(mockUser);
      mockUpdateTag.mockResolvedValue(null);

      const response = await request(app)
        .put('/tags/not-found')
        .send({ name: '夏物' });

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('TAG_NOT_FOUND');
    });
  });

  describe('DELETE /tags/:id', () => {
    it('should delete tag', async () => {
      mockGetUserByUid.mockResolvedValue(mockUser);
      mockDeleteTag.mockResolvedValue(true);

      const response = await request(app).delete('/tags/tag-1');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should return 404 if tag not found', async () => {
      mockGetUserByUid.mockResolvedValue(mockUser);
      mockDeleteTag.mockResolvedValue(false);

      const response = await request(app).delete('/tags/not-found');

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('TAG_NOT_FOUND');
    });
  });
});
