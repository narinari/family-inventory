import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { authenticateBotApiKey } from '../middleware/auth.js';
import { getUserByDiscordId } from '../services/auth.service.js';
import {
  getItems,
  createItem,
  consumeItem,
  giveItem,
  sellItem,
  getItemLocation,
} from '../services/item.service.js';
import { getItemTypes, getItemTypeById, createItemType } from '../services/item-type.service.js';
import { getBoxes, getBoxById, getBoxItems } from '../services/box.service.js';
import { getLocations, getLocationById, getLocationBoxes } from '../services/location.service.js';
import {
  getWishlistItems,
  getWishlistById,
  createWishlistItem,
  purchaseWishlistItem,
  cancelWishlistItem,
  searchWishlistItems,
} from '../services/wishlist.service.js';
import { ErrorCodes, type ItemStatus, type WishlistStatus, type Priority } from '@family-inventory/shared';

const router: Router = Router();

// ============================================
// Helper: Discord IDからユーザーを取得
// ============================================

async function getUserFromDiscordId(discordId: string, res: Response) {
  const user = await getUserByDiscordId(discordId);
  if (!user) {
    res.status(404).json({
      success: false,
      error: { code: ErrorCodes.USER_NOT_FOUND, message: 'Discord連携されていないユーザーです' },
    });
    return null;
  }
  return user;
}

// ============================================
// Items API
// ============================================

const createItemSchema = z.object({
  discordId: z.string().min(1),
  itemTypeId: z.string().min(1).optional(),
  itemTypeName: z.string().min(1).optional(),
  boxId: z.string().optional(),
  memo: z.string().max(1000).optional(),
}).refine((data) => data.itemTypeId || data.itemTypeName, {
  message: 'itemTypeId または itemTypeName が必要です',
});

const statusActionSchema = z.object({
  discordId: z.string().min(1),
});

const giveActionSchema = z.object({
  discordId: z.string().min(1),
  givenTo: z.string().min(1),
});

const sellActionSchema = z.object({
  discordId: z.string().min(1),
  soldTo: z.string().optional(),
  soldPrice: z.number().min(0).optional(),
});

router.get('/items', authenticateBotApiKey, async (req: Request, res: Response) => {
  try {
    const discordId = req.query.discordId as string;
    if (!discordId) {
      res.status(400).json({
        success: false,
        error: { code: ErrorCodes.VALIDATION_ERROR, message: 'discordId が必要です' },
      });
      return;
    }

    const user = await getUserFromDiscordId(discordId, res);
    if (!user) return;

    const filter = {
      status: req.query.status as ItemStatus | undefined,
      search: req.query.search as string | undefined,
    };

    const items = await getItems(user.familyId, filter);
    const itemTypes = await getItemTypes(user.familyId);

    // アイテム種別名を含めて返す
    const itemsWithType = items.map((item) => {
      const itemType = itemTypes.find((t) => t.id === item.itemTypeId);
      return { ...item, itemTypeName: itemType?.name || '不明' };
    });

    res.json({ success: true, data: { items: itemsWithType } });
  } catch (error) {
    console.error('Bot get items error:', error);
    res.status(500).json({
      success: false,
      error: { code: ErrorCodes.INTERNAL_ERROR, message: '持ち物の取得中にエラーが発生しました' },
    });
  }
});

router.get('/items/:id/location', authenticateBotApiKey, async (req: Request, res: Response) => {
  try {
    const discordId = req.query.discordId as string;
    if (!discordId) {
      res.status(400).json({
        success: false,
        error: { code: ErrorCodes.VALIDATION_ERROR, message: 'discordId が必要です' },
      });
      return;
    }

    const user = await getUserFromDiscordId(discordId, res);
    if (!user) return;

    const location = await getItemLocation(user.familyId, req.params.id);
    if (!location) {
      res.status(404).json({
        success: false,
        error: { code: 'ITEM_NOT_FOUND', message: '持ち物が見つかりません' },
      });
      return;
    }

    res.json({ success: true, data: location });
  } catch (error) {
    console.error('Bot get item location error:', error);
    res.status(500).json({
      success: false,
      error: { code: ErrorCodes.INTERNAL_ERROR, message: '場所情報の取得中にエラーが発生しました' },
    });
  }
});

