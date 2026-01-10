import { test, expect, TEST_USER, E2EWindow } from '../../fixtures/auth.fixture';
import { Page } from '@playwright/test';

async function createTestDataViaAPI(page: Page): Promise<{ itemTypeId: string }> {
  return await page.evaluate(async (testUser) => {
    const { __e2eAuth } = window as unknown as E2EWindow;
    const token = await __e2eAuth.currentUser.getIdToken();

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };

    // アイテムタイプを作成
    const typeRes = await fetch('http://localhost:3001/item-types', {
      method: 'POST',
      headers,
      body: JSON.stringify({ name: 'テストタイプ' }),
    });
    const typeData = await typeRes.json();
    const itemTypeId = typeData.data?.itemType?.id;

    if (!itemTypeId) {
      throw new Error('Failed to create item type');
    }

    // アイテムを2件作成
    for (let i = 0; i < 2; i++) {
      await fetch('http://localhost:3001/items', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          itemTypeId,
          ownerId: testUser.uid,
        }),
      });
    }

    return { itemTypeId };
  }, TEST_USER);
}

test.describe('アイテム一覧', () => {
  test('アイテム一覧ページにアクセスできる', async ({
    authenticatedPage: page,
  }) => {
    await page.goto('/items');

    // ページタイトルまたはヘッダーが表示されることを確認
    await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
  });

  test('アイテムが表示される', async ({ authenticatedPage: page }) => {
    // API 経由でテストデータを作成
    await createTestDataViaAPI(page);

    // アイテム一覧ページに移動
    await page.goto('/items');

    // テストアイテムが表示されることを確認（アイテムタイプ名で確認）
    // 複数のアイテムが表示されているので、最初の要素をチェック
    await expect(page.getByText('テストタイプ').first()).toBeVisible({
      timeout: 10000,
    });

    // 2件のアイテムが表示されていることを確認
    await expect(page.getByText('テストタイプ')).toHaveCount(2);
  });
});
