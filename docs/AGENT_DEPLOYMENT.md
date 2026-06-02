# Hermes Agent 統合 デプロイ手順書

Hermes Agent（および他の外部 LLM エージェント）から `/agent/*` エンドポイントを利用できるようにするための、本番環境への反映手順書です。

## 1. 概要

### 目的

TASK-1 〜 TASK-6 で完了したコード変更（`AGENT_API_KEY` ベースの認証、`agentMappings` コレクション、`/agent/*` ルート群）を本番環境に反映するために必要な手動作業をまとめます。

### 影響範囲

| 対象 | 操作 |
|------|------|
| Cloud Run（`family-inventory-api`）の環境変数 | `BOT_API_KEY` の廃止、`AGENT_API_KEY` の新規追加 |
| GCP Secret Manager | `agent-api-key` シークレットの作成 |
| Firestore | `agentMappings` コレクションに actor → family/user マッピングを投入 |
| GitHub Actions secrets | （変更不要 — 後述 §5 参照） |

### 所要時間目安

- 動作確認まで含めて **15〜30 分**
- gcloud / firebase 認証のセットアップが既に済んでいる前提

---

## 2. 前提条件

以下が満たされていることを確認してください。

### gcloud CLI

```bash
# 認証済みであること
gcloud auth list

# プロジェクトが Family Inventory の本番 GCP プロジェクトに設定されていること
gcloud config get-value project
# 期待: <PROJECT_ID>（例: family-inventory-xxxxx）

# 未設定なら:
gcloud auth login
gcloud config set project <PROJECT_ID>
```

### Firebase Admin SDK 認証

`apps/api/src/scripts/seed-agent-mapping.ts` は Firebase Admin SDK を利用して Firestore に書き込みます。以下のいずれかで認証してください。

- `apps/api/.env` に `FIREBASE_SERVICE_ACCOUNT_KEY` が設定済み（推奨）
- もしくは `GOOGLE_APPLICATION_CREDENTIALS` 環境変数でサービスアカウント JSON のパスが指定済み

### 投入対象の特定

事前に Firestore Console（または firebase CLI）で以下を控えてください。

- 既存ファミリーの **familyId**（`families/<docId>`）
- マッピング対象ユーザーの **userId**（`families/<familyId>/users/<docId>` の docId）

---

## 3. AGENT_API_KEY の生成と保管

### 生成

下記のいずれか 1 つを実行（環境に応じて）:

```bash
# A. openssl (最もポピュラー)
openssl rand -hex 32

# B. xxd + /dev/urandom (coreutils 系のみ)
head -c 32 /dev/urandom | xxd -p -c 64

# C. Python (大抵の環境で利用可)
python3 -c 'import secrets; print(secrets.token_hex(32))'

# D. nix shell で openssl を一時取得
nix shell nixpkgs#openssl --command openssl rand -hex 32
```

いずれも 64 文字の hex 文字列を出力します（例: `9f2a...`）。

### 保管先

生成した値は **以下 2 箇所に同じ値を投入** します。

1. **GCP Secret Manager**（§4 参照） — Cloud Run の `AGENT_API_KEY` 環境変数として注入
2. **nix-config の agenix secret** `family-inventory-agent-env.age` — khali ホスト上の Hermes Agent が `X-API-Key` ヘッダで送る値

加えて、パスワードマネージャー等に **必ず控え** を残してください。再表示できる場所は基本的にこの 2 箇所のみです。

> 注意: 値を紛失した場合は再生成のうえ、両方の保管先と Cloud Run 環境変数を更新する必要があります。

---

## 4. Cloud Run の Secret Manager 設定

### 旧 `bot-api-key` の削除（存在する場合のみ）

TASK-1 以前に試験運用していた場合は、旧シークレットを片付けます。

```bash
gcloud secrets delete bot-api-key --quiet || true
```

### `agent-api-key` シークレットの作成

```bash
echo -n "<AGENT_API_KEY 値>" | gcloud secrets create agent-api-key \
  --data-file=- \
  --replication-policy=automatic
```

