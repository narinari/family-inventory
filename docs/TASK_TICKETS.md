# タスクチケット一覧

このドキュメントは `requirements.md` と `architecture-design.md` を元に作成した実装タスクチケットです。

---

## 現在の実装状況

| コンポーネント | 状況 | 備考 |
|---------------|------|------|
| 共有型定義 | 完了 | auth.ts, inventory.ts |
| API認証 | 完了 | login, join, me, members, invite |
| Web認証UI | 完了 | GoogleLogin, InviteCodeForm |
| Firestoreルール | 完了 | firestore.rules, テスト付き |
| 持ち物管理API | 完了 | items, boxes, locations, wishlist, tags, item-types |
| 持ち物管理Web | 完了 | 一覧・詳細・編集画面 |
| Discord Bot | 完了 | 基本コマンド + 拡張コマンド + NLP |

---

## Phase 0: 基盤・インフラ

### TASK-001: 共有型定義の拡充

**優先度**: 高
**依存**: なし
**ステータス**: 完了（auth.ts, inventory.ts に統合実装）

#### 概要
`packages/shared` に全エンティティの型定義を追加する。

#### 詳細タスク
- [ ] `types/family.ts` - 家族エンティティ型
- [ ] `types/user.ts` - ユーザー型の拡充（Discord ID等）
- [ ] `types/item-type.ts` - アイテム種別型
- [ ] `types/item.ts` - 持ち物型
- [ ] `types/box.ts` - 箱型
- [ ] `types/location.ts` - 保管場所型
- [ ] `types/tag.ts` - タグ型
- [ ] `types/wishlist.ts` - 購入予定型
- [ ] `types/api.ts` - API共通レスポンス型
- [ ] Zodスキーマの追加（バリデーション用）

#### 参照
- `architecture-design.md` 5.2 エンティティ詳細
- `requirements.md` 4. エンティティ設計

---

### TASK-002: Firestore セキュリティルール設定

**優先度**: 高
**依存**: TASK-001
**ステータス**: 完了

#### 概要
Firestoreのセキュリティルールを設定し、familyIdベースのマルチテナント分離を実装する。

#### 詳細タスク
- [x] `firestore.rules` ファイル作成
- [x] 認証必須ルールの設定
- [x] familyIdによるアクセス制御
- [x] ロール（admin/member）による権限制御
- [x] ルールのテスト（tests/firestore-rules/）

#### 参照
- `architecture-design.md` 11. 権限設計

---

## Phase 1: Discord連携（優先実装）

### TASK-D01: Discord Bot 基盤構築

**優先度**: 高
**依存**: なし
**ステータス**: 完了

#### 概要
Discord Botの基盤を構築する。

#### 詳細タスク
- [x] `apps/bot` ディレクトリ作成
- [x] package.json（discord.js v14）
- [x] tsconfig.json
- [x] 環境変数設定（BOT_TOKEN等）
- [x] `src/index.ts` - Botエントリーポイント
- [x] `src/lib/api-client.ts` - 内部API呼び出しクライアント
- [x] Dockerfile（Cloud Run用）

#### ディレクトリ構成
```
apps/bot/
├── src/
│   ├── index.ts
│   ├── lib/
│   │   └── api-client.ts
│   ├── commands/
│   └── events/
├── Dockerfile
├── package.json
└── tsconfig.json
```

---

### TASK-D02: Discord OAuth2 連携API

**優先度**: 高
**依存**: TASK-D01
**ステータス**: 完了

#### 概要
WebユーザーとDiscord IDを紐づけるAPIを実装する。

#### エンドポイント
| メソッド | パス | 説明 |
|----------|------|------|
| GET | /auth/discord | Discord OAuth2認証URL取得 |
| POST | /auth/discord/callback | OAuth2コールバック処理 |
| DELETE | /auth/discord | Discord連携解除 |

#### 詳細タスク
- [x] Discord OAuth2設定（Discord Developer Portal）
- [x] `GET /auth/discord` - 認証URLを返す
- [x] `POST /auth/discord/callback` - codeからDiscord IDを取得しユーザーに保存
- [x] `DELETE /auth/discord` - discordIdをnullに更新
- [x] auth.service.ts に `updateUserDiscordId` 関数追加

#### フロー
```
1. Web: 「Discord連携」ボタンクリック
2. API: GET /auth/discord → Discord認証URL返却
3. Web: Discord認証画面へリダイレクト
4. Discord: 認可後、コールバックURLへリダイレクト
5. Web: codeをAPIに送信
6. API: POST /auth/discord/callback → Discord IDを取得・保存
7. Web: 連携完了表示
```

---

### TASK-D03: Bot ユーザー認証機能

**優先度**: 高
**依存**: TASK-D01, TASK-D02
**ステータス**: 完了

#### 概要
Discord IDからシステムユーザーを特定する機能を実装する。

#### 詳細タスク
- [x] `GET /auth/discord/user/:discordId` API追加（Bot専用）
- [x] Bot用API認証（API Key方式）
- [x] auth.service.ts に `getUserByDiscordId` 関数追加
- [x] Bot側でユーザー特定ロジック実装

#### セキュリティ
- Bot→API間はAPI Keyで認証
- 環境変数: `BOT_API_KEY`

---

### TASK-D04: Web Discord連携UI

**優先度**: 高
**依存**: TASK-D02
**ステータス**: 完了

#### 概要
Web側にDiscord連携ボタンと状態表示を追加する。

#### 詳細タスク
- [x] `/settings` ページ作成（または既存に追加）
- [x] Discord連携ボタンコンポーネント
- [x] 連携状態表示（連携済み/未連携）
- [x] 連携解除ボタン
- [x] OAuth2コールバック処理ページ

---

### TASK-D05: Bot 基本コマンド実装

**優先度**: 中
**依存**: TASK-D03
**ステータス**: 完了

