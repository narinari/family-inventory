---
allowed-tools: Bash(git status:*), Bash(git diff:*), Bash(git log:*), Bash(git add:*), Bash(git commit:*), Bash(git push:*), Bash(git checkout:*), Bash(gh:*), Bash(sleep:*)
description: 変更をコミット、プッシュしてPRを作成 (project)
---

# 変更をコミット、プッシュしてPRを作成

以下の手順を実行してください：

## 1. 変更内容の確認
- `git status` と `git diff` で変更内容を確認
- `git log` で最近のコミットメッセージのスタイルを確認

## 2. コミットとプッシュ
- 変更内容に基づいて適切なコミットメッセージを作成（Conventional Commits形式）
- `git add` で変更をステージング
- `git commit` でコミット
- `git push -u origin <branch>` でプッシュ

## 3. PR作成
- `gh pr create` でPRを作成
- `gh pr merge --auto --merge` でオートマージを有効化

## 4. CIチェックの確認
PR作成後、CIチェックが完了するまで監視してください：

1. `gh pr view <PR番号> --json state,statusCheckRollup,mergeStateStatus` でステータスを確認
2. チェックが `IN_PROGRESS` の場合は30-60秒待ってから再確認
3. 全てのチェックが `SUCCESS` になるか、`FAILURE` が発生するまで繰り返す
4. チェック失敗時：
   - `gh run view <run_id> --log-failed` でエラーログを確認
   - 問題を修正してコミット＆プッシュ
   - 再度CIチェックを監視
5. 全チェック成功後、PRがマージされたことを確認

## 注意事項
- PRのタイトルとbodyは変更内容から適切に生成すること
- CIが失敗した場合は自動的に修正を試みること