> 重要: `echo -n` を使わないと改行が末尾に混入し、ヘッダ比較で常に失敗します。

### Cloud Run サービスアカウントへの accessor 権限付与

Cloud Run デプロイで利用しているサービスアカウントに、新シークレットへの読み取り権限を付与します。

```bash
# Cloud Run サービスのサービスアカウントを確認
SERVICE_ACCOUNT=$(gcloud run services describe family-inventory-api \
  --region asia-northeast1 \
  --format 'value(spec.template.spec.serviceAccountName)')
echo "Service account: ${SERVICE_ACCOUNT}"

# accessor 権限を付与
gcloud secrets add-iam-policy-binding agent-api-key \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role=roles/secretmanager.secretAccessor
```

> 注: `firebase-service-account` シークレットと同じサービスアカウントを利用している前提です。別アカウントを使用している場合は適宜置き換えてください。

### デプロイへの反映

`.github/workflows/deploy.yml` は既に以下の参照に更新済みです（TASK-6 commit `d678d36`）。

```yaml
--set-secrets "FIREBASE_SERVICE_ACCOUNT=firebase-service-account:latest,AGENT_API_KEY=agent-api-key:latest"
```

そのため、次回 `main` への push または `workflow_dispatch` 実行時に Cloud Run に自動反映されます。即時反映したい場合は GitHub Actions の `Deploy to GCP` ワークフローを手動トリガーしてください。

---

## 5. GitHub Actions secrets 更新

**本手順は不要です。**

`.github/workflows/deploy.yml` を確認した結果、`AGENT_API_KEY` は **Secret Manager 経由でのみ** 注入されており、GitHub repository secrets には保持していません（`secrets.AGENT_API_KEY` のような参照は存在しません）。

参考: deploy.yml で GitHub secrets を参照しているのは以下のみです。

- `GCP_PROJECT_ID`
- `GCP_WORKLOAD_IDENTITY_PROVIDER`
- `GCP_SERVICE_ACCOUNT`
- `FIREBASE_API_KEY`, `FIREBASE_AUTH_DOMAIN`, `FIREBASE_STORAGE_BUCKET`, `FIREBASE_MESSAGING_SENDER_ID`, `FIREBASE_APP_ID`
- `FIREBASE_SERVICE_ACCOUNT_JSON`

将来 CI で `/agent/*` の smoke test を行う必要が出てきた場合は、その時点で `AGENT_API_KEY` を GitHub secrets にも登録する判断をしてください。

---

## 6. Firestore `agentMappings` の seed

### 準備

`apps/api/.env` に Firebase 認証情報がセットされていることを確認します（§2 参照）。

### 実行

```bash
cd /home/narinari/dev/src/github.com/narinari/family-inventory

nix develop --command pnpm --filter api exec tsx src/scripts/seed-agent-mapping.ts \
  --actor narinari \
  --family <既存familyId> \
  --user <narinariのuserId> \
  --description "Hermes agent on khali"
```

`nix develop` を使わない場合は、ホスト側に Node.js / pnpm が揃っていれば以下でも可です。

```bash
pnpm --filter api exec tsx src/scripts/seed-agent-mapping.ts \
  --actor narinari \
  --family <既存familyId> \
  --user <narinariのuserId> \
  --description "Hermes agent on khali"
```

### 期待される出力

```
=== Agent Mapping Seed Script ===
Actor ID:    narinari
Family ID:   <familyId>
User ID:     <userId>
Description: Hermes agent on khali

✅ Agent mapping upserted successfully
{
  "actorId": "narinari",
  "familyId": "<familyId>",
  "userId": "<userId>",
  "description": "Hermes agent on khali",
  "createdAt": "2026-05-17T...",
  "updatedAt": "2026-05-17T..."
}
```

Firestore 上では `agentMappings/<docId>` ドキュメントが作成（または更新）されます。`upsert` 動作のため、複数回流しても安全です。

---

## 7. 動作確認（smoke test）

Cloud Run デプロイが完了したら、ローカルから疎通確認します。