#### 概要
基本的なスラッシュコマンドを実装する。

#### コマンド一覧（初期実装）
| コマンド | 説明 |
|----------|------|
| /ping | 疎通確認 |
| /whoami | 連携ユーザー情報表示 |
| /help | ヘルプ表示 |

#### 詳細タスク
- [x] `commands/ping.ts`
- [x] `commands/whoami.ts`
- [x] `commands/help.ts`
- [x] コマンド登録スクリプト

---

## Phase 2: バックエンド API

### TASK-101: ユーザー管理 API

**優先度**: 中
**依存**: TASK-001
**ステータス**: 完了

#### 概要
ユーザー管理に関するAPIエンドポイントを実装する。

#### エンドポイント
| メソッド | パス | 説明 | 状況 |
|----------|------|------|------|
| GET | /users/me | 自分の情報取得 | 完了 |
| PUT | /users/me | 自分の情報更新 | 完了 |
| GET | /users | 家族メンバー一覧 | 完了 |
| POST | /users/invite | 招待コード発行 | 完了 |
| POST | /users/join | 招待コードで参加 | 完了 |

#### 詳細タスク
- [x] `PUT /users/me` - プロフィール更新

---

### TASK-102: アイテム種別 API

**優先度**: 中
**依存**: TASK-001
**ステータス**: 完了

#### 概要
アイテム種別（マスター）のCRUD APIを実装する。

#### エンドポイント
| メソッド | パス | 説明 |
|----------|------|------|
| GET | /item-types | 一覧取得 |
| POST | /item-types | 新規作成 |
| PUT | /item-types/:id | 更新 |
| DELETE | /item-types/:id | 削除 |

#### 詳細タスク
- [x] `routes/item-types.ts` 作成
- [x] `services/item-type.service.ts` 作成
- [x] リクエストバリデーション
- [x] 削除時の参照チェック

---

### TASK-103: 持ち物 API

**優先度**: 中
**依存**: TASK-102
**ステータス**: 完了

#### 概要
持ち物のCRUDおよびステータス変更APIを実装する。

#### エンドポイント
| メソッド | パス | 説明 |
|----------|------|------|
| GET | /items | 一覧取得（フィルタ対応） |
| POST | /items | 新規登録 |
| PUT | /items/:id | 更新 |
| POST | /items/:id/consume | 消費済にする |
| POST | /items/:id/give | 譲渡済にする |
| POST | /items/:id/sell | 売却済にする |
| GET | /items/:id/location | どこにあるか取得 |

#### 詳細タスク
- [x] `routes/items.ts` 作成
- [x] `services/item.service.ts` 作成
- [x] フィルタ・検索ロジック
- [x] ステータス遷移ロジック
- [x] 場所検索ロジック（箱 → 保管場所の解決）

#### 参照
- `requirements.md` 7. 持ち物のライフサイクル

---

### TASK-104: 箱 API

**優先度**: 中
**依存**: TASK-001
**ステータス**: 完了

#### 概要
箱のCRUDおよび中身一覧APIを実装する。

#### エンドポイント
| メソッド | パス | 説明 |
|----------|------|------|
| GET | /boxes | 一覧取得 |
| POST | /boxes | 新規作成 |
| PUT | /boxes/:id | 更新 |
| DELETE | /boxes/:id | 削除 |
| GET | /boxes/:id/items | 箱の中身一覧 |

#### 詳細タスク
- [x] `routes/boxes.ts` 作成
- [x] `services/box.service.ts` 作成
- [x] 削除時の格納アイテムチェック

---

### TASK-105: 保管場所 API

**優先度**: 中
**依存**: TASK-001
**ステータス**: 完了

#### 概要
保管場所のCRUDおよび箱一覧APIを実装する。

#### エンドポイント
| メソッド | パス | 説明 |
|----------|------|------|
| GET | /locations | 一覧取得 |
| POST | /locations | 新規作成 |
| PUT | /locations/:id | 更新 |
| DELETE | /locations/:id | 削除 |
| GET | /locations/:id/boxes | 場所内の箱一覧 |

#### 詳細タスク
- [x] `routes/locations.ts` 作成
- [x] `services/location.service.ts` 作成

---

### TASK-106: タグ API

**優先度**: 中
**依存**: TASK-001
**ステータス**: 完了

#### 概要
タグのCRUD APIを実装する。

#### エンドポイント
| メソッド | パス | 説明 |
|----------|------|------|
| GET | /tags | 一覧取得 |
| POST | /tags | 新規作成 |
| PUT | /tags/:id | 更新 |
| DELETE | /tags/:id | 削除 |

#### 詳細タスク
- [x] `routes/tags.ts` 作成
- [x] `services/tag.service.ts` 作成

---

### TASK-107: 購入予定 API

**優先度**: 中
**依存**: TASK-103
**ステータス**: 完了

#### 概要
購入予定リストのCRUDおよび購入完了→持ち物連携APIを実装する。

#### エンドポイント
| メソッド | パス | 説明 |
|----------|------|------|
| GET | /wishlist | 一覧取得 |
| POST | /wishlist | 新規追加 |
| PUT | /wishlist/:id | 更新 |
| POST | /wishlist/:id/purchase | 購入完了→持ち物へ |
| POST | /wishlist/:id/cancel | 見送り |

#### 詳細タスク
- [x] `routes/wishlist.ts` 作成
- [x] `services/wishlist.service.ts` 作成
- [x] 購入完了時の持ち物自動登録ロジック

#### 参照
- `requirements.md` 8.7 購入予定 → 持ち物 への連携

---

## Phase 3: フロントエンド Web

### TASK-201: ダッシュボード画面

**優先度**: 中
**依存**: TASK-103
**ステータス**: 完了

#### 概要
ログイン後のホーム画面を実装する。

