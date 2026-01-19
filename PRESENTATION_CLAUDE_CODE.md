# Claude Codeで作る本格的なWebアプリケーション

Family Inventoryプロジェクトを例に、Claude Codeの活用方法を紹介します。

---

## 1. 完成したシステム

### Family Inventory - 家族向け持ち物管理システム

| レイヤー | 技術 |
|---------|------|
| フロントエンド | Next.js 15 (App Router), Tailwind CSS 4 |
| バックエンドAPI | Hono, TypeScript, Zod |
| Discord Bot | discord.js v14, Gemini 2.5 Flash (NLP) |
| データベース | Firestore |
| 認証 | Firebase Authentication (Google OAuth) |
| インフラ | GCP (Firebase Hosting, Cloud Run) |
| パッケージ管理 | pnpm monorepo + Turbo |

### 主要機能

- **持ち物管理**: 登録、検索、ステータス管理（消費/譲渡/売却）
- **箱・保管場所管理**: 「〇〇どこ？」に即答
- **購入予定リスト**: 欲しいもの管理 → 購入 → 持ち物へ自動連携
- **Discord Bot**: 自然言語で操作可能（「クリスマスツリーどこ？」）
- **Web UI**: PC/スマホ対応のGUI

### アーキテクチャ

```
┌─────────────────────────────────────────────┐
│                    GCP                       │
│                                              │
│  ┌──────────────┐    ┌──────────────┐       │
│  │Firebase Host │    │  Cloud Run   │       │
│  │  (Next.js)   │    │ (Discord Bot)│       │
│  └──────┬───────┘    └──────┬───────┘       │
│         │                   │               │
│         │            ┌──────┴──────┐        │
│         │            │ Gemini API  │        │
│         │            │  (NLP処理)  │        │
│         │            └──────┬──────┘        │
│         │                   │               │
│         ▼                   ▼               │
│  ┌────────────────────────────────┐         │
│  │       Cloud Run (API / Hono)   │         │
│  └──────────────┬─────────────────┘         │
│                 │                           │
│      ┌──────────┴──────────┐                │
│      ▼                     ▼                │
│  ┌───────────┐      ┌─────────────┐         │
│  │ Firestore │      │Firebase Auth│         │
│  └───────────┘      └─────────────┘         │
└─────────────────────────────────────────────┘
```

### 開発規模

| 指標 | 数値 |
|------|------|
| コミット数 | 135 |
| PR数 | 33 |
| アプリ数 | 3 (web, api, bot) |
| 共有パッケージ | 1 (shared) |

---

## 2. Claude Code設定体系

### ディレクトリ構成

```
.claude/
├── agents/           # 9つの専門サブエージェント
│   ├── zen-architect.md
│   ├── modular-builder.md
│   ├── bug-hunter.md
│   └── ...
├── commands/         # カスタムコマンド（スキル）
│   ├── submit-pr.md
│   ├── back-to-main.md
│   └── e2e.md
├── tools/            # フックスクリプト
│   ├── session-start.ts
│   ├── session-stop.ts
│   └── memory-store.ts
├── settings.json     # グローバル設定
└── logs/             # 実行ログ

ai_context/           # AIへの設計指示書
├── IMPLEMENTATION_PHILOSOPHY.md
└── MODULAR_DESIGN_PHILOSOPHY.md

AGENTS.md             # エージェント全般のガイドライン
CLAUDE.md             # プロジェクト固有の指示
```

### 指示書の役割

| ファイル | 役割 |
|---------|------|
| `CLAUDE.md` | プロジェクト概要、コマンド、Conventional Commits規約 |
| `AGENTS.md` | サブエージェントのガイドライン、行動原則 |
| `ai_context/` | 設計哲学、モジュラー設計パターン |

---

## 3. サブエージェントシステム

### 9つの専門エージェント

| エージェント | 役割 | 使用タイミング |
|-------------|------|---------------|
| **zen-architect** | 設計・計画 | 新機能の設計、アーキテクチャ決定 |
| **modular-builder** | 実装 | 仕様に基づくコード実装 |
| **bug-hunter** | デバッグ | エラー調査、バグ修正 |
| **test-coverage** | テスト | テスト設計、カバレッジ改善 |
| **security-guardian** | セキュリティ | セキュリティレビュー、脆弱性チェック |
| **api-contract-designer** | API設計 | API仕様策定、エンドポイント設計 |
| **database-architect** | DB設計 | Firestoreスキーマ設計 |
| **post-task-cleanup** | クリーンアップ | タスク完了後の整理 |
| **subagent-architect** | エージェント作成 | 新しいエージェントが必要な場合 |

