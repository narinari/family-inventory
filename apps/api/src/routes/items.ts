import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { authenticateToken } from '../middleware/auth.js';
import {
  getItems,
  createItem,
  updateItem,
  consumeItem,
  giveItem,
  sellItem,
  verifyItem,
  batchVerifyItems,
  getItemLocation,
  getItemWithRelatedTags,
} from '../services/item.service.js';
import { ErrorCodes, ItemStatus } from '@family-inventory/shared';
import { asyncHandler } from '../utils/async-handler.js';
import { requireUser } from '../utils/auth-helpers.js';
import { sendSuccess, sendCreated, sendError, sendNotFound, sendValidationError } from '../utils/response.js';

const router: Router = Router();

const createItemSchema = z.object({
  itemTypeId: z.string().min(1),
  ownerId: z.string().optional(),
  boxId: z.string().optional(),
  tags: z.array(z.string()).optional(),
  memo: z.string().max(1000).optional(),
  purchasedAt: z.coerce.date().optional(),
});

const updateItemSchema = z.object({
  ownerId: z.string().optional(),
  boxId: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
  memo: z.string().max(1000).optional(),
  purchasedAt: z.coerce.date().optional(),
});

const consumeItemSchema = z.object({
  consumedAt: z.coerce.date().optional(),
});

const giveItemSchema = z.object({
  givenTo: z.string().min(1),
  givenAt: z.coerce.date().optional(),
});

const sellItemSchema = z.object({
  soldTo: z.string().optional(),
  soldPrice: z.number().min(0).optional(),
  soldAt: z.coerce.date().optional(),
});

const verifyItemSchema = z.object({
  verifyAt: z.coerce.date().optional(),
});

const batchVerifyItemsSchema = z.object({
  ids: z.array(z.string().min(1)).min(1),
  verifyAt: z.coerce.date().optional(),
});

router.get(
  '/',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const user = await requireUser(req, res);
    if (!user) return;

    const filter = {
      status: req.query.status as ItemStatus | undefined,
      ownerId: req.query.ownerId as string | undefined,
      boxId: req.query.boxId as string | undefined,
      typeId: req.query.typeId as string | undefined,
      tags: req.query.tags ? (req.query.tags as string).split(',') : undefined,
      includeInheritedTags: req.query.includeInheritedTags === 'true',
    };

    const items = await getItems(user.familyId, filter);
    sendSuccess(res, { items });
  }, '持ち物の取得中にエラーが発生しました')
);

router.get(
  '/:id',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const user = await requireUser(req, res);
    if (!user) return;

    // 関連タグを含むアイテム詳細を取得
    const itemDetail = await getItemWithRelatedTags(user.familyId, req.params.id);
    if (!itemDetail) {
      sendNotFound(res, '持ち物', 'ITEM_NOT_FOUND');
      return;
    }

    sendSuccess(res, itemDetail);
  }, '持ち物の取得中にエラーが発生しました')
);

router.post(
  '/',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const user = await requireUser(req, res);
    if (!user) return;

    const parsed = createItemSchema.safeParse(req.body);
    if (!parsed.success) {
      sendValidationError(res, parsed.error.errors);
      return;
    }

    const item = await createItem(user.familyId, user.id, parsed.data);
    sendCreated(res, { item });
  }, '持ち物の作成中にエラーが発生しました')
);

router.put(
  '/:id',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const user = await requireUser(req, res);
    if (!user) return;

    const parsed = updateItemSchema.safeParse(req.body);
    if (!parsed.success) {
      sendValidationError(res, parsed.error.errors);
      return;
    }

    const item = await updateItem(user.familyId, req.params.id, parsed.data);
    if (!item) {
      sendNotFound(res, '持ち物', 'ITEM_NOT_FOUND');
      return;
    }

    sendSuccess(res, { item });
  }, '持ち物の更新中にエラーが発生しました')
);

router.post(
  '/:id/consume',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const user = await requireUser(req, res);
    if (!user) return;

    const parsed = consumeItemSchema.safeParse(req.body);
    const input = parsed.success ? parsed.data : undefined;

    try {
      const item = await consumeItem(user.familyId, req.params.id, input);
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
  '/:id/give',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const user = await requireUser(req, res);
    if (!user) return;

    const parsed = giveItemSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, ErrorCodes.VALIDATION_ERROR, '譲渡先を入力してください', 400, parsed.error.errors);
      return;
    }

    try {
      const item = await giveItem(user.familyId, req.params.id, parsed.data);
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
  '/:id/sell',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const user = await requireUser(req, res);
    if (!user) return;

    const parsed = sellItemSchema.safeParse(req.body);
    const input = parsed.success ? parsed.data : undefined;

    try {
      const item = await sellItem(user.familyId, req.params.id, input);
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

router.post(
  '/:id/verify',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const user = await requireUser(req, res);
    if (!user) return;

    const parsed = verifyItemSchema.safeParse(req.body);
    const verifyAt = parsed.success ? parsed.data.verifyAt : undefined;

    const item = await verifyItem(user.familyId, req.params.id, verifyAt);
    if (!item) {
      sendNotFound(res, '持ち物', 'ITEM_NOT_FOUND');
      return;
    }

    sendSuccess(res, { item });
  }, '持ち物の確認処理中にエラーが発生しました')
);

router.post(
  '/batch-verify',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const user = await requireUser(req, res);
    if (!user) return;

    const parsed = batchVerifyItemsSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, ErrorCodes.VALIDATION_ERROR, 'アイテムIDの配列が必要です', 400, parsed.error.errors);
      return;
    }

    const result = await batchVerifyItems(user.familyId, parsed.data.ids, parsed.data.verifyAt);
    sendSuccess(res, result);
  }, '持ち物の一括確認処理中にエラーが発生しました')
);

router.get(
  '/:id/location',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const user = await requireUser(req, res);
    if (!user) return;

    const location = await getItemLocation(user.familyId, req.params.id);
    if (!location) {
      sendNotFound(res, '持ち物', 'ITEM_NOT_FOUND');
      return;
    }

    sendSuccess(res, location);
  }, '場所情報の取得中にエラーが発生しました')
);

export default router;
