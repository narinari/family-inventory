// ============================================
// ステータス・優先度
// ============================================

export type ItemStatus = 'owned' | 'consumed' | 'given' | 'sold';
export type WishlistStatus = 'pending' | 'purchased' | 'cancelled';
export type Priority = 'high' | 'medium' | 'low';

// ============================================
// アイテム種別（マスター）
// ============================================

export interface ItemType {
  id: string;
  familyId: string;
  name: string;
  manufacturer?: string;
  description?: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateItemTypeInput {
  name: string;
  manufacturer?: string;
  description?: string;
  tags?: string[];
}

export interface UpdateItemTypeInput {
  name?: string;
  manufacturer?: string;
  description?: string;
  tags?: string[];
}

// ============================================
// 持ち物
// ============================================

export interface Item {
  id: string;
  familyId: string;
  itemTypeId: string;
  ownerId: string;
  status: ItemStatus;
  boxId?: string;
  tags: string[];
  memo?: string;
  purchasedAt?: Date;
  consumedAt?: Date;
  givenAt?: Date;
  soldAt?: Date;
  givenTo?: string;
  soldTo?: string;
  soldPrice?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateItemInput {
  itemTypeId: string;
  ownerId?: string;
  boxId?: string;
  tags?: string[];
  memo?: string;
  purchasedAt?: Date;
}

export interface UpdateItemInput {
  ownerId?: string;
  boxId?: string | null;
  tags?: string[];
  memo?: string;
  purchasedAt?: Date;
}

export interface ConsumeItemInput {
  consumedAt?: Date;
}

export interface GiveItemInput {
  givenTo: string;
  givenAt?: Date;
}

export interface SellItemInput {
  soldTo?: string;
  soldPrice?: number;
  soldAt?: Date;
}

// ============================================
// 箱
// ============================================

export interface Box {
  id: string;
  familyId: string;
  name: string;
  locationId?: string;
  description?: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateBoxInput {
  name: string;
  locationId?: string;
  description?: string;
  tags?: string[];
}

export interface UpdateBoxInput {
  name?: string;
  locationId?: string;
  description?: string;
  tags?: string[];
}

// ============================================
// 保管場所
// ============================================

export interface Location {
  id: string;
  familyId: string;
  name: string;
  address?: string;
  description?: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateLocationInput {
  name: string;
  address?: string;
  description?: string;
  tags?: string[];
}

export interface UpdateLocationInput {
  name?: string;
  address?: string;
  description?: string;
  tags?: string[];
}

// ============================================
// タグ
// ============================================

export interface Tag {
  id: string;
  familyId: string;
  name: string;
  color?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTagInput {
  name: string;
  color?: string;
}

export interface UpdateTagInput {
  name?: string;
  color?: string;
}

// ============================================
// 購入予定（ほしいものリスト）
// ============================================

export interface Wishlist {
  id: string;
  familyId: string;
  name: string;
  itemTypeId?: string;
  requesterId: string;
  priority: Priority;
  priceRange?: string;
  deadline?: Date;
  url?: string;
  tags: string[];
  memo?: string;
  status: WishlistStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateWishlistInput {
  name: string;
  itemTypeId?: string;
  requesterId?: string;
  priority?: Priority;
  priceRange?: string;
  deadline?: Date;
  url?: string;
  tags?: string[];
  memo?: string;
}

export interface UpdateWishlistInput {
  name?: string;
  itemTypeId?: string;
  requesterId?: string;
  priority?: Priority;
  priceRange?: string;
  deadline?: Date;
  url?: string;
  tags?: string[];
  memo?: string;
}

// ============================================
// 検索・フィルター
// ============================================

export interface ItemFilter {
  status?: ItemStatus;
  ownerId?: string;
  boxId?: string;
  locationId?: string;
  tags?: string[];
  search?: string;
}

export interface WishlistFilter {
  status?: WishlistStatus;
  requesterId?: string;
  priority?: Priority;
  tags?: string[];
  search?: string;
}

export interface ItemLocation {
  item: Item;
  itemType: ItemType;
  box?: Box;
  location?: Location;
}

// ============================================
// タグの種類別表示用
// ============================================

export type TagSource = 'item' | 'itemType' | 'box' | 'location';

export interface TagWithSource {
  id: string;
  name: string;
  color?: string;
  source: TagSource;
}

export interface ItemWithRelatedTags {
  item: Item;
  itemType: ItemType;
  owner?: { id: string; displayName: string };
  box?: Box;
  location?: Location;
  relatedTags: TagWithSource[];
}
