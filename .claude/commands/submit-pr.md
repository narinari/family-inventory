---
allowed-tools: Bash(git status:*), Bash(git diff:*), Bash(git log:*), Bash(git add:*), Bash(git commit:*), Bash(git push:*), Bash(gh pr create:*), Bash(gh pr merge:*)
description: 変更をコミット、プッシュしてPRを作成 (project)
---

# 変更をコミット、プッシュしてPRを作成

以下の手順を実行してください：

1. `git status` と `git diff` で変更内容を確認
2. `git log` で最近のコミットメッセージのスタイルを確認
3. 変更内容に基づいて適切なコミットメッセージを作成（Conventional Commits形式）
4. `git add` で変更をステージング
5. `git commit` でコミット
6. `git push -u origin <branch>` でプッシュ
7. `gh pr create` でPRを作成
8. `gh pr merge --auto --merge` でオートマージを有効化

PRのタイトルとbodyは変更内容から適切に生成してください。
