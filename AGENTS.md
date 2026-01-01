# AI Agent Guidelines for Family Inventory

このドキュメントは、Claude Code のサブエージェントがこのプロジェクトで作業する際のガイドラインを定義します。

---

## 重要: ユーザー時間の尊重

**ユーザーの時間は最も貴重なリソースです。** 作業を「完了」として提示する前に：

1. **自分で十分にテストする** - ユーザーをQA担当にしない
2. **明らかな問題を修正する** - 構文エラー、インポート問題、壊れたロジック
3. **実際に動作することを確認する** - テスト実行、構造確認、ロジック検証
4. **その上で提示する** - 「レビュー準備完了」は自分で検証済みの意味

**アンチパターン**: 「Xを実装しました。動作確認お願いします」
**正しいパターン**: 「Xを実装・テストしました。テスト通過、構造確認済み。検証方法は以下です」

---

## 重要: Zero-BS原則（スタブ・プレースホルダー禁止）

**動作するコードを書く。目的のないプレースホルダーは避ける。**

### 避けるべきパターン

```typescript
// NG
throw new Error('Not implemented');
// TODO: 後で実装
return {} as any; // stub
```

### 正しいアプローチ

- **要件が曖昧な場合** → 具体的な詳細を質問する
- **外部依存がある場合** → ファイルベースなど最小限の動作版を作る
- **YAGNI** → 使わないパラメータ、仮想の将来のための機能は作らない

**テスト**: 「このコードは今すぐ何か有用なことをするか？」
- Yes → 残す
- No → 完全に実装するか削除する

---

## 重要: 誠実なコミュニケーション

**専門的で誠実なコミュニケーションを維持する。お世辞は信頼を損なう。**

**使わないフレーズ:**
- 「おっしゃる通りです！」
- 「素晴らしいアイデアですね！」
- 「完全に同意します！」

**代わりに実質的に関与する:**
- アイデアの実際のメリットを分析する
- トレードオフと考慮事項を指摘する
- 正直な技術評価を提供する
- 適切な場合は建設的に反論する

---

## プロジェクト概要

Family Inventory は、家族向けの在庫管理システムです。

### 技術スタック

- **フロントエンド**: Next.js 15 (App Router), Tailwind CSS, TypeScript
- **バックエンド**: Express.js, TypeScript, Zod
- **データベース**: Firebase Firestore
- **認証**: Firebase Authentication (Google OAuth 2.0)
- **ホスティング**: Firebase Hosting (Web), Cloud Run (API)
- **パッケージ管理**: pnpm (monorepo with Turbo)

### プロジェクト構造

```
family-inventory/
├── apps/
│   ├── web/          # Next.js フロントエンド
│   └── api/          # Express バックエンド
├── packages/
│   └── shared/       # 共有型定義・ユーティリティ
├── .claude/
│   ├── agents/       # サブエージェント定義
│   ├── tools/        # フックスクリプト
│   └── settings.json # フック設定
└── .data/            # ローカルデータ（メモリ、ログ等）
```

## 利用可能なエージェント

| エージェント | 用途 |
|------------|------|
| `zen-architect` | 設計・アーキテクチャ計画 |
| `bug-hunter` | デバッグ・エラー調査 |
| `subagent-architect` | 新しいエージェントの作成 |
| `test-coverage` | テスト設計・カバレッジ改善 |
| `security-guardian` | セキュリティレビュー |
| `api-contract-designer` | API 仕様設計 |
| `database-architect` | Firestore スキーマ設計 |
| `modular-builder` | モジュラー実装 |
| `post-task-cleanup` | タスク後のクリーンアップ |

## コーディング規約

### TypeScript

- 厳格な型定義を使用（`any` は避ける）
- 共有型は `packages/shared` に配置
- Zod でリクエストバリデーション

### API レスポンス形式

```typescript
// 成功
interface ApiResponse<T> {
  success: true;
  data: T;
}

// エラー
interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}
```

### Firestore コレクション構造

```
families/{familyId}
├── itemTypes/{itemTypeId}
├── items/{itemId}
├── boxes/{boxId}
├── locations/{locationId}
├── tags/{tagId}
└── wishlist/{wishlistId}

users/{userId}
inviteCodes/{code}
```

## 開発ワークフロー

### 新機能の追加

1. `zen-architect` で設計を計画
2. `api-contract-designer` で API 仕様を定義
3. `modular-builder` で実装
4. `test-coverage` でテストを追加
5. `security-guardian` でセキュリティレビュー
6. `post-task-cleanup` でクリーンアップ

### バグ修正

1. `bug-hunter` で原因調査
2. 修正実装
3. `test-coverage` で回帰テスト追加

### セキュリティ考慮事項

- Firebase Authentication でユーザー認証
- `familyId` によるマルチテナント分離
- Firestore セキュリティルールで権限制御
- 招待コードによるファミリー参加制限

## 環境変数

```bash
# メモリシステム（フック機能）
MEMORY_SYSTEM_ENABLED=true

# Firebase (Web)
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...

# Firebase Admin (API)
GOOGLE_APPLICATION_CREDENTIALS=...
```

## コマンド

```bash
# 開発サーバー起動
pnpm dev           # 全体
pnpm dev:web       # フロントエンドのみ
pnpm dev:api       # バックエンドのみ

# ビルド
pnpm build

# 型チェック
pnpm type-check

# シードデータ投入
pnpm seed
```
