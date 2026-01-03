---
allowed-tools: Bash(git checkout:*), Bash(git pull:*), Bash(git branch:*)
description: 作業ブランチから main に戻り最新を取得 (project)
---

main ブランチに切り替えて最新の状態にし、マージ済みのブランチを削除してください。

## 手順

1. main ブランチに切り替えて最新を取得
2. マージ済みブランチを確認して削除

```bash
# main に切り替えて最新取得
git checkout main && git pull

# マージ済みブランチを確認（main, master, 現在のブランチは除外）
git branch --merged | grep -vE "^\*|main|master"

# マージ済みブランチを削除
git branch --merged | grep -vE "^\*|main|master" | xargs -r git branch -d
```

削除対象のブランチがある場合は、削除前にユーザーに確認してください。
