import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { authenticateToken } from '../middleware/auth.js';
import {
  getWishlistItems,
  getWishlistById,
  createWishlistItem,
  updateWishlistItem,
  purchaseWishlistItem,
  cancelWishlistItem,
} from '../services/wishlist.service.js';
import { WishlistStatus, Priority } from '@family-inventory/shared';
import { asyncHandler } from '../utils/async-handler.js';
import { requireUser } from '../utils/auth-helpers.js';
import { sendSuccess, sendCreated, sendError, sendNotFound, sendValidationError } from '../utils/response.js';

const router: Router = Router();

const createWishlistSchema = z.object({
  name: z.string().min(1).max(200).trim(),
  itemTypeId: z.string().optional(),
  requesterId: z.string().optional(),
  priority: z.enum(['high', 'medium', 'low']).optional(),
  priceRange: z.string().max(100).optional(),
  deadline: z.coerce.date().optional(),
  url: z.string().url().max(500).optional(),
  tags: z.array(z.string()).optional(),
  memo: z.string().max(1000).optional(),
});

const updateWishlistSchema = z.object({
  name: z.string().min(1).max(200).trim().optional(),
  itemTypeId: z.string().optional(),
  requesterId: z.string().optional(),
  priority: z.enum(['high', 'medium', 'low']).optional(),
  priceRange: z.string().max(100).optional(),
  deadline: z.coerce.date().optional(),
  url: z.string().url().max(500).optional(),
  tags: z.array(z.string()).optional(),
  memo: z.string().max(1000).optional(),
});

router.get(
  '/',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const user = await requireUser(req, res);
    if (!user) return;

    const filter = {
      status: req.query.status as WishlistStatus | undefined,
      requesterId: req.query.requesterId as string | undefined,
      priority: req.query.priority as Priority | undefined,
      tags: req.query.tags ? (req.query.tags as string).split(',') : undefined,
    };

    const wishlist = await getWishlistItems(user.familyId, filter);
    sendSuccess(res, { wishlist });
  }, '購入予定の取得中にエラーが発生しました')
);

router.get(
  '/:id',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const user = await requireUser(req, res);
    if (!user) return;

    const wishlistItem = await getWishlistById(user.familyId, req.params.id);
    if (!wishlistItem) {
      sendNotFound(res, '購入予定', 'WISHLIST_NOT_FOUND');
      return;
    }

    sendSuccess(res, { wishlist: wishlistItem });
  }, '購入予定の取得中にエラーが発生しました')
);

router.post(
  '/',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const user = await requireUser(req, res);
    if (!user) return;

    const parsed = createWishlistSchema.safeParse(req.body);
    if (!parsed.success) {
      sendValidationError(res, parsed.error.errors);
      return;
    }

    const wishlistItem = await createWishlistItem(user.familyId, user.id, parsed.data);
    sendCreated(res, { wishlist: wishlistItem });
  }, '購入予定の作成中にエラーが発生しました')
);

router.put(
  '/:id',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const user = await requireUser(req, res);
    if (!user) return;

    const parsed = updateWishlistSchema.safeParse(req.body);
    if (!parsed.success) {
      sendValidationError(res, parsed.error.errors);
      return;
    }

    const wishlistItem = await updateWishlistItem(user.familyId, req.params.id, parsed.data);
    if (!wishlistItem) {
      sendNotFound(res, '購入予定', 'WISHLIST_NOT_FOUND');
      return;
    }

    sendSuccess(res, { wishlist: wishlistItem });
  }, '購入予定の更新中にエラーが発生しました')
);

router.post(
  '/:id/purchase',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const user = await requireUser(req, res);
    if (!user) return;

    try {
      const result = await purchaseWishlistItem(user.familyId, req.params.id);
      if (!result) {
        sendNotFound(res, '購入予定', 'WISHLIST_NOT_FOUND');
        return;
      }
      sendSuccess(res, result);
    } catch (error) {
      if (error instanceof Error && error.message === 'INVALID_STATUS') {
        sendError(res, 'INVALID_STATUS', '検討中の購入予定のみ購入完了にできます', 400);
        return;
      }
      throw error;
    }
  }, '購入完了処理中にエラーが発生しました')
);

router.post(
  '/:id/cancel',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response) => {
    const user = await requireUser(req, res);
    if (!user) return;

    try {
      const wishlistItem = await cancelWishlistItem(user.familyId, req.params.id);
      if (!wishlistItem) {
        sendNotFound(res, '購入予定', 'WISHLIST_NOT_FOUND');
        return;
      }
      sendSuccess(res, { wishlist: wishlistItem });
    } catch (error) {
      if (error instanceof Error && error.message === 'INVALID_STATUS') {
        sendError(res, 'INVALID_STATUS', '検討中の購入予定のみ見送りにできます', 400);
        return;
      }
      throw error;
    }
  }, '見送り処理中にエラーが発生しました')
);

export default router;