#### 詳細タスク
- [x] `/` トップページ作成（ダッシュボード）
- [x] 持ち物サマリ表示
- [x] 最近追加した持ち物
- [x] 購入予定リストの概要

---

### TASK-202: 持ち物管理画面

**優先度**: 中
**依存**: TASK-103
**ステータス**: 完了

#### 概要
持ち物の一覧・検索・登録・編集画面を実装する。

#### 詳細タスク
- [x] `/items` 一覧ページ
- [x] `/items/new` 新規登録ページ
- [x] `/items/detail` 詳細・編集ページ
- [x] フィルタ・検索機能
- [x] ステータス変更モーダル（消費/譲渡/売却）

---

### TASK-203: 箱・保管場所管理画面

**優先度**: 中
**依存**: TASK-104, TASK-105
**ステータス**: 完了

#### 概要
箱と保管場所の管理画面を実装する。

#### 詳細タスク
- [x] `/boxes` 箱一覧ページ
- [x] `/boxes/detail` 箱詳細（中身一覧）ページ
- [x] `/locations` 保管場所一覧ページ
- [x] `/locations/detail` 場所詳細（箱一覧）ページ
- [x] 新規作成・編集モーダル

---

### TASK-204: 購入予定リスト画面

**優先度**: 中
**依存**: TASK-107
**ステータス**: 完了

#### 概要
購入予定リストの管理画面を実装する。

#### 詳細タスク
- [x] `/wishlist` 一覧ページ
- [x] `/wishlist/new` 新規追加ページ
- [x] `/wishlist/detail` 詳細・編集ページ
- [x] 購入完了アクション
- [x] 優先度フィルタ

---

### TASK-205: ユーザー設定画面

**優先度**: 中
**依存**: TASK-101, TASK-D04
**ステータス**: 完了

#### 概要
ユーザー設定・家族メンバー管理画面を実装する。

#### 詳細タスク
- [x] `/settings` 設定ページ
- [x] `/settings/profile` プロフィール編集
- [x] `/settings/members` メンバー一覧（管理者のみ）
- [x] 招待コード発行機能
- [x] Discord連携UI（TASK-D04と統合）

---

### TASK-206: マスター管理画面

**優先度**: 低
**依存**: TASK-102, TASK-106
**ステータス**: 完了

#### 概要
アイテム種別・タグのマスター管理画面を実装する。

#### 詳細タスク
- [x] `/settings/item-types` アイテム種別一覧
- [x] `/settings/tags` タグ一覧
- [x] 新規作成・編集・削除機能

---

## Phase 4: Discord Bot 拡張

### TASK-301: Bot 持ち物コマンド実装

**優先度**: 低
**依存**: TASK-D05, TASK-103
**ステータス**: 完了

#### 概要
持ち物操作のスラッシュコマンドを実装する。

#### コマンド一覧
| コマンド | 説明 |
|----------|------|
| /item add | 持ち物登録 |
| /item list | 一覧表示 |
| /item search | 検索 |
| /item where | 場所検索 |
| /item use | 消費済 |
| /item give | 譲渡済 |
| /item sell | 売却済 |

#### 詳細タスク
- [x] `commands/item.ts` 実装
- [x] Bot専用APIルート (`/bot/*`) 追加
- [x] ApiClient 拡張

---

### TASK-302: Bot 購入予定コマンド実装

**優先度**: 低
**依存**: TASK-D05, TASK-107
**ステータス**: 完了

#### 概要
購入予定リストのスラッシュコマンドを実装する。

#### コマンド一覧
| コマンド | 説明 |
|----------|------|
| /want add | 欲しい物追加 |
| /want list | 購入予定一覧 |
| /want done | 購入完了 |
| /want cancel | 見送り |
| /want detail | 詳細表示 |

#### 詳細タスク
- [x] `commands/want.ts` 実装

---

### TASK-303: Bot 箱・場所コマンド実装

**優先度**: 低
**依存**: TASK-D05, TASK-104, TASK-105
**ステータス**: 完了

#### 概要
箱・保管場所のスラッシュコマンドを実装する。

#### コマンド一覧
| コマンド | 説明 |
|----------|------|
| /box list | 箱一覧 |
| /box contents | 箱の中身表示 |
| /place list | 保管場所一覧 |
| /place boxes | 場所の箱一覧 |

#### 詳細タスク
- [x] `commands/box.ts` 実装
- [x] `commands/place.ts` 実装
- [x] `/help` コマンド更新

---

### TASK-304: 自然言語処理連携

**優先度**: 低
**依存**: TASK-301, TASK-302
**ステータス**: 完了

#### 概要
Gemini API を使った自然言語処理を実装する。

#### 詳細タスク
- [x] Gemini API クライアント実装 (`lib/gemini.ts`)
- [x] 意図解析プロンプト設計 (`lib/nlp.ts`)
- [x] パラメータ抽出ロジック
- [x] 操作種別判定
- [x] 応答生成
- [x] messageCreate イベントハンドラ (`events/messageCreate.ts`)

#### 対応する自然言語操作
- 場所検索（「○○どこ？」）
- 持ち物登録（「○○買った」）
- 欲しい物追加（「○○欲しい」）
- 購入完了（「○○届いた」）
- 消費（「○○使い切った」）
- 譲渡（「○○あげた」）
- 売却（「○○売った」）
- 一覧表示（「○○の一覧見せて」）
- 格納先変更（「○○を△△に入れた」）※開発中

#### 環境変数
- `GEMINI_API_KEY` - 自然言語処理を有効にする場合に設定

#### 参照
- `architecture-design.md` 3.3 Discord Bot 処理フロー
- `requirements.md` 10.2 自然言語での操作例

---

### TASK-305: リアクションによる自然言語処理トリガー

**優先度**: 中
**依存**: TASK-304
**ステータス**: 完了

