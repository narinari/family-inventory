import { test as base, Page } from '@playwright/test';
import {
  createTestUser,
  createCustomToken,
  setupTestData,
  clearFirestore,
  clearAuth,
} from '../helpers/firebase';

// E2E 用の window 型定義
export type E2EWindow = {
  __e2eAuth: { currentUser: { getIdToken: () => Promise<string> } };
  __e2eSignInWithCustomToken: (auth: unknown, token: string) => Promise<unknown>;
};

// テストユーザー情報
interface TestUserInfo {
  uid: string;
  email: string;
  displayName: string;
  familyId: string;
}

export const TEST_USER: TestUserInfo = {
  uid: 'test-user-uid',
  email: 'test@example.com',
  displayName: 'テストユーザー',
  familyId: 'test-family',
};

export const TEST_ADMIN: TestUserInfo = {
  uid: 'admin-user-uid',
  email: 'admin@example.com',
  displayName: '管理者ユーザー',
  familyId: 'test-family',
};

interface AuthFixtures {
  authenticatedPage: Page;
  adminPage: Page;
  unauthenticatedPage: Page;
}

/**
 * ページにカスタムトークンで認証状態を設定
 */
async function authenticateWithCustomToken(
  page: Page,
  uid: string
): Promise<void> {
  const customToken = await createCustomToken(uid);

  await page.goto('/');
  await page.waitForFunction(
    () => typeof (window as unknown as E2EWindow).__e2eAuth !== 'undefined',
    { timeout: 10000 }
  );

  await page.evaluate(async (token: string) => {
    const w = window as unknown as E2EWindow;
    await w.__e2eSignInWithCustomToken(w.__e2eAuth, token);
  }, customToken);

  await page.waitForTimeout(1000);
}

/**
 * テストユーザーとファミリーをセットアップ
 */
async function setupUserWithFamily(
  user: TestUserInfo,
  role: 'member' | 'admin'
): Promise<void> {
  await clearFirestore();
  await clearAuth();

  await createTestUser(user.uid, user.email, user.displayName);

  const now = new Date();
  await setupTestData({
    users: [
      {
        id: user.uid,
        data: {
          email: user.email,
          displayName: user.displayName,
          familyId: user.familyId,
          role,
          createdAt: now,
          updatedAt: now,
        },
      },
    ],
    families: [
      {
        id: user.familyId,
        data: {
          name: 'テスト家族',
          createdBy: TEST_ADMIN.uid,
          createdAt: now,
          updatedAt: now,
        },
      },
    ],
  });
}

export const test = base.extend<AuthFixtures>({
  authenticatedPage: async ({ page }, use) => {
    await setupUserWithFamily(TEST_USER, 'member');
    await authenticateWithCustomToken(page, TEST_USER.uid);
    await use(page);
  },

  adminPage: async ({ page }, use) => {
    await setupUserWithFamily(TEST_ADMIN, 'admin');
    await authenticateWithCustomToken(page, TEST_ADMIN.uid);
    await use(page);
  },

  unauthenticatedPage: async ({ page }, use) => {
    await clearFirestore();
    await clearAuth();
    await use(page);
  },
});

export { expect } from '@playwright/test';