router.post('/items', authenticateBotApiKey, async (req: Request, res: Response) => {
  try {
    const parsed = createItemSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: {
          code: ErrorCodes.VALIDATION_ERROR,
          message: '入力内容を確認してください',
          details: parsed.error.errors,
        },
      });
      return;
    }

    const { discordId, itemTypeId, itemTypeName, boxId, memo } = parsed.data;

    const user = await getUserFromDiscordId(discordId, res);
    if (!user) return;

    // アイテム種別を特定（IDがなければ名前で検索、なければ作成）
    let resolvedItemTypeId = itemTypeId;
    if (!resolvedItemTypeId && itemTypeName) {
      const itemTypes = await getItemTypes(user.familyId);
      const existing = itemTypes.find(
        (t) => t.name.toLowerCase() === itemTypeName.toLowerCase()
      );
      if (existing) {
        resolvedItemTypeId = existing.id;
      } else {
        const newItemType = await createItemType(user.familyId, { name: itemTypeName });
        resolvedItemTypeId = newItemType.id;
      }
    }

    const item = await createItem(user.familyId, user.id, {
      itemTypeId: resolvedItemTypeId!,
      ownerId: user.id,
      boxId,
      memo,
      purchasedAt: new Date(),
    });

    const itemType = await getItemTypeById(user.familyId, resolvedItemTypeId!);

    res.status(201).json({
      success: true,
      data: { item: { ...item, itemTypeName: itemType?.name || '不明' } },
    });
  } catch (error) {
    console.error('Bot create item error:', error);
    res.status(500).json({
      success: false,
      error: { code: ErrorCodes.INTERNAL_ERROR, message: '持ち物の作成中にエラーが発生しました' },
    });
  }
});

router.post('/items/:id/consume', authenticateBotApiKey, async (req: Request, res: Response) => {
  try {
    const parsed = statusActionSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: { code: ErrorCodes.VALIDATION_ERROR, message: 'discordId が必要です' },
      });
      return;
    }

    const user = await getUserFromDiscordId(parsed.data.discordId, res);
    if (!user) return;

    const item = await consumeItem(user.familyId, req.params.id, { consumedAt: new Date() });
    if (!item) {
      res.status(404).json({
        success: false,
        error: { code: 'ITEM_NOT_FOUND', message: '持ち物が見つかりません' },
      });
      return;
    }

    res.json({ success: true, data: { item } });
  } catch (error) {
    if (error instanceof Error && error.message === 'INVALID_STATUS') {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_STATUS', message: '所有中の持ち物のみ消費できます' },
      });
      return;
    }
    console.error('Bot consume item error:', error);
    res.status(500).json({
      success: false,
      error: { code: ErrorCodes.INTERNAL_ERROR, message: '持ち物の消費処理中にエラーが発生しました' },
    });
  }
});

router.post('/items/:id/give', authenticateBotApiKey, async (req: Request, res: Response) => {
  try {
    const parsed = giveActionSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: { code: ErrorCodes.VALIDATION_ERROR, message: 'discordId と givenTo が必要です' },
      });
      return;
    }

    const user = await getUserFromDiscordId(parsed.data.discordId, res);
    if (!user) return;

    const item = await giveItem(user.familyId, req.params.id, {
      givenTo: parsed.data.givenTo,
      givenAt: new Date(),
    });
    if (!item) {
      res.status(404).json({
        success: false,
        error: { code: 'ITEM_NOT_FOUND', message: '持ち物が見つかりません' },
      });
      return;
    }

    res.json({ success: true, data: { item } });
  } catch (error) {
    if (error instanceof Error && error.message === 'INVALID_STATUS') {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_STATUS', message: '所有中の持ち物のみ譲渡できます' },
      });
      return;
    }
    console.error('Bot give item error:', error);
    res.status(500).json({
      success: false,
      error: { code: ErrorCodes.INTERNAL_ERROR, message: '持ち物の譲渡処理中にエラーが発生しました' },
    });
  }
});

router.post('/items/:id/sell', authenticateBotApiKey, async (req: Request, res: Response) => {
  try {
    const parsed = sellActionSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: { code: ErrorCodes.VALIDATION_ERROR, message: 'discordId が必要です' },
      });
      return;
    }

    const user = await getUserFromDiscordId(parsed.data.discordId, res);
    if (!user) return;

    const item = await sellItem(user.familyId, req.params.id, {
      soldTo: parsed.data.soldTo,
      soldPrice: parsed.data.soldPrice,
      soldAt: new Date(),
    });
    if (!item) {
      res.status(404).json({
        success: false,
        error: { code: 'ITEM_NOT_FOUND', message: '持ち物が見つかりません' },
      });
      return;
    }

    res.json({ success: true, data: { item } });
  } catch (error) {
    if (error instanceof Error && error.message === 'INVALID_STATUS') {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_STATUS', message: '所有中の持ち物のみ売却できます' },
      });
      return;
    }
    console.error('Bot sell item error:', error);
    res.status(500).json({
      success: false,
      error: { code: ErrorCodes.INTERNAL_ERROR, message: '持ち物の売却処理中にエラーが発生しました' },
    });
  }
});