#### 概要
Discordメッセージに🤖（ROBOT FACE）絵文字がリアクションとして付けられた場合、そのメッセージを自然言語処理する機能を実装する。

#### 詳細タスク
- [x] `events/messageReactionAdd.ts` イベントハンドラ作成
- [x] 🤖絵文字のリアクション検知
- [x] リアクション対象メッセージの取得
- [x] 既存NLP処理（`lib/nlp.ts`）への連携
- [x] 処理結果の返信（リアクションしたメッセージへのリプライ）
- [x] Bot自身のメッセージへのリアクションは無視
- [x] 部分メッセージのフェッチ対応（キャッシュにない場合）
- [x] `src/index.ts` にイベント登録追加
- [x] NLPハンドラを共通モジュール（`lib/nlp-handlers.ts`）に抽出

#### 技術ポイント
- `messageReactionAdd` イベントを使用
- `Partials.Message`, `Partials.Reaction` の有効化が必要
- 絵文字判定: `reaction.emoji.name === '🤖'`
- 既存の `processNaturalLanguage` 関数を再利用

#### 利用シナリオ
```
ユーザーA: 「電池どこにあったっけ？」
  ↓ 別のユーザーBが🤖リアクションを付ける
Bot: 「電池は リビング > 収納ボックス に保管されています」
```

---

## Phase 5: 統合・運用

### TASK-401: エラーハンドリング統一

**優先度**: 中
**依存**: Phase 2, Phase 3
**ステータス**: 未着手

#### 概要
API・Web全体でエラーハンドリングを統一する。

#### 詳細タスク
- [ ] エラーコード体系設計
- [ ] APIエラーレスポンス統一
- [ ] Webエラー表示コンポーネント
- [ ] エラーログ収集

---

### TASK-402: シードデータ拡充

**優先度**: 低
**依存**: 全API
**ステータス**: 完了

#### 概要
開発・デモ用のシードデータを拡充する。

#### 詳細タスク
- [ ] サンプル家族データ
- [ ] サンプルアイテム種別
- [ ] サンプル持ち物
- [ ] サンプル箱・保管場所
- [ ] サンプル購入予定

---

### TASK-403: デプロイパイプライン整備

**優先度**: 中
**依存**: なし
**ステータス**: 完了

#### 概要
CI/CD パイプラインを整備する。

#### 詳細タスク
- [ ] GitHub Actions ワークフロー
- [ ] Web (Firebase Hosting) 自動デプロイ
- [ ] API (Cloud Run) 自動デプロイ
- [ ] Bot (Cloud Run) 自動デプロイ
- [ ] 型チェック・lint の CI

---

### TASK-404: ドキュメント整備

**優先度**: 低
**依存**: 全タスク
**ステータス**: 未着手

#### 概要
運用ドキュメントを整備する。

#### 詳細タスク
- [ ] API仕様書（OpenAPI/Swagger）
- [ ] 環境構築手順
- [ ] デプロイ手順
- [ ] トラブルシューティング

---

## 依存関係図

```
Phase 0: 基盤
    TASK-001 (型定義)
        └──→ TASK-002 (Firestore Rules)

Phase 1: Discord連携（優先）
    TASK-D01 (Bot基盤)
        ├──→ TASK-D02 (OAuth2 API)
        │        ├──→ TASK-D03 (Bot認証)
        │        └──→ TASK-D04 (Web UI)
        └──→ TASK-D05 (基本コマンド) ←── TASK-D03

Phase 2: API
    TASK-001 ──→ TASK-101 (ユーザー)
            ├──→ TASK-102 (アイテム種別) ──→ TASK-103 (持ち物)
            ├──→ TASK-104 (箱)
            ├──→ TASK-105 (保管場所)
            ├──→ TASK-106 (タグ)
            └──→ TASK-107 (購入予定) ←── TASK-103

Phase 3: Web
    TASK-103 ──→ TASK-201 (ダッシュボード)
            ──→ TASK-202 (持ち物管理)
    TASK-104 ──→ TASK-203 (箱・場所)
    TASK-105 ──↗
    TASK-107 ──→ TASK-204 (購入予定)
    TASK-101 ──→ TASK-205 (ユーザー設定)
    TASK-D04 ──↗
    TASK-102 ──→ TASK-206 (マスター管理)
    TASK-106 ──↗

Phase 4: Bot拡張
    TASK-D05 ──→ TASK-301 (持ち物コマンド) ←── TASK-103
            ──→ TASK-302 (購入予定コマンド) ←── TASK-107
            ──→ TASK-303 (箱・場所コマンド) ←── TASK-104, TASK-105
    TASK-301 ──→ TASK-304 (自然言語)
    TASK-302 ──↗
```

---

## 推奨実装順序

### Step 1: Discord連携（現在の優先目標）
1. **TASK-D01** - Discord Bot基盤構築
2. **TASK-D02** - Discord OAuth2連携API
3. **TASK-D03** - Bot ユーザー認証機能
4. **TASK-D04** - Web Discord連携UI
5. **TASK-D05** - Bot 基本コマンド

### Step 2: 持ち物管理基盤
6. **TASK-001** - 共有型定義拡充
7. **TASK-102** - アイテム種別API
8. **TASK-103** - 持ち物API
9. **TASK-104** - 箱API
10. **TASK-105** - 保管場所API
11. **TASK-106** - タグAPI
12. **TASK-107** - 購入予定API

### Step 3: Web画面
13. **TASK-201** - ダッシュボード
14. **TASK-202** - 持ち物管理画面
15. 以降は優先度に応じて実装

---

## Phase 6: 機能改善

### TASK-501: タグ機能拡張 - アイテム種別・箱・保管場所へのタグ付け

**優先度**: 高
**依存**: TASK-106
**ステータス**: 完了

