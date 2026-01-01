import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { authenticateToken } from '../middleware/auth.js';
import { getUserByUid } from '../services/auth.service.js';
import {
  getWishlistItems,
  getWishlistById,
  createWishlistItem,
  updateWishlistItem,
  purchaseWishlistItem,
  cancelWishlistItem,
} from '../services/wishlist.service.js';
import { ErrorCodes, WishlistStatus, Priority } from '@family-inventory/shared';

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

router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const authUser = req.authUser!;
    const user = await getUserByUid(authUser.uid);

    if (!user) {
      res.status(404).json({
        success: false,
        error: { code: ErrorCodes.USER_NOT_FOUND, message: 'ユーザーが見つかりません' },
      });
      return;
    }

    const filter = {
      status: req.query.status as WishlistStatus | undefined,
      requesterId: req.query.requesterId as string | undefined,
      priority: req.query.priority as Priority | undefined,
      tags: req.query.tags ? (req.query.tags as string).split(',') : undefined,
    };

    const wishlist = await getWishlistItems(user.familyId, filter);
    res.json({ success: true, data: { wishlist } });
  } catch (error) {
    console.error('Get wishlist error:', error);
    res.status(500).json({
      success: false,
      error: { code: ErrorCodes.INTERNAL_ERROR, message: '購入予定の取得中にエラーが発生しました' },
    });
  }
});

router.get('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const authUser = req.authUser!;
    const user = await getUserByUid(authUser.uid);

    if (!user) {
      res.status(404).json({
        success: false,
        error: { code: ErrorCodes.USER_NOT_FOUND, message: 'ユーザーが見つかりません' },
      });
      return;
    }

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
    console.error('Get wishlist item error:', error);
    res.status(500).json({
      success: false,
      error: { code: ErrorCodes.INTERNAL_ERROR, message: '購入予定の取得中にエラーが発生しました' },
    });
  }
});

router.post('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const authUser = req.authUser!;
    const user = await getUserByUid(authUser.uid);

    if (!user) {
      res.status(404).json({
        success: false,
        error: { code: ErrorCodes.USER_NOT_FOUND, message: 'ユーザーが見つかりません' },
      });
      return;
    }

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

    const wishlistItem = await createWishlistItem(user.familyId, user.id, parsed.data);
    res.status(201).json({ success: true, data: { wishlist: wishlistItem } });
  } catch (error) {
    console.error('Create wishlist item error:', error);
    res.status(500).json({
      success: false,
      error: { code: ErrorCodes.INTERNAL_ERROR, message: '購入予定の作成中にエラーが発生しました' },
    });
  }
});

router.put('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const authUser = req.authUser!;
    const user = await getUserByUid(authUser.uid);

    if (!user) {
      res.status(404).json({
        success: false,
        error: { code: ErrorCodes.USER_NOT_FOUND, message: 'ユーザーが見つかりません' },
      });
      return;
    }

    const parsed = updateWishlistSchema.safeParse(req.body);
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

    const wishlistItem = await updateWishlistItem(user.familyId, req.params.id, parsed.data);
    if (!wishlistItem) {
      res.status(404).json({
        success: false,
        error: { code: 'WISHLIST_NOT_FOUND', message: '購入予定が見つかりません' },
      });
      return;
    }

    res.json({ success: true, data: { wishlist: wishlistItem } });
  } catch (error) {
    console.error('Update wishlist item error:', error);
    res.status(500).json({
      success: false,
      error: { code: ErrorCodes.INTERNAL_ERROR, message: '購入予定の更新中にエラーが発生しました' },
    });
  }
});

router.post('/:id/purchase', authenticateToken, async (req: Request, res: Response) => {
  try {
    const authUser = req.authUser!;
    const user = await getUserByUid(authUser.uid);

    if (!user) {
      res.status(404).json({
        success: false,
        error: { code: ErrorCodes.USER_NOT_FOUND, message: 'ユーザーが見つかりません' },
      });
      return;
    }

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
    console.error('Purchase wishlist item error:', error);
    res.status(500).json({
      success: false,
      error: { code: ErrorCodes.INTERNAL_ERROR, message: '購入完了処理中にエラーが発生しました' },
    });
  }
});

router.post('/:id/cancel', authenticateToken, async (req: Request, res: Response) => {
  try {
    const authUser = req.authUser!;
    const user = await getUserByUid(authUser.uid);

    if (!user) {
      res.status(404).json({
        success: false,
        error: { code: ErrorCodes.USER_NOT_FOUND, message: 'ユーザーが見つかりません' },
      });
      return;
    }

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
    console.error('Cancel wishlist item error:', error);
    res.status(500).json({
      success: false,
      error: { code: ErrorCodes.INTERNAL_ERROR, message: '見送り処理中にエラーが発生しました' },
    });
  }
});

export default router;
