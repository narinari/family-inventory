# Modular Design Philosophy

モジュラー設計の哲学を定義します。

## Bricks & Studs パターン

モジュールは「ブロック」のように組み合わせ可能であるべきです。

### モジュールの特性

1. **自己完結**: 外部依存を最小限に
2. **明確な境界**: 入出力が明確
3. **再利用可能**: 複数のコンテキストで使用可能
4. **テスト可能**: 独立してテスト可能

### モジュール構造

```
module/
├── index.ts          # Public API (exports)
├── types.ts          # Type definitions
├── service.ts        # Business logic
├── repository.ts     # Data access
└── __tests__/        # Tests
    └── service.test.ts
```

## Contract-First Design

### モジュール契約

```typescript
// types.ts
export interface ModuleContract {
  // Inputs
  input: InputType;

  // Outputs
  output: OutputType;

  // Side Effects (明示的に宣言)
  sideEffects?: {
    writes?: string[];
    reads?: string[];
    external?: string[];
  };
}
```

### 依存関係の注入

```typescript
// service.ts
export function createService(deps: Dependencies) {
  return {
    doSomething: async (input: Input): Promise<Output> => {
      // Implementation using deps
    },
  };
}
```

## Monorepo 構造

### パッケージ分離

```
packages/
├── shared/           # 共有型・ユーティリティ
│   ├── src/
│   │   ├── types/    # 型定義
│   │   └── utils/    # ユーティリティ
│   └── package.json
apps/
├── web/              # フロントエンド
│   └── src/
│       ├── components/
│       ├── contexts/
│       └── lib/
└── api/              # バックエンド
    └── src/
        ├── routes/
        ├── services/
        ├── middleware/
        └── lib/
```

### 依存関係のルール

1. `apps/*` は `packages/*` に依存できる
2. `packages/*` は他の `packages/*` に依存できる
3. `apps/*` 間の直接依存は避ける
4. 循環依存は禁止

## API 設計

### RESTful 規約

```
GET    /api/items          # 一覧取得
GET    /api/items/:id      # 詳細取得
POST   /api/items          # 作成
PUT    /api/items/:id      # 更新
DELETE /api/items/:id      # 削除
```

### レスポンス形式

```typescript
// 成功
{
  success: true,
  data: T
}

// エラー
{
  success: false,
  error: {
    code: string,
    message: string,
    details?: unknown
  }
}
```

## コンポーネント設計

### React コンポーネント

```typescript
// 単一責任
function ItemCard({ item, onEdit, onDelete }: ItemCardProps) {
  // UI のみ、ロジックは最小限
}

// コンテナ/プレゼンテーション分離
function ItemListContainer() {
  const { items, loading } = useItems();
  return <ItemList items={items} loading={loading} />;
}

function ItemList({ items, loading }: ItemListProps) {
  // 純粋なプレゼンテーション
}
```

### フック設計

```typescript
// 単一責任のカスタムフック
function useItems() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  // データ取得ロジック

  return { items, loading, refetch };
}
```

## テスト戦略

### テストピラミッド

- **60% ユニットテスト**: 個別関数・コンポーネント
- **30% 統合テスト**: モジュール間連携
- **10% E2E テスト**: 重要なユーザーフロー

### モック戦略

```typescript
// 外部依存はモック
const mockFirestore = {
  collection: jest.fn(),
  doc: jest.fn(),
};

// 内部モジュールは実装を使用
import { validateItem } from './validation';
```

## 再生成優先

### パッチより再生成

問題のあるモジュールは修正より再生成を検討：

1. 契約（入出力）を明確化
2. テストを先に書く
3. 実装を再生成
4. テストで検証

### バージョニング

```typescript
// 破壊的変更時は新バージョンを作成
export { createServiceV2 } from './service-v2';
// 古いバージョンは非推奨化
/** @deprecated Use createServiceV2 instead */
export { createService } from './service';
```
