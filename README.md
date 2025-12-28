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
│   ├── api/          # Express バックエンドAPI
│   └── discord-bot/  # Discord Bot（予定）
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
