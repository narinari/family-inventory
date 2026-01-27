import { Router, type Request, type Response } from 'express';
import type { WishlistStatus, Priority } from '@family-inventory/shared';
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
    const user = await requireDiscordUserFromQuery(req, res);
    if (!user) return;

    const filter = {
      status: req.query.status as WishlistStatus | undefined,
      priority: req.query.priority as Priority | undefined,
    };

    const wishlist = await getWishlistItems(user.familyId, filter);
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

    const user = await requireDiscordUserFromQuery(req, res);
    if (!user) return;

    const wishlist = await searchWishlistItems(user.familyId, query, 'pending');
    sendSuccess(res, { wishlist });
  }, '購入予定の検索中にエラーが発生しました')
);

router.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const user = await requireDiscordUserFromQuery(req, res);
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
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = botCreateWishlistSchema.safeParse(req.body);
    if (!parsed.success) {
      sendValidationError(res, parsed.error.errors);
      return;
    }

    const { discordId, ...input } = parsed.data;

    const user = await requireDiscordUser(discordId, res);
    if (!user) return;

    const wishlistItem = await createWishlistItem(user.familyId, user.id, input);
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

    const user = await requireDiscordUser(parsed.data.discordId, res);
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
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = statusActionSchema.safeParse(req.body);
    if (!parsed.success) {
      sendValidationError(res, parsed.error.errors);
      return;
    }

    const user = await requireDiscordUser(parsed.data.discordId, res);
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