### 正常系

```bash
export AGENT_API_KEY=<生成した値>
export API_URL=https://<cloud-run-url>   # 例: https://family-inventory-api-xxxxx-an.a.run.app

curl -sS \
  -H "X-API-Key: $AGENT_API_KEY" \
  -H "X-Agent-Actor: narinari" \
  "$API_URL/agent/items" | jq
```

期待されるレスポンス:

```json
{
  "success": true,
  "data": {
    "items": [ /* 既存アイテム配列 */ ]
  }
}
```

### 異常系（認証エラーの確認）

| ケース | 期待ステータス | 期待エラーコード |
|--------|--------------|----------------|
| `X-Agent-Actor` ヘッダ欠落 | 401 | `MISSING_AGENT_ACTOR` |
| `X-Agent-Actor` に未登録の actor | 403 | `AGENT_ACTOR_NOT_MAPPED` |
| `X-API-Key` が不正な値 | 401 | `INVALID_API_KEY` |
| `X-API-Key` ヘッダ自体が欠落 | 401 | `INVALID_API_KEY` |

例: actor 欠落のテスト

```bash
curl -sS \
  -H "X-API-Key: $AGENT_API_KEY" \
  "$API_URL/agent/items" | jq
# => { "success": false, "error": { "code": "MISSING_AGENT_ACTOR", "message": "..." } }
```

例: 未登録 actor のテスト

```bash
curl -sS \
  -H "X-API-Key: $AGENT_API_KEY" \
  -H "X-Agent-Actor: unknown-actor" \
  "$API_URL/agent/items" | jq
# => { "success": false, "error": { "code": "AGENT_ACTOR_NOT_MAPPED", "message": "..." } }
```

### Hermes 側からの最終確認

khali 上の Hermes Agent サービスを再起動し、agenix で復号された `AGENT_API_KEY` が Secret Manager 上の値と一致していることを確認します。Hermes 側のログで `200 OK` が返ることを確認できれば完了です。

---

## 8. ロールバック

### `agentMappings` ドキュメントの削除

Firestore Console から `agentMappings/<docId>` を削除するか、firebase CLI で削除します。

```bash
# 一例: Node スクリプトで削除する場合
nix develop --command node -e "
  import('./apps/api/src/lib/firebase.js').then(async ({ db }) => {
    await db.collection('agentMappings').where('actorId', '==', 'narinari').get()
      .then(snap => Promise.all(snap.docs.map(d => d.ref.delete())));
    console.log('deleted');
  });
"
```

> 上記は参考スニペットです。実プロジェクトには専用の削除スクリプトがないため、Firestore Console からの手動削除が最も安全です。

### Secret Manager の secret 削除

```bash
gcloud secrets delete agent-api-key --quiet
```

削除後の Cloud Run は `AGENT_API_KEY` を取得できず、起動時に `AGENT_API_NOT_CONFIGURED` を返す状態になります。完全に Hermes 統合を撤回する場合は、deploy.yml から `AGENT_API_KEY=agent-api-key:latest` を取り除き、再デプロイしてください。

### Cloud Run の旧リビジョンへのロールバック

直前リビジョンに 100% トラフィックを戻します。

```bash
# リビジョン一覧
gcloud run revisions list \
  --service family-inventory-api \
  --region asia-northeast1

# 戻したいリビジョンに 100% を割り当て
gcloud run services update-traffic family-inventory-api \
  --region asia-northeast1 \
  --to-revisions=<旧リビジョン名>=100
```

---

## 関連ドキュメント

- `apps/api/openapi.yaml` — `/agent/*` の OpenAPI 仕様
- `apps/api/src/middleware/auth.ts` — `authenticateAgent` ミドルウェアの実装
- `apps/api/src/routes/agent/helpers.ts` — `agentMappings` から family/user を解決するヘルパ
- `apps/api/src/scripts/seed-agent-mapping.ts` — seed CLI スクリプト
- `.github/workflows/deploy.yml` — Cloud Run デプロイ定義