#### 概要
タグをアイテムだけでなく、アイテム種別・箱・保管場所にも付与できるように拡張する。

#### 詳細タスク
- [x] アイテム種別（itemTypes）にタグフィールド追加
- [x] 箱（boxes）にタグフィールド追加
- [x] 保管場所（locations）にタグフィールド追加
- [x] API: アイテム種別のタグ更新エンドポイント
- [x] API: 箱のタグ更新エンドポイント
- [x] API: 保管場所のタグ更新エンドポイント
- [x] Web: アイテム種別編集画面にタグ選択UI追加
- [x] Web: 箱編集画面にタグ選択UI追加
- [x] Web: 保管場所編集画面にタグ選択UI追加

---

### TASK-502: タグの統合表示

**優先度**: 中
**依存**: TASK-501
**ステータス**: 完了

#### 概要
アイテム詳細画面で、アイテム自体のタグに加えて、関連するアイテム種別・箱・保管場所のタグも統合して表示する。

#### 詳細タスク
- [x] API: アイテム取得時に関連タグを含める
- [x] Web: アイテム詳細画面でタグを種類別に表示
- [x] タグの出所（アイテム/種別/箱/場所）を視覚的に区別

---

### TASK-503: タグによる絞り込み機能

**優先度**: 中
**依存**: TASK-501, TASK-502
**ステータス**: 完了

#### 概要
アイテム一覧でタグによる絞り込みができるようにする。

#### 詳細タスク
- [x] API: アイテム一覧にタグフィルタパラメータ追加
- [x] Web: タグ選択フィルタUI
- [x] 継承タグ（種別・箱・場所から）も含めた絞り込み対応

---

### TASK-504: 所有者による絞り込み機能

**優先度**: 中
**依存**: なし
**ステータス**: 完了

#### 概要
アイテム一覧で所有者（owner）による絞り込みができるようにする。

#### 詳細タスク
- [x] API: アイテム一覧にownerフィルタパラメータ追加
- [x] Web: 所有者選択フィルタUI
- [x] 家族メンバーのドロップダウン表示

---

### TASK-505: ナビゲーション・リンク改善

**優先度**: 高
**依存**: なし
**ステータス**: 完了

#### 概要
画面間のナビゲーションを改善し、関連エンティティへのリンクを追加する。

#### 詳細タスク
- [x] アイテム詳細: アイテム種別名をクリックでアイテム種別詳細へ
- [x] トップページ: 持ち物サマリから持ち物一覧へのリンク
- [x] トップページ: 箱サマリから箱一覧へのリンク
- [x] トップページ: 欲しい物サマリから欲しい物一覧へのリンク
- [x] 箱一覧: 各箱から箱詳細へのリンク（既存）

---

### TASK-506: 箱詳細画面の拡充

**優先度**: 中
**依存**: TASK-505
**ステータス**: 完了

#### 概要
箱詳細画面に箱の中のアイテム一覧を表示する。

#### 詳細タスク
- [x] API: 箱の中身アイテム一覧取得エンドポイント（存在確認）
- [x] Web: 箱詳細ページに中身アイテム一覧セクション追加
- [x] アイテム数の表示
- [x] 各アイテムへのリンク

※ コードは既に実装済み。Firestoreインデックス作成により動作確認完了。

---

### TASK-507: アイテム種別の関連アイテム表示

**優先度**: 低
**依存**: TASK-505
**ステータス**: 完了

#### 概要
アイテム詳細画面に同じアイテム種別の他アイテム数と一覧へのリンクを表示する。

#### 詳細タスク
- [x] API: アイテム種別ごとのアイテム数取得（typeIdフィルター追加）
- [x] Web: アイテム詳細に「同じ種別のアイテム: X件」表示
- [x] 種別でフィルタされた一覧へのリンク
- [x] アイテム一覧でtypeIdクエリパラメータ対応

---

### TASK-508: アイテムへの写真追加機能

**優先度**: 中
**依存**: なし
**ステータス**: 未着手

#### 概要
アイテムに写真を追加・表示できるようにする。

#### 詳細タスク
- [ ] Firebase Storage のセットアップ
- [ ] API: 画像アップロードエンドポイント
- [ ] アイテムスキーマに画像URL配列フィールド追加
- [ ] Web: 画像アップロードコンポーネント
- [ ] Web: アイテム詳細画面に画像ギャラリー表示
- [ ] Web: アイテム編集画面に画像管理UI

---

### TASK-509: 欲しい物への写真追加機能

**優先度**: 低
**依存**: TASK-508
**ステータス**: 未着手

#### 概要
欲しい物（wishlist）にも写真を追加・表示できるようにする。

#### 詳細タスク
- [ ] wishlistスキーマに画像URL配列フィールド追加
- [ ] Web: 欲しい物詳細画面に画像ギャラリー表示
- [ ] Web: 欲しい物編集画面に画像管理UI
- [ ] TASK-508の画像アップロードコンポーネントを再利用

---

### TASK-510: Bot 購入予定検索コマンド実装

**優先度**: 中
**依存**: TASK-302
**ステータス**: 完了

#### 概要
購入予定リストをDiscord Botから検索できるようにする。

#### 詳細タスク
- [x] `/want search <keyword>` サブコマンド追加
- [x] API: 検索用エンドポイント追加または既存エンドポイント拡張
- [x] 名前・メモでの検索対応
- [x] 検索結果のEmbed表示

---

### TASK-511: Web 購入予定タグ付け機能

**優先度**: 中
**依存**: TASK-106, TASK-204
**ステータス**: 完了

#### 概要
Web画面から購入予定リストのアイテムにタグを付与できるようにする。

#### 詳細タスク
- [x] Web: 購入予定編集画面にタグ選択UI追加
- [x] Web: 購入予定詳細画面にタグ表示追加
- [x] 既存のタグ選択コンポーネントを再利用