### 開発ワークフロー例

```
新機能追加の流れ:

1. zen-architect     → 要件分析、設計オプション、実装仕様作成
       ↓
2. api-contract-designer → API仕様の定義（必要な場合）
       ↓
3. modular-builder   → 仕様に基づいてコード実装
       ↓
4. test-coverage     → テストギャップ分析、テスト追加
       ↓
5. security-guardian → セキュリティ監査（必要な場合）
       ↓
6. post-task-cleanup → 不要なコード・ファイルの整理
```

### 並列実行戦略

CLAUDE.mdでの指示:

```markdown
## 並列実行戦略

**重要**: 常に「並列で実行できるか？」を考えてください。
複数のツール呼び出しは1つのメッセージで送信します。

### 並列化すべき場面
- 互いに依存しないタスク
- 異なるターゲットへの同様の操作
- 独立した情報収集

### パターン例
# 情報収集（並列）
Single message:
- Read: apps/api/src/routes/auth.ts
- Read: apps/web/src/contexts/AuthContext.tsx
- Grep: "familyId" in apps/

# 複数エージェント分析（並列）
Single message:
- Task zen-architect: "設計アプローチを検討"
- Task bug-hunter: "潜在的な問題を特定"
- Task test-coverage: "テストケースを提案"
```

---

## 4. タスク管理フロー

### TASK-XXX形式のチケット管理

`docs/TASK_TICKETS.md` でタスクを一元管理:

```markdown
## TASK-305: リアクション起点のNLP処理

**ステータス**: 完了
**依存**: TASK-304

### 詳細タスク
- [x] リアクションイベントハンドラーの実装
- [x] NLPトリガー用の絵文字定義
- [x] 既存NLP処理との統合
- [x] テスト追加
```

### PR命名規則

コミット・PRはタスク番号と紐づけ:

```
feat(bot): add reaction-triggered NLP processing (TASK-305)
fix(web): resolve authentication state persistence issue
docs: update README with setup instructions
```

### タスク完了プロトコル

CLAUDE.mdでの指示:

```markdown
## タスク完了プロトコル

### 実装前チェックリスト
1. [ ] `docs/TASK_TICKETS.md` でタスクの詳細を確認
2. [ ] 依存タスクが完了しているか確認

### 実装後チェックリスト（必須）
1. [ ] `docs/TASK_TICKETS.md` のステータスを「完了」に更新
2. [ ] 詳細タスクのチェックボックス `[ ]` → `[x]` を更新
3. [ ] 全テストがパスすることを確認
4. [ ] 型チェックがパスすることを確認
```

### PRの例（実際の履歴から）

| PR# | タイトル | 内容 |
|-----|---------|------|
| #33 | feat(bot): add reaction-triggered NLP processing (TASK-305) | リアクション起点NLP |
| #24 | feat: 棚卸機能の実装とアイテム詳細のリンク改善 (TASK-601〜604) | 複数タスクまとめ |
| #18 | feat: タグ統合表示・タグ/所有者による絞り込み機能 (TASK-502, 503, 504) | フィルタリング機能 |
| #9 | feat: add Firestore security rules with comprehensive tests (TASK-002) | セキュリティルール |

---

## 5. 設計哲学

### 実装哲学（IMPLEMENTATION_PHILOSOPHY.md）

```markdown
## Core Philosophy

- **Wabi-sabi philosophy**: シンプルさと本質を重視
- **Occam's Razor thinking**: 可能な限りシンプルに
- **Trust in emergence**: シンプルなコンポーネントから複雑なシステムを構築
- **Present-moment focus**: 今必要なものだけを実装
- **Pragmatic trust**: 外部システムを信頼し、失敗時に対処

## Core Design Principles

### 1. Ruthless Simplicity
- KISS原則を徹底
- 抽象化は存在意義を正当化できる場合のみ
- 将来のための機能は作らない（YAGNI）

### 2. Architectural Integrity with Minimal Implementation
- 重要なアーキテクチャパターンは維持
- 実装はシンプルに
- エンドツーエンドの流れに集中
```

### Zero-BS原則（AGENTS.md）

```markdown
## Zero-BS原則（スタブ・プレースホルダー禁止）

**動作するコードを書く。目的のないプレースホルダーは避ける。**

### 避けるべきパターン
throw new Error('Not implemented');
// TODO: 後で実装
return {} as any; // stub

### 正しいアプローチ
- 要件が曖昧な場合 → 具体的な詳細を質問する
- 外部依存がある場合 → 最小限の動作版を作る
- YAGNI → 使わない機能は作らない
```

