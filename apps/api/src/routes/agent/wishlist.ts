import { Router, type Request, type Response } from 'express';
import type { WishlistStatus, Priority } from '@family-inventory/shared';
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
  getWishlistItems,
  getWishlistById,
  createWishlistItem,
  purchaseWishlistItem,
  cancelWishlistItem,
  searchWishlistItems,
} from '../../services/wishlist.service.js';
import { botCreateWishlistSchema, statusActionSchema } from '../../schemas/index.js';

const router: Router = Router();

// ============================================
// Wishlist API
// ============================================

router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const actor = await requireAgentUser(req, res);
    if (!actor) return;

    const filter = {
      status: req.query.status as WishlistStatus | undefined,
      priority: req.query.priority as Priority | undefined,
    };

    const wishlist = await getWishlistItems(actor.familyId, filter);
    sendSuccess(res, { wishlist });
  }, '購入予定の取得中にエラーが発生しました')
);

router.get(
  '/search',
  asyncHandler(async (req: Request, res: Response) => {
    const query = req.query.q as string;
    if (!query) {
      sendError(res, 'VALIDATION_ERROR', '検索キーワード(q)が必要です', 400);
      return;
    }

    const actor = await requireAgentUser(req, res);
    if (!actor) return;

    const wishlist = await searchWishlistItems(actor.familyId, query, 'pending');
    sendSuccess(res, { wishlist });
  }, '購入予定の検索中にエラーが発生しました')
);

router.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const actor = await requireAgentUser(req, res);
    if (!actor) return;

    const wishlistItem = await getWishlistById(actor.familyId, req.params.id);
    if (!wishlistItem) {
      sendNotFound(res, '購入予定', 'WISHLIST_NOT_FOUND');
      return;
    }

    sendSuccess(res, { wishlist: wishlistItem });
  }, '購入予定の取得中にエラーが発生しました')
);

router.post(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = botCreateWishlistSchema.safeParse(req.body);
    if (!parsed.success) {
      sendValidationError(res, parsed.error.errors);
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { discordId, ...input } = parsed.data;

    const actor = await requireAgentUser(req, res);
    if (!actor) return;

    const wishlistItem = await createWishlistItem(actor.familyId, actor.userId, input);
    sendCreated(res, { wishlist: wishlistItem });
  }, '購入予定の作成中にエラーが発生しました')
);

router.post(
  '/:id/purchase',
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = statusActionSchema.safeParse(req.body);
    if (!parsed.success) {
      sendValidationError(res, parsed.error.errors);
      return;
    }

    const actor = await requireAgentUser(req, res);
    if (!actor) return;

    try {
      const result = await purchaseWishlistItem(actor.familyId, req.params.id);
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
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = statusActionSchema.safeParse(req.body);
    if (!parsed.success) {
      sendValidationError(res, parsed.error.errors);
      return;
    }

    const actor = await requireAgentUser(req, res);
    if (!actor) return;

    try {
      const wishlistItem = await cancelWishlistItem(actor.familyId, req.params.id);
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