// ============================================
// Item Types API
// ============================================

router.get('/item-types', authenticateBotApiKey, async (req: Request, res: Response) => {
  try {
    const discordId = req.query.discordId as string;
    if (!discordId) {
      res.status(400).json({
        success: false,
        error: { code: ErrorCodes.VALIDATION_ERROR, message: 'discordId が必要です' },
      });
      return;
    }

    const user = await getUserFromDiscordId(discordId, res);
    if (!user) return;

    const itemTypes = await getItemTypes(user.familyId);
    res.json({ success: true, data: { itemTypes } });
  } catch (error) {
    console.error('Bot get item types error:', error);
    res.status(500).json({
      success: false,
      error: { code: ErrorCodes.INTERNAL_ERROR, message: 'アイテム種別の取得中にエラーが発生しました' },
    });
  }
});

// ============================================
// Boxes API
// ============================================

router.get('/boxes', authenticateBotApiKey, async (req: Request, res: Response) => {
  try {
    const discordId = req.query.discordId as string;
    if (!discordId) {
      res.status(400).json({
        success: false,
        error: { code: ErrorCodes.VALIDATION_ERROR, message: 'discordId が必要です' },
      });
      return;
    }

    const user = await getUserFromDiscordId(discordId, res);
    if (!user) return;

    const boxes = await getBoxes(user.familyId);
    const locations = await getLocations(user.familyId);

    // 保管場所名を含めて返す
    const boxesWithLocation = boxes.map((box) => {
      const location = locations.find((l) => l.id === box.locationId);
      return { ...box, locationName: location?.name };
    });

    res.json({ success: true, data: { boxes: boxesWithLocation } });
  } catch (error) {
    console.error('Bot get boxes error:', error);
    res.status(500).json({
      success: false,
      error: { code: ErrorCodes.INTERNAL_ERROR, message: '箱の取得中にエラーが発生しました' },
    });
  }
});

router.get('/boxes/:id/items', authenticateBotApiKey, async (req: Request, res: Response) => {
  try {
    const discordId = req.query.discordId as string;
    if (!discordId) {
      res.status(400).json({
        success: false,
        error: { code: ErrorCodes.VALIDATION_ERROR, message: 'discordId が必要です' },
      });
      return;
    }

    const user = await getUserFromDiscordId(discordId, res);
    if (!user) return;

    const box = await getBoxById(user.familyId, req.params.id);
    if (!box) {
      res.status(404).json({
        success: false,
        error: { code: 'BOX_NOT_FOUND', message: '箱が見つかりません' },
      });
      return;
    }

    const items = await getBoxItems(user.familyId, req.params.id);
    const itemTypes = await getItemTypes(user.familyId);

    const itemsWithType = items.map((item) => {
      const itemType = itemTypes.find((t) => t.id === item.itemTypeId);
      return { ...item, itemTypeName: itemType?.name || '不明' };
    });

    res.json({ success: true, data: { box, items: itemsWithType } });
  } catch (error) {
    console.error('Bot get box items error:', error);
    res.status(500).json({
      success: false,
      error: { code: ErrorCodes.INTERNAL_ERROR, message: '箱の中身取得中にエラーが発生しました' },
    });
  }
});

// ============================================
// Locations API
// ============================================

router.get('/locations', authenticateBotApiKey, async (req: Request, res: Response) => {
  try {
    const discordId = req.query.discordId as string;
    if (!discordId) {
      res.status(400).json({
        success: false,
        error: { code: ErrorCodes.VALIDATION_ERROR, message: 'discordId が必要です' },
      });
      return;
    }

    const user = await getUserFromDiscordId(discordId, res);
    if (!user) return;

    const locations = await getLocations(user.familyId);
    res.json({ success: true, data: { locations } });
  } catch (error) {
    console.error('Bot get locations error:', error);
    res.status(500).json({
      success: false,
      error: { code: ErrorCodes.INTERNAL_ERROR, message: '保管場所の取得中にエラーが発生しました' },
    });
  }
});

