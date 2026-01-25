import { test, expect, E2EWindow } from '../../fixtures/auth.fixture';
import { Page } from '@playwright/test';

interface TestData {
  wishlistId: string;
  wishlistName: string;
}

async function createTestWishlistViaAPI(page: Page, name: string = 'テスト欲しい物'): Promise<TestData> {
  return await page.evaluate(async (wishlistName) => {
    const { __e2eAuth } = window as unknown as E2EWindow;
    const token = await __e2eAuth.currentUser.getIdToken();

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };

    const res = await fetch('http://localhost:3001/wishlist', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: wishlistName,
        priority: 'medium',
      }),
    });
    const data = await res.json();
    const wishlistId = data.data?.wishlist?.id;

    if (!wishlistId) {
      throw new Error('Failed to create wishlist item');
    }

    return { wishlistId, wishlistName };
  }, name);
}

test.describe('ウィッシュリストCRUD', () => {
  test('ウィッシュリスト一覧が表示される', async ({ authenticatedPage: page }) => {
    await createTestWishlistViaAPI(page, '表示テスト欲しい物');

    await page.goto('/wishlist');

    // ページタイトルが表示される
    await expect(page.getByText('欲しい物リスト')).toBeVisible({ timeout: 10000 });

    // 作成したウィッシュリストが表示される
    await expect(page.getByText('表示テスト欲しい物')).toBeVisible();
  });

  test('新規欲しい物を追加できる', async ({ authenticatedPage: page }) => {
    await page.goto('/wishlist/new');

    // ページタイトルが表示される
    await expect(page.getByText('欲しい物を追加')).toBeVisible({ timeout: 10000 });

    // 名前を入力
    await page.getByPlaceholder('欲しいものの名前').fill('新規欲しい物');

    // 価格帯を入力
    await page.getByPlaceholder('例: 1,000〜3,000円').fill('5,000円');

    // 優先度を高に設定
    await page.getByLabel('高').check();

    // 追加ボタンをクリック
    await page.getByRole('button', { name: '追加する' }).click();

    // 一覧ページにリダイレクト
    await expect(page).toHaveURL('/wishlist', { timeout: 10000 });

    // 作成したアイテムが表示される
    await expect(page.getByText('新規欲しい物')).toBeVisible();
  });

  test('欲しい物を購入済みにできる', async ({ authenticatedPage: page }) => {
    await createTestWishlistViaAPI(page, '購入済テスト');

    await page.goto('/wishlist');

    // 購入済ボタンをクリック
    await page.getByRole('button', { name: '購入済' }).first().click();

    // 確認モーダルが表示される
    await expect(page.getByText('購入完了')).toBeVisible();
    await expect(page.getByText('持ち物として自動登録されます')).toBeVisible();

    // 確定ボタンをクリック
    await page.getByRole('button', { name: '確定' }).click();

    // ステータスを変更して購入済みアイテムを確認
    await page.selectOption('select', 'purchased');
    await expect(page.getByText('購入済テスト')).toBeVisible({ timeout: 10000 });
  });

  test('欲しい物を見送りにできる', async ({ authenticatedPage: page }) => {
    await createTestWishlistViaAPI(page, '見送りテスト');

    await page.goto('/wishlist');

    // 見送りボタンをクリック
    await page.getByRole('button', { name: '見送り' }).first().click();

    // 確認モーダルが表示される
    await expect(page.getByRole('heading', { name: '見送り' })).toBeVisible();

    // 確定ボタンをクリック
    await page.getByRole('button', { name: '確定' }).click();

    // ステータスを変更して見送りアイテムを確認
    await page.selectOption('select', 'cancelled');
    await expect(page.getByText('見送りテスト')).toBeVisible({ timeout: 10000 });
  });
});
