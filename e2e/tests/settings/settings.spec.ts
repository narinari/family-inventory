import { test, expect, E2EWindow } from '../../fixtures/auth.fixture';
import { Page } from '@playwright/test';

async function createTestTagViaAPI(page: Page, name: string = 'テストタグ'): Promise<string> {
  return await page.evaluate(async (tagName) => {
    const { __e2eAuth } = window as unknown as E2EWindow;
    const token = await __e2eAuth.currentUser.getIdToken();

    const res = await fetch('http://localhost:3001/tags', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name: tagName }),
    });
    const data = await res.json();
    return data.data?.tag?.id ?? '';
  }, name);
}

async function createTestItemTypeViaAPI(page: Page, name: string = 'テスト種別'): Promise<string> {
  return await page.evaluate(async (typeName) => {
    const { __e2eAuth } = window as unknown as E2EWindow;
    const token = await __e2eAuth.currentUser.getIdToken();

    const res = await fetch('http://localhost:3001/item-types', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name: typeName }),
    });
    const data = await res.json();
    return data.data?.itemType?.id ?? '';
  }, name);
}

test.describe('設定機能', () => {
  test('設定ページが表示される', async ({ authenticatedPage: page }) => {
    await page.goto('/settings');

    // ページタイトルが表示される
    await expect(page.getByRole('heading', { name: '設定' })).toBeVisible({ timeout: 10000 });

    // プロフィールセクションが表示される
    await expect(page.getByText('プロフィール')).toBeVisible();

    // マスターデータ管理セクションが表示される
    await expect(page.getByText('マスターデータ管理')).toBeVisible();
  });

  test('アイテム種別を追加・編集・削除できる', async ({ authenticatedPage: page }) => {
    await page.goto('/settings/item-types');

    // ページタイトルが表示される
    await expect(page.getByRole('heading', { name: 'アイテム種別' })).toBeVisible({ timeout: 10000 });

    // 新規作成ボタンをクリック
    await page.getByRole('button', { name: '+ 新規作成' }).click();

    // モーダルが表示される
    await expect(page.getByText('アイテム種別を作成')).toBeVisible();

    // 名前を入力
    await page.getByPlaceholder('アイテム種別名').fill('設定テスト種別');

    // 保存ボタンをクリック
    await page.getByRole('button', { name: '保存' }).click();

    // 作成した種別が表示される
    await expect(page.getByText('設定テスト種別')).toBeVisible({ timeout: 10000 });

    // 編集ボタンをクリック
    await page.getByRole('button', { name: '編集' }).first().click();

    // モーダルが表示される
    await expect(page.getByText('アイテム種別を編集')).toBeVisible();

    // 名前を変更
    await page.getByPlaceholder('アイテム種別名').fill('編集後の種別');

    // 保存ボタンをクリック
    await page.getByRole('button', { name: '保存' }).click();

    // 変更が反映される
    await expect(page.getByText('編集後の種別')).toBeVisible({ timeout: 10000 });

    // 削除ボタンをクリック
    await page.getByRole('button', { name: '削除' }).first().click();

    // 確認モーダルが表示される
    await expect(page.getByText('アイテム種別を削除')).toBeVisible();

    // 削除ボタンをクリック
    await page.locator('div.fixed').getByRole('button', { name: '削除' }).click();

    // 種別が削除される
    await expect(page.getByText('編集後の種別')).not.toBeVisible({ timeout: 10000 });
  });

  test('タグを追加・削除できる', async ({ authenticatedPage: page }) => {
    await page.goto('/settings/tags');

    // ページタイトルが表示される
    await expect(page.getByRole('heading', { name: 'タグ' })).toBeVisible({ timeout: 10000 });

    // 新規作成ボタンをクリック
    await page.getByRole('button', { name: '+ 新規作成' }).click();

    // 入力フォームが表示される
    await page.getByPlaceholder('タグ名').fill('設定テストタグ');

    // 作成ボタンをクリック
    await page.getByRole('button', { name: '作成' }).click();

    // 作成したタグが表示される
    await expect(page.getByText('設定テストタグ')).toBeVisible({ timeout: 10000 });

    // 削除ボタン（×）をクリック
    await page.getByRole('button', { name: '削除' }).first().click();

    // 確認モーダルが表示される
    await expect(page.getByText('タグを削除')).toBeVisible();

    // 削除ボタンをクリック
    await page.locator('div.fixed').getByRole('button', { name: '削除' }).click();

    // タグが削除される
    await expect(page.getByText('設定テストタグ')).not.toBeVisible({ timeout: 10000 });
  });
});
