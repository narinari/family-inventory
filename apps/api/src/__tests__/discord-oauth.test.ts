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
const mockUpdateUserDiscordId = vi.fn();
const mockRemoveUserDiscordId = vi.fn();
const mockGetUserByDiscordId = vi.fn();

vi.mock('../services/auth.service.js', () => ({
  getUserByUid: (...args: unknown[]) => mockGetUserByUid(...args),
  updateUserDiscordId: (...args: unknown[]) => mockUpdateUserDiscordId(...args),
  removeUserDiscordId: (...args: unknown[]) => mockRemoveUserDiscordId(...args),
  getUserByDiscordId: (...args: unknown[]) => mockGetUserByDiscordId(...args),
  createInviteCode: vi.fn(),
  validateInviteCode: vi.fn(),
  useInviteCode: vi.fn(),
  getFamilyMembers: vi.fn(),
  getFamilyInviteCodes: vi.fn(),
  createUser: vi.fn(),
}));

// Import after mocking
import authRoutes from '../routes/auth.js';

describe('Discord OAuth2 Endpoints', () => {
  let app: express.Express;

  beforeEach(() => {
    vi.clearAllMocks();

    app = express();
    app.use(express.json());
    app.use('/auth', authRoutes);
  });

  describe('GET /auth/discord', () => {
    it('should return Discord OAuth URL for authenticated user', async () => {
      mockGetUserByUid.mockResolvedValue({
        id: 'test-uid',
        email: 'test@example.com',
        displayName: 'Test User',
        familyId: 'test-family',
        role: 'member',
        discordId: null,
      });

      const response = await request(app).get('/auth/discord');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.authUrl).toContain('discord.com/api/oauth2/authorize');
      expect(response.body.data.authUrl).toContain('client_id=test-client-id');
      expect(response.body.data.authUrl).toContain('scope=identify');
    });

    it('should return error if user already has Discord linked', async () => {
      mockGetUserByUid.mockResolvedValue({
        id: 'test-uid',
        email: 'test@example.com',
        displayName: 'Test User',
        familyId: 'test-family',
        role: 'member',
        discordId: '123456789',
      });

      const response = await request(app).get('/auth/discord');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('DISCORD_ALREADY_LINKED');
    });

    it('should return error if user not found', async () => {
      mockGetUserByUid.mockResolvedValue(null);

      const response = await request(app).get('/auth/discord');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('USER_NOT_FOUND');
    });
  });

  describe('POST /auth/discord/callback', () => {
    it('should return error if code is missing', async () => {
      mockGetUserByUid.mockResolvedValue({
        id: 'test-uid',
        email: 'test@example.com',
        displayName: 'Test User',
        familyId: 'test-family',
        role: 'member',
        discordId: null,
      });

      const response = await request(app)
        .post('/auth/discord/callback')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should link Discord account successfully', async () => {
      mockGetUserByUid.mockResolvedValue({
        id: 'test-uid',
        email: 'test@example.com',
        displayName: 'Test User',
        familyId: 'test-family',
        role: 'member',
        discordId: null,
      });

      mockGetUserByDiscordId.mockResolvedValue(null);
      mockUpdateUserDiscordId.mockResolvedValue(undefined);

      // Mock fetch for Discord API
      const mockFetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ access_token: 'test-access-token' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ id: '987654321', username: 'testuser' }),
        });
      global.fetch = mockFetch;

      const response = await request(app)
        .post('/auth/discord/callback')
        .send({ code: 'test-auth-code' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.discordId).toBe('987654321');
      expect(response.body.data.discordUsername).toBe('testuser');
      expect(mockUpdateUserDiscordId).toHaveBeenCalledWith('test-uid', '987654321');
    });

    it('should return error if Discord ID is already linked to another user', async () => {
      mockGetUserByUid.mockResolvedValue({
        id: 'test-uid',
        email: 'test@example.com',
        displayName: 'Test User',
        familyId: 'test-family',
        role: 'member',
        discordId: null,
      });

      mockGetUserByDiscordId.mockResolvedValue({
        id: 'other-uid',
        discordId: '987654321',
      });

      const mockFetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ access_token: 'test-access-token' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ id: '987654321', username: 'testuser' }),
        });
      global.fetch = mockFetch;

      const response = await request(app)
        .post('/auth/discord/callback')
        .send({ code: 'test-auth-code' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('DISCORD_ALREADY_LINKED');
    });
  });

  describe('DELETE /auth/discord', () => {
    it('should unlink Discord account successfully', async () => {
      mockGetUserByUid.mockResolvedValue({
        id: 'test-uid',
        email: 'test@example.com',
        displayName: 'Test User',
        familyId: 'test-family',
        role: 'member',
        discordId: '123456789',
      });

      mockRemoveUserDiscordId.mockResolvedValue(undefined);

      const response = await request(app).delete('/auth/discord');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(mockRemoveUserDiscordId).toHaveBeenCalledWith('test-uid');
    });

    it('should return error if Discord is not linked', async () => {
      mockGetUserByUid.mockResolvedValue({
        id: 'test-uid',
        email: 'test@example.com',
        displayName: 'Test User',
        familyId: 'test-family',
        role: 'member',
        discordId: null,
      });

      const response = await request(app).delete('/auth/discord');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('DISCORD_NOT_LINKED');
    });

    it('should return error if user not found', async () => {
      mockGetUserByUid.mockResolvedValue(null);

      const response = await request(app).delete('/auth/discord');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('USER_NOT_FOUND');
    });
  });
});
