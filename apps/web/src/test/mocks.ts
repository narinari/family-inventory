import { vi } from 'vitest';
import type { User, Item, ItemType, Box, Location, Tag, Wishlist } from '@family-inventory/shared';

export const mockUser: User = {
  id: 'user-1',
  familyId: 'family-1',
  email: 'test@example.com',
  displayName: 'Test User',
  role: 'admin',
  createdAt: new Date(),
  updatedAt: new Date(),
};

export const mockItemType: ItemType = {
  id: 'type-1',
  familyId: 'family-1',
  name: 'Test Item Type',
  tags: [],
  createdAt: new Date(),
  updatedAt: new Date(),
};

export const mockItem: Item = {
  id: 'item-1',
  familyId: 'family-1',
  itemTypeId: 'type-1',
  ownerId: 'user-1',
  status: 'owned',
  tags: [],
  createdAt: new Date(),
  updatedAt: new Date(),
};

export const mockBox: Box = {
  id: 'box-1',
  familyId: 'family-1',
  name: 'Test Box',
  createdAt: new Date(),
  updatedAt: new Date(),
};

export const mockLocation: Location = {
  id: 'location-1',
  familyId: 'family-1',
  name: 'Test Location',
  createdAt: new Date(),
  updatedAt: new Date(),
};

export const mockTag: Tag = {
  id: 'tag-1',
  familyId: 'family-1',
  name: 'Test Tag',
  createdAt: new Date(),
  updatedAt: new Date(),
};

export const mockWishlist: Wishlist = {
  id: 'wishlist-1',
  familyId: 'family-1',
  name: 'Test Wishlist Item',
  requesterId: 'user-1',
  priority: 'medium',
  status: 'pending',
  tags: [],
  createdAt: new Date(),
  updatedAt: new Date(),
};

export function createMockAuthContext(overrides?: Partial<typeof mockUser>) {
  return {
    user: overrides ? { ...mockUser, ...overrides } : mockUser,
    firebaseUser: null,
    loading: false,
    needsInviteCode: false,
    signInWithGoogle: vi.fn(),
    signOut: vi.fn(),
    submitInviteCode: vi.fn(),
    refreshUser: vi.fn(),
  };
}
