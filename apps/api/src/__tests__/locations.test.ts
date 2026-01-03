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

// Mock the location service
const mockGetLocations = vi.fn();
const mockGetLocationById = vi.fn();
const mockCreateLocation = vi.fn();
const mockUpdateLocation = vi.fn();
const mockDeleteLocation = vi.fn();
const mockIsLocationInUse = vi.fn();
const mockGetLocationBoxes = vi.fn();

vi.mock('../services/location.service.js', () => ({
  getLocations: (...args: unknown[]) => mockGetLocations(...args),
  getLocationById: (...args: unknown[]) => mockGetLocationById(...args),
  createLocation: (...args: unknown[]) => mockCreateLocation(...args),
  updateLocation: (...args: unknown[]) => mockUpdateLocation(...args),
  deleteLocation: (...args: unknown[]) => mockDeleteLocation(...args),
  isLocationInUse: (...args: unknown[]) => mockIsLocationInUse(...args),
  getLocationBoxes: (...args: unknown[]) => mockGetLocationBoxes(...args),
}));

import locationsRoutes from '../routes/locations.js';

describe('Locations API', () => {
  let app: express.Express;

  const mockUser = {
    id: 'test-uid',
    email: 'test@example.com',
    displayName: 'Test User',
    familyId: 'test-family',
    role: 'member',
  };

  const mockLocation = {
    id: 'loc-1',
    familyId: 'test-family',
    name: '納戸',
    address: '自宅1階',
    description: '季節物置き場',
    tags: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/locations', locationsRoutes);
  });

  describe('GET /locations', () => {
    it('should return list of locations', async () => {
      mockGetUserByUid.mockResolvedValue(mockUser);
      mockGetLocations.mockResolvedValue([mockLocation]);

      const response = await request(app).get('/locations');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.locations).toHaveLength(1);
    });
  });

  describe('POST /locations', () => {
    it('should create new location', async () => {
      mockGetUserByUid.mockResolvedValue(mockUser);
      mockCreateLocation.mockResolvedValue(mockLocation);

      const response = await request(app)
        .post('/locations')
        .send({ name: '納戸' });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.location.name).toBe('納戸');
    });

    it('should return 400 for invalid input', async () => {
      mockGetUserByUid.mockResolvedValue(mockUser);

      const response = await request(app)
        .post('/locations')
        .send({ name: '' });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should create location with tags', async () => {
      mockGetUserByUid.mockResolvedValue(mockUser);
      const locationWithTags = { ...mockLocation, tags: ['tag-1', 'tag-2'] };
      mockCreateLocation.mockResolvedValue(locationWithTags);

      const response = await request(app)
        .post('/locations')
        .send({ name: '納戸', tags: ['tag-1', 'tag-2'] });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.location.tags).toEqual(['tag-1', 'tag-2']);
      expect(mockCreateLocation).toHaveBeenCalledWith(
        mockUser.familyId,
        expect.objectContaining({ tags: ['tag-1', 'tag-2'] })
      );
    });
  });

  describe('PUT /locations/:id', () => {
    it('should update location', async () => {
      mockGetUserByUid.mockResolvedValue(mockUser);
      mockUpdateLocation.mockResolvedValue({ ...mockLocation, name: 'ガレージ' });

      const response = await request(app)
        .put('/locations/loc-1')
        .send({ name: 'ガレージ' });

      expect(response.status).toBe(200);
      expect(response.body.data.location.name).toBe('ガレージ');
    });

    it('should return 404 if location not found', async () => {
      mockGetUserByUid.mockResolvedValue(mockUser);
      mockUpdateLocation.mockResolvedValue(null);

      const response = await request(app)
        .put('/locations/not-found')
        .send({ name: 'ガレージ' });

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('LOCATION_NOT_FOUND');
    });

    it('should update location with tags', async () => {
      mockGetUserByUid.mockResolvedValue(mockUser);
      const locationWithTags = { ...mockLocation, tags: ['tag-3'] };
      mockUpdateLocation.mockResolvedValue(locationWithTags);

      const response = await request(app)
        .put('/locations/loc-1')
        .send({ tags: ['tag-3'] });

      expect(response.status).toBe(200);
      expect(response.body.data.location.tags).toEqual(['tag-3']);
      expect(mockUpdateLocation).toHaveBeenCalledWith(
        mockUser.familyId,
        'loc-1',
        expect.objectContaining({ tags: ['tag-3'] })
      );
    });

    it('should clear tags with empty array', async () => {
      mockGetUserByUid.mockResolvedValue(mockUser);
      const locationWithEmptyTags = { ...mockLocation, tags: [] };
      mockUpdateLocation.mockResolvedValue(locationWithEmptyTags);

      const response = await request(app)
        .put('/locations/loc-1')
        .send({ tags: [] });

      expect(response.status).toBe(200);
      expect(response.body.data.location.tags).toEqual([]);
    });
  });

  describe('DELETE /locations/:id', () => {
    it('should delete location', async () => {
      mockGetUserByUid.mockResolvedValue(mockUser);
      mockIsLocationInUse.mockResolvedValue(false);
      mockDeleteLocation.mockResolvedValue(true);

      const response = await request(app).delete('/locations/loc-1');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should return 400 if location is in use', async () => {
      mockGetUserByUid.mockResolvedValue(mockUser);
      mockIsLocationInUse.mockResolvedValue(true);

      const response = await request(app).delete('/locations/loc-1');

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('LOCATION_IN_USE');
    });

    it('should return 404 if location not found', async () => {
      mockGetUserByUid.mockResolvedValue(mockUser);
      mockIsLocationInUse.mockResolvedValue(false);
      mockDeleteLocation.mockResolvedValue(false);

      const response = await request(app).delete('/locations/not-found');

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('LOCATION_NOT_FOUND');
    });
  });

  describe('GET /locations/:id/boxes', () => {
    it('should return boxes in location', async () => {
      mockGetUserByUid.mockResolvedValue(mockUser);
      mockGetLocationById.mockResolvedValue(mockLocation);
      mockGetLocationBoxes.mockResolvedValue([{ id: 'box-1', name: 'ボックス1' }]);

      const response = await request(app).get('/locations/loc-1/boxes');

      expect(response.status).toBe(200);
      expect(response.body.data.location).toBeDefined();
      expect(response.body.data.boxes).toHaveLength(1);
    });

    it('should return 404 if location not found', async () => {
      mockGetUserByUid.mockResolvedValue(mockUser);
      mockGetLocationById.mockResolvedValue(null);

      const response = await request(app).get('/locations/not-found/boxes');

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('LOCATION_NOT_FOUND');
    });
  });
});
