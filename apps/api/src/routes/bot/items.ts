import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import type { ItemStatus } from '@family-inventory/shared';
import { requireDiscordUser, requireDiscordUserFromQuery } from './helpers.js';
import { asyncHandler } from '../../utils/async-handler.js';
import {
  sendSuccess,
  sendCreated,
  sendNotFound,
  sendValidationError,
  sendError,
} from '../../utils/response.js';
import {
  getItems,
  createItem,
  consumeItem,
  giveItem,
  sellItem,
  getItemLocation,
} from '../../services/item.service.js';
import {
  getItemTypes,
  getItemTypeById,
  createItemType,
} from '../../services/item-type.service.js';

const router: Router = Router();

// ============================================
// Zod Schemas
// ============================================

const createItemSchema = z
  .object({
    discordId: z.string().min(1),
    itemTypeId: z.string().min(1).optional(),
    itemTypeName: z.string().min(1).optional(),
    boxId: z.string().optional(),
    memo: z.string().max(1000).optional(),
  })
  .refine((data) => data.itemTypeId || data.itemTypeName, {
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

// ============================================
// Items API
// ============================================

router.get(
  '/items',
  asyncHandler(async (req: Request, res: Response) => {
    const user = await requireDiscordUserFromQuery(req, res);
    if (!user) return;

    const filter = {
      status: req.query.status as ItemStatus | undefined,
      search: req.query.search as string | undefined,
    };

    const items = await getItems(user.familyId, filter);
    const itemTypes = await getItemTypes(user.familyId);

    const itemsWithType = items.map((item) => {
      const itemType = itemTypes.find((t) => t.id === item.itemTypeId);
      return { ...item, itemTypeName: itemType?.name || '不明' };
    });

    sendSuccess(res, { items: itemsWithType });
  }, '持ち物の取得中にエラーが発生しました')
);

router.get(
  '/items/:id/location',
  asyncHandler(async (req: Request, res: Response) => {
    const user = await requireDiscordUserFromQuery(req, res);
    if (!user) return;

    const location = await getItemLocation(user.familyId, req.params.id);
    if (!location) {
      sendNotFound(res, '持ち物', 'ITEM_NOT_FOUND');
      return;
    }

    sendSuccess(res, location);
  }, '場所情報の取得中にエラーが発生しました')
);

router.post(
  '/items',
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = createItemSchema.safeParse(req.body);
    if (!parsed.success) {
      sendValidationError(res, parsed.error.errors);
      return;
    }

    const { discordId, itemTypeId, itemTypeName, boxId, memo } = parsed.data;

    const user = await requireDiscordUser(discordId, res);
    if (!user) return;

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

    sendCreated(res, { item: { ...item, itemTypeName: itemType?.name || '不明' } });
  }, '持ち物の作成中にエラーが発生しました')
);

router.post(
  '/items/:id/consume',
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = statusActionSchema.safeParse(req.body);
    if (!parsed.success) {
      sendValidationError(res, parsed.error.errors);
      return;
    }

    const user = await requireDiscordUser(parsed.data.discordId, res);
    if (!user) return;

    try {
      const item = await consumeItem(user.familyId, req.params.id, { consumedAt: new Date() });
      if (!item) {
        sendNotFound(res, '持ち物', 'ITEM_NOT_FOUND');
        return;
      }
      sendSuccess(res, { item });
    } catch (error) {
      if (error instanceof Error && error.message === 'INVALID_STATUS') {
        sendError(res, 'INVALID_STATUS', '所有中の持ち物のみ消費できます', 400);
        return;
      }
      throw error;
    }
  }, '持ち物の消費処理中にエラーが発生しました')
);

router.post(
  '/items/:id/give',
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = giveActionSchema.safeParse(req.body);
    if (!parsed.success) {
      sendValidationError(res, parsed.error.errors);
      return;
    }

    const user = await requireDiscordUser(parsed.data.discordId, res);
    if (!user) return;

    try {
      const item = await giveItem(user.familyId, req.params.id, {
        givenTo: parsed.data.givenTo,
        givenAt: new Date(),
      });
      if (!item) {
        sendNotFound(res, '持ち物', 'ITEM_NOT_FOUND');
        return;
      }
      sendSuccess(res, { item });
    } catch (error) {
      if (error instanceof Error && error.message === 'INVALID_STATUS') {
        sendError(res, 'INVALID_STATUS', '所有中の持ち物のみ譲渡できます', 400);
        return;
      }
      throw error;
    }
  }, '持ち物の譲渡処理中にエラーが発生しました')
);

router.post(
  '/items/:id/sell',
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = sellActionSchema.safeParse(req.body);
    if (!parsed.success) {
      sendValidationError(res, parsed.error.errors);
      return;
    }

    const user = await requireDiscordUser(parsed.data.discordId, res);
    if (!user) return;

    try {
      const item = await sellItem(user.familyId, req.params.id, {
        soldTo: parsed.data.soldTo,
        soldPrice: parsed.data.soldPrice,
        soldAt: new Date(),
      });
      if (!item) {
        sendNotFound(res, '持ち物', 'ITEM_NOT_FOUND');
        return;
      }
      sendSuccess(res, { item });
    } catch (error) {
      if (error instanceof Error && error.message === 'INVALID_STATUS') {
        sendError(res, 'INVALID_STATUS', '所有中の持ち物のみ売却できます', 400);
        return;
      }
      throw error;
    }
  }, '持ち物の売却処理中にエラーが発生しました')
);

// ============================================
// Item Types API
// ============================================

router.get(
  '/item-types',
  asyncHandler(async (req: Request, res: Response) => {
    const user = await requireDiscordUserFromQuery(req, res);
    if (!user) return;

    const itemTypes = await getItemTypes(user.familyId);
    sendSuccess(res, { itemTypes });
  }, 'アイテム種別の取得中にエラーが発生しました')
);

export default router;
