import {
  OpenAPIRegistry,
  extendZodWithOpenApi,
} from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import {
  agentCreateItemSchema,
  agentGiveItemSchema,
  agentSellItemSchema,
  agentCreateWishlistSchema,
  statusActionSchema,
} from '../schemas/index.js';

extendZodWithOpenApi(z);

/**
 * Family Inventory Agent API 用 OpenAPI レジストリ。
 *
 * - `/agent/*` ルートのみを単一情報源として登録する。
 * - LLM エージェントが Tool として動的登録する前提のため、
 *   `operationId` / `summary` / `description` の質に注意する。
 */
export const registry = new OpenAPIRegistry();

// ============================================
// Security Schemes
// ============================================

registry.registerComponent('securitySchemes', 'agentApiKey', {
  type: 'apiKey',
  in: 'header',
  name: 'X-API-Key',
  description: 'Family Inventory が発行するエージェント用 API キー',
});

registry.registerComponent('securitySchemes', 'agentActor', {
  type: 'apiKey',
  in: 'header',
  name: 'X-Agent-Actor',
  description:
    'エージェント Actor ID。family と user に紐付く agentMappings レコードを特定するために使用する。',
});

const agentSecurity = [
  {
    agentApiKey: [],
    agentActor: [],
  },
];

// ============================================
// Reusable schemas (with OpenAPI metadata)
// ============================================

const ItemStatusSchema = z
  .enum(['owned', 'consumed', 'given', 'sold'])
  .openapi('ItemStatus', {
    description:
      '持ち物のステータス。owned = 所有中, consumed = 消費済み, given = 譲渡済み, sold = 売却済み',
  });

const WishlistStatusSchema = z
  .enum(['pending', 'purchased', 'cancelled'])
  .openapi('WishlistStatus', {
    description:
      '購入予定のステータス。pending = 検討中, purchased = 購入完了, cancelled = 見送り',
  });

const PrioritySchema = z
  .enum(['high', 'medium', 'low'])
  .openapi('Priority', {
    description: '優先度。high = 高, medium = 中, low = 低',
  });

