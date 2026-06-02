# Family Inventory - 家族向け持ち物管理システム

家族で共有する持ち物を管理するシステムです。

## 技術スタック

| レイヤー | 技術 |
|----------|------|
| フロントエンド | Next.js 15 + TypeScript + Tailwind CSS |
| バックエンドAPI | Express + TypeScript |
| データベース | Firestore |
| 認証 | Firebase Auth（Google連携） |

## プロジェクト構成

```
family-inventory/
├── apps/
│   ├── web/          # Next.js フロントエンド
│   └── api/          # Express バックエンドAPI（Web 用 + /agent エンドポイント）
├── packages/
│   └── shared/       # 共通の型定義・ユーティリティ
├── package.json
├── pnpm-workspace.yaml
└── turbo.json
```

## セットアップ

### 前提条件

- Node.js 20+
- pnpm 9+
- Firebase プロジェクト

### インストール

```bash
pnpm install
```

### 環境変数の設定

```bash
cp apps/web/.env.example apps/web/.env.local
cp apps/api/.env.example apps/api/.env
```

### 開発サーバーの起動

```bash
# 全て起動
pnpm dev

# Webのみ
pnpm dev:web

# APIのみ
pnpm dev:api
```

- Web: http://localhost:3000
- API: http://localhost:8080

## 認証フロー

### 初回ユーザー
1. Googleでログイン → 自動的に管理者として登録

### 2人目以降
1. Googleでログイン → 招待コード入力 → 家族に参加

## API エンドポイント

| メソッド | パス | 説明 |
|----------|------|------|
| POST | /auth/login | ログイン |
| POST | /auth/join | 招待コードで参加 |
| GET | /auth/me | 自分の情報取得 |
| GET | /auth/members | 家族メンバー一覧 |
| POST | /auth/invite | 招待コード発行 |
| GET | /auth/invites | 招待コード一覧 |

## エージェント連携 (Hermes 等)

Discord Bot は廃止し、Hermes Agent などの外部 LLM エージェントから REST 経由で操作できるよう、`/agent/*` エンドポイント群を提供しています。

### 認証方式

| ヘッダ | 説明 |
|--------|------|
| `X-API-Key` | Cloud Run の `AGENT_API_KEY` と一致する API キー |
| `X-Agent-Actor` | Actor ID。Firestore の `agentMappings` コレクションで `familyId` / `userId` に解決される |

`familyId` / `userId` の紐付けは `agentMappings` ドキュメントとして管理し、`apps/api/src/scripts/seed-agent-mapping.ts` で投入します（詳細はデプロイ手順書を参照）。

### OpenAPI 仕様

`/agent/*` の API 仕様は `apps/api/openapi.yaml` に集約されています。再生成は以下のコマンドで実行します。

```bash
pnpm --filter api openapi:generate
```

Hermes Agent 側 plugin はこの YAML を取り込んで動的に tool を登録します（後述）。

### 主要エンドポイント

| Method | Path | 用途 |
|--------|------|------|
| GET | `/agent/items` | 持ち物一覧（status / search で絞り込み可） |
| GET | `/agent/items/:id/location` | 持ち物の現在の場所を取得 |
| POST | `/agent/items` | 持ち物を新規作成（itemTypeName 指定で自動的に種別を解決・作成） |
| POST | `/agent/items/:id/{consume,give,sell}` | 持ち物の状態遷移 |
| GET | `/agent/item-types` | アイテム種別の一覧 |
| POST | `/agent/item-types` | アイテム種別を新規作成 |
| PUT | `/agent/item-types/:id` | アイテム種別を更新（name / manufacturer / description / tags） |
| GET | `/agent/tags` | タグの一覧 |
| POST | `/agent/tags` | タグを新規作成（name / color） |
| PUT | `/agent/tags/:id` | タグを更新 |
| GET | `/agent/boxes` | 収納ボックスの一覧 |
| GET | `/agent/boxes/:id/items` | 指定ボックス内の持ち物 |
| GET | `/agent/locations` | 保管場所の一覧 |
| GET | `/agent/wishlist` ほか | ほしいものリストの CRUD・状態遷移 |
| GET | `/agent/search` | アイテム横断検索 |

