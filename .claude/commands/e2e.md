---
allowed-tools: Bash, Read, Glob, Grep
description: e2e テストを実行 (project)
---

# e2e テストを実行

## 1. Firebase Emulator の確認・起動

Firebase Emulator が起動しているか確認し、起動していなければ自動で起動する。

```bash
# Emulator の起動確認
curl -s http://localhost:9099 > /dev/null 2>&1 && curl -s http://localhost:8080 > /dev/null 2>&1
```

**起動していない場合**:
1. バックグラウンドで Emulator を起動（`run_in_background: true` を使用）
   ```bash
   npx firebase emulators:start --project demo-family-inventory --only auth,firestore
   ```
2. 起動完了を待つ（5秒待ってから再確認、最大3回）
   ```bash
   sleep 5 && curl -s http://localhost:9099 > /dev/null && curl -s http://localhost:8080 > /dev/null
   ```

## 2. テスト実行

```bash
cd e2e && pnpm test
```

## 3. 結果の確認

- 失敗したテストがあれば、スクリーンショットを確認: `e2e/test-results/`
- レポートを表示: `cd e2e && pnpm test:report`

## 重要な制約

テストデータは **API 経由で作成する必要がある**（Admin SDK 経由では API から見えない）

詳細は `e2e/README.md` を参照。
