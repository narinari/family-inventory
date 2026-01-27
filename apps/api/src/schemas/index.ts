/**
 * スキーマモジュール
 * 全Zodスキーマを一括エクスポート
 */

// 共通スキーマ
export { statusActionSchema } from './common.schema.js';

// 認証関連
export {
  joinSchema,
  createInviteSchema,
  updateProfileSchema,
  discordCallbackSchema,
} from './auth.schema.js';

// アイテム（持ち物）関連
export {
  createItemSchema,
  updateItemSchema,
  consumeItemSchema,
  giveItemSchema,
  sellItemSchema,
  verifyItemSchema,
  batchVerifyItemsSchema,
  botCreateItemSchema,
  botGiveItemSchema,
  botSellItemSchema,
} from './item.schema.js';

// 購入予定関連
export {
  createWishlistSchema,
  updateWishlistSchema,
  botCreateWishlistSchema,
} from './wishlist.schema.js';

// 箱関連
export { createBoxSchema, updateBoxSchema } from './box.schema.js';

// 保管場所関連
export { createLocationSchema, updateLocationSchema } from './location.schema.js';

// タグ関連
export { createTagSchema, updateTagSchema } from './tag.schema.js';

// アイテム種別関連
export { createItemTypeSchema, updateItemTypeSchema } from './item-type.schema.js';