完全な request / response 形式は `apps/api/openapi.yaml` を参照してください。

### 本番反映手順

Cloud Run / Secret Manager / Firestore への反映手順は次のドキュメントにまとめています。

- [`docs/AGENT_DEPLOYMENT.md`](docs/AGENT_DEPLOYMENT.md) — `AGENT_API_KEY` 生成・Secret Manager 設定・`agentMappings` seed・smoke test まで

### Hermes Agent plugin

khali ホスト上の Hermes Agent からこの API を呼び出すための plugin 実装と、agenix secret / NixOS module の組み込み手順は nix-config 側にあります。

- `nix-config/pkgs/hermes-family-inventory-plugin/README.md`

## CI/CD (GitHub Actions)

### デプロイ先

| サービス | デプロイ先 |
|----------|-----------|
| Web (Next.js) | Firebase Hosting |
| API (Express) | Cloud Run |

### 必要なGitHub Secrets

以下のSecretsをリポジトリに設定してください：

#### GCP認証（Workload Identity Federation推奨）

| Secret名 | 説明 |
|----------|------|
| `GCP_PROJECT_ID` | GCPプロジェクトID |
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | Workload Identity Provider（例: `projects/123456/locations/global/workloadIdentityPools/github/providers/github`） |
| `GCP_SERVICE_ACCOUNT` | サービスアカウント（例: `github-actions@PROJECT_ID.iam.gserviceaccount.com`） |

#### Firebase関連

| Secret名 | 説明 |
|----------|------|
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Firebase サービスアカウントJSON |
| `FIREBASE_API_KEY` | Firebase Web API Key |
| `FIREBASE_AUTH_DOMAIN` | Firebase Auth Domain |
| `FIREBASE_STORAGE_BUCKET` | Firebase Storage Bucket |
| `FIREBASE_MESSAGING_SENDER_ID` | Firebase Messaging Sender ID |
| `FIREBASE_APP_ID` | Firebase App ID |
| `API_URL` | デプロイ後のAPI URL |

### GCPの事前準備

1. **Artifact Registry リポジトリ作成**
   ```bash
   gcloud artifacts repositories create family-inventory \
     --repository-format=docker \
     --location=asia-northeast1
   ```

2. **Workload Identity Federation 設定**
   ```bash
   # Workload Identity Pool 作成
   gcloud iam workload-identity-pools create github \
     --location="global" \
     --display-name="GitHub Actions"

   # Provider 作成
   gcloud iam workload-identity-pools providers create-oidc github \
     --location="global" \
     --workload-identity-pool="github" \
     --display-name="GitHub" \
     --issuer-uri="https://token.actions.githubusercontent.com" \
     --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository" \
     --attribute-condition="assertion.repository_owner==\"YOUR_GITHUB_ORG_OR_USER\""

   # サービスアカウント作成
   gcloud iam service-accounts create github-actions \
     --display-name="GitHub Actions"

   # 必要なロール付与
   gcloud projects add-iam-policy-binding $PROJECT_ID \
     --member="serviceAccount:github-actions@$PROJECT_ID.iam.gserviceaccount.com" \
     --role="roles/run.admin"

   gcloud projects add-iam-policy-binding $PROJECT_ID \
     --member="serviceAccount:github-actions@$PROJECT_ID.iam.gserviceaccount.com" \
     --role="roles/artifactregistry.writer"

   gcloud projects add-iam-policy-binding $PROJECT_ID \
     --member="serviceAccount:github-actions@$PROJECT_ID.iam.gserviceaccount.com" \
     --role="roles/firebase.admin"
   ```

3. **Secret Manager にFirebase認証情報を保存**
   ```bash
   gcloud secrets create firebase-service-account \
     --data-file=path/to/service-account.json
   ```

### ワークフロー

- **deploy.yml**: `main`ブランチへのpush時に本番デプロイ
- **preview.yml**: PRでFirebase Hostingのプレビューをデプロイ