### モジュラー設計（Bricks & Studs）

```markdown
## Brick Philosophy

- **Brick** = 1つの明確な責務を持つ自己完結型モジュール
- **Stud** = 他と接続するための公開契約（API、データモデル）
- **Regeneratable** = 仕様から再構築可能
- **Isolated** = コード、テスト、フィクスチャすべてがモジュール内に

## Module Structure
module_name/
├── index.ts       # Public API
├── core.ts        # Main implementation
├── models.ts      # Data models
├── utils.ts       # Internal utilities
└── __tests__/
    └── core.test.ts
```

---

## 6. カスタムコマンド（スキル）

### /submit-pr - PR作成の自動化

```markdown
# 変更をコミット、プッシュしてPRを作成

## 1. 変更内容の確認
- `git status` と `git diff` で変更内容を確認
- `git log` で最近のコミットメッセージのスタイルを確認

## 2. コミットとプッシュ
- Conventional Commits形式でコミットメッセージを作成
- `git add` → `git commit` → `git push`

## 3. PR作成
- `gh pr create` でPRを作成
- `gh pr merge --auto --merge` でオートマージを有効化

## 4. CIチェックの確認
- PRのステータスを監視
- チェック失敗時は自動で修正を試みる
- 全チェック成功後、マージを確認
```

### /back-to-main - ブランチ切り替え

```markdown
# 作業ブランチからmainに戻り最新を取得

1. git checkout main
2. git pull origin main
3. マージ済みブランチの削除（オプション）
```

### /e2e - E2Eテスト実行

```markdown
# E2Eテストを実行

1. Firebase Emulatorを起動
2. Playwrightでテスト実行
3. 結果をレポート
```

---

## 7. フック・メモリシステム

### セッション開始フック

`session-start.ts`:
- メモリシステムから関連コンテキストを検索・注入
- mainブランチにいる場合の警告表示
- TASK-XXXパターン検出でリマインダー表示

### メモリシステム

```typescript
// .claude/tools/memory-store.ts

interface Memory {
  id: string;
  content: string;
  category: 'decision' | 'pattern' | 'context' | 'warning';
  tags: string[];
  createdAt: string;
}

// 機能
- セッション間でコンテキストを保持
- キーワード検索、カテゴリフィルタ
- 最大1000メモリまで保持
- JSONファイルベースのシンプルなストレージ
```

有効化:
```bash
export MEMORY_SYSTEM_ENABLED=true
```

---

## 8. まとめ

### Claude Codeで実現できたこと

| 成果 | 詳細 |
|------|------|
| **フルスタック開発** | Next.js + Hono + Firestoreの3層アーキテクチャ |
| **Discord Bot** | 自然言語対応（Gemini API連携） |
| **CI/CD** | GitHub Actions、自動デプロイ |
| **テスト** | E2Eテスト（Playwright）、Firestoreルールテスト |
| **セキュリティ** | Firebase Auth、招待コード制御 |

### 効率化のポイント

1. **サブエージェントの活用**
   - 専門エージェントに委譲して深い分析
   - 並列実行でコンテキスト効率化

2. **指示書の整備**
   - CLAUDE.md、AGENTS.mdで一貫した指示
   - 設計哲学の共有で品質維持

3. **タスク管理の統合**
   - TASK-XXX形式でトレーサビリティ確保
   - 完了プロトコルで漏れ防止

4. **カスタムコマンド**
   - 繰り返し作業の自動化
   - CIチェックまで含めたワークフロー

### 導入のヒント

1. **小さく始める**
   - まずCLAUDE.mdを作成
   - 必要に応じてエージェントを追加

2. **設計哲学を共有**
   - ai_context/に設計方針を明文化
   - Claudeが一貫した判断を下せるように

3. **ワークフローを自動化**
   - よく使う操作をコマンド化
   - フックでコンテキストを自動注入

---

## 参考: プロジェクト構造

```
family-inventory/
├── apps/
│   ├── web/              # Next.js 15 フロントエンド
│   ├── api/              # Hono バックエンド
│   └── bot/              # Discord Bot
├── packages/
│   └── shared/           # 共有型・ユーティリティ
├── .claude/
│   ├── agents/           # 9つのサブエージェント
│   ├── commands/         # カスタムコマンド
│   ├── tools/            # フック・メモリシステム
│   └── settings.json
├── ai_context/           # 設計哲学ドキュメント
├── docs/
│   ├── TASK_TICKETS.md   # タスク管理
│   ├── requirements.md   # 要件定義
│   └── architecture-design.md
├── AGENTS.md
└── CLAUDE.md
```
