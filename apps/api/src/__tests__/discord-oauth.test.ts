import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { ErrorCodes } from '@family-inventory/shared';

// Mock BOT_API_KEY environment variable
const MOCK_BOT_API_KEY = 'test-bot-api-key';

// Track if Bot API Key validation should pass
let mockBotApiKeyValid = true;
let mockBotApiKeyPresent = true;
let mockBotApiKeyConfigured = true;

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
  authenticateBotApiKey: (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (!mockBotApiKeyConfigured) {
      res.status(503).json({
        success: false,
        error: { code: ErrorCodes.BOT_API_NOT_CONFIGURED, message: 'Bot APIが設定されていません' },
      });
      return;
    }
    if (!mockBotApiKeyPresent) {
      res.status(401).json({
        success: false,
        error: { code: ErrorCodes.UNAUTHORIZED, message: 'API Keyが必要です' },
      });
      return;
    }
    if (!mockBotApiKeyValid) {
      res.status(401).json({
        success: false,
        error: { code: ErrorCodes.INVALID_API_KEY, message: '無効なAPI Keyです' },
      });
      return;
    }
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

  describe('GET /auth/discord/user/:discordId (Bot API)', () => {
    beforeEach(() => {
      // Reset mock flags for Bot API
      mockBotApiKeyValid = true;
      mockBotApiKeyPresent = true;
      mockBotApiKeyConfigured = true;
    });

    it('should return user when valid API key and Discord ID provided', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'user@example.com',
        displayName: 'Test User',
        familyId: 'family-123',
        role: 'member',
        discordId: '123456789',
      };
      mockGetUserByDiscordId.mockResolvedValue(mockUser);

      const response = await request(app)
        .get('/auth/discord/user/123456789')
        .set('X-API-Key', MOCK_BOT_API_KEY);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toEqual(mockUser);
      expect(mockGetUserByDiscordId).toHaveBeenCalledWith('123456789');
    });

    it('should return 401 when API key is missing', async () => {
      mockBotApiKeyPresent = false;

      const response = await request(app)
        .get('/auth/discord/user/123456789');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should return 401 when API key is invalid', async () => {
      mockBotApiKeyValid = false;

      const response = await request(app)
        .get('/auth/discord/user/123456789')
        .set('X-API-Key', 'wrong-api-key');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_API_KEY');
    });

    it('should return 404 when user not found by Discord ID', async () => {
      mockGetUserByDiscordId.mockResolvedValue(null);

      const response = await request(app)
        .get('/auth/discord/user/999999999')
        .set('X-API-Key', MOCK_BOT_API_KEY);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('USER_NOT_FOUND');
    });

    it('should return 503 when Bot API is not configured', async () => {
      mockBotApiKeyConfigured = false;

      const response = await request(app)
        .get('/auth/discord/user/123456789')
        .set('X-API-Key', MOCK_BOT_API_KEY);

      expect(response.status).toBe(503);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('BOT_API_NOT_CONFIGURED');
    });
  });
});
