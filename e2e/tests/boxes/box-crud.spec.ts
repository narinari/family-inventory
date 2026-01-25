import { test, expect, E2EWindow } from '../../fixtures/auth.fixture';
import { Page } from '@playwright/test';

interface TestData {
  boxId: string;
  boxName: string;
}

async function createTestBoxViaAPI(page: Page, name: string = 'テスト箱'): Promise<TestData> {
  return await page.evaluate(async (boxName) => {
    const { __e2eAuth } = window as unknown as E2EWindow;
    const token = await __e2eAuth.currentUser.getIdToken();

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };

    const res = await fetch('http://localhost:3001/boxes', {
      method: 'POST',
      headers,
      body: JSON.stringify({ name: boxName }),
    });
    const data = await res.json();
    const boxId = data.data?.box?.id;

    if (!boxId) {
      throw new Error('Failed to create box');
    }

    return { boxId, boxName };
  }, name);
}

test.describe('箱管理CRUD', () => {
  test('箱一覧が表示される', async ({ authenticatedPage: page }) => {
    await createTestBoxViaAPI(page, '表示テスト箱');

    await page.goto('/boxes');

    // ページタイトルが表示される
    await expect(page.getByText('箱一覧')).toBeVisible({ timeout: 10000 });

    // 作成した箱が表示される
    await expect(page.getByText('表示テスト箱')).toBeVisible();
  });

  test('新規箱を作成できる', async ({ authenticatedPage: page }) => {
    await page.goto('/boxes');

    // 新規作成ボタンをクリック
    await page.getByRole('button', { name: '+ 新規作成' }).click();

    // モーダルが表示される
    await expect(page.getByText('箱を作成')).toBeVisible();

    // 名前を入力
    await page.getByPlaceholder('箱の名前').fill('新規作成箱');

    // 説明を入力
    await page.getByPlaceholder('箱の説明').fill('テスト用の説明');

    // 保存ボタンをクリック
    await page.getByRole('button', { name: '保存' }).click();

    // モーダルが閉じて、作成した箱が表示される
    await expect(page.getByText('新規作成箱')).toBeVisible({ timeout: 10000 });
  });

  test('箱を編集できる', async ({ authenticatedPage: page }) => {
    await createTestBoxViaAPI(page, '編集前の箱');

    await page.goto('/boxes');

    // 編集ボタンをクリック
    await page.getByRole('button', { name: '編集' }).first().click();

    // モーダルが表示される
    await expect(page.getByText('箱を編集')).toBeVisible();

    // 名前を変更
    await page.getByPlaceholder('箱の名前').fill('編集後の箱');

    // 保存ボタンをクリック
    await page.getByRole('button', { name: '保存' }).click();

    // 変更が反映される
    await expect(page.getByText('編集後の箱')).toBeVisible({ timeout: 10000 });
  });

  test('箱を削除できる', async ({ authenticatedPage: page }) => {
    await createTestBoxViaAPI(page, '削除対象の箱');

    await page.goto('/boxes');

    // 削除ボタンをクリック
    await page.getByRole('button', { name: '削除' }).first().click();

    // 確認モーダルが表示される
    await expect(page.getByText('箱を削除')).toBeVisible();
    await expect(page.getByText('この操作は取り消せません')).toBeVisible();

    // 削除ボタンをクリック
    await page.locator('div.fixed').getByRole('button', { name: '削除' }).click();

    // 箱が削除される（空メッセージが表示されるか、箱がなくなる）
    await expect(page.getByText('削除対象の箱')).not.toBeVisible({ timeout: 10000 });
  });

  test('箱詳細ページが表示される', async ({ authenticatedPage: page }) => {
    const { boxId } = await createTestBoxViaAPI(page, '詳細表示箱');

    await page.goto(`/boxes/detail?id=${boxId}`);

    // 詳細ページが表示される
    await expect(page.getByText('詳細表示箱')).toBeVisible({ timeout: 10000 });
  });
});
