import { test, expect, E2EWindow } from '../../fixtures/auth.fixture';
import { Page } from '@playwright/test';

interface TestData {
  locationId: string;
  locationName: string;
}

async function createTestLocationViaAPI(page: Page, name: string = 'テスト保管場所'): Promise<TestData> {
  return await page.evaluate(async (locationName) => {
    const { __e2eAuth } = window as unknown as E2EWindow;
    const token = await __e2eAuth.currentUser.getIdToken();

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };

    const res = await fetch('http://localhost:3001/locations', {
      method: 'POST',
      headers,
      body: JSON.stringify({ name: locationName }),
    });
    const data = await res.json();
    const locationId = data.data?.location?.id;

    if (!locationId) {
      throw new Error('Failed to create location');
    }

    return { locationId, locationName };
  }, name);
}

test.describe('保管場所管理CRUD', () => {
  test('保管場所一覧が表示される', async ({ authenticatedPage: page }) => {
    await createTestLocationViaAPI(page, '表示テスト場所');

    await page.goto('/locations');

    // ページタイトルが表示される
    await expect(page.getByText('保管場所一覧')).toBeVisible({ timeout: 10000 });

    // 作成した保管場所が表示される
    await expect(page.getByText('表示テスト場所')).toBeVisible();
  });

  test('新規保管場所を作成できる', async ({ authenticatedPage: page }) => {
    await page.goto('/locations');

    // 新規作成ボタンをクリック
    await page.getByRole('button', { name: '+ 新規作成' }).click();

    // モーダルが表示される
    await expect(page.getByText('保管場所を作成')).toBeVisible();

    // 名前を入力
    await page.getByPlaceholder('保管場所の名前').fill('新規保管場所');

    // 住所を入力
    await page.getByPlaceholder('住所（任意）').fill('東京都渋谷区');

    // 説明を入力
    await page.getByPlaceholder('保管場所の説明').fill('テスト用の説明');

    // 保存ボタンをクリック
    await page.getByRole('button', { name: '保存' }).click();

    // モーダルが閉じて、作成した保管場所が表示される
    await expect(page.getByText('新規保管場所')).toBeVisible({ timeout: 10000 });
  });

  test('保管場所を編集できる', async ({ authenticatedPage: page }) => {
    await createTestLocationViaAPI(page, '編集前の場所');

    await page.goto('/locations');

    // 編集ボタンをクリック
    await page.getByRole('button', { name: '編集' }).first().click();

    // モーダルが表示される
    await expect(page.getByText('保管場所を編集')).toBeVisible();

    // 名前を変更
    await page.getByPlaceholder('保管場所の名前').fill('編集後の場所');

    // 保存ボタンをクリック
    await page.getByRole('button', { name: '保存' }).click();

    // 変更が反映される
    await expect(page.getByText('編集後の場所')).toBeVisible({ timeout: 10000 });
  });

  test('保管場所を削除できる', async ({ authenticatedPage: page }) => {
    await createTestLocationViaAPI(page, '削除対象の場所');

    await page.goto('/locations');

    // 削除ボタンをクリック
    await page.getByRole('button', { name: '削除' }).first().click();

    // 確認モーダルが表示される
    await expect(page.getByText('保管場所を削除')).toBeVisible();
    await expect(page.getByText('この操作は取り消せません')).toBeVisible();

    // 削除ボタンをクリック
    await page.locator('div.fixed').getByRole('button', { name: '削除' }).click();

    // 保管場所が削除される
    await expect(page.getByText('削除対象の場所')).not.toBeVisible({ timeout: 10000 });
  });
});