---

### TASK-512: Bot リスト表示のインタラクティブ化

**優先度**: 中
**依存**: TASK-301, TASK-302
**ステータス**: 完了

#### 概要
Botコマンドでリスト表示した際に、各アイテムに対して操作ボタンとWebページへのリンクを表示する。

#### 詳細タスク
- [x] Bot: `/item list` のEmbed応答にボタンコンポーネント追加
  - [x] 「消費」ボタン（消費済みにする）
  - [x] 「譲渡」ボタン（譲渡済みにする）
  - [x] 「売却」ボタン（売却済みにする）
- [x] Bot: `/want list` のEmbed応答にボタンコンポーネント追加
  - [x] 「購入完了」ボタン（購入済みにする）
  - [x] 「見送り」ボタン（キャンセルする）
- [x] Bot: 各アイテムにWebページへのリンクボタン追加
- [x] Bot: ボタンインタラクションハンドラの実装
- [x] API: ボタン操作用のエンドポイント確認（既存エンドポイント使用）

#### UI設計
```
📦 アイテム名
├── 場所: リビング > 棚A
├── 数量: 3個
└── [消費] [譲渡] [売却] [🔗 Webで見る]
```

#### 技術ポイント
- discord.js のボタンコンポーネント（MessageButton）を使用
- カスタムID形式: `action:entityType:entityId` (例: `consume:item:abc123`)
- InteractionCreate イベントでボタン操作を処理

---

### TASK-601: 棚卸機能 - データモデル拡張

**優先度**: 高
**依存**: なし
**ステータス**: 完了

#### 概要
棚卸機能のためのデータモデル拡張を行う。アイテムに「最終確認日時」フィールドを追加し、確認操作のサービス関数を実装する。

#### 詳細タスク
- [x] `packages/shared/src/types/inventory.ts`: Item 型に `lastVerifiedAt?: Date` 追加
- [x] サービス関数はTASK-602で実装

---

### TASK-602: 棚卸機能 - API実装

**優先度**: 高
**依存**: TASK-601
**ステータス**: 完了

#### 概要
棚卸操作用のAPIエンドポイントを実装する。

#### エンドポイント
| メソッド | パス | 説明 |
|----------|------|------|
| POST | /items/:id/verify | 1件のアイテムを確認済みにする |
| POST | /items/batch-verify | 複数アイテムを一括確認 |

#### 詳細タスク
- [x] `apps/api/src/routes/items.ts`: `POST /items/:id/verify` 追加
- [x] `apps/api/src/routes/items.ts`: `POST /items/batch-verify` 追加
- [x] Zodバリデーションスキーマ追加（verifyAt オプション）
- [x] `apps/api/src/services/item.service.ts`: verifyItem, batchVerifyItems 関数追加

#### APIレスポンス例
```json
// POST /items/:id/verify
{
  "success": true,
  "data": {
    "item": { "id": "xxx", "lastVerifiedAt": "2026-01-04T12:00:00Z", ... }
  }
}

// POST /items/batch-verify
{
  "success": true,
  "data": {
    "verifiedCount": 5,
    "items": [...]
  }
}
```

---

### TASK-603: 棚卸機能 - Web画面実装

**優先度**: 高
**依存**: TASK-602
**ステータス**: 完了

#### 概要
棚卸操作用のWeb画面を実装する。チェックリスト形式で箱内のアイテムを確認できるようにする。

#### 画面構成
| ページ | パス | 機能 |
|--------|------|------|
| 棚卸トップ | /inventory | 保管場所・箱の選択画面 |
| 棚卸チェック | /inventory/check?boxId=xxx | チェックリスト画面 |

#### 詳細タスク
- [x] `apps/web/src/app/inventory/page.tsx`: 棚卸トップ画面
  - 保管場所ごとに箱を階層表示
  - 各箱のアイテム数と最終確認日を表示
- [x] `apps/web/src/app/inventory/check/page.tsx`: チェックリスト画面
  - 箱内アイテムをリスト表示
  - 各アイテムに「確認」ボタン
  - 「全て確認済みにする」ボタン
  - 編集へのリンク（箱移動などの差異修正用）
  - 「+ 登録されていないものを追加」ボタン
- [x] `apps/web/src/lib/api.ts`: verify 関連API呼び出し関数追加
- [x] ナビゲーション（Header）に「棚卸」リンク追加

#### 画面フロー
```
/inventory（棚卸トップ）
  ├── 保管場所A
  │   ├── 箱1 (5点) - 最終確認: 3日前  [棚卸開始]
  │   └── 箱2 (12点) - 未確認          [棚卸開始]
  └── 保管場所B
      └── 箱3 (3点) - 最終確認: 今日   [棚卸開始]

↓ 箱を選択

/inventory/check?boxId=xxx（チェック画面）
  ┌─────────────────────────────────────┐
  │ ☐ USBケーブル      [確認] [編集]    │
  │ ☑ マウス           [確認済]         │
  │ ☐ ACアダプタ       [確認] [編集]    │
  └─────────────────────────────────────┘
  [+ 登録されていないものを追加]
  [全て確認済みにする]
```

---

### TASK-604: アイテム詳細から箱・保管場所へのリンク

**優先度**: 中
**依存**: なし
**ステータス**: 完了

#### 概要
アイテム詳細画面で表示される箱名・保管場所名をクリック可能なリンクにし、それぞれの詳細画面へ遷移できるようにする。

#### 詳細タスク
- [x] `apps/web/src/app/items/detail/ItemDetailClient.tsx`: 箱名をリンク化（`/boxes/detail?id=xxx`）
- [x] `apps/web/src/app/items/detail/ItemDetailClient.tsx`: 保管場所名をリンク化（`/locations/detail?id=xxx`）

