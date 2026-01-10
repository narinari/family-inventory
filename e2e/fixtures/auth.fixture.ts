import { test as base, Page } from '@playwright/test';
import {
  createTestUser,
  createCustomToken,
  setupTestData,
  clearFirestore,
  clearAuth,
} from '../helpers/firebase';

// テストユーザー情報
export const TEST_USER = {
  uid: 'test-user-uid',
  email: 'test@example.com',
  displayName: 'テストユーザー',
  familyId: 'test-family',
};

export const TEST_ADMIN = {
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

  // まずページに遷移して Firebase SDK がロードされるのを待つ
  await page.goto('/');
  await page.waitForFunction(
    () =>
      typeof (window as unknown as { __e2eAuth?: unknown }).__e2eAuth !==
      'undefined',
    { timeout: 10000 }
  );

  // Web アプリが公開している auth オブジェクトを使用してサインイン
  await page.evaluate(async (token: string) => {
    const auth = (window as unknown as { __e2eAuth: unknown }).__e2eAuth;
    const signInWithCustomToken = (
      window as unknown as { __e2eSignInWithCustomToken: unknown }
    ).__e2eSignInWithCustomToken as (
      auth: unknown,
      token: string
    ) => Promise<unknown>;
    await signInWithCustomToken(auth, token);
  }, customToken);

  // 認証状態が反映されるまで待機
  await page.waitForTimeout(1000);
}

export const test = base.extend<AuthFixtures>({
  // 一般ユーザーとして認証済みのページ
  authenticatedPage: async ({ page }, use) => {
    // テストデータをクリア
    await clearFirestore();
    await clearAuth();

    // テストユーザーを作成
    await createTestUser(
      TEST_USER.uid,
      TEST_USER.email,
      TEST_USER.displayName
    );

    // Firestore にユーザーとファミリーデータをセットアップ
    await setupTestData({
      users: [
        {
          id: TEST_USER.uid,
          data: {
            email: TEST_USER.email,
            displayName: TEST_USER.displayName,
            familyId: TEST_USER.familyId,
            role: 'member',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        },
      ],
      families: [
        {
          id: TEST_USER.familyId,
          data: {
            name: 'テスト家族',
            createdBy: TEST_ADMIN.uid,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        },
      ],
    });

    await authenticateWithCustomToken(page, TEST_USER.uid);
    await use(page);
  },

  // 管理者として認証済みのページ
  adminPage: async ({ page }, use) => {
    await clearFirestore();
    await clearAuth();

    await createTestUser(
      TEST_ADMIN.uid,
      TEST_ADMIN.email,
      TEST_ADMIN.displayName
    );

    await setupTestData({
      users: [
        {
          id: TEST_ADMIN.uid,
          data: {
            email: TEST_ADMIN.email,
            displayName: TEST_ADMIN.displayName,
            familyId: TEST_ADMIN.familyId,
            role: 'admin',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        },
      ],
      families: [
        {
          id: TEST_ADMIN.familyId,
          data: {
            name: 'テスト家族',
            createdBy: TEST_ADMIN.uid,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        },
      ],
    });

    await authenticateWithCustomToken(page, TEST_ADMIN.uid);
    await use(page);
  },

  // 未認証のページ
  unauthenticatedPage: async ({ page }, use) => {
    await clearFirestore();
    await clearAuth();
    await use(page);
  },
});

export { expect } from '@playwright/test';