router.get('/locations/:id/boxes', authenticateBotApiKey, async (req: Request, res: Response) => {
  try {
    const discordId = req.query.discordId as string;
    if (!discordId) {
      res.status(400).json({
        success: false,
        error: { code: ErrorCodes.VALIDATION_ERROR, message: 'discordId が必要です' },
      });
      return;
    }

    const user = await getUserFromDiscordId(discordId, res);
    if (!user) return;

    const location = await getLocationById(user.familyId, req.params.id);
    if (!location) {
      res.status(404).json({
        success: false,
        error: { code: 'LOCATION_NOT_FOUND', message: '保管場所が見つかりません' },
      });
      return;
    }

    const boxes = await getLocationBoxes(user.familyId, req.params.id);
    res.json({ success: true, data: { location, boxes } });
  } catch (error) {
    console.error('Bot get location boxes error:', error);
    res.status(500).json({
      success: false,
      error: { code: ErrorCodes.INTERNAL_ERROR, message: '保管場所の箱取得中にエラーが発生しました' },
    });
  }
});

// ============================================
// Wishlist API
// ============================================

const createWishlistSchema = z.object({
  discordId: z.string().min(1),
  name: z.string().min(1).max(200).trim(),
  priority: z.enum(['high', 'medium', 'low']).optional(),
  priceRange: z.string().max(100).optional(),
  url: z.string().url().max(500).optional(),
  memo: z.string().max(1000).optional(),
});

router.get('/wishlist', authenticateBotApiKey, async (req: Request, res: Response) => {
  try {
    const discordId = req.query.discordId as string;
    if (!discordId) {
      res.status(400).json({
        success: false,
        error: { code: ErrorCodes.VALIDATION_ERROR, message: 'discordId が必要です' },
      });
      return;
    }

    const user = await getUserFromDiscordId(discordId, res);
    if (!user) return;

    const filter = {
      status: req.query.status as WishlistStatus | undefined,
      priority: req.query.priority as Priority | undefined,
    };

    const wishlist = await getWishlistItems(user.familyId, filter);
    res.json({ success: true, data: { wishlist } });
  } catch (error) {
    console.error('Bot get wishlist error:', error);
    res.status(500).json({
      success: false,
      error: { code: ErrorCodes.INTERNAL_ERROR, message: '購入予定の取得中にエラーが発生しました' },
    });
  }
});

router.get('/wishlist/search', authenticateBotApiKey, async (req: Request, res: Response) => {
  try {
    const discordId = req.query.discordId as string;
    const query = req.query.q as string;

    if (!discordId) {
      res.status(400).json({
        success: false,
        error: { code: ErrorCodes.VALIDATION_ERROR, message: 'discordId が必要です' },
      });
      return;
    }

    if (!query) {
      res.status(400).json({
        success: false,
        error: { code: ErrorCodes.VALIDATION_ERROR, message: '検索キーワード(q)が必要です' },
      });
      return;
    }

    const user = await getUserFromDiscordId(discordId, res);
    if (!user) return;

    const wishlist = await searchWishlistItems(user.familyId, query, 'pending');
    res.json({ success: true, data: { wishlist } });
  } catch (error) {
    console.error('Bot search wishlist error:', error);
    res.status(500).json({
      success: false,
      error: { code: ErrorCodes.INTERNAL_ERROR, message: '購入予定の検索中にエラーが発生しました' },
    });
  }
});

router.get('/wishlist/:id', authenticateBotApiKey, async (req: Request, res: Response) => {
  try {
    const discordId = req.query.discordId as string;
    if (!discordId) {
      res.status(400).json({
        success: false,
        error: { code: ErrorCodes.VALIDATION_ERROR, message: 'discordId が必要です' },
      });
      return;
    }

    const user = await getUserFromDiscordId(discordId, res);
    if (!user) return;

    const wishlistItem = await getWishlistById(user.familyId, req.params.id);
    if (!wishlistItem) {
      res.status(404).json({
        success: false,
        error: { code: 'WISHLIST_NOT_FOUND', message: '購入予定が見つかりません' },
      });
      return;
    }

    res.json({ success: true, data: { wishlist: wishlistItem } });
  } catch (error) {
    console.error('Bot get wishlist item error:', error);
    res.status(500).json({
      success: false,
      error: { code: ErrorCodes.INTERNAL_ERROR, message: '購入予定の取得中にエラーが発生しました' },
    });
  }
});

router.post('/wishlist', authenticateBotApiKey, async (req: Request, res: Response) => {
  try {
    const parsed = createWishlistSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: {
          code: ErrorCodes.VALIDATION_ERROR,
          message: '入力内容を確認してください',
          details: parsed.error.errors,
        },
      });
      return;
    }

    const { discordId, ...input } = parsed.data;

    const user = await getUserFromDiscordId(discordId, res);
    if (!user) return;

    const wishlistItem = await createWishlistItem(user.familyId, user.id, input);
    res.status(201).json({ success: true, data: { wishlist: wishlistItem } });
  } catch (error) {
    console.error('Bot create wishlist item error:', error);
    res.status(500).json({
      success: false,
      error: { code: ErrorCodes.INTERNAL_ERROR, message: '購入予定の作成中にエラーが発生しました' },
    });
  }
});

