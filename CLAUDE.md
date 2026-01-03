# Claude Code Instructions

このファイルはClaude Codeがこのプロジェクトで作業する際の指示を定義します。

## プロジェクト概要

Family Inventory - 家族向け在庫管理システム

- **技術スタック**: Next.js 15, Express.js, TypeScript, Firebase (Firestore + Auth)
- **構造**: pnpm monorepo with Turbo

## サブエージェントの活用

このプロジェクトには専門化されたサブエージェントが用意されています。
適切なタスクには **積極的に** サブエージェントを使用してください。

### 利用可能なエージェント

| エージェント | 用途 | 使用タイミング |
|------------|------|--------------|
| `zen-architect` | 設計・計画 | 新機能の設計、アーキテクチャ決定 |
| `bug-hunter` | デバッグ | エラー調査、バグ修正 |
| `test-coverage` | テスト | テスト設計、カバレッジ改善 |
| `security-guardian` | セキュリティ | セキュリティレビュー、脆弱性チェック |
| `api-contract-designer` | API設計 | API仕様策定、エンドポイント設計 |
| `database-architect` | DB設計 | Firestoreスキーマ設計 |
| `modular-builder` | 実装 | モジュラーなコード実装 |
| `post-task-cleanup` | クリーンアップ | タスク完了後の整理 |
| `subagent-architect` | エージェント作成 | 新しいエージェントが必要な場合 |

## 並列実行戦略

**重要**: 常に「並列で実行できるか？」を考えてください。複数のツール呼び出しは1つのメッセージで送信します。

### 並列化すべき場面

- 互いに依存しないタスク
- 異なるターゲットへの同様の操作
- 独立した情報収集

### パターン例

```
# 情報収集（並列）
Single message:
- Read: apps/api/src/routes/auth.ts
- Read: apps/web/src/contexts/AuthContext.tsx
- Grep: "familyId" in apps/

# 複数ファイル編集（並列）
Single message:
- Edit: Fix type error in auth.ts
- Edit: Fix type error in user.ts
- Edit: Update imports in index.ts

# 複数エージェント分析（並列）
Single message:
- Task zen-architect: "設計アプローチを検討"
- Task bug-hunter: "潜在的な問題を特定"
- Task test-coverage: "テストケースを提案"
```

### アンチパターン

```
# NG: 順次実行
"まずファイル1を読みます" → [Read file1]
"次にファイル2を読みます" → [Read file2]

# OK: 並列実行
"これらのファイルを確認します" → [Single message: Read file1, Read file2, Read file3]
```

## サブエージェント委譲戦略

### オーケストレーターとしての役割

- **可能な限り全てをサブエージェントに委譲する**
- 自分は調整役・管理者として機能
- 自分でしかできないことに集中

### 委譲すべき場面

| 場面 | 委譲先 |
|-----|-------|
| 分析タスク | 専門エージェントに深い作業を任せ、結果だけ受け取る |
| 並列探索 | 複数エージェントで偏りのない意見を収集 |
| 複雑な多段階作業 | ワークフロー全体を委譲 |
| 専門知識が必要 | 汎用より専門エージェントを使用 |

### コンテキスト管理の利点

- 各サブエージェントは独立したコンテキストで動作
- メインの会話を汚染しない
- 必要な結果だけが返される
- トークン効率が向上

## Gitコミットメッセージ

**Conventional Commits** (https://www.conventionalcommits.org/ja/v1.0.0/) に従う。

### 形式

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Type

| type | 用途 |
|------|------|
| `feat` | 新機能 |
| `fix` | バグ修正 |
| `docs` | ドキュメントのみの変更 |
| `style` | コードの意味に影響しない変更（空白、フォーマット等） |
| `refactor` | バグ修正でも機能追加でもないコード変更 |
| `perf` | パフォーマンス改善 |
| `test` | テストの追加・修正 |
| `chore` | ビルドプロセスや補助ツールの変更 |

### Scope（任意）

- `web` - フロントエンド
- `api` - バックエンド
- `shared` - 共有パッケージ

### 例

```
feat(api): add invitation code validation endpoint

fix(web): resolve authentication state persistence issue

docs: update README with setup instructions

refactor(shared): simplify error code types
```

### 破壊的変更

`!` を type の後に付けるか、フッターに `BREAKING CHANGE:` を記載：

```
feat(api)!: change authentication response format

BREAKING CHANGE: auth response now returns user object instead of token only
```

## タスク完了プロトコル

タスクチケット（TASK-XXX）を実装する際は、必ず以下のプロトコルに従ってください。

### タスク管理ファイル

- **タスクチケット**: `docs/TASK_TICKETS.md`
  - 全タスクの定義、ステータス、詳細タスクが記載されています
  - 実装前に必ず確認し、完了後にステータスを更新してください

### 実装前チェックリスト

1. [ ] `docs/TASK_TICKETS.md` でタスクの詳細を確認
2. [ ] 依存タスクが完了しているか確認
3. [ ] 必要なAPIが既に存在するか確認

### 実装中チェックリスト

1. [ ] **テスト追加**: 新機能・バグ修正には対応するテストを追加
   - API変更 → `apps/api/src/__tests__/` にテスト追加
   - 重要なロジック → ユニットテスト追加
2. [ ] 型チェック (`pnpm type-check`) が通ることを確認

### 実装後チェックリスト（必須）

1. [ ] `docs/TASK_TICKETS.md` のステータスを「完了」に更新
2. [ ] 詳細タスクのチェックボックス `[ ]` → `[x]` を更新
3. [ ] 全テストがパスすることを確認 (`pnpm --filter api test`)
4. [ ] 型チェックがパスすることを確認 (`pnpm type-check`)

### 例

```markdown
# 更新前
**ステータス**: 未着手
- [ ] API: XXX機能を実装

# 更新後
**ステータス**: 完了
- [x] API: XXX機能を実装
```

---

## 開発ガイドライン

### コマンド

```bash
pnpm dev          # 開発サーバー起動
pnpm build        # ビルド
pnpm type-check   # 型チェック
pnpm seed         # シードデータ投入
```

### ファイル構成

- `apps/web/` - Next.js フロントエンド
- `apps/api/` - Express バックエンド
- `packages/shared/` - 共有型・ユーティリティ
- `.claude/` - Claude Code設定（エージェント、フック）
- `ai_context/` - AI向けコンテキスト文書

### 設計哲学

必ず以下のドキュメントを参照してください：

- `@ai_context/IMPLEMENTATION_PHILOSOPHY.md` - 実装の哲学
- `@ai_context/MODULAR_DESIGN_PHILOSOPHY.md` - モジュラー設計の哲学
- `@AGENTS.md` - エージェントガイドライン

### コーディング規約

1. **TypeScript**: 厳格な型定義、`any` は使用しない
2. **Zod**: リクエストバリデーションに使用
3. **共有型**: `packages/shared` に配置
4. **エラーハンドリング**: 統一されたAPIレスポンス形式

### Firestore

```
families/{familyId}/
├── items/
├── itemTypes/
├── boxes/
├── locations/
├── tags/
└── wishlist/
```

### セキュリティ

- Firebase Authentication (Google OAuth)
- `familyId` によるマルチテナント分離
- 招待コードによるアクセス制御

## メモリシステム

フックによるメモリシステムが利用可能です。
有効化するには環境変数を設定してください：

```bash
export MEMORY_SYSTEM_ENABLED=true
```

機能：
- セッション開始時に関連コンテキストを注入
- セッション終了時に重要情報を記憶
- サブエージェント呼び出しのログ記録