#### UI例
```
保管場所: リビング → クリックで /locations/detail?id=xxx へ
箱: 棚A → クリックで /boxes/detail?id=xxx へ
```

---

### TASK-605: アイテム種別の削除権限を全員に開放

**優先度**: 高
**依存**: なし
**ステータス**: 完了

#### 概要
アイテム種別の削除権限を admin のみから family メンバー全員に開放する。使用中チェック（itemが参照している場合は削除不可）は維持。

#### 詳細タスク
- [x] `firestore.rules`: itemTypes の delete ルールを変更
- [x] テスト更新: Firestoreルールテストの削除テストケース修正
- [x] 動作確認

---

### TASK-606: アイテムをテンプレートとして新規作成

**優先度**: 中
**依存**: なし
**ステータス**: 完了

#### 概要
既存アイテムの情報をプリセットした状態で新規作成画面を開き、保管場所などを変更してから登録できる機能を追加する。

#### 詳細タスク
- [x] Web: アイテム詳細画面に「同じものを追加」ボタン追加
- [x] Web: 新規作成画面でクエリパラメータからプリセット値を受け取る
- [x] Web: プリセット値（種別、タグ、保管場所等）をフォームに反映

---

### TASK-607: アイテム種別詳細画面

**優先度**: 中
**依存**: なし
**ステータス**: 完了

#### 概要
アイテム詳細画面からアイテム種別名をクリックした際に、アイテム種別の詳細情報を表示する専用画面を追加する。

#### 詳細タスク
- [x] Web: `/item-types/detail/page.tsx` 新規作成
- [x] API: `GET /item-types/:id` 単体取得エンドポイント追加
- [x] Web: アイテム詳細画面のリンク先を変更
- [x] Web: 種別情報（名前、メーカー、説明、タグ）を表示
- [x] Web: この種別のアイテム数と一覧へのリンク
- [x] Web: 編集・削除機能

---

### TASK-608: メモ/説明フィールドのマークダウン対応

**優先度**: 中
**依存**: なし
**ステータス**: 完了

#### 概要
すべてのエンティティのメモ/説明フィールドでマークダウン記法を使えるようにし、表示時にレンダリングする。

#### 詳細タスク
- [x] マークダウンレンダリングコンポーネント作成
- [x] アイテム詳細画面: メモ表示をマークダウン対応
- [x] 箱詳細画面: メモ表示をマークダウン対応
- [x] 保管場所詳細画面: メモ表示をマークダウン対応
- [x] 購入予定詳細画面: メモ表示をマークダウン対応
- [x] アイテム種別詳細画面: 説明表示をマークダウン対応

---

## Phase 7: コードリファクタリング

code-simplifier エージェントを使用してAPIコードベースを段階的にリファクタリングする。
コンテキスト溢れを防ぐため、機能単位でグループ化したタスクとして実施。

### TASK-R01: 共通基盤の抽出

**優先度**: 高
**依存**: なし
**ステータス**: 未着手

#### 概要
後続タスクで使用する共通ユーティリティを先に抽出する。

#### 詳細タスク
- [ ] `apps/api/src/utils/response.ts` 作成
  - sendSuccess(res, data) - 成功レスポンス
  - sendError(res, code, message, status, details?) - エラーレスポンス
  - sendNotFound(res, entity) - 404レスポンス
- [ ] `apps/api/src/utils/async-handler.ts` 作成
  - asyncHandler(fn) - try-catchラッパー
  - 自動エラーログ出力
- [ ] `apps/api/src/utils/auth-helpers.ts` 作成
  - requireUser(req, res) - 認証済みユーザー取得共通関数
  - requireAdmin(req, res) - 管理者権限チェック
- [ ] 既存テストが通ることを確認

#### リファクタリング観点
- DRY原則: 重複コードの削減
- 単一責任: レスポンス構築を専用関数に

---

### TASK-R02: マスター/タグ リファクタリング

**優先度**: 中
**依存**: TASK-R01
**ステータス**: 未着手

#### 概要
小規模ファイルから始めてリファクタリング手法を確立する。

#### 対象ファイル
- `routes/item-types.ts` (177行)
- `routes/tags.ts` (158行)
- `services/item-type.service.ts` (112行)
- `services/tag.service.ts` (83行)

#### 詳細タスク
- [ ] item-types.ts に TASK-R01 のヘルパー適用
- [ ] tags.ts に TASK-R01 のヘルパー適用
- [ ] Zodスキーマを `schemas/` ディレクトリに分離（検討）
- [ ] テスト確認: `pnpm --filter api test -- item-types tags`

---

### TASK-R03: 組織構造（Boxes/Locations）リファクタリング

**優先度**: 中
**依存**: TASK-R01
**ステータス**: 未着手

#### 概要
類似ファイル（boxes/locations）の共通パターンを整理する。

#### 対象ファイル
- `routes/boxes.ts` (212行)
- `routes/locations.ts` (212行)
- `services/box.service.ts` (134行)
- `services/location.service.ts` (125行)

#### 詳細タスク
- [ ] boxes.ts/locations.ts に TASK-R01 のヘルパー適用
- [ ] 両ファイルの共通パターンを抽出（検討）
- [ ] サービス層: `getXxxCollection(familyId)` パターンの共通化
- [ ] テスト確認: `pnpm --filter api test -- boxes locations`

---

### TASK-R04: 認証/ユーザー リファクタリング

**優先度**: 中
**依存**: TASK-R01
**ステータス**: 未着手

#### 概要
認証関連コードを機能別に整理する。

#### 対象ファイル
- `routes/auth.ts` (506行)
- `services/auth.service.ts` (231行)

#### 詳細タスク
- [ ] auth.ts を機能別に整理（3セクション: 基本認証、Discord OAuth、Bot専用）
- [ ] Discord OAuth 処理（約100行）を `discord-oauth.ts` に分離（検討）
- [ ] TASK-R01 のヘルパー適用
- [ ] テスト確認: `pnpm --filter api test -- discord-oauth`

