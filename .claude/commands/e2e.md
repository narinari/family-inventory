---
allowed-tools: Bash, Read, Glob, Grep
description: e2e テストを実行 (project)
---

# e2e テストを実行

## 前提条件の確認

1. Firebase Emulator が起動しているか確認
   - `curl -s http://localhost:9099` (Auth Emulator)
   - `curl -s http://localhost:8080` (Firestore Emulator)

2. 起動していない場合は起動を促す
   ```
   npx firebase emulators:start --project demo-family-inventory --only auth,firestore
   ```

## テスト実行

```bash
cd e2e && pnpm test
```

## 結果の確認

- 失敗したテストがあれば、スクリーンショットを確認: `e2e/test-results/`
- レポートを表示: `cd e2e && pnpm test:report`

## 重要な制約

テストデータは **API 経由で作成する必要がある**（Admin SDK 経由では API から見えない）

詳細は `e2e/README.md` を参照。