const ItemSchema = z
  .object({
    id: z.string(),
    familyId: z.string(),
    itemTypeId: z.string(),
    itemTypeName: z.string().optional(),
    ownerId: z.string(),
    status: ItemStatusSchema,
    boxId: z.string().optional(),
    tags: z.array(z.string()),
    memo: z.string().optional(),
    purchasedAt: z.string().datetime().optional(),
    consumedAt: z.string().datetime().optional(),
    givenAt: z.string().datetime().optional(),
    soldAt: z.string().datetime().optional(),
    givenTo: z.string().optional(),
    soldTo: z.string().optional(),
    soldPrice: z.number().optional(),
    lastVerifiedAt: z.string().datetime().optional(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .openapi('Item', {
    description:
      '家族の持ち物 1 件。itemTypeId は ItemType の参照。status により所有・消費・譲渡・売却が表現される。',
  });

const ItemTypeSchema = z
  .object({
    id: z.string(),
    familyId: z.string(),
    name: z.string(),
    manufacturer: z.string().optional(),
    description: z.string().optional(),
    tags: z.array(z.string()),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .openapi('ItemType', {
    description:
      'アイテム種別 (マスタ)。同じ製品を複数所有する場合に Item 同士を束ねる軸となる。',
  });

const BoxSchema = z
  .object({
    id: z.string(),
    familyId: z.string(),
    name: z.string(),
    locationId: z.string().optional(),
    locationName: z.string().optional(),
    description: z.string().optional(),
    tags: z.array(z.string()),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .openapi('Box', {
    description:
      '持ち物をまとめる収納箱。locationId により保管場所 (Location) と紐付く。',
  });

const LocationSchema = z
  .object({
    id: z.string(),
    familyId: z.string(),
    name: z.string(),
    address: z.string().optional(),
    description: z.string().optional(),
    tags: z.array(z.string()),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .openapi('Location', {
    description:
      '物理的な保管場所 (家・倉庫・部屋など)。複数の Box をまとめる単位として使う。',
  });

const WishlistSchema = z
  .object({
    id: z.string(),
    familyId: z.string(),
    name: z.string(),
    itemTypeId: z.string().optional(),
    requesterId: z.string(),
    priority: PrioritySchema,
    priceRange: z.string().optional(),
    deadline: z.string().datetime().optional(),
    url: z.string().optional(),
    tags: z.array(z.string()),
    memo: z.string().optional(),
    status: WishlistStatusSchema,
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .openapi('Wishlist', {
    description:
      '購入予定 (ほしいもの) 1 件。pending → purchased / cancelled に状態遷移する。',
  });

const ErrorSchema = z
  .object({
    code: z.string().openapi({ example: 'ITEM_NOT_FOUND' }),
    message: z.string().openapi({ example: '持ち物が見つかりません' }),
    details: z.unknown().optional(),
  })
  .openapi('ApiError', {
    description: 'API 共通エラーオブジェクト。',
  });

/** 成功レスポンスのエンベロープ生成ヘルパー */
function successEnvelope<T extends z.ZodTypeAny>(
  dataSchema: T,
  refId: string,
  description: string
) {
  return z
    .object({
      success: z.literal(true),
      data: dataSchema,
    })
    .openapi(refId, { description });
}

/** エラーレスポンスのエンベロープ */
const ErrorResponseSchema = z
  .object({
    success: z.literal(false),
    error: ErrorSchema,
  })
  .openapi('ApiErrorResponse', { description: 'API エラーレスポンス' });

// ============================================
// Response payload schemas
// ============================================

const ItemsListResponse = successEnvelope(
  z.object({ items: z.array(ItemSchema) }),
  'ItemsListResponse',
  '持ち物一覧レスポンス'
);

const ItemResponse = successEnvelope(
  z.object({ item: ItemSchema }),
  'ItemResponse',
  '単一持ち物レスポンス'
);

const ItemLocationResponse = successEnvelope(
  z.object({
    item: ItemSchema,
    itemType: ItemTypeSchema,
    box: BoxSchema.optional(),
    location: LocationSchema.optional(),
  }),
  'ItemLocationResponse',
  '持ち物の所在 (box / location) を含む詳細レスポンス'
);

const ItemTypesListResponse = successEnvelope(
  z.object({ itemTypes: z.array(ItemTypeSchema) }),
  'ItemTypesListResponse',
  'アイテム種別一覧レスポンス'
);

const BoxesListResponse = successEnvelope(
  z.object({ boxes: z.array(BoxSchema) }),
  'BoxesListResponse',
  '箱一覧レスポンス'
);

const BoxItemsResponse = successEnvelope(
  z.object({
    box: BoxSchema,
    items: z.array(ItemSchema),
  }),
  'BoxItemsResponse',
  '箱の中身レスポンス'
);

const LocationsListResponse = successEnvelope(
  z.object({ locations: z.array(LocationSchema) }),
  'LocationsListResponse',
  '保管場所一覧レスポンス'
);

const LocationBoxesResponse = successEnvelope(
  z.object({
    location: LocationSchema,
    boxes: z.array(BoxSchema),
  }),
  'LocationBoxesResponse',
  '保管場所配下の箱一覧レスポンス'
);

const SearchResultsResponse = successEnvelope(
  z.object({
    results: z.array(
      z.object({
        item: ItemSchema,
        box: BoxSchema.optional(),
        location: LocationSchema.optional(),
      })
    ),
  }),
  'SearchResultsResponse',
  '名前検索結果レスポンス'
);

const WishlistListResponse = successEnvelope(
  z.object({ wishlist: z.array(WishlistSchema) }),
  'WishlistListResponse',
  '購入予定一覧レスポンス'
);

const WishlistResponse = successEnvelope(
  z.object({ wishlist: WishlistSchema }),
  'WishlistResponse',
  '単一購入予定レスポンス'
);

const WishlistPurchaseResponse = successEnvelope(
  z.object({
    wishlist: WishlistSchema,
    item: ItemSchema.optional(),
  }),
  'WishlistPurchaseResponse',
  '購入完了レスポンス。購入予定の状態と、自動生成された持ち物 (Item) を返す。'
);

// ============================================
// Request body schemas (with OpenAPI metadata)
// ============================================

const AgentCreateItemRequest = agentCreateItemSchema.openapi(
  'AgentCreateItemRequest',
  {
    description:
      '持ち物の新規作成リクエスト。itemTypeId が無い場合は itemTypeName を渡すと自動で ItemType を解決/作成する。',
  }
);

const AgentGiveItemRequest = agentGiveItemSchema.openapi('AgentGiveItemRequest', {
  description: '譲渡操作のリクエスト。givenTo に譲渡先を文字列で渡す。',
});

const AgentSellItemRequest = agentSellItemSchema.openapi('AgentSellItemRequest', {
  description: '売却操作のリクエスト。soldTo / soldPrice は任意。',
});

const AgentCreateWishlistRequest = agentCreateWishlistSchema.openapi(
  'AgentCreateWishlistRequest',
  {
    description: '購入予定の新規作成リクエスト。',
  }
);

const StatusActionRequest = statusActionSchema.openapi('StatusActionRequest', {
  description: '状態遷移系エンドポイント用の空ボディ。',
});

// ============================================
// Common response helpers
// ============================================

const commonErrorResponses = {
  400: {
    description: 'バリデーションエラー / ステータス不整合',
    content: { 'application/json': { schema: ErrorResponseSchema } },
  },
  401: {
    description: 'API キーが無効',
    content: { 'application/json': { schema: ErrorResponseSchema } },
  },
  403: {
    description: 'エージェント Actor がファミリーに紐付いていない',
    content: { 'application/json': { schema: ErrorResponseSchema } },
  },
  404: {
    description: 'リソースが見つからない',
    content: { 'application/json': { schema: ErrorResponseSchema } },
  },
  500: {
    description: 'サーバ内部エラー',
    content: { 'application/json': { schema: ErrorResponseSchema } },
  },
};

// ============================================
// Path registrations
// ============================================

// --- Items ---

registry.registerPath({
  method: 'get',
  path: '/agent/items',
  operationId: 'listItems',
  summary: '持ち物の一覧を取得',
  description:
    '家族に紐付く持ち物 (Item) の一覧を返す。status (owned/consumed/given/sold) や search (アイテム種別名のあいまい一致) で絞り込み可能。所有中のものを聞かれた場合は status=owned を指定する。',
  tags: ['Items'],
  security: agentSecurity,
  request: {
    query: z.object({
      status: ItemStatusSchema.optional().openapi({
        description: '指定したステータスのみ返す。未指定は全件。',
      }),
      search: z
        .string()
        .optional()
        .openapi({ description: 'アイテム種別名/メモへのあいまい検索キーワード' }),
    }),
  },
  responses: {
    200: {
      description: '持ち物の一覧',
      content: { 'application/json': { schema: ItemsListResponse } },
    },
    ...commonErrorResponses,
  },
});

registry.registerPath({
  method: 'get',
  path: '/agent/items/{id}/location',
  operationId: 'getItemLocation',
  summary: '持ち物の保管場所を取得',
  description:
    '指定した持ち物 (Item) の所在 (どの Box / Location にあるか) を返す。「○○ どこ？」系の質問に対する一次情報源として使う。',
  tags: ['Items'],
  security: agentSecurity,
  request: {
    params: z.object({
      id: z.string().openapi({ description: '持ち物 ID', example: 'item_xxx' }),
    }),
  },
  responses: {
    200: {
      description: '持ち物の所在情報',
      content: { 'application/json': { schema: ItemLocationResponse } },
    },
    ...commonErrorResponses,
  },
});

registry.registerPath({
  method: 'post',
  path: '/agent/items',
  operationId: 'createItem',
  summary: '持ち物を新規登録',
  description:
    '持ち物 (Item) を新規作成する。itemTypeId が分からない場合は itemTypeName を渡すと、既存の ItemType を名前一致で探し、見つからなければ自動で作成する。所有者は呼び出し元エージェントの紐付けユーザーになる。',
  tags: ['Items'],
  security: agentSecurity,
  request: {
    body: {
      required: true,
      content: { 'application/json': { schema: AgentCreateItemRequest } },
    },
  },
  responses: {
    201: {
      description: '作成された持ち物',
      content: { 'application/json': { schema: ItemResponse } },
    },
    ...commonErrorResponses,
  },
});

registry.registerPath({
  method: 'post',
  path: '/agent/items/{id}/consume',
  operationId: 'consumeItem',
  summary: '持ち物を消費済みにする',
  description:
    '所有中 (owned) の持ち物を消費済み (consumed) に変更する。食品・消耗品の使い切りなど。すでに owned 以外の場合は 400 が返る。',
  tags: ['Items'],
  security: agentSecurity,
  request: {
    params: z.object({
      id: z.string().openapi({ description: '持ち物 ID' }),
    }),
    body: {
      required: false,
      content: { 'application/json': { schema: StatusActionRequest } },
    },
  },
  responses: {
    200: {
      description: '消費済みに変更された持ち物',
      content: { 'application/json': { schema: ItemResponse } },
    },
    ...commonErrorResponses,
  },
});

registry.registerPath({
  method: 'post',
  path: '/agent/items/{id}/give',
  operationId: 'giveItem',
  summary: '持ち物を譲渡済みにする',
  description:
    '所有中 (owned) の持ち物を譲渡済み (given) に変更する。givenTo に譲渡先を必ず指定する。すでに owned 以外の場合は 400 が返る。',
  tags: ['Items'],
  security: agentSecurity,
  request: {
    params: z.object({
      id: z.string().openapi({ description: '持ち物 ID' }),
    }),
    body: {
      required: true,
      content: { 'application/json': { schema: AgentGiveItemRequest } },
    },
  },
  responses: {
    200: {
      description: '譲渡済みに変更された持ち物',
      content: { 'application/json': { schema: ItemResponse } },
    },
    ...commonErrorResponses,
  },
});

registry.registerPath({
  method: 'post',
  path: '/agent/items/{id}/sell',
  operationId: 'sellItem',
  summary: '持ち物を売却済みにする',
  description:
    '所有中 (owned) の持ち物を売却済み (sold) に変更する。soldTo / soldPrice は任意で記録できる。すでに owned 以外の場合は 400 が返る。',
  tags: ['Items'],
  security: agentSecurity,
  request: {
    params: z.object({
      id: z.string().openapi({ description: '持ち物 ID' }),
    }),
    body: {
      required: false,
      content: { 'application/json': { schema: AgentSellItemRequest } },
    },
  },
  responses: {
    200: {
      description: '売却済みに変更された持ち物',
      content: { 'application/json': { schema: ItemResponse } },
    },
    ...commonErrorResponses,
  },
});

// --- Item Types ---

registry.registerPath({
  method: 'get',
  path: '/agent/item-types',
  operationId: 'listItemTypes',
  summary: 'アイテム種別の一覧を取得',
  description:
    'family に登録済みのアイテム種別 (ItemType) を全件返す。持ち物作成前に既存種別を確認したいときに使う。',
  tags: ['ItemTypes'],
  security: agentSecurity,
  responses: {
    200: {
      description: 'アイテム種別一覧',
      content: { 'application/json': { schema: ItemTypesListResponse } },
    },
    ...commonErrorResponses,
  },
});

// --- Boxes ---

registry.registerPath({
  method: 'get',
  path: '/agent/boxes',
  operationId: 'listBoxes',
  summary: '箱の一覧を取得',
  description:
    'family に登録済みの箱 (Box) を全件返す。locationName が併せて付与される。',
  tags: ['Boxes'],
  security: agentSecurity,
  responses: {
    200: {
      description: '箱の一覧',
      content: { 'application/json': { schema: BoxesListResponse } },
    },
    ...commonErrorResponses,
  },
});

registry.registerPath({
  method: 'get',
  path: '/agent/boxes/{id}/items',
  operationId: 'getBoxItems',
  summary: '指定した箱の中身を取得',
  description:
    '指定した箱 (Box) に入っている持ち物を返す。「この箱に何が入っている？」のユースケース。',
  tags: ['Boxes'],
  security: agentSecurity,
  request: {
    params: z.object({
      id: z.string().openapi({ description: '箱 ID' }),
    }),
  },
  responses: {
    200: {
      description: '箱と中身の持ち物一覧',
      content: { 'application/json': { schema: BoxItemsResponse } },
    },
    ...commonErrorResponses,
  },
});

// --- Locations ---

registry.registerPath({
  method: 'get',
  path: '/agent/locations',
  operationId: 'listLocations',
  summary: '保管場所の一覧を取得',
  description:
    'family に登録済みの保管場所 (Location) を全件返す。',
  tags: ['Locations'],
  security: agentSecurity,
  responses: {
    200: {
      description: '保管場所一覧',
      content: { 'application/json': { schema: LocationsListResponse } },
    },
    ...commonErrorResponses,
  },
});

registry.registerPath({
  method: 'get',
  path: '/agent/locations/{id}/boxes',
  operationId: 'getLocationBoxes',
  summary: '保管場所配下の箱を取得',
  description:
    '指定した保管場所 (Location) に紐付く箱 (Box) を全件返す。',
  tags: ['Locations'],
  security: agentSecurity,
  request: {
    params: z.object({
      id: z.string().openapi({ description: '保管場所 ID' }),
    }),
  },
  responses: {
    200: {
      description: '保管場所と配下の箱',
      content: { 'application/json': { schema: LocationBoxesResponse } },
    },
    ...commonErrorResponses,
  },
});

// --- Search ---

registry.registerPath({
  method: 'get',
  path: '/agent/search',
  operationId: 'searchItems',
  summary: '持ち物を名前で検索',
  description:
    'q (検索キーワード) を ItemType 名にあいまい一致させ、所有中 (owned) の持ち物のみを返す。各結果には box / location が付く。「○○ある？」「○○どこ？」系の自然言語問い合わせに最初に投げるエンドポイント。',
  tags: ['Search'],
  security: agentSecurity,
  request: {
    query: z.object({
      q: z
        .string()
        .min(1)
        .openapi({ description: '検索キーワード (アイテム種別名)', example: 'コーヒー豆' }),
    }),
  },
  responses: {
    200: {
      description: '検索結果',
      content: { 'application/json': { schema: SearchResultsResponse } },
    },
    ...commonErrorResponses,
  },
});

// --- Wishlist ---

registry.registerPath({
  method: 'get',
  path: '/agent/wishlist',
  operationId: 'listWishlist',
  summary: '購入予定の一覧を取得',
  description:
    '家族の購入予定 (Wishlist) 一覧を返す。status (pending/purchased/cancelled) や priority (high/medium/low) で絞り込み可能。',
  tags: ['Wishlist'],
  security: agentSecurity,
  request: {
    query: z.object({
      status: WishlistStatusSchema.optional().openapi({
        description: '指定したステータスのみ返す',
      }),
      priority: PrioritySchema.optional().openapi({
        description: '指定した優先度のみ返す',
      }),
    }),
  },
  responses: {
    200: {
      description: '購入予定の一覧',
      content: { 'application/json': { schema: WishlistListResponse } },
    },
    ...commonErrorResponses,
  },
});

registry.registerPath({
  method: 'get',
  path: '/agent/wishlist/search',
  operationId: 'searchWishlist',
  summary: '購入予定を検索',
  description:
    'q (検索キーワード) で購入予定の name にあいまい一致させ、pending のみを返す。「○○ 買う予定ある？」を確認するときに使う。',
  tags: ['Wishlist'],
  security: agentSecurity,
  request: {
    query: z.object({
      q: z
        .string()
        .min(1)
        .openapi({ description: '検索キーワード (購入予定名)' }),
    }),
  },
  responses: {
    200: {
      description: '検索結果の購入予定',
      content: { 'application/json': { schema: WishlistListResponse } },
    },
    ...commonErrorResponses,
  },
});

registry.registerPath({
  method: 'get',
  path: '/agent/wishlist/{id}',
  operationId: 'getWishlist',
  summary: '購入予定を 1 件取得',
  description: '指定した購入予定 (Wishlist) を 1 件返す。',
  tags: ['Wishlist'],
  security: agentSecurity,
  request: {
    params: z.object({
      id: z.string().openapi({ description: '購入予定 ID' }),
    }),
  },
  responses: {
    200: {
      description: '購入予定 1 件',
      content: { 'application/json': { schema: WishlistResponse } },
    },
    ...commonErrorResponses,
  },
});

registry.registerPath({
  method: 'post',
  path: '/agent/wishlist',
  operationId: 'createWishlist',
  summary: '購入予定を新規登録',
  description:
    '購入予定 (Wishlist) を新規作成する。priority / priceRange / url / memo は任意。requesterId は呼び出し元エージェントの紐付けユーザーになる。',
  tags: ['Wishlist'],
  security: agentSecurity,
  request: {
    body: {
      required: true,
      content: { 'application/json': { schema: AgentCreateWishlistRequest } },
    },
  },
  responses: {
    201: {
      description: '作成された購入予定',
      content: { 'application/json': { schema: WishlistResponse } },
    },
    ...commonErrorResponses,
  },
});

registry.registerPath({
  method: 'post',
  path: '/agent/wishlist/{id}/purchase',
  operationId: 'purchaseWishlist',
  summary: '購入予定を購入完了にする',
  description:
    '検討中 (pending) の購入予定を購入完了 (purchased) に変更する。同時に対応する持ち物 (Item) が自動生成される。pending 以外の場合は 400 が返る。',
  tags: ['Wishlist'],
  security: agentSecurity,
  request: {
    params: z.object({
      id: z.string().openapi({ description: '購入予定 ID' }),
    }),
    body: {
      required: false,
      content: { 'application/json': { schema: StatusActionRequest } },
    },
  },
  responses: {
    200: {
      description: '購入完了結果 (購入予定 + 自動生成された Item)',
      content: { 'application/json': { schema: WishlistPurchaseResponse } },
    },
    ...commonErrorResponses,
  },
});

registry.registerPath({
  method: 'post',
  path: '/agent/wishlist/{id}/cancel',
  operationId: 'cancelWishlist',
  summary: '購入予定を見送りにする',
  description:
    '検討中 (pending) の購入予定を見送り (cancelled) に変更する。pending 以外の場合は 400 が返る。',
  tags: ['Wishlist'],
  security: agentSecurity,
  request: {
    params: z.object({
      id: z.string().openapi({ description: '購入予定 ID' }),
    }),
    body: {
      required: false,
      content: { 'application/json': { schema: StatusActionRequest } },
    },
  },
  responses: {
    200: {
      description: '見送りに変更された購入予定',
      content: { 'application/json': { schema: WishlistResponse } },
    },
    ...commonErrorResponses,
  },
});
