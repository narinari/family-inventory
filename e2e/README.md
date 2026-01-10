# E2E テストガイド

Playwright を使用した E2E テストの実行方法とテスト作成ガイドです。

## 前提条件

- Firebase Emulator が起動していること
- Node.js 18+

## クイックスタート

```bash
# 1. Firebase Emulator を起動（別ターミナル）
npx firebase emulators:start --project demo-family-inventory --only auth,firestore

# 2. テストを実行
cd e2e
pnpm test

# UI モードで実行（デバッグ向け）
pnpm test:ui

# ヘッドありで実行（ブラウザ表示）
pnpm test:headed
```

## ディレクトリ構成

```
e2e/
├── fixtures/
│   ├── auth.fixture.ts      # 認証フィクスチャ
│   ├── global-setup.ts      # グローバルセットアップ
│   └── global-teardown.ts   # グローバルティアダウン
├── helpers/
│   └── firebase.ts          # Firebase Admin SDK ヘルパー
├── tests/
│   ├── auth/
│   │   └── login.spec.ts    # ログインテスト
│   └── items/
│       └── item-list.spec.ts # アイテム一覧テスト
├── playwright.config.ts     # Playwright 設定
└── package.json
```

## 重要な制約事項

### テストデータは API 経由で作成する

**テストプロセスの Firebase Admin SDK と API サーバーの Firebase Admin SDK は、異なる Firestore インスタンスを参照します。**

そのため、テストデータは以下の方法で作成する必要があります：

```typescript
// ❌ NG: Admin SDK 経由（API から見えない）
import { setupTestData } from '../../helpers/firebase';
await setupTestData({ items: [...] });

// ✅ OK: API 経由（API から見える）
await page.evaluate(async () => {
  const token = await window.__e2eAuth.currentUser.getIdToken();
  await fetch('http://localhost:3001/items', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ itemTypeId: '...' }),
  });
});
```

### 例外：ユーザーとファミリーデータ

`authenticatedPage` フィクスチャ内で作成されるユーザーとファミリーデータは、認証フローの一部として API 経由で自動的に同期されるため、Admin SDK で作成しても問題ありません。

## 認証フィクスチャの使い方

### authenticatedPage

認証済みの一般ユーザーとしてテストを実行します。

```typescript
import { test, expect, TEST_USER } from '../../fixtures/auth.fixture';

test('認証済みユーザーのテスト', async ({ authenticatedPage: page }) => {
  // page は既に認証済み
  await page.goto('/items');
  // ...
});
```

### adminPage

管理者ユーザーとしてテストを実行します。

```typescript
test('管理者のテスト', async ({ adminPage: page }) => {
  // ...
});
```

### unauthenticatedPage

未認証状態でテストを実行します。

```typescript
test('未認証のテスト', async ({ unauthenticatedPage: page }) => {
  await page.goto('/');
  // ログインページにリダイレクトされることを確認
});
```

## 新しいテストの追加方法

### 1. テストファイルを作成

```typescript
// e2e/tests/[feature]/[feature].spec.ts
import { test, expect, TEST_USER } from '../../fixtures/auth.fixture';
import { Page } from '@playwright/test';

// テストデータ作成ヘルパー（API 経由）
async function createTestData(page: Page) {
  return await page.evaluate(async () => {
    const token = await window.__e2eAuth.currentUser.getIdToken();
    // API 呼び出しでデータを作成
    // ...
  });
}

test.describe('機能名', () => {
  test('テストケース', async ({ authenticatedPage: page }) => {
    // テストデータを作成
    await createTestData(page);

    // テストを実行
    await page.goto('/path');
    await expect(page.getByText('期待する要素')).toBeVisible();
  });
});
```

### 2. テストを実行して確認

```bash
# 特定のテストのみ実行
npx playwright test -g "テストケース名"

# デバッグモードで実行
npx playwright test --debug
```

## グローバルオブジェクト

e2e テスト環境では、以下のグローバルオブジェクトが利用可能です（`NEXT_PUBLIC_USE_EMULATOR=true` の場合のみ）：

| オブジェクト | 説明 |
|------------|------|
| `window.__e2eAuth` | Firebase Auth インスタンス |
| `window.__e2eSignInWithCustomToken` | カスタムトークン認証関数 |

## トラブルシューティング

### テストデータが API から取得できない

**原因**: Admin SDK 経由でデータを作成している
**解決策**: API 経由でデータを作成する

### 認証エラー

**原因**: Firebase Emulator が起動していない
**解決策**: `npx firebase emulators:start --project demo-family-inventory --only auth,firestore`

### strict mode violation

**原因**: セレクタが複数の要素にマッチしている
**解決策**: より具体的なセレクタを使用するか、`.first()` を追加

```typescript
// 複数マッチする場合
await expect(page.getByText('テスト').first()).toBeVisible();

// または要素数を確認
await expect(page.getByText('テスト')).toHaveCount(2);
```

## 環境変数

Playwright が API/Web サーバーを起動する際に設定される環境変数：

| 変数 | 値 |
|-----|-----|
| `FIREBASE_PROJECT_ID` | `demo-family-inventory` |
| `FIRESTORE_EMULATOR_HOST` | `localhost:8080` |
| `FIREBASE_AUTH_EMULATOR_HOST` | `localhost:9099` |
| `NEXT_PUBLIC_USE_EMULATOR` | `true` |