---

### TASK-R05: 購入予定（Wishlist）リファクタリング

**優先度**: 中
**依存**: TASK-R01
**ステータス**: 未着手

#### 概要
購入予定関連コードの状態遷移を明確化する。

#### 対象ファイル
- `routes/wishlist.ts` (264行)
- `services/wishlist.service.ts` (227行)

#### 詳細タスク
- [ ] wishlist.ts に TASK-R01 のヘルパー適用
- [ ] 状態遷移ロジック（purchase/cancel）の明確化
- [ ] テスト確認: `pnpm --filter api test -- wishlist`

---

### TASK-R06: アイテム管理 リファクタリング

**優先度**: 中
**依存**: TASK-R01, TASK-R03
**ステータス**: 未着手

#### 概要
最大規模のアイテム管理コードを整理する。

#### 対象ファイル
- `routes/items.ts` (450行)
- `services/item.service.ts` (487行)

#### 詳細タスク
- [ ] items.ts に TASK-R01 のヘルパー適用
- [ ] item.service.ts の機能分割検討
  - 基本CRUD
  - 状態変更（consume/give/sell）
  - 位置情報（getItemLocation, getItemWithRelatedTags）
- [ ] `getBoxesCollection`, `getLocationsCollection` の共通モジュール化
- [ ] テスト確認: `pnpm --filter api test -- items`

---

### TASK-R07: Bot統合 リファクタリング（最大ファイル）

**優先度**: 中
**依存**: TASK-R01, TASK-R02, TASK-R03, TASK-R05, TASK-R06
**ステータス**: 未着手

#### 概要
最大ファイル（784行）を機能別に分割する。

#### 対象ファイル
- `routes/bot.ts` (784行)

#### 詳細タスク
- [ ] routes/bot/ ディレクトリへ分割
  - `routes/bot/items.ts` - アイテム関連 (~200行)
  - `routes/bot/wishlist.ts` - 購入予定関連 (~150行)
  - `routes/bot/boxes.ts` - 箱関連 (~80行)
  - `routes/bot/locations.ts` - 保管場所関連 (~60行)
  - `routes/bot/search.ts` - 検索関連 (~60行)
  - `routes/bot/index.ts` - ルーター統合
- [ ] `getUserFromDiscordId` パターンを共通ミドルウェア化
- [ ] TASK-R01 のヘルパー適用
- [ ] E2Eテストで動作確認

---

### TASK-R08: スキーマ整理（仕上げ）

**優先度**: 低
**依存**: TASK-R01〜R07
**ステータス**: 未着手

#### 概要
各ルートに散在するZodスキーマを整理する。

#### 詳細タスク
- [ ] `apps/api/src/schemas/` ディレクトリ作成
- [ ] 各ルートからZodスキーマを移動
  - `schemas/item.schema.ts`
  - `schemas/wishlist.schema.ts`
  - `schemas/auth.schema.ts`
  - etc.
- [ ] スキーマの再利用性向上
- [ ] 全テストが通ることを確認

---

### リファクタリング依存関係図

```
TASK-R01 (共通基盤)
    ├──→ TASK-R02 (マスター/タグ)
    ├──→ TASK-R03 (組織構造)
    ├──→ TASK-R04 (認証)
    ├──→ TASK-R05 (購入予定)
    └──→ TASK-R06 (アイテム) ←── TASK-R03
            └──→ TASK-R07 (Bot統合) ←── R02, R03, R05
                    └──→ TASK-R08 (スキーマ整理)
```

### 推奨実行順序

1. TASK-R01（必須の土台）
2. TASK-R02（小規模で手法確立）
3. TASK-R03（類似ファイルで効率化）
4. TASK-R04（認証系独立）
5. TASK-R05（中規模、独立性高い）
6. TASK-R06（大規模、依存あり）
7. TASK-R07（最大、全依存）
8. TASK-R08（仕上げ）

### 検証方法

- `pnpm --filter api test` で全テスト通過
- `pnpm type-check` で型チェック通過
- `pnpm dev` で動作確認

---

## 改訂履歴

| バージョン | 日付 | 変更内容 |
|-----------|------|---------|
| v1.0 | 2026-01-01 | 初版作成（Discord連携を優先タスクとして整理） |
| v1.1 | 2026-01-03 | TASK-301〜304 完了（Bot拡張コマンド + NLP） |
| v1.2 | 2026-01-03 | Phase 6 追加（機能改善 TASK-501〜509） |
| v1.3 | 2026-01-03 | Phase 1 完了（TASK-D01〜D05 全タスク完了） |
| v1.4 | 2026-01-03 | Phase 2 完了（TASK-101〜107 全API実装済み） |
| v1.5 | 2026-01-03 | Phase 3 完了（TASK-201〜206 全Web画面実装済み） |
| v1.6 | 2026-01-04 | TASK-510, TASK-511 追加（Bot購入予定検索、Web購入予定タグ付け） |
| v1.7 | 2026-01-04 | TASK-512 追加（Botリスト表示のインタラクティブ化 - 操作ボタン・Webリンク） |
| v1.8 | 2026-01-04 | TASK-601〜603 追加（棚卸機能） |
| v1.9 | 2026-01-04 | TASK-604 追加（アイテム詳細から箱・保管場所へのリンク） |
| v1.10 | 2026-01-11 | TASK-305 追加（リアクションによる自然言語処理トリガー） |
| v1.11 | 2026-01-11 | Phase 7 追加（コードリファクタリング TASK-R01〜R08） |
| v1.12 | 2026-01-24 | TASK-605〜608 追加（アイテム種別削除権限、テンプレート作成、種別詳細画面、マークダウン対応） |
