import {
  initializeTestEnvironment,
  RulesTestEnvironment,
  RulesTestContext,
  assertFails,
  assertSucceeds,
} from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  getDocs,
} from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';

let testEnv: RulesTestEnvironment;

export async function setupTestEnv(): Promise<RulesTestEnvironment> {
  const rulesPath = resolve(__dirname, '../../firestore.rules');
  const rules = readFileSync(rulesPath, 'utf8');

  testEnv = await initializeTestEnvironment({
    projectId: 'family-inventory-test',
    firestore: {
      rules,
      host: 'localhost',
      port: 8080,
    },
  });
  return testEnv;
}

export async function cleanupTestEnv(): Promise<void> {
  if (testEnv) {
    await testEnv.cleanup();
  }
}

export function getTestEnv(): RulesTestEnvironment {
  return testEnv;
}

// Helper to get authenticated context
export function getAuthContext(uid: string) {
  return testEnv.authenticatedContext(uid);
}

// Helper to get unauthenticated context
export function getUnauthContext() {
  return testEnv.unauthenticatedContext();
}

// Helper to run operations bypassing security rules (for setup)
export async function withSecurityRulesDisabled(
  fn: (context: RulesTestContext) => Promise<void>
): Promise<void> {
  return testEnv.withSecurityRulesDisabled(fn);
}

// Test data factories
export interface TestUser {
  email: string;
  displayName: string;
  role: 'admin' | 'member';
  familyId: string;
  createdAt: Date;
  updatedAt: Date;
  discordId?: string;
}

export function createTestUser(
  familyId: string,
  role: 'admin' | 'member' = 'member',
  overrides: Partial<TestUser> = {}
): TestUser {
  return {
    email: 'test@example.com',
    displayName: 'Test User',
    role,
    familyId,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export interface TestFamily {
  name: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export function createTestFamily(
  createdBy: string,
  overrides: Partial<TestFamily> = {}
): TestFamily {
  return {
    name: 'Test Family',
    createdBy,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export interface TestItem {
  name?: string;
  itemTypeId: string;
  ownerId: string;
  status: 'active' | 'consumed' | 'given' | 'sold';
  boxId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export function createTestItem(
  itemTypeId: string,
  ownerId: string,
  overrides: Partial<TestItem> = {}
): TestItem {
  return {
    name: 'Test Item',
    itemTypeId,
    ownerId,
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export interface TestItemType {
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export function createTestItemType(
  overrides: Partial<TestItemType> = {}
): TestItemType {
  return {
    name: 'Test Item Type',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export interface TestBox {
  name: string;
  locationId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export function createTestBox(overrides: Partial<TestBox> = {}): TestBox {
  return {
    name: 'Test Box',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export interface TestLocation {
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export function createTestLocation(
  overrides: Partial<TestLocation> = {}
): TestLocation {
  return {
    name: 'Test Location',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export interface TestTag {
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export function createTestTag(overrides: Partial<TestTag> = {}): TestTag {
  return {
    name: 'Test Tag',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export interface TestWishlistItem {
  name: string;
  requesterId: string;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'purchased' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
}

export function createTestWishlistItem(
  requesterId: string,
  overrides: Partial<TestWishlistItem> = {}
): TestWishlistItem {
  return {
    name: 'Test Wishlist Item',
    requesterId,
    priority: 'medium',
    status: 'pending',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export interface TestInviteCode {
  code: string;
  familyId: string;
  createdBy: string;
  status: 'active' | 'used' | 'expired';
  expiresAt: Date;
  usedBy?: string;
  createdAt: Date;
}

export function createTestInviteCode(
  familyId: string,
  createdBy: string,
  overrides: Partial<TestInviteCode> = {}
): TestInviteCode {
  return {
    code: 'TEST123',
    familyId,
    createdBy,
    status: 'active',
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
    createdAt: new Date(),
    ...overrides,
  };
}

// Re-export firebase functions for convenience
export {
  assertFails,
  assertSucceeds,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  getDocs,
};
