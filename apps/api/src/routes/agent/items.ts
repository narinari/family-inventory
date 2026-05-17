import { Router, type Request, type Response } from 'express';
import type { ItemStatus } from '@family-inventory/shared';
import { requireAgentUser } from './helpers.js';
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
import {
  agentCreateItemSchema,
  statusActionSchema,
  agentGiveItemSchema,
  agentSellItemSchema,
} from '../../schemas/index.js';

const router: Router = Router();

// ============================================
// Items API
// ============================================

router.get(
  '/items',
  asyncHandler(async (req: Request, res: Response) => {
    const actor = await requireAgentUser(req, res);
    if (!actor) return;

    const filter = {
      status: req.query.status as ItemStatus | undefined,
      search: req.query.search as string | undefined,
    };

    const items = await getItems(actor.familyId, filter);
    const itemTypes = await getItemTypes(actor.familyId);

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
    const actor = await requireAgentUser(req, res);
    if (!actor) return;

    const location = await getItemLocation(actor.familyId, req.params.id);
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
    const parsed = agentCreateItemSchema.safeParse(req.body);
    if (!parsed.success) {
      sendValidationError(res, parsed.error.errors);
      return;
    }

    const { itemTypeId, itemTypeName, boxId, memo } = parsed.data;

    const actor = await requireAgentUser(req, res);
    if (!actor) return;

    let resolvedItemTypeId = itemTypeId;
    if (!resolvedItemTypeId && itemTypeName) {
      const itemTypes = await getItemTypes(actor.familyId);
      const existing = itemTypes.find(
        (t) => t.name.toLowerCase() === itemTypeName.toLowerCase()
      );
      if (existing) {
        resolvedItemTypeId = existing.id;
      } else {
        const newItemType = await createItemType(actor.familyId, { name: itemTypeName });
        resolvedItemTypeId = newItemType.id;
      }
    }

    const item = await createItem(actor.familyId, actor.userId, {
      itemTypeId: resolvedItemTypeId!,
      ownerId: actor.userId,
      boxId,
      memo,
      purchasedAt: new Date(),
    });

    const itemType = await getItemTypeById(actor.familyId, resolvedItemTypeId!);

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

    const actor = await requireAgentUser(req, res);
    if (!actor) return;

    try {
      const item = await consumeItem(actor.familyId, req.params.id, { consumedAt: new Date() });
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
    const parsed = agentGiveItemSchema.safeParse(req.body);
    if (!parsed.success) {
      sendValidationError(res, parsed.error.errors);
      return;
    }

    const actor = await requireAgentUser(req, res);
    if (!actor) return;

    try {
      const item = await giveItem(actor.familyId, req.params.id, {
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
    const parsed = agentSellItemSchema.safeParse(req.body);
    if (!parsed.success) {
      sendValidationError(res, parsed.error.errors);
      return;
    }

    const actor = await requireAgentUser(req, res);
    if (!actor) return;

    try {
      const item = await sellItem(actor.familyId, req.params.id, {
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
    const actor = await requireAgentUser(req, res);
    if (!actor) return;

    const itemTypes = await getItemTypes(actor.familyId);
    sendSuccess(res, { itemTypes });
  }, 'アイテム種別の取得中にエラーが発生しました')
);

export default router;
