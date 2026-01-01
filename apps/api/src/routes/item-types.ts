import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { authenticateToken } from '../middleware/auth.js';
import { getUserByUid } from '../services/auth.service.js';
import {
  getItemTypes,
  getItemTypeById,
  createItemType,
  updateItemType,
  deleteItemType,
  isItemTypeInUse,
} from '../services/item-type.service.js';
import { ErrorCodes } from '@family-inventory/shared';

const router: Router = Router();

const createItemTypeSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  manufacturer: z.string().max(100).trim().optional(),
  description: z.string().max(500).trim().optional(),
  tags: z.array(z.string()).optional(),
});

const updateItemTypeSchema = z.object({
  name: z.string().min(1).max(100).trim().optional(),
  manufacturer: z.string().max(100).trim().optional(),
  description: z.string().max(500).trim().optional(),
  tags: z.array(z.string()).optional(),
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

    const itemTypes = await getItemTypes(user.familyId);
    res.json({ success: true, data: { itemTypes } });
  } catch (error) {
    console.error('Get item types error:', error);
    res.status(500).json({
      success: false,
      error: { code: ErrorCodes.INTERNAL_ERROR, message: 'アイテム種別の取得中にエラーが発生しました' },
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

    const parsed = createItemTypeSchema.safeParse(req.body);
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

    const itemType = await createItemType(user.familyId, parsed.data);
    res.status(201).json({ success: true, data: { itemType } });
  } catch (error) {
    console.error('Create item type error:', error);
    res.status(500).json({
      success: false,
      error: { code: ErrorCodes.INTERNAL_ERROR, message: 'アイテム種別の作成中にエラーが発生しました' },
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

    const parsed = updateItemTypeSchema.safeParse(req.body);
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

    const itemType = await updateItemType(user.familyId, req.params.id, parsed.data);
    if (!itemType) {
      res.status(404).json({
        success: false,
        error: { code: 'ITEM_TYPE_NOT_FOUND', message: 'アイテム種別が見つかりません' },
      });
      return;
    }

    res.json({ success: true, data: { itemType } });
  } catch (error) {
    console.error('Update item type error:', error);
    res.status(500).json({
      success: false,
      error: { code: ErrorCodes.INTERNAL_ERROR, message: 'アイテム種別の更新中にエラーが発生しました' },
    });
  }
});

router.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
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

    const inUse = await isItemTypeInUse(user.familyId, req.params.id);
    if (inUse) {
      res.status(400).json({
        success: false,
        error: { code: 'ITEM_TYPE_IN_USE', message: 'このアイテム種別は使用中のため削除できません' },
      });
      return;
    }

    const deleted = await deleteItemType(user.familyId, req.params.id);
    if (!deleted) {
      res.status(404).json({
        success: false,
        error: { code: 'ITEM_TYPE_NOT_FOUND', message: 'アイテム種別が見つかりません' },
      });
      return;
    }

    res.json({ success: true, data: { message: 'アイテム種別を削除しました' } });
  } catch (error) {
    console.error('Delete item type error:', error);
    res.status(500).json({
      success: false,
      error: { code: ErrorCodes.INTERNAL_ERROR, message: 'アイテム種別の削除中にエラーが発生しました' },
    });
  }
});

export default router;
