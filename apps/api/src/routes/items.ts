import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { authenticateToken } from '../middleware/auth.js';
import { getUserByUid } from '../services/auth.service.js';
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
      status: req.query.status as ItemStatus | undefined,
      ownerId: req.query.ownerId as string | undefined,
      boxId: req.query.boxId as string | undefined,
      typeId: req.query.typeId as string | undefined,
      tags: req.query.tags ? (req.query.tags as string).split(',') : undefined,
      includeInheritedTags: req.query.includeInheritedTags === 'true',
    };

    const items = await getItems(user.familyId, filter);
    res.json({ success: true, data: { items } });
  } catch (error) {
    console.error('Get items error:', error);
    res.status(500).json({
      success: false,
      error: { code: ErrorCodes.INTERNAL_ERROR, message: '持ち物の取得中にエラーが発生しました' },
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

    // 関連タグを含むアイテム詳細を取得
    const itemDetail = await getItemWithRelatedTags(user.familyId, req.params.id);
    if (!itemDetail) {
      res.status(404).json({
        success: false,
        error: { code: 'ITEM_NOT_FOUND', message: '持ち物が見つかりません' },
      });
      return;
    }

    res.json({ success: true, data: itemDetail });
  } catch (error) {
    console.error('Get item error:', error);
    res.status(500).json({
      success: false,
      error: { code: ErrorCodes.INTERNAL_ERROR, message: '持ち物の取得中にエラーが発生しました' },
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

    const item = await createItem(user.familyId, user.id, parsed.data);
    res.status(201).json({ success: true, data: { item } });
  } catch (error) {
    console.error('Create item error:', error);
    res.status(500).json({
      success: false,
      error: { code: ErrorCodes.INTERNAL_ERROR, message: '持ち物の作成中にエラーが発生しました' },
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

    const parsed = updateItemSchema.safeParse(req.body);
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

    const item = await updateItem(user.familyId, req.params.id, parsed.data);
    if (!item) {
      res.status(404).json({
        success: false,
        error: { code: 'ITEM_NOT_FOUND', message: '持ち物が見つかりません' },
      });
      return;
    }

    res.json({ success: true, data: { item } });
  } catch (error) {
    console.error('Update item error:', error);
    res.status(500).json({
      success: false,
      error: { code: ErrorCodes.INTERNAL_ERROR, message: '持ち物の更新中にエラーが発生しました' },
    });
  }
});

router.post('/:id/consume', authenticateToken, async (req: Request, res: Response) => {
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

    const parsed = consumeItemSchema.safeParse(req.body);
    const input = parsed.success ? parsed.data : undefined;

    const item = await consumeItem(user.familyId, req.params.id, input);
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
    console.error('Consume item error:', error);
    res.status(500).json({
      success: false,
      error: { code: ErrorCodes.INTERNAL_ERROR, message: '持ち物の消費処理中にエラーが発生しました' },
    });
  }
});

router.post('/:id/give', authenticateToken, async (req: Request, res: Response) => {
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

    const parsed = giveItemSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: {
          code: ErrorCodes.VALIDATION_ERROR,
          message: '譲渡先を入力してください',
          details: parsed.error.errors,
        },
      });
      return;
    }

    const item = await giveItem(user.familyId, req.params.id, parsed.data);
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
    console.error('Give item error:', error);
    res.status(500).json({
      success: false,
      error: { code: ErrorCodes.INTERNAL_ERROR, message: '持ち物の譲渡処理中にエラーが発生しました' },
    });
  }
});

router.post('/:id/sell', authenticateToken, async (req: Request, res: Response) => {
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

    const parsed = sellItemSchema.safeParse(req.body);
    const input = parsed.success ? parsed.data : undefined;

    const item = await sellItem(user.familyId, req.params.id, input);
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
    console.error('Sell item error:', error);
    res.status(500).json({
      success: false,
      error: { code: ErrorCodes.INTERNAL_ERROR, message: '持ち物の売却処理中にエラーが発生しました' },
    });
  }
});

router.post('/:id/verify', authenticateToken, async (req: Request, res: Response) => {
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

    const parsed = verifyItemSchema.safeParse(req.body);
    const verifyAt = parsed.success ? parsed.data.verifyAt : undefined;

    const item = await verifyItem(user.familyId, req.params.id, verifyAt);
    if (!item) {
      res.status(404).json({
        success: false,
        error: { code: 'ITEM_NOT_FOUND', message: '持ち物が見つかりません' },
      });
      return;
    }

    res.json({ success: true, data: { item } });
  } catch (error) {
    console.error('Verify item error:', error);
    res.status(500).json({
      success: false,
      error: { code: ErrorCodes.INTERNAL_ERROR, message: '持ち物の確認処理中にエラーが発生しました' },
    });
  }
});

router.post('/batch-verify', authenticateToken, async (req: Request, res: Response) => {
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

    const parsed = batchVerifyItemsSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: {
          code: ErrorCodes.VALIDATION_ERROR,
          message: 'アイテムIDの配列が必要です',
          details: parsed.error.errors,
        },
      });
      return;
    }

    const result = await batchVerifyItems(user.familyId, parsed.data.ids, parsed.data.verifyAt);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Batch verify items error:', error);
    res.status(500).json({
      success: false,
      error: { code: ErrorCodes.INTERNAL_ERROR, message: '持ち物の一括確認処理中にエラーが発生しました' },
    });
  }
});

router.get('/:id/location', authenticateToken, async (req: Request, res: Response) => {
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
    console.error('Get item location error:', error);
    res.status(500).json({
      success: false,
      error: { code: ErrorCodes.INTERNAL_ERROR, message: '場所情報の取得中にエラーが発生しました' },
    });
  }
});

export default router;
