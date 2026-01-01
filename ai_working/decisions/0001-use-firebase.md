# ADR-0001: Firebase の採用

## ステータス

Accepted

## コンテキスト

Family Inventory アプリケーションのバックエンドインフラストラクチャを選定する必要がある。

要件:
- 認証機能（Google OAuth）
- リアルタイムデータ同期
- スケーラブルなデータストア
- 低い運用コスト
- 迅速な開発

## 決定

Firebase (Firestore + Authentication) を採用する。

## 選択肢

### 選択肢1: Firebase
- メリット:
  - 認証が組み込み済み
  - リアルタイム同期が容易
  - サーバーレスで運用負荷が低い
  - 無料枠が充実
- デメリット:
  - ベンダーロックイン
  - 複雑なクエリに制限あり

### 選択肢2: Supabase
- メリット:
  - PostgreSQL ベースで柔軟なクエリ
  - オープンソース
- デメリット:
  - リアルタイム機能がやや複雑
  - セルフホスト時の運用負荷

### 選択肢3: 自前構築 (PostgreSQL + Express)
- メリット:
  - 完全な制御
  - 柔軟性が高い
- デメリット:
  - 開発・運用コストが高い
  - 認証の実装が必要

## 理由

- 家族向けアプリで規模が限定的なため、Firebase の無料枠で十分
- Google OAuth との統合が容易
- リアルタイム同期がFirestoreで簡単に実現可能
- 開発速度を優先

## 影響

- データモデルは Firestore のドキュメント指向に合わせる
- 複雑な集計クエリは避ける設計にする
- Cloud Functions または Cloud Run で API を構築

## 関連

- [Firebase ドキュメント](https://firebase.google.com/docs)