router.post('/wishlist/:id/purchase', authenticateBotApiKey, async (req: Request, res: Response) => {
  try {
    const parsed = statusActionSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: { code: ErrorCodes.VALIDATION_ERROR, message: 'discordId が必要です' },
      });
      return;
    }

    const user = await getUserFromDiscordId(parsed.data.discordId, res);
    if (!user) return;

    const result = await purchaseWishlistItem(user.familyId, req.params.id);
    if (!result) {
      res.status(404).json({
        success: false,
        error: { code: 'WISHLIST_NOT_FOUND', message: '購入予定が見つかりません' },
      });
      return;
    }

    res.json({ success: true, data: result });
  } catch (error) {
    if (error instanceof Error && error.message === 'INVALID_STATUS') {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_STATUS', message: '検討中の購入予定のみ購入完了にできます' },
      });
      return;
    }
    console.error('Bot purchase wishlist item error:', error);
    res.status(500).json({
      success: false,
      error: { code: ErrorCodes.INTERNAL_ERROR, message: '購入完了処理中にエラーが発生しました' },
    });
  }
});

router.post('/wishlist/:id/cancel', authenticateBotApiKey, async (req: Request, res: Response) => {
  try {
    const parsed = statusActionSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: { code: ErrorCodes.VALIDATION_ERROR, message: 'discordId が必要です' },
      });
      return;
    }

    const user = await getUserFromDiscordId(parsed.data.discordId, res);
    if (!user) return;

    const wishlistItem = await cancelWishlistItem(user.familyId, req.params.id);
    if (!wishlistItem) {
      res.status(404).json({
        success: false,
        error: { code: 'WISHLIST_NOT_FOUND', message: '購入予定が見つかりません' },
      });
      return;
    }

    res.json({ success: true, data: { wishlist: wishlistItem } });
  } catch (error) {
    if (error instanceof Error && error.message === 'INVALID_STATUS') {
      res.status(400).json({
        success: false,
        error: { code: 'INVALID_STATUS', message: '検討中の購入予定のみ見送りにできます' },
      });
      return;
    }
    console.error('Bot cancel wishlist item error:', error);
    res.status(500).json({
      success: false,
      error: { code: ErrorCodes.INTERNAL_ERROR, message: '見送り処理中にエラーが発生しました' },
    });
  }
});

// ============================================
// Search API（アイテム名で検索）
// ============================================

router.get('/search', authenticateBotApiKey, async (req: Request, res: Response) => {
  try {
    const discordId = req.query.discordId as string;
    const query = req.query.q as string;

    if (!discordId) {
      res.status(400).json({
        success: false,
        error: { code: ErrorCodes.VALIDATION_ERROR, message: 'discordId が必要です' },
      });
      return;
    }

    if (!query) {
      res.status(400).json({
        success: false,
        error: { code: ErrorCodes.VALIDATION_ERROR, message: '検索キーワード(q)が必要です' },
      });
      return;
    }

    const user = await getUserFromDiscordId(discordId, res);
    if (!user) return;

    // アイテム種別で検索
    const itemTypes = await getItemTypes(user.familyId);
    const matchingTypes = itemTypes.filter((t) =>
      t.name.toLowerCase().includes(query.toLowerCase())
    );

    // マッチしたアイテム種別のIDで持ち物を検索
    const items = await getItems(user.familyId, { status: 'owned' });
    const matchingItems = items.filter((item) =>
      matchingTypes.some((t) => t.id === item.itemTypeId)
    );

    // 場所情報を付与
    const results = await Promise.all(
      matchingItems.map(async (item) => {
        const location = await getItemLocation(user.familyId, item.id);
        const itemType = matchingTypes.find((t) => t.id === item.itemTypeId);
        return {
          item: { ...item, itemTypeName: itemType?.name || '不明' },
          box: location?.box,
          location: location?.location,
        };
      })
    );

    res.json({ success: true, data: { results } });
  } catch (error) {
    console.error('Bot search error:', error);
    res.status(500).json({
      success: false,
      error: { code: ErrorCodes.INTERNAL_ERROR, message: '検索中にエラーが発生しました' },
    });
  }
});

export default router;
