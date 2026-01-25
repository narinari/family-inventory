import { test, expect } from '../../fixtures/auth.fixture';

test.describe('メンバー管理（管理者機能）', () => {
  test('メンバー一覧が表示される', async ({ adminPage: page }) => {
    await page.goto('/settings/members');

    // ページタイトルが表示される
    await expect(page.getByRole('heading', { name: 'メンバー管理' })).toBeVisible({ timeout: 10000 });

    // 家族メンバーセクションが表示される
    await expect(page.getByText('家族メンバー')).toBeVisible();

    // 管理者ユーザー（自分）が表示される
    await expect(page.getByText('管理者ユーザー')).toBeVisible();
  });

  test('招待コードを発行できる', async ({ adminPage: page }) => {
    await page.goto('/settings/members');

    // 新規発行ボタンをクリック
    await page.getByRole('button', { name: '+ 新規発行' }).click();

    // ボタンがローディング状態になる
    await expect(page.getByRole('button', { name: '発行中...' })).toBeVisible();

    // 招待コードが発行される（コードが表示される）
    // コードは7文字のランダム文字列なので、コピーボタンの存在で確認
    await expect(page.getByRole('button', { name: 'コピー' })).toBeVisible({ timeout: 10000 });
  });

  test('非管理者はメンバー管理ページにアクセスできない', async ({ authenticatedPage: page }) => {
    await page.goto('/settings/members');

    // 設定ページにリダイレクトされる
    await expect(page).toHaveURL('/settings', { timeout: 10000 });
  });
});
