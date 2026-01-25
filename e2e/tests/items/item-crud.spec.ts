import { test, expect, TEST_USER, E2EWindow } from '../../fixtures/auth.fixture';
import { Page } from '@playwright/test';

interface TestData {
  itemTypeId: string;
  itemId: string;
}

async function createTestDataViaAPI(page: Page): Promise<TestData> {
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
      body: JSON.stringify({ name: 'テスト種別' }),
    });
    const typeData = await typeRes.json();
    const itemTypeId = typeData.data?.itemType?.id;

    if (!itemTypeId) {
      throw new Error('Failed to create item type');
    }

    // アイテムを作成
    const itemRes = await fetch('http://localhost:3001/items', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        itemTypeId,
        ownerId: testUser.uid,
        memo: 'テストメモ',
      }),
    });
    const itemData = await itemRes.json();
    const itemId = itemData.data?.item?.id;

    if (!itemId) {
      throw new Error('Failed to create item');
    }

    return { itemTypeId, itemId };
  }, TEST_USER);
}

test.describe('持ち物CRUD', () => {
  test('持ち物詳細ページが表示される', async ({ authenticatedPage: page }) => {
    const { itemId } = await createTestDataViaAPI(page);

    await page.goto(`/items/detail?id=${itemId}`);

    // 詳細ページが表示される
    await expect(page.getByText('テスト種別')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('所有中')).toBeVisible();
    await expect(page.getByText('テストメモ')).toBeVisible();
  });

  test('新規持ち物を作成できる', async ({ authenticatedPage: page }) => {
    // 先にアイテムタイプを作成
    await page.evaluate(async () => {
      const { __e2eAuth } = window as unknown as E2EWindow;
      const token = await __e2eAuth.currentUser.getIdToken();
      await fetch('http://localhost:3001/item-types', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: '新規テスト種別' }),
      });
    });

    await page.goto('/items/new');

    // ページが表示される
    await expect(page.getByText('持ち物を登録')).toBeVisible({ timeout: 10000 });

    // アイテム種別を選択
    await page.getByText('新規テスト種別').click();

    // メモを入力
    await page.getByPlaceholder('メモを入力...').fill('新規作成テスト');

    // 登録ボタンをクリック
    await page.getByRole('button', { name: '登録する' }).click();

    // 一覧ページにリダイレクト
    await expect(page).toHaveURL('/items', { timeout: 10000 });

    // 作成したアイテムが表示される
    await expect(page.getByText('新規テスト種別')).toBeVisible();
  });

  test('持ち物を編集できる', async ({ authenticatedPage: page }) => {
    const { itemId } = await createTestDataViaAPI(page);

    await page.goto(`/items/detail?id=${itemId}`);

    // 編集ボタンをクリック
    await page.getByRole('button', { name: '編集' }).click();

    // メモを変更
    await page.locator('textarea').fill('編集後のメモ');

    // 保存ボタンをクリック
    await page.getByRole('button', { name: '保存する' }).click();

    // 編集が反映される
    await expect(page.getByText('編集後のメモ')).toBeVisible({ timeout: 10000 });
  });

  test('持ち物を消費済みにできる', async ({ authenticatedPage: page }) => {
    const { itemTypeId } = await createTestDataViaAPI(page);

    // 新しいアイテムを作成（消費用）
    await page.evaluate(async (data) => {
      const { __e2eAuth } = window as unknown as E2EWindow;
      const token = await __e2eAuth.currentUser.getIdToken();
      await fetch('http://localhost:3001/items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          itemTypeId: data.itemTypeId,
          ownerId: data.uid,
        }),
      });
    }, { itemTypeId, uid: TEST_USER.uid });

    await page.goto('/items');

    // 消費ボタンをクリック
    await page.getByRole('button', { name: '消費' }).first().click();

    // 確認モーダルが表示される
    await expect(page.getByText('消費済にする')).toBeVisible();

    // 確定ボタンをクリック
    await page.getByRole('button', { name: '確定' }).click();

    // ステータスが変わったことを確認（フィルターを変更）
    await page.selectOption('select', 'consumed');
    await expect(page.getByText('消費済')).toBeVisible({ timeout: 10000 });
  });

  test('持ち物を譲渡できる', async ({ authenticatedPage: page }) => {
    const { itemTypeId } = await createTestDataViaAPI(page);

    // 新しいアイテムを作成（譲渡用）
    await page.evaluate(async (data) => {
      const { __e2eAuth } = window as unknown as E2EWindow;
      const token = await __e2eAuth.currentUser.getIdToken();
      await fetch('http://localhost:3001/items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          itemTypeId: data.itemTypeId,
          ownerId: data.uid,
        }),
      });
    }, { itemTypeId, uid: TEST_USER.uid });

    await page.goto('/items');

    // 譲渡ボタンをクリック
    await page.getByRole('button', { name: '譲渡' }).first().click();

    // モーダルが表示される
    await expect(page.getByText('譲渡する')).toBeVisible();

    // 譲渡先を入力
    await page.getByPlaceholder('譲渡先').fill('友人A');

    // 確定ボタンをクリック
    await page.getByRole('button', { name: '確定' }).click();

    // ステータスが変わったことを確認（フィルターを変更）
    await page.selectOption('select', 'given');
    await expect(page.getByText('譲渡済')).toBeVisible({ timeout: 10000 });
  });

  test('持ち物を売却できる', async ({ authenticatedPage: page }) => {
    const { itemTypeId } = await createTestDataViaAPI(page);

    // 新しいアイテムを作成（売却用）
    await page.evaluate(async (data) => {
      const { __e2eAuth } = window as unknown as E2EWindow;
      const token = await __e2eAuth.currentUser.getIdToken();
      await fetch('http://localhost:3001/items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          itemTypeId: data.itemTypeId,
          ownerId: data.uid,
        }),
      });
    }, { itemTypeId, uid: TEST_USER.uid });

    await page.goto('/items');

    // 売却ボタンをクリック
    await page.getByRole('button', { name: '売却' }).first().click();

    // モーダルが表示される
    await expect(page.getByText('売却する')).toBeVisible();

    // 売却先と価格を入力
    await page.getByPlaceholder('売却先（任意）').fill('メルカリ');
    await page.getByPlaceholder('売却価格（任意）').fill('3000');

    // 確定ボタンをクリック
    await page.getByRole('button', { name: '確定' }).click();

    // ステータスが変わったことを確認（フィルターを変更）
    await page.selectOption('select', 'sold');
    await expect(page.getByText('売却済')).toBeVisible({ timeout: 10000 });
  });
});
