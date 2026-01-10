---
allowed-tools: Bash, Read, Write, Edit, Glob, Grep
description: e2e テストシナリオを追加 (project)
---

# e2e テストシナリオを追加

ユーザーが指定した機能のテストシナリオを追加します。

## 手順

### 1. 既存のテスト構造を確認

```bash
ls -la e2e/tests/
```

### 2. テストファイルを作成

`e2e/tests/[feature]/[feature].spec.ts` に新しいテストファイルを作成。

### 3. テンプレート

```typescript
import { test, expect, TEST_USER } from '../../fixtures/auth.fixture';
import { Page } from '@playwright/test';

// API 経由でテストデータを作成するヘルパー関数
async function createTestData(page: Page) {
  return await page.evaluate(async (testUser) => {
    const token = await (
      window as unknown as {
        __e2eAuth: { currentUser: { getIdToken: () => Promise<string> } };
      }
    ).__e2eAuth.currentUser.getIdToken();

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };

    // 必要なテストデータを API 経由で作成
    // const res = await fetch('http://localhost:3001/endpoint', {
    //   method: 'POST',
    //   headers,
    //   body: JSON.stringify({ ... }),
    // });
    // return await res.json();
  }, TEST_USER);
}

test.describe('機能名', () => {
  test('シナリオ1', async ({ authenticatedPage: page }) => {
    // テストデータを作成（必要な場合）
    await createTestData(page);

    // ページに移動
    await page.goto('/path');

    // アサーション
    await expect(page.getByText('期待する要素')).toBeVisible();
  });

  test('シナリオ2（未認証）', async ({ unauthenticatedPage: page }) => {
    await page.goto('/protected-path');
    // ログインページへリダイレクトされることを確認
    await expect(page.getByRole('button', { name: 'Googleでログイン' })).toBeVisible();
  });
});
```

## 重要な制約

### テストデータは API 経由で作成する

**Admin SDK 経由で作成したデータは API サーバーから見えません。**

```typescript
// ❌ NG
import { setupTestData } from '../../helpers/firebase';
await setupTestData({ items: [...] });

// ✅ OK
await page.evaluate(async () => {
  const token = await window.__e2eAuth.currentUser.getIdToken();
  await fetch('http://localhost:3001/items', { ... });
});
```

### 認証フィクスチャ

| フィクスチャ | 用途 |
|------------|------|
| `authenticatedPage` | 一般ユーザーとして認証済み |
| `adminPage` | 管理者として認証済み |
| `unauthenticatedPage` | 未認証状態 |

## テスト実行

```bash
# 新しいテストのみ実行
cd e2e && npx playwright test -g "テスト名"

# デバッグモード
cd e2e && npx playwright test --debug
```

詳細は `e2e/README.md` を参照。
