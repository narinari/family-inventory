import { vi } from 'vitest';

// Set environment variables before any imports
process.env.DISCORD_CLIENT_ID = 'test-client-id';
process.env.DISCORD_CLIENT_SECRET = 'test-client-secret';
process.env.DISCORD_REDIRECT_URI = 'http://localhost:3000/callback';

// Mock firebase-admin
vi.mock('../lib/firebase-admin.js', () => ({
  db: {
    collection: vi.fn(() => ({
      doc: vi.fn(() => ({
        get: vi.fn(),
        set: vi.fn(),
        update: vi.fn(),
      })),
      where: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(() => ({
            get: vi.fn(),
          })),
        })),
        limit: vi.fn(() => ({
          get: vi.fn(),
        })),
        orderBy: vi.fn(() => ({
          limit: vi.fn(() => ({
            get: vi.fn(),
          })),
        })),
      })),
      add: vi.fn(),
    })),
  },
}));

// Mock global fetch
global.fetch = vi.fn();
