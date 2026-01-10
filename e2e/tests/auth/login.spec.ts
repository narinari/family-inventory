import { test, expect } from '../../fixtures/auth.fixture';

test.describe('ログイン機能', () => {
  test('未認証ユーザーはログインページにリダイレクトされる', async ({
    unauthenticatedPage: page,
  }) => {
    await page.goto('/');

    // ログインボタンが表示されることを確認
    await expect(
      page.getByRole('button', { name: 'Googleでログイン' })
    ).toBeVisible({ timeout: 10000 });
  });

  test('認証済みユーザーはホームページにアクセスできる', async ({
    authenticatedPage: page,
  }) => {
    await page.goto('/');

    // 認証済みの場合、ホームページのコンテンツが表示される
    // （具体的な要素はアプリケーションの実装による）
    await expect(page.locator('body')).not.toContainText('ログイン', {
      timeout: 10000,
    });
  });
});
