# Discord Bot セットアップガイド

Family Inventory Discord Botの設定手順です。

## 1. Discord Developer Portal でアプリケーション作成

1. [Discord Developer Portal](https://discord.com/developers/applications) にアクセス
2. 「New Application」をクリック
3. アプリ名を入力（例: `Family Inventory Bot`）
4. 「Create」をクリック

## 2. Bot を追加してトークン取得

1. 左メニューの「Bot」をクリック
2. 「Add Bot」→「Yes, do it!」をクリック
3. **TOKEN** セクションの「Reset Token」をクリック
4. 表示されたトークンをコピーして安全に保管（これが `BOT_TOKEN`）

> **注意**: トークンは一度しか表示されません。紛失した場合は再生成が必要です。

## 3. Privileged Gateway Intents を有効化

左メニュー「Bot」ページの下部で以下を有効化:

| Intent | 用途 | 必須 |
|--------|------|------|
| MESSAGE CONTENT INTENT | メッセージ内容を読む | Yes |
| SERVER MEMBERS INTENT | メンバー情報取得 | Optional |
| PRESENCE INTENT | プレゼンス情報取得 | No |

## 4. OAuth2 で Bot をサーバーに招待

1. 左メニュー「OAuth2」→「URL Generator」をクリック
2. **SCOPES** で以下を選択:
   - `bot`
   - `applications.commands`
3. **BOT PERMISSIONS** で以下を選択:
   - Send Messages
   - Read Message History
   - Use Slash Commands
   - Embed Links（埋め込みメッセージ用）
   - Add Reactions（リアクション用、任意）
4. ページ下部に生成されたURLをコピー
5. ブラウザで開き、招待したいサーバーを選択して「認証」

## 5. 環境変数の設定

### ローカル開発

```bash
cd apps/bot
cp .env.example .env
```

`.env` を編集:
```
BOT_TOKEN=取得したトークン
API_BASE_URL=http://localhost:8080
```

### 本番環境 (GCP Secret Manager)

```bash
# シークレットを作成
echo -n "取得したトークン" | gcloud secrets create discord-bot-token --data-file=-

# サービスアカウントにアクセス権を付与
gcloud secrets add-iam-policy-binding discord-bot-token \
  --member="serviceAccount:YOUR_SERVICE_ACCOUNT@PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

## 6. 動作確認

### ローカル

```bash
pnpm dev:bot
```

### 確認方法

1. Discordサーバーで Bot がオンラインになっていることを確認
2. `!ping` と送信
3. `Pong!` と返答があれば成功

## トラブルシューティング

### Bot がオフラインのまま

- `BOT_TOKEN` が正しく設定されているか確認
- Developer Portal で Bot が有効になっているか確認

### メッセージに反応しない

- MESSAGE CONTENT INTENT が有効か確認
- Bot に必要な権限があるか確認
- チャンネルで Bot がメッセージを読める権限があるか確認

### 「Used Disallowed Intents」エラー

- Developer Portal で必要な Intents を有効化
- `src/index.ts` の `GatewayIntentBits` 設定を確認

## 参考リンク

- [Discord Developer Portal](https://discord.com/developers/applications)
- [discord.js Guide](https://discordjs.guide/)
- [Discord API Documentation](https://discord.com/developers/docs)
