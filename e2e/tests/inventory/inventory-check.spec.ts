import { test, expect, TEST_USER, E2EWindow } from '../../fixtures/auth.fixture';
import { Page } from '@playwright/test';

interface TestData {
  boxId: string;
  boxName: string;
  itemIds: string[];
}

async function createTestDataViaAPI(page: Page): Promise<TestData> {
  return await page.evaluate(async (testUser) => {
    const { __e2eAuth } = window as unknown as E2EWindow;
    const token = await __e2eAuth.currentUser.getIdToken();

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };

    // 箱を作成
    const boxRes = await fetch('http://localhost:3001/boxes', {
      method: 'POST',
      headers,
      body: JSON.stringify({ name: '棚卸テスト箱' }),
    });
    const boxData = await boxRes.json();
    const boxId = boxData.data?.box?.id;

    if (!boxId) {
      throw new Error('Failed to create box');
    }

    // アイテムタイプを作成
    const typeRes = await fetch('http://localhost:3001/item-types', {
      method: 'POST',
      headers,
      body: JSON.stringify({ name: '棚卸テスト種別' }),
    });
    const typeData = await typeRes.json();
    const itemTypeId = typeData.data?.itemType?.id;

    if (!itemTypeId) {
      throw new Error('Failed to create item type');
    }

    // アイテムを2件作成（箱に紐付け）
    const itemIds: string[] = [];
    for (let i = 0; i < 2; i++) {
      const itemRes = await fetch('http://localhost:3001/items', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          itemTypeId,
          ownerId: testUser.uid,
          boxId,
          memo: `棚卸テストアイテム${i + 1}`,
        }),
      });
      const itemData = await itemRes.json();
      if (itemData.data?.item?.id) {
        itemIds.push(itemData.data.item.id);
      }
    }

    return { boxId, boxName: '棚卸テスト箱', itemIds };
  }, TEST_USER);
}

test.describe('棚卸機能', () => {
  test('棚卸管理ページが表示される', async ({ authenticatedPage: page }) => {
    await createTestDataViaAPI(page);

    await page.goto('/inventory');

    // ページタイトルが表示される
    await expect(page.getByText('棚卸')).toBeVisible({ timeout: 10000 });

    // 作成した箱が表示される
    await expect(page.getByText('棚卸テスト箱')).toBeVisible();
  });

  test('箱を選択して棚卸チェックができる', async ({ authenticatedPage: page }) => {
    const { boxId } = await createTestDataViaAPI(page);

    await page.goto('/inventory');

    // 棚卸開始ボタンをクリック
    await page.getByRole('link', { name: '棚卸開始' }).first().click();

    // 棚卸チェック画面に遷移
    await expect(page).toHaveURL(`/inventory/check?boxId=${boxId}`, { timeout: 10000 });

    // 箱名が表示される
    await expect(page.getByText('棚卸テスト箱')).toBeVisible();

    // アイテムが表示される
    await expect(page.getByText('棚卸テスト種別')).toBeVisible();
  });

  test('アイテムを個別確認できる', async ({ authenticatedPage: page }) => {
    const { boxId } = await createTestDataViaAPI(page);

    await page.goto(`/inventory/check?boxId=${boxId}`);

    // 初期状態では未確認
    await expect(page.getByText('確認済み: 0 / 2')).toBeVisible({ timeout: 10000 });

    // 確認ボタンをクリック
    await page.getByRole('button', { name: '確認' }).first().click();

    // 確認数が更新される
    await expect(page.getByText('確認済み: 1 / 2')).toBeVisible({ timeout: 10000 });

    // チェックマークが表示される
    await expect(page.getByText('✅')).toBeVisible();
  });

  test('アイテムを一括確認できる', async ({ authenticatedPage: page }) => {
    const { boxId } = await createTestDataViaAPI(page);

    await page.goto(`/inventory/check?boxId=${boxId}`);

    // 初期状態を確認
    await expect(page.getByText('確認済み: 0 / 2')).toBeVisible({ timeout: 10000 });

    // 全て確認済みにするボタンをクリック
    await page.getByRole('button', { name: '全て確認済みにする' }).click();

    // 全て確認済みになる
    await expect(page.getByText('確認済み: 2 / 2')).toBeVisible({ timeout: 10000 });

    // 完了メッセージが表示される
    await expect(page.getByText('この箱の棚卸が完了しました')).toBeVisible();
  });
});
